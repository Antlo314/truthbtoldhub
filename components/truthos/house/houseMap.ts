/**
 * Staged multi-room house + front/back yards (open-house guidelines):
 * · Clear ≥1.1 m walk paths · conversation groups · wall furniture · one hero per room
 * · Open front (south) + back (north) doors · walkable grounds
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
    | 'back_door'
    | 'front_bench'
    | 'back_gate'
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

/** Interior shell ~±13.8 · yards extend beyond N/S doors · side wrap for full loop */
export const HOUSE_BOUNDS = {
    minX: -17.6,
    maxX: 17.6,
    minZ: -21.4,
    maxZ: 21.4,
};

/** Outer shell planes + partition thickness (single source for mesh + colliders) */
export const SHELL = {
    west: -13.8,
    east: 13.8,
    north: -12.5,
    south: 12.5,
    wallT: 0.35,
    partT: 0.22,
} as const;

/**
 * Interior openings (center + half-width along wall).
 * Clear gap width = 2 * halfW; must stay free of furniture colliders.
 */
export const OPENING = {
    front: { x: 0, halfW: 0.95, z: 12.5 },
    back: { x: -3.25, halfW: 1.05, z: -12.5 },
    living: { z: -1.15, halfW: 1.65 },
    bedroom: { z: 3.1, halfW: 1.4 },
    westWing: { x: -6.2, z0: -2.05, z1: 3.55 },
    eastHall: { x: 6.2, z0: -2.85, z1: 2.15 },
    cinema: { x: 6.2, z0: 5.45, z1: 8.25 },
} as const;

/** Min free path width (m) through openings — player R 0.34 + margin */
export const PATH_CLEAR = 1.15;

/**
 * In front of the Truth.OS computer (bedroom desk) so new players see the station first.
 * Desk sits SE bedroom north of cinema door so the east doorway stays clear.
 */
export const SPAWN: [number, number, number] = [3.8, 1.62, 8.9];
/** Radians — face the desk / screen (desk faces roughly +Z) */
export const SPAWN_YAW = Math.PI;

/** Living north-wall fireplace (hero focal) */
export const FIREPLACE = { x: 0, z: -11.55, y: 0.9 };

/** Front door threshold (south foyer) — walk-through open */
export const FRONT_DOOR = { x: 0, z: 12.35 };
/** Back door offset west of fireplace so fire stays hero */
export const BACK_DOOR = { x: -3.25, z: -12.35 };

/** Shared furniture anchors (mesh + colliders + hotspots stay in sync) */
export const FURN = {
    sofa: { x: 0, z: -6.0 },
    coffee: { x: 0.15, z: -8.35 },
    media: { x: 5.55, z: -7.8 }, // against east living face of partition
    offering: { x: -5.55, z: -6.5 }, // against west living face of partition
    chair: { x: 2.9, z: -7.5 },
    bed: { x: -2.0, z: 10.0 },
    desk: { x: 4.35, z: 9.55 }, // SE bedroom, north of cinema door band
    deskChair: { x: 4.15, z: 10.4 }, // room side of desk (south, toward bed)
    mirror: { x: 5.95, z: 9.35 },
    wayfinder: { x: 2.55, z: 0.4 },
    libraryChair: { x: -11.2, z: -4.6 },
    libraryTable: { x: -10.4, z: -3.5 },
    studyDesk: { x: 9.4, z: -3.5 },
    studyChair: { x: 9.2, z: -2.55 },
    cinemaChairA: { x: 10.0, z: 6.2 },
    cinemaChairB: { x: 10.0, z: 7.8 },
    studio: { x: 10.3, z: -9.1 },
    studioStool: { x: 10.3, z: -8.35 },
} as const;

/** Yard props clear of shell (canopy margin ≥ 1.0 past outer walls) */
export const YARD = {
    trees: [
        { x: -8.5, z: 17.5, r: 0.38 },
        { x: 9.2, z: 18.2, r: 0.38 },
        { x: -9.0, z: 16.8, r: 0.32 },
        { x: 10.0, z: 16.5, r: 0.32 },
        { x: -10.2, z: -17.5, r: 0.36 },
        { x: 9.5, z: -18.0, r: 0.36 },
        { x: -16.2, z: -8.0, r: 0.32 },
        { x: 16.2, z: 6.0, r: 0.32 },
    ],
    bushes: [
        { x: -4.2, z: 15.8, r: 0.4 },
        { x: 5.0, z: 17.8, r: 0.45 },
        { x: -2.0, z: 19.5, r: 0.35 },
        { x: -1.5, z: -18.5, r: 0.38 },
        { x: 3.2, z: -19.2, r: 0.32 },
    ],
    benchFront: { x: 2.9, z: 16.2 },
    benchBack: { x: 2.4, z: -14.6 },
    lanternL: { x: -1.35, z: 14.6 },
    lanternR: { x: 1.35, z: 14.6 },
    bedW: { x: -5.5, z: -16.2 },
    bedE: { x: 4.8, z: -15.8 },
    firePit: { x: 0.15, z: -16.8 },
} as const;

/**
 * Hotspots in open approach zones (never inside colliders).
 * Layout follows staging: path down hall, room vignettes left/right/north/south.
 */
export const HOTSPOTS: Hotspot[] = [
    {
        id: 'front_door',
        label: 'Front door',
        hint: 'Porch · front yard open',
        position: [0, 1.2, 11.15],
        radius: 1.15,
        action: {
            type: 'soon',
            message: 'The front door is open. Step through to the porch and front yard.',
        },
    },
    {
        id: 'back_door',
        label: 'Back door',
        hint: 'Garden · back yard open',
        position: [-3.25, 1.15, -11.25],
        radius: 1.1,
        action: {
            type: 'soon',
            message: 'The back door is open. The garden waits on the other side.',
        },
    },
    {
        id: 'front_bench',
        label: 'Porch bench',
        hint: 'Rest · look out',
        position: [2.9, 0.55, 16.2],
        radius: 1.05,
        action: {
            type: 'soon',
            message: 'A quiet bench under the night air. The house holds. You can rest here.',
        },
    },
    {
        id: 'back_gate',
        label: 'Garden gate',
        hint: 'Beyond · later',
        position: [0, 1.0, -19.6],
        radius: 1.2,
        action: {
            type: 'soon',
            message: 'The gate holds for now. Roads beyond open later. The garden is yours to walk.',
        },
    },
    {
        id: 'wayfinder',
        label: 'Wall map',
        hint: 'Roads · temporarily down',
        // Hall console off spine (path |x|<1.2 clear)
        position: [2.55, 1.15, 0.95],
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
        // Console against west living partition — clear of back-door corridor
        position: [-5.15, 0.85, -6.5],
        radius: 1.0,
        action: { type: 'panel', panel: 'offering' },
    },
    {
        id: 'computer',
        label: 'Desktop',
        hint: 'Monitor · return via desktop button',
        // Bedroom work corner — desk SE north of cinema door
        position: [4.15, 1.0, 8.95],
        radius: 1.15,
        action: { type: 'os' },
    },
    {
        id: 'soul_mirror',
        label: 'Soul Mirror',
        hint: 'Vessel · shape your form',
        // Bedroom east wall — north of cinema doorway band
        position: [4.7, 1.25, 9.35],
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
 * Walls + furniture + yard colliders (must match HouseGeometry / YardGeometry).
 * Interior partitions span shell-to-shell with only OPENING gaps.
 */
export const COLLIDERS: Collider[] = [
    // Outer shell (doors open)
    { x: -9.05, z: -12.5, hx: 4.75, hz: 0.22 },
    { x: 5.8, z: -12.5, hx: 8.0, hz: 0.22 },
    { x: -7.375, z: 12.5, hx: 6.425, hz: 0.22 },
    { x: 7.375, z: 12.5, hx: 6.425, hz: 0.22 },
    { x: -13.8, z: 0, hx: 0.22, hz: 12.6 },
    { x: 13.8, z: 0, hx: 0.22, hz: 12.6 },
    // Living entry z=-1.15 gap +/-1.65 — reach shell
    { x: -7.725, z: -1.15, hx: 6.075, hz: 0.14 },
    { x: 7.725, z: -1.15, hx: 6.075, hz: 0.14 },
    // Bedroom z=3.1 gap +/-1.4 — reach shell
    { x: -7.6, z: 3.1, hx: 6.2, hz: 0.14 },
    { x: 7.6, z: 3.1, hx: 6.2, hz: 0.14 },
    // West partition x=-6.2 library gap — reach N/S shell
    { x: -6.2, z: -7.275, hx: 0.14, hz: 5.225 },
    { x: -6.2, z: 8.025, hx: 0.14, hz: 4.475 },
    // East partition x=6.2 hall + cinema gaps — reach N/S shell
    { x: 6.2, z: -7.675, hx: 0.14, hz: 4.825 },
    { x: 6.2, z: 3.8, hx: 0.14, hz: 1.65 },
    { x: 6.2, z: 10.375, hx: 0.14, hz: 2.125 },
    // Jambs
    { x: -1.1, z: 12.25, hx: 0.32, hz: 0.2 },
    { x: 1.1, z: 12.25, hx: 0.32, hz: 0.2 },
    { x: -4.2, z: -12.25, hx: 0.32, hz: 0.2 },
    { x: -2.3, z: -12.25, hx: 0.32, hz: 0.2 },
    // Living furniture
    { x: FURN.sofa.x, z: FURN.sofa.z, hx: 1.55, hz: 0.58 },
    { x: FURN.coffee.x, z: FURN.coffee.z, hx: 0.6, hz: 0.42 },
    { x: FURN.media.x, z: FURN.media.z, hx: 0.32, hz: 1.1 },
    { x: FURN.offering.x, z: FURN.offering.z, hx: 0.38, hz: 0.55 },
    { x: FURN.chair.x, z: FURN.chair.z, hx: 0.42, hz: 0.42 },
    { x: 0, z: -11.9, hx: 1.5, hz: 0.4 },
    { x: -1.6, z: -11.55, hx: 0.25, hz: 0.5 },
    { x: 1.6, z: -11.55, hx: 0.25, hz: 0.5 },
    // Bedroom
    { x: FURN.bed.x, z: FURN.bed.z, hx: 1.2, hz: 0.95 },
    { x: -3.45, z: 10.0, hx: 0.3, hz: 0.3 },
    { x: -0.55, z: 10.0, hx: 0.3, hz: 0.3 },
    { x: FURN.desk.x, z: FURN.desk.z, hx: 0.95, hz: 0.42 },
    { x: FURN.deskChair.x, z: FURN.deskChair.z, hx: 0.32, hz: 0.32 },
    { x: FURN.mirror.x, z: FURN.mirror.z, hx: 0.16, hz: 0.5 },
    // Library
    { x: -13.0, z: -5.0, hx: 0.38, hz: 2.4 },
    { x: FURN.libraryChair.x, z: FURN.libraryChair.z, hx: 0.42, hz: 0.42 },
    { x: FURN.libraryTable.x, z: FURN.libraryTable.z, hx: 0.42, hz: 0.4 },
    // Hall arch
    { x: -9.7, z: 6.4, hx: 0.22, hz: 0.85 },
    { x: -8.2, z: 6.4, hx: 0.22, hz: 0.85 },
    // Study / cinema / studio
    { x: FURN.studyDesk.x, z: FURN.studyDesk.z, hx: 0.9, hz: 0.5 },
    { x: FURN.studyChair.x, z: FURN.studyChair.z, hx: 0.32, hz: 0.32 },
    { x: 13.0, z: -5.2, hx: 0.32, hz: 1.5 },
    { x: 12.55, z: 7.0, hx: 0.28, hz: 1.2 },
    { x: FURN.cinemaChairA.x, z: FURN.cinemaChairA.z, hx: 0.38, hz: 0.38 },
    { x: FURN.cinemaChairB.x, z: FURN.cinemaChairB.z, hx: 0.38, hz: 0.38 },
    { x: FURN.studio.x, z: FURN.studio.z, hx: 1.05, hz: 0.55 },
    { x: FURN.studioStool.x, z: FURN.studioStool.z, hx: 0.28, hz: 0.28 },
    { x: FURN.wayfinder.x, z: FURN.wayfinder.z, hx: 0.55, hz: 0.28 },
    // Fence
    { x: 0, z: -21.55, hx: 18.0, hz: 0.18 },
    { x: 0, z: 21.55, hx: 18.0, hz: 0.18 },
    { x: -17.75, z: 0, hx: 0.18, hz: 21.7 },
    { x: 17.75, z: 0, hx: 0.18, hz: 21.7 },
    { x: -1.35, z: -21.35, hx: 0.22, hz: 0.28 },
    { x: 1.35, z: -21.35, hx: 0.22, hz: 0.28 },
    // Yard
    { x: YARD.benchFront.x, z: YARD.benchFront.z, hx: 0.85, hz: 0.32 },
    { x: YARD.benchBack.x, z: YARD.benchBack.z, hx: 0.85, hz: 0.32 },
    { x: YARD.lanternL.x, z: YARD.lanternL.z, hx: 0.14, hz: 0.14 },
    { x: YARD.lanternR.x, z: YARD.lanternR.z, hx: 0.14, hz: 0.14 },
    { x: YARD.bedW.x, z: YARD.bedW.z, hx: 1.1, hz: 0.55 },
    { x: YARD.bedE.x, z: YARD.bedE.z, hx: 0.95, hz: 0.5 },
    { x: YARD.firePit.x, z: YARD.firePit.z, hx: 0.72, hz: 0.72 },
    ...YARD.trees.map((t) => ({ x: t.x, z: t.z, hx: t.r, hz: t.r })),
    ...YARD.bushes.map((b) => ({ x: b.x, z: b.z, hx: b.r, hz: b.r })),
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

/** Outside the house footprint (yards / side wrap) */
export function isOutdoors(x: number, z: number): boolean {
    return Math.abs(x) > 13.6 || z > 12.35 || z < -12.35;
}
