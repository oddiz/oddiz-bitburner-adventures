import { DispatchCommand, RemotesWithRamInfo } from "./ServerManager";
import { NS } from "/typings/Bitburner";
import { getPayloadSizes } from "/utils/getPayloadSizes";

export function commandCanRun(ns: NS, command: DispatchCommand, remoteServersWithRamInfo: RemotesWithRamInfo) {
    const scriptSizes = getPayloadSizes(ns);

    const servers = [...remoteServersWithRamInfo.servers];

    let allTasksCanExecute = true;
    for (const task of command.tasks) {
        const taskRamSize = scriptSizes[task.op] * task.threads;

        let taskCanExecute = false;
        for (const server of servers) {
            if (server.availableRam > taskRamSize) {
                taskCanExecute = true;

                server.availableRam -= taskRamSize;

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
