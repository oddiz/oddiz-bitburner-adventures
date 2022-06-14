import { NS } from "typings/Bitburner";

export class RemoteSvController {
	constructor(private ns: NS) {
		this.ns = ns;
	}
	async main() {
		this.ns.print("test");
	}
}


