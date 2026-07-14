/**
 * Expanded multi-room house — foyer · hallway · living · bedroom · library · east wing.
 * Clear corridors (~1.2 m). One object → one feature.
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
    | 'studio'
    | 'front_door'
    | 'fireplace';

export type Hotspot = {
    id: HotspotId;
    label: string;
    hint: string;
    position: [number, number, number];
    radius: number;
    action:
        | { type: 'os' }
        | { type: 'panel'; panel: HousePanelId }
        | { type: 'soon'; message: string };
};

/** ~28 × 26 m footprint */
export const HOUSE_BOUNDS = {
    minX: -13.5,
    maxX: 13.5,
    minZ: -12.2,
    maxZ: 12.2,
};

/** Foyer / central hall facing living (−Z) */
export const SPAWN: [number, number, number] = [0, 1.62, 1.2];

/**
 * Wall-mounted fireplace (living, north wall) — visual + audio anchor.
 */
export const FIREPLACE = { x: 0, z: -11.4, y: 0.9 };

export const HOTSPOTS: Hotspot[] = [
    {
        id: 'front_door',
        label: 'Front door',
        hint: 'Outside · coming soon',
        position: [0, 1.2, 11.0],
        radius: 1.15,
        action: {
            type: 'soon',
            message: 'The grounds open soon. For now, this is home.',
        },
    },
    {
        id: 'computer',
        label: 'Desktop',
        hint: 'Log in · boot Truth.OS',
        position: [4.2, 1.0, 7.8],
        radius: 1.15,
        action: { type: 'os' },
    },
    {
        id: 'soul_mirror',
        label: 'Soul Mirror',
        hint: 'Vessel · shape your form',
        position: [5.4, 1.25, 10.6],
        radius: 1.1,
        action: { type: 'panel', panel: 'soul' },
    },
    {
        id: 'arcade',
        label: 'Controller',
        hint: 'Pick up · Arcade',
        position: [0.2, 0.5, -5.2],
        radius: 1.0,
        action: { type: 'panel', panel: 'arcade' },
    },
    {
        id: 'envelope',
        label: 'Offering tray',
        hint: 'The Offering',
        position: [-3.2, 0.85, -4.0],
        radius: 1.05,
        action: { type: 'panel', panel: 'offering' },
    },
    {
        id: 'fireplace',
        label: 'Fireplace',
        hint: 'Warmth · hearth',
        position: [0, 1.0, -10.4],
        radius: 1.35,
        action: {
            type: 'soon',
            message: 'The fire keeps the house. Rest a moment.',
        },
    },
    {
        id: 'library',
        label: 'Bookshelves',
        hint: 'Open the Library',
        position: [-11.0, 1.1, -2.5],
        radius: 1.45,
        action: { type: 'panel', panel: 'library' },
    },
    {
        id: 'ledger',
        label: 'Ledger',
        hint: 'Daily word',
        position: [-8.5, 1.0, 2.5],
        radius: 1.1,
        action: { type: 'panel', panel: 'ledger' },
    },
    {
        id: 'hall',
        label: 'Hall arch',
        hint: 'The Hall · community',
        position: [-8.8, 1.15, 6.2],
        radius: 1.2,
        action: { type: 'panel', panel: 'hall' },
    },
    {
        id: 'codex',
        label: 'Study desk',
        hint: 'Codex · memory',
        position: [9.5, 1.0, -2.0],
        radius: 1.2,
        action: { type: 'panel', panel: 'codex' },
    },
    {
        id: 'cinema',
        label: 'Film screen',
        hint: 'Cinema · film',
        position: [11.2, 1.4, 3.5],
        radius: 1.3,
        action: { type: 'panel', panel: 'cinema' },
    },
    {
        id: 'studio',
        label: 'Studio',
        hint: 'Signal Studio · brand pulse',
        position: [10.2, 1.0, -8.5],
        radius: 1.25,
        action: { type: 'panel', panel: 'studio' },
    },
    {
        id: 'wayfinder',
        label: 'Wall map',
        hint: 'Roads · temporarily down',
        position: [0, 1.2, -0.4],
        radius: 1.15,
        action: { type: 'panel', panel: 'wayfinder' },
    },
];

export type Collider = { x: number; z: number; hx: number; hz: number };

/**
 * Walls + furniture. Hallway corridor open along x≈0 (foyer) and through arches.
 */
export const COLLIDERS: Collider[] = [
    // Outer shell
    { x: 0, z: -12.5, hx: 13.8, hz: 0.25 },
    { x: 0, z: 12.5, hx: 13.8, hz: 0.25 },
    { x: -13.8, z: 0, hx: 0.25, hz: 12.6 },
    { x: 13.8, z: 0, hx: 0.25, hz: 12.6 },

    // ── Hallway walls (east-west corridor band z −1 … +2.5 open) ──
    // North hallway wall (separates living), openings at center (living entry) and west/east
    { x: -7.5, z: -1.15, hx: 4.2, hz: 0.14 },
    { x: 7.5, z: -1.15, hx: 4.2, hz: 0.14 },
    // South hallway wall (separates bedroom), doorway at x≈0
    { x: -5.5, z: 3.1, hx: 5.5, hz: 0.14 },
    { x: 5.5, z: 3.1, hx: 5.5, hz: 0.14 },
    // West hallway wall → library (opening at z≈0.5)
    { x: -6.2, z: -6.5, hx: 0.14, hz: 4.2 },
    { x: -6.2, z: 7.5, hx: 0.14, hz: 3.8 },
    // East hallway wall → study wing
    { x: 6.2, z: -7.0, hx: 0.14, hz: 3.8 },
    { x: 6.2, z: 6.5, hx: 0.14, hz: 4.2 },

    // Front door frame (south outer, foyer)
    { x: -1.1, z: 12.2, hx: 0.35, hz: 0.2 },
    { x: 1.1, z: 12.2, hx: 0.35, hz: 0.2 },

    // Bedroom furniture
    { x: -1.2, z: 9.2, hx: 1.25, hz: 0.95 },
    { x: -2.7, z: 9.2, hx: 0.28, hz: 0.28 },
    { x: 0.3, z: 9.2, hx: 0.28, hz: 0.28 },
    { x: 4.4, z: 7.4, hx: 0.95, hz: 0.42 },
    { x: 4.2, z: 8.2, hx: 0.32, hz: 0.32 },
    { x: 5.9, z: 11.5, hx: 0.2, hz: 0.5 },

    // Living
    { x: 0.5, z: -3.8, hx: 1.4, hz: 0.55 },
    { x: 0.2, z: -5.3, hx: 0.55, hz: 0.4 },
    { x: 0.0, z: -7.6, hx: 1.25, hz: 0.35 },
    { x: -3.2, z: -4.0, hx: 0.5, hz: 0.4 },
    { x: 3.2, z: -4.5, hx: 0.42, hz: 0.42 },
    // Fireplace wall mass
    { x: 0, z: -11.85, hx: 1.35, hz: 0.35 },
    { x: -1.55, z: -11.5, hx: 0.22, hz: 0.55 },
    { x: 1.55, z: -11.5, hx: 0.22, hz: 0.55 },

    // Library (west)
    { x: -12.9, z: -2.5, hx: 0.35, hz: 2.8 },
    { x: -9.5, z: -1.5, hx: 0.4, hz: 0.4 },
    { x: -8.5, z: 2.5, hx: 0.38, hz: 0.38 },

    // Community hall arch (NW)
    { x: -9.5, z: 6.2, hx: 0.2, hz: 0.9 },
    { x: -8.0, z: 6.2, hx: 0.2, hz: 0.9 },

    // Study / cinema / studio (east)
    { x: 9.5, z: -2.0, hx: 0.9, hz: 0.5 },
    { x: 9.4, z: -1.1, hx: 0.32, hz: 0.32 },
    { x: 12.9, z: -4.5, hx: 0.3, hz: 1.6 },
    { x: 12.5, z: 3.5, hx: 0.28, hz: 1.4 },
    { x: 10.5, z: -8.5, hx: 1.0, hz: 0.6 },

    // Wayfinder console in hallway
    { x: 0, z: -0.5, hx: 0.7, hz: 0.22 },
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

export function hotspotProximity(x: number, z: number, h: Hotspot): number {
    const d = Math.hypot(x - h.position[0], z - h.position[2]);
    if (d >= h.radius) return 0;
    return 1 - d / h.radius;
}

/** Living rug band for footstep material */
export function isOnLivingRug(x: number, z: number): boolean {
    return Math.abs(x) < 4.5 && z > -8.5 && z < -2.2;
}
