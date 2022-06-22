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
                console.log("Error in Thread.run() :" + err);
            });
    }

    async initiateOptimalHacking(hackLoopData: HackLoopInfo) {
        //calculate real grow threads
        //at this point sec = minsec, money = maxmoney

        if (!this.isReadyForLoop()) {
            console.log("Thread is not ready for loop yet, but should be... Terminating thread.");

            return;
        }

        const hackLoopMemory = await this.getLoopDataFromMemory();
        if (hackLoopMemory) {
            const serverHackLoopData = hackLoopMemory?.[this.targetHostname]?.[hackLoopData.hackPercentage];

            if (serverHackLoopData) {
                console.log("Already have data for this hack percentage");

                this.startLoop(serverHackLoopData);

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
    async startLoop(targetLoopInfo: HackLoopInfo) {
        const spawnHackTrio = () => {
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

                let counter = 2;

                const currentTime = Date.now();
                const commandType = "trio";
                //first hack
                const hackTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "hack",
                    threads: targetLoopInfo.opThreads.hack,
                    executeTime: currentTime + TASK_EXEC_START_BUFFER + loopTime - hack - TASK_EXEC_INTERVAL * counter,
                    dispatchTime: currentTime,
                };
                counter--;
                //then grow
                const growTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "grow",
                    threads: targetLoopInfo.opThreads.grow,
                    executeTime: currentTime + TASK_EXEC_START_BUFFER + loopTime - grow - TASK_EXEC_INTERVAL * counter,
                    dispatchTime: currentTime,
                };
                counter--;
                //finally weaken
                const weakenTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "weaken",
                    threads: targetLoopInfo.opThreads.weaken,
                    executeTime:
                        currentTime + TASK_EXEC_START_BUFFER + loopTime - weaken - TASK_EXEC_INTERVAL * counter,
                    dispatchTime: currentTime,
                };

                const dispatchCommand: DispatchCommand = {
                    type: commandType,
                    tasks: [hackTask, growTask, weakenTask],
                    latestExecTime: currentTime + 300 + MAX_COMMAND_EXEC_LAG,
                };

                this.serverManager.dispatch(dispatchCommand);
            } catch (error) {
                console.log("Error in spawnHackTrio: " + error);
            }
        };
        console.log("Starting hack loop...");
        try {
            const totalAvailableRam = this.serverManager.getAvailableRam().totalAvailableRam;
            const repeatCapacity = Math.floor((totalAvailableRam * RAM_ALLOCATION_RATIO) / targetLoopInfo.requiredRam);
            const calculatedRepeatInt = Math.round(targetLoopInfo.loopTime / repeatCapacity);

            console.log(
                "Recalculated repeat interval for current RAM specs. Old interval:" +
                    targetLoopInfo.repeatIntervalSec * 1000 +
                    "New interval: " +
                    calculatedRepeatInt
            );
            const repeatInt = Math.max(calculatedRepeatInt, COMMAND_EXEC_MIN_INTERVAL);

            while (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) {
                spawnHackTrio();
                await sleep(repeatInt * 1.0);
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
