import {
    getRootedServers
} from "util/getRootedServers";

/** @param {import("../..").NS} ns */
export async function main(ns) {
    const targets = await getRootedServers(ns);

    const remoteServers = ns.getPurchasedServers();

    //killing all scripts
    for (const tar of [...targets, ...remoteServers]) {


        ns.killall(tar);

    }

}