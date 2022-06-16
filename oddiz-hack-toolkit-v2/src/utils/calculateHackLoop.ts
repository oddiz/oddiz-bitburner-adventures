import { calculateWeakenThreads } from "/utils/calculateWeakenThreads";
import { getServerHackData } from "/utils/getServerHackData";
import { numCycleForGrowthByHackAmt } from "/modules/Thread/ThreadHelpers";
import { getPayloadSizes } from "/utils/getPayloadSizes";
import { NS, Server } from "/typings/Bitburner";

export function calculateHackLoop(ns: NS, server: Server, percentage: number, totalAvailableRam: number) {
	try {
		const serverHackData = getServerHackData(ns, server.hostname);
		let money = serverHackData.money;
		if (money === 0) money = 1;
		const safePercentage = percentage > 1 ? percentage : 1;

		/*
        const num = 100 / (100 - safePercentage);
        const growRatio = Math.ceil((num + Number.EPSILON) * 100) / 100;
        const reqGrowThreads = Math.ceil(ns.growthAnalyze(server.hostname, growRatio, 1));
        */

		const reqHackThreads = Math.floor(ns.hackAnalyzeThreads(server.hostname, money * (safePercentage / 100)));
		const hackSecIncrease = ns.hackAnalyzeSecurity(reqHackThreads, server.hostname);

		const reqGrowThreads = numCycleForGrowthByHackAmt(server, percentage / 100, money, ns.getPlayer(), 1);
		const growSecIncrease = ns.growthAnalyzeSecurity(reqGrowThreads);

		const reqWeakenThreads = Math.ceil(calculateWeakenThreads(hackSecIncrease + growSecIncrease));

		const { hackTime, growTime, weakenTime } = serverHackData;

		const loopTime = Math.max(hackTime, growTime, weakenTime);
		const totalThreads = reqHackThreads + reqGrowThreads + reqWeakenThreads;
		const income = money * (safePercentage / 100);
		const scriptSizes = getPayloadSizes(ns);

		const reqRam =
			reqGrowThreads * scriptSizes.grow +
			reqHackThreads * scriptSizes.hack +
			reqWeakenThreads * scriptSizes.weaken;
		const repeatCapacity = Math.floor(totalAvailableRam / reqRam);
		return {
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
