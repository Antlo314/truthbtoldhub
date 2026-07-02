// ============================================================
//  EDEN TYPES — the single interface contract for the whole
//  garden. Pure types only (no logic, no data) so every module
//  and UI panel can be authored in parallel against one shape.
//
//  Data + pure functions live in the subsystem modules:
//    bestiary.ts · cultivation.ts · serpent.ts · combats.ts ·
//    codex.ts · ../edenLevel.ts
// ============================================================

import type { CombatConfig } from '@/lib/game/destinations';
import type { EdenRegionId, EdenRiverId, EdenDayPhase, Tile } from '@/lib/game/eden/atlas';

// ------------------------------------------------------------
//  Combat
// ------------------------------------------------------------
export interface EdenCombatDef extends CombatConfig {
    id: string;
    skirmish?: boolean;
    bossDifficulty?: number;
}

// ------------------------------------------------------------
//  Bestiary — naming the living creatures (Adam's first task).
// ------------------------------------------------------------
export interface EdenCreature {
    id: string;
    /** Display name (the answer when fully named). */
    name: string;
    /** Region the creature makes its home. */
    region: EdenRegionId;
    /** Roam anchor (snapped to walkable at hydrate). */
    home: Tile;
    /** How far it wanders from home, in tiles. */
    roam: number;
    /** Pixel-emoji-ish glyph drawn on the canvas + in the codex. */
    glyph: string;
    /** Naming puzzle: a masked form like "L _ _ N" + the answer. */
    masked: string;
    /** Letter bank to tap, including the answer's letters, shuffled. */
    letters: string[];
    /** A one-line clue. */
    clue: string;
    /** Lore line revealed once named. */
    lore: string;
    /** Only visible/active during these day phases (empty = always). */
    phases?: EdenDayPhase[];
    /** Optional reward on naming. */
    reward?: { skillPoint?: boolean; key?: string; opensRiver?: EdenRiverId };
}

// ------------------------------------------------------------
//  Cultivation — work it and keep it.
// ------------------------------------------------------------
export interface EdenFruit {
    id: string;
    name: string;
    glyph: string;
    /** Instant heal on harvest (dungeon HP). */
    heal?: number;
    /** Temporary combat buff carried into the next fight(s). */
    buff?: { hp?: number; damage?: number; regen?: number; lifesteal?: number; crit?: number; fights: number };
    line: string;
}

export interface EdenSeed {
    id: string;
    name: string;
    glyph: string;
    /** Real seconds of in-level time to ripen. */
    growSeconds: number;
    fruit: EdenFruit;
    /** Gated rare seed — only sowable once this condition is met. */
    locked?: 'rivers';
}

export interface EdenBed {
    id: string;
    at: Tile;
    region: EdenRegionId;
}

/** Live (session-only) state of a single bed. */
export interface EdenBedRuntime {
    seedId: string | null;
    /** performance.now() at planting; 0 when empty. */
    plantedAt: number;
    /** true once harvested this session (re-plantable). */
    spent?: boolean;
}

export type EdenGrowthStage = 'empty' | 'sprout' | 'growing' | 'ripe';

// ------------------------------------------------------------
//  The Serpent's long arc.
// ------------------------------------------------------------
export type EdenSerpentChoice = 'resisted' | 'listened';

export interface EdenSerpentBeat {
    id: string;
    region: EdenRegionId;
    /** Where the whisper is heard. */
    at: Tile;
    /** Is this the Tree-of-Knowledge climax? */
    climax?: boolean;
    /** The offer. */
    whisper: string;
    /** Spoken if you walk on. */
    resistedLine: string;
    /** Spoken if you listen. */
    listenedLine: string;
    /** Listening can spring a trap fight (combat id). */
    listenedFight?: string;
    /** If listening grants a shortcut, where it drops you. */
    shortcut?: Tile;
}

export type EdenKnowledgeOutcome = 'none' | 'tasted' | 'refused';

// ------------------------------------------------------------
//  Static placed content (lore, chests, springs, fight zones).
// ------------------------------------------------------------
export interface EdenLoreStone {
    id: string;
    gx: number;
    gy: number;
    region: EdenRegionId;
    title: string;
    text: string;
    read: boolean;
}

export interface EdenChest {
    id: string;
    gx: number;
    gy: number;
    region: EdenRegionId;
    health?: number;
    label: string;
    opened: boolean;
    /** Only interactable with all-lore-read or the Seer hidden-sight power. */
    hidden?: boolean;
}

export interface EdenSpring {
    id: string;
    gx: number;
    gy: number;
    region: EdenRegionId;
    amount: number;
    collected: boolean;
}

export interface EdenFightZone {
    id: string;
    gx: number;
    gy: number;
    radius: number;
    combatId: string;
    cleared: boolean;
    hint: string;
    /** Marks one of the four river-guardian fights. */
    river?: EdenRiverId;
    /** True for the Cherub. */
    boss?: boolean;
}

// ------------------------------------------------------------
//  THE LEVEL STATE — hydrated from character.discovered[].
// ------------------------------------------------------------
export interface EdenLevelState {
    chests: EdenChest[];
    springs: EdenSpring[];
    fights: EdenFightZone[];
    loreStones: EdenLoreStone[];

    /** River order-indices attuned, in canonical Genesis order. */
    riversLit: number[];
    /** All four rivers lit in Genesis order → the Cherub road opens. */
    bossGateOpen: boolean;
    /** Cherub felled → the Tree of Life sanctum opens. */
    sanctumOpen: boolean;

    // subsystem progress (all derived from discovered[])
    named: string[];                 // creature ids named
    fruitsHarvested: string[];       // fruit ids ever harvested
    serpent: Record<string, EdenSerpentChoice>;
    knowledgeOutcome: EdenKnowledgeOutcome;
    secretsFound: string[];
}

// ------------------------------------------------------------
//  Codex summary — the "game within itself" dashboard model.
// ------------------------------------------------------------
export interface EdenCodexLine {
    label: string;
    done: number;
    total: number;
    color: string;
}

export interface EdenCodexSummary {
    overall: { done: number; total: number };
    lines: EdenCodexLine[];
    rivers: { id: EdenRiverId; name: string; lit: boolean; color: string }[];
    creatures: { id: string; name: string; glyph: string; named: boolean; region: EdenRegionId; phases?: EdenDayPhase[] }[];
    fruits: { id: string; name: string; glyph: string; harvested: boolean }[];
    serpent: { id: string; choice: EdenSerpentChoice | null; climax: boolean }[];
    /** NG+ echo rematches stilled (display-only — not part of `overall`). */
    echoes: { done: number; total: number };
    untempted: boolean;
    relicClaimed: boolean;
    knowledgeOutcome: EdenKnowledgeOutcome;
}
