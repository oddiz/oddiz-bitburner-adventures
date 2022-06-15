import { NS } from "../typings/Bitburner";

export async function main(ns: NS) {
	const target = ns.args[0] as string;
	const executeTime = (ns.args[1] as number) || 0;

	while (true) {
		const now = new Date().getTime();

		if (now > executeTime) {
			await ns.hack(target);

			break;
		} else {
			await ns.sleep(250);
		}
	}
}
