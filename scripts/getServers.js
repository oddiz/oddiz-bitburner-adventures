/** @param {import("..").NS} ns */
export async function main(ns) {



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

    await ns.write("servers.js", `export const allServers =  `, "w")
    await ns.write("servers.js", JSON.stringify(serversChecked), "a")
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