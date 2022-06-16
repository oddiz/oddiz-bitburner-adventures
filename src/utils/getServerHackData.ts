import { NS } from "/typings/Bitburner";

export interface ServerHackData {
	hostname: string;
	hackTime: number;
	growTime: number;
	weakenTime: number;
	money: number;
	maxMoney: number;
	minSec: number;
	curSec: number;
	growthThreadsToMax: number;
	growthSecIncrease: number;
	weakenThreadsToMin: number;
	moneyPerThread: number;
	moneyPerSecPerThread: number;
}

export function getServerHackData(ns: NS, server: string): ServerHackData {
	const hostname = server;

	let money = ns.getServerMoneyAvailable(server);
	if (money === 0) money = 1;
	const hackTime = ns.getHackTime(server);
	const growTime = ns.getGrowTime(server);
	const weakenTime = ns.getWeakenTime(server);
	const maxMoney = ns.getServerMaxMoney(server);
	const minSec = ns.getServerMinSecurityLevel(server);
	const curSec = ns.getServerSecurityLevel(server);

	let growthThreadsToMax = Math.ceil(ns.growthAnalyze(server, maxMoney / money));
	const moneyPerHack = Math.floor(money * ns.hackAnalyze(server));
	const result: ServerHackData = {
		hostname: hostname,
		hackTime: hackTime,
		growTime: growTime,
		weakenTime: weakenTime,
		money: money,
		maxMoney: maxMoney,
		minSec: minSec,
		curSec: curSec,
		growthThreadsToMax: growthThreadsToMax,
		growthSecIncrease: ns.growthAnalyzeSecurity(growthThreadsToMax, server, 1),
		weakenThreadsToMin: Math.ceil((curSec - minSec) * 20),
		moneyPerThread: moneyPerHack,
		moneyPerSecPerThread: Math.floor(moneyPerHack / (Math.max(weakenTime, hackTime, growTime) / 1000)),
	};

	return result;
}
