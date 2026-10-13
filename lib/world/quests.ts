/**
 * The plain's quests and the soul's rise through them.
 *
 * A quest is a short chain of steps a named soul on the plain hands you.
 * Steps are one of: visit a landmark, gather N of a pickup, stand still at
 * a place (meditate), or carry something back to someone. Rewards are
 * experience (which raises your level and title) and skill points (which
 * the Paths spend). Progress lives on the character (game_state) so it
 * follows the soul.
 */
import type { NpcId, PickupKind } from './plain';
import type { PlaceId } from './terrain';
import type { Discipline } from './disciplines';
import type { EquipSlot } from './items';

/** The plain's creatures that fight back (enemies.ts) */
export type EnemyKind = 'slime' | 'blob' | 'spore' | 'wolf' | 'shade' | 'wisp' | 'bull';

export type QuestStep =
    | { kind: 'talk'; npc: NpcId; text: string }
    | { kind: 'visit'; place: PlaceId; text: string }
    | { kind: 'visitAll'; places: string[]; text: string }
    | { kind: 'gather'; item: PickupKind; n: number; text: string }
    | { kind: 'meditate'; place: PlaceId; seconds: number; text: string }
    | { kind: 'deliver'; npc: NpcId; item: PickupKind; text: string }
    | { kind: 'kill'; enemy: EnemyKind; n: number; text: string }
    | { kind: 'practice'; discipline: Discipline; text: string };

export type Quest = {
    id: string;
    name: string;
    giver: NpcId;
    /** said when offered */
    offer: string[];
    /** said when turned in */
    done: string[];
    steps: QuestStep[];
    xp: number;
    skillPoints: number;
    /** denarii paid on completion */
    coins?: number;
    /** items handed over on completion */
    items?: Record<string, number>;
    /** must be done first (all of them) */
    after?: string | string[];
};

const ALL_QUESTS: Quest[] = [
    {
        id: 'first_steps',
        name: 'First Steps',
        giver: 'truth',
        offer: [
            'So. You walked out. Most never do.',
            'There is a signpost where the roads meet, south of here. Go and read it, then come back and tell me what it said.',
        ],
        done: ['You read it. Good. Now you know this plain has more than one way across it.', 'Keep walking. The roads reward feet.'],
        steps: [
            { kind: 'visit', place: 'crossroads', text: 'Find the signpost at the Crossroads' },
            { kind: 'talk', npc: 'truth', text: 'Return to Truth at the gate' },
        ],
        xp: 60,
        skillPoints: 1,
    },
    {
        id: 'motes',
        name: 'What the Light Leaves',
        giver: 'truth',
        after: 'first_steps',
        offer: ['Light leaves pieces of itself in the grass. Motes. They are worth more than they look.', 'Bring me five. You will find them low, in the meadow between here and the Crossroads.'],
        done: ['Five. You looked where others walk past.', 'Keep them close. The plain gives to those who gather.'],
        steps: [
            { kind: 'gather', item: 'mote', n: 5, text: 'Gather 5 light motes in the meadow' },
            { kind: 'talk', npc: 'truth', text: 'Bring the motes to Truth' },
        ],
        xp: 90,
        skillPoints: 0,
    },
    {
        id: 'lilies',
        name: 'Lilies for the Well',
        giver: 'hana',
        offer: ['The Mirror Well in the house has gone dull. It wants lilies from the still water.', 'Six. Wade for them; the water only takes your knees.'],
        done: ['Six lilies. The well will shine for a week on these.', 'Come back when the water is still. It usually is.'],
        steps: [
            { kind: 'gather', item: 'lily', n: 6, text: 'Gather 6 lilies from the Still Water' },
            { kind: 'talk', npc: 'hana', text: 'Bring the lilies to Hana at the pier' },
        ],
        xp: 110,
        skillPoints: 0,
    },
    {
        id: 'cairns',
        name: 'The Four Cairns',
        giver: 'eli',
        offer: ['There are four stone markers on the shoulders of the Rise. North, east, south, west.', 'Stand at each. The hill remembers who climbs it.'],
        done: ['All four. Most quit after two; the west one hides.', 'Now you know the hill. It knows you back.'],
        steps: [
            { kind: 'visitAll', places: ['cairn_n', 'cairn_e', 'cairn_s', 'cairn_w'], text: 'Stand at the four cairns on the Rise' },
            { kind: 'talk', npc: 'eli', text: 'Tell Eli in the fields' },
        ],
        xp: 140,
        skillPoints: 1,
    },
    {
        id: 'stillness',
        name: 'Stillness',
        giver: 'keeper',
        offer: ['You have been moving since you arrived. Everyone does.', 'Stand in the centre of the circle and be still. Twelve breaths. If you move, it starts again.'],
        done: ['There. That was the hardest thing you did today, and nothing happened.', 'That is the point.'],
        steps: [
            { kind: 'meditate', place: 'circle', seconds: 12, text: 'Be still at the centre of the Stone Circle' },
            { kind: 'talk', npc: 'keeper', text: 'Speak to the Keeper' },
        ],
        xp: 160,
        skillPoints: 1,
    },
    {
        id: 'embers',
        name: 'Scattered Embers',
        giver: 'lanternkeeper',
        offer: ['The hollow\'s lanterns went out and the embers scattered into the moss.', 'Seven glowing ones. They are easy to see and hard to reach.'],
        done: ['Seven embers. The hollow will have its lanterns back by dark.', 'You are not afraid of the trees. Good.'],
        steps: [
            { kind: 'gather', item: 'ember', n: 7, text: 'Gather 7 glowing embers in Pine Hollow' },
            { kind: 'talk', npc: 'lanternkeeper', text: 'Bring the embers to Ama' },
        ],
        xp: 150,
        skillPoints: 0,
    },
    {
        id: 'carry_the_word',
        name: 'Carry the Word',
        giver: 'scribe',
        offer: ['I wrote something up here that should be read down there.', 'The scroll is by the shrine. Take it to Truth at the gate. Do not read it on the way; you will anyway.'],
        done: ['He read it, then? Good. A word carried is worth ten kept.'],
        steps: [
            { kind: 'gather', item: 'scroll', n: 1, text: 'Take the scroll from the Summit Shrine' },
            { kind: 'deliver', npc: 'truth', item: 'scroll', text: 'Carry the scroll to Truth at the gate' },
            { kind: 'talk', npc: 'scribe', text: 'Return to Obed on the summit' },
        ],
        xp: 200,
        skillPoints: 1,
    },
    {
        id: 'in_secret',
        name: 'In Secret',
        giver: 'truth',
        after: 'first_steps',
        offer: [
            'Strength out here does not come from the staff. It comes from three things done where nobody sees.',
            'Kneel somewhere quiet and pray — P, and hold still. Then give something to someone who has nothing. Bartimaeus sits by this road.',
        ],
        done: ['Thy Father which seeth in secret shall reward thee openly. You will feel it in your arms before long.', 'Take this oil. You will want it when you fast.'],
        steps: [
            { kind: 'practice', discipline: 'prayer', text: 'Pray somewhere quiet (hold P)' },
            { kind: 'practice', discipline: 'giving', text: 'Give alms to one of the poor of the plain' },
            { kind: 'talk', npc: 'truth', text: 'Return to Truth at the gate' },
        ],
        xp: 120,
        skillPoints: 0,
        coins: 20,
        items: { oil: 1 },
    },
    {
        id: 'the_fast',
        name: 'The Hidden Fast',
        giver: 'truth',
        after: 'in_secret',
        offer: [
            'Now the hardest one. Begin a fast from your journal and keep it one whole day of the plain. No bread, no fish. Water is allowed.',
            'Anoint your head with the oil when you begin, so nobody can tell. That is how it is kept in secret.',
        ],
        done: ['You held it. Most break by noon.', 'Wear this. Truth holds the rest of the armour together.'],
        steps: [
            { kind: 'practice', discipline: 'fasting', text: 'Keep a fast for one plain-day (Journal → Begin a fast)' },
            { kind: 'talk', npc: 'truth', text: 'Return to Truth' },
        ],
        xp: 160,
        skillPoints: 1,
        items: { belt_truth: 1 },
    },
    {
        id: 'mire',
        name: 'The Mire',
        giver: 'hana',
        after: 'lilies',
        offer: ['When it rains, slimes crawl up out of the shallows and foul the lilies.', 'Five of them. Strike with F — and roll away with Q when they rear up.'],
        done: ['The shallows are clear again. For a while.', 'Here — something from the stall for your trouble.'],
        steps: [
            { kind: 'kill', enemy: 'slime', n: 5, text: 'Drive off 5 mire slimes by the Still Water' },
            { kind: 'talk', npc: 'hana', text: 'Tell Hana at the pier' },
        ],
        xp: 110,
        skillPoints: 0,
        coins: 15,
        items: { fish: 2 },
    },
    {
        id: 'wolves',
        name: 'Wolves at the Fold',
        giver: 'eli',
        offer: ['Wolves come out of Pine Hollow at night and circle my flock.', 'Four of them. Go at dusk, and pray before you go in.'],
        done: ['The flock slept last night. First time in a week.', 'A shepherd pays what he can.'],
        steps: [
            { kind: 'kill', enemy: 'wolf', n: 4, text: 'Defeat 4 hollow wolves' },
            { kind: 'talk', npc: 'eli', text: 'Tell Eli in the fields' },
        ],
        xp: 170,
        skillPoints: 1,
        coins: 30,
    },
    {
        id: 'spores',
        name: 'Spore-kin',
        giver: 'lanternkeeper',
        after: 'embers',
        offer: ['The spore-kin wake up when the lanterns go out. Five of them are chewing at the roots of the hollow.'],
        done: ['The roots will hold. Thank you.'],
        steps: [
            { kind: 'kill', enemy: 'spore', n: 5, text: 'Clear 5 spore-kin from Pine Hollow' },
            { kind: 'talk', npc: 'lanternkeeper', text: 'Tell Ama' },
        ],
        xp: 150,
        skillPoints: 0,
        coins: 25,
        items: { honey: 1 },
    },
    {
        id: 'shades',
        name: 'Shades of the Night',
        giver: 'keeper',
        after: 'stillness',
        offer: ['After dark, or when the fog comes down, shades walk the plain. They are cold, and they are not friendly.', 'Three. Then come back, and I will give you what my mother gave me.'],
        done: ['Three shades. You are steadier than when you came.', 'This shield quenches what is thrown at it. Raise it with C.'],
        steps: [
            { kind: 'kill', enemy: 'shade', n: 3, text: 'Defeat 3 shades (they walk at night and in fog)' },
            { kind: 'talk', npc: 'keeper', text: 'Return to the Keeper' },
        ],
        xp: 220,
        skillPoints: 1,
        items: { shield_faith: 1 },
    },
    {
        id: 'the_word',
        name: 'The Word',
        giver: 'scribe',
        after: ['carry_the_word', 'the_fast', 'shades'],
        offer: ['The wisps around the summit are made of words nobody finished saying. Three of them have grown wild.', 'Quiet them, and I will put the sharpest thing on this plain in your hand.'],
        done: ['The sword of the Spirit, which is the word of God.', 'It is lighter than it looks. Do not let that fool you.'],
        steps: [
            { kind: 'kill', enemy: 'wisp', n: 3, text: 'Quiet 3 wild wisps around the summit' },
            { kind: 'talk', npc: 'scribe', text: 'Return to Obed on the summit' },
        ],
        xp: 300,
        skillPoints: 2,
        items: { sword_spirit: 1 },
    },
];

/** Truth teaches the disciplines before he sends you on errands */
const FIRST = ['first_steps', 'in_secret', 'the_fast'];
export const QUESTS: Quest[] = [
    ...ALL_QUESTS.filter((q) => FIRST.includes(q.id)).sort((a, b) => FIRST.indexOf(a.id) - FIRST.indexOf(b.id)),
    ...ALL_QUESTS.filter((q) => !FIRST.includes(q.id)),
];

export const quest = (id: string) => QUESTS.find((q) => q.id === id) ?? null;

/** Quests a given soul offers, in order */
export const questsOf = (giver: NpcId) => QUESTS.filter((q) => q.giver === giver);

/* ── progress shape (lives on the character) ─────────────────── */

export type QuestProgress = {
    /** index of the current step */
    step: number;
    done: boolean;
    /** per-item counts gathered for the current gather step */
    n?: Record<string, number>;
};

export type WorldProgress = {
    xp: number;
    quests: Record<string, QuestProgress>;
    /** landmarks and cairns discovered */
    found: string[];
    /** last edit, ms — the newer copy wins for fields that can go down */
    at?: number;
    /** item id → count */
    bag?: Record<string, number>;
    /** denarii carried — lost by half when you fall */
    coins?: number;
    /** treasure in heaven: everything ever given; never lost (6:20) */
    heaven?: number;
    /** discipline experience */
    disc?: Partial<Record<Discipline, number>>;
    /** skill nodes learned */
    skills?: string[];
    equip?: Partial<Record<EquipSlot, string>>;
    /** four quick slots (keys 1–4) */
    belt?: (string | null)[];
    /** a fast in progress, in play-seconds on the plain */
    fast?: { startedAt: number; secret: boolean } | null;
    /** seconds spent walking the plain — the fasting clock */
    playS?: number;
    /** last watch a prayer counted in */
    prayedWatch?: string;
    /** giving XP counted on a plain-day (capped per day) */
    givenDay?: { day: number; xp: number };
    /** which disciplines were practised on a plain-day — all three is the Kingdom */
    practiced?: { day: number; prayer?: boolean; fasting?: boolean; giving?: boolean };
    kills?: Record<string, number>;
    deaths?: number;
    /** the starting bag has been handed over */
    started?: boolean;
};

export const EMPTY_WORLD: WorldProgress = { xp: 0, quests: {}, found: [] };

/* ── levels ─────────────────────────────────────────────────── */

/** XP needed to reach level n (1-based) */
export function xpForLevel(n: number): number {
    if (n <= 1) return 0;
    // 100, 250, 450, 700, 1000 …
    return Math.round((50 * (n - 1) * n) + 50 * (n - 1) * (n - 1) * 0.3);
}

export function levelFor(xp: number): number {
    let n = 1;
    while (xpForLevel(n + 1) <= xp && n < 60) n++;
    return n;
}

export function levelProgress(xp: number): { level: number; into: number; need: number } {
    const level = levelFor(xp);
    const base = xpForLevel(level);
    const next = xpForLevel(level + 1);
    return { level, into: xp - base, need: next - base };
}

const TITLES: [number, string][] = [
    [1, 'Seeker'],
    [3, 'Walker'],
    [5, 'Wayfarer'],
    [8, 'Keeper'],
    [12, 'Witness'],
    [16, 'Lightbearer'],
    [22, 'Elder of the Plain'],
];

export function titleFor(level: number): string {
    let t = TITLES[0][1];
    for (const [l, name] of TITLES) if (level >= l) t = name;
    return t;
}

/* ── what to do next ─────────────────────────────────────────── */

export function activeQuests(w: WorldProgress): Quest[] {
    return QUESTS.filter((q) => w.quests[q.id] && !w.quests[q.id].done);
}

export function questAvailable(q: Quest, w: WorldProgress): boolean {
    if (w.quests[q.id]) return false;
    const after = q.after ? (Array.isArray(q.after) ? q.after : [q.after]) : [];
    if (after.some((a) => !w.quests[a]?.done)) return false;
    return true;
}

/** The step this soul is on, or null */
export function currentStep(q: Quest, w: WorldProgress): QuestStep | null {
    const p = w.quests[q.id];
    if (!p || p.done) return null;
    return q.steps[p.step] ?? null;
}

/** Items the active gather/deliver steps still want, by kind */
export function wantedItems(w: WorldProgress): Set<PickupKind> {
    const out = new Set<PickupKind>();
    for (const q of activeQuests(w)) {
        const s = currentStep(q, w);
        if (!s) continue;
        if (s.kind === 'gather') out.add(s.item);
    }
    return out;
}
