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
        const hacknet = this.ns.hacknet;

        const hacknetLogic = () => {
            const allNodes: NodeStats[] = [];

            for (let i = 0; i < hacknet.numNodes(); i++) {
                allNodes.push(hacknet.getNodeStats(i));
            }
            const hacknodeIncome = allNodes.reduce((acc, curr) => acc + curr.production, 0); //per second

            const hackScriptIncome = this.ns.getScriptIncome()[0];

            const hackNodeBudget = (hacknodeIncome + hackScriptIncome) * 60 * 10; // 10 mins worth of income

            //TODO get upgrades and decide which one to purchase

            const getNodeUpgrades = (
                nodeId: number
            ): {
                id: number;
                upgradeCosts: {
                    level: number;
                    ram: number;
                    core: number;
                };
                ttp: {
                    level: number;
                    ram: number;
                    core: number;
                } | null;
            } | null => {
                const LEVEL_UPGRADE_MULT = 20;
                const nodeInfo = hacknet.getNodeStats(nodeId);

                const levelUpgradeCost = hacknet.getLevelUpgradeCost(nodeId, LEVEL_UPGRADE_MULT);
                const ramUpgradeCost = hacknet.getRamUpgradeCost(nodeId, 1);
                const coreUpgradeCost = hacknet.getCoreUpgradeCost(nodeId, 1);
                const upgradeAvailable = [levelUpgradeCost, ramUpgradeCost, coreUpgradeCost].some(
                    (cost) => cost !== Infinity
                );

                if (!upgradeAvailable) return null;
                const nodeFormulas = this.ns.formulas.hacknetNodes;

                let ttp;
                if (nodeFormulas.constants()) {
                    const moneyMult = this.ns.getPlayer().hacknet_node_money_mult;

                    const [level, ram, cores] = [nodeInfo.level, nodeInfo.ram, nodeInfo.cores];
                    const income = nodeFormulas.moneyGainRate(level, ram, cores, moneyMult);
                    const coreUpgradeIncome = nodeFormulas.moneyGainRate(level, ram, cores + 1, moneyMult) - income;
                    const ramUpgradeIncome = nodeFormulas.moneyGainRate(level, ram * 2, cores, moneyMult) - income;
                    const levelUpgradeIncome =
                        nodeFormulas.moneyGainRate(level + LEVEL_UPGRADE_MULT, ram, cores, moneyMult) - income;

                    ttp = {
                        level: calculateTTP(levelUpgradeCost, coreUpgradeIncome),
                        ram: calculateTTP(ramUpgradeCost, ramUpgradeIncome),
                        core: calculateTTP(coreUpgradeCost, levelUpgradeIncome),
                    };
                }

                const result = {
                    id: nodeId,
                    upgradeCosts: {
                        core: coreUpgradeCost,
                        ram: ramUpgradeCost,
                        level: levelUpgradeCost,
                    },
                    ttp: ttp || null,
                };

                return result;
            };

            for (let i = 0; i < allNodes.length; i++) {
                const nodeUpgrades = getNodeUpgrades(i);
                const twoHours = 60 * 60 * 2;

                if (!nodeUpgrades) continue;
                if (!nodeUpgrades.ttp) {
                    nodeUpgrades.ttp = {
                        level: Infinity,
                        ram: Infinity,
                        core: Infinity,
                    };
                }

                if (hackNodeBudget > nodeUpgrades.upgradeCosts.level || nodeUpgrades.ttp.level < twoHours) {
                    hacknet.upgradeLevel(i, 20);
                }
                if (hackNodeBudget > nodeUpgrades.upgradeCosts.core || nodeUpgrades.ttp.core < twoHours) {
                    hacknet.upgradeCore(i, 1);
                }
                if (hackNodeBudget > nodeUpgrades.upgradeCosts.ram || nodeUpgrades.ttp.ram < twoHours) {
                    hacknet.upgradeRam(i, 1);
                }
            }

            const newNodeCost = hacknet.getPurchaseNodeCost();

            if (newNodeCost < hackNodeBudget) {
                hacknet.purchaseNode();
            }
        };

        while (this.ns.scriptRunning("/maintainers/HacknetNodeMaintainer.js", "home")) {
            await hacknetLogic();
            await sleep(HACKNET_NODE_MANAGER_INTERVAL);
        }
    }

    log(data) {
        console.log("[HacknetNodeMaintainer] " + data);
    }
}

/**
 * Calculates TTP (Time to profit) which is the time it takes upgrade to cover it self.
 * @param cost cost of upgrade
 * @param income increase in income per sec
 * @returns time in seconds
 */
function calculateTTP(cost: number, income: number) {
    if (income === 0) return Infinity;
    return Math.round(cost / income);
}
