/* 
NOTES:
maintenance: 
    if wanted level penalty is high (above X) get respect + lose wanted level
    
gang flow:

    train until 30 level 
    get to 125 rep to hire 6 members

    train until 500 hacking level or _____ combat level

    farm rep until .......  maybe max member?

    train new + territory war old

    once %100 territory train all until .......

    farm money
*/

import { names } from "/modules/GangManager/names";
import { EquipmentStats, NS } from "../../typings/NetscriptDefinitions";
import { sleep } from "/utils/sleep";

const hackingFactions = ["NiteSec"];
const crimeFactions = ["The Syndicate"];
export class GangManager {
    private factionType: "hacking" | "crime" | undefined;
    private ns: NS;
    constructor(ns: NS) {
        this.ns = ns;
        this.factionType;
    }

    async run() {
        if (!this.ns.gang.inGang()) this.ns.gang.createGang("NiteSec");
        const factionName = this.ns.gang.getGangInformation().faction;

        if (crimeFactions.includes(factionName)) this.factionType = "crime";
        else if (hackingFactions.includes(factionName)) this.factionType = "hacking";
        else throw new Error("Faction type not found");

        while (this.ns.scriptRunning("gang.js", "home")) {
            this.buyNewMembers();

            this.buyEquipment(this.factionType);

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

            const results = Object.values(ascencionResult).slice(1);
            const maxMutliplier = getAscensionLevel(this.ns, member);

            if (maxMutliplier < 10) {
                if (results.some((value) => value > 1.5)) {
                    gang.ascendMember(member);
                }
            } else {
                if (results.some((value) => value > 1.2)) {
                    gang.ascendMember(member);
                }
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

    buyAugments(type?: string) {
        const hackingAugments = ["Bitwire", "Neuralstimulator", "DataJack"];
        const crimeAugments = [
            "Bionic Arms",
            "Bionic Legs",
            "Bionic Spine",
            "BrachiBlades",
            "Nanofiber Weave",
            "Synthetic Heart",
            "Synfibril Muscle",
        ];
    }

    buyEquipment(type?: string) {
        const equipments: EquipmentInfo[] = [];
        for (const equipmentName of this.ns.gang.getEquipmentNames()) {
            const stats = this.ns.gang.getEquipmentStats(equipmentName);
            const price = this.ns.gang.getEquipmentCost(equipmentName);
            const type = this.ns.gang.getEquipmentType(equipmentName);

            const res: EquipmentInfo = {
                name: equipmentName,
                type: type,
                stats: stats,
                price: price,
            };

            equipments.push(res);
        }

        const gangMembers = this.ns.gang.getMemberNames();
        for (const member of gangMembers) {
            const maxMutliplier = getAscensionLevel(this.ns, member);
            if (maxMutliplier < 10) continue;

            if (type === "hacking") {
                const hackingEquipment = equipments.filter((equipment) => {
                    return equipment.type === "Rootkit" || equipment.type === "Augmentation";
                });

                for (const equipment of hackingEquipment) {
                    this.ns.gang.purchaseEquipment(member, equipment.name);
                }
            }

            if (type === "crime") {
                const crimeEquipment = equipments.filter((equipment) => {
                    return equipment.type === "Weapon" || equipment.type === "Armor" || equipment.type === "Vehicle";
                });

                for (const equipment of crimeEquipment) {
                    this.ns.gang.purchaseEquipment(member, equipment.name);
                }
            }
        }
    }
}

interface EquipmentInfo {
    name: string;
    type: string;
    stats: EquipmentStats;
    price: number;
}

function getAscensionLevel(ns: NS, member: string) {
    const memberInfo = ns.gang.getMemberInformation(member);

    return Math.max(
        memberInfo.agi_asc_mult,
        memberInfo.str_asc_mult,
        memberInfo.def_asc_mult,
        memberInfo.cha_asc_mult,
        memberInfo.dex_asc_mult,
        memberInfo.hack_asc_mult
    );
}
