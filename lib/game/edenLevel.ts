// ============================================================
//  EDEN LEVEL — the spine of the garden-within-the-game.
//
//  Hydrates the whole of Eden (rivers, guardians, lore, chests,
//  springs, the Bestiary, cultivation, the Serpent arc) from
//  character.discovered[], guides the wanderer river by river,
//  and feeds the minimap. All content modules are stitched in
//  here; the renderer (EdenWorld.tsx) consumes this shape.
// ============================================================

import type { GameCharacter } from '@/lib/store/useGameStore';
import { canSeeHiddenPlaces } from '@/lib/game/pathPowers';
import type { DestinationMapGate, DestinationMapPoi } from '@/lib/game/mapReveal';
import {
    EDEN_MAP_W, EDEN_MAP_H, EDEN_TILE,
    EDEN_SPAWN, EDEN_GARDENER, EDEN_TREE_OF_LIFE, EDEN_TREE_OF_KNOWLEDGE, EDEN_CHERUB,
    EDEN_RIVERS_V2, EDEN_RIVER_ORDER, edenRegionAt, EDEN_REGIONS,
    edenKey, type EdenRiverId, type EdenRegionId,
} from '@/lib/game/eden/atlas';
import {
    buildEdenOverworld, isEdenWalkable, edenNearestWalkable,
    EDEN_GATES, edenGateOpen,
} from '@/lib/game/edenOverworld';
import type {
    EdenLevelState, EdenChest, EdenSpring, EdenFightZone, EdenLoreStone,
    EdenSerpentChoice,
} from '@/lib/game/eden/types';
import { EDEN_COMBATS, edenCombat } from '@/lib/game/eden/combats';
import { EDEN_CREATURES, namedCreatureIds } from '@/lib/game/eden/bestiary';
import { harvestedFruitIds } from '@/lib/game/eden/cultivation';
import { EDEN_SERPENT_BEATS, beatChoice, knowledgeOutcomeFrom } from '@/lib/game/eden/serpent';

export { EDEN_MAP_W, EDEN_MAP_H, EDEN_TILE };
export { EDEN_COMBATS, edenCombat };
export type { EdenLevelState } from '@/lib/game/eden/types';
export const EDEN_VIEW_TILES = 13;

// ------------------------------------------------------------
//  Lore — 10 inscriptions, two per "axis" of the garden.
// ------------------------------------------------------------
const LORE: { id: string; gx: number; gy: number; region: EdenRegionId; title: string; text: string }[] = [
    { id: 'threshold', gx: 48, gy: 62, region: 'threshold',
        title: 'Inscription at the Threshold',
        text: 'You stand where the first man walked beside the Source — not beneath it, not afar. Shame had not yet entered the garden. Every road you will walk leads back to this hour.' },
    { id: 'naming', gx: 14, gy: 62, region: 'outer_grove',
        title: 'The First Work',
        text: 'Before there were prayers there were names. The man was given no law but this: to look on each living thing and call it what it was. To name truly is to love without grasping.' },
    { id: 'havilah', gx: 16, gy: 40, region: 'pishon',
        title: 'The Gold of Havilah',
        text: 'Pishon compassed the land where the gold is good. Wealth was laid out before anyone hungered for it. Abundance is not the reward of the garden — it is its weather.' },
    { id: 'cush', gx: 80, gy: 40, region: 'gihon',
        title: 'The Springs of Cush',
        text: 'Gihon never ran dry, because no hand closed around it. What is shared freely cannot be spent. This is the arithmetic the world forgot at the fall.' },
    { id: 'ordering', gx: 40, gy: 40, region: 'verge',
        title: 'The Ordering of Waters',
        text: 'One river went out of Eden and parted into four heads — four directions, four memories. To attune them in order is to remember how the world was shaped before man chose the lie.' },
    { id: 'serpent', gx: 56, gy: 30, region: 'verge',
        title: 'Before the Voice',
        text: 'Here stood the tree of knowing good and evil. A voice asked whether the Source had truly spoken — and for the first time, the man listened to another counsel. The fall was not a pit. It was the hour he stopped walking beside the Source.' },
    { id: 'assyria', gx: 16, gy: 12, region: 'hiddekel',
        title: 'The Swift Water',
        text: 'Hiddekel ran toward Assyria faster than thought. Swiftness was a gift here, never a flight. The garden never asked you to hurry — only to keep walking.' },
    { id: 'euphrates', gx: 80, gy: 12, region: 'euphrates',
        title: 'The Great River',
        text: 'Euphrates waters every age that came after. The longest memory belongs not to what reigned but to what served. The fourth head closes the ordering and opens the way north.' },
    { id: 'exile', gx: 40, gy: 14, region: 'antechamber',
        title: 'The Guarded Way Back',
        text: 'When they left, the cherubim did not chase them into the wilderness. They kept the way back — as they do now — for any soul willing to lay down the lie and return.' },
    { id: 'sanctum', gx: 56, gy: 9, region: 'antechamber',
        title: 'The Tree Remembers',
        text: 'The leaf does not wither because it remembers when death was not yet a custom of the world — when man still knew the Source by walking, not by believing from afar.' },
    { id: 'abundance', gx: 76, gy: 66, region: 'eastern_garden',
        title: 'To Work It and Keep It',
        text: 'The eastern beds were the first man\'s charge: to dress the garden and to keep it. Labour here was not the wage of the fall — it was love made visible, the hand returning to the ground the care the ground first gave to it.' },
];

// ------------------------------------------------------------
//  Chests & springs (health + a hidden cache). Keys are vestigial
//  in the open garden; chests reward health, lore, or a secret.
// ------------------------------------------------------------
const CHESTS: Omit<EdenChest, 'opened'>[] = [
    { id: 'threshold', gx: 52, gy: 64, region: 'threshold', health: 20, label: 'Threshold cache' },
    { id: 'grove', gx: 20, gy: 56, region: 'outer_grove', health: 18, label: 'Grove cache' },
    { id: 'pishon', gx: 22, gy: 30, region: 'pishon', health: 22, label: 'Havilah vault' },
    { id: 'gihon', gx: 76, gy: 30, region: 'gihon', health: 22, label: 'Spring vault' },
    { id: 'euphrates', gx: 84, gy: 16, region: 'euphrates', health: 24, label: 'River vault' },
    { id: 'antechamber', gx: 40, gy: 10, region: 'antechamber', health: 25, label: 'Antechamber cache' },
    { id: 'eastern', gx: 88, gy: 64, region: 'eastern_garden', health: 22, label: 'Eastern Garden store' },
    { id: 'secret', gx: 56, gy: 36, region: 'verge', health: 30, label: 'The Compartment Beneath Memory', hidden: true },
];

const SPRINGS: Omit<EdenSpring, 'collected'>[] = [
    { id: 'entry', gx: 44, gy: 60, region: 'threshold', amount: 18 },
    { id: 'grove', gx: 12, gy: 54, region: 'outer_grove', amount: 18 },
    { id: 'pishon', gx: 12, gy: 44, region: 'pishon', amount: 20 },
    { id: 'gihon', gx: 86, gy: 44, region: 'gihon', amount: 20 },
    { id: 'hiddekel', gx: 24, gy: 8, region: 'hiddekel', amount: 22 },
    { id: 'verge', gx: 48, gy: 44, region: 'verge', amount: 20 },
    { id: 'eastern', gx: 68, gy: 64, region: 'eastern_garden', amount: 20 },
    { id: 'euphrates', gx: 88, gy: 18, region: 'euphrates', amount: 22 },
];

// ------------------------------------------------------------
//  Fight zones — 3 southern lessons + 4 river guardians + Cherub.
//  (Serpent traps are event-fired, not standing zones.)
// ------------------------------------------------------------
const LESSONS: { id: string; gx: number; gy: number; radius: number; combatId: string; hint: string }[] = [
    { id: 'fight_lesson_1', gx: 40, gy: 56, radius: 22, combatId: 'eden_lesson_1', hint: 'A lone shade roams the threshold road. Learn Strike and Dodge.' },
    { id: 'fight_lesson_2', gx: 20, gy: 52, radius: 22, combatId: 'eden_lesson_2', hint: 'Shades drift up from the outer grove. Keep moving — they share their turns.' },
    { id: 'fight_lesson_3', gx: 74, gy: 52, radius: 22, combatId: 'eden_lesson_3', hint: 'Caster shades hold the eastern beds. Close the gap after each volley.' },
];

/** Legacy-compatible lore map for the Journal panel (keyed `lore_<id>`). */
export const EDEN_LORE: Record<string, { title: string; text: string }> =
    Object.fromEntries(LORE.map((l) => [`lore_${l.id}`, { title: l.title, text: l.text }]));

/** Legacy-compatible Gardener wing greetings (keyed `wing_<regionId>`). */
export const EDEN_GARDENER_LINES: Record<string, string> =
    Object.fromEntries(EDEN_REGIONS.map((r) => [`wing_${r.id}`, r.enter]));

const snapTile = (gx: number, gy: number, level: EdenLevelState): { gx: number; gy: number } =>
    edenNearestWalkable(gx, gy, level);

// A permissive level for snapping content at build time (gates open,
// sanctum closed — content never sits on gate tiles or sanctum water).
const SNAP_LEVEL = {
    bossGateOpen: true, sanctumOpen: false, fights: [], riversLit: [0, 1, 2, 3],
} as unknown as EdenLevelState;

export function freshEdenState(): EdenLevelState {
    const chests: EdenChest[] = CHESTS.map((c) => {
        const s = snapTile(c.gx, c.gy, SNAP_LEVEL);
        return { ...c, gx: s.gx, gy: s.gy, opened: false };
    });
    const springs: EdenSpring[] = SPRINGS.map((p) => {
        const s = snapTile(p.gx, p.gy, SNAP_LEVEL);
        return { ...p, gx: s.gx, gy: s.gy, collected: false };
    });
    const loreStones: EdenLoreStone[] = LORE.map((l) => {
        const s = snapTile(l.gx, l.gy, SNAP_LEVEL);
        return { ...l, gx: s.gx, gy: s.gy, read: false };
    });

    const fights: EdenFightZone[] = [
        ...LESSONS.map((f) => ({ ...f, cleared: false })),
        ...EDEN_RIVER_ORDER.map((id): EdenFightZone => {
            const g = EDEN_RIVERS_V2[id].guardian;
            const s = snapTile(g.at.gx, g.at.gy, SNAP_LEVEL);
            return {
                id: `fight_g_${id}`, gx: s.gx, gy: s.gy, radius: g.radius,
                combatId: g.combatId, cleared: false, river: id,
                hint: `${g.name} bars the ${EDEN_RIVERS_V2[id].name}. Fell it, then light the fountain.`,
            };
        }),
        {
            id: 'fight_cherub', gx: EDEN_CHERUB.at.gx, gy: EDEN_CHERUB.at.gy,
            radius: EDEN_CHERUB.radius, combatId: EDEN_CHERUB.combatId, cleared: false, boss: true,
            hint: 'The Cherub of the Flaming Sword bars the Tree of Life. Dodge the red rings.',
        },
    ];

    return {
        chests, springs, fights, loreStones,
        riversLit: [], bossGateOpen: false, sanctumOpen: false,
        named: [], fruitsHarvested: [], serpent: {}, knowledgeOutcome: 'none', secretsFound: [],
    };
}

// ------------------------------------------------------------
//  Hydration from discovered[] / cleared / inventory
// ------------------------------------------------------------
export function hydrateEdenState(character: GameCharacter): EdenLevelState {
    const base = freshEdenState();
    const disc = new Set(character.discovered);
    const has = (kind: Parameters<typeof edenKey>[0], id: string) => disc.has(edenKey(kind, id));

    const chests = base.chests.map((c) => ({ ...c, opened: has('chest', c.id) }));
    const springs = base.springs.map((p) => ({ ...p, collected: has('spring', p.id) }));
    const loreStones = base.loreStones.map((s) => ({ ...s, read: has('lore', s.id) }));
    const fights = base.fights.map((f) => ({
        ...f,
        cleared: has('fight', f.id) || (f.boss === true && character.cleared.includes('dest_eden')),
    }));

    // rivers lit, in canonical Genesis order
    const riversLit: number[] = [];
    EDEN_RIVER_ORDER.forEach((id, i) => { if (has('river', id)) riversLit.push(i); });

    const serpent: Record<string, EdenSerpentChoice> = {};
    for (const b of EDEN_SERPENT_BEATS) {
        const ch = beatChoice(b.id, character.discovered);
        if (ch) serpent[b.id] = ch;
    }

    const secretsFound = character.discovered
        .filter((d) => d.startsWith('eden_secret_'))
        .map((d) => d.slice('eden_secret_'.length));

    let state: EdenLevelState = {
        ...base,
        chests, springs, loreStones, fights, riversLit, serpent,
        named: namedCreatureIds(character.discovered),
        fruitsHarvested: harvestedFruitIds(character.discovered),
        knowledgeOutcome: knowledgeOutcomeFrom(character.discovered),
        secretsFound,
    };
    return updateEdenProgress(state);
}

/** Recompute the doors-of-progress: cherub gate + sanctum. */
export function updateEdenProgress(level: EdenLevelState): EdenLevelState {
    const bossGateOpen = level.riversLit.length >= EDEN_RIVER_ORDER.length;
    const sanctumOpen = level.fights.find((f) => f.boss)?.cleared ?? false;
    return { ...level, bossGateOpen, sanctumOpen };
}

/** Serialize the level-owned facets back into discovered[] keys. */
export function edenDiscoveriesFromState(level: EdenLevelState, extra: string[] = []): string[] {
    const out = [...extra];
    for (const c of level.chests) if (c.opened) out.push(edenKey('chest', c.id));
    for (const p of level.springs) if (p.collected) out.push(edenKey('spring', p.id));
    for (const f of level.fights) if (f.cleared) out.push(edenKey('fight', f.id));
    for (const s of level.loreStones) if (s.read) out.push(edenKey('lore', s.id));
    for (const id of level.secretsFound) out.push(edenKey('secret', id));
    EDEN_RIVER_ORDER.forEach((id, i) => { if (level.riversLit.includes(i)) out.push(edenKey('river', id)); });
    return out;
}

// ------------------------------------------------------------
//  Helpers the renderer & codex share
// ------------------------------------------------------------
export function allEdenLoreRead(level: EdenLevelState): boolean {
    return level.loreStones.every((s) => s.read);
}
export function canRevealEdenSecret(level: EdenLevelState, character: GameCharacter): boolean {
    return allEdenLoreRead(level) || canSeeHiddenPlaces(character);
}
export function edenZoneLabel(gx: number, gy: number): string | null {
    return edenRegionAt(gx, gy)?.name ?? null;
}
export function edenWingId(gx: number, gy: number): EdenRegionId | null {
    return edenRegionAt(gx, gy)?.id ?? null;
}
export function edenWingGreeting(regionId: EdenRegionId): string {
    return EDEN_REGIONS.find((r) => r.id === regionId)?.enter ?? '';
}
export const EDEN_RESPAWN_LINE =
    'Rest here. The garden does not abandon those who stumble — only those who choose the lie again.';

export function isEdenSolid(gx: number, gy: number, level: EdenLevelState, barrierActive: boolean): boolean {
    return !isEdenWalkable(gx, gy, level, barrierActive);
}

/**
 * The theme colour a given Eden fight should glow in. River guardians and
 * their serpent-trap ambushes take their river's biome colour; the Cherub
 * burns its flaming-sword red; tutorials keep the garden emerald.
 */
export function edenCombatAccent(combatId: string): string {
    if (combatId === EDEN_CHERUB.combatId) return '#ef4444';
    for (const id of EDEN_RIVER_ORDER) {
        if (combatId === `eden_g_${id}` || combatId === `eden_serpent_${id}` || combatId === `eden_echo_${id}`) {
            return EDEN_RIVERS_V2[id].color;
        }
    }
    return '#34d399';
}

/** A minimal Destination shim so CombatScene can run an Eden fight. */
export function edenDestinationStub(combatId: string) {
    return {
        poiId: 'dest_eden',
        kind: 'portal' as const,
        name: 'Eden — Before the Fall',
        era: '',
        accent: edenCombatAccent(combatId),
        bg: ['#0a1f17', '#04100b'] as [string, string],
        guide: { name: 'The Gardener', role: '', tile: { col: 0, row: 8 }, intro: '' },
        lore: [],
        relics: [],
        combat: edenCombat(combatId),
    };
}

// ============================================================
//  MINIMAP
// ============================================================
export const EDEN_MINIMAP_TERRAIN_COLORS: Record<number, string> = {
    0: '#3d6b35', 1: '#8b6914', 2: '#1e4d7a',
};
export function edenMinimapTerrain(): number[][] {
    return buildEdenOverworld().ground;
}
export function edenMinimapGates(level: EdenLevelState): DestinationMapGate[] {
    return EDEN_GATES.map((g) => ({ id: g.id, tiles: g.tiles, open: edenGateOpen(g.id, level) }));
}
export function edenMinimapPois(
    level: EdenLevelState,
    opts: { secretVisible: boolean; relicClaimed: boolean },
): DestinationMapPoi[] {
    const pois: DestinationMapPoi[] = [
        { id: 'spawn', gx: EDEN_SPAWN.gx, gy: EDEN_SPAWN.gy, kind: 'spawn' },
        { id: 'gardener', gx: EDEN_GARDENER.gx, gy: EDEN_GARDENER.gy, kind: 'npc' },
        { id: 'tree_life', gx: EDEN_TREE_OF_LIFE.gx, gy: EDEN_TREE_OF_LIFE.gy, kind: 'tree', muted: opts.relicClaimed },
        { id: 'tree_knowledge', gx: EDEN_TREE_OF_KNOWLEDGE.gx, gy: EDEN_TREE_OF_KNOWLEDGE.gy, kind: 'temptation' },
    ];
    for (const ls of level.loreStones) pois.push({ id: ls.id, gx: ls.gx, gy: ls.gy, kind: 'lore', muted: ls.read });
    for (const ch of level.chests) {
        if (ch.hidden && !opts.secretVisible) continue;
        pois.push({ id: ch.id, gx: ch.gx, gy: ch.gy, kind: 'chest', secret: ch.hidden, muted: ch.opened });
    }
    for (const sp of level.springs) pois.push({ id: sp.id, gx: sp.gx, gy: sp.gy, kind: 'health', muted: sp.collected });
    for (const fz of level.fights) {
        pois.push({ id: fz.id, gx: fz.gx, gy: fz.gy, kind: 'boss', muted: fz.cleared });
    }
    // fountains
    EDEN_RIVER_ORDER.forEach((id, i) => {
        const rv = EDEN_RIVERS_V2[id];
        pois.push({ id: `river_${id}`, gx: rv.fountain.gx, gy: rv.fountain.gy, kind: 'river', color: rv.color, muted: !level.riversLit.includes(i) });
    });
    // unnamed creatures (targets) + named (muted)
    for (const cr of EDEN_CREATURES) {
        pois.push({ id: `cr_${cr.id}`, gx: cr.home.gx, gy: cr.home.gy, kind: 'npc', muted: level.named.includes(cr.id) });
    }
    // unresolved serpent beats
    for (const b of EDEN_SERPENT_BEATS) {
        if (!level.serpent[b.id]) pois.push({ id: `serp_${b.id}`, gx: b.at.gx, gy: b.at.gy, kind: 'temptation' });
    }
    return pois;
}

// ============================================================
//  THE GARDENER'S GUIDANCE — current objective + escalating hints
// ============================================================
export interface EdenGuideContext {
    isGuardianCleared: boolean;
    isSolved: boolean;
    relicClaimed: boolean;
    hasWeapon: boolean;
}
export interface EdenGuideStep {
    id: string;
    objective: string;
    tip: string;
    waypoint: { gx: number; gy: number } | null;
    timedHints: [string, string, string];
}
function step(
    id: string, objective: string, tip: string,
    waypoint: { gx: number; gy: number } | null,
    h1: string, h2: string, h3: string,
): EdenGuideStep {
    return { id, objective, tip, waypoint, timedHints: [h1, h2, h3] };
}
const G = (s: string) => `【The Gardener】 ${s}`;
const loreRead = (l: EdenLevelState, id: string) => l.loreStones.find((s) => s.id === id)?.read ?? false;
const fightDone = (l: EdenLevelState, id: string) => l.fights.find((f) => f.id === id)?.cleared ?? false;
const guardianDone = (l: EdenLevelState, river: EdenRiverId) =>
    l.fights.find((f) => f.river === river)?.cleared ?? false;

/** Seconds without progress before the Gardener's hints escalate. */
export const EDEN_HINT_DELAYS_SEC = [12, 26, 44] as const;

export function edenGuideStep(level: EdenLevelState, ctx: EdenGuideContext): EdenGuideStep {
    if (ctx.relicClaimed) {
        return step('done', 'The Leaf is yours', 'Return to the overworld when ready.', null,
            G('Your work in Eden is complete.'), G('Carry the Leaf forward.'), G('The garden remembers you.'));
    }

    // claim
    if (level.sanctumOpen && ctx.isSolved) {
        return step('claim', 'Claim the Leaf of Life', 'Stand beneath the Tree in the north sanctum.',
            { gx: EDEN_TREE_OF_LIFE.gx, gy: EDEN_TREE_OF_LIFE.gy + 2 },
            G('The Tree of Life glows beyond the pool. Step onto the spine landing beneath it.'),
            G('North sanctum — the green pulsing tree holds the Leaf.'),
            G('Walk directly under the Tree of Life. The Leaf awaits.'));
    }
    // post-cherub, pre-claim (rivers already lit so isSolved true; this rarely triggers)
    if (ctx.isGuardianCleared || fightDone(level, 'fight_cherub')) {
        return step('reach_sanctum', 'Enter the sanctum', 'Walk north to the Tree of Life.',
            { gx: EDEN_TREE_OF_LIFE.gx, gy: EDEN_TREE_OF_LIFE.gy + 3 },
            G('The flaming sword has lowered. Walk north along the spine.'),
            G('The sanctum pool surrounds the Tree. Head north.'),
            G('Follow the spine north. The Tree of Life glows beyond the water.'));
    }
    // cherub
    if (level.bossGateOpen) {
        return step('cherub', 'Face the Cherub', 'The north road has opened past the Verge.',
            { gx: EDEN_CHERUB.at.gx, gy: EDEN_CHERUB.at.gy },
            G('The four rivers are lit — the Cherub road north is open. Approach when your vitality is high.'),
            G('Red dashed circle ahead: the Cherub of the Flaming Sword. Rest at red springs first.'),
            G('The pulsing marker leads to the last guardian. This is the final gate.'));
    }

    // first stone
    if (!loreRead(level, 'threshold')) {
        return step('lore_threshold', 'Read the threshold stone', 'Tap Read at the golden ◆ near spawn.',
            { gx: 48, gy: 62 },
            G('The golden ◆ on the threshold road is your first inscription. Tap Read when close.'),
            G('Begin at the threshold stone, then roam — every road loops back here.'),
            G('Walk to the glowing ◆ just north of where you woke.'));
    }
    // first lesson
    if (!fightDone(level, 'fight_lesson_1')) {
        return step('lesson_1', 'Clear the first shade trial',
            ctx.hasWeapon ? 'Step into the gold dashed circle to the north-west.' : 'Forge a weapon at Truth\'s Hut first.',
            { gx: 40, gy: 56 },
            G(ctx.hasWeapon ? 'The first trial is the gold dashed circle nearby. Step in when ready.' : 'You need a weapon from Truth\'s Hut before the shades will engage.'),
            G('A lone shade roams the threshold road. Dodge its lunge, strike on the recovery.'),
            G('Dark trees are walls; grass and dirt roads are open. Circle to the trial.'));
    }

    // the four rivers, in order
    const litCount = level.riversLit.length;
    if (litCount < EDEN_RIVER_ORDER.length) {
        const nextId = EDEN_RIVER_ORDER[litCount];
        const rv = EDEN_RIVERS_V2[nextId];
        const ord = `(${litCount + 1}/4)`;
        if (!guardianDone(level, nextId)) {
            return step(`guardian_${nextId}`, `Fell the guardian of the ${rv.name} ${ord}`,
                ctx.hasWeapon ? `${rv.guardian.name} guards the ${rv.land}.` : 'Arm yourself at Truth\'s Hut first.',
                { gx: rv.guardian.at.gx, gy: rv.guardian.at.gy },
                G(`The ${rv.name} runs through ${rv.land}. ${rv.guardian.name} bars its fountain — the dashed circle marks the fight.`),
                G(`Rivers light in order: ${EDEN_RIVER_ORDER.map((r) => EDEN_RIVERS_V2[r].name).join(' → ')}. ${rv.name} is next.`),
                G('Follow the pulsing marker. Red springs restore vitality before the fight.'));
        }
        return step(`attune_${nextId}`, `Light the ${rv.name} fountain ${ord}`,
            'Stand on the glowing fountain to attune it.',
            { gx: rv.fountain.gx, gy: rv.fountain.gy },
            G(`${rv.guardian.name} has fallen. Step onto the ${rv.name} fountain — it will catch light.`),
            G(`The lit fountains send a line toward the Tree. ${rv.name} is the ${ordinal(litCount + 1)} to light.`),
            G('The glowing fountain marks your next river. Stand on it.'));
    }

    return step('explore', 'Roam the garden', 'Name the creatures, tend the beds, read the ◆ stones.',
        { gx: EDEN_TREE_OF_KNOWLEDGE.gx, gy: EDEN_TREE_OF_KNOWLEDGE.gy },
        G('Roam freely — roads connect every wing. Name the living creatures and work the beds as you go.'),
        G('Red springs restore vitality. Gold ◆ stones hold lore. Dashed circles are trials.'),
        G('When the four rivers are lit, the Cherub road north will open.'));
}

function ordinal(n: number): string {
    return ['first', 'second', 'third', 'fourth', 'fifth'][n - 1] ?? `${n}th`;
}
