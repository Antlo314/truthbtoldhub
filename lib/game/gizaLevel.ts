import type { CombatConfig } from '@/lib/game/destinations';
import type { GameCharacter } from '@/lib/store/useGameStore';
import type { DestinationMapGate, DestinationMapPoi } from '@/lib/game/mapReveal';
import { canSeeHiddenPlaces } from '@/lib/game/pathPowers';

// ============================================================
//  GIZA DUNGEON — the Engine of Stone: keys, resonance,
//  hidden measure, and the Sentinel who guards the hum.
// ============================================================

export const GIZA_MAP_W = 34;
export const GIZA_MAP_H = 26;
export const GIZA_TILE = 16;
export const GIZA_VIEW_TILES = 13;

/** 0 floor · 1 wall · 2 trap plate · 3 rubble */
export type GizaTile = 0 | 1 | 2 | 3;

export interface GizaDoor {
    id: string;
    gx: number;
    gy: number;
    keyId: string;
    open: boolean;
    label: string;
}

export interface GizaChest {
    id: string;
    gx: number;
    gy: number;
    keyId?: string;
    health?: number;
    label: string;
    opened: boolean;
    hidden?: boolean;
}

export interface GizaPickup {
    id: string;
    gx: number;
    gy: number;
    kind: 'health';
    amount: number;
    collected: boolean;
}

export interface GizaFightZone {
    id: string;
    gx: number;
    gy: number;
    radius: number;
    combatId: string;
    cleared: boolean;
    hint: string;
}

export interface GizaLoreStone {
    id: string;
    gx: number;
    gy: number;
    title: string;
    text: string;
    read: boolean;
    hidden?: boolean;
}

export interface GizaIronNode {
    id: string;
    gx: number;
    gy: number;
    mined: boolean;
}

export interface GizaTrapPlate {
    id: string;
    gx: number;
    gy: number;
    tripped: boolean;
}

export interface GizaCrystal {
    id: number;
    name: string;
    gx: number;
    gy: number;
    color: string;
}

export interface GizaLevelState {
    doors: GizaDoor[];
    chests: GizaChest[];
    pickups: GizaPickup[];
    fights: GizaFightZone[];
    loreStones: GizaLoreStone[];
    ironNodes: GizaIronNode[];
    traps: GizaTrapPlate[];
    keysFound: string[];
    bossGateOpen: boolean;
    chamberOpen: boolean;
    slabOpen: boolean;
    illusionPassed: boolean;
    temptationResolved: 'none' | 'accepted' | 'resisted';
}

function buildGizaTiles(): GizaTile[][] {
    const W = GIZA_MAP_W;
    const H = GIZA_MAP_H;
    const g: GizaTile[][] = Array.from({ length: H }, () => Array(W).fill(0));
    const wall = (x1: number, y1: number, x2: number, y2: number) => {
        for (let y = y1; y <= y2; y++)
            for (let x = x1; x <= x2; x++)
                if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = 1;
    };

    wall(0, 0, W - 1, 0);
    wall(0, H - 1, W - 1, H - 1);
    wall(0, 0, 0, H - 1);
    wall(W - 1, 0, W - 1, H - 1);

    // —— King's Chamber (north) ——
    wall(12, 2, 21, 2);
    wall(12, 2, 12, 6);
    wall(21, 2, 21, 6);
    wall(12, 6, 21, 6);

    // —— Grand Gallery divider (granite slab row) ——
    wall(10, 8, 23, 8);
    g[8][17] = 0; // slab gap (blocked by slabOpen logic)

    // —— Mid Shaft (west upper) ——
    wall(2, 9, 11, 9);
    wall(2, 9, 2, 14);
    wall(11, 9, 11, 14);
    wall(2, 14, 11, 14);

    // —— Sentinel Hall (east upper) ——
    wall(24, 9, 32, 9);
    wall(32, 9, 32, 14);
    wall(24, 14, 32, 14);
    wall(24, 9, 24, 12);

    // —— Lower Crypt (west) ——
    wall(2, 15, 12, 15);
    wall(2, 15, 2, 20);
    wall(12, 15, 12, 20);
    wall(2, 20, 12, 20);

    // —— Trap Hall (east lower) ——
    wall(22, 15, 32, 15);
    wall(32, 15, 32, 20);
    wall(22, 20, 32, 20);
    wall(22, 15, 22, 17);

    // —— Descent chamber (south) ——
    wall(11, 21, 22, 21);
    wall(11, 21, 11, 24);
    wall(22, 21, 22, 24);

    // —— Secret Orion vault (east, behind illusion) ——
    wall(29, 16, 32, 16);
    wall(32, 16, 32, 18);
    wall(29, 18, 32, 18);
    wall(29, 16, 29, 18);

    // passages through chamber walls
    for (const x of [16, 17, 18]) g[21][x] = 0; // descent → upper corridors
    g[14][17] = 0; // gallery gate gap
    g[12][23] = 0; // sentinel hall entry from gallery side
    g[18][12] = 0; // crypt gate gap
    g[14][11] = 0; // shaft gate gap
    g[17][8] = 0; // granite slab passage (gated by slabOpen)

    // rubble patches
    for (const [x, y] of [[6, 12], [18, 11], [27, 17], [8, 18], [16, 23]] as const)
        if (g[y][x] === 0) g[y][x] = 3;

    // trap plates
    for (const [x, y] of [[25, 17], [28, 17], [30, 19]] as const)
        if (g[y][x] === 0) g[y][x] = 2;

    return g;
}

export const GIZA_TILES = buildGizaTiles();
export const GIZA_SPAWN = { gx: 17, gy: 23 };
export const GIZA_RELIC = { gx: 17, gy: 4 };
export const GIZA_SLAB = { gx: 17, gy: 8 };

export const GIZA_CRYSTALS: GizaCrystal[] = [
    { id: 0, name: 'Low', gx: 5, gy: 18, color: '#38bdf8' },
    { id: 1, name: 'Mid', gx: 5, gy: 11, color: '#a855f7' },
    { id: 2, name: 'High', gx: 17, gy: 11, color: '#ef4444' },
];

export const GIZA_ILLUSION_WALL = { gx: 29, gy: 17 };
export const GIZA_TEMPTATION = { gx: 19, gy: 16 };
export const GIZA_TEMPTATION_DROP = { gx: 27, gy: 19 };

export const GIZA_LORE: Record<string, { title: string; text: string }> = {
    lore_descent: {
        title: 'Inscription at the Descent',
        text: 'They named this a tomb. No king sleeps here. The stone was set to measure — the sky, the earth, and the frequency of the living world. Walk it as an engine, not a grave.',
    },
    lore_precision: {
        title: 'The Measure of Seams',
        text: 'Blocks the weight of locomotives, joined with gaps a blade cannot enter. Aligned to true north closer than your instruments admit. Precision on this scale is not accident — it is intention.',
    },
    lore_hum: {
        title: 'The Note of the Chamber',
        text: 'Strike the granite and the whole passage answers. The King\'s Chamber was tuned like an instrument — one note rippling through corridors of stone. Whatever they built, they built to resonate.',
    },
    lore_shaft: {
        title: 'Shafts That Breathe',
        text: 'Two narrow shafts climb from the lower passages — not for souls, for air and signal. The machine breathes. The approved story calls this superstition. The stone disagrees.',
    },
    lore_sentinel: {
        title: 'Those Who Died Seeking',
        text: 'Shades still circle the antechamber — seekers who traded their lives for a secret the textbooks denied. The Sentinel is their last oath: none pass unmeasured.',
    },
    lore_orion: {
        title: 'The Belt Below the Belt',
        text: 'A brass measure, older than the lie: the three great stones mirror Orion\'s belt — not as tribute to a king, as a lock keyed to the sky. When the belt rises, the engine remembers its tuning.',
    },
    lore_secret: {
        title: 'The Hollow in the Measure',
        text: 'Beneath the final seam, a cavity no survey recorded. Khaemwaset hid proof here for those who read every inscription — or those who see through stone: the pyramid was never a monument to death. It was a chord struck in the living world.',
    },
};

export const GIZA_KEEPER_LINES: Record<string, string> = {
    wing_descent: 'Welcome to the descent. Dark granite is wall — sandstone is road. Read the first ◆ beside you, then follow the compass.',
    wing_lower_crypt: 'The lower crypt holds the Low resonance. Shades wake where the measure was disturbed. Strike with purpose.',
    wing_trap_hall: 'Pressure plates still guard the eastern hall. Step light — or strike heavy. The stone remembers both.',
    wing_mid_shaft: 'The mid shaft climbs toward the Grand Gallery. Two keys still sleep in chests you have not opened.',
    wing_grand_gallery: 'This gallery was never for funeral processions. It is a resonant throat — the High crystal waits at its heart.',
    wing_sentinel_hall: 'The Sentinel does not sleep. It measures whether you are worthy of the hum. Prepare before you enter the circle.',
    wing_kings_chamber: 'The chamber is empty of kings and full of frequency. When the slab yields, claim what blazed like a mirror.',
};

export const GIZA_RESPAWN_LINE =
    'Rest at the descent. The engine does not reject those who stumble — only those who refuse to listen.';

export const GIZA_WHISPER_LINES = {
    offer: '【A whisper in the stone】 The King\'s Chamber lies north — take the sealed shaft and skip the long measure.',
    accepted: 'The false shaft drops you into the trap hall. Knowing without walking was always the lie.',
    resisted: '【Khaemwaset】 You did not trade the measure for a whisper. That is how the builders walked.',
};

export function freshGizaState(): GizaLevelState {
    return {
        doors: [
            { id: 'door_crypt', gx: 12, gy: 18, keyId: 'key_crypt', open: false, label: 'Crypt gate' },
            { id: 'door_shaft', gx: 11, gy: 14, keyId: 'key_shaft', open: false, label: 'Shaft gate' },
            { id: 'door_gallery', gx: 17, gy: 14, keyId: 'key_gallery', open: false, label: 'Gallery gate' },
            { id: 'door_sentinel', gx: 24, gy: 12, keyId: 'key_sentinel', open: false, label: 'Sentinel gate' },
        ],
        chests: [
            { id: 'chest_crypt', gx: 8, gy: 19, keyId: 'key_crypt', label: 'Crypt compartment', opened: false },
            { id: 'chest_shaft', gx: 6, gy: 12, keyId: 'key_shaft', label: 'Shaft compartment', opened: false },
            { id: 'chest_gallery', gx: 20, gy: 12, keyId: 'key_gallery', label: 'Gallery compartment', opened: false },
            { id: 'chest_sentinel', gx: 30, gy: 11, keyId: 'key_sentinel', label: 'Sentinel vault', opened: false },
            { id: 'chest_spring', gx: 14, gy: 19, health: 28, label: 'Hidden spring', opened: false },
            { id: 'chest_measure', gx: 19, gy: 10, health: 25, label: 'Measure well', opened: false },
            { id: 'chest_secret', gx: 31, gy: 17, health: 20, label: 'Hollow beneath the measure', opened: false, hidden: true },
        ],
        pickups: [
            { id: 'hp_entry', gx: 15, gy: 23, kind: 'health', amount: 25, collected: false },
            { id: 'hp_crypt', gx: 4, gy: 17, kind: 'health', amount: 25, collected: false },
            { id: 'hp_trap', gx: 28, gy: 19, kind: 'health', amount: 30, collected: false },
            { id: 'hp_gallery', gx: 17, gy: 13, kind: 'health', amount: 30, collected: false },
            { id: 'hp_vault', gx: 30, gy: 17, kind: 'health', amount: 20, collected: false },
        ],
        fights: [
            { id: 'fight_1', gx: 6, gy: 17, radius: 18, combatId: 'giza_lesson_1', cleared: false, hint: 'A shade blocks the crypt. Learn to dodge its lunge, then strike.' },
            { id: 'fight_2', gx: 27, gy: 17, radius: 18, combatId: 'giza_lesson_2', cleared: false, hint: 'Two dormant sentinels wake in the trap hall. Draw one out — dodge — then strike.' },
            { id: 'fight_3', gx: 17, gy: 12, radius: 18, combatId: 'giza_lesson_3', cleared: false, hint: 'A caster shade hums in the gallery. Close distance after dodging its bolts.' },
            { id: 'fight_temptation', gx: 27, gy: 19, radius: 0, combatId: 'giza_temptation', cleared: false, hint: 'The false shaft births a shade — strike it down and walk the true measure.' },
            { id: 'fight_boss', gx: 28, gy: 10, radius: 22, combatId: 'giza_boss', cleared: false, hint: 'The Sentinel of Stone bars the antechamber. The engine will test you.' },
        ],
        loreStones: [
            { id: 'lore_descent', gx: 14, gy: 23, ...GIZA_LORE.lore_descent, read: false },
            { id: 'lore_precision', gx: 4, gy: 19, ...GIZA_LORE.lore_precision, read: false },
            { id: 'lore_hum', gx: 17, gy: 5, ...GIZA_LORE.lore_hum, read: false },
            { id: 'lore_shaft', gx: 6, gy: 10, ...GIZA_LORE.lore_shaft, read: false },
            { id: 'lore_sentinel', gx: 29, gy: 10, ...GIZA_LORE.lore_sentinel, read: false },
            { id: 'lore_orion', gx: 31, gy: 16, ...GIZA_LORE.lore_orion, read: false, hidden: true },
        ],
        ironNodes: [
            { id: 'iron_0', gx: 3, gy: 16, mined: false },
            { id: 'iron_1', gx: 9, gy: 16, mined: false },
            { id: 'iron_2', gx: 26, gy: 18, mined: false },
            { id: 'iron_3', gx: 31, gy: 19, mined: false },
            { id: 'iron_4', gx: 4, gy: 13, mined: false },
        ],
        traps: [
            { id: 'trap_0', gx: 25, gy: 17, tripped: false },
            { id: 'trap_1', gx: 28, gy: 17, tripped: false },
            { id: 'trap_2', gx: 30, gy: 19, tripped: false },
        ],
        keysFound: [],
        bossGateOpen: false,
        chamberOpen: false,
        slabOpen: false,
        illusionPassed: false,
        temptationResolved: 'none',
    };
}

const GIZA_DISC = (id: string) => `giza_${id}`;

export function hydrateGizaState(character: GameCharacter): GizaLevelState {
    const base = freshGizaState();
    const disc = new Set(character.discovered);
    const keys = new Set<string>();

    const chests = base.chests.map((c) => {
        const opened = disc.has(GIZA_DISC(c.id));
        if (opened && c.keyId) keys.add(c.keyId);
        return { ...c, opened };
    });
    const pickups = base.pickups.map((p) => ({ ...p, collected: disc.has(GIZA_DISC(p.id)) }));
    const fights = base.fights.map((f) => ({
        ...f,
        cleared: disc.has(GIZA_DISC(f.id)) || (f.combatId === 'giza_boss' && character.cleared.includes('dest_giza')),
    }));
    const loreStones = base.loreStones.map((s) => ({ ...s, read: disc.has(GIZA_DISC(s.id)) }));
    const ironNodes = base.ironNodes.map((n) => ({ ...n, mined: disc.has(GIZA_DISC(n.id)) }));
    const traps = base.traps.map((t) => ({ ...t, tripped: disc.has(GIZA_DISC(t.id)) }));
    const doors = base.doors.map((d) => ({
        ...d,
        open: disc.has(GIZA_DISC(`door_${d.id}`)) || keys.has(d.keyId),
    }));

    let temptationResolved: GizaLevelState['temptationResolved'] = 'none';
    if (disc.has(GIZA_DISC('temptation_resisted'))) temptationResolved = 'resisted';
    else if (disc.has(GIZA_DISC('temptation_accepted'))) temptationResolved = 'accepted';

    let state: GizaLevelState = {
        ...base,
        chests,
        pickups,
        fights,
        loreStones,
        ironNodes,
        traps,
        doors,
        keysFound: Array.from(keys),
        temptationResolved,
        illusionPassed: disc.has(GIZA_DISC('illusion_passed')),
        slabOpen: disc.has(GIZA_DISC('slab_open')) || character.solved.includes('puz_giza'),
    };
    state = updateGizaProgress(state);
    return state;
}

export function gizaDiscoveriesFromState(level: GizaLevelState, extra: string[] = []): string[] {
    const out: string[] = [...extra];
    for (const c of level.chests) if (c.opened) out.push(GIZA_DISC(c.id));
    for (const p of level.pickups) if (p.collected) out.push(GIZA_DISC(p.id));
    for (const f of level.fights) if (f.cleared) out.push(GIZA_DISC(f.id));
    for (const s of level.loreStones) if (s.read) out.push(GIZA_DISC(s.id));
    for (const d of level.doors) if (d.open) out.push(GIZA_DISC(`door_${d.id}`));
    for (const n of level.ironNodes) if (n.mined) out.push(GIZA_DISC(n.id));
    for (const t of level.traps) if (t.tripped) out.push(GIZA_DISC(t.id));
    if (level.illusionPassed) out.push(GIZA_DISC('illusion_passed'));
    if (level.temptationResolved === 'resisted') out.push(GIZA_DISC('temptation_resisted'));
    if (level.temptationResolved === 'accepted') out.push(GIZA_DISC('temptation_accepted'));
    if (level.slabOpen) out.push(GIZA_DISC('slab_open'));
    return out;
}

export function allGizaLoreRead(level: GizaLevelState): boolean {
    return level.loreStones.filter((s) => !s.hidden).every((s) => s.read);
}

export function canRevealGizaSecret(level: GizaLevelState, character: GameCharacter): boolean {
    return allGizaLoreRead(level) || canSeeHiddenPlaces(character);
}

export function canSeeGizaHiddenLore(level: GizaLevelState, character: GameCharacter): boolean {
    return level.illusionPassed || canSeeHiddenPlaces(character);
}

export function gizaWingId(gx: number, gy: number): string | null {
    const label = gizaZoneLabel(gx, gy);
    if (!label) return null;
    const map: Record<string, string> = {
        'The Descent': 'wing_descent',
        'Lower Crypt': 'wing_lower_crypt',
        'Trap Hall': 'wing_trap_hall',
        'Mid Shaft': 'wing_mid_shaft',
        'Grand Gallery': 'wing_grand_gallery',
        'Sentinel Hall': 'wing_sentinel_hall',
        "King's Chamber": 'wing_kings_chamber',
    };
    return map[label] ?? null;
}

export interface GizaCombatDef extends CombatConfig {
    id: string;
    skirmish?: boolean;
}

export const GIZA_COMBATS: Record<string, GizaCombatDef> = {
    giza_lesson_1: {
        id: 'giza_lesson_1',
        skirmish: true,
        challenge: 'One shade bars the crypt. Move with the joystick, tap Strike, and Dodge to slip its lunge.',
        enemyCount: 1,
        enemyHp: 16,
        enemyDmg: 7,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The shade crumbles to dust. Read the precision stone — then claim the crypt key.',
    },
    giza_lesson_2: {
        id: 'giza_lesson_2',
        skirmish: true,
        challenge: 'Two sentinels wake in the trap hall. Dodge the lunge, then strike from the side.',
        enemyCount: 2,
        enemyHp: 20,
        enemyDmg: 9,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The hall grows quiet. The gallery key sleeps in a chest to the west.',
    },
    giza_lesson_3: {
        id: 'giza_lesson_3',
        skirmish: true,
        challenge: 'A caster shade hums in the gallery. Close in after dodging its bolts.',
        enemyCount: 2,
        enemyHp: 22,
        enemyDmg: 10,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The gallery steadies. Open the sentinel gate when you hold every key.',
    },
    giza_temptation: {
        id: 'giza_temptation',
        skirmish: true,
        challenge: 'The false shaft was a trap. Strike down the shade born of the shortcut.',
        enemyCount: 1,
        enemyHp: 24,
        enemyDmg: 11,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The false path crumbles. Walk the true measure — it was always longer because it was real.',
    },
    giza_boss: {
        id: 'giza_boss',
        challenge: 'The Sentinel of Stone bars the antechamber. Prove you can hear the hum.',
        enemyCount: 3,
        enemyHp: 28,
        enemyDmg: 11,
        bossName: 'The Sentinel of Stone',
        bossArt: 'golem',
        bossHp: 170,
        bossDmg: 20,
        victory: 'The guardian dissolves into dust and silence. The hum steadies — attune the three crystals.',
    },
};

export function gizaDestinationStub(combatId: string) {
    const c = GIZA_COMBATS[combatId];
    return {
        poiId: 'dest_giza',
        kind: 'cave' as const,
        name: 'Giza — The Engine of Stone',
        era: '',
        accent: '#22d3ee',
        bg: ['#06181c', '#030c0e'] as [string, string],
        guide: { name: 'Khaemwaset', role: '', tile: { col: 1, row: 6 }, intro: '' },
        lore: [],
        relics: [],
        combat: c,
    };
}

export function isGizaSolid(gx: number, gy: number, level: GizaLevelState): boolean {
    if (gx < 0 || gx >= GIZA_MAP_W || gy < 0 || gy >= GIZA_MAP_H) return true;

    const door = level.doors.find((d) => d.gx === gx && d.gy === gy);
    if (door) return !door.open;

    const t = GIZA_TILES[gy][gx];
    if (t === 1) return true;

    // illusion wall (passable after discovered or seer)
    if (gx === GIZA_ILLUSION_WALL.gx && gy === GIZA_ILLUSION_WALL.gy && !level.illusionPassed) return true;

    // granite slab blocks King's Chamber approach
    if (!level.slabOpen && gx === GIZA_SLAB.gx && gy === GIZA_SLAB.gy) return true;

    // boss gate seal between gallery and sentinel hall
    if (!level.bossGateOpen && gx >= 23 && gx <= 24 && gy >= 11 && gy <= 13) return true;

    return false;
}

export function updateGizaProgress(level: GizaLevelState): GizaLevelState {
    const keySet = new Set(level.keysFound);
    for (const c of level.chests) if (c.opened && c.keyId) keySet.add(c.keyId);
    const keysFound = Array.from(keySet);
    const skirmishes = level.fights.filter((f) => !['giza_boss', 'giza_temptation'].includes(f.combatId));
    const skirmishesCleared = skirmishes.filter((f) => f.cleared).length;
    const hasShaftKey = keysFound.includes('key_shaft');
    const hasGalleryKey = keysFound.includes('key_gallery');
    const bossGateOpen = skirmishesCleared >= 3 && hasShaftKey && hasGalleryKey;
    const chamberOpen = level.fights.find((f) => f.combatId === 'giza_boss')?.cleared ?? false;
    return { ...level, keysFound, bossGateOpen, chamberOpen };
}

export function gizaZoneLabel(gx: number, gy: number): string | null {
    if (gy >= 21) return 'The Descent';
    if (gy >= 15 && gx < 13) return 'Lower Crypt';
    if (gy >= 15 && gx >= 22) return 'Trap Hall';
    if (gy >= 9 && gy < 15 && gx < 12) return 'Mid Shaft';
    if (gy >= 9 && gy < 15 && gx >= 12 && gx < 23) return 'Grand Gallery';
    if (gy >= 9 && gy < 15 && gx >= 23) return 'Sentinel Hall';
    if (gy < 9) return "King's Chamber";
    return 'Grand Gallery';
}

export const GIZA_HINT_DELAYS_SEC = [10, 22, 38] as const;

export interface GizaGuideContext {
    isGuardianCleared: boolean;
    isSolved: boolean;
    minigameDone: boolean;
    relicClaimed: boolean;
    hasWeapon: boolean;
    crystalsLit: number;
    slabOpen: boolean;
}

export interface GizaGuideStep {
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
): GizaGuideStep {
    return { id, objective, tip, waypoint, timedHints: [h1, h2, h3] };
}

const loreRead = (level: GizaLevelState, id: string) => level.loreStones.find((s) => s.id === id)?.read ?? false;
const fightDone = (level: GizaLevelState, id: string) => level.fights.find((f) => f.id === id)?.cleared ?? false;
const chestDone = (level: GizaLevelState, id: string) => level.chests.find((c) => c.id === id)?.opened ?? false;
const hasKey = (level: GizaLevelState, keyId: string) => level.keysFound.includes(keyId);
const doorOpen = (level: GizaLevelState, id: string) => level.doors.find((d) => d.id === id)?.open ?? false;

export function gizaGuideStep(level: GizaLevelState, ctx: GizaGuideContext): GizaGuideStep {
    if (ctx.relicClaimed) {
        return step('done', 'The Shard is yours', 'Return to the overworld when ready.', null,
            'Your work in Giza is complete.', 'Carry the Shard forward.', 'The stone remembers you.');
    }

    if (ctx.slabOpen && !ctx.relicClaimed) {
        return step('claim_relic', 'Claim the Shard of Casing Stone', 'Walk to the white gleam in the King\'s Chamber.',
            { gx: GIZA_RELIC.gx, gy: GIZA_RELIC.gy },
            '【Khaemwaset】 The casing shard gleams north. Stand beneath it to claim the relic.',
            '【Khaemwaset】 Past the open slab — the empty chamber holds what blazed like a mirror.',
            '【Khaemwaset】 Step directly under the pulsing shard. It awaits the worthy.');
    }

    if (level.chamberOpen && !ctx.slabOpen) {
        const order = ['Low', 'Mid', 'High'];
        const next = ctx.crystalsLit;
        if (next < 3) {
            const c = GIZA_CRYSTALS[next];
            return step(
                `crystal_${next}`,
                `Strike the ${c.name} crystal (${next + 1}/3)`,
                'Resonance order: Low chamber → Mid shaft → High gallery.',
                { gx: c.gx, gy: c.gy },
                `【Khaemwaset】 The ${c.name} crystal glows ${next === 0 ? 'in the lower crypt' : next === 1 ? 'in the mid shaft' : 'in the grand gallery'}. Stand close and tap Strike.`,
                `【Khaemwaset】 Crystals must sound in order: ${order.slice(0, next + 1).join(' → ')}${next < 2 ? ' → …' : ''}.`,
                `【Khaemwaset】 Wrong order resets the resonance. Find the ${c.name} crystal next.`,
            );
        }
    }

    if (ctx.isGuardianCleared || fightDone(level, 'fight_boss')) {
        if (!level.chamberOpen) {
            return step('reach_chamber', 'The Sentinel has fallen', 'Attune the three crystals — Low, Mid, High.',
                { gx: 5, gy: 18 },
                '【Khaemwaset】 The hum steadies. Strike the crystals from lowest chamber to highest gallery.',
                '【Khaemwaset】 Low in the crypt · Mid in the shaft · High in the gallery.',
                '【Khaemwaset】 Pass the Serpent Path trial in Records if the crystals will not answer.');
        }
    }

    if (level.bossGateOpen && !fightDone(level, 'fight_boss')) {
        return step('fight_boss', 'Face the Sentinel of Stone', 'The boss trial lies east — Sentinel Hall.',
            { gx: 28, gy: 10 },
            '【Khaemwaset】 The Sentinel measures all who seek the hum. Enter the red dashed circle when ready.',
            '【Khaemwaset】 Red zone ahead — rest at red orbs if your vitality is low.',
            '【Khaemwaset】 The pulsing marker leads to the Sentinel. This is the engine\'s final guard.');
    }

    if (!loreRead(level, 'lore_descent')) {
        return step('lore_descent', 'Read the descent inscription', 'Stand by the cyan ◆ and tap Read.',
            { gx: 14, gy: 23 },
            '【Khaemwaset】 The cyan ◆ beside you is the first stone. Tap Read when close.',
            '【Khaemwaset】 Dark granite is wall — sandstone is road. Begin with the stone at your feet.',
            '【Khaemwaset】 Walk to the glowing ◆ in the descent chamber. Read lights the way.');
    }

    if (!fightDone(level, 'fight_1')) {
        const f = level.fights.find((x) => x.id === 'fight_1')!;
        return step('fight_1', 'Clear the first shade trial', ctx.hasWeapon ? 'Enter the gold dashed circle in the lower crypt.' : 'Arm yourself at Truth\'s Hut first.',
            { gx: f.gx, gy: f.gy },
            `【Khaemwaset】 ${ctx.hasWeapon ? 'The first trial is west — a gold dashed circle.' : 'Forge a weapon at Truth\'s Hut before the shades will engage.'}`,
            `【Khaemwaset】 ${f.hint}`,
            '【Khaemwaset】 West through the crypt gate once you hold the crypt key.');
    }

    if (!chestDone(level, 'chest_crypt')) {
        return step('chest_crypt', 'Open the crypt compartment', 'Claim the crypt key from the golden chest.',
            { gx: 8, gy: 19 },
            '【Khaemwaset】 The crypt chest holds your first key. Walk onto the golden chest.',
            '【Khaemwaset】 Keys open brown gates with gold locks.',
            '【Khaemwaset】 Follow the pulsing marker — stand on the chest to open.');
    }

    if (!doorOpen(level, 'door_crypt')) {
        return step('door_crypt', 'Open the crypt gate', 'Walk to the brown gate with the gold lock.',
            { gx: 12, gy: 18 },
            '【Khaemwaset】 Your crypt key opens the western gate. Stand beside the lock.',
            '【Khaemwaset】 The gate is west in the lower crypt.',
            '【Khaemwaset】 Brown tiles with gold locks yield to keys.');
    }

    if (!level.bossGateOpen) {
        const skirmishes = level.fights.filter((f) => !['giza_boss', 'giza_temptation'].includes(f.combatId));
        const needFights = skirmishes.filter((f) => !f.cleared).length;
        if (needFights > 0) {
            const next = skirmishes.find((f) => !f.cleared)!;
            const done = skirmishes.length - needFights;
            return step(
                next.id,
                `Clear shade trial (${done + 1}/3)`,
                ctx.hasWeapon ? 'Gold dashed circles are fights — walk in when ready.' : 'Forge a weapon at Truth\'s Hut first.',
                { gx: next.gx, gy: next.gy },
                `【Khaemwaset】 A trial lies ahead — ${ctx.hasWeapon ? 'step inside the gold circle when ready.' : 'arm yourself first.'}`,
                `【Khaemwaset】 ${next.hint}`,
                '【Khaemwaset】 Strike iron nodes with your weapon for ore Hana can use at the forge.',
            );
        }
        if (!hasKey(level, 'key_shaft')) {
            return step('key_shaft', 'Find the shaft key', 'Golden chests hold keys. Check the Mid Shaft.',
                { gx: 6, gy: 12 },
                '【Khaemwaset】 The mid shaft holds a golden chest with the shaft key.',
                '【Khaemwaset】 North through the shaft gate — open the compartment.',
                '【Khaemwaset】 Follow the pulsing chest marker.');
        }
        if (!hasKey(level, 'key_gallery')) {
            return step('key_gallery', 'Find the gallery key', 'The Grand Gallery compartment waits east.',
                { gx: 20, gy: 12 },
                '【Khaemwaset】 The gallery chest holds the next key.',
                '【Khaemwaset】 East in the grand gallery — walk onto the chest.',
                '【Khaemwaset】 Three keys and three trials open the sentinel gate.');
        }
        return step('boss_gate', 'Open the sentinel gate', 'All trials and keys complete — walk to the golden barrier east.',
            { gx: 23, gy: 12 },
            '【Khaemwaset】 The sentinel gate senses your measure. Walk east to the golden seal.',
            '【Khaemwaset】 The barrier between gallery and sentinel hall will yield.',
            '【Khaemwaset】 Stand at the golden gate east of the gallery.');
    }

    return step('explore', 'Explore the engine', 'Read ◆ stones, mine iron, clear gold trial circles.',
        { gx: 17, gy: 18 },
        '【Khaemwaset】 Dark granite is wall. Sandstone paths lead on — follow the pulsing markers.',
        '【Khaemwaset】 Red orbs restore vitality. Cyan ◆ stones hold lore. A crumbling block in the east may yield more.',
        '【Khaemwaset】 If a path looks sealed, you may need a key from another wing first.');
}

export const GIZA_MINIMAP_TERRAIN_COLORS: Record<number, string> = {
    0: '#6b5a45',
    1: '#1a1a1a',
    2: '#7f1d1d',
    3: '#4a4035',
};

export function gizaMinimapTerrain(): number[][] {
    return GIZA_TILES;
}

export function gizaMinimapGates(level: GizaLevelState): DestinationMapGate[] {
    return level.doors.map((d) => ({
        id: d.id,
        tiles: [[d.gx, d.gy]],
        open: d.open,
    }));
}

export function gizaMinimapPois(
    level: GizaLevelState,
    opts: { secretVisible: boolean; relicClaimed: boolean; crystalsLit: number[] },
): DestinationMapPoi[] {
    const pois: DestinationMapPoi[] = [
        { id: 'spawn', gx: GIZA_SPAWN.gx, gy: GIZA_SPAWN.gy, kind: 'spawn' },
        { id: 'relic', gx: GIZA_RELIC.gx, gy: GIZA_RELIC.gy, kind: 'relic', muted: opts.relicClaimed },
        { id: 'slab', gx: GIZA_SLAB.gx, gy: GIZA_SLAB.gy, kind: 'fight', muted: level.slabOpen },
    ];
    for (const ls of level.loreStones) {
        if (ls.hidden && !opts.secretVisible) {
            pois.push({ id: ls.id, gx: ls.gx, gy: ls.gy, kind: 'lore', secret: true, muted: ls.read });
        } else {
            pois.push({ id: ls.id, gx: ls.gx, gy: ls.gy, kind: 'lore', muted: ls.read });
        }
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
        if (fz.combatId === 'giza_boss') {
            pois.push({ id: fz.id, gx: fz.gx, gy: fz.gy, kind: 'boss', muted: fz.cleared });
        } else if (fz.radius > 0) {
            pois.push({ id: fz.id, gx: fz.gx, gy: fz.gy, kind: 'fight', muted: fz.cleared });
        }
    }
    for (const c of GIZA_CRYSTALS) {
        pois.push({
            id: `crystal_${c.id}`,
            gx: c.gx,
            gy: c.gy,
            kind: 'crystal',
            muted: !opts.crystalsLit.includes(c.id),
        });
    }
    for (const n of level.ironNodes) {
        pois.push({ id: n.id, gx: n.gx, gy: n.gy, kind: 'iron', muted: n.mined });
    }
    for (const t of level.traps) {
        pois.push({ id: t.id, gx: t.gx, gy: t.gy, kind: 'trap', muted: t.tripped });
    }
    if (level.temptationResolved === 'none') {
        pois.push({ id: 'temptation', gx: GIZA_TEMPTATION.gx, gy: GIZA_TEMPTATION.gy, kind: 'temptation' });
    }
    if (!level.illusionPassed) {
        pois.push({ id: 'illusion', gx: GIZA_ILLUSION_WALL.gx, gy: GIZA_ILLUSION_WALL.gy, kind: 'trap', secret: true });
    }
    return pois;
}