// ============================================================
//  EDEN COMBATS — every fight in the garden, in one record.
//
//  Three southern tutorial skirmishes, four river-guardian
//  bosses (built by iterating EDEN_RIVER_ORDER so their ids and
//  names stay welded to the atlas), four serpent-trap ambushes,
//  and the Cherub of the Flaming Sword.
//
//  Pure data + pure helpers. Imports the EdenCombatDef shape from
//  types.ts and never redeclares it.
// ============================================================

import type { EdenCombatDef } from '@/lib/game/eden/types';
import type { BossArt } from '@/lib/game/destinations';
import { EDEN_RIVERS_V2, EDEN_RIVER_ORDER, type EdenRiverId } from '@/lib/game/eden/atlas';

// ------------------------------------------------------------
//  Tutorial skirmishes — the southern garden teaches the hand.
// ------------------------------------------------------------
const TUTORIALS: Record<string, EdenCombatDef> = {
    eden_lesson_1: {
        id: 'eden_lesson_1',
        skirmish: true,
        challenge: 'A single shade wanders the threshold road, then a second. Learn to dodge the lunge and strike on the recovery.',
        enemyCount: 2,
        enemyHp: 24,
        enemyDmg: 10,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The shade unravels like smoke. The first lesson holds: the road is walked, not feared.',
    },
    eden_lesson_2: {
        id: 'eden_lesson_2',
        skirmish: true,
        challenge: 'Three shades drift up from the outer grove, sharing their turns. Keep moving — never let two close on you at once.',
        enemyCount: 3,
        enemyHp: 27,
        enemyDmg: 11,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The grove falls quiet again. The creatures that waited for their names creep back into the light.',
    },
    eden_lesson_3: {
        id: 'eden_lesson_3',
        skirmish: true,
        challenge: 'Caster shades and a flanker hold the eastern beds. Close the gap after each volley — distance is their only weapon.',
        enemyCount: 3,
        enemyHp: 30,
        enemyDmg: 13,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The last bolt gutters out. You have learned enough to walk toward the rivers. The fountains are waiting to be lit.',
    },
};

// ------------------------------------------------------------
//  River guardians — one boss per river, built from the atlas so
//  ids ('eden_g_<river>') and names track EDEN_RIVERS_V2.
// ------------------------------------------------------------
interface GuardianSpec {
    art: BossArt;
    hp: number;
    dmg: number;
    adds: number;
    addHp: number;
    addDmg: number;
    difficulty: number;
    challenge: string;
}

const GUARDIAN_SPEC: Record<EdenRiverId, GuardianSpec> = {
    pishon: {
        art: 'golem',
        hp: 110,
        dmg: 12,
        adds: 2,
        addHp: 26,
        addDmg: 10,
        difficulty: 1,
        challenge: 'A figure of gold-veined stone rises from the riverbed of Havilah. It strikes slow but sure — read the wind-up, sidestep, and answer between blows.',
    },
    gihon: {
        art: 'serpent',
        hp: 128,
        dmg: 14,
        adds: 2,
        addHp: 28,
        addDmg: 11,
        difficulty: 2,
        challenge: 'A coiled thing wreathed in the cold springs of Cush bars the source. It lunges in long arcs — never stand where it last struck, and the water will not drown you.',
    },
    hiddekel: {
        art: 'wraith',
        hp: 146,
        dmg: 15,
        adds: 3,
        addHp: 28,
        addDmg: 12,
        difficulty: 2,
        challenge: 'A pale wraith moves faster than thought above the swift water toward Assyria. It blinks across the arena — clear its echoes first, then chase it into its own recovery.',
    },
    euphrates: {
        art: 'titan',
        hp: 164,
        dmg: 17,
        adds: 3,
        addHp: 30,
        addDmg: 13,
        difficulty: 3,
        challenge: 'The Keeper of the great river stands like a wall over the deepest water. Its sweep covers half the bank — bait the swing, roll wide, and close before it sets again.',
    },
};

function guardianDef(id: EdenRiverId): EdenCombatDef {
    const river = EDEN_RIVERS_V2[id];
    const spec = GUARDIAN_SPEC[id];
    return {
        id: river.guardian.combatId,
        challenge: spec.challenge,
        enemyCount: spec.adds,
        enemyHp: spec.addHp,
        enemyDmg: spec.addDmg,
        bossName: river.guardian.name,
        bossArt: spec.art,
        bossHp: spec.hp,
        bossDmg: spec.dmg,
        bossDifficulty: spec.difficulty,
        victory: `${river.guardian.name} sinks back into the current and is still. The ${river.name} fountain catches light — ${river.land} drinks again, and the dashed line bends toward the Tree.`,
    };
}

// Build the four guardians by walking the canonical order so the
// record stays in sync with the atlas if names/ids ever change.
const GUARDIANS: Record<string, EdenCombatDef> = Object.fromEntries(
    EDEN_RIVER_ORDER.map((id) => {
        const def = guardianDef(id);
        return [def.id, def];
    }),
);

// ------------------------------------------------------------
//  Serpent traps — listening to a whisper springs a short ambush.
//  Ids MUST match the serpent arc's listenedFight ids.
// ------------------------------------------------------------
const SERPENT_TRAPS: Record<string, EdenCombatDef> = {
    eden_serpent_pishon: {
        id: 'eden_serpent_pishon',
        skirmish: true,
        challenge: 'The gold path buckles. Two shades of want claw up from the riverbed — quick and greedy. End it fast.',
        enemyCount: 2,
        enemyHp: 30,
        enemyDmg: 14,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The false shortcut crumbles to dust. Gold bought you nothing the long road would not have given.',
    },
    eden_serpent_gihon: {
        id: 'eden_serpent_gihon',
        skirmish: true,
        challenge: 'The springs turn black. Two cold shades surface from the still water and strike from the sides at once.',
        enemyCount: 2,
        enemyHp: 31,
        enemyDmg: 15,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The water clears. Abundance was never the lie — the lie was that you had to seize it.',
    },
    eden_serpent_hiddekel: {
        id: 'eden_serpent_hiddekel',
        skirmish: true,
        challenge: 'The swift water carries two shades to you before you can brace. Move first — they do not wait their turn here.',
        enemyCount: 2,
        enemyHp: 32,
        enemyDmg: 16,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The current settles. Knowing faster was never knowing truer.',
    },
    eden_serpent_euphrates: {
        id: 'eden_serpent_euphrates',
        skirmish: true,
        challenge: 'The great river offers a crossing that was never there. Two heavy shades rise to drag you under. Hold the bank.',
        enemyCount: 2,
        enemyHp: 33,
        enemyDmg: 16,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The phantom ford dissolves. Every age that drank from this river still had to walk to it.',
    },
};

// ------------------------------------------------------------
//  The Cherub of the Flaming Sword — gate of the Tree of Life.
// ------------------------------------------------------------
const CHERUB: EdenCombatDef = {
    id: 'eden_boss',
    challenge: 'The Cherub keeps the way back, its flaming sword turning every direction at once. It sweeps the sword in burning red rings — dodge through their gaps, fell the two shade-echoes first, then strike in the breath between turns.',
    enemyCount: 2,
    enemyHp: 30,
    enemyDmg: 12,
    bossName: 'The Cherub of the Flaming Sword',
    bossArt: 'sentinel',
    bossHp: 196,
    bossDmg: 16,
    bossDifficulty: 3,
    victory: 'The flaming sword lowers and goes still. The four rivers are attuned, the garden whole — and beyond the gate, the Tree of Life remembers the first morning, and you.',
};

// ------------------------------------------------------------
//  The whole record.
// ------------------------------------------------------------
export const EDEN_COMBATS: Record<string, EdenCombatDef> = {
    ...TUTORIALS,
    ...GUARDIANS,
    ...SERPENT_TRAPS,
    eden_boss: CHERUB,
};

/** Look up any Eden combat by id. */
export function edenCombat(id: string): EdenCombatDef | undefined {
    return EDEN_COMBATS[id];
}
