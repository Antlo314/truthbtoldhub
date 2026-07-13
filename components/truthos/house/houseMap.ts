/**
 * House layout + Hut feature mapping.
 *
 * Bedroom  → Truth.OS (computer / phone)
 * Living   → Offering (envelope on table)
 * Library  → Library section
 * Study    → Codex / Ledger
 * Sanctum  → 3D Chamber (/world)
 * Gallery  → Cinema / Visions
 * Hallway  → Hall (community)
 */

export type HotspotId =
    | 'computer'
    | 'phone'
    | 'envelope'
    | 'library'
    | 'codex'
    | 'chamber'
    | 'cinema'
    | 'hall'
    | 'soul_mirror';

export type Hotspot = {
    id: HotspotId;
    label: string;
    hint: string;
    position: [number, number, number];
    radius: number;
    /** App open inside OS, external route, or os boot */
    action:
        | { type: 'os' }
        | { type: 'app'; app: string }
        | { type: 'route'; href: string };
};

/** World bounds (floor plane, y=0). Walls use collision slabs. */
export const HOUSE_BOUNDS = {
    minX: -8.5,
    maxX: 8.5,
    minZ: -8.5,
    maxZ: 8.5,
};

export const SPAWN: [number, number, number] = [0, 1.6, 5.5];

export const HOTSPOTS: Hotspot[] = [
    {
        id: 'computer',
        label: 'Desktop',
        hint: 'Boot Truth.OS',
        position: [3.2, 1.0, 4.2],
        radius: 1.6,
        action: { type: 'os' },
    },
    {
        id: 'envelope',
        label: 'Envelope',
        hint: 'The Offering · sustain the work',
        position: [-1.5, 0.85, -1.0],
        radius: 1.5,
        action: { type: 'route', href: '/support' },
    },
    {
        id: 'library',
        label: 'Library shelves',
        hint: 'Open the Library',
        position: [-5.5, 1.2, -4.5],
        radius: 2.2,
        action: { type: 'route', href: '/library' },
    },
    {
        id: 'codex',
        label: 'Study desk',
        hint: 'Codex · memory & whispers',
        position: [5.0, 1.0, -4.0],
        radius: 1.8,
        action: { type: 'route', href: '/codex' },
    },
    {
        id: 'chamber',
        label: 'Sanctum door',
        hint: '3D Chamber · walkable hut',
        position: [0, 1.2, -7.2],
        radius: 1.8,
        action: { type: 'route', href: '/world' },
    },
    {
        id: 'cinema',
        label: 'Gallery screen',
        hint: 'Cinema · transmissions',
        position: [5.5, 1.4, 1.5],
        radius: 1.8,
        action: { type: 'route', href: '/cinema' },
    },
    {
        id: 'hall',
        label: 'Hallway arch',
        hint: 'The Hall · voices gather',
        position: [-5.5, 1.2, 1.5],
        radius: 1.8,
        action: { type: 'route', href: '/archive' },
    },
    {
        id: 'soul_mirror',
        label: 'Mirror',
        hint: 'Vessel · shape identity',
        position: [2.8, 1.3, 6.2],
        radius: 1.4,
        action: { type: 'route', href: '/awakening/create' },
    },
];

/** Simple AABB colliders (center xz, half extents) for walls/furniture */
export type Collider = { x: number; z: number; hx: number; hz: number };

export const COLLIDERS: Collider[] = [
    // Outer walls (thick slabs just outside walkable)
    { x: 0, z: -8.7, hx: 9, hz: 0.25 },
    { x: 0, z: 8.7, hx: 9, hz: 0.25 },
    { x: -8.7, z: 0, hx: 0.25, hz: 9 },
    { x: 8.7, z: 0, hx: 0.25, hz: 9 },
    // Interior: bedroom / living split
    { x: 0, z: 2.5, hx: 2.2, hz: 0.15 },
    { x: -3.5, z: 2.5, hx: 1.5, hz: 0.15 },
    { x: 3.5, z: 2.5, hx: 1.5, hz: 0.15 },
    // Library divider
    { x: -3.2, z: -3.0, hx: 0.15, hz: 2.0 },
    // Study divider
    { x: 3.2, z: -3.0, hx: 0.15, hz: 2.0 },
    // Desk block bedroom
    { x: 3.2, z: 4.5, hx: 0.9, hz: 0.45 },
    // Living table
    { x: -1.5, z: -1.0, hx: 0.7, hz: 0.45 },
    // Library shelves
    { x: -6.2, z: -5.0, hx: 0.4, hz: 2.2 },
    // Sanctum door frame (sides only)
    { x: -1.4, z: -7.0, hx: 0.25, hz: 0.4 },
    { x: 1.4, z: -7.0, hx: 0.25, hz: 0.4 },
];

export function collideMove(
    x: number,
    z: number,
    dx: number,
    dz: number,
    radius = 0.35,
): { x: number; z: number } {
    let nx = x + dx;
    let nz = z + dz;
    for (const c of COLLIDERS) {
        const minX = c.x - c.hx - radius;
        const maxX = c.x + c.hx + radius;
        const minZ = c.z - c.hz - radius;
        const maxZ = c.z + c.hz + radius;
        // separate axes for sliding
        if (nx > minX && nx < maxX && z > minZ && z < maxZ) nx = x;
        if (x > minX && x < maxX && nz > minZ && nz < maxZ) nz = z;
        if (nx > minX && nx < maxX && nz > minZ && nz < maxZ) {
            nx = x;
            nz = z;
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
        const dx = x - h.position[0];
        const dz = z - h.position[2];
        const d = Math.hypot(dx, dz);
        if (d < h.radius && d < bestD) {
            best = h;
            bestD = d;
        }
    }
    return best;
}
