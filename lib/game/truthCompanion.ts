import { TILE } from '@/lib/game/overworld';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { truthDepthTier } from '@/lib/game/truthLore';

const FOLLOW_DIST = TILE * 2.2;
const CATCHUP_SPD = 78;
const IDLE_SPD = 52;

export interface TruthCompanionState {
    x: number;
    y: number;
}

export function initTruthCompanion(hutX: number, hutY: number): TruthCompanionState {
    return { x: (hutX + 0.5) * TILE, y: (hutY + 2.2) * TILE };
}

/** Move Truth toward the player, lagging slightly behind. */
export function updateTruthCompanion(
    truth: TruthCompanionState,
    px: number,
    py: number,
    dt: number,
    solidAt: (wx: number, wy: number) => boolean,
): TruthCompanionState {
    const dx = px - truth.x;
    const dy = py - truth.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < FOLLOW_DIST * 0.6) return truth;

    const targetX = px - (dx / dist) * FOLLOW_DIST * 0.85;
    const targetY = py - (dy / dist) * FOLLOW_DIST * 0.85;
    const tdx = targetX - truth.x;
    const tdy = targetY - truth.y;
    const td = Math.hypot(tdx, tdy) || 1;
    const spd = dist > FOLLOW_DIST * 2.5 ? CATCHUP_SPD : IDLE_SPD;

    let nx = truth.x + (tdx / td) * spd * dt;
    let ny = truth.y + (tdy / td) * spd * dt;
    const fy = 5;
    if (solidAt(nx, truth.y + fy)) nx = truth.x;
    if (solidAt(truth.x, ny + fy)) ny = truth.y;

    return { x: nx, y: ny };
}

const BASE_POI_LINES: Record<string, string> = {
    hut: 'The Hut holds my dispatch — and if you dare to ask, my account. Enter, and open Ask Truth.',
    dest_eden: 'The garden is open. Roam its roads, read the golden stones, and walk north toward the Tree.',
    dest_fair: 'Twelve hundred palaces of white — raised in a season, torn down the next.',
    dest_giza: 'The stone still hums. Listen before you strike.',
    dest_kolbrin: 'Books the kings tried to burn. The ink outlives the fire.',
    dest_emerald: 'Thrice-great — in life, in death, and in what lies beyond both.',
    npc_gardener: 'The Gardener waits by Eden\'s gate. Speak with him — then step through and walk the open garden.',
    npc_mabel: 'Mabel chronicled what they erased from the Fair.',
    npc_hermes: 'Hermes keeps the Emerald Tablets. Speak with him — then step through when the seven spheres align.',
};

const HUT_LINES_BY_TIER: Record<0 | 1 | 2 | 3, string[]> = {
    0: [BASE_POI_LINES.hut],
    1: [
        'You have begun to pry. Good. The hood does not mean I have nothing to say.',
        'Return to Ask Truth when the road grows heavy. I am not only a guide — I am a man in recovery.',
    ],
    2: [
        'You know my name now. Few do. Do not wield it as gossip — wield it as prayer.',
        'The wilderness is where I stand. Your steps beside me are not small to the Source.',
        'Ask about the thorn if you are ready. Some sorrows are only healed at the Source.',
    ],
    3: [
        'Anthony walks with you — not only Truth. What you have heard, carry it as light.',
        'This may be my last run. If you finish what I could not, the world will see givers — not takers.',
    ],
};

/** Lines Truth speaks while following — tiered by how much the soul has pried */
const WANDER_LINES: Record<0 | 1 | 2 | 3, string[]> = {
    0: [
        'Stay on the road. The shades test what is unarmed.',
        'The Hut is center. Return when you need the word.',
        'I follow — not to watch you fail, but to witness you rise.',
        'Come back to my Hut when you can — I have set something aside there for you. Go and see.',
    ],
    1: [
        'Each question you asked lives in me. Ask more when you are ready.',
        'I was weak once. I am still imperfect. Keep walking anyway.',
        'The Source did not leave you alone. Neither will I.',
        'Do not roam past my Hut. What I have gathered for you waits inside — more than word.',
    ],
    2: [
        'Seven years in a cell carved the mission into me. I ran anyway. Do not repeat my detour.',
        'My family is why I fight. Your interest fuels what the wilderness tried to kill.',
        'Transparency is the only freedom I trust now.',
        'Sorrow once had me reaching for the cup. The Source\'s water is the only drink that quenches.',
        'Fasting broke the cup for me — uneven at first, faithful over time. Forgiveness and prayer still arm me.',
        'Every day is a fight. Empty the flesh, or the monster wins by default.',
        'My Hut holds more than dispatch — the offering, the library, gifts laid by. Return and see what I keep for you.',
    ],
    3: [
        'We are givers of light on this run — or we are nothing.',
        'I do not know why the burden fell on me. I know I must go all the way.',
        'When you give it back to the Source, you will be made strong in the very place you were ashamed.',
        'You cannot drink your thirst away. Go back to the Source — I am still learning that road with you.',
        'The shades you strike teach what I learned in fasting — empty the flesh, and the spirit can stand.',
        'Share the vision. Fuel it if you can. Learn from my mishaps — that is how you honor me.',
        'The 400 Series must breathe. Buried wisdom does not recover itself.',
        'Some nights I fight alone in a foreign land. Your steps beside me are not small.',
        'Come back to my Hut, friend — new word, the offering, the work. I have laid it all out for you.',
    ],
};

/** @deprecated use getTruthProximityLine */
export const TRUTH_PROXIMITY_LINES: Record<string, string> = BASE_POI_LINES;

export function getTruthProximityLine(poiId: string, c: GameCharacter): string | null {
    if (poiId === 'hut') {
        const tier = truthDepthTier(c);
        const pool = HUT_LINES_BY_TIER[tier];
        return pool[Math.floor(Math.random() * pool.length)];
    }
    return BASE_POI_LINES[poiId] ?? null;
}

/** Occasional line while Truth trails the player */
export function getTruthWanderLine(c: GameCharacter): string {
    const tier = truthDepthTier(c);
    const pool = WANDER_LINES[tier];
    return pool[Math.floor(Math.random() * pool.length)];
}