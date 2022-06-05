//gets all servers found with getServers.js

const rootOptions = ["brutessh", "ftpcrack", "relaysmtp"]

import {
    getAllServers
} from "util/getAllServers";

const rootedServers = [];

/** @param {import("../../..").NS} ns */
export async function getRootedServers(ns) {

    const allServers = await getAllServers(ns);

    const targets = ns.args.length ? ns.args : allServers;

    const playerHackingLevel = ns.getHackingLevel()
    for (const target of targets) {

        //check if server is purchased server
        const serverInfo = ns.getServer(target);
        if (serverInfo.purchasedByPlayer) {
            continue;
        }
        if (ns.hasRootAccess(target)) {
            ns.print(target, " is already rooted!");

            if (target === "home") {
                continue;
            }
            if (rootedServers.includes(target)) {
                continue
            }
            rootedServers.push({
                name: target,
                hackLevel: ns.getServerRequiredHackingLevel(target),
                maxMoney: ns.getServerMaxMoney(target),
            });
            continue;
        }

        if (playerHackingLevel < ns.getServerRequiredHackingLevel(target)) {
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
                rootedServers.push({
                    name: target,
                    hackLevel: ns.getServerRequiredHackingLevel(target),
                    maxMoney: ns.getServerMaxMoney(target),
                });
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

            case "relaysmtp":
                ns.print("Hacking ", target, " with relay smtp...");
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

    //sort rooted servers by max money
    const sortedRootedServers = rootedServers.sort((a, b) => b.maxMoney - a.maxMoney).filter(server => server.hackLevel < playerHackingLevel).map(server => server.name);

    await ns.write("/logs/rooted_servers.js", `export const rootedServers =  `, "w")
    await ns.write("/logs/rooted_servers.js", JSON.stringify(sortedRootedServers), "a")

    return sortedRootedServers


}