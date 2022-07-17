import { NS, Server } from "typings/Bitburner";
import { DispatchCommand, ServerManager, Task } from "/modules/ServerManager/ServerManager";
import { getServerDataToMax } from "/utils/getters";
import { ServerHackData } from "types";
import { sleep } from "/utils/sleep";

import { EventEmitter } from "/vendor/eventemitter3/index.js";
import { HackLoopInfo } from "/modules/ThreadManager/ThreadManager";
import {
    COMMAND_EXEC_MIN_INTERVAL,
    MAX_COMMAND_EXEC_LAG,
    ODDIZ_HACK_TOOLKIT_SCRIPT_NAME,
    RAM_ALLOCATION_RATIO,
    TASK_EXEC_INTERVAL,
    TASK_EXEC_START_BUFFER,
} from "/utils/constants";
import { calculateHackLoop } from "/utils/calculateHackLoop";
import { moneyWithinHackRange } from "/modules/Thread/ThreadHelpers";
import { homeServerActive } from "/utils/homeServerActive";

/**
 * Runs for every server that we want to hack.
 */

export class Thread extends EventEmitter {
    targetHostname: string;
    targetServer: Server;
    targetServerHackData: ServerHackData | null;
    serverManager: ServerManager;
    ns: NS;
    initialHackLoopData: HackLoopInfo | null;
    unoptimalHackLoop: boolean;
    constructor(ns: NS, ServerManager: ServerManager, hostname: string) {
        super();

        this.ns = ns;
        this.serverManager = ServerManager;
        this.targetHostname = hostname;
        this.targetServer = this.ns.getServer(hostname);
        this.targetServerHackData = getServerDataToMax(
            this.ns,
            this.targetHostname,
            this.serverManager.homeServerCpu || 1
        );

        this.initialHackLoopData = null;

        this.unoptimalHackLoop = false;
    }

    run(): void {
        //this.ns.print("Running Thread for " + this.targetServer.organizationName);
        if (!this.targetServerHackData) {
            this.log("ERROR: Could not get server hack data. Terminating thread...)");
        }
        this.readyTargetForLoop()
            .then((serverReady) => {
                if (!serverReady) {
                    console.warn(`Thread for [${this.targetHostname}] is not ready after waiting for it to be ready!`);

                }
                this.emit("ready");
            })
            .catch(() => {
                //console.log("Error in Thread.run() :" + JSON.stringify(err));
            });
    }

    async initiateOptimalHacking(hackLoopData: HackLoopInfo) {
        //calculate real grow threads
        //at this point sec = minsec, money = maxmoney

        this.initialHackLoopData = hackLoopData;

        const isReady = await this.readyTargetForLoop();

        if (isReady) {
            //server is ready time to start perfect hack loop
            this.startLoop(hackLoopData);

            return;
        }
        console.warn("Target weren't ready after readyTargetForLoop(). isSuccessful: " + isReady);
    }

    async startLoop(initialLoopInfo: HackLoopInfo) {
        const percentage = initialLoopInfo.hackPercentage;
        let currentHLInfo: HackLoopInfo | null = initialLoopInfo;

        let HLInfoCache: HackLoopInfo = initialLoopInfo;
        const spawnHackTrio = () => {
            try {
                const hackData = this.getHackData();

                if (hackData.secDiff === 0 && hackData.moneyDiff < hackData.maxMoney * ((percentage - 5) / 100)) {
                    currentHLInfo = calculateHackLoop(
                        this.ns,
                        this.targetHostname,
                        percentage,
                        homeServerActive(this.ns) ? this.ns.getServer("home").cpuCores : 1
                    );
                }

                if (!currentHLInfo) return;

                if (isObjectChanged(HLInfoCache.opThreads, currentHLInfo.opThreads)) {
                    console.log("Thread info is changed!");
                    console.log("Old: " + JSON.stringify(HLInfoCache.opThreads, null, 2));
                    console.log("New: " + JSON.stringify(currentHLInfo.opThreads, null, 2));
                }

                HLInfoCache = currentHLInfo;

                const opTypes: {
                    op: string;
                    time: number;
                }[] = [];
                for (const opType in currentHLInfo.opTimes) {
                    opTypes.push({
                        op: opType,
                        time: currentHLInfo.opTimes[opType],
                    });
                }
                const { grow, hack, weaken } = currentHLInfo.opTimes;

                const currentTime = Date.now();
                const commandType = "trio";

                const weakenExecTime = currentTime + TASK_EXEC_START_BUFFER;
                const growExecTime = weakenExecTime + (weaken - grow) - TASK_EXEC_INTERVAL;
                const hackExecTime = growExecTime + (grow - hack) - TASK_EXEC_INTERVAL;
                //first hack
                const hackTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "hack",
                    threads: currentHLInfo.opThreads.hack,
                    executeTime: hackExecTime,
                    dispatchTime: currentTime,
                };
                //then grow
                const growTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "grow",
                    threads: currentHLInfo.opThreads.grow,
                    executeTime: growExecTime,
                    dispatchTime: currentTime,
                };
                //finally weaken
                const weakenTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "weaken",
                    threads: currentHLInfo.opThreads.weaken,
                    executeTime: weakenExecTime,
                    dispatchTime: currentTime,
                };

                const dispatchCommand: DispatchCommand = {
                    type: commandType,
                    tasks: [hackTask, growTask, weakenTask],
                    latestExecTime: currentTime + 300 + MAX_COMMAND_EXEC_LAG,
                    percentage: percentage,
                    force: this.unoptimalHackLoop ? true : false,
                };

                this.serverManager.dispatch(dispatchCommand);
            } catch (error) {
                console.log("Error in spawnHackTrio: " + error);
            }
        };
        console.log("Starting hack loop...");
        try {
            const totalAvailableRam = this.serverManager.getRamInfos().totalAvailableRam;

            const repeatCapacity = Math.floor((totalAvailableRam * RAM_ALLOCATION_RATIO) / currentHLInfo.requiredRam);

            if (repeatCapacity <= 0) throw new Error("Not enough RAM to allocate for hack loop!");
            const calculatedRepeatInt = Math.round(currentHLInfo.loopTime / repeatCapacity);

            const repeatInt = Math.max(calculatedRepeatInt, COMMAND_EXEC_MIN_INTERVAL);

            let notInRangeCounter = 0;
            while (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) {
                const server = this.ns.getServer(this.targetHostname);

                if (notInRangeCounter > 5) {
                    await this.readyTargetForLoop();
                    notInRangeCounter = 0;
                }

                if (
                    moneyWithinHackRange(server.moneyMax, server.moneyAvailable, percentage, 2) ||
                    this.unoptimalHackLoop
                ) {
                    spawnHackTrio();
                    notInRangeCounter = 0;
                } else {
                    console.warn("Didn't spawn hack trio because money is not within range");
                    notInRangeCounter++;
                }
                await sleep(repeatInt * 1.0 + Math.floor(Math.random() * 50));
            }
            console.log("Script is not running anymore. Terminating thread...");

            return;
        } catch (error) {
            if (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) {
                console.log("Error in startLoop: " + error);
            }
            return null;
        }
    }

    /**
     *
     * @param targetServerHackData ServerHackData
     *
     * @returns Promise<boolean> true if executed successfully, false if not
     */
    private async readyTargetForLoop(): Promise<boolean> {
        if (this.isReadyForLoop()) return true;

        const targetServerHackData = this.getHackData();

        const commandType = "readify";
        const commandResult: DispatchCommand = {
            type: "readify",
            tasks: [],
            latestExecTime: Infinity,
            force: true,
        };
        //if not ready for loop grow to max while weakening to min
        const weakenTime = Math.round(targetServerHackData.weakenTime);

        const maxTime = weakenTime;
        const now = Date.now();
        const weakenExecTime = now + TASK_EXEC_START_BUFFER;
        const growExecTime =
            now + TASK_EXEC_START_BUFFER + weakenTime - targetServerHackData.growTime - TASK_EXEC_INTERVAL;

        const growTask: Task = {
            commandType: commandType,
            target: this.targetHostname,
            op: "grow",
            threads: targetServerHackData.growthThreadsToMax,
            executeTime: growExecTime,
            dispatchTime: 0,
        };

        if (targetServerHackData.growthThreadsToMax > 0) commandResult.tasks.push(growTask);

        //sec decrease task

        const weakenThreads = targetServerHackData.weakenThreadsToMinAfterGrowth;
        const weakenTask: Task = {
            commandType: commandType,
            target: this.targetHostname,
            op: "weaken",
            threads: weakenThreads,
            executeTime: weakenExecTime,
            dispatchTime: 0,
        };

        if (weakenThreads > 0) commandResult.tasks.push(weakenTask);

        const dispatchResult = await this.serverManager.dispatch(commandResult);

        if (dispatchResult) {
            const waitTime = maxTime + 1000;
            this.log(`Waiting for ${this.ns.tFormat(waitTime)}...`);
            await sleep(waitTime);
            if (this.isReadyForLoop()) return true;
            else return false;
        } else {
            this.unoptimalHackLoop = true;
            return true;
        }
    }

    getHackData() {
        const newTargetHackData = getServerDataToMax(
            this.ns,
            this.targetHostname,
            this.serverManager.homeServerCpu || 1
        );
        this.targetServerHackData = newTargetHackData;
        return newTargetHackData;
    }
    isReadyForLoop(): boolean {
        if (this.unoptimalHackLoop) true;
        const hackData = this.getHackData();
        if (!hackData) return false;
        return hackData.growthThreadsToMax === 0 && hackData.weakenThreadsToMin === 0;
    }
    log(message: string | number) {
        this.ns.print(`[Thread for ${this.targetHostname}] ` + message);
        console.log(`[Thread for ${this.targetHostname}] ` + message);
    }
}

export function isGoldenInfo(serverHackData: ServerHackData): boolean {
    return serverHackData.growthThreadsToMax === 0 && serverHackData.weakenThreadsToMin === 0;
}

//detects change between objects states
export function isObjectChanged(oldObject: Record<string, unknown>, newObject: Record<string, unknown>): boolean {
    if (oldObject === newObject) return false;
    if (oldObject === null || newObject === null) return true;
    if (typeof oldObject !== typeof newObject) return true;
    if (typeof oldObject === "object") {
        const oldKeys = Object.keys(oldObject);
        const newKeys = Object.keys(newObject);
        if (oldKeys.length !== newKeys.length) return true;
        for (const key of oldKeys) {
            if (oldObject[key] !== newObject[key]) return true;
        }
    }
    return false;
}
