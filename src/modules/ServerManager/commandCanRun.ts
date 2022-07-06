import { DispatchCommand, RemotesWithRamInfo } from "./ServerManager";
import { NS } from "/typings/Bitburner";
import { getPayloadSizes } from "/utils/getters";

export function commandCanRun(ns: NS, command: DispatchCommand, remoteServersWithRamInfo: RemotesWithRamInfo) {
    const scriptSizes = getPayloadSizes(ns);

    const servers = [...remoteServersWithRamInfo.servers];

    let allTasksCanExecute = true;
    for (const task of command.tasks) {
        let taskRamSize = scriptSizes[task.op] * task.threads;

        let taskCanExecute = false;
        for (const server of servers) {
            taskRamSize -= server.availableRam;

            if (taskRamSize <= 0) {
                taskCanExecute = true;
                break;
            }
        }

        if (!taskCanExecute) {
            allTasksCanExecute = false;

            break;
        }
    }
    return allTasksCanExecute;
}

//TODO maybe simplify this to a simple total available ram check?
