import { calculateWeakenThreads } from "/utils/calculateWeakenThreads";
import { numCycleForGrowthByHackAmt } from "/modules/Thread/ThreadHelpers";
import { getPayloadSizes } from "/utils/getPayloadSizes";
import { NS, Server } from "/typings/Bitburner";
import { RAM_ALLOCATION_RATIO } from "/utils/constants";

/**
 * Calculates hack loop trio data. 
 * 
 * IMPORTANT: Always assumes server is on max money!
 * @param ns NS from bitburner
 * @param server Server object
 * @param percentage Percentage of money to hack each cycle
 * @param totalAvailableRam Total available RAM of remote servers
 * @param cores 
 * @returns 
 */
export function calculateHackLoop(ns: NS, server: Server, percentage: number, totalAvailableRam: number, cores = 1) {
    try {
        const maxMoney = ns.getServerMaxMoney(server.hostname);

        // Clamp number between two values
        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
        const safePercentage = clamp(percentage, 1, 99);

        /*
        const num = 100 / (100 - safePercentage);
        const growRatio = Math.ceil((num + Number.EPSILON) * 100) / 100;
        const reqGrowThreads = Math.ceil(ns.growthAnalyze(server.hostname, growRatio, 1));
        */

        const reqHackThreads = Math.floor(ns.hackAnalyzeThreads(server.hostname, maxMoney * (safePercentage / 100)));
        const hackSecIncrease = ns.hackAnalyzeSecurity(reqHackThreads, server.hostname);

        const reqGrowThreads = numCycleForGrowthByHackAmt(server, percentage / 100, maxMoney, ns.getPlayer(), cores);
        const growSecIncrease = ns.growthAnalyzeSecurity(reqGrowThreads, undefined, cores);

        const reqWeakenThreads = calculateWeakenThreads(ns, hackSecIncrease + growSecIncrease, cores);

        const hackTime = Math.ceil(ns.getHackTime(server.hostname));
        const growTime = Math.ceil(ns.getGrowTime(server.hostname));
        const weakenTime = Math.ceil(ns.getWeakenTime(server.hostname));

        const loopTime = Math.max(hackTime, growTime, weakenTime);
        const totalThreads = reqHackThreads + reqGrowThreads + reqWeakenThreads;
        const income = maxMoney * (safePercentage / 100);
        const scriptSizes = getPayloadSizes(ns);

        const reqRam =
            reqGrowThreads * scriptSizes.grow +
            reqHackThreads * scriptSizes.hack +
            reqWeakenThreads * scriptSizes.weaken;
        const repeatCapacity = Math.floor((totalAvailableRam * RAM_ALLOCATION_RATIO) / reqRam);
        return {
            cores: cores,
            hostname: server.hostname,
            hackPercentage: safePercentage,
            totalThreads: totalThreads,
            income: income,
            loopTime: loopTime,
            requiredRam: reqRam,
            moneyPerThread: Math.floor(income / totalThreads),
            moneyPerCpuSec: Math.floor(income / (loopTime / 1000)),
            moneyPerThreadFormatted: ns.nFormat(Math.floor(income / totalThreads), "0,0"),
            moneyPerCpuSecFormatted: ns.nFormat(Math.floor(income / (loopTime / 1000)), "0,0"),
            repeatIntervalSec: loopTime / 1000 / repeatCapacity,
            opThreads: {
                hack: reqHackThreads,
                grow: reqGrowThreads,
                weaken: reqWeakenThreads,
            },
            opTimes: {
                hack: hackTime,
                grow: growTime,
                weaken: weakenTime,
            },
            goldenInfo: false,
        };
    } catch (error) {
        console.log("Error calculating hack loop: " + error);
        return null;
    }
}
