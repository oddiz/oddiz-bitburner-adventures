import { NS } from "./typings/Bitburner";
import { sleep } from "/utils/sleep";
import { getRemoteServers, getRootedServers } from "/utils/getters";

const GROW_DIR = "/payloads/lw_grow.js";
const WEAKEN_DIR = "/payloads/lw_weaken.js";
const HACK_DIR = "/payloads/lw_hack.js";
const GETTERS_DIR = "/utils/getters.js";
export async function main(ns: NS) {
    ns.tail();
    ns.disableLog("ALL");

    const target = ns.args[0] as string;

    // hacking loop - 4 cycle of ( 3x hack + grows) and then weaken
    while (target) {
        await copyPayloads(ns);
        if (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target) > 4) {
            await weakenTarget(ns, target, 1);
            continue;
        }

        if (ns.getServerMaxMoney(target) - ns.getServerMoneyAvailable(target) > 100) {
            await growTarget(ns, target, 1);
            continue;
        }

        await hackTarget(ns, target, 1);
    }
}
async function copyPayloads(ns: NS) {
    const rootedServers = getRootedServers(ns).map((server) => server.hostname);
    const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
    for (const server of ["home", ...remoteServers, ...rootedServers]) {
        await ns.scp([GROW_DIR, WEAKEN_DIR, HACK_DIR, GETTERS_DIR], server);
    }
}
async function hackTarget(ns, target, times = 1) {
    const hackSize = ns.getScriptRam(HACK_DIR);
    const rootedServers = getRootedServers(ns).map((server) => server.hostname);
    const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
    for (let q = 0; q < times; q++) {
        for (const server of ["home", ...remoteServers, ...rootedServers]) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const execCapacity = Math.floor((availableRam * 0.8) / hackSize) || 1;

            if (execCapacity === 0) continue;
            ns.exec(HACK_DIR, server, execCapacity, target);
        }
        await sleep(ns.getHackTime(target) + 200);
    }
}

async function growTarget(ns, target, times = 1) {
    const rootedServers = getRootedServers(ns).map((server) => server.hostname);
    const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
    const growSize = ns.getScriptRam(GROW_DIR);

    for (let q = 0; q < times; q++) {
        for (const server of ["home", ...remoteServers, ...rootedServers]) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const execCapacity = Math.floor(availableRam / growSize);

            if (execCapacity === 0) continue;
            ns.exec(GROW_DIR, server, execCapacity, target);
        }
        await sleep(ns.getGrowTime(target) + 200);
    }
}
async function weakenTarget(ns, target, times = 1) {
    const rootedServers = getRootedServers(ns).map((server) => server.hostname);
    const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
    const weakenSize = ns.getScriptRam(WEAKEN_DIR);

    for (let q = 0; q < times; q++) {
        for (const server of ["home", ...remoteServers, ...rootedServers]) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const execCapacity = Math.floor(availableRam / weakenSize);

            if (execCapacity === 0) continue;
            ns.exec(WEAKEN_DIR, server, execCapacity, target);
        }
        await sleep(ns.getWeakenTime(target) + 200);
    }
}
