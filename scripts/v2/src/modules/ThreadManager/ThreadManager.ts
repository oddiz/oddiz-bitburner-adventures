import { NS, Server } from "typings/Bitburner";
import { getRootedServers } from "/utils/getRootedServers";
import { ServerManager } from "/modules/ServerManager/ServerManager";
import { Thread } from "/modules/Thread/Thread";

export class ThreadManager {
	availableServers: Server[];
	serverManager: ServerManager;
	runningThreads: Map<string, Thread>;
	constructor(private ns: NS, ServerManager: ServerManager) {
		this.ns = ns;
		this.availableServers = [];
		this.serverManager = ServerManager;
		this.runningThreads = new Map();
	}

	async init() {
		this.log("Starting...");
		this.availableServers = await getRootedServers(this.ns);

		await this.ns
			.write("/logs/hackable_servers.txt", JSON.stringify(this.availableServers, null, 4), "w")
			.catch((err) => this.log(err));

		this.log("Deploying threads...");
		await this.deployThreads();
	}

	async deployThreads() {
		const targets: string[] = (await getRootedServers(this.ns)).map((server) => server.hostname);

		for (const target of targets) {
			const thread = new Thread(this.ns, this.serverManager, target);
			thread.run();

			this.runningThreads.set(target, thread);
		}
	}

	log(message: string) {
		this.ns.print("[ThreadManager] " + message);
	}
}
