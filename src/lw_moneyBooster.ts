import { NS } from "./typings/Bitburner";
import { getRemoteServers } from "/utils/getters";

const GROW_DIR = "/payloads/lw_grow.js";
const WEAKEN_DIR = "/payloads/lw_weaken.js";

export async function main(ns: NS) {
    ns.tail();
    ns.disableLog("ALL");

    const target = ns.args[0] as string;

    const [growTime, weakenTime] = [ns.getGrowTime(target), ns.getWeakenTime(target)];
    const weakenSize = ns.getScriptRam(WEAKEN_DIR);
    const growSize = ns.getScriptRam(GROW_DIR);

    while (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target) > 0) {
        for (const server of ["home", ...ns.getPurchasedServers()]) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const execCapacity = Math.floor(availableRam / weakenSize);

            ns.exec(WEAKEN_DIR, server, execCapacity, target);
        }
        await ns.sleep(weakenTime + 200);
    }

    // hacking loop - 7 cycle of grows and then weaken
    while (target) {
        const remoteServers = getRemoteServers(ns).map((server) => server.hostname);
        for (let i = 0; i < 7; i++) {
            for (const server of ["home", ...remoteServers]) {
                await ns.scp([GROW_DIR, WEAKEN_DIR], server);
                const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
                const execCapacity = Math.floor(availableRam / growSize);

                for (let i = 0; i < execCapacity; i++) {
                    const randomNumber = Math.floor(Math.random() * 10000000);
                    ns.exec(GROW_DIR, server, 1, target, randomNumber);
                    await ns.sleep(10);
                }
            }

            await ns.sleep(growTime + 200);
        }
        await ns.sleep(100);

        for (const server of ["home", ...remoteServers]) {
            const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const execCapacity = Math.floor(availableRam / weakenSize);

            ns.exec(WEAKEN_DIR, server, execCapacity, target);
        }

        await ns.sleep(weakenTime + 200);
    }
}
