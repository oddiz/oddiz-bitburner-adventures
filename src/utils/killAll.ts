import { NS } from "/typings/Bitburner";
import { getRootedServers } from "/utils/getters";

export async function main(ns: NS) {
    await killAll(ns);
}

export async function killAll(ns: NS) {
    ns.disableLog("killall");
    const targets = await getRootedServers(ns).map((server) => server.hostname);

    const remoteServers = ns.getPurchasedServers();

    for (const target of [...targets, ...remoteServers]) {
        ns.killall(target);
    }

    //for home server
    const payloadNames = ["grow.js", "hack.js", "weaken.js", "hackChecker.js"];
    const payloadDir = "/payloads/";
    for (const payloadName of payloadNames) {
        ns.scriptKill(payloadDir + payloadName, "home");
    }
}
