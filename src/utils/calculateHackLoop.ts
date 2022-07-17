import { calculateWeakenThreads } from "/utils/calculateWeakenThreads";
import { numCycleForGrowthByHackAmt } from "/modules/Thread/ThreadHelpers";
import { getTotalAvailableRam, getPayloadSizes } from "/utils/getters";
import { NS } from "/typings/Bitburner";
import { HackLoopInfo } from "/modules/ThreadManager/ThreadManager";
import { COMMAND_EXEC_MIN_INTERVAL, RAM_ALLOCATION_RATIO } from "utils/constants";

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
export function calculateHackLoop(ns: NS, hostname: string, percentage: number, cores = 1): HackLoopInfo | null {
    try {
        const server = ns.getServer(hostname);

        // Clamp number between two values
        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
        const safePercentage = clamp(percentage, 1, 99);

        /*
        const num = 100 / (100 - safePercentage);
        const growRatio = Math.ceil((num + Number.EPSILON) * 100) / 100;
        const reqGrowThreads = Math.ceil(ns.growthAnalyze(server.hostname, growRatio, 1));
        */

        const reqHackThreads = Math.floor(
            ns.hackAnalyzeThreads(server.hostname, server.moneyAvailable * (safePercentage / 100))
        );
        const hackSecIncrease = ns.hackAnalyzeSecurity(reqHackThreads, server.hostname);

        const player = ns.getPlayer();
        const reqGrowThreads = Math.ceil(
            numCycleForGrowthByHackAmt(server, percentage / 100, server.moneyAvailable, player, cores)
        );
        const growSecIncrease = ns.growthAnalyzeSecurity(reqGrowThreads, undefined, cores);

        const reqWeakenThreads = calculateWeakenThreads(ns, hackSecIncrease + growSecIncrease, cores);

        const hackTime = Math.ceil(ns.getHackTime(server.hostname));
        const growTime = Math.ceil(ns.getGrowTime(server.hostname));
        const weakenTime = Math.ceil(ns.getWeakenTime(server.hostname));

        const loopTime = Math.max(hackTime, growTime, weakenTime);
        const totalThreads = reqHackThreads + reqGrowThreads + reqWeakenThreads;
        const income = server.moneyAvailable * (safePercentage / 100);
        const scriptSizes = getPayloadSizes(ns);

        const reqRam =
            reqGrowThreads * scriptSizes.grow +
            reqHackThreads * scriptSizes.hack +
            reqWeakenThreads * scriptSizes.weaken;

        //income calculation
        const totalAvailableRam = getTotalAvailableRam(ns);

        const maxRepeatCapacity = Math.floor(loopTime / COMMAND_EXEC_MIN_INTERVAL);
        const repeatCapacity = Math.floor((totalAvailableRam * RAM_ALLOCATION_RATIO) / reqRam);

        const realRepeatCapacity = Math.min(maxRepeatCapacity, repeatCapacity);

        const moneyPerLoop = income * (safePercentage / 100) * realRepeatCapacity;
        const moneyPerMs = moneyPerLoop / loopTime;
        return {
            cores: cores,
            hostname: server.hostname,
            hackPercentage: safePercentage,
            totalThreads: totalThreads,
            income: income,
            loopTime: loopTime,
            requiredRam: reqRam,
            moneyPerThread: Math.floor(income / totalThreads),
            moneyPerMs: moneyPerMs,
            moneyPerThreadFormatted: ns.nFormat(Math.floor(income / totalThreads), "0,0"),
            moneyPerCpuSecFormatted: ns.nFormat(Math.floor(income / (loopTime / 1000)), "0,0"),
            repeatInterval:
                realRepeatCapacity === 1
                    ? Math.round(loopTime / realRepeatCapacity) + 1000
                    : Math.round(loopTime / realRepeatCapacity),
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
