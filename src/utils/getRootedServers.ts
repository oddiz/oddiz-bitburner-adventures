//gets all servers found with getServers.js

const rootOptions = ["brutessh", "ftpcrack", "relaysmtp", "http", "sql"];

import { getAllServers } from "/utils/getAllServers";
import { NS, Server } from "typings/Bitburner";

const rootedServers: Server[] = [];

export async function main(ns: NS) {
    ns.tail();
    ns.disableLog("ALL");

    const result = getRootedServers(ns);

    ns.print("Found servers: " + JSON.stringify(result, null, 2));
    console.log("Found servers: " + JSON.stringify(result, null, 2));
}

/**
 * Hacks and returs all rooted servers suitable for players hacking level.
 * @param {import("../../..").NS} ns */
export function getRootedServers(ns: NS) {
    try {
        ns.disableLog("ALL");
        const allServers = getAllServers(ns);
        const targets = allServers;

        const playerHackingLevel = ns.getHackingLevel();
        for (const target of targets) {
            //check if server is purchased server
            const serverInfo = ns.getServer(target);

            if (!serverInfo) continue;

            //skip player remote servers
            if (serverInfo.purchasedByPlayer) {
                continue;
            }
            if (ns.hasRootAccess(target)) {
                //ns.print(target, " is already rooted!");

                if (target === "home") {
                    continue;
                }
                if (isDuplicate(target)) {
                    continue;
                }
                rootedServers.push(serverInfo);
                continue;
            }

            if (playerHackingLevel < ns.getServerRequiredHackingLevel(target)) {
                //ns.print(target, " is not in your hacking level!");
                continue;
            }
            const reqPorts = ns.getServerNumPortsRequired(target);

            if (reqPorts > rootOptions.length) {
                //ns.print(target, " requires more ports than I can hack!");
                continue;
            }

            if (ns.getHackingLevel() > 48) {
                //brute ssh is not available below 48

                try {
                    const hackQueue = rootOptions.slice(0, reqPorts);

                    for (const hackMethod of hackQueue) {
                        //ns.print(hackMethod);
                        hackTargetWithMethod(target, hackMethod);
                    }
                } catch (error) {
                    //do nothing
                }
            }

            const server = ns.getServer(target);
            if (server.numOpenPortsRequired > server.openPortCount) {
                continue;
            }

            ns.nuke(target);

            if (ns.hasRootAccess(target)) {
                ns.print(target, " is now rooted!");
                if (target !== "home" || !isDuplicate(target)) {
                    rootedServers.push(serverInfo);
                }
            }
        }

        //sort rooted servers by max money
        const sortedRootedServers = rootedServers
            .sort((a, b) => b.moneyMax - a.moneyMax)
            .filter((server) => server.moneyMax > 0);

        //ns.write("/logs/rooted_servers.js", JSON.stringify(sortedRootedServers), "w");

        return sortedRootedServers;
    } catch (error) {
        console.log(error);
        return [];
    }
    function hackTargetWithMethod(target: string, method: string) {
        switch (method) {
            case "brutessh":
                ns.brutessh(target);
                break;

            case "ftpcrack":
                ns.ftpcrack(target);
                break;

            case "relaysmtp":
                ns.relaysmtp(target);
                break;

            case "http":
                ns.httpworm(target);
                break;

            case "sql":
                ns.sqlinject(target);
                break;

            default:
                break;
        }
    }
    function isDuplicate(name: string) {
        let duplicateFound = false;
        for (const server of rootedServers) {
            if (server.hostname === name) {
                duplicateFound = true;
            }
        }

        return duplicateFound;
    }
}
