/**
 * House layout — real-home staging, modern brand stations.
 * Zones · clear paths · furniture against walls where it belongs.
 * One object → one feature. Truth only in Truth.OS (computer).
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
    | 'front_door';

export type Hotspot = {
    id: HotspotId;
    label: string;
    hint: string;
    /** World position — stand here to interact (in front of furniture, not inside) */
    position: [number, number, number];
    /** Horizontal reach (meters). Keep tight so HUD doesn't fire from next room. */
    radius: number;
    action:
        | { type: 'os' }
        | { type: 'panel'; panel: HousePanelId }
        | { type: 'soon'; message: string };
};

/** Expanded ~22×20 m footprint */
export const HOUSE_BOUNDS = {
    minX: -10.2,
    maxX: 10.2,
    minZ: -9.2,
    maxZ: 9.2,
};

/** Bedroom doorway looking into living / media wall (−Z) */
export const SPAWN: [number, number, number] = [0, 1.62, 4.4];

/**
 * Interact points sit in the open approach zone (not inside colliders).
 * radius tuned so only nearby approach triggers HUD.
 */
export const HOTSPOTS: Hotspot[] = [
    {
        id: 'computer',
        label: 'Desktop',
        hint: 'Log in · boot Truth.OS',
        // Approach from chair side (+Z of desk)
        position: [3.35, 1.0, 5.55],
        radius: 1.1,
        action: { type: 'os' },
    },
    {
        id: 'soul_mirror',
        label: 'Soul Mirror',
        hint: 'Vessel · shape your form',
        // Stand in front of south-wall mirror
        position: [3.15, 1.25, 8.35],
        radius: 1.05,
        action: { type: 'panel', panel: 'soul' },
    },
    {
        id: 'arcade',
        label: 'Controller',
        hint: 'Pick up · Arcade',
        // Coffee table between sofa and TV
        position: [0.2, 0.5, -1.85],
        radius: 0.95,
        action: { type: 'panel', panel: 'arcade' },
    },
    {
        id: 'envelope',
        label: 'Offering tray',
        hint: 'The Offering',
        position: [-2.55, 0.8, 0.15],
        radius: 1.0,
        action: { type: 'panel', panel: 'offering' },
    },
    {
        id: 'library',
        label: 'Bookshelves',
        hint: 'Open the Library',
        position: [-6.55, 1.1, -4.5],
        radius: 1.35,
        action: { type: 'panel', panel: 'library' },
    },
    {
        id: 'codex',
        label: 'Study desk',
        hint: 'Codex · memory',
        position: [6.2, 1.0, -4.2],
        radius: 1.15,
        action: { type: 'panel', panel: 'codex' },
    },
    {
        id: 'ledger',
        label: 'Ledger',
        hint: 'Daily word',
        position: [-5.0, 1.0, 2.0],
        radius: 1.05,
        action: { type: 'panel', panel: 'ledger' },
    },
    {
        id: 'wayfinder',
        label: 'Wall map',
        hint: 'Roads · temporarily down',
        position: [0, 1.15, -8.15],
        radius: 1.15,
        action: { type: 'panel', panel: 'wayfinder' },
    },
    {
        id: 'cinema',
        label: 'Film screen',
        hint: 'Cinema · film',
        position: [7.55, 1.3, 1.25],
        radius: 1.2,
        action: { type: 'panel', panel: 'cinema' },
    },
    {
        id: 'hall',
        label: 'Hall arch',
        hint: 'The Hall · community',
        // Center of partition arch opening
        position: [-5.4, 1.15, 2.05],
        radius: 1.1,
        action: { type: 'panel', panel: 'hall' },
    },
    {
        id: 'studio',
        label: 'Studio',
        hint: 'Signal Studio · brand pulse',
        position: [7.35, 1.0, -6.75],
        radius: 1.2,
        action: { type: 'panel', panel: 'studio' },
    },
    {
        id: 'front_door',
        label: 'Front door',
        hint: 'Outside · coming soon',
        // West entry into living
        position: [-9.15, 1.2, 0.15],
        radius: 1.1,
        action: {
            type: 'soon',
            message: 'The grounds open soon. For now, this is home.',
        },
    },
];

export type Collider = { x: number; z: number; hx: number; hz: number };

/**
 * Furniture against walls / floating seating groups.
 * Living: TV on north media wall (−Z), sofa further south (+Z) facing it.
 */
export const COLLIDERS: Collider[] = [
    // Outer walls
    { x: 0, z: -9.5, hx: 10.6, hz: 0.22 },
    { x: 0, z: 9.5, hx: 10.6, hz: 0.22 },
    { x: -10.5, z: 0, hx: 0.22, hz: 9.8 },
    { x: 10.5, z: 0, hx: 0.22, hz: 9.8 },

    // Bedroom partial walls (doorway ~2.3 m)
    { x: -3.45, z: 3.0, hx: 2.2, hz: 0.14 },
    { x: 3.45, z: 3.0, hx: 2.2, hz: 0.14 },

    // Bed against south wall
    { x: -0.7, z: 7.7, hx: 1.2, hz: 0.95 },
    { x: -2.15, z: 7.7, hx: 0.28, hz: 0.28 },
    { x: 0.75, z: 7.7, hx: 0.28, hz: 0.28 },
    // Desk against east bedroom wall; chair on +Z (room) side
    { x: 3.7, z: 5.15, hx: 0.9, hz: 0.4 },
    { x: 3.55, z: 5.9, hx: 0.3, hz: 0.32 },
    // Wall mirror (south bedroom wall)
    { x: 3.15, z: 9.25, hx: 0.55, hz: 0.14 },

    // Living — sofa further from TV (conversation distance)
    { x: 0.4, z: 0.15, hx: 1.35, hz: 0.55 },
    // Coffee table mid conversation
    { x: 0.2, z: -1.9, hx: 0.55, hz: 0.4 },
    // Media console + TV against wall
    { x: 0.0, z: -4.55, hx: 1.2, hz: 0.35 },
    // Offering console against west living
    { x: -2.7, z: 0.2, hx: 0.5, hz: 0.4 },
    // Accent chair east of seating
    { x: 2.85, z: -0.4, hx: 0.4, hz: 0.4 },

    // Ledger
    { x: -5.1, z: 2.1, hx: 0.38, hz: 0.38 },
    // Hearth
    { x: -7.55, z: 3.7, hx: 0.7, hz: 0.48 },
    // Hall partition wall (arch opening clear at z≈2.05 ± 0.78)
    { x: -5.85, z: 0.55, hx: 0.16, hz: 0.72 },
    { x: -5.85, z: 3.45, hx: 0.16, hz: 1.15 },
    { x: -5.85, z: 1.27, hx: 0.16, hz: 0.1 },
    { x: -5.85, z: 2.83, hx: 0.16, hz: 0.1 },

    // Library shelves (wall-hug west)
    { x: -8.75, z: -4.5, hx: 0.4, hz: 2.15 },
    { x: -5.6, z: -3.85, hx: 0.4, hz: 0.4 },

    // Study
    { x: 6.4, z: -4.55, hx: 0.85, hz: 0.45 },
    { x: 6.35, z: -3.75, hx: 0.3, hz: 0.3 },
    { x: 8.6, z: -5.7, hx: 0.35, hz: 1.1 },

    // Cinema against east wall
    { x: 8.95, z: 1.25, hx: 0.25, hz: 1.25 },
    // Wayfinder north wall
    { x: 0, z: -9.05, hx: 0.95, hz: 0.16 },
    // Studio desk (SE)
    { x: 7.65, z: -7.15, hx: 0.95, hz: 0.55 },
    // Front door frame (west wall)
    { x: -10.15, z: 0.15, hx: 0.28, hz: 0.55 },
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

/** Closest hotspot within radius (strict). Prefer smaller distance. */
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

/** 0..1 proximity for HUD intensity (1 = on top of interact) */
export function hotspotProximity(x: number, z: number, h: Hotspot): number {
    const d = Math.hypot(x - h.position[0], z - h.position[2]);
    if (d >= h.radius) return 0;
    return 1 - d / h.radius;
}
