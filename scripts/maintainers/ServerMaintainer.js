const MAX_SERVER_COUNT = 25

/** @param {import("../../").NS} ns */
export async function main(ns) {

    let minimumRamMult = 6;
    while (true) {

        const playerMoney = ns.getServerMoneyAvailable("home");
        const allRemoteServers = ns.getPurchasedServers()

        if (allRemoteServers.length === MAX_SERVER_COUNT) {
            //cleanup mode
            const detailedRemoteServers = []
            for (const server of allRemoteServers) {
                const serverRam = ns.getServerMaxRam(server)
                detailedRemoteServers.push({
                    name: server,
                    ram: serverRam
                })

            }

            const weakestServer = detailedRemoteServers.sort((a, b) => a.ram - b.ram)[0]

            const lowestRam = weakestServer.ram
            minimumRamMult = Math.log2(lowestRam) + 1

            if (calculateRamSize(playerMoney) > 2 ** minimumRamMult) {
                ns.print("Deleting server to make room for better one")
                ns.killall(weakestServer.name)
                ns.deleteServer(weakestServer.name);
            }


            ns.print("lowest ram: " + lowestRam)
            //ns.deleteServer()

        }

        const ramSize = calculateRamSize(playerMoney)

        if (ramSize) {
            const serverName = `${Date.now()}-${ramSize}GB`
            ns.purchaseServer(serverName, ramSize)

        }

        await outputServers();
        await ns.sleep(5000);
    }


    function calculateRamSize(playerMoney) {
        let ramMultiplier = minimumRamMult;

        let serverCost = ns.getPurchasedServerCost(2 ** ramMultiplier)

        if (serverCost > playerMoney * 0.5) {
            return false
        }
        while (serverCost < playerMoney * 0.5) {
            ramMultiplier++;
            serverCost = ns.getPurchasedServerCost(2 ** ramMultiplier)

        }

        return 2 ** ramMultiplier

    }

    async function outputServers() {
        const myServers = ns.getPurchasedServers();

        await ns.write("remote_servers.js", "export const remoteServers = ", "w");
        await ns.write("remote_servers.js", JSON.stringify(myServers), "a");
    }
}