import { NS } from "typings/Bitburner";

export async function main(ns: NS) {
	const target = ns.args[0] as string;
	const executeTime = (ns.args[1] as number) || 0;

	const date = new Date();
	const startTime = date.getTime();
	ns.print("Script run time: " + ` [${date.toLocaleTimeString()}]`);

	if (executeTime > startTime) {
		await sleep(executeTime - startTime);
	}

	const nowDate = new Date();
	const now = nowDate.getTime();

	ns.print("Executed at: " + ` [${nowDate.toLocaleTimeString()}]`);
	ns.print("Execute lag: " + (now - executeTime) + "ms");
	await ns.hack(target);
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
