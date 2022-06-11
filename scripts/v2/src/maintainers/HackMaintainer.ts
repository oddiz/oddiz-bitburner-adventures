import { getRootedServers } from "utils/getRootedServers";

const DESIRED_PARALLEL_SCRIPTS = 4;
/** @param {import("../../..").NS} ns */
export async function main(ns) {
	ns.tail();

	const targets = await (await getRootedServers(ns)).map((server) => server.name);
	ns.print(targets);

	while (true) {
		const remoteServers = ns.getPurchasedServers();
		/*
        //killing all scripts
        for (const tar of [...targets, ...remoteServers]) {
    
    
            ns.scriptKill("hack-tier0.js", tar);
    
        }
        */

		for (const target of [...targets, ...remoteServers]) {
			if (!ns.serverExists(target)) {
				continue;
			}

			ns.print("Processing ", target, " ...");

			await ns.scp("hack-tier0.js", target);
			for (const hackTarget of targets) {
				ns.print("Starting tier 0 hacking script for ", hackTarget, "on server: ", target);

				const serverRam = ns.getServerMaxRam(target);
				const scriptRam = ns.getScriptRam("hack-tier0.js", target);

				const optimalThread = Math.floor(serverRam / (scriptRam * DESIRED_PARALLEL_SCRIPTS)) || 1;
				ns.print(serverRam / (scriptRam * DESIRED_PARALLEL_SCRIPTS));
				const pid = ns.exec("hack-tier0.js", target, optimalThread, hackTarget);

				if (pid) {
					ns.print("Started script with pid: ", pid);
				} else {
					ns.print("Failed to start script");
				}
			}
		}

		await ns.sleep(15000);
	}
}
