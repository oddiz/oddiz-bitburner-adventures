import { ThreadManager } from "/modules/ThreadManager/ThreadManager";
import { NS } from "typings/Bitburner";
import { ServerManager } from "/modules/ServerManager/ServerManager";
import { sleep } from "/utils/sleep";
import { ODDIZ_HACK_TOOLKIT_SCRIPT_NAME } from "./utils/constants";

export async function main(ns: NS) {
    ns.tail();
    ns.print("Starting Oddiz Bitburner Script");

    ns.print("Running Server Manager");
    const serverManager = new ServerManager(ns);
    await serverManager.init();
    ns.print("Running Thread Manager");
    const threadManager = new ThreadManager(ns, serverManager);
    await threadManager.init();

    await serverManager.startListening();
    while (ns.scriptRunning(ODDIZ_HACK_TOOLKIT_SCRIPT_NAME, "home")) await ns.asleep(100000000);
}
