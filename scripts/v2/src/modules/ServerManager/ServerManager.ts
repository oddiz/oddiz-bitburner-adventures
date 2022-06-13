import { NS, Server } from "typings/Bitburner";
import { getRemoteServers } from "/utils/getRemoteServers";
import { sleep } from "/utils/sleep";

const PROCESS_TASK_TICKRATE = 1000;

export interface Task {
	target: string;
	op: "weaken" | "grow" | "hack";
	threads: number;
	executeTime: number;
}

interface ServerRamInfo {
	hostname: string;
	totalRam: number;
	availableRam: number;
}
interface UsedServer {
	hostname: string;
	ramUsed: number;
	threadsLaunched: number;
}

interface ExecuteTaskReturn {
	status: "success" | "failed";
	task: Task;
	data: {
		remainingThreads?: number;
		usedServers?: UsedServer[];
		message?: string;
	};
}

export class ServerManager {
	public remoteServers: Server[];
	public totalRam: number;
	private taskQueue: Task[];
	private scriptSize: {
		hack: number;
		weaken: number;
		grow: number;
	};
	private processingQueue: boolean;

	constructor(private ns: NS) {
		this.ns = ns;
		this.remoteServers = [];
		this.totalRam = 0;

		this.scriptSize = {
			hack: 0,
			weaken: 0,
			grow: 0,
		};

		this.taskQueue = [];
		this.processingQueue = false;
	}
	async init() {
		this.ns.disableLog("ALL");
		this.log("Starting...");
		this.log("Getting script sizes...");
		this.getScriptSizes();

		this.log("Getting remote servers...");
		await this.refreshRemoteServers();

		this.log("Copying payloads to all servers...");
		await this.copyPayloads();

		this.totalRam = await this.getTotalRam();
		//this.log(`Total RAM: ${this.totalRam}GB`);

		this.log("Listening for tasks...");
		this.processTasks();

		return true;
	}

	private async processTasks() {
		const LAGGING_TASKS_DIR = "/logs/lagging_tasks.txt";
		this.processingQueue = false;
		while (true) {
			if (this.taskQueue.length === 0) {
				await this.ns.write(LAGGING_TASKS_DIR, "", "w");
				await sleep(500);
				continue;
			}
			this.processingQueue = true;
			this.taskQueue.sort((a, b) => a.executeTime - b.executeTime);
			//this.log(JSON.stringify(this.taskQueue));
			const nextTask = this.taskQueue.shift();
			if (!nextTask) continue;
			this.processingQueue = false;

			const execResult = await executeTask.bind(this)(nextTask);

			if (execResult.status) await sleep(200);
		}

		async function executeTask(this: ServerManager, task: Task): Promise<ExecuteTaskReturn> {
			//get ram status
			const ramInfo = await this.getAvailableRam();

			//calculate how many threads needed for the task
			const scriptSize =
				task.op === "hack"
					? this.scriptSize.hack
					: task.op === "weaken"
					? this.scriptSize.weaken
					: this.scriptSize.grow;
			const ramNeeded = task.threads * scriptSize;

			//check if we have enough ram

			if (ramInfo.totalAvailableRam < scriptSize) {
				this.log(`Not enough RAM to execute even 1 thread. I can't keep up with this workload!!`);

				await this.addTask(task);
				await this.ns.write(
					LAGGING_TASKS_DIR,
					JSON.stringify(this.taskQueue) + " (NOT EXECUTED AT ALL)" + "\n",
					"a"
				);
				return {
					status: "failed",
					task: task,
					data: {
						message: "Not enough RAM to execute even 1 thread. I can't keep up with this workload!!",
					},
				};
			}

			if (ramInfo.totalAvailableRam < ramNeeded) {
				this.log(
					`Not enough RAM to execute task. Needed: ${ramNeeded}GB, Available: ${ramInfo.totalAvailableRam}GB`
				);
			}

			const activeTask = task;
			const usedServers: UsedServer[] = [];
			let taskExecuted = false;

			for (const server of ramInfo.servers) {
				const serverThreadCap = Math.floor(server.availableRam / scriptSize);

				if (serverThreadCap < 1) {
					//we don't have enough ram for even 1 task in server
					continue;
				}

				let execResult;
				try {
					execResult = this.ns.exec(
						`/payloads/${activeTask.op}.js`,
						server.hostname,
						Math.min(serverThreadCap, activeTask.threads),
						activeTask.target,
						activeTask.executeTime
					);
				} catch (error) {
					this.log("Error: " + error);
					continue;
				}

				if (execResult) {
					taskExecuted = true;
					usedServers.push({
						hostname: server.hostname,
						ramUsed: scriptSize * task.threads,
						threadsLaunched: Math.min(serverThreadCap, task.threads),
					});
					const remainingThreads = activeTask.threads - serverThreadCap;

					if (remainingThreads < 1) {
						//task completed
						return {
							status: "success",
							task: task,
							data: {
								remainingThreads: 0,
								usedServers: usedServers,
							},
						};
					} else {
						//task partially completed so update remaining threads

						activeTask.threads = remainingThreads;
						continue;
					}
				} else {
					this.log("Payload failed to execute");
					this.log(
						"Command: " +
							`exec(${`/payloads/${activeTask.op}.js`}, ${server.hostname}, ${Math.min(
								serverThreadCap,
								activeTask.threads
							)}, ${activeTask.target}, ${activeTask.executeTime} )`
					);
					this.log("Task:\n" + JSON.stringify(activeTask));
					this.log("Server RAM Info: " + JSON.stringify(server));
					this.log("Server thread Capacity: " + serverThreadCap);

					return {
						status: "failed",
						task: task,
						data: {
							message: "Payload failed to execute on target.",
						},
					};
				}
			}

			//if we reach here that means we didn't execute the task or partially executed it

			if (taskExecuted) {
				this.log("Task partially executed, remaining threads: " + activeTask.threads);
				this.log("Adding remaining task back to queue");

				await this.addTask(activeTask);

				//maybe could remove the await here?
				await this.ns.write(LAGGING_TASKS_DIR, JSON.stringify(this.taskQueue) + "\n", "a");

				return {
					status: "success",
					task: activeTask,
					data: {
						remainingThreads: activeTask.threads,
						usedServers: usedServers,
					},
				};
			} else {
				this.log(
					`Not enough RAM to execute even 1 thread for every server. This shouldn't happen as we are checking for avail. ram at getAvailableRam()`
				);
				await this.addTask(task);

				return {
					status: "failed",
					task: task,
					data: {
						message:
							"Not enough RAM to execute even 1 thread for every server. This shouldn't happen as we are checking for avail. ram at getAvailableRam()",
					},
				};
			}
		}
	}

	async getTotalRam() {
		const servers = await this.refreshRemoteServers();
		let totalRam = 0;
		for (const server of servers) {
			totalRam += server.maxRam;
		}
		return totalRam;
	}

	async getAvailableRam(): Promise<{
		totalAvailableRam: number;
		servers: ServerRamInfo[];
	}> {
		const servers = await this.refreshRemoteServers();

		const serversWithRamInfo: ServerRamInfo[] = [];
		let totalAvailableRam = 0;
		for (const server of servers) {
			const availableRam = server.maxRam - server.ramUsed;

			if (availableRam < 2) {
				//ignore the server
				continue;
			}

			totalAvailableRam += availableRam;
			serversWithRamInfo.push({
				hostname: server.hostname,
				availableRam: availableRam,
				totalRam: server.maxRam,
			});
		}

		return {
			totalAvailableRam: totalAvailableRam,
			servers: serversWithRamInfo.sort((a, b) => b.availableRam - a.availableRam),
		};
	}

	async refreshRemoteServers() {
		this.remoteServers = await getRemoteServers(this.ns);

		return this.remoteServers;
	}

	async addTask(task: Task) {
		while (this.processingQueue) {
			await sleep(100);
		}
		this.processingQueue = true;
		this.taskQueue.push(task);
		this.processingQueue = false;
	}

	async dispatch(task: Task) {
		while (this.processingQueue) {
			await sleep(100);
		}
		await this.addTask(task);
	}

	getScriptSizes() {
		const result = {
			hack: this.ns.getScriptRam("/payloads/hack.js"),
			weaken: this.ns.getScriptRam("/payloads/weaken.js"),
			grow: this.ns.getScriptRam("/payloads/grow.js"),
		};

		this.scriptSize = result;
	}

	async copyPayloads() {
		const PAYLOAD_NAMES = ["weaken.js", "grow.js", "hack.js"];
		const PAYLOAD_DIR = "/payloads";

		for (const server of this.remoteServers) {
			for (const payloadName of PAYLOAD_NAMES) {
				await this.ns.scp(`${PAYLOAD_DIR}/${payloadName}`, server.hostname);
			}
		}
	}
	log(message: string) {
		this.ns.print("[ServerManager] " + message);
	}
}
