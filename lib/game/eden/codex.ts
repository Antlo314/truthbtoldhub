// ============================================================
//  EDEN CODEX — the "game within itself" dashboard model.
//
//  A pure aggregation over the hydrated level state plus the
//  character's discovered[]/inventory[] that powers the codex
//  panel. No React, no DOM, no deps — deterministic and total.
//
//  Every facet of the garden is summed into one EdenCodexSummary
//  (see types.ts): the four rivers, the bestiary, the harvest,
//  the inscriptions, the Serpent's long arc, and the one relic.
// ============================================================

import type { GameCharacter } from '@/lib/store/useGameStore';
import {
    EDEN_RIVER_ORDER,
    EDEN_RIVERS_V2,
    EDEN_REGIONS,
} from '@/lib/game/eden/atlas';
import { EDEN_CREATURES, EDEN_CREATURE_COUNT } from '@/lib/game/eden/bestiary';
import { EDEN_FRUITS, EDEN_FRUIT_COUNT } from '@/lib/game/eden/cultivation';
import { EDEN_SERPENT_BEATS, EDEN_SERPENT_BEAT_COUNT, wasUntempted } from '@/lib/game/eden/serpent';
import type { EdenLevelState } from '@/lib/game/edenLevel';
import type { EdenCodexSummary, EdenCodexLine } from '@/lib/game/eden/types';

/** The relic claimed at the Tree of Life. */
const RELIC_ID = 'relic_eden_leaf';

/**
 * Aggregate the whole garden into the codex dashboard shape.
 * Pure + deterministic: same (character, level) → same summary.
 */
export function edenCodex(character: GameCharacter, level: EdenLevelState): EdenCodexSummary {
    // ---- rivers (4) ----
    const rivers = EDEN_RIVER_ORDER.map((id) => {
        const rv = EDEN_RIVERS_V2[id];
        return { id, name: rv.name, lit: level.riversLit.includes(rv.order), color: rv.color };
    });
    const riversDone = rivers.filter((r) => r.lit).length;

    // ---- creatures (EDEN_CREATURE_COUNT) ----
    const creatures = EDEN_CREATURES.map((c) => ({
        id: c.id,
        name: c.name,
        glyph: c.glyph,
        named: level.named.includes(c.id),
        region: c.region,
    }));
    const creaturesDone = creatures.filter((c) => c.named).length;

    // ---- fruits (EDEN_FRUIT_COUNT) ----
    const fruits = EDEN_FRUITS.map((f) => ({
        id: f.id,
        name: f.name,
        glyph: f.glyph,
        harvested: level.fruitsHarvested.includes(f.id),
    }));
    const fruitsDone = fruits.filter((f) => f.harvested).length;

    // ---- lore / inscriptions ----
    const loreTotal = level.loreStones.length;
    const loreDone = level.loreStones.filter((s) => s.read).length;

    // ---- the serpent (EDEN_SERPENT_BEAT_COUNT) ----
    const serpent = EDEN_SERPENT_BEATS.map((b) => ({
        id: b.id,
        choice: level.serpent[b.id] ?? null,
        climax: !!b.climax,
    }));
    const serpentDone = serpent.filter((s) => s.choice !== null).length;

    // ---- trials (lessons + guardians + Cherub) ----
    const trialsDone = level.fights.filter((f) => f.cleared).length;
    const trialsTotal = level.fights.length;

    // ---- caches (open chests + springs), with hidden ones split out ----
    const visibleChests = level.chests.filter((c) => !c.hidden);
    const hiddenChests = level.chests.filter((c) => c.hidden);
    const cachesDone =
        visibleChests.filter((c) => c.opened).length + level.springs.filter((s) => s.collected).length;
    const cachesTotal = visibleChests.length + level.springs.length;

    // ---- secrets (the hidden caches no map recorded) ----
    const secretsDone = hiddenChests.filter((c) => c.opened).length;
    const secretsTotal = hiddenChests.length;

    // ---- regions walked (Gardener greeting per wing) ----
    const regionsTotal = EDEN_REGIONS.length;
    const regionsDone = Math.min(
        regionsTotal,
        character.discovered.filter((d) => d.startsWith('eden_wing_')).length,
    );

    // ---- the relic (1) ----
    const relicClaimed = character.inventory.includes(RELIC_ID);
    const relicDone = relicClaimed ? 1 : 0;

    // ---- per-facet lines ----
    const lines: EdenCodexLine[] = [
        { label: 'Rivers attuned', done: riversDone, total: EDEN_RIVER_ORDER.length, color: '#34d399' },
        { label: 'Creatures named', done: creaturesDone, total: EDEN_CREATURE_COUNT, color: '#fbbf24' },
        { label: 'Fruits gathered', done: fruitsDone, total: EDEN_FRUIT_COUNT, color: '#a3e635' },
        { label: 'Trials won', done: trialsDone, total: trialsTotal, color: '#fb923c' },
        { label: 'Caches found', done: cachesDone, total: cachesTotal, color: '#fcd34d' },
        { label: 'Inscriptions read', done: loreDone, total: loreTotal, color: '#fbbf24' },
        { label: 'Secrets uncovered', done: secretsDone, total: secretsTotal, color: '#c084fc' },
        { label: 'Regions walked', done: regionsDone, total: regionsTotal, color: '#5eead4' },
        { label: 'The Serpent', done: serpentDone, total: EDEN_SERPENT_BEAT_COUNT, color: '#ef4444' },
        { label: 'The Leaf of Life', done: relicDone, total: 1, color: '#86efac' },
    ];

    // ---- overall (sum of every facet) ----
    const overall = lines.reduce(
        (acc, l) => ({ done: acc.done + l.done, total: acc.total + l.total }),
        { done: 0, total: 0 },
    );

    return {
        overall,
        lines,
        rivers,
        creatures,
        fruits,
        serpent,
        untempted: wasUntempted(character.discovered),
        relicClaimed,
        knowledgeOutcome: level.knowledgeOutcome,
    };
}
