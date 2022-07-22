import { NS } from "/typings/Bitburner";

export async function main(ns: NS) {
    const target = ns.args[0] as string;

    await ns.hack(target);
}
