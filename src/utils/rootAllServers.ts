import { getAllServers } from "/utils/getAllServers";
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

        ns.nuke(server);

        if (ns.hasRootAccess(server)) {
            ns.print(server, " is now rooted!");
        }
    }

    function hackTargetWithMethod(target: string, method: string) {
        switch (method) {
            case "brutessh":
                if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(target);
                break;

            case "ftpcrack":
                if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(target);
                break;

            case "relaysmtp":
                if (ns.fileExists("relaySMTP.exe", "home")) ns.relaysmtp(target);
                break;

            case "http":
                if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(target);
                break;

            case "sql":
                if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(target);
                break;

            default:
                break;
        }
    }
}
