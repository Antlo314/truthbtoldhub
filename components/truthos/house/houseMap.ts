/**
 * House layout + solid colliders for every staged object.
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
    minX: -8.2,
    maxX: 8.2,
    minZ: -8.2,
    maxZ: 8.2,
};

export const SPAWN: [number, number, number] = [0, 1.6, 5.5];

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

/**
 * AABB half-extents in XZ — every walkable-blocking object.
 * Player radius is applied in collideMove.
 */
export const COLLIDERS: Collider[] = [
    // Outer walls
    { x: 0, z: -8.5, hx: 9.2, hz: 0.28 },
    { x: 0, z: 8.5, hx: 9.2, hz: 0.28 },
    { x: -8.5, z: 0, hx: 0.28, hz: 9.2 },
    { x: 8.5, z: 0, hx: 0.28, hz: 9.2 },

    // Bedroom / living split (gap for doorway at center)
    { x: -2.8, z: 2.5, hx: 1.85, hz: 0.18 },
    { x: 2.8, z: 2.5, hx: 1.85, hz: 0.18 },

    // Library / study room dividers
    { x: -3.2, z: -3.0, hx: 0.18, hz: 2.2 },
    { x: 3.2, z: -3.0, hx: 0.18, hz: 2.2 },

    // Bed
    { x: -0.5, z: 6.2, hx: 1.2, hz: 0.9 },
    // Desk + computer
    { x: 3.2, z: 4.5, hx: 0.9, hz: 0.42 },
    // Mirror frame
    { x: 2.85, z: 6.8, hx: 0.18, hz: 0.42 },
    // Vessel stand near mirror
    { x: 2.35, z: 6.35, hx: 0.38, hz: 0.38 },

    // Coffee table
    { x: -1.5, z: -1.0, hx: 0.7, hz: 0.42 },
    // Sofa body + back
    { x: 1.5, z: -2.2, hx: 1.3, hz: 0.55 },
    { x: 1.5, z: -2.55, hx: 1.3, hz: 0.22 },

    // Truth dais + figure
    { x: 0.2, z: -0.2, hx: 0.72, hz: 0.72 },

    // Ledger pedestal
    { x: -4.2, z: 1.2, hx: 0.42, hz: 0.42 },

    // Library shelves (block of three)
    { x: -7.15, z: -5.5, hx: 0.4, hz: 1.9 },

    // Study desk + tall cabinet
    { x: 5.5, z: -4.2, hx: 0.8, hz: 0.48 },
    { x: 6.5, z: -5.5, hx: 0.35, hz: 1.05 },

    // Cinema screen wall
    { x: 6.55, z: 1.5, hx: 0.22, hz: 1.2 },

    // Hall pillars
    { x: -6.0, z: 1.5, hx: 0.28, hz: 0.22 },
    { x: -5.0, z: 1.5, hx: 0.28, hz: 0.22 },

    // Sanctum door frame
    { x: -1.3, z: -7.75, hx: 0.32, hz: 0.35 },
    { x: 1.3, z: -7.75, hx: 0.32, hz: 0.35 },
    // Closed lower door slab (sides only leave walk gap)
    { x: 0, z: -8.35, hx: 0.95, hz: 0.2 },

    // Wayfinder board
    { x: 0, z: -5.45, hx: 0.8, hz: 0.16 },

    // Hearth west
    { x: -6.8, z: 3.2, hx: 0.72, hz: 0.48 },
];

export function collideMove(
    x: number,
    z: number,
    dx: number,
    dz: number,
    radius = 0.38,
): { x: number; z: number } {
    let nx = x + dx;
    let nz = z + dz;

    // Resolve each axis separately for sliding along walls
    for (const c of COLLIDERS) {
        const minX = c.x - c.hx - radius;
        const maxX = c.x + c.hx + radius;
        const minZ = c.z - c.hz - radius;
        const maxZ = c.z + c.hz + radius;
        if (nx > minX && nx < maxX && z > minZ && z < maxZ) nx = x;
    }
    for (const c of COLLIDERS) {
        const minX = c.x - c.hx - radius;
        const maxX = c.x + c.hx + radius;
        const minZ = c.z - c.hz - radius;
        const maxZ = c.z + c.hz + radius;
        if (nx > minX && nx < maxX && nz > minZ && nz < maxZ) {
            // try Z-only then X-only recovery
            if (x > minX && x < maxX && nz > minZ && nz < maxZ) nz = z;
            else if (nx > minX && nx < maxX && z > minZ && z < maxZ) nx = x;
            else {
                nx = x;
                nz = z;
            }
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
