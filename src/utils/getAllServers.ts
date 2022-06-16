import { NS } from "typings/Bitburner";

/**
 * Retuns all accessible servers.
 * @param {import("typings/Bitburner").NS} ns
 *
 */
export function getAllServers(ns: NS) {
	ns.disableLog("ALL");
	ns.tail();
	const serversToCheck = ["home"];
	const serversChecked: string[] = [];

	while (serversToCheck.length > 0) {
		const serverToCheck = serversToCheck.pop();
		if (!serverToCheck) continue;

		if (arrayContains(serversChecked, serverToCheck)) continue;

		//ns.print("Scanning server: ", serverToCheck);
		const results = ns.scan(serverToCheck);
		serversChecked.push(serverToCheck);

		for (const result of results) {
			if (!arrayContains(serversChecked, result)) {
				serversToCheck.push(result);
			}
		}
	}

	const result: string[] = [];
	const remoteServers = ns.getPurchasedServers();

	for (const server of serversChecked) {
		if (remoteServers.includes(server)) {
			continue;
		} else {
			result.push(server);
		}
	}

	//await ns.write("all_servers.js", `export const allServers =  `, "w")
	//await ns.write("all_servers.js", JSON.stringify(serversChecked), "a")
	//ns.print(JSON.stringify(result));
	return result;
}

//checks if an item already exists in an array
const arrayContains = (array, item) => {
	for (const i of array) {
		if (i === item) {
			return true;
		}
	}
	return false;
};
