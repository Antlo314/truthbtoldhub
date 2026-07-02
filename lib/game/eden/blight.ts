// ============================================================
//  EDEN BLIGHT — "Restore the Garden."
//
//  A shadow lies over every wing of the garden until the work
//  that wing was given is done. NOTHING here persists on its
//  own: every region's cleansed state is DERIVED from progress
//  that already lives in character.discovered[] / inventory[]
//  (hydrated into EdenLevelState), so any mid-progress save
//  loads with exactly the right regions already breathing.
//
//  Pure data + pure functions only — no React, no DOM.
// ============================================================

import {
    EDEN_REGIONS, EDEN_RIVERS_V2, edenRegionAt,
    type EdenRegionId,
} from '@/lib/game/eden/atlas';
import type { EdenLevelState } from '@/lib/game/eden/types';

/** The only character facets the blight reads (structural — the full
 *  GameCharacter satisfies this, and sanity scripts can pass a stub). */
export interface EdenBlightCharacter {
    inventory: string[];
    cleared: string[];
}

const RELIC_ID = 'relic_eden_leaf';

/**
 * Is a region cleansed (the blight lifted)? One attainable trigger per
 * region, each bound to progress that ALREADY persists — reachable in
 * normal progression order:
 *
 *  · threshold      — always clean. The spawn/safe-haven; the Gardener
 *                     keeps this ground, so a fresh soul is never drained.
 *  · pishon         — the Pishon lit (riversLit has order 0). First river.
 *  · gihon          — the Gihon lit (order 1).
 *  · hiddekel       — the Hiddekel lit (order 2).
 *  · euphrates      — the Euphrates lit (order 3).
 *  · eastern_garden — ≥2 fruit kinds harvested (level.fruitsHarvested).
 *                     Beds + quick wheat/vine seeds are available from the
 *                     start, so this clears early with a little tending.
 *  · outer_grove    — ≥4 creatures named (level.named). Attainable without
 *                     the grove's own beasts: lamb (threshold, always clean)
 *                     + ram/ibex (pishon), heron/dove (gihon), ox/bee
 *                     (eastern) all wake as their regions cleanse first.
 *  · verge          — all four rivers lit. The verge holds "The Ordering of
 *                     Waters" — its shadow lifts when the ordering is whole
 *                     (same beat that opens the Cherub road), so it cleanses
 *                     mid-progression, right before the push north.
 *  · antechamber    — the Cherub felled (the one boss). The relic in the
 *                     inventory / dest_eden cleared also count, as older
 *                     saves may hold the Leaf without the fight key.
 */
export function edenRegionCleansed(
    regionId: EdenRegionId,
    level: EdenLevelState,
    character: EdenBlightCharacter,
): boolean {
    switch (regionId) {
        case 'threshold':
            return true;
        case 'pishon':
        case 'gihon':
        case 'hiddekel':
        case 'euphrates':
            return level.riversLit.includes(EDEN_RIVERS_V2[regionId].order);
        case 'eastern_garden':
            return level.fruitsHarvested.length >= 2;
        case 'outer_grove':
            return level.named.length >= 4;
        case 'verge':
            return level.riversLit.length >= 4;
        case 'antechamber':
            return (level.fights.find((f) => f.boss)?.cleared ?? false)
                || level.sanctumOpen
                || character.inventory.includes(RELIC_ID)
                || character.cleared.includes('dest_eden');
        default:
            return true;
    }
}

/** 0..100 — cleansed regions over all regions ("Garden Restored N%"). */
export function edenRestoredPct(level: EdenLevelState, character: EdenBlightCharacter): number {
    const done = EDEN_REGIONS.filter((r) => edenRegionCleansed(r.id, level, character)).length;
    return Math.round((done / EDEN_REGIONS.length) * 100);
}

/** Is this tile blighted (inside an uncleansed region)? Tiles outside any
 *  region (the border forest) are clean — the blight lives in the wings. */
export function edenBlightAt(
    gx: number, gy: number,
    level: EdenLevelState,
    character: EdenBlightCharacter,
): boolean {
    const reg = edenRegionAt(gx, gy);
    if (!reg) return false;
    return !edenRegionCleansed(reg.id, level, character);
}

/** Short per-region hint — what lifts this wing's shadow (UI copy). */
export const EDEN_BLIGHT_TRIGGER_LABELS: Record<EdenRegionId, string> = {
    threshold: 'a kept haven — the blight cannot enter',
    outer_grove: 'name four living creatures',
    eastern_garden: 'harvest two kinds of fruit',
    pishon: 'light the river Pishon',
    gihon: 'light the river Gihon',
    hiddekel: 'light the river Hiddekel',
    euphrates: 'light the river Euphrates',
    verge: 'light all four rivers',
    antechamber: 'fell the Cherub of the Flaming Sword',
};
