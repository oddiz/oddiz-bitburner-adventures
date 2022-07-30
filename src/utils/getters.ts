import { NS, Server } from "../typings/NetscriptDefinitions";
import { ceilNumberToDecimal } from "/utils/ceilNumberToDecimal";
import { ServerHackData } from "types";
import { calculateWeakenThreads } from "/utils/calculateWeakenThreads";
import { homeServerActive } from "/utils/homeServerActive";
import { rootAllServers } from "/utils/rootAllServers";

export function getPayloadSizes(ns: NS) {
    const result = {
        hack: ns.getScriptRam("/payloads/hack.js"),
        weaken: ns.getScriptRam("/payloads/weaken.js"),
        grow: ns.getScriptRam("/payloads/grow.js"),
    };

    return result;
}

export function getAllServers(ns: NS) {
    try {
        ns.disableLog("scan");

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

        return serversChecked;
    } catch (error) {
        console.log("Error in getAllServers: ", error);

        return [];
    }
}

export function getRemoteServers(ns: NS): Server[] {
    const remoteServers = getAllServers(ns);
    const detailedRemoteServers: Server[] = [];

    for (const server of remoteServers) {
        const serverInfo = ns.getServer(server);

        if (!serverInfo) continue;
        if (server === "home") continue;
        if (serverInfo.purchasedByPlayer) {
            detailedRemoteServers.push(serverInfo);
        }
    }

    const sortedDetailedRemoteServers = detailedRemoteServers.sort((a, b) => b.maxRam - a.maxRam);

    return sortedDetailedRemoteServers;
}

export function getRootedServers(ns: NS) {
    function isDuplicate(name: string) {
        for (const server of rootedServers) {
            if (server.hostname === name) {
                return true;
            }
        }

        return false;
    }

    const rootedServers: Server[] = [];

    try {
        ns.disableLog("ALL");
        rootAllServers(ns);

        const allServers = getAllServers(ns);

        for (const target of allServers) {
            const serverInfo = ns.getServer(target);

            if (!serverInfo) continue;

            //skip player remote servers
            if (ns.hasRootAccess(target)) {
                //ns.print(target, " is already rooted!");

                if (serverInfo.purchasedByPlayer || target === "home" || isDuplicate(target)) {
                    continue;
                }

                rootedServers.push(serverInfo);
                continue;
            }
        }

        //sort rooted servers by max money
        const sortedRootedServers = rootedServers
            .sort((a, b) => b.moneyMax - a.moneyMax)
            .filter((server) => server.moneyMax > 0);

        //ns.write("/logs/rooted_servers.js", JSON.stringify(sortedRootedServers), "w");

        return sortedRootedServers;
    } catch (error) {
        console.log(error);
        return [];
    }
}
export function getServerDataToMax(ns: NS, server: string, cores = 1): ServerHackData {
    const hostname = server;

    let money = ns.getServerMoneyAvailable(server);
    if (money === 0) money = 1;
    const hackTime = Math.ceil(ns.getHackTime(server));
    const growTime = Math.ceil(ns.getGrowTime(server));
    const weakenTime = Math.ceil(ns.getWeakenTime(server));
    const maxMoney = ns.getServerMaxMoney(server);
    const minSec = ceilNumberToDecimal(ns.getServerMinSecurityLevel(server), 2);
    const curSec = ceilNumberToDecimal(ns.getServerSecurityLevel(server), 2);
    const secDiff = ceilNumberToDecimal(ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server), 2);

    const weakenThreadsToMin = calculateWeakenThreads(ns, secDiff, cores);
    const growthThreadsToMax = Math.ceil(ns.growthAnalyze(server, maxMoney / money, cores));
    const growthSecIncrease = ceilNumberToDecimal(ns.growthAnalyzeSecurity(growthThreadsToMax, undefined, cores), 2);

    const weakenThreadsToMinAfterGrowth = calculateWeakenThreads(ns, growthSecIncrease + secDiff, cores);

    const moneyPerHack = Math.floor(money * ns.hackAnalyze(server));
    const result: ServerHackData = {
        cores: cores,
        hostname: hostname,
        hackTime: hackTime,
        growTime: growTime,
        weakenTime: weakenTime,
        money: money,
        maxMoney: maxMoney,
        moneyDiff: maxMoney - money,
        minSec: minSec,
        curSec: curSec,
        secDiff: secDiff,
        growthSecIncrease: growthSecIncrease,

        growthThreadsToMax: growthThreadsToMax,
        weakenThreadsToMin: weakenThreadsToMin,
        weakenThreadsToMinAfterGrowth: weakenThreadsToMinAfterGrowth,

        moneyPerThread: moneyPerHack,
        moneyPerSecPerThread: Math.floor(moneyPerHack / (Math.max(weakenTime, hackTime, growTime) / 1000)),
    };

    return result;
}

export function getTotalAvailableRam(ns: NS) {
    if (homeServerActive(ns)) return ns.getServer("home").maxRam - ns.getServer("home").ramUsed;
    const allRemotes = getRemoteServers(ns);
    const allRooted = getRootedServers(ns);
    const totalAvailableRam = [...allRemotes, ...allRooted].reduce((acc, cur) => acc + cur.maxRam - cur.ramUsed, 0);

    return totalAvailableRam;
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
