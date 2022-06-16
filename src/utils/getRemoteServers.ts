import { NS, Server } from "typings/Bitburner";

export function getRemoteServers(ns: NS) {
	const remoteServers = ns.getPurchasedServers();
	const detailedRemoteServers: Server[] = [];
	for (const server of remoteServers) {
		const serverInfo = ns.getServer(server);

		if (!serverInfo) continue;

		detailedRemoteServers.push(serverInfo);
	}

	const sortedDetailedRemoteServers = detailedRemoteServers.sort((a, b) => b.maxRam - a.maxRam);

	return sortedDetailedRemoteServers;
}
