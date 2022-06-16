import { NS, Server } from "typings/Bitburner";
import { getRootedServers } from "/utils/getRootedServers";
import { ServerManager } from "/modules/ServerManager/ServerManager";
import { Thread } from "/modules/Thread/Thread";
import { calculateHackLoop } from "/utils/calculateHackLoop";

const DEFAULT_THREAD_INTERVAL = 2000;
export type TargetHackLoopData = HackLoopInfo & {
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
	ns: NS;
	constructor(ns: NS, ServerManager: ServerManager) {
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

			this.runningThreads.set(target, runningThread);

			newThread.once("ready", async () => {
				try {
					const foundRunningThread = this.runningThreads.get(target);

					if (foundRunningThread) {
						foundRunningThread.ready = true;

						this.runningThreads.set(target, foundRunningThread);
					}

					//check if all threads are ready
					const allThreadsReady = Array.from(this.runningThreads.values()).every((thread) => thread.ready);

					if (allThreadsReady) {
						this.log("All threads are ready for hacking!");
						const allThreads = Array.from(this.runningThreads.values()).map(
							(runningThread) => runningThread.thread
						);

						const totalAvailableRam = this.serverManager.getAvailableRam().totalAvailableRam;
						const calcOutput: HackLoopInfo[] = [];
						for (let i = 1; i < 10; i++) {
							for (const thread of allThreads) {
								const result = calculateHackLoop(
									this.ns,
									thread.targetServer,
									i * 10,
									totalAvailableRam
								);

								if (!result) {
									this.log("No result found for thread: " + thread.targetHostname);
									continue;
								}

								calcOutput.push(result);
							}
							//this.log(JSON.stringify(calcOutput, null, 4));
						}

						if (
							calcOutput.every(
								(result) =>
									typeof result.moneyPerThread === "number" &&
									typeof result.moneyPerCpuSec === "number"
							)
						) {
							calcOutput
								.sort((a, b) => b.moneyPerCpuSec - a.moneyPerCpuSec)
								.sort((a, b) => b.moneyPerThread - a.moneyPerThread);
						}

						let selectedTarget = [...calcOutput].filter(
							(output) => output.repeatIntervalSec > DEFAULT_THREAD_INTERVAL / 1000
						)[0];

						if (!selectedTarget) {
							function calculateDefaultIntervalPerformance(target: HackLoopInfo) {
								const performanceLoss = (target.repeatIntervalSec * 1000) / DEFAULT_THREAD_INTERVAL;
								return target.moneyPerThread * performanceLoss;
							}
							const sortedForInterval = [...calcOutput].sort(
								(a, b) =>
									calculateDefaultIntervalPerformance(b) - calculateDefaultIntervalPerformance(a)
							);

							console.warn(
								"Couldn't find suitable target with given filters. Going for default interval."
							);

							console.log(
								"Top 5 for default interval: " + JSON.stringify(sortedForInterval.slice(0, 4), null, 2)
							);
							//currently due to cannot finding a suitable target with repet interval > 2
							//as workaround get most valueable server and default interval to assigned value
							selectedTarget = [...sortedForInterval][0];
							selectedTarget.repeatIntervalSec = 2;
						}
						/*
						selectedTarget = [...calcOutput]
                        .sort((a, b) => a.loopTime - b.loopTime)
                        .filter((output) => output.hostname === "foodnstuff") //was 5
                        .filter((output) => output.hackPercentage === 90)[0];
                        */

						console.log("Selected Target: " + JSON.stringify(selectedTarget, null, 2));

						this.signalThreadToLoop(selectedTarget);
					}
				} catch (error) {
					if (this.ns.scriptRunning("main.js", "home")) this.log("Error: " + error);
				}
			});
		}
	}

	async signalThreadToLoop(targetHackLoopData: HackLoopInfo) {
		const thread = this.runningThreads.get(targetHackLoopData.hostname)?.thread;

		if (!thread) {
			this.log("No thread found for: " + targetHackLoopData.hostname);
			return;
		}
		await thread.initiateOptimalHacking(targetHackLoopData);
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
	moneyPerCpuSecFormatted: string;
	moneyPerThreadFormatted: string;
	repeatIntervalSec: number;
}
