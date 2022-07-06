import { getRemoteServers } from "utils/getters";
import { NS } from "/typings/Bitburner";

export function main(ns: NS) {
    const allRemotes = getRemoteServers(ns);

    let stringToPrint = "\n";

    for (const remote of allRemotes) {
        stringToPrint = stringToPrint + (remote.hostname + "\n");
    }

    stringToPrint += "\nTotal Ram: " + allRemotes.reduce((acc, curr) => acc + curr.maxRam, 0);

    ns.tprint(stringToPrint);
}
