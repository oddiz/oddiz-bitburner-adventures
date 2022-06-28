import { NS, Server } from "typings/Bitburner";
import { commandCanRun } from "/modules/ServerManager/commandCanRun";
import { ServerMaintainer } from "/maintainers/RemoteServerMaintainer";
import { getPayloadSizes } from "/utils/getPayloadSizes";
import { getRemoteServers } from "/utils/getRemoteServers";

import { killAll } from "/utils/killAll";
import { COMMAND_EXEC_MIN_INTERVAL, ODDIZ_HACK_TOOLKIT_SCRIPT_NAME } from "/utils/constants";

export interface RemotesWithRamInfo {
    servers: ServerRamInfo[];
    totalAvailableRam: number;
}
export interface Task {
    commandType: DispatchCommand["type"];
    target: string;
    op: "weaken" | "grow" | "hack";
    threads: number;
    executeTime: number;
    dispatchTime: number;
}
export type DispatchCommand = ReadifyCommand | TrioCommand

type ReadifyCommand = {
    type: "readify";
    tasks: Task[];
    latestExecTime: number;
}

type TrioCommand = {
    type: "trio";
    tasks: Task[];
    latestExecTime: number;
    percentage: number;
}

interface ServerRamInfo {
    hostname: string;
    totalRam: number;
    availableRam: number;
}
interface UsedServer {
    hostname: string;
    ramUsed: number;
    threadsLaunched: number;
}

interface ExecuteTaskReturn {
    status: "success" | "failed" | "terminate";
    task: Task;
    usedServers: UsedServer[];
    message?: string;
}

export class ServerManager {
    public remoteServers: Server[];
    public totalRam: number;
    private commandQueue: DispatchCommand[];
    private scriptSizes: {
        hack: number;
        weaken: number;
        grow: number;
    };
    private processingQueue: boolean;
    serverMaintainer: ServerMaintainer;
    homeServer: boolean;
    homeServerCpu: number | null;
    interval: NodeJS.Timer | undefined;

    constructor(private ns: NS) {
        this.ns = ns;

        this.interval;

        this.serverMaintainer = new ServerMaintainer(this.ns, this);
        this.remoteServers = [];
        this.totalRam = 0;

        this.scriptSizes = getPayloadSizes(this.ns);

        this.commandQueue = [];
        this.processingQueue = false;

        this.homeServer = false;
        this.homeServerCpu = null;
    }
    async init() {
        this.ns.disableLog("scp");
        this.log("Starting...");
        this.log("Getting script sizes...");
        this.log("Getting remote servers...");
        this.refreshRemoteServers();

        this.log("Copying payloads to all servers...");
        await this.copyPayloads();

        this.log("Killing all processes on all servers...");
        await killAll(this.ns);

        this.log("Starting server maintainer...");
        this.serverMaintainer.init();

        this.totalRam = this.getTotalRam();
        //this.log(`Total RAM: ${this.totalRam}GB`);

        this.interval = setInterval(this.processCommands.bind(this), COMMAND_EXEC_MIN_INTERVAL / 2);

        return true;
    }

    clearCommandQueue() {
        this.commandQueue = [];
    }
    processCommands() {
        try {
            if (this.commandQueue.length === 0) {
                this.processingQueue = false;
                return false;
            }
            this.processingQueue = true;

            for (const [i, command] of this.commandQueue.entries()) {
                const now = Date.now();
                if (now > command.latestExecTime) {
                    console.log("Too late to execute command! Server manager is lagging!");

                    console.log("Difference: " + (now - command.latestExecTime));
                    continue;
                }

                const serversWithRamInfo = this.getAvailableRam();

                //console.log("needed ram: " + neededRam, "total ram: " + availableRam.totalAvailableRam);

                if (!commandCanRun(this.ns, command, serversWithRamInfo) && command.type === "trio") {
                    console.log("Not enough RAM to execute command! Better recalculate the loop. Discarding...");

                    this.commandQueue.splice(i, 1);

                    continue;
                }
                const execResults: ExecuteTaskReturn[] = [];
                for (const task of command.tasks) {
                    const dispatchTime = Date.now();

                    task.dispatchTime = dispatchTime;

                    const execResult = this.executeTask.bind(this)(task);

                    execResults.push(execResult);
                }

                if (execResults.some((result) => result.status !== "success")) {
                    console.log("Some task(s) in command failed! Command: " + JSON.stringify(command, null, 2));
                    console.log("Command tasks results: " + JSON.stringify(execResults, null, 2));

                    for (const result of execResults) {
                        if (result.status === "success") continue;

                        const usedServers = result.usedServers; // should be an array with one element but better be sure.
                        for (const remoteServer of usedServers) {
                            const killResult = this.ns.kill(
                                `/payloads/${result.task.op}.js`,
                                remoteServer.hostname,
                                result.task.target,
                                String(result.task.executeTime),
                                String(result.task.dispatchTime),
                                String(result.task.commandType === "readify" ? true : false)
                            );

                            if (!killResult) {
                                console.warn("Failed to kill payload script on server after a bad command.");
                                console.warn(`Remote server: ${remoteServer.hostname}`);
                            }
                        }
                    }
                }
            }
            //processing finished clear the queue
            this.clearCommandQueue();
            this.processingQueue = false;

            return true;
        } catch (error) {
            clearInterval(this.interval);
            if (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home"))
                console.log("Error in processTasks loop: " + error);

            return false;
        }

        return true;
    }
    executeTask(task: Task): ExecuteTaskReturn {
        try {
            //get ram status
            const ramInfo = this.getAvailableRam();
            const scriptSize = this.scriptSizes[task.op];

            const activeTask = task;
            const usedServers: UsedServer[] = [];
            let taskExecuted = false;

            for (const server of ramInfo.servers) {
                const serverAvailableRam = server.availableRam;
                const serverThreadCap = Math.floor(serverAvailableRam / scriptSize);

                if (serverThreadCap < 1) {
                    //we don't have enough ram for even 1 task in server, shouldn't happen

                    console.log("we don't have enough ram for even 1 task in server, this shouldn't happen");
                    continue;
                }

                if (serverThreadCap < activeTask.threads) {
                    console.warn(
                        "Server doesn't have enough ram to launch all threads! This shouldn't happen Server: " +
                            server.hostname
                    );
                }

                if (!this.ns.getServer(task.target)) {
                    console.log("Tried to execute in a non existing server! Server name: " + task.target);

                    continue;
                }

                const threadsToLaunch = activeTask.threads;
                const execResult = this.ns.exec(
                    `/payloads/${activeTask.op}.js`,
                    server.hostname,
                    threadsToLaunch,
                    activeTask.target,
                    String(activeTask.executeTime),
                    String(activeTask.dispatchTime),
                    task.commandType === "readify" ? true : false
                );

                if (execResult) {
                    usedServers.push({
                        hostname: server.hostname,
                        ramUsed: scriptSize * task.threads,
                        threadsLaunched: threadsToLaunch,
                    });
                    taskExecuted = true;
                    break;
                } else {
                    console.warn("Payload failed to execute");
                    console.warn(
                        "Command: " +
                            `exec(${`/payloads/${activeTask.op}.js`}, ${server.hostname}, ${Math.min(
                                serverThreadCap,
                                activeTask.threads
                            )}, ${activeTask.target}, ${String(activeTask.executeTime)}i ${String(
                                activeTask.dispatchTime
                            )}, ${task.commandType === "readify" ? true : false} )`
                    );
                    console.warn("Task:\n" + JSON.stringify(activeTask));
                    console.warn("Server RAM Info: " + JSON.stringify(server));
                    console.warn("Server thread Capacity: " + serverThreadCap);
                    continue;
                }
            }

            //if we reach here that means we partially executed it

            if (taskExecuted) {
                //Task executed successfully

                return {
                    status: "success",
                    task: task,
                    usedServers: usedServers,
                    message: "Task executed successfully",
                };
            } else {
                console.log(
                    "Task couldn't find enough RAM to execute! Shouldn't happen since we check for ram before executing a command!"
                );

                const response: ExecuteTaskReturn = {
                    status: "failed",
                    task: activeTask,
                    usedServers: usedServers,
                    message: "Task couldn't find enough RAM to execute!",
                };
                return response;
            }
        } catch (error) {
            console.log("Error in executeTask: " + JSON.stringify(error, null, 2));

            return {
                status: "terminate",
                task: task,
                usedServers: [],
                message: "Error in executeTask",
            };
        }
    }

    getTotalRam() {
        const servers = this.refreshRemoteServers();
        let totalRam = 0;
        for (const server of servers) {
            totalRam += server.maxRam;
        }
        return totalRam;
    }

    getAvailableRam(): RemotesWithRamInfo {
        const servers = this.refreshRemoteServers();

        const serversWithRamInfo: ServerRamInfo[] = [];
        let totalAvailableRam = 0;
        for (const server of servers) {
            const availableRam = server.maxRam - server.ramUsed;

            if (availableRam < 2) {
                //ignore the server
                continue;
            }

            if (this.serverMaintainer.serverIsMarkedForDelete(server.hostname)) {
                //ignore the server
                continue;
            }

            totalAvailableRam += availableRam;
            serversWithRamInfo.push({
                hostname: server.hostname,
                availableRam: availableRam,
                totalRam: server.maxRam,
            });
        }

        return {
            totalAvailableRam: totalAvailableRam,
            servers: serversWithRamInfo.sort((a, b) => b.availableRam - a.availableRam),
        };
    }

    refreshRemoteServers() {
        this.remoteServers = getRemoteServers(this.ns);

        const homeServer = this.ns.getServer("home");
        const homeServerRam = homeServer.maxRam;
        const homeServerCpuCount = homeServer.cpuCores;

        const remoteServerTotalRam = this.remoteServers.reduce((acc, cur) => acc + cur.maxRam, 0);

        if (remoteServerTotalRam < homeServerRam * homeServerCpuCount) {
            this.homeServer = true;
            this.homeServerCpu = this.ns.getServer("home").cpuCores;

            this.remoteServers = [homeServer];
        }
        return this.remoteServers;
    }

    addCommand(command: DispatchCommand) {
        this.processingQueue = true;
        this.commandQueue.push(command);
        this.processingQueue = false;

        return true;
    }
    dispatch(command: DispatchCommand) {
        const now = Date.now();
        const commandInvalid = command.tasks.some((task) => task.threads < 1);

        if (commandInvalid) {
            console.log("Command invalid because some task(s) have no threads! " + JSON.stringify(command));
            return false;
        }
        if (now > command.latestExecTime) {
            //too late to execute this task
            console.log(
                "Dispatcher recieved a task that was too late to execute. Thread is lagging!! - " +
                    (now - command.latestExecTime) +
                    " ms"
            );

            return false;
        }

        this.addCommand(command);

        const processResult = this.processCommands();

        return processResult;
    }

    async copyPayloads() {
        const PAYLOAD_NAMES = ["weaken.js", "grow.js", "hack.js"];
        const PAYLOAD_DIR = "/payloads";

        for (const server of this.remoteServers) {
            await this.ns.scp("/utils/constants.js", server.hostname);
            for (const payloadName of PAYLOAD_NAMES) {
                await this.ns.scp(`${PAYLOAD_DIR}/${payloadName}`, server.hostname);
            }
        }
    }
    log(message: string) {
        //this.ns.print("[ServerManager] " + message);
        console.log("[ServerManager] " + message);
    }
}
