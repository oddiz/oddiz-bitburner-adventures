import { NS, Server } from "typings/Bitburner";
import { getRootedServers } from "/utils/getRootedServers";
import { ServerManager } from "/modules/ServerManager/ServerManager";
import { Thread } from "/modules/Thread/Thread";
import { calculateHackLoop } from "/utils/calculateHackLoop";
import { ODDIZ_HACK_TOOLKIT_SCRIPT_NAME } from "/utils/constants";
import { selectBestServerToHack } from "/modules/ThreadManager/selectBestServerToHack";

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

    //TODO: ability to spawn multiple trio loops for different servers at the same time
    //TODO: better and safer way to check command against RAM - dry run first and see if it works

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
                        const calculatedServerLoopInfos: HackLoopInfo[] = [];
                        for (let i = 1; i < 12; i++) {
                            for (const thread of allThreads) {
                                const result = calculateHackLoop(
                                    this.ns,
                                    thread.targetServer,
                                    i * 9,
                                    totalAvailableRam
                                );

                                if (!result) {
                                    this.log("No result found for thread: " + thread.targetHostname);
                                    continue;
                                }

                                calculatedServerLoopInfos.push(result);
                            }
                            //this.log(JSON.stringify(calcOutput, null, 4));
                        }

                        const selectedTargetLoopInfo = selectBestServerToHack(calculatedServerLoopInfos);

                        if (!selectedTargetLoopInfo) throw new Error("No target found even with default interval!");

                        console.log("Selected Target: " + JSON.stringify(selectedTargetLoopInfo, null, 2));

                        this.signalThreadToLoop(selectedTargetLoopInfo);
                    }
                } catch (error) {
                    if (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) this.log("Error: " + error);
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
