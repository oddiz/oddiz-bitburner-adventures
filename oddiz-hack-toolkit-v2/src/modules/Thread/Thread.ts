import { NS, Server } from "typings/Bitburner";
import { getRootedServers } from "/utils/getRootedServers";
import { ServerManager, Task } from "/modules/ServerManager/ServerManager";
import { getServerHackData, ServerHackData } from "/utils/getServerHackData";
import { calculateWeakenThreads } from "/utils/calculateWeakenThreads.js";
import { sleep } from "/utils/sleep";

import { EventEmitter } from "/vendor/eventemitter3/index.js";
import { FilteredOutput } from "../ThreadManager/ThreadManager";
import { spawn } from "child_process";
/**
 * Runs for every server that we want to hack.
 */
export class Thread extends EventEmitter {
	targetHostname: string;
	targetServer: Server;
	targetServerHackData: ServerHackData | null;
	serverManager: ServerManager;
	looping: boolean;
	constructor(private ns: NS, ServerManager: ServerManager, hostname: string) {
		super();

		this.ns = ns;
		this.serverManager = ServerManager;
		this.targetHostname = hostname;
		this.targetServer = this.ns.getServer(hostname);
		this.targetServerHackData = null;

		this.looping = false;

		this.run();
	}

	run(): void {
		this.ns.tail();
		this.ns.print("Running Thread for " + this.targetServer.organizationName);
		this.targetServerHackData = getServerHackData(this.ns, this.targetHostname);
		if (!this.targetServerHackData) {
			this.log("ERROR: Could not get server hack data. Terminating thread...)");
		}
		this.readyTargetForLoop(this.targetServerHackData)
			.then((serverReady) => {
				if (!serverReady) {
					//this.log(`Not ready for hacking loop yet`);
				} else {
					this.emit("ready");
				}
			})
			.catch((err) => {
				this.log("Error in Thread.run() :" + err);
			});
	}

	startLoop(targetLoopInfo: FilteredOutput) {
		if (this.looping) return;

		this.looping = true;
		const repeatInt = targetLoopInfo.repeatIntervalSec * 1000;

		const spawnHackTrio = async () => {
			try {
				const opTypes: {
					op: string;
					time: number;
				}[] = [];
				for (const opType in targetLoopInfo.opTimes) {
					opTypes.push({
						op: opType,
						time: targetLoopInfo.opTimes[opType],
					});
				}
				const { grow, hack, weaken } = targetLoopInfo.opTimes;
				const loopTime = Math.max(grow, hack, weaken);

				const bufferInMs = 500;
				let counter = 2;

				const currentTime = new Date().getTime();
				//first hack

				const hackTask: Task = {
					target: this.targetHostname,
					op: "hack",
					threads: targetLoopInfo.opThreads.hack,
					executeTime: currentTime + loopTime - hack + bufferInMs * counter,
				};
				counter--;
				//then grow
				const growTask: Task = {
					target: this.targetHostname,
					op: "grow",
					threads: targetLoopInfo.opThreads.grow,
					executeTime: currentTime + loopTime - grow + bufferInMs * counter,
				};
				counter--;
				//finally weaken
				const weakenTask: Task = {
					target: this.targetHostname,
					op: "weaken",
					threads: targetLoopInfo.opThreads.weaken,
					executeTime: currentTime + loopTime - weaken + bufferInMs * counter,
				};

				await this.serverManager.dispatch(weakenTask);
				await this.serverManager.dispatch(growTask);
				await this.serverManager.dispatch(hackTask);
			} catch (error) {
				console.log("Error in spawnHackTrio: " + error);
			}
		};

		setInterval(spawnHackTrio, repeatInt * 1.01); //add %1 to make sure we good
	}

	/**
	 *
	 * @param targetServerHackData ServerHackData
	 *
	 * @returns Promise<boolean> true if executed successfully, false if not
	 */
	private async readyTargetForLoop(targetServerHackData: ServerHackData): Promise<boolean> {
		if (isReadyForLoop(targetServerHackData)) return true;

		//if not ready for loop grow to max while weakening to min
		const growTime = Math.floor(targetServerHackData.growTime);
		const weakenTime = Math.floor(targetServerHackData.weakenTime);

		let growExecTime = 0;
		let weakenExecTime = 0;
		let maxTime = 0;
		if (growTime > weakenTime) {
			maxTime = growTime;

			growExecTime = new Date().getTime();
			weakenExecTime = growExecTime + growTime - weakenTime - 5000; // 5 sec buffer
		} else {
			maxTime = weakenTime;
			weakenExecTime = new Date().getTime();
			growExecTime = weakenExecTime + weakenTime - growTime - 5000; // 5 sec buffer
		}

		const growTask: Task = {
			target: this.targetHostname,
			op: "grow",
			threads: targetServerHackData.growthThreadsToMax,
			executeTime: growExecTime,
		};

		if (targetServerHackData.growthThreadsToMax > 0) await this.serverManager.dispatch(growTask);

		//sec decrease task

		const hackData = this.targetServerHackData as ServerHackData;
		const secToDecrease = hackData.growthSecIncrease + hackData.curSec - hackData.minSec;
		const weakenThreads = calculateWeakenThreads(secToDecrease);

		const weakenTask: Task = {
			target: this.targetHostname,
			op: "weaken",
			threads: weakenThreads,
			executeTime: weakenExecTime,
		};

		if (secToDecrease > 0) await this.serverManager.dispatch(weakenTask);

		const waitTime = maxTime + 10000;
		this.log(`Waiting for ${this.ns.tFormat(waitTime)}...`);
		await sleep(waitTime);

		const newTargetHackData = getServerHackData(this.ns, this.targetHostname);
		this.updateHackData(newTargetHackData);

		if (isReadyForLoop(newTargetHackData)) return true;
		else return false;
	}

	updateHackData(hackData: ServerHackData) {
		this.targetServerHackData = hackData;
	}
	log(message: string | number) {
		this.ns.print(`[Thread for ${this.targetHostname}] ` + message);
		console.log(`[Thread for ${this.targetHostname}] ` + message);
	}
}

export function isReadyForLoop(serverHackData: ServerHackData): boolean {
	return serverHackData.growthThreadsToMax === 0 && serverHackData.weakenThreadsToMin === 0;
}
