import { NS, Server } from "/typings/NetscriptDefinitions";
import { getRootedServers } from "/utils/getters";
import { ServerManager } from "/modules/ServerManager/ServerManager";
import { Thread } from "/modules/Thread/Thread";
import { calculateHackLoop } from "/utils/calculateHackLoop";
import { DEBUG_MIN_LOOPTIME, DEBUG_MODE, ODDIZ_HACK_TOOLKIT_SCRIPT_NAME } from "/utils/constants";
import { selectBestServerToHack } from "/modules/ThreadManager/helpers/selectBestServerToHack";
import { EventEmitter } from "/vendor/eventemitter3/index.js";

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
export class ThreadManager extends EventEmitter {
    availableServers: Server[];
    serverManager: ServerManager;
    runningThreads: Map<string, RunningThread>;
    private forcedTarget: string | undefined;
    ns: NS;
    constructor(ns: NS, ServerManager: ServerManager, forcedTarget?: string) {
        super();
        this.ns = ns;
        this.availableServers = [];
        this.serverManager = ServerManager;
        this.runningThreads = new Map();
        this.forcedTarget = forcedTarget;
    }

    //TODO: ability to spawn multiple trio loops for different servers at the same time
    //TODO: better and safer way to check command against RAM - dry run first and see if it works

    async init() {
        this.log("Starting...");
        this.availableServers = getRootedServers(this.ns);

        this.once("all_threads_ready", () => {
            try {
                const calculatedServerLoopInfos = this.getHackLoopsFromThreads();

                if (!calculatedServerLoopInfos) {
                    console.log("getHackLoopsFromThreads() returned null, loop cannot start.");

                    return;
                }
                //this.log(JSON.stringify(calcOutput, null, 4));
                const totalAvailableRam = this.serverManager.getRamInfos().totalAvailableRam;
                const selectedTargetLoopInfo = selectBestServerToHack(calculatedServerLoopInfos, totalAvailableRam);
                if (!selectedTargetLoopInfo) throw new Error("No target found even with default interval!");

                console.log("Selected Target: " + JSON.stringify(selectedTargetLoopInfo, null, 2));

                const cheatyWindow = eval("window") as Window;
                const localStorage = cheatyWindow.localStorage;
                localStorage.setItem("activeHackLoop", JSON.stringify(selectedTargetLoopInfo));

                this.signalThreadToLoop(selectedTargetLoopInfo);
            } catch (error) {
                console.log("Error after all threads are ready: " + error);
            }
        });

        this.log("Deploying threads...");

        await this.deployThreads();
    }

    getHackLoopsFromThreads() {
        try {
            const allThreads = Array.from(this.runningThreads.values()).map((runningThread) => runningThread.thread);

            const calculatedServerLoopInfos: HackLoopInfo[] = [];
            for (let i = 1; i < 20; i++) {
                for (const thread of allThreads) {
                    const result = calculateHackLoop(
                        this.ns,
                        thread.targetHostname,
                        i * 5,
                        this.serverManager.homeServerCpu || 1
                    );

                    if (!result) {
                        this.log("No result found for thread: " + thread.targetHostname);
                        continue;
                    }

                    calculatedServerLoopInfos.push(result);
                }
            }

            return calculatedServerLoopInfos;
        } catch (error) {
            console.warn("Error getting hack loops from threads: " + error);
            return;
        }
    }
    async deployThreads() {
        //TODO debug mode only deploys 1 thread
        const targets: string[] = this.forcedTarget
            ? [this.forcedTarget]
            : getRootedServers(this.ns).map((server) => server.hostname);
        //const targets = ["iron-gym", "foodnstuff"];

        for (const target of targets) {
            const newThread = new Thread(this.ns, this.serverManager, target);
            newThread.run();

            const runningThread: RunningThread = { thread: newThread, ready: false };

            this.runningThreads.set(target, runningThread);

            const foundRunningThread = this.runningThreads.get(target);
            newThread.once("ready", async () => {
                try {
                    if (foundRunningThread) {
                        foundRunningThread.ready = true;

                        this.runningThreads.set(target, foundRunningThread);
                    }

                    //check if all threads are ready
                    const allThreadsReady = Array.from(this.runningThreads.values()).every((thread) => thread.ready);

                    if (DEBUG_MODE) {
                        const rootedServers = getRootedServers(this.ns)
                            .sort((a, b) => this.ns.getWeakenTime(a.hostname) - this.ns.getWeakenTime(b.hostname))
                            .filter((server) => this.ns.getWeakenTime(server.hostname) > DEBUG_MIN_LOOPTIME);

                        if (foundRunningThread?.thread.targetHostname === rootedServers[0].hostname) {
                            this.emit("all_threads_ready");
                            return;
                        }
                    } else {
                        if (allThreadsReady) {
                            this.emit("all_threads_ready");
                        }
                    }
                } catch (error) {
                    if (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) this.log("Error: " + error);
                }
            });
        }

        console.log("Threads deployed!");
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
    cores: number;
    server: Server;
    hostname: string;
    hackPercentage: number;
    totalThreads: number;
    income: number;
    loopTime: number;
    requiredRam: number;
    moneyPerThread: number;
    moneyPerMs: number;
    repeatInterval: number;
    goldenInfo: boolean;
    opThreads: Ops<number>;
    opTimes: Ops<number>;
    moneyPerCpuSecFormatted: string;
    moneyPerThreadFormatted: string;
}
