import { getRootedServers } from "utils/getRootedServers";

/** @param {import("../..").NS} ns */
export async function main(ns) {
	await killAll(ns);
}

export async function killAll(ns) {
	const targets = await (await getRootedServers(ns)).map((server) => server.name);

	const remoteServers = ns.getPurchasedServers();

	for (const tar of [...targets, ...remoteServers]) {
		ns.killall(tar);
	}
}
