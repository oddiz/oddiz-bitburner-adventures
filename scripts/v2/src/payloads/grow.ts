import { NS } from "typings/Bitburner";

export async function main(ns: NS) {
	const target = ns.args[0] as string;
	const executeTime = ns.args[1] as number;

	while (true) {
		const now = new Date().getTime();

		if (now > executeTime) {
			await ns.grow(target);

			break;
		} else {
			await ns.sleep(1000);
		}
	}
}
