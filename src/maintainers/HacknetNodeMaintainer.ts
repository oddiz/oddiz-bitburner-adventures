import { NodeStats, NS } from "/typings/Bitburner";
import { HACKNET_NODE_MANAGER_INTERVAL } from "/utils/constants";
import { sleep } from "/utils/sleep";

export async function main(ns: NS) {
    ns.tail();
    const HNManager = new HackNodeManager(ns);

    await HNManager.run();
}

class HackNodeManager {
    constructor(public ns: NS) {
        this.ns = ns;
    }

    async run() {
        //start the loop
        await this.hackNetLoop();
    }

    async hackNetLoop() {
        const hacknetLogic = () => {
            const allNodes: NodeStats[] = [];

            for (let i = 0; i < this.ns.hacknet.numNodes(); i++) {
                allNodes.push(this.ns.hacknet.getNodeStats(i));
            }
            const currentIncome = allNodes.reduce((acc, curr) => acc + curr.production, 0);

            const hackNodeBudget = currentIncome * 60 * 10; // 10 mins worth of income

            //TODO get upgrades and decide which one to purchase

            const getNodeUpgrades = (nodeId: number) => {
                const coreUpgradeCost = this.ns.hacknet.getCoreUpgradeCost(nodeId, 1);
                const ramUpgradeCost = this.ns.hacknet.getRamUpgradeCost(nodeId, 1);
                const levelUpgradeCost = this.ns.hacknet.getLevelUpgradeCost(nodeId, 1);

                const result = {
                    id: nodeId,
                    upgradeCosts: {
                        core: coreUpgradeCost,
                        ram: ramUpgradeCost,
                        level: levelUpgradeCost,
                    },
                };

                return result;
            };

            for (let i = 0; i < allNodes.length; i++) {
                const nodeUpgrades = getNodeUpgrades(i);

                if (hackNodeBudget > nodeUpgrades.upgradeCosts.level) {
                    this.ns.hacknet.upgradeLevel(i, 1);
                }
                if (hackNodeBudget > nodeUpgrades.upgradeCosts.core) {
                    this.ns.hacknet.upgradeCore(i, 1);
                }
                if (hackNodeBudget > nodeUpgrades.upgradeCosts.ram) {
                    this.ns.hacknet.upgradeRam(i, 1);
                }
            }
        };

        while (this.ns.scriptRunning("/modules/HacknetNodeManager/HacknetNodeManager.js", "home")) {
            await hacknetLogic();
            await sleep(HACKNET_NODE_MANAGER_INTERVAL);
        }
    }

    log(data) {
        console.log("[HacknetNodeMaintainer] " + data);
    }
}
