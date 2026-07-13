/**
 * House layout + solid colliders.
 * Spawn is on open floor — never inside furniture.
 */

import type { HousePanelId } from './houseUiStore';

export type HotspotId =
    | 'computer'
    | 'truth'
    | 'envelope'
    | 'library'
    | 'codex'
    | 'ledger'
    | 'chamber'
    | 'cinema'
    | 'hall'
    | 'soul_mirror'
    | 'wayfinder';

export type Hotspot = {
    id: HotspotId;
    label: string;
    hint: string;
    position: [number, number, number];
    radius: number;
    action: { type: 'os' } | { type: 'panel'; panel: HousePanelId };
};

export const HOUSE_BOUNDS = {
    minX: -8.15,
    maxX: 8.15,
    minZ: -8.15,
    maxZ: 8.15,
};

/** Open bedroom floor, clear of bed/desk — facing into the house */
export const SPAWN: [number, number, number] = [0, 1.62, 4.0];

export const HOTSPOTS: Hotspot[] = [
    {
        id: 'computer',
        label: 'Desktop',
        hint: 'Boot Truth.OS',
        position: [3.2, 1.0, 4.2],
        radius: 1.55,
        action: { type: 'os' },
    },
    {
        id: 'truth',
        label: 'Truth',
        hint: 'Speak with Truth',
        position: [0.2, 1.0, -0.2],
        radius: 1.7,
        action: { type: 'panel', panel: 'truth' },
    },
    {
        id: 'envelope',
        label: 'Envelope',
        hint: 'The Offering',
        position: [-1.5, 0.85, -1.0],
        radius: 1.45,
        action: { type: 'panel', panel: 'offering' },
    },
    {
        id: 'library',
        label: 'Library',
        hint: 'Open the Library',
        position: [-5.5, 1.2, -4.5],
        radius: 2.0,
        action: { type: 'panel', panel: 'library' },
    },
    {
        id: 'codex',
        label: 'Study',
        hint: 'Codex · memory',
        position: [5.0, 1.0, -4.0],
        radius: 1.7,
        action: { type: 'panel', panel: 'codex' },
    },
    {
        id: 'ledger',
        label: 'Ledger',
        hint: 'Ledger · daily word',
        position: [-4.2, 1.0, 1.2],
        radius: 1.4,
        action: { type: 'panel', panel: 'ledger' },
    },
    {
        id: 'chamber',
        label: 'Sanctum',
        hint: '3D Chamber · Hut',
        position: [0, 1.2, -7.0],
        radius: 1.8,
        action: { type: 'panel', panel: 'chamber' },
    },
    {
        id: 'wayfinder',
        label: 'Wayfinder',
        hint: 'Wayfinder · Eden',
        position: [0, 1.2, -5.2],
        radius: 1.4,
        action: { type: 'panel', panel: 'wayfinder' },
    },
    {
        id: 'cinema',
        label: 'Cinema',
        hint: 'Cinema · film',
        position: [5.5, 1.4, 1.5],
        radius: 1.7,
        action: { type: 'panel', panel: 'cinema' },
    },
    {
        id: 'hall',
        label: 'Hall',
        hint: 'The Hall · community',
        position: [-5.5, 1.2, 1.5],
        radius: 1.7,
        action: { type: 'panel', panel: 'hall' },
    },
    {
        id: 'soul_mirror',
        label: 'Mirror',
        hint: 'Vessel · identity',
        position: [2.6, 1.3, 6.1],
        radius: 1.35,
        action: { type: 'panel', panel: 'soul' },
    },
];

export type Collider = { x: number; z: number; hx: number; hz: number };

/** Half-extents in XZ — solid objects only (player radius applied separately) */
export const COLLIDERS: Collider[] = [
    // Outer walls
    { x: 0, z: -8.5, hx: 9.2, hz: 0.22 },
    { x: 0, z: 8.5, hx: 9.2, hz: 0.22 },
    { x: -8.5, z: 0, hx: 0.22, hz: 9.2 },
    { x: 8.5, z: 0, hx: 0.22, hz: 9.2 },

    // Bedroom / living split — doorway gap |x| < 1.05
    { x: -2.9, z: 2.5, hx: 1.7, hz: 0.14 },
    { x: 2.9, z: 2.5, hx: 1.7, hz: 0.14 },

    // Room dividers
    { x: -3.2, z: -3.0, hx: 0.14, hz: 2.1 },
    { x: 3.2, z: -3.0, hx: 0.14, hz: 2.1 },

    // Bed (tighter — must not cover spawn at z=4)
    { x: -0.5, z: 6.35, hx: 1.15, hz: 0.75 },
    // Desk + computer
    { x: 3.2, z: 4.55, hx: 0.85, hz: 0.38 },
    // Mirror
    { x: 2.85, z: 6.85, hx: 0.16, hz: 0.38 },
    // Vessel near mirror
    { x: 2.35, z: 6.4, hx: 0.32, hz: 0.32 },

    // Coffee table
    { x: -1.5, z: -1.0, hx: 0.65, hz: 0.38 },
    // Sofa
    { x: 1.5, z: -2.25, hx: 1.25, hz: 0.5 },

    // Truth dais
    { x: 0.2, z: -0.2, hx: 0.65, hz: 0.65 },

    // Ledger
    { x: -4.2, z: 1.2, hx: 0.38, hz: 0.38 },

    // Library shelves
    { x: -7.15, z: -5.5, hx: 0.38, hz: 1.85 },

    // Study
    { x: 5.5, z: -4.2, hx: 0.75, hz: 0.42 },
    { x: 6.5, z: -5.5, hx: 0.32, hz: 1.0 },

    // Cinema
    { x: 6.55, z: 1.5, hx: 0.18, hz: 1.15 },

    // Hall pillars
    { x: -6.0, z: 1.5, hx: 0.24, hz: 0.18 },
    { x: -5.0, z: 1.5, hx: 0.24, hz: 0.18 },

    // Sanctum frame
    { x: -1.3, z: -7.75, hx: 0.28, hz: 0.3 },
    { x: 1.3, z: -7.75, hx: 0.28, hz: 0.3 },

    // Wayfinder
    { x: 0, z: -5.45, hx: 0.75, hz: 0.14 },

    // Hearth
    { x: -6.8, z: 3.2, hx: 0.68, hz: 0.42 },
];

const PLAYER_R = 0.34;

function overlaps(x: number, z: number, c: Collider, r: number): boolean {
    return (
        x > c.x - c.hx - r &&
        x < c.x + c.hx + r &&
        z > c.z - c.hz - r &&
        z < c.z + c.hz + r
    );
}

/** Push the player out of any overlapping solid (unstick). */
export function resolveStuck(x: number, z: number, radius = PLAYER_R): { x: number; z: number } {
    let px = x;
    let pz = z;
    for (let pass = 0; pass < 4; pass++) {
        let moved = false;
        for (const c of COLLIDERS) {
            if (!overlaps(px, pz, c, radius)) continue;
            const minX = c.x - c.hx - radius;
            const maxX = c.x + c.hx + radius;
            const minZ = c.z - c.hz - radius;
            const maxZ = c.z + c.hz + radius;
            const left = px - minX;
            const right = maxX - px;
            const up = pz - minZ;
            const down = maxZ - pz;
            const m = Math.min(left, right, up, down);
            if (m === left) px = minX - 0.002;
            else if (m === right) px = maxX + 0.002;
            else if (m === up) pz = minZ - 0.002;
            else pz = maxZ + 0.002;
            moved = true;
        }
        if (!moved) break;
    }
    px = Math.max(HOUSE_BOUNDS.minX, Math.min(HOUSE_BOUNDS.maxX, px));
    pz = Math.max(HOUSE_BOUNDS.minZ, Math.min(HOUSE_BOUNDS.maxZ, pz));
    return { x: px, z: pz };
}

/**
 * Axis-separated move with wall sliding.
 * Always unsticks first so a bad spawn can never freeze the player.
 */
export function collideMove(
    x: number,
    z: number,
    dx: number,
    dz: number,
    radius = PLAYER_R,
): { x: number; z: number } {
    const free = resolveStuck(x, z, radius);
    let nx = free.x + dx;
    let nz = free.z;

    // X axis
    for (const c of COLLIDERS) {
        if (overlaps(nx, nz, c, radius)) nx = free.x;
    }
    // Z axis
    nz = free.z + dz;
    for (const c of COLLIDERS) {
        if (overlaps(nx, nz, c, radius)) nz = free.z;
    }

    // Corner catch — if still overlapping, slide on whichever axis is free
    if (COLLIDERS.some((c) => overlaps(nx, nz, c, radius))) {
        const tryX = free.x + dx;
        const tryZ = free.z + dz;
        const xOk = !COLLIDERS.some((cc) => overlaps(tryX, free.z, cc, radius));
        const zOk = !COLLIDERS.some((cc) => overlaps(free.x, tryZ, cc, radius));
        if (xOk) {
            nx = tryX;
            nz = free.z;
        } else if (zOk) {
            nx = free.x;
            nz = tryZ;
        } else {
            nx = free.x;
            nz = free.z;
        }
    }

    nx = Math.max(HOUSE_BOUNDS.minX, Math.min(HOUSE_BOUNDS.maxX, nx));
    nz = Math.max(HOUSE_BOUNDS.minZ, Math.min(HOUSE_BOUNDS.maxZ, nz));
    return { x: nx, z: nz };
}

export function nearestHotspot(x: number, z: number): Hotspot | null {
    let best: Hotspot | null = null;
    let bestD = Infinity;
    for (const h of HOTSPOTS) {
        const d = Math.hypot(x - h.position[0], z - h.position[2]);
        if (d < h.radius && d < bestD) {
            best = h;
            bestD = d;
        }
    }
    return best;
}
