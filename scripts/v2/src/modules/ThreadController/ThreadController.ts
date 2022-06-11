import { NS } from "typings/Bitburner";
import { getRootedServers } from "utils/getRootedServers";

export class ThreadController {
	constructor(private ns: NS) {
		this.ns = ns;
	}

	async run() {
		this.ns.tail();
		this.ns.print("Running Thread Controller");
		const servers = await getRootedServers(this.ns);
		this.ns.print(JSON.stringify(servers));
	}
}
