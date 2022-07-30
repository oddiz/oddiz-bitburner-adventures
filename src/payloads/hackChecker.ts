import { HackLoopInfo } from "/modules/ThreadManager/ThreadManager";
import { NS } from "../typings/NetscriptDefinitions";

export async function main(ns: NS) {
    const target = ns.args[0] as string;
    const hackTime = ns.getHackTime(target);
    await sleep(hackTime - 200);

    if (!moneyIsWithinHackRange()) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ns.kill("/payloads/hack.js", ns.getHostname(), ...ns.args);
        console.log("Killing hack because money is not within hack range");
    }
}

function moneyIsWithinHackRange(leeway = 2) {
    const hackLoop = JSON.parse(eval("window").localStorage.getItem("activeHackLoop")) as HackLoopInfo;

    const activeServer = hackLoop.server;
    const hackPercentage = hackLoop.hackPercentage;
    const currentMoneyPercentage = (activeServer.moneyAvailable / activeServer.moneyMax) * 100;

    return (
        (hackPercentage - leeway <= currentMoneyPercentage && currentMoneyPercentage <= hackPercentage + leeway) ||
        currentMoneyPercentage === 100
    );
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
