import type { GameCharacter, GamePath } from '@/lib/store/useGameStore';
import { truthDepthTier, truthQuestionsAsked } from '@/lib/game/truthLore';

// ============================================================
//  TRUTH SPINE — one voice system feeding every surface.
//  Ask Truth holds the full confession; the journey echoes it.
// ============================================================

function pick<T>(pool: T[]): T {
    return pool[Math.floor(Math.random() * pool.length)];
}

function asked(c: GameCharacter, id: string): boolean {
    return truthQuestionsAsked(c).includes(id);
}

function witness(c: GameCharacter): boolean {
    return c.questsClaimed.includes('q_truth_last_run');
}

export type CombatOutcome =
    | 'wildWin'
    | 'wildWinFirst'
    | 'wildLose'
    | 'guardianWin'
    | 'guardianLose'
    | 'unarmedShade';

/** Short toast or banner copy after combat */
export function truthCombatLine(c: GameCharacter, outcome: CombatOutcome): string {
    const tier = truthDepthTier(c);

    if (outcome === 'unarmedShade') {
        if (tier >= 2) return 'A shade passes through you — cold. Empty the flesh later; arm yourself at the Hut first.';
        return 'A shade drifts through you — cold, and searching. Arm yourself at Truth\'s Hut.';
    }

    if (outcome === 'wildLose' || outcome === 'guardianLose') {
        if (asked(c, 'fasting')) {
            return pick([
                'The shade found what you were still feeding. Fast, forgive, pray — then stand again.',
                'You cannot drink your thirst away, and you cannot fight full of flesh. Rest. Return.',
            ]);
        }
        if (tier >= 2) {
            return pick([
                'The shades overwhelm you. Every day is a fight — rest, and return.',
                'Empty the flesh before you meet them again. Rest now.',
            ]);
        }
        return 'The shades overwhelm you. Rest, and return stronger.';
    }

    if (outcome === 'wildWinFirst') {
        if (asked(c, 'fasting')) {
            return 'You stood. The flesh emptied enough for the spirit to strike. The wilderness saw it.';
        }
        return 'You stood against the shade. That is how the road is learned — not in the hut alone.';
    }

    if (outcome === 'wildWin') {
        if (tier >= 2) {
            return pick([
                'Another shade scattered. The daily fight continues.',
                'Good. Strike, rest, fast, return — the circuit is the same.',
            ]);
        }
        return 'The shades scatter. Stay armed. Stay walking.';
    }

    // guardianWin
    if (witness(c)) {
        return pick([
            'Guardian down. Give what you gathered back to the Source — do not hoard the win.',
            'You cleared another seal. Witness walks like this.',
        ]);
    }
    if (asked(c, 'series_400')) {
        return 'Another seal broken — buried wisdom stirs. The 400 Series needs souls who can stand like this.';
    }
    if (tier >= 2) {
        return pick([
            'The guardian falls. Forge, learn, share — fuel what we are building.',
            'Well struck. Return to the Hut when the road grows heavy.',
        ]);
    }
    return 'The guardian falls. Visit Truth\'s Forge when you are ready to temper your edge.';
}

/** Deeper dialogue after clearing a destination guardian (first time) */
export function truthDestClearLine(c: GameCharacter, destId: string): string | null {
    const tier = truthDepthTier(c);
    if (tier < 1) return null;

    const byDest: Record<string, string[]> = {
        dest_eden: [
            'Eden remembers walking beside the Source. You took a step back toward that hour.',
            'Before the lie, man did not believe from afar — he walked. You walked.',
        ],
        dest_fair: [
            'Twelve hundred palaces of light — erased, but not forgotten. Mabel\'s chronicle lives because souls like you walk.',
        ],
        dest_giza: [
            'The stone still hums. What sleeps in the measure is part of what the 400 Series must recover.',
        ],
        dest_kolbrin: [
            'Books they tried to burn. The ink outlives the fire when someone refuses to quit reading.',
        ],
        dest_emerald: [
            'Thrice-great — in life, in death, and beyond. Give what you learned back; do not pocket it.',
        ],
    };

    const pool = byDest[destId];
    if (!pool) {
        if (asked(c, 'need_from_you')) {
            return 'Learn from what you saw here. Share the vision. That is how you help me fight alone.';
        }
        return null;
    }
    return pick(pool);
}

/** Truth's Forge coaching copy */
export function truthForgeLine(c: GameCharacter, hasWeapon: boolean): string {
    const tier = truthDepthTier(c);

    if (!hasWeapon) {
        if (asked(c, 'fasting') || tier >= 2) {
            return 'You are unarmed. I walked unarmed in my wilderness — do not imitate that folly. Forge here. Iron is obedience, not pride.';
        }
        return 'You are unarmed. Select the Wooden Staff or cut a branch from Eden — guardians will not yield to empty hands.';
    }

    if (asked(c, 'need_from_you')) {
        return 'Temper your edge with gathered ore. Share the vision when you are strong enough to stand — that fuels the work more than flattery.';
    }
    if (tier >= 2) {
        return pick([
            `You hold steel. Every upgrade is a daily fight made visible — empty the flesh, strike the shade.`,
            'Smelt what the road gives you. The monsters without mirror the monsters within.',
        ]);
    }
    return 'Gather ore from the portal worlds and temper your blade. A stronger edge bites deeper into the shadows.';
}

/** Awakening chapters — create avatar & path select */
export function truthAwakeningLine(
    chapter: 'create' | 'path',
    c: GameCharacter,
    path?: GamePath,
): string {
    const name = c.name?.trim();

    if (chapter === 'create') {
        if (name) {
            return `${name} — good. Forge the vessel you will carry. The fight is daily from the first step; empty the flesh as you walk.`;
        }
        return 'Forge the vessel you will carry into the world. Speak your name when you are ready — I will witness what the Source shapes.';
    }

    if (path) {
        const pathLines: Record<GamePath, string> = {
            seer: 'The Seer empties pride to see. Sight without obedience is vanity — walk what you unveil.',
            sentinel: 'The Sentinel stands in the open. So must you — shades test what is unarmed and what is hollow.',
            scribe: 'The Scribe records what kings erase. Share what you learn — that is how buried wisdom breathes again.',
            mystic: 'The Mystic channels the Source inward. Fasting taught me — empty the flesh so His water can enter.',
        };
        return pathLines[path];
    }

    if (name) {
        return `${name}, four roads lie before you. Choose with care — your path is how you fight the monster within.`;
    }
    return 'Four roads back to the Source. Choose with care — strengths and weaknesses are born at this crossroads.';
}

/** NPC interact — Truth echoes after/beside local dialogue when earned */
export function truthNpcEcho(npcId: string, c: GameCharacter): string | null {
    const tier = truthDepthTier(c);
    if (tier < 1 && !witness(c)) return null;

    if (witness(c)) {
        const witnessLines: Record<string, string> = {
            npc_gardener: 'The Gardener keeps Eden\'s gate. Truth calls you witness — walk like the garden remembers.',
            npc_mabel: 'Mabel chronicles what was erased. You pried the hood — now chronicle what you see.',
            npc_hana: 'Hana sharpens the willing. Witness does not watch from safety — witness stands.',
            npc_eli: 'Eli reads what bronze preserved. Give your reading back to the Source.',
            npc_mara: 'Mara gathers relics of lies undone. You are not a collector — you are a giver of light.',
        };
        return witnessLines[npcId] ?? 'Truth nods. "Walk as witness — not tourist."';
    }

    if (asked(c, 'children') && (npcId === 'npc_mara' || npcId === 'npc_gardener')) {
        return 'Truth murmurs: "Some fathers fight from a foreign land. Your interest fuels what I cannot carry alone."';
    }

    if (asked(c, 'need_from_you') && npcId === 'npc_mara') {
        return 'Truth adds quietly: "Share what Mara teaches. That is part of how you fuel the vision."';
    }

    if (tier >= 2) {
        const tier2: Record<string, string> = {
            npc_gardener: 'Eden is open again. Walk the garden the way man once walked beside the Source — not from exile.',
            npc_mabel: 'The Fair remembers 1904. Recovery takes souls who refuse to forget.',
        };
        return tier2[npcId] ?? null;
    }

    return null;
}

/** After claiming a relic / resonance shift */
export function truthRelicLine(c: GameCharacter): string | null {
    const tier = truthDepthTier(c);
    if (tier < 1) return null;

    if (asked(c, 'give_back') || asked(c, 'transparency')) {
        return pick([
            'Another fragment claimed — lay it on the altar, not in your hoard.',
            'Relics answer one another. Give the gathering back to the Source when pride whispers keep.',
        ]);
    }
    if (tier >= 2) {
        return 'The relic is yours to carry — for now. Givers of light do not clutch what was lent.';
    }
    return null;
}

/** New hut bulletin while roaming */
export function truthBulletinPing(title: string): string {
    return `Fresh word at the Hut — "${title}". I left it for walking souls, not only for those who linger indoors.`;
}

/** Tier label for profile / future UI */
export function truthTierLabel(c: GameCharacter): string {
    const tier = truthDepthTier(c);
    if (witness(c)) return 'Witness to the Last Run';
    if (tier === 3) return 'Confidant of Anthony';
    if (tier === 2) return 'Trusted';
    if (tier === 1) return 'Known';
    return 'Stranger';
}