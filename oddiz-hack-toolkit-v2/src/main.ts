import { ThreadManager } from "./modules/ThreadManager/ThreadManager";
import { NS } from "typings/Bitburner";
import { ServerManager } from "./modules/ServerManager/ServerManager";
import { sleep } from "/utils/sleep";

export async function main(ns: NS) {
	ns.tail();
	ns.print("Starting Oddiz Bitburner Script");

	ns.print("Running Server Manager");
	const serverManager = new ServerManager(ns);
	await serverManager.init();
	ns.print("Running Thread Manager");
	const threadManager = new ThreadManager(ns, serverManager);
	await threadManager.init();

	while (true) await ns.asleep(100000);
}
