import { NS } from "./typings/NetscriptDefinitions";
import { sleep } from "/utils/sleep";
import { getRemoteServers, getRootedServers } from "/utils/getters";

const LW_GROW_DIR = "/payloads/lw_grow.js";
const LW_WEAKEN_DIR = "/payloads/lw_weaken.js";
const LW_HACK_DIR = "/payloads/lw_hack.js";
const GETTERS_DIR = "/utils/getters.js";

export async function main(ns: NS, hackMode = true) {
    ns.tail();
    ns.disableLog("ALL");

    const target = ns.args[0] as string;

    // hacking loop
    while (ns.scriptRunning("lw_hackLoop.js", "home")) {
        await copyPayloads(ns);
        // weaken security if it's more than 4
        if (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target) > 4) {
            await weakenTarget(ns, target);
            continue;
        }

        // grow money if it's less than max money
        if (ns.getServerMaxMoney(target) < ns.getServerMoneyAvailable(target)) {
            await growTarget(ns, target);
            continue;
        }

        // if hack mode is disabled it only boosts server's money
        if (hackMode) {
            await hackTarget(ns, target);
        } else {
            // money boost complete, lower sec to min
            while (ns.getServerSecurityLevel(target) !== ns.getServerMinSecurityLevel(target)) {
                await weakenTarget(ns, target);
            }
            break;
        }
    }
}

async function copyPayloads(ns: NS) {
    const rootedServers = getRootedServers(ns).map((server) => server.hostname);
    const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
    for (const server of ["home", ...remoteServers, ...rootedServers]) {
        await ns.scp([LW_GROW_DIR, LW_WEAKEN_DIR, LW_HACK_DIR, GETTERS_DIR], server);
    }
}

async function hackTarget(ns, target, times = 1) {
    const hackSize = ns.getScriptRam(LW_HACK_DIR);
    const rootedServers = getRootedServers(ns).map((server) => server.hostname);
    const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
    for (let q = 0; q < times; q++) {
        for (const server of ["home", ...remoteServers, ...rootedServers]) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const execCapacity = Math.floor((availableRam * 0.8) / hackSize) || 1;

            if (execCapacity === 0) continue;
            ns.exec(LW_HACK_DIR, server, execCapacity, target);
        }
        await sleep(ns.getHackTime(target) + 200);
    }
}

async function growTarget(ns, target, times = 1) {
    const rootedServers = getRootedServers(ns).map((server) => server.hostname);
    const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
    const growSize = ns.getScriptRam(LW_GROW_DIR);

    for (let q = 0; q < times; q++) {
        for (const server of ["home", ...remoteServers, ...rootedServers]) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const execCapacity = Math.floor(availableRam / growSize);

            if (execCapacity === 0) continue;
            ns.exec(LW_GROW_DIR, server, execCapacity, target);
        }
        await sleep(ns.getGrowTime(target) + 200);
    }
}

async function weakenTarget(ns, target, times = 1) {
    const rootedServers = getRootedServers(ns).map((server) => server.hostname);
    const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
    const weakenSize = ns.getScriptRam(LW_WEAKEN_DIR);

    for (let q = 0; q < times; q++) {
        for (const server of ["home", ...remoteServers, ...rootedServers]) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const execCapacity = Math.floor(availableRam / weakenSize);

            if (execCapacity === 0) continue;
            ns.exec(LW_WEAKEN_DIR, server, execCapacity, target);
        }
        await sleep(ns.getWeakenTime(target) + 200);
    }
}
