import { NS } from "./typings/NetscriptDefinitions";
import { sleep } from "/utils/sleep";
import { SingularityManager } from "/modules/Singularity/Singularity";

export async function main(ns: NS) {
    ns.disableLog("ALL");

    new SingularityManager(ns).run();

    while (ns.scriptRunning(ns.getScriptName(), "home")) {
        await sleep(5000);
    }
}
