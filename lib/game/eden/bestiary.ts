// ============================================================
//  EDEN BESTIARY — "Adam names the living creatures."
//
//  Out of the ground the Source formed every beast of the field
//  and every fowl of the air, and brought them to the first man
//  to see what he would call them. Whatever he called a living
//  creature, that was its name. Here you take up that first work:
//  read the clue, sound out the masked name, build it from the
//  letter bank, and speak it. The creature answers to its name
//  and gives up the line of memory it carried.
//
//  Pure data + pure helpers only. Coordinates sit inside each
//  region's rect (see atlas.ts). Persistence is a single append-
//  only key per creature: edenKey('named', id).
// ============================================================

import { tile, edenKey, type EdenRegionId } from '@/lib/game/eden/atlas';
import type { EdenCreature } from '@/lib/game/eden/types';

// 14 living creatures, spread across the garden's regions.
// outer_grove 3 · eastern_garden 2 · pishon 2 · gihon 2 ·
// hiddekel 2 (one night OWL) · euphrates 1 · verge 1 · threshold 1.
export const EDEN_CREATURES: EdenCreature[] = [
    // ---- The Outer Grove (SW) — where the naming began ----
    {
        id: 'lion', name: 'Lion', region: 'outer_grove', home: tile(12, 60), roam: 5,
        glyph: '🦁', masked: 'L _ _ N', letters: ['O', 'L', 'R', 'N', 'I', 'E'],
        clue: 'It walks unhurried through the grove, and even the grass holds its breath.',
        lore: 'First of the unafraid. In the garden it lay down beside the lamb, and neither knew the word for fear.',
        reward: { skillPoint: true },
    },
    {
        id: 'stag', name: 'Stag', region: 'outer_grove', home: tile(22, 64), roam: 6,
        glyph: '🦌', masked: 'S _ _ G', letters: ['A', 'T', 'S', 'N', 'G', 'R'],
        clue: 'It wears a crown of branches and pants after the river-springs at dawn.',
        lore: 'It carries the morning on its brow. As the hart longs for the water, so the garden longed to be named.',
        phases: ['dawn', 'morning', 'noon', 'cool'],
    },
    {
        id: 'fox', name: 'Fox', region: 'outer_grove', home: tile(8, 66), roam: 4,
        glyph: '🦊', masked: 'F _ _', letters: ['X', 'F', 'O', 'A', 'E'],
        clue: 'A small flame slips between the vines at dusk, and is gone before you finish looking.',
        lore: 'Quickest of the small ones. It learned every hidden path while the garden was still young, and forgot none.',
        phases: ['dusk', 'night', 'dawn'],
    },

    // ---- The Eastern Garden (SE) — abundance ----
    {
        id: 'ox', name: 'Ox', region: 'eastern_garden', home: tile(74, 60), roam: 3,
        glyph: '🐂', masked: 'O _', letters: ['X', 'O', 'B', 'M'],
        clue: 'Patient and broad-shouldered, it would have borne the work of keeping the beds.',
        lore: 'Strength without anger. It bowed its neck to no yoke here, for in the garden labour was only love made visible.',
    },
    {
        id: 'bee', name: 'Bee', region: 'eastern_garden', home: tile(84, 64), roam: 4,
        glyph: '🐝', masked: 'B _ _', letters: ['E', 'B', 'E', 'W', 'D'],
        clue: 'Smallest of the messengers, it spells the garden in gold from flower to flower.',
        lore: 'It tithed the blossoms and the blossoms grew richer for it. Even the least creature was given a craft.',
    },

    // ---- Pishon — the Land of Havilah (W-mid, gold/amber) ----
    {
        id: 'ram', name: 'Ram', region: 'pishon', home: tile(14, 30), roam: 4,
        glyph: '🐏', masked: 'R _ _', letters: ['A', 'R', 'M', 'P', 'O'],
        clue: 'Spiral-horned and sure-footed where the gold lies in the gravel of the stream.',
        lore: 'It stood firm at the head of the flock. Long after, a ram would be caught in a thicket — but here it only grazed in peace.',
    },
    {
        id: 'ibex', name: 'Ibex', region: 'pishon', home: tile(24, 44), roam: 6,
        glyph: '🐐', masked: 'I _ _ X', letters: ['B', 'I', 'E', 'X', 'A', 'T'],
        clue: 'It dances the high amber rocks of Havilah as if the cliff were level ground.',
        lore: 'Sure on every height. The garden hid no ledge too sheer for the one that trusted the rock that bore it.',
        reward: { skillPoint: true },
    },

    // ---- Gihon — the Springs of Cush (E-mid, teal) ----
    {
        id: 'heron', name: 'Heron', region: 'gihon', home: tile(82, 30), roam: 5,
        glyph: '🪶', masked: 'H _ _ _ N', letters: ['E', 'H', 'R', 'O', 'N', 'A', 'S'],
        clue: 'Still as a reed at the spring, it waits on one leg for the water to speak.',
        lore: 'Patience standing in the cold clear springs of Cush. It learned to wait, and the waiting was its prayer.',
    },
    {
        id: 'dove', name: 'Dove', region: 'gihon', home: tile(84, 44), roam: 5,
        glyph: '🕊️', masked: 'D _ _ E', letters: ['O', 'D', 'V', 'E', 'W', 'R'],
        clue: 'A soft grey peace over the water; one day it would carry a green leaf to a weary ark.',
        lore: 'The bringer of the green branch. Before the flood it nested at Gihon, where the springs never failed.',
    },

    // ---- Hiddekel — the Swift Water (NW, violet-stone) ----
    {
        id: 'owl', name: 'Owl', region: 'hiddekel', home: tile(14, 12), roam: 5,
        glyph: '🦉', masked: 'O _ _', letters: ['L', 'O', 'W', 'E', 'R'],
        clue: 'It keeps the watch the day cannot keep, and the swift water answers its question twice.',
        lore: 'Keeper of the dark hours. While the garden slept it counted the stars and lost none of their names.',
        phases: ['night', 'dusk'],
        reward: { skillPoint: true },
    },
    {
        id: 'raven', name: 'Raven', region: 'hiddekel', home: tile(24, 18), roam: 5,
        glyph: '🐦‍⬛', masked: 'R _ _ E N', letters: ['A', 'R', 'V', 'E', 'N', 'C', 'O'],
        clue: 'A black thought on swift wings; it would be first out of the ark, and would not return.',
        lore: 'Oldest of the wary. It rode the violet current toward Assyria, remembering everything and trusting little.',
    },

    // ---- Euphrates — the Great River (NE) ----
    {
        id: 'eagle', name: 'Eagle', region: 'euphrates', home: tile(82, 12), roam: 6,
        glyph: '🦅', masked: 'E _ _ _ E', letters: ['A', 'E', 'G', 'L', 'E', 'R', 'T'],
        clue: 'It renews its youth above the great river and reads the whole world in one circling glance.',
        lore: 'Highest of the watchers. From the air above Euphrates it saw every age the river would water, and was not afraid of any.',
    },

    // ---- The Forbidden Verge (centre) ----
    {
        id: 'quail', name: 'Quail', region: 'verge', home: tile(48, 42), roam: 4,
        glyph: '🐦', masked: 'Q _ _ _ L', letters: ['U', 'Q', 'A', 'I', 'L', 'E', 'N'],
        clue: 'It hides low in the grass near the warning tree; one day it would fall like rain to feed the hungry.',
        lore: 'The given bread on wings. It nested in the shadow of the knowing-tree and feared nothing, for it had not yet learned to.',
    },

    // ---- The Threshold (S spawn) ----
    {
        id: 'lamb', name: 'Lamb', region: 'threshold', home: tile(50, 64), roam: 3,
        glyph: '🐑', masked: 'L _ _ B', letters: ['A', 'L', 'M', 'B', 'O', 'E'],
        clue: 'White and unworried, it follows close at the threshold and asks for nothing.',
        lore: 'Gentlest of the flock. It lay down by the lion and knew no danger — the garden kept innocence the way water keeps light.',
    },
];

// ------------------------------------------------------------
//  Pure helpers — all persistence flows through edenKey('named', id).
// ------------------------------------------------------------

const _byId: Record<string, EdenCreature> =
    Object.fromEntries(EDEN_CREATURES.map((c) => [c.id, c]));

/** The full count of nameable creatures. */
export const EDEN_CREATURE_COUNT = EDEN_CREATURES.length;

/** The discovered[] key written when a creature is named. */
export function nameCreatureKey(id: string): string {
    return edenKey('named', id);
}

export function creatureById(id: string): EdenCreature | undefined {
    return _byId[id];
}

export function creaturesInRegion(region: EdenRegionId): EdenCreature[] {
    return EDEN_CREATURES.filter((c) => c.region === region);
}

/** Has this creature been named (its key is in discovered[])? */
export function creatureNamed(id: string, discovered: string[]): boolean {
    return discovered.includes(nameCreatureKey(id));
}

/** Ids of every creature already named. */
export function namedCreatureIds(discovered: string[]): string[] {
    return EDEN_CREATURES.filter((c) => creatureNamed(c.id, discovered)).map((c) => c.id);
}

/** True once every living creature has its name. */
export function allCreaturesNamed(discovered: string[]): boolean {
    return EDEN_CREATURES.every((c) => creatureNamed(c.id, discovered));
}

/** Case-insensitive, space- and whitespace-insensitive name match. */
export function checkCreatureName(creature: EdenCreature, guess: string): boolean {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '').trim();
    return norm(guess) === norm(creature.name);
}
