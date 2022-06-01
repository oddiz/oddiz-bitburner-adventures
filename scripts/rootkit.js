const rootOptions = ["brutessh", "ftpcrack"]

import {
    allServers
} from "./servers";

const rootedServers = [];

/** @param {import("..").NS} ns */
export async function main(ns) {

    const targets = ns.args.length ? ns.args : allServers;

    for (const target of targets) {
        if (ns.hasRootAccess(target)) {
            ns.print(target, " is already rooted!");

            if (target === "home") {
                continue;
            }
            if (rootedServers.includes(target)) {
                continue
            }
            rootedServers.push(target);
            continue;
        }

        if (ns.getHackingLevel() < ns.getServerRequiredHackingLevel(target)) {
            ns.print(target, " is not in your hacking level!");
            // continue;
        }
        let reqPorts = ns.getServerNumPortsRequired(target);

        if (reqPorts > rootOptions.length) {
            ns.print(target, " requires more ports than I can hack!");
            continue;
        }

        const hackQueue = rootOptions.slice(0, reqPorts);

        for (const hackMethod of hackQueue) {
            ns.print(hackMethod)
            hackTargetWithMethod(target, hackMethod)
        }

        ns.nuke(target);


        if (ns.hasRootAccess(target)) {
            ns.print(target, " is now rooted!");
            if (target !== "home" || !rootedServers.includes(target)) {
                rootedServers.push(target);
            }

        }
    }

    function hackTargetWithMethod(target, method) {
        switch (method) {
            case "brutessh":
                ns.print("Hacking ", target, " with brutessh...");
                ns.brutessh(target);
                break;

            case "ftpcrack":
                ns.print("Hacking ", target, " with ftpcrack...");
                ns.ftpcrack(target);
                break;

            case "smtp":
                ns.print("Hacking ", target, " with smtp...");
                ns.relaysmtp(target);
                break;

            case "http":
                ns.print("Hacking ", target, " with http...");
                ns.httpworm(target);
                break;

            case "sql":
                ns.print("Hacking ", target, " with sql...");
                ns.sqlinject(target);
                break;

            default:
                break;
        }
    }

    await ns.write("rooted_servers.js", `export const rootedServers =  `, "w")
    await ns.write("rooted_servers.js", JSON.stringify(rootedServers), "a")
}