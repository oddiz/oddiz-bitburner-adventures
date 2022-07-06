import { OddizToolkit } from "types";
import { NS } from "typings/Bitburner";
import { SCRIPT_SEC_CHECK_INTERVAL } from "/utils/constants";
import { parse, Stringified, stringify } from "/utils/json";
const MAX_WEAKEN_WAIT_TIME = 1000;
export async function main(ns: NS) {
    const target = ns.args[0] as string;
    const plannedExecuteTime = parseInt(ns.args[1] as string) || 0;
    const force = ns.args[3] === undefined ? true : (ns.args[3] as boolean) || false;

    const id = ns.args[4] as string;

    const startTime = Date.now();
    const dispatchTime = (ns.args[2] as number) || Date.now();

    ns.print("Script run time: " + ` [${new Date(startTime).toLocaleTimeString()}]`);
    ns.print("Script run lag: " + (startTime - dispatchTime) + "ms");

    if (plannedExecuteTime > startTime) {
        await sleep(plannedExecuteTime - dispatchTime);
    }
    let counter = 0;
    const waitInMs = SCRIPT_SEC_CHECK_INTERVAL;
    if (!force) {
        while (getSecurityLevel(ns, target) > 0 && counter < MAX_WEAKEN_WAIT_TIME / SCRIPT_SEC_CHECK_INTERVAL) {
            await sleep(waitInMs);
            counter++;
        }
    }

    const now = Date.now();
    const nowDate = new Date(now);

    const executeLag = now - plannedExecuteTime;

    ns.print("Executed at: " + ` [${nowDate.toLocaleTimeString()}]`);
    ns.print("Execute lag: " + executeLag + "ms");

    const myWindow = eval("window") as Window;
    const localStorage = myWindow.localStorage as Storage;
    const oddizToolkitLocalStorage = parse(localStorage.getItem("oddizToolkit") as Stringified<OddizToolkit>);
    oddizToolkitLocalStorage.trioLagInfo[id] = {
        weaken: executeLag,
    };
    localStorage.setItem("oddizToolkit", stringify(oddizToolkitLocalStorage));

    await ns.weaken(target);
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSecurityLevel(ns: NS, target: string) {
    const minSec = ns.getServerMinSecurityLevel(target);
    const curSec = ns.getServerSecurityLevel(target);

    return curSec - minSec;
}
