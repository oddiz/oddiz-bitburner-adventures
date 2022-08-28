import { NS } from "/typings/NetscriptDefinitions";

export function main(ns: NS) {
    ns.disableLog("ALL");

    ns.tprint(getAllServers(ns));
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

const arrayContains = (array, item) => {
    for (const i of array) {
        if (i === item) {
            return true;
        }
    }
    return false;
};
