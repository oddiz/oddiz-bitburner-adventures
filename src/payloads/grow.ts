import { MyLocalStorage, OddizToolkit } from "types";
import { NS } from "typings/Bitburner";
import { COMMAND_EXEC_MIN_INTERVAL, SCRIPT_SEC_CHECK_INTERVAL, TASK_LEEWAY_MS } from "/utils/constants";
import { parse, Stringified, stringify } from "/utils/json";

export async function main(ns: NS) {
    const target = ns.args[0] as string;
    let plannedExecuteTime = parseInt(ns.args[1] as string) || 0;
    const force = ns.args[3] === undefined ? true : (ns.args[3] as boolean) || false;
    const id = ns.args[4] as string;

    const startTime = Date.now();
    const dispatchTime = (ns.args[2] as number) || Date.now();

    ns.print("Script run time: " + ` [${new Date(startTime).toLocaleTimeString()}]`);
    ns.print("Script run lag: " + (startTime - dispatchTime) + "ms");

    if (plannedExecuteTime > startTime) {
        await sleep(plannedExecuteTime - dispatchTime);
    }

    const myWindow = eval("window") as Window;
    const localStorage = myWindow.localStorage as MyLocalStorage;
    const oddizToolkitLocalStorage = parse(localStorage.getItem("oddizToolkit") as Stringified<OddizToolkit>);
    const weakenLag = oddizToolkitLocalStorage.trioLagInfo[id]?.weaken || 0;

    plannedExecuteTime += weakenLag;
    if (plannedExecuteTime > Date.now()) {
        await sleep(plannedExecuteTime - Date.now() - TASK_LEEWAY_MS);
    }

    let counter = 0;
    const waitInMs = SCRIPT_SEC_CHECK_INTERVAL;
    if (!force) {
        while (getSecurityLevel(ns, target) > 0) {
            await sleep(waitInMs);
            counter++;
        }
    }

    if (counter > 0) {
        console.log(`Grow waited ${counter * waitInMs} ms for server to be ready`);
    }

    const now = Date.now();
    const nowDate = new Date(now);

    const executeLag = Date.now() - plannedExecuteTime;
    ns.print("Executed at: " + ` [${nowDate.toLocaleTimeString()}]`);
    ns.print("Execute lag: " + executeLag + "ms");

    if (oddizToolkitLocalStorage.trioLagInfo[id]) {
        oddizToolkitLocalStorage.trioLagInfo[id].grow = executeLag;
    } else {
        oddizToolkitLocalStorage.trioLagInfo[id] = {
            grow: executeLag,
        };
    }

    if (force) delete oddizToolkitLocalStorage.trioLagInfo[id];
    localStorage.setItem("oddizToolkit", stringify(oddizToolkitLocalStorage));

    if (executeLag > COMMAND_EXEC_MIN_INTERVAL / 3 && !force) {
        console.warn(
            "Too late to execute grow. Lag: " + executeLag + "ms. Max Allowed: " + COMMAND_EXEC_MIN_INTERVAL / 3
        );
    } else {
        await ns.grow(target);
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSecurityLevel(ns: NS, target: string) {
    const minSec = ns.getServerMinSecurityLevel(target);
    const curSec = ns.getServerSecurityLevel(target);

    return curSec - minSec;
}
