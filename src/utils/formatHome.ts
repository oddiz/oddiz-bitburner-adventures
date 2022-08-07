import { NS } from "/typings/NetscriptDefinitions";

export async function main(ns: NS) {
    const files = ns.ls("home");
    const codeword = ns.args[0];

    if (codeword === "bananabread") {
        for (const file of files) {
            ns.rm(file, "home");
        }
    }
}
