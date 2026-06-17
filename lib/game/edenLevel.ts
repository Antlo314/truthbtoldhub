import type { CombatConfig } from '@/lib/game/destinations';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { canSeeHiddenPlaces } from '@/lib/game/pathPowers';
import {
    EDEN_MAP_W,
    EDEN_MAP_H,
    EDEN_TILE,
    EDEN_GATES,
    edenGateOpen,
    buildEdenOverworld,
    isEdenWalkable,
} from '@/lib/game/edenOverworld';
import type { DestinationMapGate, DestinationMapPoi } from '@/lib/game/mapReveal';

// ============================================================
//  EDEN GARDEN — open overworld-style map (smaller than the
//  main chamber). Lore, keys, shade trials, rivers, cherub boss.
// ============================================================

export { EDEN_MAP_W, EDEN_MAP_H, EDEN_TILE };
export const EDEN_VIEW_TILES = 13;

export interface EdenDoor {
    id: string;
    gx: number;
    gy: number;
    keyId: string;
    open: boolean;
    label: string;
}

export interface EdenChest {
    id: string;
    gx: number;
    gy: number;
    keyId?: string;
    health?: number;
    label: string;
    opened: boolean;
    /** Only interactable when all lore read or Seer hidden-path ability. */
    hidden?: boolean;
}

export interface EdenPickup {
    id: string;
    gx: number;
    gy: number;
    kind: 'health';
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
}

export interface EdenLoreStone {
    id: string;
    gx: number;
    gy: number;
    title: string;
    text: string;
    read: boolean;
}

export interface EdenLevelState {
    doors: EdenDoor[];
    chests: EdenChest[];
    pickups: EdenPickup[];
    fights: EdenFightZone[];
    loreStones: EdenLoreStone[];
    keysFound: string[];
    bossGateOpen: boolean;
    sanctumOpen: boolean;
    temptationResolved: 'none' | 'accepted' | 'resisted';
}

export const EDEN_SPAWN = { gx: 28, gy: 38 };
export const EDEN_TREE = { gx: 28, gy: 6 };
export const EDEN_GARDENER = { gx: 26, gy: 37 };

export const EDEN_RIVERS = [
    { id: 0, name: 'Pishon', gx: 10, gy: 32, active: false, color: '#22d3ee' },
    { id: 1, name: 'Gihon', gx: 46, gy: 32, active: false, color: '#fbbf24' },
    { id: 2, name: 'Hiddekel', gx: 10, gy: 10, active: false, color: '#a855f7' },
    { id: 3, name: 'Euphrates', gx: 46, gy: 10, active: false, color: '#10b981' },
] as const;

/** Canonical Eden lore — synced with destinations.ts & quests. */
export const EDEN_LORE: Record<string, { title: string; text: string }> = {
    lore_threshold: {
        title: 'Inscription at the Threshold',
        text: 'You stand where the first man walked beside the Source — not beneath it, not afar. Shame had not yet entered the garden. Every road you will walk leads back to this hour.',
    },
    lore_ordering: {
        title: 'The Ordering of Waters',
        text: 'When the garden was first laid out, a river went out to water it — four heads, four directions. Abundance was not scarce here. This is what the world was shaped to feel like before man chose the lie.',
    },
    lore_serpent: {
        title: 'Before the Voice',
        text: 'Here stood the tree of knowing good and evil. A voice asked whether the Source had truly forbidden the fruit — and for the first time, man listened to another counsel. The fall was not a pit he dropped into. It was the hour he stopped walking beside the Source.',
    },
    lore_exile: {
        title: 'The Guarded Way Back',
        text: 'When they left, the cherubim did not chase them into the wilderness. They kept the way back — as they do now — for any soul willing to lay down the lie and return.',
    },
    lore_sanctum: {
        title: 'The Tree Remembers',
        text: 'The leaf does not wither because it remembers when death was not yet a custom of the world — when man still knew the Source by walking, not by believing from afar.',
    },
    lore_secret: {
        title: 'The Compartment Beneath Memory',
        text: 'Beneath the ordering stone, a hollow no map recorded. Only those who read every inscription — or those who see what was paved over — find the Gardener\'s last cache: proof the garden was meant to be walked, not merely believed in from exile.',
    },
};

/** First-time wing entry — The Gardener speaks. */
export const EDEN_GARDENER_LINES: Record<string, string> = {
    wing_threshold: 'Welcome back to the hour before shame. Walk slowly — the stones remember what you have forgotten.',
    wing_outer_grove: 'Here the grove still breathes as it did. Shades are memories of the lie — strike them down and keep walking.',
    wing_eastern_garden: 'The eastern beds were planted for abundance, not scarcity. Find what was hidden in plain sight.',
    wing_river_warren: 'Four rivers once watered this place from one source. Their vaults hold keys to deeper ground.',
    wing_forbidden_verge: 'Tread carefully. This is where another voice first asked whether the Source had truly spoken.',
    wing_cherub_antechamber: 'The cherub does not chase the exile. It keeps the way back for any soul willing to lay down the lie.',
};

export const EDEN_RESPAWN_LINE =
    'Rest here. The garden does not abandon those who stumble — only those who choose the lie again.';

export const EDEN_TEMPTATION = { gx: 12, gy: 22 };
export const EDEN_TEMPTATION_SHORTCUT = { gx: 20, gy: 24 };

export const EDEN_SERPENT_LINES = {
    offer: '【A whisper】 You need not walk the long way. Take this path — you will know as the Source knows.',
    accepted: 'The shortcut buckles. Knowing without walking was always the lie.',
    resisted: '【The Gardener】 You did not trade the road for a whisper. That is how man walked beside the Source.',
};

export function freshEdenState(): EdenLevelState {
    return {
        doors: [],
        chests: [
            { id: 'chest_threshold', gx: 18, gy: 36, keyId: 'key_threshold', label: 'Threshold compartment', opened: false },
            { id: 'chest_grove', gx: 42, gy: 30, keyId: 'key_grove', label: 'Grove compartment', opened: false },
            { id: 'chest_river', gx: 40, gy: 18, keyId: 'key_river', label: 'River vault', opened: false },
            { id: 'chest_sanctum', gx: 16, gy: 12, keyId: 'key_sanctum', label: 'Forbidden vault', opened: false },
            { id: 'chest_spring', gx: 14, gy: 28, health: 20, label: 'Hidden spring', opened: false },
            { id: 'chest_memory', gx: 44, gy: 14, health: 18, label: 'Memory well', opened: false },
            { id: 'chest_secret', gx: 20, gy: 16, health: 15, label: 'Compartment beneath memory', opened: false, hidden: true },
        ],
        pickups: [
            { id: 'hp_entry', gx: 32, gy: 38, kind: 'health', amount: 18, collected: false },
            { id: 'hp_grove', gx: 34, gy: 32, kind: 'health', amount: 18, collected: false },
            { id: 'hp_river', gx: 42, gy: 22, kind: 'health', amount: 20, collected: false },
            { id: 'hp_forbidden', gx: 10, gy: 18, kind: 'health', amount: 20, collected: false },
            { id: 'hp_antechamber', gx: 30, gy: 12, kind: 'health', amount: 22, collected: false },
        ],
        fights: [
            { id: 'fight_1', gx: 20, gy: 34, radius: 22, combatId: 'eden_lesson_1', cleared: false, hint: 'A lone shade roams the threshold road. Learn Strike and Dodge.' },
            { id: 'fight_2', gx: 42, gy: 28, radius: 22, combatId: 'eden_lesson_2', cleared: false, hint: 'Two shades hunt the eastern grove. Dodge, then strike.' },
            { id: 'fight_3', gx: 40, gy: 16, radius: 24, combatId: 'eden_lesson_3', cleared: false, hint: 'A caster shade guards the river terrace. Close distance after dodging.' },
            { id: 'fight_temptation', gx: 12, gy: 22, radius: 0, combatId: 'eden_temptation', cleared: false, hint: 'The serpent\'s shortcut was a trap — a shade rises from the dust of the lie.' },
            { id: 'fight_boss', gx: 28, gy: 11, radius: 26, combatId: 'eden_boss', cleared: false, hint: 'The Cherub of the Flaming Sword bars the Tree of Life.' },
        ],
        loreStones: [
            { id: 'lore_threshold', gx: 24, gy: 38, ...EDEN_LORE.lore_threshold, read: false },
            { id: 'lore_ordering', gx: 28, gy: 22, ...EDEN_LORE.lore_ordering, read: false },
            { id: 'lore_serpent', gx: 14, gy: 20, ...EDEN_LORE.lore_serpent, read: false },
            { id: 'lore_exile', gx: 30, gy: 12, ...EDEN_LORE.lore_exile, read: false },
            { id: 'lore_sanctum', gx: 32, gy: 6, ...EDEN_LORE.lore_sanctum, read: false },
        ],
        keysFound: [],
        bossGateOpen: false,
        sanctumOpen: false,
        temptationResolved: 'none',
    };
}

const EDEN_DISC = (id: string) => `eden_${id}`;

/** Restore dungeon progress from character.discovered + cleared. */
export function hydrateEdenState(character: GameCharacter): EdenLevelState {
    const base = freshEdenState();
    const disc = new Set(character.discovered);
    const keys = new Set<string>();

    const chests = base.chests.map((c) => {
        const opened = disc.has(EDEN_DISC(c.id));
        if (opened && c.keyId) keys.add(c.keyId);
        return { ...c, opened };
    });
    const pickups = base.pickups.map((p) => ({ ...p, collected: disc.has(EDEN_DISC(p.id)) }));
    const fights = base.fights.map((f) => ({
        ...f,
        cleared: disc.has(EDEN_DISC(f.id)) || (f.combatId === 'eden_boss' && character.cleared.includes('dest_eden')),
    }));
    const loreStones = base.loreStones.map((s) => ({ ...s, read: disc.has(EDEN_DISC(s.id)) }));
    const doors = base.doors.map((d) => ({
        ...d,
        open: disc.has(EDEN_DISC(`door_${d.id}`)) || keys.has(d.keyId),
    }));

    let temptationResolved: EdenLevelState['temptationResolved'] = 'none';
    if (disc.has(EDEN_DISC('temptation_resisted'))) temptationResolved = 'resisted';
    else if (disc.has(EDEN_DISC('temptation_accepted'))) temptationResolved = 'accepted';

    let state: EdenLevelState = {
        ...base,
        chests,
        pickups,
        fights,
        loreStones,
        doors,
        keysFound: Array.from(keys),
        temptationResolved,
    };
    state = updateEdenProgress(state);
    return state;
}

export function edenDiscoveriesFromState(level: EdenLevelState, extra: string[] = []): string[] {
    const out: string[] = [...extra];
    for (const c of level.chests) if (c.opened) out.push(EDEN_DISC(c.id));
    for (const p of level.pickups) if (p.collected) out.push(EDEN_DISC(p.id));
    for (const f of level.fights) if (f.cleared) out.push(EDEN_DISC(f.id));
    for (const s of level.loreStones) if (s.read) out.push(EDEN_DISC(s.id));
    for (const d of level.doors) if (d.open) out.push(EDEN_DISC(`door_${d.id}`));
    if (level.temptationResolved === 'resisted') out.push(EDEN_DISC('temptation_resisted'));
    if (level.temptationResolved === 'accepted') out.push(EDEN_DISC('temptation_accepted'));
    return out;
}

export function allEdenLoreRead(level: EdenLevelState): boolean {
    return level.loreStones.every((s) => s.read);
}

export function canRevealEdenSecret(level: EdenLevelState, character: GameCharacter): boolean {
    return allEdenLoreRead(level) || canSeeHiddenPlaces(character);
}

export function edenWingId(gx: number, gy: number): string | null {
    const label = edenZoneLabel(gx, gy);
    if (!label) return null;
    const map: Record<string, string> = {
        'The Threshold': 'wing_threshold',
        'Outer Grove': 'wing_outer_grove',
        'Eastern Garden': 'wing_eastern_garden',
        'River Warren': 'wing_river_warren',
        'The Forbidden Verge': 'wing_forbidden_verge',
        'Cherub Antechamber': 'wing_cherub_antechamber',
    };
    return map[label] ?? null;
}

export interface EdenCombatDef extends CombatConfig {
    id: string;
    skirmish?: boolean;
    bossDifficulty?: number;
}

export const EDEN_COMBATS: Record<string, EdenCombatDef> = {
    eden_lesson_1: {
        id: 'eden_lesson_1',
        skirmish: true,
        challenge: 'Two shades bar the threshold. Dodge lunges, strike between their recoveries.',
        enemyCount: 2,
        enemyHp: 24,
        enemyDmg: 10,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The shade dissolves. Read the threshold stone — then claim the key.',
    },
    eden_lesson_2: {
        id: 'eden_lesson_2',
        skirmish: true,
        challenge: 'Three shades hunt the grove. Keep moving — they share attack turns.',
        enemyCount: 3,
        enemyHp: 28,
        enemyDmg: 12,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The grove grows quiet. The compartment key is near.',
    },
    eden_lesson_3: {
        id: 'eden_lesson_3',
        skirmish: true,
        challenge: 'Caster shades and flankers. Close distance after dodging bolts.',
        enemyCount: 3,
        enemyHp: 30,
        enemyDmg: 13,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The river vault opens. Walk the forbidden verge — the serpent stone waits.',
    },
    eden_temptation: {
        id: 'eden_temptation',
        skirmish: true,
        challenge: 'The serpent\'s shortcut was a trap. Two shades rise from the dust of the lie.',
        enemyCount: 2,
        enemyHp: 32,
        enemyDmg: 14,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The false path crumbles. Walk the true road — it was always longer because it was real.',
    },
    eden_boss: {
        id: 'eden_boss',
        challenge: 'The Cherub bars the Tree of Life. Dodge the red rings — they strike fast. Clear the shades first.',
        enemyCount: 2,
        enemyHp: 26,
        enemyDmg: 9,
        bossName: 'The Cherub of the Flaming Sword',
        bossArt: 'sentinel',
        bossHp: 168,
        bossDmg: 15,
        bossDifficulty: 3,
        victory: 'The flaming sword lowers. Attune the four rivers — the Tree remembers.',
    },
};

export const EDEN_MINIMAP_TERRAIN_COLORS: Record<number, string> = {
    0: '#3d6b35',
    1: '#8b6914',
    2: '#1e4d7a',
};

export function edenMinimapTerrain(): number[][] {
    return buildEdenOverworld().ground;
}

export function edenMinimapGates(level: EdenLevelState): DestinationMapGate[] {
    return EDEN_GATES.map((g) => ({
        id: g.id,
        tiles: g.tiles,
        open: edenGateOpen(g.id, level),
    }));
}

export function edenMinimapPois(
    level: EdenLevelState,
    opts: { secretVisible: boolean; riversLit: number[]; relicClaimed: boolean },
): DestinationMapPoi[] {
    const pois: DestinationMapPoi[] = [
        { id: 'spawn', gx: EDEN_SPAWN.gx, gy: EDEN_SPAWN.gy, kind: 'spawn' },
        { id: 'gardener', gx: EDEN_GARDENER.gx, gy: EDEN_GARDENER.gy, kind: 'npc' },
        { id: 'tree', gx: EDEN_TREE.gx, gy: EDEN_TREE.gy, kind: 'tree', muted: opts.relicClaimed },
    ];

    for (const ls of level.loreStones) {
        pois.push({ id: ls.id, gx: ls.gx, gy: ls.gy, kind: 'lore', muted: ls.read });
    }
    for (const ch of level.chests) {
        if (ch.hidden && !opts.secretVisible) {
            pois.push({ id: ch.id, gx: ch.gx, gy: ch.gy, kind: 'chest', secret: true, muted: ch.opened });
        } else {
            pois.push({ id: ch.id, gx: ch.gx, gy: ch.gy, kind: 'chest', muted: ch.opened });
        }
    }
    for (const pk of level.pickups) {
        pois.push({ id: pk.id, gx: pk.gx, gy: pk.gy, kind: 'health', muted: pk.collected });
    }
    for (const fz of level.fights) {
        if (fz.combatId === 'eden_boss') {
            pois.push({ id: fz.id, gx: fz.gx, gy: fz.gy, kind: 'boss', muted: fz.cleared });
        } else if (fz.radius > 0) {
            pois.push({ id: fz.id, gx: fz.gx, gy: fz.gy, kind: 'fight', muted: fz.cleared });
        }
    }
    if (level.temptationResolved === 'none') {
        pois.push({ id: 'temptation', gx: EDEN_TEMPTATION.gx, gy: EDEN_TEMPTATION.gy, kind: 'temptation' });
    }
    for (const r of EDEN_RIVERS) {
        pois.push({
            id: `river_${r.id}`,
            gx: r.gx,
            gy: r.gy,
            kind: 'river',
            color: r.color,
            muted: !opts.riversLit.includes(r.id),
        });
    }
    return pois;
}

export function edenDestinationStub(combatId: string) {
    const c = EDEN_COMBATS[combatId];
    return {
        poiId: 'dest_eden',
        kind: 'portal' as const,
        name: 'Eden — Before the Fall',
        era: '',
        accent: '#34d399',
        bg: ['#0a1f17', '#04100b'] as [string, string],
        guide: { name: 'The Gardener', role: '', tile: { col: 0, row: 8 }, intro: '' },
        lore: [],
        relics: [],
        combat: c,
    };
}

export function isEdenSolid(gx: number, gy: number, level: EdenLevelState, barrierActive: boolean): boolean {
    return !isEdenWalkable(gx, gy, level, barrierActive);
}

export function updateEdenProgress(level: EdenLevelState): EdenLevelState {
    const keySet = new Set(level.keysFound);
    for (const c of level.chests) if (c.opened && c.keyId) keySet.add(c.keyId);
    const keysFound = Array.from(keySet);
    const skirmishes = level.fights.filter((f) => f.combatId !== 'eden_boss');
    const skirmishesCleared = skirmishes.filter((f) => f.cleared).length;
    const hasGroveKey = keysFound.includes('key_grove');
    const hasRiverKey = keysFound.includes('key_river');
    const bossGateOpen = skirmishesCleared >= 3 && hasGroveKey && hasRiverKey;
    const sanctumOpen = level.fights.find((f) => f.combatId === 'eden_boss')?.cleared ?? false;
    return { ...level, keysFound, bossGateOpen, sanctumOpen };
}

export function edenZoneLabel(gx: number, gy: number): string | null {
    if (gy >= 34) return 'The Threshold';
    if (gy >= 26 && gx < 28) return 'Outer Grove';
    if (gy >= 26) return 'Eastern Garden';
    if (gy >= 16 && gy < 26 && gx >= 30) return 'River Warren';
    if (gy >= 12 && gy < 26 && gx < 22) return 'The Forbidden Verge';
    if (gy < 12) return 'Cherub Antechamber';
    if (gy >= 16) return 'River Terrace';
    return null;
}

/** Seconds without progress before Gardener hints escalate. */
export const EDEN_HINT_DELAYS_SEC = [10, 22, 38] as const;

export interface EdenGuideContext {
    isGuardianCleared: boolean;
    isSolved: boolean;
    minigameDone: boolean;
    barrierActive: boolean;
    relicClaimed: boolean;
    hasWeapon: boolean;
    riversLit: number;
}

export interface EdenGuideStep {
    id: string;
    objective: string;
    tip: string;
    waypoint: { gx: number; gy: number } | null;
    timedHints: [string, string, string];
}

function step(
    id: string,
    objective: string,
    tip: string,
    waypoint: { gx: number; gy: number } | null,
    h1: string,
    h2: string,
    h3: string,
): EdenGuideStep {
    return { id, objective, tip, waypoint, timedHints: [h1, h2, h3] };
}

const loreRead = (level: EdenLevelState, id: string) => level.loreStones.find((s) => s.id === id)?.read ?? false;
const fightDone = (level: EdenLevelState, id: string) => level.fights.find((f) => f.id === id)?.cleared ?? false;
const chestDone = (level: EdenLevelState, id: string) => level.chests.find((c) => c.id === id)?.opened ?? false;
const hasKey = (level: EdenLevelState, keyId: string) => level.keysFound.includes(keyId);
const doorOpen = (level: EdenLevelState, id: string) => level.doors.find((d) => d.id === id)?.open ?? false;

/** Current objective + escalating hints when the player is stuck. */
export function edenGuideStep(level: EdenLevelState, ctx: EdenGuideContext): EdenGuideStep {
    if (ctx.relicClaimed) {
        return step('done', 'The Leaf is yours', 'Return to the overworld when ready.', null,
            'Your work in Eden is complete.', 'Carry the Leaf forward.', 'The garden remembers you.');
    }

    if (level.sanctumOpen && !ctx.isSolved) {
        const order = ['Pishon', 'Gihon', 'Hiddekel', 'Euphrates'];
        const nextRiver = level.sanctumOpen ? ctx.riversLit : 0;
        if (nextRiver < 4) {
            const r = EDEN_RIVERS[nextRiver];
            return step(
                `river_${nextRiver}`,
                `Attune the ${r.name} river (${nextRiver + 1}/4)`,
                'Walk to each corner fountain in order: SW → SE → NW → NE.',
                { gx: r.gx, gy: r.gy },
                `【The Gardener】 Stand on the ${r.name} fountain in the ${nextRiver === 0 ? 'south-west' : nextRiver === 1 ? 'south-east' : nextRiver === 2 ? 'north-west' : 'north-east'} corner.`,
                `【The Gardener】 Rivers must be lit in order: ${order.slice(0, nextRiver + 1).join(' → ')}${nextRiver < 3 ? ' → …' : ''}. Find ${r.name} next.`,
                `【The Gardener】 The glowing fountain marks ${r.name}. Step onto it — the dashed lines will converge on the Tree.`,
            );
        }
    }

    if (level.sanctumOpen && ctx.isSolved && !ctx.barrierActive && !ctx.relicClaimed) {
        return step('claim_relic', 'Claim the Leaf of Life', 'Walk to the Tree in the sanctum pool.',
            { gx: EDEN_TREE.gx, gy: EDEN_TREE.gy + 1 },
            '【The Gardener】 The Tree of Life glows. Stand beneath it to claim the relic.',
            '【The Gardener】 North-east sanctum — the green pulsing tree holds the Leaf.',
            '【The Gardener】 Step directly under the Tree of Life. The leaf awaits.');
    }

    if (ctx.isGuardianCleared || fightDone(level, 'fight_boss')) {
        return step('reach_sanctum', 'Enter the sanctum', 'Walk north to the Tree of Life.',
            { gx: 28, gy: 7 },
            '【The Gardener】 The flaming sword has lowered. Walk north along the spine path.',
            '【The Gardener】 The sanctum pool surrounds the Tree. Head north.',
            '【The Gardener】 Follow the open road north. The Tree of Life glows beyond the water.');
    }

    if (level.bossGateOpen && !fightDone(level, 'fight_boss')) {
        return step('fight_boss', 'Face the Cherub', 'The cherub waits on the north terrace.',
            { gx: 28, gy: 11 },
            '【The Gardener】 The Cherub guards the Tree. Enter the red dashed circle when your vitality is high.',
            '【The Gardener】 Red zone ahead — the Cherub of the Flaming Sword. Rest at red orbs if needed.',
            '【The Gardener】 The pulsing marker leads to the cherub. This is the last guardian.');
    }

    if (!loreRead(level, 'lore_threshold')) {
        return step('lore_threshold', 'Read the threshold stone', 'Stand by the golden ◆ near spawn and tap Read.',
            { gx: 24, gy: 38 },
            '【The Gardener】 The golden ◆ beside the threshold road is your first stone. Tap Read when close.',
            '【The Gardener】 The garden is open — roam east and north. Begin with the stone at the threshold.',
            '【The Gardener】 Walk to the glowing ◆ south of center. The Read button lights when you are near.');
    }

    if (!fightDone(level, 'fight_1')) {
        const f = level.fights.find((x) => x.id === 'fight_1')!;
        return step('fight_1', 'Clear the first shade trial', ctx.hasWeapon ? 'Enter the gold dashed circle east of you.' : 'Arm yourself at Truth\'s Hut first.',
            { gx: f.gx, gy: f.gy },
            `【The Gardener】 ${ctx.hasWeapon ? 'The first trial is east — a gold dashed circle. Step in when ready.' : 'You need a weapon from Truth\'s Hut before the shades will engage.'}`,
            `【The Gardener】 ${f.hint}`,
            '【The Gardener】 Dark brown tiles are walls. Grass is walkable — circle east to the trial.');
    }

    if (!chestDone(level, 'chest_threshold')) {
        return step('chest_threshold', 'Open the threshold chest', 'Claim the key from the golden chest west of spawn.',
            { gx: 18, gy: 36 },
            '【The Gardener】 The threshold compartment holds your first key. Walk onto the golden chest.',
                '【The Gardener】 The threshold key clears the first tree-gate north. Find the chest on the west road.',
            '【The Gardener】 Follow the pulsing marker — stand on the chest to open.');
    }

    if (!level.bossGateOpen) {
        const skirmishes = level.fights.filter((f) => f.combatId !== 'eden_boss' && f.combatId !== 'eden_temptation');
        const needFights = skirmishes.filter((f) => !f.cleared).length;
        if (needFights > 0) {
            const next = skirmishes.find((f) => !f.cleared)!;
            const done = skirmishes.length - needFights;
            return step(
                next.id,
                `Clear shade trial (${done + 1}/3)`,
                ctx.hasWeapon ? 'Gold dashed circles are fights — walk in when ready.' : 'Forge a weapon at Truth\'s Hut first.',
                { gx: next.gx, gy: next.gy },
                `【The Gardener】 A shade trial lies ahead. The gold dashed circle marks it — ${ctx.hasWeapon ? 'step inside when you are ready.' : 'arm yourself at Truth\'s Hut before entering.'}`,
                `【The Gardener】 ${next.hint}`,
                '【The Gardener】 Follow the pulsing marker. Brown walls block you — grass paths go around them.',
            );
        }
        if (!hasKey(level, 'key_grove')) {
            return step('key_grove', 'Find the grove key', 'Golden chest in the Eastern Garden.',
                { gx: 42, gy: 30 },
                '【The Gardener】 The eastern garden holds a chest with the grove key.',
                '【The Gardener】 Walk east along the southern ring. The grove key opens the river terrace gate.',
                '【The Gardener】 Follow the pulsing marker to the grove chest.');
        }
        if (!hasKey(level, 'key_river')) {
            return step('key_river', 'Find the river key', 'The River Warren lies on the east terrace.',
                { gx: 40, gy: 18 },
                '【The Gardener】 The river vault holds the next key. Pass through the grove gate when you hold that key.',
                '【The Gardener】 North through the mid road, then east to the river terrace.',
                '【The Gardener】 The chest marker shows the river vault.');
        }
        return step('boss_gate', 'Approach the cherub road', 'All trials and keys complete — walk north.',
            { gx: 28, gy: 14 },
            '【The Gardener】 The north road opens. Walk toward the cherub terrace.',
            '【The Gardener】 Tree-gates yield when you hold the keys. Head north on the spine path.',
            '【The Gardener】 The cherub waits beyond the final tree-gate.');
    }

    return step('explore', 'Roam the garden', 'Read ◆ stones, open chests, clear shade trials.',
        { gx: 28, gy: 30 },
        '【The Gardener】 Roam freely — dirt roads connect every wing. Follow the pulsing markers.',
        '【The Gardener】 Red orbs restore vitality. Gold ◆ stones hold lore. Dashed circles are shade trials.',
        '【The Gardener】 Tree lines block paths until you hold the right key. Keep exploring.');
}