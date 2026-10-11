/**
 * The Sanctum — one octagonal hall on the Aether Shelf.
 *
 * Seven apses around the hall, one station each; the Source at the
 * centre under an open oculus; the threshold to the south with the
 * Daily Word inside it and the Offering on the porch. Everything that
 * used to be nine rooms of furniture is one plan: a facet angle, an
 * apse frame, and a short table of solids in that frame.
 *
 * Collision is analytic. There are no wall boxes to drift from the
 * meshes: `walkable()` says where the floor is (the octagon, the apse
 * pockets, the doorway, the terrace, the bridges, the isles) and every
 * prop is a circle. The renderer, the walker and the validator all read
 * these same functions, so a prop cannot stand inside another and a
 * station cannot be sealed off without `npm run validate` saying so.
 */
import type { Hotspot } from './houseMap';
import { CLEARING_R, corridorDistance, CORRIDORS, DESTINATIONS, destCenter, inDestination, JUNGLE_BOUNDS } from './jungleMap';

export const EYE_HEIGHT = 1.62;
export const SIT_HEIGHT = 1.12;
export const PLAYER_R = 0.34;

/** One storey; the type is kept so old call sites compile. */
export type Level = 'main';
export const MAIN_Y = 0;

/* ── The hall ───────────────────────────────────────────────── */

export const HALL = {
    /** centre → inner face of each facet */
    apothem: 11,
    wallT: 0.6,
    /** wall height to the eave */
    eave: 6.2,
    oculusR: 2.8,
    oculusY: 9.4,
    facets: 8,
} as const;

/** Half the length of one facet (inner face) */
export const FACET_HALF = HALL.apothem * Math.tan(Math.PI / 8);
/** Centre → a facet's end vertex (inner) */
export const VERTEX_R = HALL.apothem / Math.cos(Math.PI / 8);

export const ALCOVE = { width: 4.4, depth: 2.8, height: 3.6, apseH: 4.6 } as const;
export const DOOR = { width: 2.6, height: 3.0 } as const;
export const DAIS = { r: 2.4, h: 0.28, rampR: 3.1 } as const;

export type AlcoveId = 'terminal' | 'arcade' | 'ledger' | 'library' | 'codex' | 'mark' | 'paths';
export type Alcove = { id: AlcoveId; name: string; facet: number; soft: boolean };

/** The entrance faces +z (south on the map) */
export const ENTRANCE_FACET = 2;

/** facet k faces angle k·45° (0 = +x, 2 = +z) */
export const ALCOVES: Alcove[] = [
    { id: 'terminal', name: 'The Terminal', facet: 6, soft: true },
    { id: 'library', name: 'The Library', facet: 7, soft: true },
    { id: 'codex', name: 'The Codex', facet: 5, soft: true },
    { id: 'arcade', name: 'The Arcade', facet: 0, soft: false },
    { id: 'ledger', name: 'The Ledger', facet: 4, soft: false },
    { id: 'mark', name: 'The Mark', facet: 1, soft: false },
    { id: 'paths', name: 'The Paths', facet: 3, soft: true },
];

export const alcove = (id: AlcoveId): Alcove => ALCOVES.find((a) => a.id === id)!;

export const facetAngle = (facet: number) => (facet * Math.PI) / 4;

/** three.js group rotation.y that points local +z along the facet's outward normal */
export const facetYaw = (facet: number) => Math.PI / 2 - facetAngle(facet);

/**
 * Facet frame: origin at the midpoint of the inner face, local +z OUT
 * through the wall, local +x along the wall (so that a group with
 * `rotation.y = facetYaw(facet)` draws local coordinates in this frame).
 */
export function facetToWorld(facet: number, x: number, z: number): { x: number; z: number } {
    const a = facetAngle(facet);
    const c = Math.cos(a);
    const s = Math.sin(a);
    return {
        x: c * HALL.apothem + x * s + z * c,
        z: s * HALL.apothem - x * c + z * s,
    };
}

export function worldToFacet(facet: number, wx: number, wz: number): { x: number; z: number } {
    const a = facetAngle(facet);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = wx - c * HALL.apothem;
    const dz = wz - s * HALL.apothem;
    return { x: dx * s - dz * c, z: dx * c + dz * s };
}

/** Yaw of a camera whose forward points along (nx, nz) — used for spawn and recentre. */
export function yawFacing(nx: number, nz: number): number {
    return Math.atan2(-nx, -nz);
}

/* ── Solids — every prop that takes floor ───────────────────── */

export type SolidAt = AlcoveId | 'door' | 'hall';

export type Solid = {
    name: string;
    /** which frame x/z are in: an apse, the entrance facet, or world */
    at: SolidAt;
    x: number;
    z: number;
    /** collision radius, metres */
    r: number;
    /** visual height, metres */
    h: number;
    /** yaw in the local frame (props face local +z) */
    yaw?: number;
    /** A chair pushed under a desk may share its circle — name the solid it tucks into */
    tuck?: string;
};

export const SOLIDS: Solid[] = [
    // ── Terminal (north) — desk against the back wall, chair facing it
    { name: 'desk', at: 'terminal', x: 0, z: 2.3, r: 0.95, h: 0.76, yaw: Math.PI },
    { name: 'desk chair', at: 'terminal', x: 0, z: 1.42, r: 0.3, h: 0.9, yaw: 0, tuck: 'desk' },
    { name: 'terminal lamp', at: 'terminal', x: 1.75, z: 2.25, r: 0.2, h: 1.6 },
    { name: 'terminal plant', at: 'terminal', x: -1.75, z: 2.25, r: 0.26, h: 1.0 },
    // ── Library — three bays on the back wall, a chair to read in
    { name: 'library bay W', at: 'library', x: -1.25, z: 2.5, r: 0.55, h: 2.4, yaw: Math.PI },
    { name: 'library bay C', at: 'library', x: 0, z: 2.5, r: 0.55, h: 2.4, yaw: Math.PI },
    { name: 'library bay E', at: 'library', x: 1.25, z: 2.5, r: 0.55, h: 2.4, yaw: 2.9 },
    { name: 'reading chair', at: 'library', x: 1.35, z: 0.85, r: 0.42, h: 0.9, yaw: Math.PI + 0.7 },
    { name: 'library lamp', at: 'library', x: -1.7, z: 1.0, r: 0.2, h: 1.6 },
    // ── Codex — scribe's desk
    { name: 'codex desk', at: 'codex', x: 0, z: 2.35, r: 0.8, h: 0.78, yaw: Math.PI },
    { name: 'codex chair', at: 'codex', x: 0, z: 1.5, r: 0.3, h: 0.9, yaw: 0, tuck: 'codex desk' },
    { name: 'codex plant', at: 'codex', x: 1.7, z: 2.25, r: 0.26, h: 1.0 },
    // ── Arcade — two cabinets, screens toward the hall
    { name: 'arcade cabinet L', at: 'arcade', x: -0.78, z: 2.4, r: 0.46, h: 1.85 },
    { name: 'arcade cabinet R', at: 'arcade', x: 0.78, z: 2.4, r: 0.46, h: 1.85 },
    { name: 'arcade stool', at: 'arcade', x: 1.8, z: 1.55, r: 0.22, h: 0.72 },
    // ── Ledger — the record on a sideboard
    { name: 'ledger sideboard', at: 'ledger', x: 0, z: 2.5, r: 0.92, h: 0.9 },
    // ── The Mark — a bench to sit and look
    { name: 'mark bench', at: 'mark', x: -1.55, z: 0.7, r: 0.32, h: 0.5, yaw: Math.PI / 2 },
    // ── Paths — the map, two artworks, a bench and a plant
    { name: 'paths bench', at: 'paths', x: 1.55, z: 0.7, r: 0.32, h: 0.5, yaw: -Math.PI / 2 },
    { name: 'paths plant', at: 'paths', x: -1.75, z: 2.25, r: 0.26, h: 1.0 },
    // ── Threshold (entrance frame; inside is −z, the porch is +z)
    { name: 'daily word lectern', at: 'door', x: -2.1, z: -1.3, r: 0.34, h: 0.95, yaw: 0.6 },
    { name: 'coat rack', at: 'door', x: 2.3, z: -1.1, r: 0.3, h: 1.7 },
    { name: 'door leaf W', at: 'door', x: -1.05, z: 0.9, r: 0.3, h: 2.35 },
    { name: 'door leaf E', at: 'door', x: 1.05, z: 0.9, r: 0.3, h: 2.35 },
    { name: 'offering chest', at: 'door', x: 2.1, z: 1.7, r: 0.46, h: 0.6, yaw: -Math.PI / 2 },
    { name: 'porch lantern W', at: 'door', x: -3.1, z: 1.5, r: 0.2, h: 2.6 },
    { name: 'porch lantern E', at: 'door', x: 3.3, z: 1.5, r: 0.2, h: 2.6 },
    // ── The Source — four low seats on the marble around the dais
    { name: 'source seat S', at: 'hall', x: 0, z: 3.7, r: 0.42, h: 0.46, yaw: Math.PI },
    { name: 'source seat N', at: 'hall', x: 0, z: -3.7, r: 0.42, h: 0.46, yaw: 0 },
    { name: 'source seat E', at: 'hall', x: 3.7, z: 0, r: 0.42, h: 0.46, yaw: -Math.PI / 2 },
    { name: 'source seat W', at: 'hall', x: -3.7, z: 0, r: 0.42, h: 0.46, yaw: Math.PI / 2 },
    // ── Eight columns at the hall's vertices, between the apses
    ...Array.from({ length: 8 }, (_, k) => {
        const a = facetAngle(k) + Math.PI / 8;
        const r = VERTEX_R - 0.75;
        return { name: `column ${k}`, at: 'hall' as const, x: Math.cos(a) * r, z: Math.sin(a) * r, r: 0.5, h: HALL.eave };
    }),
];

export function solid(name: string): Solid {
    const s = SOLIDS.find((x) => x.name === name);
    if (!s) throw new Error(`homeMap: no solid named "${name}"`);
    return s;
}

export function frameOf(at: SolidAt): number | null {
    if (at === 'hall') return null;
    if (at === 'door') return ENTRANCE_FACET;
    return alcove(at).facet;
}

/** World centre of a solid */
export function solidWorld(s: Solid): { x: number; z: number } {
    const f = frameOf(s.at);
    return f === null ? { x: s.x, z: s.z } : facetToWorld(f, s.x, s.z);
}

/* ── Where the floor is ─────────────────────────────────────── */

function insideOctagon(x: number, z: number, apothem: number): boolean {
    for (let k = 0; k < HALL.facets; k++) {
        const a = facetAngle(k);
        if (x * Math.cos(a) + z * Math.sin(a) > apothem) return false;
    }
    return true;
}

/** The apse whose pocket this point is in (pad shrinks the pocket) */
export function alcoveAt(x: number, z: number, pad = 0): Alcove | null {
    for (const a of ALCOVES) {
        const l = worldToFacet(a.facet, x, z);
        if (Math.abs(l.x) <= ALCOVE.width / 2 - pad && l.z >= -0.4 && l.z <= ALCOVE.depth - pad) return a;
    }
    return null;
}

/** Inside the entrance opening (and a step either side of it) */
export function inDoorway(x: number, z: number, pad = 0): boolean {
    const l = worldToFacet(ENTRANCE_FACET, x, z);
    return Math.abs(l.x) <= DOOR.width / 2 - pad && l.z >= -1.2 && l.z <= HALL.wallT + 1.2;
}

/** Under the roof: the hall, its apses, the threshold */
export function underRoof(x: number, z: number): boolean {
    return insideOctagon(x, z, HALL.apothem + HALL.wallT) || alcoveAt(x, z, -HALL.wallT) !== null;
}

/** Inside the building — the floor you walk on, not the walls */
export function indoors(x: number, z: number, pad = 0): boolean {
    return insideOctagon(x, z, HALL.apothem - pad) || alcoveAt(x, z, pad) !== null;
}

export function isOutdoors(x: number, z: number): boolean {
    if (indoors(x, z)) return false;
    const l = worldToFacet(ENTRANCE_FACET, x, z);
    if (Math.abs(l.x) <= DOOR.width / 2 && l.z <= HALL.wallT / 2 && l.z >= -1.2) return false;
    return true;
}

/** The building as a solid seen from outside: octagon + apse bump-outs */
export function inBuilding(x: number, z: number, pad = 0): boolean {
    if (insideOctagon(x, z, HALL.apothem + HALL.wallT + pad)) return true;
    for (const a of ALCOVES) {
        const l = worldToFacet(a.facet, x, z);
        if (Math.abs(l.x) <= ALCOVE.width / 2 + HALL.wallT + pad && l.z >= -0.1 && l.z <= ALCOVE.depth + HALL.wallT + pad) return true;
    }
    return false;
}

/** Dressing outside keeps this far from the walls */
export const clearOfHouse = (x: number, z: number) => !inBuilding(x, z, 1.6);

function hitsSolid(x: number, z: number, r: number): boolean {
    for (const s of SOLIDS) {
        const w = solidWorld(s);
        const dx = x - w.x;
        const dz = z - w.z;
        const rr = s.r + r;
        if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
}

/**
 * Can a body of radius r stand here?
 * Indoors: the octagon and the apse pockets. The threshold. Outdoors:
 * the terrace disc minus the building, the bridge decks, the isles.
 * Never inside a prop.
 */
export function walkable(x: number, z: number, r = PLAYER_R): boolean {
    if (x < JUNGLE_BOUNDS.minX || x > JUNGLE_BOUNDS.maxX || z < JUNGLE_BOUNDS.minZ || z > JUNGLE_BOUNDS.maxZ) return false;
    let ground = false;
    if (indoors(x, z, r)) ground = true;
    else if (inDoorway(x, z, r)) ground = true;
    else if (inBuilding(x, z, r)) ground = false;
    else if (Math.hypot(x, z) <= CLEARING_R - r) ground = true;
    else if (inDestination(x, z, -r)) ground = true;
    else ground = CORRIDORS.some((c) => corridorDistance(x, z, c) <= c.halfWidth - r);
    if (!ground) return false;
    return !hitsSolid(x, z, r);
}

/** Is a point inside something solid (or off the world)? For the third-person boom. */
export function blockedAt(x: number, z: number, r = 0.2): boolean {
    return !walkable(x, z, r);
}

/** Try the move; slide along one axis if the full step is blocked. */
export function moveOn(
    _level: Level,
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    r = PLAYER_R,
): { x: number; z: number } {
    if (walkable(toX, toZ, r)) return { x: toX, z: toZ };
    if (walkable(toX, fromZ, r)) return { x: toX, z: fromZ };
    if (walkable(fromX, toZ, r)) return { x: fromX, z: toZ };
    return { x: fromX, z: fromZ };
}

/** Floor height — the dais rises at the Source, with a ramp you can walk up. */
export function groundAt(x: number, z: number, _level?: Level): number {
    const d = Math.hypot(x, z);
    if (d <= DAIS.r) return DAIS.h;
    if (d < DAIS.rampR) return DAIS.h * (1 - (d - DAIS.r) / (DAIS.rampR - DAIS.r));
    return MAIN_Y;
}

/** True if a saved pose is still walkable. */
export function poseClear(x: number, z: number): boolean {
    return walkable(x, z, PLAYER_R);
}

/** Rugs: the soft apses */
export function onSoftFloor(x: number, z: number): boolean {
    const a = alcoveAt(x, z, 0.2);
    return !!a && a.soft && worldToFacet(a.facet, x, z).z > 0.3;
}

/* ── Doors ──────────────────────────────────────────────────── */

export type DoorLeaf = {
    name: string;
    /** hinge, in the entrance frame */
    x: number;
    z: number;
    w: number;
    t: number;
    /** +1 extends toward +x, −1 toward −x */
    dir: 1 | -1;
    /** open angle, radians */
    swing: number;
};

export const DOOR_LEAVES: DoorLeaf[] = [
    { name: 'west leaf', x: -DOOR.width / 2, z: HALL.wallT / 2, w: 1.24, t: 0.07, dir: 1, swing: 1.35 },
    { name: 'east leaf', x: DOOR.width / 2, z: HALL.wallT / 2, w: 1.24, t: 0.07, dir: -1, swing: 1.35 },
];

/* ── Spawn, recentre, landmarks ─────────────────────────────── */

const terminal = alcove('terminal');
const seatL = solid('desk chair');
const seatW = facetToWorld(terminal.facet, seatL.x, seatL.z);
const standW = facetToWorld(terminal.facet, 0, 0.55);
const tn = { x: Math.cos(facetAngle(terminal.facet)), z: Math.sin(facetAngle(terminal.facet)) };

export const INTRO = {
    seat: { x: seatW.x, z: seatW.z },
    /** facing the desk — along the apse's outward normal */
    lookYaw: yawFacing(tn.x, tn.z),
    stand: { x: standW.x, z: standW.z },
    holdS: 1.1,
    riseS: 1.6,
} as const;

export const SPAWN: [number, number, number] = [INTRO.stand.x, EYE_HEIGHT, INTRO.stand.z];
export const SPAWN_YAW = INTRO.lookYaw;

const doorW = facetToWorld(ENTRANCE_FACET, 0, HALL.wallT / 2);
export const FRONT_DOOR = { x: doorW.x, z: doorW.z };

const recenterW = facetToWorld(ENTRANCE_FACET, 0, -2.4);
const en = { x: Math.cos(facetAngle(ENTRANCE_FACET)), z: Math.sin(facetAngle(ENTRANCE_FACET)) };
/** Just inside the door, facing the Source. */
export const RECENTER = { x: recenterW.x, z: recenterW.z, yaw: yawFacing(-en.x, -en.z) } as const;

/** "Face home" indoors turns you to the Source. */
export const HALL_SPINE = { x: 0, z: 0 } as const;

/* ── Stations ───────────────────────────────────────────────── */

export type HomeHotspot = Hotspot & { level: Level };

const DEST_PANEL: Record<string, { label: string; hint: string; panel: string }> = {
    cinema: { label: 'The Cinema Isle', hint: 'Films above the cloud sea', panel: 'cinema' },
    hall: { label: 'The Hall Circle', hint: 'The community circle', panel: 'hall' },
    soul_mirror: { label: 'The Mirror Well', hint: 'Shape your vessel', panel: 'soul' },
    studio: { label: 'The Signal Spire', hint: 'Broadcast from the shelf', panel: 'studio' },
};

function at(atId: SolidAt, x: number, z: number, y = 1.2): [number, number, number] {
    const f = frameOf(atId);
    const w = f === null ? { x, z } : facetToWorld(f, x, z);
    return [w.x, y, w.z];
}

export const HOME_HOTSPOTS: HomeHotspot[] = [
    { id: 'computer', label: 'Truth.OS', hint: 'Sit back down at the terminal', level: 'main', position: at('terminal', 0, 1.1), radius: 1.6, action: { type: 'os' } },
    { id: 'arcade', label: 'Arcade', hint: 'Two cabinets · play', level: 'main', position: at('arcade', 0, 1.3), radius: 1.7, action: { type: 'panel', panel: 'arcade' } },
    { id: 'library', label: 'Library', hint: 'Take one down', level: 'main', position: at('library', 0, 1.3), radius: 1.7, action: { type: 'panel', panel: 'library' } },
    { id: 'codex', label: 'Codex', hint: 'Memory and whispers', level: 'main', position: at('codex', 0, 1.2), radius: 1.6, action: { type: 'panel', panel: 'codex' } },
    { id: 'ledger', label: 'The Ledger', hint: 'The record · the Word', level: 'main', position: at('ledger', 0, 1.4), radius: 1.6, action: { type: 'panel', panel: 'ledger' } },
    { id: 'wall', label: 'The Mark', hint: 'Choose a face · leave a mark', level: 'main', position: at('mark', 0, 1.2), radius: 1.8, action: { type: 'panel', panel: 'wall' } },
    { id: 'wayfinder', label: 'Paths', hint: 'The map of the shelf and the isles', level: 'main', position: at('paths', 0, 1.2), radius: 1.7, action: { type: 'panel', panel: 'wayfinder' } },
    { id: 'envelope', label: 'The Daily Word', hint: "This morning's paper", level: 'main', position: at('door', -1.5, -1.4, 1.1), radius: 1.3, action: { type: 'panel', panel: 'news' } },
    { id: 'mailbox', label: 'Offering', hint: 'Keep the Sanctum open', level: 'main', position: at('door', 1.6, 1.8, 1.0), radius: 1.5, action: { type: 'panel', panel: 'offering' } },
    { id: 'fireplace', label: 'The Source', hint: 'Sit at the Source', level: 'main', position: [0, 1.3, 0], radius: DAIS.rampR + 0.2, action: { type: 'sit' } },
    ...DESTINATIONS.map((d): HomeHotspot => {
        const c = destCenter(d);
        const meta = DEST_PANEL[d.id];
        return {
            id: d.id as HomeHotspot['id'],
            label: meta.label,
            hint: meta.hint,
            level: 'main',
            position: [c.x, 1.25, c.z],
            radius: 2.4,
            action: { type: 'panel', panel: meta.panel } as Hotspot['action'],
        };
    }),
    (() => {
        const c = destCenter(DESTINATIONS.find((d) => d.id === 'cinema')!);
        return {
            id: 'cineworks' as const,
            label: 'Cineworks table',
            hint: 'The catalog · posters',
            level: 'main' as const,
            position: [c.x + 4.2, 1.15, c.z - 2.4] as [number, number, number],
            radius: 1.8,
            action: { type: 'panel' as const, panel: 'cineworks' as const },
        };
    })(),
];

export function hotspotWorldY(h: HomeHotspot): number {
    return MAIN_Y + h.position[1];
}

export function nearestHomeHotspot(x: number, z: number, _level?: Level): HomeHotspot | null {
    let best: HomeHotspot | null = null;
    let bestD = Infinity;
    for (const h of HOME_HOTSPOTS) {
        const d = Math.hypot(x - h.position[0], z - h.position[2]);
        if (d < h.radius && d < bestD) {
            bestD = d;
            best = h;
        }
    }
    return best;
}

/* ── Naming where you are ───────────────────────────────────── */

export type Place =
    | { kind: 'room'; id: string; name: string }
    | { kind: 'clearing'; name: string }
    | { kind: 'grove'; id: string; name: string; dist: number }
    | { kind: 'path'; name: string };

export function roomAt(x: number, z: number): Place {
    if (!isOutdoors(x, z)) {
        const a = alcoveAt(x, z, -0.2);
        if (a) return { kind: 'room', id: a.id, name: a.name };
        if (Math.hypot(x, z) < DAIS.rampR + 0.4) return { kind: 'room', id: 'source', name: 'The Source' };
        if (inDoorway(x, z)) return { kind: 'room', id: 'threshold', name: 'The Threshold' };
        return { kind: 'room', id: 'hall', name: 'The Sanctum' };
    }
    for (const d of DESTINATIONS) {
        const c = destCenter(d);
        const dist = Math.hypot(x - c.x, z - c.z);
        if (dist < d.r) return { kind: 'grove', id: d.id, name: d.name, dist };
    }
    if (Math.hypot(x, z) < CLEARING_R + 0.5) return { kind: 'clearing', name: 'The Shelf' };
    return { kind: 'path', name: 'A bridge' };
}

export function nearestGrove(x: number, z: number): { id: string; name: string; dist: number; dx: number; dz: number } | null {
    let best: { id: string; name: string; dist: number; dx: number; dz: number } | null = null;
    for (const d of DESTINATIONS) {
        const c = destCenter(d);
        const dx = c.x - x;
        const dz = c.z - z;
        const dist = Math.hypot(dx, dz);
        if (!best || dist < best.dist) best = { id: d.id, name: d.name, dist, dx, dz };
    }
    return best;
}

/* ── Sound zones ────────────────────────────────────────────── */

export type SoundZone = 'main' | 'library' | 'arcade' | 'os' | 'hearth' | 'studio' | 'soul' | 'living';

/** Which music bed belongs here */
export function zoneAt(x: number, z: number): SoundZone {
    if (!isOutdoors(x, z)) {
        const a = alcoveAt(x, z, -0.2);
        if (a?.id === 'library') return 'library';
        if (a?.id === 'arcade') return 'arcade';
        if (a?.id === 'terminal') return 'os';
        if (Math.hypot(x, z) < DAIS.rampR + 0.8) return 'hearth';
        return 'main';
    }
    const p = roomAt(x, z);
    if (p.kind === 'grove') {
        if (p.id === 'studio') return 'studio';
        if (p.id === 'soul_mirror') return 'soul';
        if (p.id === 'cinema') return 'living';
    }
    return 'main';
}

/** Where the looping ambiences sit */
export const AUDIO_ANCHORS = {
    /** the Source — crackle and hum */
    fire: { x: 0, z: 0, r: 4.2 },
    /** the terminal desk */
    pc: (() => {
        const w = solidWorld(solid('desk'));
        return { x: w.x, z: w.z, r: 3.2 };
    })(),
    /** the arcade cabinets */
    tv: (() => {
        const w = facetToWorld(alcove('arcade').facet, 0, 2.0);
        return { x: w.x, z: w.z, r: 3.4 };
    })(),
} as const;
