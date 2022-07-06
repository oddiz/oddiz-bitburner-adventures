import { NS } from "/typings/Bitburner";

export async function main(ns: NS) {
    try {
        const target = ns.args[0] as string;
        const hackAmount = (ns.args[1] as number) || 1;

        ns.tail();
        if (!target) {
            console.warn("No target specified!");
            ns.print("No target specified!");
            ns.tprint("No target specified!");

            return;
        }
        while (target) {
            for (let i = 0; i < hackAmount; i++) {
                await ns.hack(target);
            }

            await ns.grow(target);

            await ns.weaken(target);
        }
    } catch (error) {
        console.warn(error);
    }
}
