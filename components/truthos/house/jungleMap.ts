/**
 * The jungle worldplan — a hub of clearings joined by paths.
 *
 * The Hut stops being the whole world here: its leading stations move out
 * to DESTINATIONS, each a clearing of its own at the end of a corridor.
 * One description still drives everything — wall rings, undergrowth,
 * dirt strips, colliders, the wayfinder map, and the hotspot positions
 * all read these tables, so the world cannot disagree with itself.
 */

export type Box = { x: number; z: number; hx: number; hz: number };

/** Radius of the open ground around the safe house */
export const CLEARING_R = 32;

export type Destination = {
    id: 'cinema' | 'hall' | 'soul_mirror' | 'studio';
    name: string;
    blurb: string;
    /** Bearing from the house, radians (0 = +x/east, ccw) */
    angle: number;
    /** Distance of the clearing's CENTRE from the origin */
    dist: number;
    /** Clearing radius */
    r: number;
};

/**
 * Where the Hut's stations now live in the world. Bearings avoid the
 * north path (π/2), which stays a scenic walk for now.
 */
export const DESTINATIONS: Destination[] = [
    { id: 'cinema', name: 'The Cinema Grove', blurb: 'Films under the canopy', angle: 0.1, dist: 72, r: 15 },
    { id: 'hall', name: 'The Hall Stones', blurb: 'The community circle', angle: Math.PI - 0.12, dist: 70, r: 14 },
    { id: 'soul_mirror', name: 'The Mirror Pool', blurb: 'Shape your vessel', angle: -Math.PI / 3.1, dist: 64, r: 12 },
    { id: 'studio', name: 'The Signal Studio', blurb: 'Broadcast from the wild', angle: Math.PI + 0.72, dist: 66, r: 13 },
];

export function destCenter(d: Destination): { x: number; z: number } {
    return { x: Math.cos(d.angle) * d.dist, z: Math.sin(d.angle) * d.dist };
}

export type Corridor = {
    ax: number;
    az: number;
    bx: number;
    bz: number;
    halfWidth: number;
    /** A corridor that goes nowhere (yet) gets a jungle cap at its end */
    deadEnd?: boolean;
};

/** The north walk (dead end, for now) + one corridor per destination. */
export const CORRIDORS: Corridor[] = [
    { ax: 0, az: 16, bx: 0, bz: 46, halfWidth: 2.2, deadEnd: true },
    ...DESTINATIONS.map((d) => {
        const c = destCenter(d);
        const ux = Math.cos(d.angle);
        const uz = Math.sin(d.angle);
        return {
            // From just inside the home clearing to just inside the destination
            ax: ux * (CLEARING_R - 4),
            az: uz * (CLEARING_R - 4),
            bx: c.x - ux * (d.r - 4),
            bz: c.z - uz * (d.r - 4),
            halfWidth: 2.4,
        };
    }),
];

/** Player roam box — a backstop; the collider web is the real fence */
export const JUNGLE_BOUNDS = {
    minX: -92,
    maxX: 92,
    minZ: -92,
    maxZ: 92,
} as const;

/** Distance from a point to a corridor's centreline segment */
export function corridorDistance(x: number, z: number, c: Corridor): number {
    const dx = c.bx - c.ax;
    const dz = c.bz - c.az;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / len2));
    return Math.hypot(x - (c.ax + dx * t), z - (c.az + dz * t));
}

export function inCorridor(x: number, z: number, margin = 0): boolean {
    return CORRIDORS.some((c) => corridorDistance(x, z, c) < c.halfWidth + margin);
}

export function inDestination(x: number, z: number, margin = 0): boolean {
    return DESTINATIONS.some((d) => {
        const c = destCenter(d);
        return Math.hypot(x - c.x, z - c.z) < d.r + margin;
    });
}

/** Anywhere the ground must stay open — clearings and paths */
export function inOpenGround(x: number, z: number, margin = 0): boolean {
    if (Math.hypot(x, z) < CLEARING_R + margin) return true;
    return inCorridor(x, z, margin) || inDestination(x, z, margin);
}

/**
 * The collider web: a ring around every clearing (gaps where corridors
 * pierce them), rails along every corridor (skipped inside open ground),
 * caps on dead ends. All derived; nothing hand-placed.
 */
export const JUNGLE_COLLIDERS: Box[] = (() => {
    const out: Box[] = [];

    const ring = (cx: number, cz: number, r: number, segments: number) => {
        for (let i = 0; i < segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            const x = cx + Math.cos(a) * r;
            const z = cz + Math.sin(a) * r;
            if (inCorridor(x, z, 3.0)) continue;
            out.push({ x, z, hx: 3.2, hz: 3.2 });
        }
    };

    ring(0, 0, CLEARING_R, 40);
    for (const d of DESTINATIONS) {
        const c = destCenter(d);
        ring(c.x, c.z, d.r, 22);
    }

    for (const c of CORRIDORS) {
        const dx = c.bx - c.ax;
        const dz = c.bz - c.az;
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        const steps = Math.ceil(len / 3.4);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = c.ax + dx * t;
            const pz = c.az + dz * t;
            for (const s of [1, -1]) {
                const rx = px + nx * s * (c.halfWidth + 2.2);
                const rz = pz + nz * s * (c.halfWidth + 2.2);
                // Rails must not wall off the clearings the corridor joins
                if (Math.hypot(rx, rz) < CLEARING_R - 1) continue;
                if (inDestination(rx, rz, -1)) continue;
                out.push({ x: rx, z: rz, hx: 2.1, hz: 2.1 });
            }
        }
        if (c.deadEnd) {
            out.push({ x: c.bx + (dx / len) * 1.8, z: c.bz + (dz / len) * 1.8, hx: c.halfWidth + 4.5, hz: 2 });
        }
    }
    return out;
})();
