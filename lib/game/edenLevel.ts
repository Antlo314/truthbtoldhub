import type { CombatConfig } from '@/lib/game/destinations';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { canSeeHiddenPlaces } from '@/lib/game/pathPowers';

// ============================================================
//  EDEN DUNGEON — deep garden level: the road back to before
//  man listened to the serpent. Keys, lore stones, fights, boss.
// ============================================================

export const EDEN_MAP_W = 36;
export const EDEN_MAP_H = 28;
export const EDEN_TILE = 16;
export const EDEN_VIEW_TILES = 13;

/** 0 floor · 1 wall · 2 pool/water · 3 rubble (walkable, lore tone) */
export type EdenTile = 0 | 1 | 2 | 3;

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

function buildEdenTiles(): EdenTile[][] {
    const W = EDEN_MAP_W;
    const H = EDEN_MAP_H;
    const g: EdenTile[][] = Array.from({ length: H }, () => Array(W).fill(0));
    const wall = (x1: number, y1: number, x2: number, y2: number) => {
        for (let y = y1; y <= y2; y++)
            for (let x = x1; x <= x2; x++)
                if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = 1;
    };
    const pool = (x1: number, y1: number, x2: number, y2: number) => {
        for (let y = y1; y <= y2; y++)
            for (let x = x1; x <= x2; x++)
                if (g[y][x] === 0) g[y][x] = 2;
    };

    wall(0, 0, W - 1, 0);
    wall(0, H - 1, W - 1, H - 1);
    wall(0, 0, 0, H - 1);
    wall(W - 1, 0, W - 1, H - 1);

    // —— Wing 1: Threshold (south-west) ——
    wall(1, 20, 16, 20);
    wall(1, 20, 1, 26);
    wall(16, 20, 16, 24);
    wall(8, 24, 16, 24);

    // —— Wing 2: Eastern garden ——
    wall(17, 18, 28, 18);
    wall(28, 18, 28, 26);
    wall(17, 26, 28, 26);
    wall(17, 18, 17, 22);

    // —— Wing 3: River warren (mid-east) ——
    wall(22, 12, 34, 12);
    wall(34, 12, 34, 20);
    wall(22, 20, 34, 20);
    wall(22, 12, 22, 16);

    // —— Wing 4: Forbidden verge (north-west mid) ——
    wall(1, 8, 20, 8);
    wall(20, 8, 20, 16);
    wall(1, 16, 20, 16);
    wall(1, 8, 1, 12);
    wall(10, 8, 10, 12);

    // —— Wing 5: Cherub antechamber + sanctum (north-east) ——
    wall(24, 4, 34, 4);
    wall(34, 4, 34, 11);
    wall(24, 11, 34, 11);
    wall(24, 4, 24, 8);

    pool(28, 3, 33, 6);
    g[4][31] = 1;

    // river fountain pedestals
    for (const [x, y] of [[5, 25], [30, 25], [5, 2], [30, 2]] as const) g[y][x] = 1;

    // rubble patches (walkable, visual tone)
    for (const [x, y] of [[12, 14], [14, 15], [6, 14], [25, 14]] as const) if (g[y][x] === 0) g[y][x] = 3;

    return g;
}

export const EDEN_TILES = buildEdenTiles();
export const EDEN_SPAWN = { gx: 4, gy: 24 };
export const EDEN_TREE = { gx: 31, gy: 4 };

export const EDEN_RIVERS = [
    { id: 0, name: 'Pishon', gx: 5, gy: 25, active: false, color: '#22d3ee' },
    { id: 1, name: 'Gihon', gx: 30, gy: 25, active: false, color: '#fbbf24' },
    { id: 2, name: 'Hiddekel', gx: 5, gy: 2, active: false, color: '#a855f7' },
    { id: 3, name: 'Euphrates', gx: 30, gy: 2, active: false, color: '#10b981' },
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

export const EDEN_TEMPTATION = { gx: 14, gy: 11 };
export const EDEN_TEMPTATION_SHORTCUT = { gx: 22, gy: 15 };

export const EDEN_SERPENT_LINES = {
    offer: '【A whisper】 You need not walk the long way. Take this path — you will know as the Source knows.',
    accepted: 'The shortcut buckles. Knowing without walking was always the lie.',
    resisted: '【The Gardener】 You did not trade the road for a whisper. That is how man walked beside the Source.',
};

export function freshEdenState(): EdenLevelState {
    return {
        doors: [
            { id: 'door_threshold', gx: 16, gy: 22, keyId: 'key_threshold', open: false, label: 'Threshold gate' },
            { id: 'door_grove', gx: 17, gy: 20, keyId: 'key_grove', open: false, label: 'Grove gate' },
            { id: 'door_river', gx: 22, gy: 16, keyId: 'key_river', open: false, label: 'River gate' },
            { id: 'door_sanctum', gx: 24, gy: 8, keyId: 'key_sanctum', open: false, label: 'Sanctum gate' },
        ],
        chests: [
            { id: 'chest_threshold', gx: 10, gy: 22, keyId: 'key_threshold', label: 'Threshold compartment', opened: false },
            { id: 'chest_grove', gx: 24, gy: 22, keyId: 'key_grove', label: 'Grove compartment', opened: false },
            { id: 'chest_river', gx: 30, gy: 16, keyId: 'key_river', label: 'River vault', opened: false },
            { id: 'chest_sanctum', gx: 14, gy: 10, keyId: 'key_sanctum', label: 'Forbidden vault', opened: false },
            { id: 'chest_spring', gx: 6, gy: 14, health: 30, label: 'Hidden spring', opened: false },
            { id: 'chest_memory', gx: 32, gy: 14, health: 25, label: 'Memory well', opened: false },
            { id: 'chest_secret', gx: 18, gy: 14, health: 20, label: 'Compartment beneath memory', opened: false, hidden: true },
        ],
        pickups: [
            { id: 'hp_entry', gx: 3, gy: 25, kind: 'health', amount: 25, collected: false },
            { id: 'hp_grove', gx: 20, gy: 24, kind: 'health', amount: 25, collected: false },
            { id: 'hp_river', gx: 26, gy: 18, kind: 'health', amount: 30, collected: false },
            { id: 'hp_forbidden', gx: 12, gy: 10, kind: 'health', amount: 30, collected: false },
            { id: 'hp_antechamber', gx: 28, gy: 6, kind: 'health', amount: 35, collected: false },
        ],
        fights: [
            { id: 'fight_1', gx: 8, gy: 22, radius: 22, combatId: 'eden_lesson_1', cleared: false, hint: 'A lone shade blocks the eastern path. Learn Strike and Dodge before you go deeper.' },
            { id: 'fight_2', gx: 22, gy: 23, radius: 22, combatId: 'eden_lesson_2', cleared: false, hint: 'Two shades hunt the grove. Let one wind up — dodge — then strike.' },
            { id: 'fight_3', gx: 28, gy: 17, radius: 24, combatId: 'eden_lesson_3', cleared: false, hint: 'A caster shade guards the river vault. Close the distance or dodge its bolts.' },
            { id: 'fight_temptation', gx: 14, gy: 11, radius: 0, combatId: 'eden_temptation', cleared: false, hint: 'The serpent\'s shortcut was a trap — a shade rises from the dust of the lie.' },
            { id: 'fight_boss', gx: 31, gy: 5, radius: 30, combatId: 'eden_boss', cleared: false, hint: 'The Cherub of the Flaming Sword bars the Tree of Life — the hour before the lie.' },
        ],
        loreStones: [
            { id: 'lore_threshold', gx: 4, gy: 25, ...EDEN_LORE.lore_threshold, read: false },
            { id: 'lore_ordering', gx: 12, gy: 14, ...EDEN_LORE.lore_ordering, read: false },
            { id: 'lore_serpent', gx: 16, gy: 10, ...EDEN_LORE.lore_serpent, read: false },
            { id: 'lore_exile', gx: 28, gy: 6, ...EDEN_LORE.lore_exile, read: false },
            { id: 'lore_sanctum', gx: 30, gy: 4, ...EDEN_LORE.lore_sanctum, read: false },
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
}

export const EDEN_COMBATS: Record<string, EdenCombatDef> = {
    eden_lesson_1: {
        id: 'eden_lesson_1',
        skirmish: true,
        challenge: 'One shade bars the way. Move with the joystick, tap Strike, and Dodge to slip its lunge.',
        enemyCount: 1,
        enemyHp: 14,
        enemyDmg: 6,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The shade dissolves. Read the threshold stone — then claim the key.',
    },
    eden_lesson_2: {
        id: 'eden_lesson_2',
        skirmish: true,
        challenge: 'Two shades hunt together. Dodge the lunge, then strike from the side.',
        enemyCount: 2,
        enemyHp: 18,
        enemyDmg: 8,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The grove grows quiet. The compartment key is near.',
    },
    eden_lesson_3: {
        id: 'eden_lesson_3',
        skirmish: true,
        challenge: 'A caster shade keeps its distance. Close in after dodging its bolts.',
        enemyCount: 2,
        enemyHp: 20,
        enemyDmg: 9,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The river vault opens. Walk the forbidden verge — the serpent stone waits.',
    },
    eden_temptation: {
        id: 'eden_temptation',
        skirmish: true,
        challenge: 'The serpent\'s shortcut was a trap. Strike down the shade born of the lie.',
        enemyCount: 1,
        enemyHp: 22,
        enemyDmg: 10,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The false path crumbles. Walk the true road — it was always longer because it was real.',
    },
    eden_boss: {
        id: 'eden_boss',
        challenge: 'The Cherub bars the Tree of Life. Walk the road back to before the lie.',
        enemyCount: 2,
        enemyHp: 20,
        enemyDmg: 9,
        bossName: 'The Cherub of the Flaming Sword',
        bossArt: 'sentinel',
        bossHp: 120,
        bossDmg: 16,
        victory: 'The flaming sword lowers. Attune the four rivers — the Tree remembers.',
    },
};

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
    if (gx < 0 || gx >= EDEN_MAP_W || gy < 0 || gy >= EDEN_MAP_H) return true;
    const t = EDEN_TILES[gy][gx];
    if (t === 1) return true;
    if (t === 2 && barrierActive) return true;
    if (gx === EDEN_TREE.gx && gy === EDEN_TREE.gy) return true;

    for (const d of level.doors) {
        if (d.gx === gx && d.gy === gy && !d.open) return true;
    }
    // boss antechamber gate (between warren and cherub hall)
    if (!level.bossGateOpen && gx >= 23 && gx <= 24 && gy >= 9 && gy <= 11) return true;
    // sanctum pool edge until boss beaten
    if (!level.sanctumOpen && gx >= 28 && gx <= 33 && gy >= 3 && gy <= 6 && EDEN_TILES[gy][gx] === 2) {
        if (!(gx === EDEN_TREE.gx && gy === EDEN_TREE.gy + 1)) return true;
    }
    return false;
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
    if (gy >= 23) return 'The Threshold';
    if (gy >= 17 && gx < 15) return 'Outer Grove';
    if (gy >= 17) return 'Eastern Garden';
    if (gy >= 11 && gx < 20) return 'River Warren';
    if (gy >= 6 && gx < 28) return 'The Forbidden Verge';
    if (gy >= 3) return 'Cherub Antechamber';
    return null;
}