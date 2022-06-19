import { NS, Server } from "typings/Bitburner";
import { DispatchCommand, ServerManager, Task } from "/modules/ServerManager/ServerManager";
import { getServerHackData, ServerHackData } from "/utils/getServerHackData";
import { sleep } from "/utils/sleep";

import { EventEmitter } from "/vendor/eventemitter3/index.js";
import { HackLoopInfo } from "/modules/ThreadManager/ThreadManager";
import { calculateHackLoop } from "/utils/calculateHackLoop";
import {
    COMMAND_EXEC_MIN_INTERVAL,
    ODDIZ_HACK_TOOLKIT_SCRIPT_NAME,
    RAM_ALLOCATION_RATIO,
    TASK_EXEC_INTERVAL,
} from "/utils/constants";
import { calculateWeakenThreads } from "/utils/calculateWeakenThreads";

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
        try {
            //this.ns.print("Running Thread for " + this.targetServer.organizationName);
            if (!this.targetServerHackData) {
                this.log("ERROR: Could not get server hack data. Terminating thread...)");
            }
            this.readyTargetForLoop()
                .then((serverReady) => {
                    if (!serverReady) {
                        console.warn(
                            `Thread for [${this.targetHostname}] is not ready after waiting for it to be ready!`
                        );
                    } else {
                        this.emit("ready");
                    }
                })
                .catch((err) => {
                    console.log("Error in Thread.run() :" + err);
                });
        } catch (error) {
            console.warn("Error in Thread.run() :" + error);
        }
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
            const serverHackLoopData = hackLoopMemory[this.targetHostname][hackLoopData.hackPercentage];

            if (serverHackLoopData) {
                console.log("Already have data for this hack percentage");

                this.startLoop(serverHackLoopData);

                return;
            }
            console.log("No data for this hack percentage. Memory:");
            console.log(JSON.stringify(hackLoopMemory, null, 2));
        }

        const commandType = "readify";
        const hackData = getServerHackData(this.ns, this.targetHostname);

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
            const totalAvailableRam = this.serverManager.getAvailableRam().totalAvailableRam;
            const targetSv = this.ns.getServer(this.targetHostname);
            const newHackData = calculateHackLoop(
                this.ns,
                targetSv,
                hackLoopData.hackPercentage,
                totalAvailableRam,
                this.serverManager.homeServerCpu || 1
            );

            if (!newHackData) {
                console.warn("Error calculating hack loop. Check logs.");

                return;
            }
            const goldenGrowThreads = newHackData.opThreads.grow;
            const goldenWeakenThreads = newHackData.opThreads.weaken;

            const goldenLoopInfo = hackLoopData;

            console.log(
                `Golden loop data acquired for ${hackLoopData.hostname}. Saving to memory + readifying the thread again.`
            );
            console.log(
                "Old grow threads: " + hackLoopData.opThreads.grow + " New grow threads: " + newHackData.opThreads.grow
            );
            console.log(
                "Old weaken threads: " +
                    hackLoopData.opThreads.weaken +
                    " New weaken threads: " +
                    newHackData.opThreads.weaken
            );

            goldenLoopInfo.opThreads.grow = goldenGrowThreads;
            goldenLoopInfo.opThreads.weaken = goldenWeakenThreads;

            goldenLoopInfo.goldenInfo = true;

            await this.saveLoopDataToMemory(goldenLoopInfo);
            // ready target again after messing with it to find golden loop info
            const isSuccessful = await this.readyTargetForLoop();

            if (isSuccessful) {
                //server is ready time to start perfect hack loop
                this.startLoop(goldenLoopInfo);

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

                let counter = 0;

                const currentTime = Date.now();
                const commandType = "trio";
                //first hack
                const hackTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "hack",
                    threads: targetLoopInfo.opThreads.hack,
                    executeTime: currentTime + loopTime - hack + TASK_EXEC_INTERVAL * counter,
                    dispatchTime: 0,
                };
                counter++;
                //then grow
                const growTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "grow",
                    threads: targetLoopInfo.opThreads.grow,
                    executeTime: currentTime + loopTime - grow + TASK_EXEC_INTERVAL * counter,
                    dispatchTime: 0,
                };
                counter++;
                //finally weaken
                const weakenTask: Task = {
                    commandType: commandType,
                    target: this.targetHostname,
                    op: "weaken",
                    threads: targetLoopInfo.opThreads.weaken,
                    executeTime: currentTime + loopTime - weaken + TASK_EXEC_INTERVAL * counter,
                    dispatchTime: 0,
                };

                const dispatchCommand: DispatchCommand = {
                    type: commandType,
                    tasks: [hackTask, growTask, weakenTask],
                    latestExecTime: currentTime + 100,
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
            const calculatedRepeatInt = targetLoopInfo.loopTime / repeatCapacity;

            console.log(
                "Recalculated repeat interval for current RAM specs. Old interval:" +
                    targetLoopInfo.repeatIntervalSec * 1000 +
                    "New interval: " +
                    calculatedRepeatInt
            );
            const repeatInt = Math.max(calculatedRepeatInt, COMMAND_EXEC_MIN_INTERVAL);
            //setInterval(spawnHackTrio, repeatInt * 1.01); //add %1 to make sure we good

            while (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) {
                spawnHackTrio();
                await sleep(repeatInt * 1.01).catch(() => {
                    return null;
                });
            }
            console.log("Script is not running anymore. Terminating thread...");

            return;
            //spawnHackTrio();
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
        console.log(targetServerHackData);

        const commandType = "readify";
        const commandResult: DispatchCommand = {
            type: "readify",
            tasks: [],
            latestExecTime: Infinity,
        };
        //if not ready for loop grow to max while weakening to min
        const weakenTime = Math.floor(targetServerHackData.weakenTime);

        const maxTime = weakenTime;
        const weakenExecTime = Date.now();
        const growExecTime = weakenExecTime - TASK_EXEC_INTERVAL;

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

        const hackData = this.targetServerHackData as ServerHackData;
        const secToDecrease = hackData.secDiff;
        const weakenThreads = hackData.weakenThreadsToMin + calculateWeakenThreads(hackData.growthSecIncrease, this.serverManager.homeServerCpu || 1);

        const weakenTask: Task = {
            commandType: commandType,
            target: this.targetHostname,
            op: "weaken",
            threads: weakenThreads,
            executeTime: weakenExecTime,
            dispatchTime: 0,
        };

        if (secToDecrease > 0) commandResult.tasks.push(weakenTask);

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
