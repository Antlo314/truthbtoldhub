/**
 * House layout — expanded hub.
 * Each Hut feature = one household object. Truth only in Truth.OS (computer).
 */

import type { HousePanelId } from './houseUiStore';

export type HotspotId =
    | 'computer'
    | 'envelope'
    | 'library'
    | 'codex'
    | 'ledger'
    | 'cinema'
    | 'hall'
    | 'soul_mirror'
    | 'wayfinder'
    | 'arcade'
    | 'forge';

export type Hotspot = {
    id: HotspotId;
    label: string;
    hint: string;
    position: [number, number, number];
    radius: number;
    action: { type: 'os' } | { type: 'panel'; panel: HousePanelId };
};

/** Expanded ~22×20 m footprint */
export const HOUSE_BOUNDS = {
    minX: -10.2,
    maxX: 10.2,
    minZ: -9.2,
    maxZ: 9.2,
};

/** Bedroom floor — facing house center */
export const SPAWN: [number, number, number] = [0, 1.62, 5.2];

/**
 * One object → one feature.
 * Arcade interact is the CONTROLLER on the coffee table (not the TV).
 */
export const HOTSPOTS: Hotspot[] = [
    {
        id: 'computer',
        label: 'Desktop',
        hint: 'Log in · boot Truth.OS',
        position: [3.4, 1.0, 5.0],
        radius: 1.45,
        action: { type: 'os' },
    },
    {
        id: 'soul_mirror',
        label: 'Mirror',
        hint: 'Vessel · shape your form',
        position: [3.0, 1.3, 7.4],
        radius: 1.3,
        action: { type: 'panel', panel: 'soul' },
    },
    {
        id: 'arcade',
        label: 'Controller',
        hint: 'Pick up controller · Arcade',
        // Coffee table controller in living room (media wall is decorative)
        position: [0.15, 0.55, -1.15],
        radius: 1.15,
        action: { type: 'panel', panel: 'arcade' },
    },
    {
        id: 'envelope',
        label: 'Offering tray',
        hint: 'The Offering',
        position: [-1.8, 0.85, -0.4],
        radius: 1.35,
        action: { type: 'panel', panel: 'offering' },
    },
    {
        id: 'library',
        label: 'Bookshelves',
        hint: 'Open the Library',
        position: [-6.8, 1.2, -4.8],
        radius: 1.9,
        action: { type: 'panel', panel: 'library' },
    },
    {
        id: 'codex',
        label: 'Study desk',
        hint: 'Codex · memory',
        position: [6.2, 1.0, -4.6],
        radius: 1.55,
        action: { type: 'panel', panel: 'codex' },
    },
    {
        id: 'ledger',
        label: 'Ledger',
        hint: 'Daily word',
        position: [-5.0, 1.0, 2.0],
        radius: 1.35,
        action: { type: 'panel', panel: 'ledger' },
    },
    {
        id: 'wayfinder',
        label: 'Wall map',
        hint: 'Wayfinder · roads',
        position: [0, 1.2, -8.2],
        radius: 1.5,
        action: { type: 'panel', panel: 'wayfinder' },
    },
    {
        id: 'cinema',
        label: 'Film screen',
        hint: 'Cinema · film',
        position: [7.8, 1.4, 1.2],
        radius: 1.6,
        action: { type: 'panel', panel: 'cinema' },
    },
    {
        id: 'hall',
        label: 'Hall arch',
        hint: 'The Hall · community',
        position: [-7.2, 1.2, 1.8],
        radius: 1.55,
        action: { type: 'panel', panel: 'hall' },
    },
    {
        id: 'forge',
        label: 'Forge bench',
        hint: 'Temper arms & tonics',
        position: [7.6, 1.0, -7.0],
        radius: 1.5,
        action: { type: 'panel', panel: 'forge' },
    },
];

export type Collider = { x: number; z: number; hx: number; hz: number };

export const COLLIDERS: Collider[] = [
    // Outer walls
    { x: 0, z: -9.5, hx: 10.6, hz: 0.22 },
    { x: 0, z: 9.5, hx: 10.6, hz: 0.22 },
    { x: -10.5, z: 0, hx: 0.22, hz: 9.8 },
    { x: 10.5, z: 0, hx: 0.22, hz: 9.8 },

    // Bedroom partial walls
    { x: -3.2, z: 3.0, hx: 2.0, hz: 0.14 },
    { x: 3.2, z: 3.0, hx: 2.0, hz: 0.14 },

    // Bed
    { x: -0.5, z: 7.0, hx: 1.15, hz: 0.85 },
    // Desk + computer
    { x: 3.4, z: 5.15, hx: 0.9, hz: 0.4 },
    // Soul mirror
    { x: 3.15, z: 7.85, hx: 0.18, hz: 0.42 },

    // Living sofa
    { x: 1.6, z: -2.6, hx: 1.3, hz: 0.55 },
    // Coffee table (controller)
    { x: 0.15, z: -1.15, hx: 0.55, hz: 0.35 },
    // Offering table
    { x: -1.8, z: -0.4, hx: 0.65, hz: 0.38 },
    // Media stand / console under TV (north living)
    { x: 0.0, z: -3.85, hx: 1.1, hz: 0.28 },

    // Ledger lectern
    { x: -5.0, z: 2.0, hx: 0.4, hz: 0.4 },
    // Hearth
    { x: -7.6, z: 3.6, hx: 0.7, hz: 0.45 },
    // Hall pillars
    { x: -7.7, z: 1.8, hx: 0.22, hz: 0.18 },
    { x: -6.7, z: 1.8, hx: 0.22, hz: 0.18 },

    // Library shelves
    { x: -8.6, z: -4.8, hx: 0.4, hz: 2.0 },
    // Study desk
    { x: 6.2, z: -4.6, hx: 0.8, hz: 0.45 },
    // Study shelf
    { x: 8.0, z: -5.8, hx: 0.35, hz: 1.1 },
    // Cinema screen base
    { x: 8.5, z: 1.2, hx: 0.2, hz: 1.2 },
    // Wayfinder map wall furniture
    { x: 0, z: -8.85, hx: 0.9, hz: 0.16 },
    // Forge bench
    { x: 7.6, z: -7.0, hx: 0.85, hz: 0.55 },
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

    for (const c of COLLIDERS) {
        if (overlaps(nx, nz, c, radius)) nx = free.x;
    }
    nz = free.z + dz;
    for (const c of COLLIDERS) {
        if (overlaps(nx, nz, c, radius)) nz = free.z;
    }

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
