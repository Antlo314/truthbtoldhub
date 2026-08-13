/**
 * The Safe House — one storey.
 *
 * The second floor was the stair ghosts, the overlapping ceilings, and
 * half the draw cost. Everything that lived upstairs now lives on this
 * plate. S is 2.2 so the ground floor is a tad larger than the old main.
 */
import type { Hotspot } from './houseMap';
import { DESTINATIONS, destCenter, JUNGLE_BOUNDS, JUNGLE_COLLIDERS } from './jungleMap';

const FT = 0.3048;
export const ft = (feet: number, inches = 0) => (feet + inches / 12) * FT;

export const S = 2.2;
export const u = (n: number) => n * S;
const DOOR = 1.45;

export const HOME_W = u(ft(44, 7));
export const HOME_D = u(ft(50, 2));

export const SHELL = {
    minX: -HOME_W / 2,
    maxX: HOME_W / 2,
    minZ: -HOME_D / 2,
    maxZ: HOME_D / 2,
    t: 0.24,
} as const;

export const STOREY = ft(10);
export const MAIN_Y = 0;
/** Kept so leftover callers compile — there is no upper storey. */
export const UPPER_Y = MAIN_Y;
export const ROOF_Y = STOREY + 0.28;

export const EYE_HEIGHT = 1.62;
export const SIT_HEIGHT = 1.12;
export const PLAYER_R = 0.34;

export type Level = 'main' | 'upper';

export type Room = {
    id: string;
    name: string;
    level: Level;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    solid?: boolean;
    open?: boolean;
};

const X0 = SHELL.minX;
const X1 = SHELL.maxX;
const Z0 = SHELL.minZ;
const Z1 = SHELL.maxZ;

const W_E = u(-2.55);
const E_W = u(1.7);

export const ROOMS: Room[] = [
    { id: 'rec', name: 'Rec Room', level: 'main', minX: X0, maxX: W_E, minZ: u(2.1), maxZ: Z1 },
    { id: 'foyer', name: 'Foyer', level: 'main', minX: W_E, maxX: E_W, minZ: u(2.1), maxZ: Z1 },
    { id: 'bath', name: 'Bath', level: 'main', minX: X0, maxX: W_E, minZ: u(0.5), maxZ: u(2.1) },
    { id: 'hall_m', name: 'Hall', level: 'main', minX: W_E, maxX: E_W, minZ: u(-4.2), maxZ: u(2.1) },
    { id: 'bed_w', name: 'The Mark', level: 'main', minX: X0, maxX: W_E, minZ: u(-4.2), maxZ: u(0.5) },
    { id: 'dining', name: 'Dining', level: 'main', minX: W_E, maxX: E_W, minZ: Z0, maxZ: u(-4.2) },
    { id: 'bed_n', name: 'Spare', level: 'main', minX: X0, maxX: W_E, minZ: Z0, maxZ: u(-4.2) },
    { id: 'living', name: 'Living', level: 'main', minX: E_W, maxX: X1, minZ: u(-1.2), maxZ: Z1 },
    { id: 'kitchen', name: 'Kitchen', level: 'main', minX: E_W, maxX: X1, minZ: Z0, maxZ: u(-1.2) },
];

export const roomsOn = (level: Level) => ROOMS.filter((r) => r.level === level);

/** Degenerate stubs — no stair, no void, no shaft. */
export const STAIR = {
    minX: 0,
    maxX: 0,
    zBottom: 0,
    zTop: 0,
    yBottom: 0,
    yTop: 0,
    treads: 0,
} as const;
export const VOID = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 } as const;
export const SHAFT = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 } as const;

export function onUpperFootprint(_x: number, _z: number): boolean {
    return false;
}

export function groundAt(_x: number, _z: number, _level: Level): number {
    return MAIN_Y;
}

export function levelAfter(_x: number, _z: number, _level: Level): Level {
    return 'main';
}

export type Collider = { x: number; z: number; hx: number; hz: number };

const seg = (x1: number, z1: number, x2: number, z2: number, t = SHELL.t): Collider => {
    const alongX = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
    const ext = t / 2;
    return {
        x: (x1 + x2) / 2,
        z: (z1 + z2) / 2,
        hx: alongX ? Math.abs(x2 - x1) / 2 + ext : t / 2,
        hz: alongX ? t / 2 : Math.abs(z2 - z1) / 2 + ext,
    };
};

export type Doorway = { x: number; z: number; w: number; axis: 'x' | 'z' };
export const DOORWAYS: Doorway[] = [];

function withDoor(
    x1: number, z1: number, x2: number, z2: number,
    gapC: number, gapW = DOOR, t = SHELL.t,
): Collider[] {
    const ext = t / 2;
    const horizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    if (horizontal) {
        DOORWAYS.push({ x: gapC, z: (z1 + z2) / 2, w: gapW, axis: 'x' });
        return [
            seg(x1, z1, gapC - gapW / 2 - ext, z2, t),
            seg(gapC + gapW / 2 + ext, z1, x2, z2, t),
        ].filter((c) => c.hx > t / 2 + 0.001 && Math.abs(x2 - x1) > 0.02);
    }
    DOORWAYS.push({ x: (x1 + x2) / 2, z: gapC, w: gapW, axis: 'z' });
    return [
        seg(x1, z1, x2, gapC - gapW / 2 - ext, t),
        seg(x1, gapC + gapW / 2 + ext, x2, z2, t),
    ].filter((c) => c.hz > t / 2 + 0.001 && Math.abs(z2 - z1) > 0.02);
}

export const STAIR_WALLS: Collider[] = [];

const SHELL_WALLS: Collider[] = [
    seg(X0, Z0, X1, Z0),
    seg(X0, Z0, X0, Z1),
    seg(X1, Z0, X1, Z1),
];

export const MAIN_COLLIDERS: Collider[] = [
    ...SHELL_WALLS,
    ...withDoor(X0, Z1, X1, Z1, u(-0.4), 1.8),
    ...withDoor(W_E, u(2.1), W_E, Z1, u(6.4), DOOR),
    ...withDoor(W_E, u(0.5), W_E, u(2.1), u(1.3), 1.25),
    ...withDoor(W_E, u(-4.2), W_E, u(0.5), u(-1.9), 1.7),
    ...withDoor(W_E, Z0, W_E, u(-4.2), u(-5.6), 1.3),
    ...withDoor(E_W, u(-1.2), E_W, Z1, u(3.4), 1.5),
    ...withDoor(E_W, Z0, E_W, u(-1.2), u(-3.4), 1.4),
    ...withDoor(X0, u(2.1), W_E, u(2.1), u(-5.4), 1.25),
    ...withDoor(X0, u(0.5), W_E, u(0.5), u(-5.4), 1.25),
    ...withDoor(X0, u(-4.2), W_E, u(-4.2), u(-5.4), 1.25),
    ...withDoor(W_E, u(-4.2), E_W, u(-4.2), u(-0.4), 1.45),
    ...withDoor(E_W, u(-1.2), X1, u(-1.2), u(4.6), 1.4),
    ...JUNGLE_COLLIDERS,
];

export const MAIN_DOORWAYS_END = DOORWAYS.length;
export const UPPER_COLLIDERS: Collider[] = [];

export const DESK = {
    x: u(-5.85),
    z: u(6.15),
    monitorY: 1.35,
} as const;

export const FURNITURE: (Collider & { level: Level; name: string })[] = [
    { name: 'desk', level: 'main', x: DESK.x, z: DESK.z, hx: 1.0, hz: 0.45 },
    { name: 'rec sofa', level: 'main', x: u(-4.1), z: u(7.15), hx: 1.2, hz: 0.48 },
    { name: 'rec coffee table', level: 'main', x: u(-4.1), z: u(6.5), hx: 0.52, hz: 0.32 },
    { name: 'floor lamp', level: 'main', x: u(-6.35), z: u(7.25), hx: 0.2, hz: 0.2 },
    { name: 'arcade cabinet', level: 'main', x: u(-3.05), z: u(7.15), hx: 0.4, hz: 0.34 },
    { name: 'rec plant', level: 'main', x: u(-6.45), z: u(3.1), hx: 0.28, hz: 0.28 },
    { name: 'daily word tray', level: 'main', x: u(1.15), z: u(6.9), hx: 0.38, hz: 0.3 },
    { name: 'mark bench', level: 'main', x: u(-3.05), z: u(-3.35), hx: 0.26, hz: 0.65 },
    { name: 'bath vanity', level: 'main', x: u(-6.15), z: u(1.3), hx: 0.8, hz: 0.38 },
    { name: 'spare bed', level: 'main', x: u(-5.7), z: u(-6.15), hx: 1.05, hz: 1.1 },
    { name: 'living sofa', level: 'main', x: u(5.4), z: u(2.4), hx: 1.7, hz: 0.55 },
    { name: 'living coffee table', level: 'main', x: u(5.4), z: u(0.85), hx: 0.62, hz: 0.38 },
    { name: 'accent chair', level: 'main', x: u(6.0), z: u(3.4), hx: 0.42, hz: 0.42 },
    { name: 'bookshelf wall', level: 'main', x: X1 - 0.52, z: u(2.1), hx: 0.32, hz: 2.4 },
    { name: 'media wall', level: 'main', x: X1 - 0.5, z: u(-0.2), hx: 0.32, hz: 0.72 },
    { name: 'island', level: 'main', x: u(5.2), z: u(-3.4), hx: 1.45, hz: 0.7 },
    { name: 'counter run', level: 'main', x: u(5.0), z: Z0 + 0.85, hx: 3.2, hz: 0.38 },
    { name: 'codex desk', level: 'main', x: u(3.5), z: u(-2.2), hx: 0.52, hz: 0.26 },
    { name: 'dining table', level: 'main', x: u(-0.3), z: u(-5.8), hx: 1.35, hz: 1.05 },
    { name: 'sideboard (Ledger)', level: 'main', x: u(-0.3), z: Z0 + 0.55, hx: 0.95, hz: 0.26 },
];

export type ArtSpec = {
    art: string;
    x: number;
    y: number;
    z: number;
    ry: number;
    w: number;
    h: number;
};

export const ART: ArtSpec[] = [
    { art: 'artDomain', x: W_E + 0.16, y: 1.7, z: u(8.6), ry: Math.PI / 2, w: 1.2, h: 1.0 },
    { art: 'artStillPoint', x: 0, y: 1.7, z: Z0 + 0.16, ry: 0, w: 1.7, h: 1.15 },
];

export const AISLES: (Collider & { level: Level; name: string })[] = [
    { name: 'rec to hall', level: 'main', x: u(-4.0), z: u(5.15), hx: 2.3, hz: 0.55 },
    { name: 'foyer throat', level: 'main', x: u(-0.4), z: u(7.4), hx: 0.7, hz: 1.9 },
    { name: 'hall spine', level: 'main', x: (W_E + E_W) / 2, z: u(-1.0), hx: 0.55, hz: 2.6 },
    { name: 'living pass', level: 'main', x: u(3.6), z: u(1.6), hx: 0.55, hz: 2.0 },
    { name: 'kitchen north', level: 'main', x: u(5.4), z: u(-1.85), hx: 2.4, hz: 0.55 },
    { name: 'dining east', level: 'main', x: u(1.0), z: u(-5.8), hx: 0.55, hz: 1.1 },
];

export function artFootprints(): (Collider & { name: string; level: Level })[] {
    return ART.map((a) => {
        const alongZ = Math.abs(Math.sin(a.ry)) > 0.5;
        const half = (a.w + 0.12) / 2;
        return {
            name: a.art,
            level: 'main' as Level,
            x: a.x,
            z: a.z,
            hx: alongZ ? 0.05 : half,
            hz: alongZ ? half : 0.05,
        };
    });
}

export type DoorLeaf = {
    name: string;
    level: Level;
    x: number;
    z: number;
    w: number;
    t: number;
    axis: 'x' | 'z';
    dir: 1 | -1;
    swing: number;
};

export const DOOR_LEAVES: DoorLeaf[] = [
    { name: 'front door (west leaf)', level: 'main', x: u(-0.4) - 0.9, z: Z1, w: 0.86, t: 0.06, axis: 'x', dir: 1, swing: 1.22 },
    { name: 'front door (east leaf)', level: 'main', x: u(-0.4) + 0.9, z: Z1, w: 0.86, t: 0.06, axis: 'x', dir: -1, swing: 1.22 },
];

export function leafCollider(d: DoorLeaf): Collider & { level: Level; name: string } {
    const along = Math.cos(d.swing) * d.w;
    const into = Math.sin(d.swing) * d.w;
    const cx = d.axis === 'x' ? d.x + (along / 2) * d.dir : d.x - into / 2;
    const cz = d.axis === 'x' ? d.z - into / 2 : d.z + (along / 2) * d.dir;
    return {
        name: d.name,
        level: d.level,
        x: cx,
        z: cz,
        hx: d.axis === 'x' ? Math.max(d.t, Math.abs(along)) / 2 : Math.max(d.t, into) / 2,
        hz: d.axis === 'x' ? Math.max(d.t, into) / 2 : Math.max(d.t, Math.abs(along)) / 2,
    };
}

export function collidersFor(level: Level): Collider[] {
    return [
        ...MAIN_COLLIDERS,
        ...FURNITURE.filter((f) => f.level === level || f.level === 'main'),
        ...DOOR_LEAVES.map(leafCollider),
    ];
}

function hits(x: number, z: number, cs: Collider[], r: number): boolean {
    for (const c of cs) {
        if (x > c.x - c.hx - r && x < c.x + c.hx + r && z > c.z - c.hz - r && z < c.z + c.hz + r) {
            return true;
        }
    }
    return false;
}

export function moveOn(
    level: Level,
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    r = PLAYER_R,
): { x: number; z: number } {
    const cs = collidersFor(level);
    let x = toX;
    let z = toZ;
    if (hits(x, z, cs, r)) {
        if (!hits(toX, fromZ, cs, r)) { x = toX; z = fromZ; }
        else if (!hits(fromX, toZ, cs, r)) { x = fromX; z = toZ; }
        else { x = fromX; z = fromZ; }
    }
    x = Math.max(JUNGLE_BOUNDS.minX, Math.min(JUNGLE_BOUNDS.maxX, x));
    z = Math.max(JUNGLE_BOUNDS.minZ, Math.min(JUNGLE_BOUNDS.maxZ, z));
    return { x, z };
}

export const INTRO = {
    seat: { x: u(-5.85), z: u(5.0) },
    lookYaw: Math.PI,
    stand: { x: u(-5.85), z: u(4.5) },
    holdS: 1.1,
    riseS: 1.6,
} as const;

export const SPAWN: [number, number, number] = [INTRO.stand.x, EYE_HEIGHT, INTRO.stand.z];
export const SPAWN_YAW = INTRO.lookYaw;
export const FRONT_DOOR = { x: u(-0.4), z: Z1 };
export const GARAGE_DOOR = { x: u(5.2), z: Z1 };

export type HomeHotspot = Hotspot & { level: Level };

const DEST_PANEL: Record<string, { label: string; hint: string; panel: string }> = {
    cinema: { label: 'The Cinema Grove', hint: 'Films under the canopy', panel: 'cinema' },
    hall: { label: 'The Hall Stones', hint: 'The community circle', panel: 'hall' },
    soul_mirror: { label: 'The Mirror Pool', hint: 'Shape your vessel', panel: 'soul' },
    studio: { label: 'The Signal Studio', hint: 'Broadcast from the wild', panel: 'studio' },
};

export const HOME_HOTSPOTS: HomeHotspot[] = [
    { id: 'computer', label: 'Truth.OS', hint: 'Sit back down at the terminal', level: 'main', position: [DESK.x, 1.2, u(5.55)], radius: 1.6, action: { type: 'os' } },
    { id: 'arcade', label: 'Arcade', hint: 'Rec room · play', level: 'main', position: [u(-4.1), 1.1, u(7.15)], radius: 1.5, action: { type: 'panel', panel: 'arcade' } },
    { id: 'envelope', label: 'The Daily Word', hint: "This morning's paper", level: 'main', position: [u(1.15), 1.1, u(6.9)], radius: 1.3, action: { type: 'panel', panel: 'news' } },
    { id: 'mailbox', label: 'Offering', hint: 'Keep the house open', level: 'main', position: [u(1.2), 1.1, Z1 + 1.7], radius: 1.5, action: { type: 'panel', panel: 'offering' } },
    { id: 'wall', label: 'West plaster', hint: 'Choose a section · leave a mark', level: 'main', position: [X0 + 0.85, 1.2, (u(-4.2) + u(0.5)) / 2], radius: 1.15, action: { type: 'panel', panel: 'wall' } },
    { id: 'wall', label: 'South plaster', hint: 'Choose a section · leave a mark', level: 'main', position: [(X0 + W_E) / 2, 1.2, u(-4.2) + 0.85], radius: 1.15, action: { type: 'panel', panel: 'wall' } },
    { id: 'wall', label: 'North plaster', hint: 'Choose a section · leave a mark', level: 'main', position: [X0 + 2.2, 1.2, u(0.5) - 0.85], radius: 1.05, action: { type: 'panel', panel: 'wall' } },
    { id: 'library', label: 'Library', hint: 'Take one down', level: 'main', position: [X1 - 0.7, 1.3, u(2.1)], radius: 1.7, action: { type: 'panel', panel: 'library' } },
    { id: 'ledger', label: 'The Ledger', hint: 'The record · the Word', level: 'main', position: [u(-0.3), 1.1, Z0 + 0.7], radius: 1.35, action: { type: 'panel', panel: 'ledger' } },
    { id: 'fireplace', label: 'Fire', hint: 'Sit by the hearth', level: 'main', position: [X1 - 0.7, 1.2, u(-0.2)], radius: 1.15, action: { type: 'sit' } },
    { id: 'codex', label: 'Codex', hint: 'Memory and whispers', level: 'main', position: [u(3.5), 1.1, u(-2.2)], radius: 1.5, action: { type: 'panel', panel: 'codex' } },
    { id: 'wayfinder', label: 'Paths', hint: 'The map of this floor and the groves', level: 'main', position: [E_W - 0.25, 1.3, u(0.15)], radius: 1.15, action: { type: 'panel', panel: 'wayfinder' } },
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

export function nearestHomeHotspot(x: number, z: number, _level: Level): HomeHotspot | null {
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

export function isOutdoors(x: number, z: number): boolean {
    return x < X0 || x > X1 || z < Z0 || z > Z1;
}

export type Place =
    | { kind: 'room'; id: string; name: string }
    | { kind: 'clearing'; name: string }
    | { kind: 'grove'; id: string; name: string; dist: number }
    | { kind: 'path'; name: string };

export function roomAt(x: number, z: number): Place {
    if (!isOutdoors(x, z)) {
        for (const r of ROOMS) {
            if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
                return { kind: 'room', id: r.id, name: r.name };
            }
        }
        return { kind: 'room', id: 'house', name: 'House' };
    }
    for (const d of DESTINATIONS) {
        const c = destCenter(d);
        const dist = Math.hypot(x - c.x, z - c.z);
        if (dist < d.r) return { kind: 'grove', id: d.id, name: d.name, dist };
    }
    if (Math.hypot(x, z) < 32) return { kind: 'clearing', name: 'Clearing' };
    return { kind: 'path', name: 'Path' };
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

/** True if a saved pose is still walkable. */
export function poseClear(x: number, z: number): boolean {
    if (x < JUNGLE_BOUNDS.minX + 1 || x > JUNGLE_BOUNDS.maxX - 1) return false;
    if (z < JUNGLE_BOUNDS.minZ + 1 || z > JUNGLE_BOUNDS.maxZ - 1) return false;
    return !hits(x, z, collidersFor('main'), PLAYER_R);
}

/** Just inside the front door, facing the hall. */
export const RECENTER = { x: FRONT_DOOR.x, z: Z1 - 1.35, yaw: 0 } as const;

export const HALL_SPINE = { x: (W_E + E_W) / 2, z: u(-1.0) } as const;
