import { NS, Server } from "typings/Bitburner";
import { getRootedServers } from "/utils/getRootedServers";
import { ServerManager, Task } from "/modules/ServerManager/ServerManager";
import { getServerHackData, ServerHackData } from "/utils/getServerHackData";
import { calculateWeakenThreads } from "/utils/calculateWeakenThreads.js";
import { sleep } from "/utils/sleep";

/**
 * Runs for every server that we want to hack.
 */
export class Thread {
	targetHostname: string;
	targetServer: Server;
	targetServerHackData: ServerHackData | null;
	serverManager: ServerManager;
	constructor(private ns: NS, ServerManager: ServerManager, hostname: string) {
		this.ns = ns;
		this.serverManager = ServerManager;
		this.targetHostname = hostname;
		this.targetServer = this.ns.getServer(hostname);
		this.targetServerHackData = null;
	}

	async run(): Promise<boolean> {
		this.ns.tail();
		this.ns.print("Running Thread for " + this.targetServer.organizationName);
		this.targetServerHackData = getServerHackData(this.ns, this.targetHostname);
		if (!this.targetServerHackData) {
			this.log("ERROR: Could not get server hack data. Terminating thread...)");

			return false;
		}
		const serverReady = await this.readyTargetForLoop(this.targetServerHackData);

		//check and prepare server for main money making loop

		if (serverReady) {
			this.log(`Ready for hacking loop...`);
			return true;
			//TODO: hack loop
		} else {
			this.log(`Not ready for hacking loop but should be...`);
			return false;
			this.log("____ Target Server ____\n" + JSON.stringify(this.targetServer));
			this.log("____ Target Server Hack Data ____\n" + JSON.stringify(this.targetServerHackData));
		}
	}

	/**
	 *
	 * @param targetServerHackData ServerHackData
	 *
	 * @returns Promise<boolean> true if executed successfully, false if not
	 */
	private async readyTargetForLoop(targetServerHackData: ServerHackData): Promise<boolean> {
		if (this.isReadyForLoop(targetServerHackData)) return true;

		//if not ready for loop grow to max while weakening to min
		const growTime = Math.floor(targetServerHackData.growTime);
		const weakenTime = Math.floor(targetServerHackData.weakenTime);

		let growExecTime = 0;
		let weakenExecTime = 0;
		let maxTime = 0;
		if (growTime > weakenTime) {
			maxTime = growTime;

			growExecTime = new Date().getTime();
			weakenExecTime = growExecTime + growTime - weakenTime - 2000; // 2 sec buffer
		} else {
			maxTime = weakenTime;
			weakenExecTime = new Date().getTime();
			growExecTime = weakenExecTime + weakenTime - growTime - 2000; // 2 sec buffer
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

		if (this.isReadyForLoop(newTargetHackData)) return true;
		else return false;
	}

	updateHackData(hackData: ServerHackData) {
		this.targetServerHackData = hackData;
	}
	log(message: string | number) {
		this.ns.print(`[Thread for ${this.targetHostname}] ` + message);
		console.log(`[Thread for ${this.targetHostname}] ` + message);
	}

	isReadyForLoop(serverHackData: ServerHackData): boolean {
		return serverHackData.growthThreadsToMax === 0 && serverHackData.weakenThreadsToMin === 0;
	}
}
