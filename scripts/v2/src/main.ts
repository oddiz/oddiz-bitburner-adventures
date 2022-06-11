import { ThreadController } from "modules/ThreadController/ThreadController";
import { NS } from "typings/Bitburner";

export async function main(ns: NS) {
	ns.tail();
	ns.print("Starting Oddiz Bitburner Script");

	ns.print("Running Thread Controller");
	const threadController = new ThreadController(ns);

	await threadController.run();
}
