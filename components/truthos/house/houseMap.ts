/**
 * Staged multi-room house (open-house guidelines):
 * · Clear ≥1.1 m walk paths · conversation groups · wall furniture · one hero per room
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

export const HOUSE_BOUNDS = {
    minX: -13.5,
    maxX: 13.5,
    minZ: -12.2,
    maxZ: 12.2,
};

/**
 * In front of the Truth.OS computer (bedroom desk) so new players see the station first.
 * Yaw = Math.PI looks toward +Z (desk / monitor).
 */
export const SPAWN: [number, number, number] = [4.55, 1.62, 6.35];
/** Radians — face the desk / screen */
export const SPAWN_YAW = Math.PI;

/** Living north-wall fireplace (hero focal) */
export const FIREPLACE = { x: 0, z: -11.55, y: 0.9 };

/**
 * Hotspots in open approach zones (never inside colliders).
 * Layout follows staging: path down hall, room vignettes left/right/north/south.
 */
export const HOTSPOTS: Hotspot[] = [
    {
        id: 'front_door',
        label: 'Front door',
        hint: 'Outside · coming soon',
        position: [0, 1.2, 11.2],
        radius: 1.15,
        action: { type: 'soon', message: 'The grounds open soon. For now, this is home.' },
    },
    {
        id: 'wayfinder',
        label: 'Wall map',
        hint: 'Roads · temporarily down',
        // Hall console against north hall wall, offset so path stays clear
        position: [2.4, 1.15, 0.9],
        radius: 1.05,
        action: { type: 'panel', panel: 'wayfinder' },
    },
    {
        id: 'arcade',
        label: 'Controller',
        hint: 'Pick up · Arcade',
        // Coffee table in living conversation group
        position: [0.15, 0.5, -8.35],
        radius: 1.0,
        action: { type: 'panel', panel: 'arcade' },
    },
    {
        id: 'fireplace',
        label: 'Fireplace',
        hint: 'Warmth · hearth',
        position: [0, 1.0, -10.55],
        radius: 1.3,
        action: { type: 'soon', message: 'The fire keeps the house. Rest a moment.' },
    },
    {
        id: 'envelope',
        label: 'Offering tray',
        hint: 'The Offering',
        // Console against west living wall — TV owns east wall
        position: [-3.85, 0.85, -6.2],
        radius: 1.0,
        action: { type: 'panel', panel: 'offering' },
    },
    {
        id: 'computer',
        label: 'Desktop',
        hint: 'Log in · boot Truth.OS',
        // Bedroom work corner — approach from room center
        position: [4.6, 1.0, 7.55],
        radius: 1.15,
        action: { type: 'os' },
    },
    {
        id: 'soul_mirror',
        label: 'Soul Mirror',
        hint: 'Vessel · shape your form',
        // Bedroom east wall — fully inside room, approach from west
        position: [4.7, 1.25, 9.2],
        radius: 1.1,
        action: { type: 'panel', panel: 'soul' },
    },
    {
        id: 'library',
        label: 'Bookshelves',
        hint: 'Open the Library',
        // Deep in west library room (not hall threshold)
        position: [-11.4, 1.1, -5.0],
        radius: 1.35,
        action: { type: 'panel', panel: 'library' },
    },
    {
        id: 'ledger',
        label: 'Ledger',
        hint: 'Daily word',
        // Reading nook fully inside library
        position: [-10.4, 1.0, -3.5],
        radius: 1.1,
        action: { type: 'panel', panel: 'ledger' },
    },
    {
        id: 'hall',
        label: 'Hall arch',
        hint: 'The Hall · community',
        position: [-9.0, 1.15, 6.4],
        radius: 1.2,
        action: { type: 'panel', panel: 'hall' },
    },
    {
        id: 'codex',
        label: 'Study desk',
        hint: 'Codex · memory',
        position: [9.3, 1.0, -3.4],
        radius: 1.15,
        action: { type: 'panel', panel: 'codex' },
    },
    {
        id: 'cinema',
        label: 'Film screen',
        hint: 'Cinema · film',
        // SE empty room (east of bedroom doorway)
        position: [10.6, 1.35, 7.0],
        radius: 1.25,
        action: { type: 'panel', panel: 'cinema' },
    },
    {
        id: 'studio',
        label: 'Studio',
        hint: 'Signal Studio · brand pulse',
        position: [10.0, 1.0, -9.0],
        radius: 1.2,
        action: { type: 'panel', panel: 'studio' },
    },
];

export type Collider = { x: number; z: number; hx: number; hz: number };

/**
 * Walls + staged furniture colliders.
 * Living: sofa faces fireplace; media console on side wall; clear side paths.
 */
export const COLLIDERS: Collider[] = [
    // Outer shell
    { x: 0, z: -12.5, hx: 13.8, hz: 0.25 },
    { x: 0, z: 12.5, hx: 13.8, hz: 0.25 },
    { x: -13.8, z: 0, hx: 0.25, hz: 12.6 },
    { x: 13.8, z: 0, hx: 0.25, hz: 12.6 },

    // Hall partitions (open doorways kept clear)
    { x: -7.8, z: -1.15, hx: 4.0, hz: 0.14 },
    { x: 7.8, z: -1.15, hx: 4.0, hz: 0.14 },
    { x: -5.8, z: 3.15, hx: 5.3, hz: 0.14 },
    { x: 5.8, z: 3.15, hx: 5.3, hz: 0.14 },
    { x: -6.25, z: -6.8, hx: 0.14, hz: 4.0 },
    { x: -6.25, z: 7.6, hx: 0.14, hz: 3.6 },
    { x: 6.25, z: -7.2, hx: 0.14, hz: 3.6 },
    // East partition split for cinema doorway (~z 6.55–8.05 open)
    { x: 6.25, z: 4.15, hx: 0.14, hz: 1.75 },
    { x: 6.25, z: 9.55, hx: 0.14, hz: 1.75 },

    // Front door jambs
    { x: -1.15, z: 12.25, hx: 0.35, hz: 0.22 },
    { x: 1.15, z: 12.25, hx: 0.35, hz: 0.22 },

    // ── Living staged group (faces fireplace −Z) ──
    // Sofa floated, back toward hallway, face fire
    { x: 0.0, z: -6.0, hx: 1.55, hz: 0.58 },
    // Coffee table between sofa & fire
    { x: 0.15, z: -8.35, hx: 0.6, hz: 0.42 },
    // Media console against EAST living wall (side wall, not competing with fire)
    { x: 4.55, z: -7.8, hx: 0.32, hz: 1.1 },
    // Offering console against west living wall
    { x: -4.3, z: -6.2, hx: 0.38, hz: 0.55 },
    // Accent chair 90° conversation (east of group)
    { x: 2.85, z: -7.4, hx: 0.42, hz: 0.42 },
    // Fireplace mass
    { x: 0, z: -11.9, hx: 1.5, hz: 0.4 },
    { x: -1.6, z: -11.55, hx: 0.25, hz: 0.5 },
    { x: 1.6, z: -11.55, hx: 0.25, hz: 0.5 },

    // ── Bedroom ──
    // Bed head on south wall, left of center (path to desk clear on right)
    { x: -2.0, z: 10.0, hx: 1.2, hz: 0.95 },
    { x: -3.45, z: 10.0, hx: 0.3, hz: 0.3 },
    { x: -0.55, z: 10.0, hx: 0.3, hz: 0.3 },
    // Desk SE corner, chair room-side
    { x: 4.8, z: 7.6, hx: 0.95, hz: 0.42 },
    { x: 4.6, z: 8.45, hx: 0.32, hz: 0.32 },
    // Mirror on bedroom east wall (inside room)
    { x: 5.95, z: 9.2, hx: 0.16, hz: 0.5 },

    // ── Library (deep west, clear of hall threshold) ──
    { x: -13.0, z: -5.0, hx: 0.38, hz: 2.4 },
    { x: -11.2, z: -4.6, hx: 0.42, hz: 0.42 },
    { x: -10.4, z: -3.5, hx: 0.42, hz: 0.4 },

    // Hall arch
    { x: -9.7, z: 6.4, hx: 0.22, hz: 0.85 },
    { x: -8.2, z: 6.4, hx: 0.22, hz: 0.85 },

    // ── Study ──
    { x: 9.4, z: -3.5, hx: 0.9, hz: 0.5 },
    { x: 9.2, z: -2.55, hx: 0.32, hz: 0.32 },
    { x: 13.0, z: -5.2, hx: 0.32, hz: 1.5 },

    // Cinema SE empty room
    { x: 12.55, z: 7.0, hx: 0.28, hz: 1.2 },
    { x: 10.0, z: 6.35, hx: 0.38, hz: 0.38 },
    { x: 10.0, z: 7.65, hx: 0.38, hz: 0.38 },
    // Studio SE + stool
    { x: 10.3, z: -9.1, hx: 1.05, hz: 0.55 },
    { x: 10.3, z: -8.35, hx: 0.28, hz: 0.28 },

    // Wayfinder console against hall wall (not center of path)
    { x: 2.5, z: 0.35, hx: 0.55, hz: 0.28 },
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

export function isOnLivingRug(x: number, z: number): boolean {
    // Matches staged living rug under sofa → fire group
    return Math.abs(x) < 3.6 && z > -10.8 && z < -4.4;
}
