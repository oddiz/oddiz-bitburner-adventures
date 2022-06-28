import { NS, Server } from "typings/Bitburner";
import { DispatchCommand, ServerManager, Task } from "/modules/ServerManager/ServerManager";
import { getServerHackData, ServerHackData } from "/utils/getServerHackData";
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

/**
 * Runs for every server that we want to hack.
 */

interface MemoryServer {
    [percentage: number]: HackLoopInfo;
}
interface LoopDataMemory {
    [hostname: string]: MemoryServer;
}
export class Thread extends EventEmitter {
    targetHostname: string;
    targetServer: Server;
    targetServerHackData: ServerHackData | null;
    serverManager: ServerManager;
    ns: NS;
    initialHackLoopData: HackLoopInfo | null;
    constructor(ns: NS, ServerManager: ServerManager, hostname: string) {
        super();

        this.ns = ns;
        this.serverManager = ServerManager;
        this.targetHostname = hostname;
        this.targetServer = this.ns.getServer(hostname);
        this.targetServerHackData = getServerHackData(
            this.ns,
            this.targetHostname,
            this.serverManager.homeServerCpu || 1
        );

        this.initialHackLoopData = null;

        this.run();
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
                } else {
                    this.emit("ready");
                }
            })
            .catch((err) => {
                console.log("Error in Thread.run() :" + JSON.stringify(err));
            });
    }

    async initiateOptimalHacking(hackLoopData: HackLoopInfo) {
        //calculate real grow threads
        //at this point sec = minsec, money = maxmoney

        if (!this.isReadyForLoop()) {
            console.log("Thread is not ready for loop yet, but should be... Terminating thread.");

            return;
        }

        this.initialHackLoopData = hackLoopData;

        const hackLoopMemory = false; // await this.getLoopDataFromMemory();
        if (hackLoopMemory) {
            const serverHackLoopData = hackLoopMemory?.[this.targetHostname]?.[hackLoopData.hackPercentage];

            if (serverHackLoopData) {
                console.log("Already have data for this hack percentage");

                this.startLoop(hackLoopData);

                return;
            }
            console.log("No data for this hack percentage. Memory:");
            console.log(JSON.stringify(hackLoopMemory, null, 2));
        }

        const commandType = "readify";
        const hackData = this.getHackData();

        //execute 1 hack task
        const hackTask: Task = {
            commandType: commandType,
            target: this.targetHostname,
            op: "hack",
            threads: hackLoopData.opThreads.hack,
            executeTime: Date.now(),
            dispatchTime: 0,
        };

        const hackCommand: DispatchCommand = {
            type: "readify",
            tasks: [hackTask],
            latestExecTime: Infinity,
        };

        const result = await this.serverManager.dispatch(hackCommand);

        await sleep(hackData.hackTime + 500);
        if (result) {
            const newHackData = this.getHackData();

            const newHackLoopData = JSON.parse(JSON.stringify(hackLoopData));
            if (!newHackData) {
                console.warn("Error calculating hack loop. Check logs.");

                return;
            }

            newHackLoopData.opThreads.grow = newHackData.growthThreadsToMax;
            newHackLoopData.opThreads.weaken = newHackData.weakenThreadsToMinAfterGrowth;

            console.log(`Golden loop data acquired for ${hackLoopData.hostname}. Readifying the thread again.`);
            console.log(
                "Old grow threads: " +
                    hackLoopData.opThreads.grow +
                    " New grow threads: " +
                    newHackLoopData.opThreads.grow
            );
            console.log(
                "Old weaken threads: " +
                    hackLoopData.opThreads.weaken +
                    " New weaken threads: " +
                    newHackLoopData.opThreads.weaken
            );
            console.log(
                "Old grow time: " + hackLoopData.opTimes.grow + " New grow time: " + newHackLoopData.opTimes.grow
            );
            console.log(
                "Old weaken time: " +
                    hackLoopData.opTimes.weaken +
                    " New weaken time: " +
                    newHackLoopData.opTimes.weaken
            );

            newHackLoopData.goldenInfo = true;

            console.log("New hack loop data: " + JSON.stringify(newHackLoopData, null, 2));

            await this.saveLoopDataToMemory(newHackLoopData);
            // ready target again after messing with it to find golden loop info
            const isSuccessful = await this.readyTargetForLoop();

            if (isSuccessful) {
                //server is ready time to start perfect hack loop
                this.startLoop(newHackLoopData);

                return;
            }
            console.warn("Target weren't ready after readyTargetForLoop(). isSuccessful: " + isSuccessful);
        }
    }

    async saveLoopDataToMemory(hackLoopData: HackLoopInfo) {
        try {
            if (this.serverManager.homeServer) {
                return;
            }
            let memory = await this.getLoopDataFromMemory();

            if (!memory) {
                memory = {};
            }

            const loopTarget = memory?.[hackLoopData.hostname] || {};

            loopTarget[String(hackLoopData.hackPercentage)] = hackLoopData;
            memory[hackLoopData.hostname] = loopTarget;

            console.log("Saving golden loop to memory...");
            await this.ns.write("hackLoopMemory.js", JSON.stringify(memory, null, 2), "w");
        } catch (error) {
            console.warn("Failed to save the golden loop info to memory");
            console.log(error);
        }
    }

    async getLoopDataFromMemory(): Promise<LoopDataMemory | null> {
        try {
            if (this.serverManager.homeServer) return null;
            const memory = await this.ns.read("hackLoopMemory.js");
            const parsedMemory: LoopDataMemory = JSON.parse(memory);
            if (!parsedMemory) {
                console.log("Couldn't get memory");
                return null;
            }

            return parsedMemory;
        } catch (error) {
            return null;
        }
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
                        this.serverManager.homeServerCpu || 1
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
                };

                this.serverManager.dispatch(dispatchCommand);
            } catch (error) {
                console.log("Error in spawnHackTrio: " + error);
            }
        };
        console.log("Starting hack loop...");
        try {
            const totalAvailableRam = this.serverManager.getAvailableRam().totalAvailableRam;
            const initialRepeatCap = Math.floor(
                (totalAvailableRam * RAM_ALLOCATION_RATIO) / initialLoopInfo.requiredRam
            );
            const repeatCapacity = Math.floor((totalAvailableRam * RAM_ALLOCATION_RATIO) / currentHLInfo.requiredRam);
            const calculatedRepeatInt = Math.round(currentHLInfo.loopTime / repeatCapacity);
            const initialRepeatInt = Math.round(currentHLInfo.loopTime / initialRepeatCap);

            console.log(
                "Recalculated repeat interval for current RAM specs. Old interval:" +
                    initialRepeatInt +
                    "New interval: " +
                    calculatedRepeatInt
            );
            const repeatInt = Math.max(calculatedRepeatInt, COMMAND_EXEC_MIN_INTERVAL);

            let notInRangeCounter = 0;
            while (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) {
                const server = this.ns.getServer(this.targetHostname);

                if (notInRangeCounter > 20) {
                    await this.readyTargetForLoop();
                    notInRangeCounter = 0;
                }

                if (moneyWithinHackRange(server.moneyMax, server.moneyAvailable, percentage, 2)) {
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

        if (!dispatchResult) {
            console.log("Error trying to dispatch task. Task: " + JSON.stringify(commandResult));
        }

        const waitTime = maxTime + 1000;
        this.log(`Waiting for ${this.ns.tFormat(waitTime)}...`);
        await sleep(waitTime);

        if (this.isReadyForLoop()) return true;
        else return false;
    }

    getHackData() {
        const newTargetHackData = getServerHackData(
            this.ns,
            this.targetHostname,
            this.serverManager.homeServerCpu || 1
        );
        this.targetServerHackData = newTargetHackData;
        return newTargetHackData;
    }
    isReadyForLoop(): boolean {
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
