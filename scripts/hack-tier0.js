/** @param {import("..").NS} ns */
export async function main(ns) {

    const target = ns.args[0];
    while (true) {


        const secLevel = ns.getServerSecurityLevel(target)
        const minSecLevel = ns.getServerMinSecurityLevel(target)

        const maxMoney = ns.getServerMaxMoney(target)
        const currentMoney = ns.getServerMoneyAvailable(target)

        if (secLevel > minSecLevel * 2) {
            await ns.weaken(target)

            ns.print("Security level over 2x minimum, weakening now.")
        }

        //if current money is close to max money, hack
        if (maxMoney * 0.75 < currentMoney) {
            await ns.hack(target)
        } else {
            await ns.grow(target)
        }

        await ns.sleep(2000);

    }
}