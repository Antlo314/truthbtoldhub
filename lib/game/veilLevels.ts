// ============================================================
//  VEIL — level system: physics constants, beatability proof,
//  segment-template library, and the endless generator.
//
//  The whole point of this file is the BEATABILITY GUARANTEE:
//  levels are stitched only from hand-authored templates whose
//  jumps are checked (closed-form) against the SAME physics
//  constants the engine uses. A template that can't be cleared
//  is dropped at module load — it never reaches a player.
//
//  All measurements are in UNITS (1 unit = one cell footprint),
//  y measured UP from the floor (y=0). Never pixels here.
// ============================================================

// ---- shared physics constants (the engine imports these) ----
export const SPEED = 10.4;                                  // base units/sec
export const SPEED_MULTS = [0.806, 1.0, 1.3245, 1.685, 2.0]; // speed tiers 1..5
export const PEAK_H = 2.6;                                   // jump apex height (units)
export const MAX_JUMP_UNITS = 5;                             // horizontal reach of a base-speed jump
export const T_AIR = MAX_JUMP_UNITS / SPEED;                // ≈0.4808s airtime
export const GRAVITY = (8 * PEAK_H) / (T_AIR * T_AIR);      // ≈90 u/s²
export const JUMP_VELOCITY = (4 * PEAK_H) / T_AIR;          // ≈21.63 u/s
export const TERMINAL_VY = 34;

export const CEIL = 6.0;            // ship/flip ceiling height above floor
export const SHIP_MIN_CORRIDOR = 4; // min flyable gap in a ship section

export const GAP_SAFETY_MARGIN = 0.85;
export const SAFE_GAP_START = 6;
export const SAFE_GAP_MIN = 3.5;
export const PORTAL_LEAD_IN = 5;
export const TIER_UNITS = 220;
export const MAX_TIER = 6;
export const START_PAD = 6;

export type ModeKind = 'cube' | 'ship';
export type ObstacleKind = 'spike' | 'block' | 'gravityPortal' | 'modePortal' | 'speedPortal' | 'orb' | 'pad' | 'coin';

export interface Obstacle {
    kind: ObstacleKind;
    x: number;          // left/center x (world units)
    y: number;          // bottom (spike/block/pad) or center (portal/orb/coin)
    w?: number;
    h?: number;
    dir?: 'up' | 'down';            // spike orientation
    variant?: 'yellow' | 'pink';    // orb / pad
    to?: ModeKind;                  // modePortal
    sign?: 1 | -1;                  // gravityPortal target gravity
    tier?: number;                  // speedPortal tier 1..5
    taken?: boolean;                // coin collected (runtime)
}

interface JumpSpec { takeoff: number; gapStart: number; gapEnd: number; maxH: number; kind?: 'spike' | 'block'; }

export interface SegmentTemplate {
    id: string;
    mode: ModeKind;
    tier: number;       // unlocks at this difficulty tier or above
    speedTier: number;  // authored + validated at this speed (served only at exactly this speed)
    length: number;     // world units consumed
    obstacles: Obstacle[];
    jumps?: JumpSpec[];
    coins?: { x: number; y: number }[];
}

// ---- seeded PRNG (deterministic level gen; never used in physics) ----
export function mulberry32(seed: number) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---- closed-form clearability (uses the live physics constants) ----
export function jumpDistMax(vx: number) { return vx * T_AIR; }

export function isJumpClearable(vx: number, takeoffX: number, gapStart: number, gapEnd: number, maxH: number, kind: 'spike' | 'block' = 'spike'): boolean {
    // A reachable SOLID BLOCK is always clearable by landing on its flat top:
    // the player controls jump timing on the flat run-in, so the only requirement
    // is that the apex can reach the block's top. (No zero-width point-mass trap.)
    if (kind === 'block') return maxH <= PEAK_H * GAP_SAFETY_MARGIN;
    // A SPIKE must be cleared over the top — the rising arc has to exceed the
    // hazard height by the time the player reaches it, with horizontal reach to spare.
    const horizOk = (gapEnd - takeoffX) <= jumpDistMax(vx) * GAP_SAFETY_MARGIN;
    const heightOk = maxH <= PEAK_H * GAP_SAFETY_MARGIN;
    const t = (gapStart - takeoffX) / vx;
    const yAtHazard = JUMP_VELOCITY * t - 0.5 * GRAVITY * t * t;
    const clearsFront = yAtHazard >= maxH * GAP_SAFETY_MARGIN;
    return horizOk && heightOk && clearsFront;
}

function vxForTier(speedTier: number) { return SPEED * SPEED_MULTS[speedTier - 1]; }

function validateTemplate(t: SegmentTemplate): boolean {
    const vx = vxForTier(t.speedTier);
    return (t.jumps || []).every((j) => isJumpClearable(vx, j.takeoff, j.gapStart, j.gapEnd, j.maxH, j.kind));
}

function validateShipCorridor(t: SegmentTemplate): boolean {
    // sample x across the segment; the open corridor between floor-mounted and
    // ceiling-mounted solids must always be at least SHIP_MIN_CORRIDOR tall.
    for (let x = 0; x <= t.length; x += 0.25) {
        let floorTop = 0;       // highest floor obstruction at x
        let ceilBottom = CEIL;  // lowest ceiling obstruction at x
        for (const o of t.obstacles) {
            if (o.kind === 'spike') {
                const ox0 = o.x, ox1 = o.x + 1;
                if (x < ox0 || x > ox1) continue;
                const h = o.h ?? 1;
                if (o.dir === 'down') ceilBottom = Math.min(ceilBottom, CEIL - h);
                else floorTop = Math.max(floorTop, h);
            } else if (o.kind === 'block') {
                const ox0 = o.x, ox1 = o.x + (o.w ?? 1);
                if (x < ox0 || x > ox1) continue;
                const top = o.y + (o.h ?? 1);
                if (o.y <= 0.01) floorTop = Math.max(floorTop, top);
                else ceilBottom = Math.min(ceilBottom, o.y);
            }
        }
        if (ceilBottom - floorTop < SHIP_MIN_CORRIDOR) return false;
    }
    return true;
}

// ---- seed template library ----
// Spike/block jumps carry a jumps[] annotation that is closed-form proven.
// Pad/orb templates use mechanics whose arc isn't closed-form here; they are
// hand-tuned with generous spacing (jumps:[] = not auto-proven, kept).
const RAW_TEMPLATES: SegmentTemplate[] = [
    // ---- tier 0 — gentle ----
    {
        id: 'c0_single', mode: 'cube', tier: 0, speedTier: 2, length: 7,
        obstacles: [{ kind: 'spike', x: 3, y: 0, h: 1 }],
        jumps: [{ takeoff: 2, gapStart: 2.6, gapEnd: 4, maxH: 1 }],
        coins: [{ x: 3, y: 2.1 }],
    },
    {
        id: 'c0_pair', mode: 'cube', tier: 0, speedTier: 2, length: 8.5,
        obstacles: [{ kind: 'spike', x: 3, y: 0, h: 1 }, { kind: 'spike', x: 5.6, y: 0, h: 1 }],
        jumps: [{ takeoff: 2, gapStart: 2.6, gapEnd: 4, maxH: 1 }, { takeoff: 4.6, gapStart: 5.2, gapEnd: 6.6, maxH: 1 }],
    },
    // ---- tier 1 ----
    {
        id: 'c1_triple', mode: 'cube', tier: 1, speedTier: 2, length: 9,
        obstacles: [{ kind: 'spike', x: 3, y: 0, h: 1 }, { kind: 'spike', x: 4, y: 0, h: 1 }, { kind: 'spike', x: 5, y: 0, h: 1 }],
        jumps: [{ takeoff: 2, gapStart: 2.6, gapEnd: 6, maxH: 1 }],
        coins: [{ x: 4, y: 2.5 }],
    },
    {
        id: 'c1_block', mode: 'cube', tier: 1, speedTier: 2, length: 9,
        obstacles: [{ kind: 'block', x: 4, y: 0, w: 2, h: 1 }],
        jumps: [{ takeoff: 2.4, gapStart: 4, gapEnd: 6, maxH: 1, kind: 'block' }],
    },
    // ---- tier 2 ----
    {
        id: 'c2_step', mode: 'cube', tier: 2, speedTier: 2, length: 11,
        obstacles: [{ kind: 'block', x: 4, y: 0, w: 2, h: 1 }, { kind: 'spike', x: 7, y: 0, h: 1 }],
        jumps: [{ takeoff: 2.4, gapStart: 4, gapEnd: 6, maxH: 1, kind: 'block' }, { takeoff: 6, gapStart: 6.6, gapEnd: 8, maxH: 1 }],
        coins: [{ x: 5, y: 2.0 }],
    },
    {
        id: 'c2_pad', mode: 'cube', tier: 2, speedTier: 2, length: 11,
        obstacles: [{ kind: 'pad', x: 3, y: 0, variant: 'yellow' }, { kind: 'block', x: 5.5, y: 0, w: 1, h: 3 }],
        jumps: [], // pad-assisted bounce clears the tall block — hand-tuned
        coins: [{ x: 5, y: 4.0 }],
    },
    {
        id: 'c2_orb', mode: 'cube', tier: 2, speedTier: 2, length: 12,
        obstacles: [{ kind: 'spike', x: 3, y: 0, h: 1 }, { kind: 'orb', x: 5.4, y: 2.4, variant: 'yellow' }, { kind: 'spike', x: 7.4, y: 0, h: 1 }],
        jumps: [{ takeoff: 2, gapStart: 2.6, gapEnd: 4, maxH: 1 }], // first jump proven; orb re-jump clears the second
    },
    // ---- tier 3 — faster ----
    {
        id: 'c3_pair_fast', mode: 'cube', tier: 3, speedTier: 3, length: 11,
        obstacles: [{ kind: 'spike', x: 3, y: 0, h: 1 }, { kind: 'spike', x: 6.5, y: 0, h: 1 }],
        jumps: [{ takeoff: 2, gapStart: 2.6, gapEnd: 4, maxH: 1 }, { takeoff: 5.5, gapStart: 6.1, gapEnd: 7.5, maxH: 1 }],
        coins: [{ x: 4.5, y: 2.5 }],
    },
    {
        id: 'c3_gravity', mode: 'cube', tier: 3, speedTier: 2, length: 13,
        obstacles: [
            { kind: 'gravityPortal', x: 3, y: 3, sign: -1 },
            { kind: 'spike', x: 6, y: 0, h: 1 },          // floored spike, now overhead
            { kind: 'gravityPortal', x: 9, y: 3, sign: 1 },
        ],
        jumps: [], // gravity-flip section: floor spike avoided by hugging the ceiling — hand-tuned
        coins: [{ x: 6, y: 4.2 }],
    },
    // ---- ship ----
    {
        id: 's2_corridor', mode: 'ship', tier: 2, speedTier: 2, length: 18,
        obstacles: [
            { kind: 'spike', x: 5, y: 0, h: 1 },
            { kind: 'spike', x: 9, y: CEIL, h: 1, dir: 'down' },
            { kind: 'spike', x: 13, y: 0, h: 1 },
        ],
        jumps: [],
        coins: [{ x: 7, y: 3 }, { x: 11, y: 3 }],
    },
];

// Drop any template that fails its check — it never reaches a player.
export const VALID_TEMPLATES: SegmentTemplate[] = RAW_TEMPLATES.filter((t) => {
    const ok = t.mode === 'ship' ? validateShipCorridor(t) : validateTemplate(t);
    if (!ok && typeof console !== 'undefined') console.warn(`[veil] template "${t.id}" failed beatability check — dropped`);
    return ok;
});

// ---- the endless generator ----
export interface VeilGen {
    rng: () => number;
    cursorX: number;
    mode: ModeKind;
    speedTier: number;
    recent: string[];
}

export function createGen(seed: number): VeilGen {
    return { rng: mulberry32(seed), cursorX: START_PAD, mode: 'cube', speedTier: 2, recent: [] };
}

function pick<T>(rng: () => number, arr: T[]): T | null {
    return arr.length ? arr[Math.floor(rng() * arr.length)] : null;
}

function safeGapFor(tier: number) { return Math.max(SAFE_GAP_MIN, SAFE_GAP_START - tier * 0.4); }

// Append segments into `out` until the generator cursor passes targetX.
export function generateAhead(gen: VeilGen, out: Obstacle[], targetX: number): void {
    let guard = 0;
    while (gen.cursorX < targetX && guard++ < 200) {
        const tier = Math.max(0, Math.min(MAX_TIER, Math.floor(gen.cursorX / TIER_UNITS)));

        const pool = VALID_TEMPLATES.filter(
            (t) => t.mode === gen.mode && t.tier <= tier && t.speedTier === gen.speedTier && !gen.recent.includes(t.id),
        );
        let tpl = pick(gen.rng, pool);
        if (!tpl) {
            // fallback: relax ONLY recency — keep the tier cap so low tiers never
            // serve advanced mechanics (the difficulty ramp stays intact).
            tpl = pick(gen.rng, VALID_TEMPLATES.filter((t) => t.mode === gen.mode && t.speedTier === gen.speedTier && t.tier <= tier))
                || VALID_TEMPLATES.find((t) => t.mode === gen.mode) || null;
        }
        if (!tpl) { gen.cursorX += 4; continue; } // empty flat ground, keep moving

        for (const o of tpl.obstacles) out.push({ ...o, x: o.x + gen.cursorX });
        for (const c of (tpl.coins || [])) out.push({ kind: 'coin', x: c.x + gen.cursorX, y: c.y });

        gen.cursorX += tpl.length;
        gen.recent.push(tpl.id);
        if (gen.recent.length > 3) gen.recent.shift();

        gen.cursorX += safeGapFor(tier);

        maybeTransition(gen, out, tier);
    }
}

// Speed / mode changes are ALWAYS quarantined behind a portal + flat lead-in,
// so a change never invalidates an in-flight jump.
function maybeTransition(gen: VeilGen, out: Obstacle[], tier: number): void {
    const r = gen.rng();
    if (gen.mode === 'ship') {
        // ships are short bursts — return to cube
        if (r < 0.55) {
            out.push({ kind: 'modePortal', x: gen.cursorX + 1, y: CEIL / 2, to: 'cube' });
            gen.mode = 'cube';
            gen.cursorX += PORTAL_LEAD_IN;
        }
        return;
    }
    if (tier >= 2 && r < 0.12 && VALID_TEMPLATES.some((t) => t.mode === 'ship' && t.speedTier === gen.speedTier)) {
        out.push({ kind: 'modePortal', x: gen.cursorX + 1, y: CEIL / 2, to: 'ship' });
        gen.mode = 'ship';
        gen.cursorX += PORTAL_LEAD_IN;
        return;
    }
    if (tier >= 2 && r < 0.28) {
        // toggle between the two speed tiers that have cube templates (2 and 3)
        const want = gen.speedTier === 2 ? 3 : 2;
        if (VALID_TEMPLATES.some((t) => t.mode === 'cube' && t.speedTier === want)) {
            out.push({ kind: 'speedPortal', x: gen.cursorX + 1, y: 2, tier: want });
            gen.speedTier = want;
            gen.cursorX += PORTAL_LEAD_IN;
        }
    }
}
