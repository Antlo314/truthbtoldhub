/**
 * One next-line for the walking HUD. Not a quest log.
 */
import { DESTINATIONS, destCenter } from './jungleMap';
import { isOutdoors } from './homeMap';
import { getWalkerPose } from './walkerPose';
import { loadVisited, STATION_LABELS, STATION_ROOM, unvisitedCore } from './stationProgress';

const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'] as const;

function arrowFor(rel: number): string {
    return ARROWS[((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8];
}

export function nextLine(opts: {
    hasLooked: boolean;
    hasMoved: boolean;
    isMobile: boolean;
    tourOpen: boolean;
}): string | null {
    if (opts.tourOpen) return null;
    if (!opts.hasLooked) return 'Look around.';
    if (!opts.hasMoved) return opts.isMobile ? 'Walk. Left stick.' : 'Walk. WASD.';

    const pose = getWalkerPose();
    const outdoors = isOutdoors(pose.x, pose.z);

    if (!outdoors) {
        const miss = unvisitedCore().filter((id) => id !== 'computer');
        if (miss.length) {
            const id = miss[0];
            const room = STATION_ROOM[id];
            const name = STATION_LABELS[id] || id;
            if (id === 'envelope') return 'Gold rings open things. The paper is in the foyer.';
            return room ? `${name} is in the ${room}.` : `${name} is in the house.`;
        }
        return 'The front door is just a door. Walk out.';
    }

    const seen = loadVisited();
    const facing = Math.atan2(-Math.sin(pose.yaw), -Math.cos(pose.yaw));
    let bestName = '';
    let bestDist = Infinity;
    let bestRel = 0;
    for (const d of DESTINATIONS) {
        if (seen.has(d.id)) continue;
        const c = destCenter(d);
        const dx = c.x - pose.x;
        const dz = c.z - pose.z;
        const dist = Math.hypot(dx, dz);
        if (dist >= bestDist) continue;
        bestDist = dist;
        bestName = d.name.replace(/^The /, '');
        let rel = facing - Math.atan2(dx, dz);
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        bestRel = rel;
    }
    if (!bestName) return null;
    return `${bestName} · ${Math.round(bestDist)} m ${arrowFor(bestRel)}`;
}
