import { ServerManager } from "/modules/ServerManager/ServerManager";
import { NS, Server } from "/typings/Bitburner";
import { ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, SERVER_MAINTAINER_TICK_INTERVAL } from "/utils/constants";
import { getRemoteServers } from "/utils/getters";
import { sleep } from "/utils/sleep";

const loggingEnabled = false;

export async function main(ns: NS) {
    ns.tail();

    await new ServerMaintainer(ns).init();
    while (this.ns.scriptRunning("/maintainers/RemoteServerMaintainer.js", "home")) {
        await ns.sleep(1000);
    }
}
export class ServerMaintainer {
    private ns: NS;
    private serverManager: ServerManager | null;
    private serversMarkedForDelete: Set<string>;

    constructor(ns: NS, ServerManager?: ServerManager) {
        this.ns = ns;
        this.serverManager = ServerManager || null;
        this.serversMarkedForDelete = new Set();
    }

    init() {
        console.log("Server Maintainer Starting...");

        this.startLoop()
            .then(() => {
                console.log("Server Maintainer Loop Ended");

                return;
            })
            .catch((error) => {
                if (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) {
                    console.error("Error in startLoop\n" + JSON.stringify(error, null, 2));
                }
                return;
            });

        return this;
    }

    async startLoop() {
        const logger = new SMLogger(this.ns);

        const homeServer = this.ns.getServer("home");

        const cheatyWindow = eval("window") as Window;

        let weakestServer: Server;
        while (
            this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home") ||
            this.ns.scriptRunning("/maintainers/RemoteServerMaintainer.js", "home")
        ) {
            const maintenanceActive = cheatyWindow.localStorage.getItem("remoteMaintenanceActive") === "true";

            if (!maintenanceActive) {
                await sleep(SERVER_MAINTAINER_TICK_INTERVAL);
                continue;
            }
            try {
                //cleanup servers marked for delete if ready
                for (const hostname of this.serversMarkedForDelete) {
                    try {
                        const serverInfo = this.ns.getServer(hostname);

                        if (serverInfo.ramUsed === 0) {
                            const isSuccessful = this.ns.deleteServer(hostname);
                            if (isSuccessful && this.serverManager) {
                                this.serversMarkedForDelete.delete(hostname);
                                this.serverManager.refreshRemoteServers();
                            }
                        }
                    } catch (error) {
                        //server is already killed I guess??
                        this.serversMarkedForDelete.delete(hostname);
                    }
                }

                const playerMoney = this.ns.getServerMoneyAvailable("home");
                const allRemoteServers = getRemoteServers(this.ns);
                weakestServer = allRemoteServers.sort((a, b) => a.maxRam - b.maxRam)[0];

                //check we reached remote limit
                const maxRemoteRamAllowed = this.ns.getPurchasedServerMaxRam();
                if (
                    this.isAtRemoteCapacity() &&
                    allRemoteServers.every((server) => server.maxRam === maxRemoteRamAllowed)
                ) {
                    console.log("Maximum remote servers with maximum RAM reached");
                    break;
                }

                const lowestRam = weakestServer?.maxRam || 2;
                const minimumRamMultiplier = Math.max(
                    this.isAtRemoteCapacity() ? Math.log2(lowestRam) + 1 : Math.log2(lowestRam),
                    Math.log2(homeServer.maxRam)
                );

                const purchasableRamSize = mostRamSizeForMoney(this.ns, playerMoney);

                // check if we should purchase a server
                if (purchasableRamSize >= (2 ** minimumRamMultiplier || maxRemoteRamAllowed)) {
                    const serverName = `${Math.floor(Math.random() * 100)}-${purchasableRamSize}GB`;

                    if (this.isAtRemoteCapacity()) {
                        //cleanup mode
                        if (mostRamSizeForMoney(this.ns, playerMoney, 1) >= 2 ** minimumRamMultiplier) {
                            logger.updateMessage(
                                `Deleting server ${weakestServer.hostname} to make room for better one`
                            );
                            this.serversMarkedForDelete.add(weakestServer.hostname);
                        }
                    }

                    const hostname = this.ns.purchaseServer(serverName, purchasableRamSize);
                    if (hostname !== "") {
                        console.log("Purchased new server: " + hostname);
                        if (this.serverManager) {
                            await this.serverManager.copyPayloads(hostname);
                        }
                    }
                }

                //await outputServers();
            } catch (error) {
                if (this.ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home"))
                    console.error("Error inside Server Maintainer Loop\n" + JSON.stringify(error, null, 2));
            }
            await sleep(SERVER_MAINTAINER_TICK_INTERVAL);
        }

        return;
    }
    async outputServersToFile() {
        const myServers = this.ns.getPurchasedServers();

        await this.ns.write("remote_servers.js", JSON.stringify(myServers), "w");
    }

    serverIsMarkedForDelete(hostname: string) {
        return this.serversMarkedForDelete.has(hostname);
    }
    isAtRemoteCapacity() {
        const allRemotes = getRemoteServers(this.ns);

        return allRemotes.length === this.ns.getPurchasedServerLimit();
    }
}

function mostRamSizeForMoney(ns: NS, playerMoney, budgetRatio = 1) {
    const MAX_RAM_MULTIPLIER = 20;
    let ramMultiplier = 1;

    const serverCost = ns.getPurchasedServerCost(2 ** ramMultiplier);

    if (serverCost > playerMoney * budgetRatio) {
        return 2;
    }

    let maximumServerCost = serverCost;
    while (maximumServerCost < playerMoney * budgetRatio) {
        ramMultiplier++;
        maximumServerCost = ns.getPurchasedServerCost(2 ** ramMultiplier);
    }

    return 2 ** Math.min(ramMultiplier - 1, MAX_RAM_MULTIPLIER);
}

interface SMInfo {
    weakestServer: Server;
    targetRamMultiplier: number;
    playerMoney: number;
}
class SMLogger {
    ns: NS;
    latestMessage: string;
    latestSMInfo: SMInfo | undefined;
    latestMessageTime: string | undefined;
    loggingEnabled: boolean;
    constructor(ns: NS) {
        this.ns = ns;
        this.latestMessage = "";
        this.latestMessageTime;
        this.latestSMInfo;
        this.loggingEnabled = loggingEnabled;

        console.log("Logger initialized");
    }
    log(SMInfo?: SMInfo) {
        if (!SMInfo) {
            if (this.latestSMInfo) {
                SMInfo = this.latestSMInfo;
            } else {
                return;
            }
        }
        if (!this.loggingEnabled) return;

        this.latestSMInfo = SMInfo;

        this.ns.clearLog();
        this.ns.print(`Lowest RAM: ${SMInfo.weakestServer.maxRam}`);
        this.ns.print(`Minimum RAM to purchase: ${2 ** SMInfo.targetRamMultiplier}GB`);
        this.ns.print(
            `Money needed for next upgrade: ${this.ns.nFormat(
                this.ns.getPurchasedServerCost(2 ** SMInfo.targetRamMultiplier),
                "0,0"
            )}$`
        );
        this.ns.print(`Money available: ${this.ns.nFormat(SMInfo.playerMoney, "0,0")}$`);
        this.ns.print(`Currently can buy: ${mostRamSizeForMoney(this.ns, SMInfo.playerMoney, 1)}GB`);

        this.latestMessage && this.latestMessageTime
            ? this.ns.print(`[${this.latestMessageTime}] Latest message: ${this.latestMessage}`)
            : null;
    }

    updateMessage(message) {
        const date = new Date();
        const curTimeFormatted = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;

        this.latestMessage = message;
        this.latestMessageTime = curTimeFormatted;
        this.log();
    }
}
