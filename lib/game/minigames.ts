// ============================================================
//  MINI-GAME TRIALS — score-gated challenges before each riddle.
//  Difficulty rises along the destination chain (tier 1 → 5).
// ============================================================

export type MinigameKind = 'match' | 'snake' | 'stack';

export interface MinigameDef {
    id: string;
    kind: MinigameKind;
    tier: number;
    title: string;
    prompt: string;
    targetScore: number;
    winText: string;
    /** match: pair count; snake: length/score; stack: lines cleared */
    config?: {
        pairs?: number;
        gridSize?: number;
        cols?: number;
        rows?: number;
    };
}

export const MINIGAME_BY_ID: Record<string, MinigameDef> = {
    mg_eden_match: {
        id: 'mg_eden_match',
        kind: 'match',
        tier: 1,
        title: 'Trial of Memory',
        prompt: 'The Garden tests whether you can hold pattern in mind. Match every pair of sacred signs.',
        targetScore: 6,
        winText: 'The signs burn true. The rivers may now be attuned — as they were before the lie.',
        config: { pairs: 6 },
    },
    mg_giza_snake: {
        id: 'mg_giza_snake',
        kind: 'snake',
        tier: 2,
        title: 'Trial of the Serpent Path',
        prompt: 'The tomb winds like a living serpent. Gather the luminous orbs without striking stone.',
        targetScore: 10,
        winText: 'The serpent path is walked. The measure of the stone may be set.',
        config: { gridSize: 16 },
    },
    mg_fair_stack: {
        id: 'mg_fair_stack',
        kind: 'stack',
        tier: 3,
        title: 'Trial of the White Blocks',
        prompt: 'The Fair was raised in a season — block upon block, line upon line. Stack the plaster shapes and clear the rows.',
        targetScore: 5,
        winText: 'The white city stacks true. The year-dials may turn.',
        config: { cols: 8, rows: 14 },
    },
    mg_kolbrin_snake: {
        id: 'mg_kolbrin_snake',
        kind: 'snake',
        tier: 4,
        title: 'Trial of the Drowned Maze',
        prompt: 'The vault floods with winding paths. Thread the drowned maze — faster, tighter, hungrier.',
        targetScore: 18,
        winText: 'The maze yields. The cipher wheel may turn.',
        config: { gridSize: 14 },
    },
    mg_emerald_stack: {
        id: 'mg_emerald_stack',
        kind: 'stack',
        tier: 5,
        title: 'Trial of the Seven Spheres',
        prompt: 'As above, so below — the spheres fall in seven-fold rhythm. Clear the celestial rows.',
        targetScore: 8,
        winText: 'The spheres align. Trace the wanderers across the painted sky.',
        config: { cols: 10, rows: 16 },
    },
};