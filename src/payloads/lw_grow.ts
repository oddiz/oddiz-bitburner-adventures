import { NS } from "../typings/NetscriptDefinitions";

export async function main(ns: NS) {
    const target = ns.args[0] as string;

    await ns.grow(target);
}
