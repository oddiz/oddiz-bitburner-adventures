import { CompanyManager } from "/modules/CompanyManager/CompanyManager";
import { NS } from "./typings/NetscriptDefinitions";

export async function main(ns: NS) {
    const companyManager = new CompanyManager(ns);

    await companyManager.run();
}
