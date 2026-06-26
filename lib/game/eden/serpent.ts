// ============================================================
//  THE SERPENT — the long temptation arc.
//
//  The lone whisper of the Verge is not a single line; it is a
//  patient voice that finds you again at every river, offering
//  the same trade in new clothes: the shortcut, the knowing-
//  without-walking, the crown without the road. Four river beats
//  rehearse the offer; the fifth, at the Tree of Knowledge, is
//  the fork itself.
//
//  Persistence (atlas): every choice is an append-only key.
//    river beat resolved -> edenKey('serpent', `${beatId}_${choice}`)
//    climax resolved     -> EDEN_KEYS.knowledgeResolved + '_<outcome>'
//    untempted (4/4, none listened) -> EDEN_KEYS.untempted
//
//  Pure data + pure functions only. No React, no DOM, no deps.
// ============================================================

import {
    tile,
    edenKey,
    EDEN_KEYS,
    EDEN_RIVERS_V2,
    EDEN_TREE_OF_KNOWLEDGE,
} from '@/lib/game/eden/atlas';
import type {
    EdenSerpentBeat,
    EdenSerpentChoice,
    EdenKnowledgeOutcome,
} from '@/lib/game/eden/types';

// ------------------------------------------------------------
//  THE BEATS — four by the rivers, one at the Tree.
//  Each `at` sits inside its region near the fountain/guardian;
//  each shortcut drops a bit further along the same road.
// ------------------------------------------------------------
export const EDEN_SERPENT_BEATS: EdenSerpentBeat[] = [
    {
        id: 'serpent_pishon',
        region: 'pishon',
        at: tile(16, 33),
        whisper:
            '【A whisper】 So much gold, and you would earn it spring by spring? The Watcher need not fall. ' +
            'Slip past while it sleeps — Havilah is already yours, if you only stop asking permission to be rich.',
        resistedLine:
            '【The Gardener】 The gold of this land is good because it is gathered, not snatched. ' +
            'Face the Watcher. What you win at the fountain, no one can unwind.',
        listenedLine:
            '【A whisper】 ...There. Past it. — but the fountain stays dark, and the gold you grasped runs through your fingers like dry sand. A shortcut spends what it cannot keep.',
        listenedFight: 'eden_serpent_pishon',
        shortcut: tile(20, 39),
    },
    {
        id: 'serpent_gihon',
        region: 'gihon',
        at: tile(80, 33),
        whisper:
            '【A whisper】 Abundance before need, they told you — so why thirst at all? Drink the spring dry now. ' +
            'Take the whole of Cush in one swallow. Why ration what was made to overflow?',
        resistedLine:
            '【The Gardener】 The springs never ran dry because no one tried to own them. ' +
            'Drink your fill and leave them flowing. Enough, freely, is the deeper draught.',
        listenedLine:
            '【A whisper】 ...You took it all, and the springs choke on your grasp. Hoarded water turns to brackish silt. The Warden stirs — abundance defends itself.',
        listenedFight: 'eden_serpent_gihon',
        shortcut: tile(76, 39),
    },
    {
        id: 'serpent_hiddekel',
        region: 'hiddekel',
        at: tile(16, 15),
        whisper:
            '【A whisper】 The swift water moves faster than thought — so move faster than yourself. ' +
            'Why earn the Sentinel\'s respect across long mornings? Outrun it. Be quick now and patient never.',
        resistedLine:
            '【The Gardener】 Swiftness is a gift, not a theft of time. The Sentinel does not test your speed but your steadiness. ' +
            'Quicken without fleeing — that is the swift water\'s secret.',
        listenedLine:
            '【A whisper】 ...You ran, and the current ran you. Faster than thought is faster than footing — the swift water folds you under, and the Sentinel meets you where you fall.',
        listenedFight: 'eden_serpent_hiddekel',
        shortcut: tile(20, 21),
    },
    {
        id: 'serpent_euphrates',
        region: 'euphrates',
        at: tile(80, 15),
        whisper:
            '【A whisper】 The great river waters every age that follows. Bend it now and every age bends to you. ' +
            'Why be remembered when you could be obeyed? The Keeper guards a throne, not a gate. Take it.',
        resistedLine:
            '【The Gardener】 The longest memory belongs to what served, not what seized. ' +
            'The Euphrates is a river, not a reign. Let it close the ordering through you — not under you.',
        listenedLine:
            '【A whisper】 ...You reached for the throne and the river turned its back on every age at once. A reign over water is a reign over nothing. The Keeper rises to answer the grasp.',
        listenedFight: 'eden_serpent_euphrates',
        shortcut: tile(76, 21),
    },
    {
        id: 'serpent_tree',
        region: 'verge',
        at: tile(EDEN_TREE_OF_KNOWLEDGE.gx + 2, EDEN_TREE_OF_KNOWLEDGE.gy + 1),
        climax: true,
        whisper:
            '【A whisper】 Here it is, then — the tree itself. One taste and you will know good and evil as I do, ' +
            'without the long road of learning it. No fountain, no Watcher, no waiting. Only knowing. ' +
            'Did the Source truly say you must walk every mile to arrive?',
        resistedLine:
            '【The Gardener】 You may know good and evil by tasting, or by living — and only one of those leaves you whole. ' +
            'Turn from the tree. The long road was never a punishment. It was the gift.',
        listenedLine:
            '【A whisper】 ...You taste, and the knowing floods in — every good, every evil, all at once, unwalked. ' +
            'It is true knowledge. It is also a heavier crown than the road would ever have asked you to carry. Now you must walk back to the Source the hard way — eyes open.',
    },
];

export const EDEN_SERPENT_BEAT_COUNT = EDEN_SERPENT_BEATS.length;

/** The four river beats only (the climax is handled separately). */
const RIVER_BEATS = EDEN_SERPENT_BEATS.filter((b) => !b.climax);

const BEAT_BY_ID: Record<string, EdenSerpentBeat> = Object.fromEntries(
    EDEN_SERPENT_BEATS.map((b) => [b.id, b]),
);

// ------------------------------------------------------------
//  Pure helpers
// ------------------------------------------------------------

export function serpentBeatById(id: string): EdenSerpentBeat | undefined {
    return BEAT_BY_ID[id];
}

/** The discovered-key for resolving a beat one way or the other. */
export function serpentChoiceKey(beatId: string, choice: EdenSerpentChoice): string {
    return edenKey('serpent', `${beatId}_${choice}`);
}

/** Which way a beat was resolved, or null if untouched. */
export function beatChoice(beatId: string, discovered: string[]): EdenSerpentChoice | null {
    if (discovered.includes(serpentChoiceKey(beatId, 'listened'))) return 'listened';
    if (discovered.includes(serpentChoiceKey(beatId, 'resisted'))) return 'resisted';
    return null;
}

/** How many of the five beats have been resolved either way. */
export function serpentResolvedCount(discovered: string[]): number {
    let n = 0;
    for (const b of EDEN_SERPENT_BEATS) {
        if (beatChoice(b.id, discovered)) n++;
    }
    return n;
}

/** Did the wanderer listen to the Serpent on ANY beat? */
export function listenedAny(discovered: string[]): boolean {
    return EDEN_SERPENT_BEATS.some((b) => beatChoice(b.id, discovered) === 'listened');
}

/**
 * The whole road kept: all four river beats resolved, not one of them a
 * listening, AND the Tree of Knowledge was not tasted. Tasting at the climax
 * disqualifies the accolade — you cannot be "Untempted" and have taken the
 * fruit. (A still-unreached climax is provisionally allowed; refusing it is
 * the clean finish.)
 */
export function wasUntempted(discovered: string[]): boolean {
    return (
        RIVER_BEATS.every((b) => beatChoice(b.id, discovered) !== null) &&
        RIVER_BEATS.every((b) => beatChoice(b.id, discovered) !== 'listened') &&
        knowledgeOutcomeFrom(discovered) !== 'tasted'
    );
}

/** The persisted climax outcome key fragment for a resolved tree. */
export function knowledgeOutcomeKey(outcome: 'tasted' | 'refused'): string {
    return `${EDEN_KEYS.knowledgeResolved}_${outcome}`;
}

/** Read the climax outcome back from the discovered keys. */
export function knowledgeOutcomeFrom(discovered: string[]): EdenKnowledgeOutcome {
    if (discovered.includes(knowledgeOutcomeKey('tasted'))) return 'tasted';
    if (discovered.includes(knowledgeOutcomeKey('refused'))) return 'refused';
    return 'none';
}

/**
 * Resolve the climax fork.
 * Refused => the road remains whole — 'The Untempted' blessing.
 * Tasted  => the knowing is real, but the way home is now the harder,
 *            truer road. Both endings are honourable: the premise is a
 *            return to the Source, by whichever path you walked here.
 */
export function climaxResolution(listened: boolean): {
    outcome: 'tasted' | 'refused';
    title: string;
    line: string;
    blessingLabel: string;
} {
    if (listened) {
        return {
            outcome: 'tasted',
            title: 'The Long Way Home',
            line:
                'You know good and evil now — wholly, heavily, all at once. The shortcut was real; ' +
                'so is its weight. The road back to the Source did not close. It only grew honest. ' +
                'Walk it eyes open, and you will arrive carrying everything you learned the hard way.',
            blessingLabel: 'The Knowing — the harder, truer road',
        };
    }
    return {
        outcome: 'refused',
        title: 'The Untempted',
        line:
            'You turned from the tree and kept the long road whole. Not because you feared the knowing, ' +
            'but because you trusted the walking. The Source was never at the end of a shortcut — ' +
            'it was in every mile you refused to skip. You arrive undivided.',
        blessingLabel: 'The Untempted — the whole road kept',
    };
}
