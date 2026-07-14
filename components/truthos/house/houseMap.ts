/**
 * House layout — staged open-plan home.
 * Zones, conversation triangles, clear ~1.1 m walk paths.
 * One household object → one feature. Truth only in Truth.OS (computer).
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

/** Bedroom doorway — facing living / media wall */
export const SPAWN: [number, number, number] = [0, 1.62, 4.6];

/**
 * Staged interactables — positions match furniture heroes.
 * Arcade = controller on coffee table (TV is décor only).
 */
export const HOTSPOTS: Hotspot[] = [
    {
        id: 'computer',
        label: 'Desktop',
        hint: 'Log in · boot Truth.OS',
        position: [3.55, 1.0, 4.9],
        radius: 1.4,
        action: { type: 'os' },
    },
    {
        id: 'soul_mirror',
        label: 'Mirror',
        hint: 'Vessel · shape your form',
        position: [3.85, 1.3, 7.55],
        radius: 1.25,
        action: { type: 'panel', panel: 'soul' },
    },
    {
        id: 'arcade',
        label: 'Controller',
        hint: 'Pick up controller · Arcade',
        position: [0.15, 0.55, -0.95],
        radius: 1.15,
        action: { type: 'panel', panel: 'arcade' },
    },
    {
        id: 'envelope',
        label: 'Offering tray',
        hint: 'The Offering',
        position: [-2.35, 0.85, -0.35],
        radius: 1.3,
        action: { type: 'panel', panel: 'offering' },
    },
    {
        id: 'library',
        label: 'Bookshelves',
        hint: 'Open the Library',
        position: [-6.4, 1.2, -4.6],
        radius: 1.85,
        action: { type: 'panel', panel: 'library' },
    },
    {
        id: 'codex',
        label: 'Study desk',
        hint: 'Codex · memory',
        position: [6.35, 1.0, -4.55],
        radius: 1.5,
        action: { type: 'panel', panel: 'codex' },
    },
    {
        id: 'ledger',
        label: 'Ledger',
        hint: 'Daily word',
        position: [-5.15, 1.0, 2.15],
        radius: 1.3,
        action: { type: 'panel', panel: 'ledger' },
    },
    {
        id: 'wayfinder',
        label: 'Wall map',
        hint: 'Wayfinder · roads',
        position: [0, 1.2, -8.35],
        radius: 1.5,
        action: { type: 'panel', panel: 'wayfinder' },
    },
    {
        id: 'cinema',
        label: 'Film screen',
        hint: 'Cinema · film',
        position: [7.85, 1.4, 1.25],
        radius: 1.55,
        action: { type: 'panel', panel: 'cinema' },
    },
    {
        id: 'hall',
        label: 'Hall arch',
        hint: 'The Hall · community',
        position: [-7.15, 1.2, 2.05],
        radius: 1.5,
        action: { type: 'panel', panel: 'hall' },
    },
    {
        id: 'forge',
        label: 'Forge bench',
        hint: 'Temper arms & tonics',
        position: [7.7, 1.0, -7.05],
        radius: 1.45,
        action: { type: 'panel', panel: 'forge' },
    },
];

export type Collider = { x: number; z: number; hx: number; hz: number };

/** AABB furniture/walls — leave clear center corridor for circulation */
export const COLLIDERS: Collider[] = [
    // Outer walls
    { x: 0, z: -9.5, hx: 10.6, hz: 0.22 },
    { x: 0, z: 9.5, hx: 10.6, hz: 0.22 },
    { x: -10.5, z: 0, hx: 0.22, hz: 9.8 },
    { x: 10.5, z: 0, hx: 0.22, hz: 9.8 },

    // Bedroom partial walls (doorway gap ~2.4 m at x=0)
    { x: -3.4, z: 3.05, hx: 2.15, hz: 0.14 },
    { x: 3.4, z: 3.05, hx: 2.15, hz: 0.14 },

    // Bed + headboard (south wall)
    { x: -0.7, z: 7.55, hx: 1.2, hz: 0.95 },
    // Nightstands
    { x: -2.15, z: 7.55, hx: 0.28, hz: 0.28 },
    { x: 0.75, z: 7.55, hx: 0.28, hz: 0.28 },
    // Desk + chair (bedroom work corner)
    { x: 3.55, z: 5.1, hx: 0.95, hz: 0.42 },
    { x: 3.55, z: 4.35, hx: 0.32, hz: 0.32 },
    // Soul mirror
    { x: 3.95, z: 7.85, hx: 0.16, hz: 0.4 },

    // Living: sofa (floats, faces media −Z)
    { x: 0.55, z: -2.55, hx: 1.35, hz: 0.55 },
    // Coffee table (controller)
    { x: 0.15, z: -0.95, hx: 0.55, hz: 0.38 },
    // Offering side table (west of seating)
    { x: -2.35, z: -0.35, hx: 0.55, hz: 0.38 },
    // Media console + TV base
    { x: 0.0, z: -4.05, hx: 1.15, hz: 0.32 },
    // Accent chair (east of conversation group)
    { x: 2.65, z: -1.35, hx: 0.42, hz: 0.42 },

    // Ledger lectern
    { x: -5.15, z: 2.15, hx: 0.38, hz: 0.38 },
    // Hearth
    { x: -7.55, z: 3.75, hx: 0.72, hz: 0.48 },
    // Hall pillars
    { x: -7.75, z: 2.05, hx: 0.22, hz: 0.18 },
    { x: -6.55, z: 2.05, hx: 0.22, hz: 0.18 },

    // Library shelves (wall-hug)
    { x: -8.65, z: -4.6, hx: 0.42, hz: 2.1 },
    // Reading chair
    { x: -5.55, z: -3.9, hx: 0.4, hz: 0.4 },

    // Study desk + chair
    { x: 6.35, z: -4.55, hx: 0.85, hz: 0.48 },
    { x: 6.35, z: -3.7, hx: 0.32, hz: 0.32 },
    // Study shelf
    { x: 8.55, z: -5.7, hx: 0.35, hz: 1.15 },

    // Cinema screen base
    { x: 8.85, z: 1.25, hx: 0.22, hz: 1.25 },
    // Wayfinder map wall furniture
    { x: 0, z: -9.0, hx: 0.95, hz: 0.16 },
    // Forge bench
    { x: 7.7, z: -7.05, hx: 0.9, hz: 0.55 },
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
