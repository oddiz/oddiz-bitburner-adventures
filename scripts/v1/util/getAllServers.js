/** @param {import("../..").NS} ns */
export async function getAllServers(ns) {



    const serversToCheck = ["home"]
    const serversChecked = []

    while (serversToCheck.length > 0) {
        const serverToCheck = serversToCheck.pop();

        if (arrayContains(serversChecked, serverToCheck)) continue;

        ns.print("Scanning server: ", serverToCheck);
        const results = ns.scan(serverToCheck);
        serversChecked.push(serverToCheck);

        for (const result of results) {
            if (!arrayContains(serversChecked, result)) {
                serversToCheck.push(result);
            }
        }
    }

    const result = []
    const remoteServers = ns.getPurchasedServers();

    for (const server of serversChecked) {

        if (remoteServers.includes(server)) {
            continue;
        } else {
            result.push(server);
        }

    }

    await ns.write("all_servers.js", `export const allServers =  `, "w")
    await ns.write("all_servers.js", JSON.stringify(serversChecked), "a")

    return serversChecked
}

//checks if an item already exists in an array
const arrayContains = (array, item) => {
    for (const i of array) {
        if (i === item) {
            return true;
        }
    }
    return false;
}