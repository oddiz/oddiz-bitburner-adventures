import { NS } from "typings/Bitburner";
import { MAX_HACK_EXEC_LAG } from "/utils/constants";

export async function main(ns: NS) {
    const target = ns.args[0] as string;
    const plannedExecuteTime = (ns.args[1] as number) || 0;
    const dispatchTime = (ns.args[2] as number) || Date.now();
    const force = (ns.args[3] as boolean) || false;
    const percentage = (ns.args[4] as number) || undefined;

    const startTime = Date.now();

    ns.print("Script run time: " + ` [${new Date(startTime).toLocaleTimeString()}]`);
    ns.print("Script run lag: " + (startTime - dispatchTime) + "ms");

    if (plannedExecuteTime > startTime) {
        await sleep(plannedExecuteTime - dispatchTime);
    }

    let counter = 0;
    const waitInMs = 20;
    if (!force) {
        while (getSecurityLevel(ns, target) > 0) {
            await sleep(waitInMs);
            counter++;
        }
    }

    if (counter > 0) {
        console.log(`Hack waited ${counter * waitInMs} ms for server to be ready`);
    }

    const now = Date.now();
    const nowDate = new Date(now);

    const executeLag = now - plannedExecuteTime;
    ns.print("Executed at: " + ` [${nowDate.toLocaleTimeString()}]`);
    ns.print("Execute lag: " + executeLag + "ms");
    if (executeLag > MAX_HACK_EXEC_LAG) {
        console.warn("hack.js couldn't execute because lag was too high. Lag: " + executeLag + "ms");

        return;
    }

    if (moneyInExpectedRanges()) await ns.hack(target);
    else console.warn("hack.js couldn't execute because money was not in expected ranges");

    function moneyInExpectedRanges() {
        if (percentage) return false;
        const money = ns.getServerMoneyAvailable(target);
        const maxMoney = ns.getServerMaxMoney(target);

        return money === maxMoney || isWithinHackRange(maxMoney, money, percentage, 2);
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSecurityLevel(ns: NS, target: string) {
    const minSec = ns.getServerMinSecurityLevel(target);
    const curSec = ns.getServerSecurityLevel(target);

    return curSec - minSec;
}

function isWithinHackRange(maxMoney, money, hackPercentage, leeway = 2) {
    const currentMoneyPercentage = (money / maxMoney) * 100;

    return hackPercentage - leeway <= currentMoneyPercentage && currentMoneyPercentage <= hackPercentage + leeway;
}
