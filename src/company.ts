import { CompanyManager } from "/modules/CompanyManager/CompanyManager";
import { NS } from "./typings/Bitburner";

export async function main(ns: NS) {
    const companyManager = new CompanyManager(ns);

    await companyManager.run();
}
