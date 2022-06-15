import { NS, Server } from "typings/Bitburner";
import { getRootedServers } from "/utils/getRootedServers";
import { ServerManager } from "/modules/ServerManager/ServerManager";
import { isReadyForLoop, Thread } from "/modules/Thread/Thread";
import { calculateWeakenThreads } from "/utils/calculateWeakenThreads";
import { getServerHackData } from "/utils/getServerHackData";
import { sleep } from "/utils/sleep";

export type FilteredOutput = HackLoopInfo & {
	moneyPerCpuSecFormatted: string;
	moneyPerThreadFormatted: string;
	availableRam: number;
	repeatCapacity: number;
	repeatIntervalSec: number;
};
type RunningThread = {
	thread: Thread;
	ready: boolean;
};
export class ThreadManager {
	availableServers: Server[];
	serverManager: ServerManager;
	runningThreads: Map<string, RunningThread>;
	constructor(private ns: NS, ServerManager: ServerManager) {
		this.ns = ns;
		this.availableServers = [];
		this.serverManager = ServerManager;
		this.runningThreads = new Map();
	}

	async init() {
		this.log("Starting...");
		this.availableServers = getRootedServers(this.ns);

		await this.ns
			.write("/logs/hackable_servers.txt", JSON.stringify(this.availableServers, null, 4), "w")
			.catch((err) => this.log(err));

		this.log("Deploying threads...");
		await this.deployThreads();
	}

	async deployThreads() {
		const targets: string[] = getRootedServers(this.ns).map((server) => server.hostname);

		//const targets = ["iron-gym", "foodnstuff"];
		for (const target of targets) {
			const newThread = new Thread(this.ns, this.serverManager, target);

			const runningThread: RunningThread = { thread: newThread, ready: false };
			newThread.once("ready", async () => {
				try {
					const foundRunningThread = this.runningThreads.get(target);

					if (foundRunningThread) {
						foundRunningThread.ready = true;

						this.runningThreads.set(target, foundRunningThread);
					}

					//check if all threads are ready
					const allReady = Array.from(this.runningThreads.values()).every((thread) => thread.ready);

					if (allReady) {
						this.log("All threads are ready for hacking!");
						const allThreads = Array.from(this.runningThreads.values()).map(
							(runningThread) => runningThread.thread
						);

						const calcOutput: HackLoopInfo[] = [];
						for (let i = 1; i < 10; i++) {
							for (const thread of allThreads) {
								const result = calculateHackLoop(
									this.ns,
									this.serverManager,
									thread.targetHostname,
									i * 10
								);

								if (!result) {
									this.log("No result found for thread: " + thread.targetHostname);
									continue;
								}

								calcOutput.push(result);
							}
							//this.log(JSON.stringify(calcOutput, null, 4));
						}

						let filteredOutputs: FilteredOutput[] = [];
						if (
							calcOutput.every(
								(result) =>
									typeof result.moneyPerThread === "number" &&
									typeof result.moneyPerCpuSec === "number"
							)
						) {
							const availableRam = this.serverManager.getAvailableRam().totalAvailableRam;

							calcOutput
								.sort((a, b) => b.moneyPerCpuSec - a.moneyPerCpuSec)
								.sort((a, b) => b.moneyPerThread - a.moneyPerThread)
								.forEach((output) => {
									const newOutput = output as FilteredOutput;
									newOutput.moneyPerCpuSecFormatted = this.ns.nFormat(output.moneyPerCpuSec, "0,0");
									newOutput.moneyPerThreadFormatted = this.ns.nFormat(output.moneyPerThread, "0,0");

									newOutput.availableRam = availableRam;
									newOutput.repeatCapacity = Math.floor(availableRam / output.requiredRam);

									newOutput.repeatIntervalSec = output.loopTime / 1000 / newOutput.repeatCapacity;

									filteredOutputs.push(newOutput);
								});
						}

						await this.ns.write("/logs/hack_loop_data.js", JSON.stringify(filteredOutputs, null, 4), "w");

						const selectedTarget = filteredOutputs.filter((output) => output.repeatIntervalSec > 5)[0];
						console.log("Selected Target: " + JSON.stringify(selectedTarget), null, 2);

						this.signalThreadToLoop(selectedTarget);
					}
				} catch (error) {
					this.log("Error: " + error);
				}
			});
			this.runningThreads.set(target, runningThread);
		}
	}

	signalThreadToLoop(target: FilteredOutput) {
		const thread = this.runningThreads.get(target.hostname)?.thread;

		if (!thread) {
			this.log("No thread found for: " + target.hostname);
			return;
		}
		thread.startLoop(target);
	}

	log(message: string | number) {
		this.ns.print("[ThreadManager] " + message);
		console.log(message);
	}
}
/**
 * Calculates the amount of thread to hack for specified percentage of server's current money.
 *
 * @param hostname
 * @param ns
 * @param percentage Percentage of money to hack for (e.g. 10 = 10% of current money)
 *
 */

interface Ops<E> {
	[key: string]: E;
}
export interface HackLoopInfo {
	hostname: string;
	hackPercentage: number;
	totalThreads: number;
	income: number;
	loopTime: number;
	requiredRam: number;
	moneyPerThread: number;
	moneyPerCpuSec: number;
	goldenInfo: boolean;
	opThreads: Ops<number>;
	opTimes: Ops<number>;
}
export function calculateHackLoop(
	ns: NS,
	ServerManager: ServerManager,
	hostname: string,
	percentage: number
): HackLoopInfo | null {
	try {
		const serverHackData = getServerHackData(ns, hostname);
		let money = serverHackData.money;
		if (money === 0) money = 1;

		const safePercentage = percentage > 1 ? percentage : 1;
		const maxMoney = serverHackData.maxMoney;

		const reqHackThreads = Math.ceil(ns.hackAnalyzeThreads(hostname, money * (safePercentage / 100)));
		const hackSecIncrease = ns.hackAnalyzeSecurity(reqHackThreads, hostname);

		const reqGrowThreads = Math.ceil(ns.growthAnalyze(hostname, 100 / (100 - safePercentage), 1));
		const growSecIncrease = ns.growthAnalyzeSecurity(reqGrowThreads, hostname, 1);

		const reqWeakenThreads = Math.ceil(calculateWeakenThreads(hackSecIncrease + growSecIncrease));

		const { hackTime, growTime, weakenTime } = serverHackData;

		const loopTime = Math.max(hackTime, growTime, weakenTime);
		const totalThreads = reqHackThreads + reqGrowThreads + reqWeakenThreads;
		const income = money * (safePercentage / 100);

		const scriptSizes = ServerManager.getScriptSizes();

		const reqRam =
			reqGrowThreads * scriptSizes.grow +
			reqHackThreads * scriptSizes.hack +
			reqWeakenThreads * scriptSizes.weaken;

		return {
			hostname: hostname,
			hackPercentage: safePercentage,
			totalThreads: totalThreads,
			income: income,
			loopTime: loopTime,
			requiredRam: reqRam,
			moneyPerThread: Math.floor(income / totalThreads),
			moneyPerCpuSec: Math.floor(income / (loopTime / 1000)),

			opThreads: {
				hack: reqHackThreads,
				grow: reqGrowThreads,
				weaken: reqWeakenThreads,
			},

			opTimes: {
				hack: hackTime,
				grow: growTime,
				weaken: weakenTime,
			},

			goldenInfo: isReadyForLoop(serverHackData),
		};
	} catch (error) {
		console.log("Error calculating hack loop: " + error);
		ns.print("Error calculating hack loop: " + error);
		return null;
	}
}
