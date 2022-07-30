import { NS } from "../../typings/NetscriptDefinitions";

export class CompanyManager {
    private ns: NS;
    constructor(ns: NS) {
        this.ns = ns;
    }

    run() {
        this.ns.corporation.createCorporation("OddizCorp", true);
    }
}
