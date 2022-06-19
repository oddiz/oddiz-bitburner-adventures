import { NS } from "typings/Bitburner";

export async function main(ns: NS) {
    const target = ns.args[0] as string;
    const plannedExecuteTime = (ns.args[1] as number) || 0;

    const startTime = Date.now();

    const dispatchTime = (ns.args[2] as number) || Date.now();

    ns.print("Script run time: " + ` [${new Date(startTime).toLocaleTimeString()}]`);
    ns.print("Script run lag: " + (startTime - dispatchTime) + "ms");

    if (plannedExecuteTime > startTime) {
        await sleep(plannedExecuteTime - dispatchTime);
    }

    let counter = 0;
    const waitInMs = 50;
    while (getSecurityLevel(ns, target) > 0) {
        await sleep(waitInMs);
        counter++;
    }

    if (counter > 0) {
        console.log(`Weaken waited ${counter * waitInMs} ms for server to be ready`);
    }

    const now = Date.now();
    const nowDate = new Date(now);

    ns.print("Executed at: " + ` [${nowDate.toLocaleTimeString()}]`);
    ns.print("Execute lag: " + (now - plannedExecuteTime) + "ms");
    await ns.weaken(target);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSecurityLevel(ns: NS, target: string) {
    const minSec = ns.getServerMinSecurityLevel(target);
    const curSec = ns.getServerMinSecurityLevel(target);

    return curSec - minSec;
}
