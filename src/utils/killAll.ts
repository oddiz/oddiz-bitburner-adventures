import { ODDIZ_HACK_TOOLKIT_SCRIPT_NAME } from "/utils/constants";
import { NS } from "/typings/Bitburner";
import { getRootedServers } from "/utils/getRootedServers";

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

}
