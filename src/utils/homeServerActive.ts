import { NS } from "../typings/NetscriptDefinitions";

export function homeServerActive(ns: NS) {
    const remoteServers = ns.getPurchasedServers().map((server) => ns.getServer(server));

    const homeServer = ns.getServer("home");
    const homeServerRam = homeServer.maxRam;
    const homeServerCpuCount = homeServer.cpuCores;

    const remoteServersTotalRam = remoteServers.reduce((acc, cur) => acc + cur.maxRam, 0);

    return remoteServersTotalRam < homeServerRam * homeServerCpuCount;
}
