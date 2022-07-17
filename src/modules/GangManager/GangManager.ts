import { names } from "/modules/GangManager/names";
import { NS } from "/typings/Bitburner";
import { sleep } from "/utils/sleep";

export class GangManager {
    private ns: NS;
    constructor(ns: NS) {
        this.ns = ns;
    }

    async run() {
        if (!this.ns.gang.inGang()) this.ns.gang.createGang("Nite Sec");

        this.buyEquipment("hacking");
        while (this.ns.scriptRunning("gang.js", "home")) {
            this.buyNewMembers();

            this.ascendMembers();
            await sleep(1000).catch(() => {
                //fail silently;
                return;
            });
        }

        return;
    }

    ascendMembers() {
        const gang = this.ns.gang;
        const allMembers = gang.getMemberNames();
        for (const member of allMembers) {
            const ascencionResult = gang.getAscensionResult(member);
            if (!ascencionResult) continue;

            if (ascencionResult.hack > 1.1) {
                gang.ascendMember(member);
            }
        }
    }

    setAllMembersTask(task: string) {
        const allMembers = this.ns.gang.getMemberNames();
        for (const member of allMembers) {
            this.ns.gang.setMemberTask(member, task);
        }
    }

    buyNewMembers() {
        const gang = this.ns.gang;

        if (gang.canRecruitMember()) {
            const randomName = names[Math.floor(Math.random() * names.length)];
            try {
                gang.recruitMember(randomName);
                return randomName;
            } catch (error) {
                throw new Error(`Failed to recruit ${randomName}: ${error}`);
            }
        } else {
            return false;
        }
    }
    buyEquipment(type: string) {
        const gang = this.ns.gang;

        console.log(gang.getMemberInformation("bob"));

        if (type === "hacking") {
            // noop
        }
    }
}
