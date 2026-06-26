// ============================================================
//  EDEN CULTIVATION — "work it and keep it." (Gen 2:15)
//
//  A small planting / growth / harvest loop for the Eastern
//  Garden beds (and two in the Outer Grove). Plant a seed, let
//  the cool of the day pass over it, and harvest fruit that
//  heals or strengthens you for the trials ahead.
//
//  PURE DATA + PURE FUNCTIONS ONLY. Bed runtime (plantedAt,
//  spent) lives in session state; the only thing that persists
//  is the codex — an append-only edenKey('fruit', id) per fruit
//  kind ever harvested, in character.discovered[].
// ============================================================

import { tile, edenKey } from '@/lib/game/eden/atlas';
import type { EdenSeed, EdenFruit, EdenBed, EdenGrowthStage } from '@/lib/game/eden/types';

// ------------------------------------------------------------
//  SEEDS — five gifts of the garden. growSeconds varies so the
//  player learns to plant the slow, potent crops early and the
//  quick heals on the way to a fight.
// ------------------------------------------------------------
export const EDEN_SEEDS: EdenSeed[] = [
    {
        id: 'wheat',
        name: 'Grain of the Field',
        glyph: '🌱',
        growSeconds: 18,
        fruit: {
            id: 'wheat',
            name: 'Sheaf of Wheat',
            glyph: '🌾',
            heal: 12,
            line: 'Bread before you were hungry. The field gives quickly to the one who keeps it.',
        },
    },
    {
        id: 'grapevine',
        name: 'Slip of the Vine',
        glyph: '🌿',
        growSeconds: 24,
        fruit: {
            id: 'grape',
            name: 'Cluster of Grapes',
            glyph: '🍇',
            buff: { regen: 4, fights: 2 },
            line: 'The vine pours out gladness. What it gives, it gives slowly — and it does not run dry.',
        },
    },
    {
        id: 'fig',
        name: 'Cutting of the Fig',
        glyph: '🌱',
        growSeconds: 30,
        fruit: {
            id: 'fig',
            name: 'First Fig',
            glyph: '🍈',
            heal: 20,
            buff: { hp: 8, fights: 1 },
            line: 'The fig leaf knew you before you knew yourself. Its fruit covers and restores at once.',
        },
    },
    {
        id: 'olive',
        name: 'Shoot of the Olive',
        glyph: '🫛',
        growSeconds: 36,
        fruit: {
            id: 'olive',
            name: 'Branch of Olives',
            glyph: '🫒',
            buff: { damage: 6, hp: 6, fights: 2 },
            line: 'Oil for the lamp and oil for the wound. The olive takes its time and arms you twice.',
        },
    },
    {
        id: 'pomegranate',
        name: 'Seed of the Pomegranate',
        glyph: '🌰',
        growSeconds: 42,
        fruit: {
            id: 'pomegranate',
            name: 'Pomegranate of Many Seeds',
            glyph: '🍎',
            heal: 25,
            buff: { hp: 12, damage: 5, regen: 3, fights: 2 },
            line: 'A hundred chambers, a hundred mercies. The rarest crop heals deep and steels the hand.',
        },
    },
    // ---- Rare cuttings — sown only once the four rivers run again ----
    {
        id: 'myrtle',
        name: 'Cutting of the Myrtle',
        glyph: '🪴',
        growSeconds: 44,
        locked: 'rivers',
        fruit: {
            id: 'myrtle',
            name: 'Anointing Myrtle',
            glyph: '🍃',
            buff: { lifesteal: 0.18, fights: 2 },
            line: 'Oil for the wound that returns the blood to the heart. What you spend in the strike, the myrtle gives back.',
        },
    },
    {
        id: 'spikenard',
        name: 'Root of the Spikenard',
        glyph: '🌷',
        growSeconds: 48,
        locked: 'rivers',
        fruit: {
            id: 'spikenard',
            name: 'Keen Spikenard',
            glyph: '🌸',
            buff: { crit: 0.18, damage: 3, fights: 2 },
            line: 'A fragrance so pure it sharpens the eye. Now and then the hand finds the seam and the blow lands twice.',
        },
    },
];

// ------------------------------------------------------------
//  BEDS — 6 clustered in the Eastern Garden (SE, rect
//  [64,50,93,69]) plus 2 in the Outer Grove (SW, [2,50,31,69]).
//  Coordinates sit near region centres / the road grid so the
//  level layer snaps them to walkable soil cleanly.
// ------------------------------------------------------------
export const EDEN_BEDS: EdenBed[] = [
    // Eastern Garden cluster — two tidy rows of beds.
    { id: 'bed_eg_1', at: tile(70, 54), region: 'eastern_garden' },
    { id: 'bed_eg_2', at: tile(74, 54), region: 'eastern_garden' },
    { id: 'bed_eg_3', at: tile(78, 54), region: 'eastern_garden' },
    { id: 'bed_eg_4', at: tile(70, 58), region: 'eastern_garden' },
    { id: 'bed_eg_5', at: tile(74, 58), region: 'eastern_garden' },
    { id: 'bed_eg_6', at: tile(78, 58), region: 'eastern_garden' },
    // Outer Grove pair — quiet soil among the named creatures.
    { id: 'bed_og_1', at: tile(14, 58), region: 'outer_grove' },
    { id: 'bed_og_2', at: tile(18, 60), region: 'outer_grove' },
];

// ------------------------------------------------------------
//  FRUITS — derived from the seeds (single source of truth).
// ------------------------------------------------------------
export const EDEN_FRUITS: EdenFruit[] = EDEN_SEEDS.map((s) => s.fruit);
export const EDEN_FRUIT_COUNT = EDEN_FRUITS.length;

// ------------------------------------------------------------
//  LOOKUPS
// ------------------------------------------------------------
const SEED_BY_ID: Record<string, EdenSeed> =
    Object.fromEntries(EDEN_SEEDS.map((s) => [s.id, s]));
const BED_BY_ID: Record<string, EdenBed> =
    Object.fromEntries(EDEN_BEDS.map((b) => [b.id, b]));
const FRUIT_BY_ID: Record<string, EdenFruit> =
    Object.fromEntries(EDEN_FRUITS.map((f) => [f.id, f]));

export function seedById(id: string): EdenSeed | undefined {
    return SEED_BY_ID[id];
}
export function bedById(id: string): EdenBed | undefined {
    return BED_BY_ID[id];
}
export function fruitById(id: string): EdenFruit | undefined {
    return FRUIT_BY_ID[id];
}

// ------------------------------------------------------------
//  GROWTH — pure, time-driven. Caller owns the 'empty' case
//  (a bed with no seed); this reports sprout/growing/ripe for a
//  planted seed given how long it has been in the ground.
// ------------------------------------------------------------

/** 0..1 ripeness, clamped. */
export function growthProgress(seed: EdenSeed, elapsedMs: number): number {
    const total = seed.growSeconds * 1000;
    if (total <= 0) return 1;
    const p = elapsedMs / total;
    return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** sprout (<33%) · growing (<100%) · ripe (>=100%). */
export function growthStage(seed: EdenSeed, elapsedMs: number): EdenGrowthStage {
    const p = growthProgress(seed, elapsedMs);
    if (p >= 1) return 'ripe';
    if (p < 0.33) return 'sprout';
    return 'growing';
}

// ------------------------------------------------------------
//  HARVEST CODEX — the only persisted facet. One append-only
//  key per fruit kind ever gathered.
// ------------------------------------------------------------

/** The discovered[] key marking a fruit kind as harvested. */
export function harvestFruitKey(fruitId: string): string {
    return edenKey('fruit', fruitId);
}

/** Has this fruit kind been harvested at least once? */
export function fruitHarvested(fruitId: string, discovered: string[]): boolean {
    return discovered.includes(harvestFruitKey(fruitId));
}

/** All fruit ids ever harvested (codex order = EDEN_FRUITS order). */
export function harvestedFruitIds(discovered: string[]): string[] {
    return EDEN_FRUITS.filter((f) => fruitHarvested(f.id, discovered)).map((f) => f.id);
}
