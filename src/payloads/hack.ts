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
		const now = Date.now();
		const nowDate = new Date(now);

		ns.print("Executed at: " + ` [${nowDate.toLocaleTimeString()}]`);
		ns.print("Execute lag: " + (now - plannedExecuteTime) + "ms");
	}
	await ns.hack(target);
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
