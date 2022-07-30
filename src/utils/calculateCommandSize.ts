import { getPayloadSizes } from "utils/getters";
import { DispatchCommand } from "/modules/ServerManager/ServerManager";
import { NS } from "../typings/NetscriptDefinitions";

export function calculateCommandSize(ns: NS, command: DispatchCommand) {
    const scriptSizes = getPayloadSizes(ns);
    let reqRam = 0;

    for (const task of command.tasks) {
        reqRam += scriptSizes[task.op] * task.threads;
    }

    return reqRam;
}
