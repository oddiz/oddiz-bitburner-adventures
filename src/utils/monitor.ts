import { MONITORJS_REFRESH_INTERVAL } from "/utils/constants";
import { NS } from "/typings/Bitburner";

export async function main(ns: NS) {
    const flags = ns.flags([["help", false]]);
    if (flags._.length === 0 || flags.help) {
        ns.tprint("This script helps visualize the money and security of a server.");
        ns.tprint(`USAGE: run ${ns.getScriptName()} SERVER_NAME`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()} n00dles`);
        return;
    }

    ns.tail();
    ns.disableLog("ALL");
    // eslint-disable-next-line no-constant-condition
    while (ns.scriptRunning("/utils/monitor.js", "home")) {
        const server = flags._[0];
        ns.clearLog();

        logServerDetails(ns, server);

        await ns.sleep(MONITORJS_REFRESH_INTERVAL);
    }
}
export function autocomplete(data) {
    return data.servers;
}

export function logServerDetails(ns: NS, server: string) {
    let money = ns.getServerMoneyAvailable(server);
    if (money === 0) money = 1;
    const maxMoney = ns.getServerMaxMoney(server);
    const minSec = ns.getServerMinSecurityLevel(server);
    const sec = ns.getServerSecurityLevel(server);

    const hackTime = ns.getHackTime(server);
    const growTime = ns.getGrowTime(server);
    const weakenTime = ns.getWeakenTime(server);

    ns.print(`${server}:`);
    ns.print(
        `Money: ${ns.nFormat(money, "$0.000a")} / ${ns.nFormat(maxMoney, "$0.000a")} (${(
            (money / maxMoney) *
            100
        ).toFixed(2)}%)`
    );
    ns.print(`security: +${(sec - minSec).toFixed(2)}\n`);

    const curMoneyHackingThreadsAmount = Math.ceil(ns.hackAnalyzeThreads(server, money));
    const hackAnalyzeResult = ns.hackAnalyze(server);
    const moneyPerHack = Math.floor(money * hackAnalyzeResult);
    ns.print(
        `hack____: ${ns.tFormat(hackTime)} (t=${curMoneyHackingThreadsAmount}),\nSec increase: ${ns.hackAnalyzeSecurity(
            curMoneyHackingThreadsAmount,
            server
        )}\n`
    );

    const growthThreadsAmount = Math.ceil(ns.growthAnalyze(server, maxMoney / money));
    const maxGrowthSecIncrease = ns.growthAnalyzeSecurity(growthThreadsAmount, server, 1);
    ns.print(`grow____: ${ns.tFormat(growTime)} (t=${growthThreadsAmount}),\nSec increase: ${maxGrowthSecIncrease}\n`);

    ns.print(
        `weaken__: ${ns.tFormat(weakenTime)} (t=${Math.ceil((sec - minSec) * 20)}) (tAfterGrowWeaken=${Math.ceil(
            (sec + maxGrowthSecIncrease - minSec) * 20
        )})\n`
    );

    ns.print(
        `Analytics:\n$ per thread: ${moneyPerHack} $\n$ per sec(Hack only) per thread: ${(
            moneyPerHack /
            (ns.getHackTime(server) / 1000)
        ).toFixed(2)}$\n$ per sec per thread(full cycle): ${(
            moneyPerHack /
            (Math.max(weakenTime, hackTime, growTime) / 1000)
        ).toFixed(2)}$`
    );
}
