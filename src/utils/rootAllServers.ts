import { getAllServers } from "/utils/getters";
import { NS } from "../typings/NetscriptDefinitions";

export async function main(ns: NS) {
    ns.disableLog("ALL");

    rootAllServers(ns);
}

export function rootAllServers(ns: NS) {
    const allServers = getAllServers(ns);
    const rootOptions = ["brutessh", "ftpcrack", "relaysmtp", "http", "sql"];
    const playerHackingLevel = ns.getHackingLevel();

    for (const server of allServers) {
        const reqPorts = ns.getServerNumPortsRequired(server);

        if (reqPorts > rootOptions.length) {
            //ns.print(target, " requires more ports than I can hack!");
            continue;
        }

        if (ns.hasRootAccess(server)) {
            continue;
        }

        if (playerHackingLevel < ns.getServerRequiredHackingLevel(server)) {
            continue;
        }

        for (const method of rootOptions) {
            hackTargetWithMethod(server, method);
        }

        if (ns.getServerNumPortsRequired(server) === 0) {
            ns.nuke(server);
        }

        if (ns.hasRootAccess(server)) {
            ns.print(server, " is now rooted!");
        }
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
}
