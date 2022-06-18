import { NS } from "/typings/Bitburner";

export async function main(ns: NS) {
    const Hacknet = ns.hacknet;

    console.log(JSON.stringify(Hacknet, null, 2));
}
