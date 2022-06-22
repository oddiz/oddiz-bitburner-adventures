import { calculateWeakenThreads } from "/utils/calculateWeakenThreads";
import { ceilNumberToDecimal } from "/utils/ceilNumberToDecimal";
import { NS } from "/typings/Bitburner";

export interface ServerHackData {
    cores: number;
    hostname: string;
    hackTime: number;
    growTime: number;
    weakenTime: number;
    money: number;
    maxMoney: number;
    minSec: number;
    curSec: number;
    secDiff: number;
    growthThreadsToMax: number;
    weakenThreadsToMin: number;
    weakenThreadsToMinAfterGrowth: number;
    growthSecIncrease: number;
    moneyPerThread: number;
    moneyPerSecPerThread: number;
}

export function getServerHackData(ns: NS, server: string, cores = 1): ServerHackData {
    const hostname = server;

    let money = ns.getServerMoneyAvailable(server);
    if (money === 0) money = 1;
    const hackTime = Math.ceil(ns.getHackTime(server));
    const growTime = Math.ceil(ns.getGrowTime(server));
    const weakenTime = Math.ceil(ns.getWeakenTime(server));
    const maxMoney = ns.getServerMaxMoney(server);
    const minSec = ceilNumberToDecimal(ns.getServerMinSecurityLevel(server), 2);
    const curSec = ceilNumberToDecimal(ns.getServerSecurityLevel(server), 2);
    const secDiff = ceilNumberToDecimal(ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server), 2);

    const weakenThreadsToMin = calculateWeakenThreads(ns, secDiff, cores);
    const growthThreadsToMax = Math.ceil(ns.growthAnalyze(server, maxMoney / money, cores));
    const growthSecIncrease = ceilNumberToDecimal(ns.growthAnalyzeSecurity(growthThreadsToMax, undefined, cores), 2);

    const weakenThreadsToMinAfterGrowth = calculateWeakenThreads(ns, growthSecIncrease + secDiff, cores);

    const moneyPerHack = Math.floor(money * ns.hackAnalyze(server));
    const result: ServerHackData = {
        cores: cores,
        hostname: hostname,
        hackTime: hackTime,
        growTime: growTime,
        weakenTime: weakenTime,
        money: money,
        maxMoney: maxMoney,
        minSec: minSec,
        curSec: curSec,
        secDiff: secDiff,
        growthSecIncrease: growthSecIncrease,

        growthThreadsToMax: growthThreadsToMax,
        weakenThreadsToMin: weakenThreadsToMin,
        weakenThreadsToMinAfterGrowth: weakenThreadsToMinAfterGrowth,

        moneyPerThread: moneyPerHack,
        moneyPerSecPerThread: Math.floor(moneyPerHack / (Math.max(weakenTime, hackTime, growTime) / 1000)),
    };

    return result;
}
