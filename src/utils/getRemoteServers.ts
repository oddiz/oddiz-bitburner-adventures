import { NS, Server } from "typings/Bitburner";

export function getRemoteServers(ns: NS): Server[] {
    const remoteServers = ns.getPurchasedServers();
    const detailedRemoteServers: Server[] = [];
    for (const server of remoteServers) {
        const serverInfo = ns.getServer(server);

        if (!serverInfo) continue;

        detailedRemoteServers.push(serverInfo);
    }

    const sortedDetailedRemoteServers = detailedRemoteServers.sort((a, b) => b.maxRam - a.maxRam);

    const homeServer = ns.getServer("home");
    const homeServerRam = homeServer.maxRam;
    const homeCpuCount = homeServer.cpuCores;

    const remoteServerTotalRam = sortedDetailedRemoteServers.reduce((acc, cur) => acc + cur.maxRam, 0);

    if (remoteServerTotalRam < homeServerRam * homeCpuCount) {
        return [homeServer];
    } else {
        return sortedDetailedRemoteServers;
    }
}
