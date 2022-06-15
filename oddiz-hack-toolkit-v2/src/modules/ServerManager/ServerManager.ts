import { NS, Server } from "typings/Bitburner";
import { getRemoteServers } from "/utils/getRemoteServers";
import { getRootedServers } from "/utils/getRootedServers";
import { killAll } from "/utils/killAll";
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
		this.ns.disableLog("scp");
		this.log("Starting...");
		this.log("Getting script sizes...");
		this.getScriptSizes();

		this.log("Getting remote servers...");
		this.refreshRemoteServers();

		this.log("Copying payloads to all servers...");
		await this.copyPayloads();

		this.log("Killing all processes on all servers...");
		await killAll(this.ns);
		this.totalRam = await this.getTotalRam();
		//this.log(`Total RAM: ${this.totalRam}GB`);

		return true;
	}

	async startListening() {
		this.log("Listening for tasks...");
		await this.processTasks();
	}

	async processTasks() {
		const LAGGING_TASKS_DIR = "/logs/lagging_tasks.txt";
		this.processingQueue = false;

		while (this.ns.scriptRunning("main.js", "home")) {
			try {
				if (this.taskQueue.length === 0) {
					//await this.ns.write(LAGGING_TASKS_DIR, "", "w");
					await sleep(250);
					continue;
				}
				this.processingQueue = true;

				//this.log(JSON.stringify(this.taskQueue));
				const nextTask = this.taskQueue.shift();
				if (!nextTask?.threads) {
					continue;
				}
				if (!nextTask) continue;
				this.processingQueue = false;

				const boundExec = executeTask.bind(this);
				boundExec(nextTask);

				await sleep(100);
			} catch (error) {
				this.log("Error in processTasks loop: " + error);
			}
		}
		/* 

		const intervalId = setInterval(loopFunction, 500);

		async function loopFunction() {
			try {
				if (!self.ns.scriptRunning("main.js", "home")) {
					killInterval();
				}
				if (self.taskQueue.length === 0) {
					//await self.ns.write(LAGGING_TASKS_DIR, "", "w");

					return;
				}
				self.processingQueue = true;
				self.taskQueue.sort((a, b) => a.executeTime - b.executeTime);
				//self.log(JSON.stringify(self.taskQueue));
				const nextTask = self.taskQueue.shift();
				if (!nextTask) return;
				self.processingQueue = false;

				const boundExec = executeTask.bind(self);
				await boundExec(nextTask);
			} catch (error) {
				self.log("Error in processTasks loop: " + error);
			}
		}
        function killInterval() {
            clearInterval(intervalId);
        }

        */

		function executeTask(this: ServerManager, task: Task): ExecuteTaskReturn {
			//get ram status
			const ramInfo = this.getAvailableRam();

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
				//this.log(`Not enough RAM to execute even 1 thread. I can't keep up with this workload!!`);

				this.addTask(task);
				//this.ns.write(LAGGING_TASKS_DIR, JSON.stringify(this.taskQueue) + " (NOT EXECUTED AT ALL)" + "\n", "a");
				return {
					status: "failed",
					task: task,
					data: {
						message: "Not enough RAM to execute even 1 thread. I can't keep up with this workload!!",
					},
				};
			}

			if (ramInfo.totalAvailableRam < ramNeeded) {
				//this.log(
				//	`Not enough RAM to execute task. Needed: ${ramNeeded}GB, Available: ${ramInfo.//totalAvailableRam}GB`
				//);
			}

			const activeTask = task;
			const usedServers: UsedServer[] = [];
			let taskExecuted = false;

			for (const server of ramInfo.servers) {
				const serverAvailableRam =
					this.ns.getServerMaxRam(server.hostname) - this.ns.getServerUsedRam(server.hostname);
				const serverThreadCap = Math.floor(serverAvailableRam / scriptSize);

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

					this.addTask(activeTask);

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
				//this.log("Task partially executed, remaining threads: " + activeTask.threads);
				//this.log("Adding remaining task back to queue");

				this.addTask(activeTask);

				//maybe could remove the await here?
				//this.ns.write(LAGGING_TASKS_DIR, JSON.stringify(this.taskQueue) + "\n", "a");

				return {
					status: "success",
					task: activeTask,
					data: {
						remainingThreads: activeTask.threads,
						usedServers: usedServers,
					},
				};
			} else {
				//Not enough RAM to execute even 1 thread for every server
				this.addTask(task);

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

		return true;
	}

	async getTotalRam() {
		const servers = this.refreshRemoteServers();
		let totalRam = 0;
		for (const server of servers) {
			totalRam += server.maxRam;
		}
		return totalRam;
	}

	getAvailableRam(): {
		totalAvailableRam: number;
		servers: ServerRamInfo[];
	} {
		const servers = this.refreshRemoteServers();

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

	refreshRemoteServers() {
		this.remoteServers = [...getRemoteServers(this.ns), ...getRootedServers(this.ns)];

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
		//console.log("dispatched task: " + JSON.stringify(task, null, 2));
		//console.log("task queue: " + JSON.stringify(this.taskQueue, null, 2));
		while (this.processingQueue) {
			await sleep(100);
		}
		await this.addTask(task);

		return true;
	}

	public getScriptSizes() {
		const result = {
			hack: this.ns.getScriptRam("/payloads/hack.js"),
			weaken: this.ns.getScriptRam("/payloads/weaken.js"),
			grow: this.ns.getScriptRam("/payloads/grow.js"),
		};

		this.scriptSize = result;
		return result;
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
		console.log("[ServerManager] " + message);
	}
}
