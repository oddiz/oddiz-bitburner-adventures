import { NS } from "/typings/Bitburner";

export async function main(ns: NS) {
    ns.disableLog("ALL");
    const target = ns.args[0] as string | undefined;
    const start = ns.args[1] as string | undefined;
    if (!target) {
        ns.tprint("No target specified");
        return;
    } else {
        const route = findRouteTo(ns, target, start);
        ns.tprint(route);
        ns.print(route);
    }
}

export function findRouteTo(ns: NS, target: string, start = "home") {
    const startServer = [start];
    const foundRoutes: string[][] = [];

    const seekServer = (route: string[]) => {
        const [lastServer] = route.slice(-1);
        const connectedServers = ns.scan(lastServer);

        for (const server of connectedServers) {
            if (server === target) {
                foundRoutes.push(route.concat(target));

                continue;
            }

            if ([...route].includes(server)) {
                continue;
            } else {
                seekServer([...route, server]);
            }
        }
    };

    seekServer(startServer);

    const shortestRoute = foundRoutes.sort((a, b) => a.length - b.length)[0];
    console.log(shortestRoute);

    return shortestRoute || [];
}
