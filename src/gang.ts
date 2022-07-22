import { GangManager } from "/modules/GangManager/GangManager";
import { NS } from "./typings/Bitburner";

export async function main(ns: NS) {
    const gangManager = new GangManager(ns);

    await gangManager.run();
}
