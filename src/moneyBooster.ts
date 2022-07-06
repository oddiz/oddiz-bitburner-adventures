import { Thread } from "/modules/Thread/Thread";
import { NS } from "/typings/Bitburner";
import { GrowifyCommand, ReadifyCommand, ServerManager, Task } from "/modules/ServerManager/ServerManager";
import { getTotalAvailableRam, getPayloadSizes } from "/utils/getters";
import { homeServerActive } from "/utils/homeServerActive";
import { calculateServerGrowth } from "./utils/calculateServerGrowth";
import { calculateGrowCycles } from "./utils/calculateGrowCycles";
import { sleep } from "/utils/sleep";

const growChunkAmount = 10;
export async function main(ns: NS) {
    ns.tail();
    const target = ns.args[0] as string;

    const serverManager = new ServerManager(ns);
    await serverManager.init();
    const targetThread = new Thread(ns, serverManager, target);

    const scriptSizes = getPayloadSizes(ns);

    const totalAvailableRam = getTotalAvailableRam(ns);
    const maxGrowAmount = Math.floor(totalAvailableRam / scriptSizes.grow);

    const secIncreaseEachGrow = ns.growthAnalyzeSecurity(
        1,
        undefined,
        homeServerActive(ns) ? ns.getServer("home").cpuCores : 1
    );

    const growMoneyIncreaseRatio = calculateServerGrowth(
        ns.getServer(target),
        growChunkAmount,
        ns.getPlayer(),
        homeServerActive(ns) ? ns.getServer("home").cpuCores : 1
    );

    console.log("Grow percentage increase: " + growMoneyIncreaseRatio);
    const moneyPercent = (ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target)) * 100;
    const numGrowCycles = calculateGrowCycles(moneyPercent, growMoneyIncreaseRatio);

    const growThreads = growChunkAmount * numGrowCycles;
    const weakenThreads = Math.ceil(20 * growThreads * secIncreaseEachGrow);

    console.log("Cycles needed: " + numGrowCycles);

    const spawnThreads = async () => {
        const growTask: Task = {
            op: "grow",
            threads: growChunkAmount,
            target: target,
            commandType: "growify",
            dispatchTime: Date.now(),
            executeTime: Date.now() + 100,
        };

        const growCommand: GrowifyCommand = {
            type: "growify",
            tasks: [growTask],
            force: true,
            latestExecTime: Infinity,
        };

        const weakenTask: Task = {
            op: "weaken",
            threads: weakenThreads,
            target: target,
            commandType: "readify",
            dispatchTime: Date.now(),
            executeTime: Date.now() + 100,
        };
        const weakenCommand: ReadifyCommand = {
            type: "readify",
            tasks: [weakenTask],
            force: true,
            latestExecTime: Infinity,
        };

        serverManager.dispatch(weakenCommand);

        for (let i = 0; i < growThreads / growChunkAmount; i++) {
            serverManager.dispatch(growCommand);
            await sleep(10);
        }
    };

    await spawnThreads();
}

/*
g * scriptSizes.grow + w * scriptSizes.weaken = totalAvailableRam;
secIncreaseEachGrow * g * 20 = w


g * growSize + g * 20 * weakenSize * secIncreaseEachGrow = totalAvailableRam;
g * ( growSize + 20 * weakenSize * secIncreaseEachGrow ) = totalAvailableRam; 
*/
