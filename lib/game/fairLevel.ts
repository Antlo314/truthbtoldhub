import type { CombatConfig } from '@/lib/game/destinations';
import type { GameCharacter } from '@/lib/store/useGameStore';
import type { DestinationMapGate, DestinationMapPoi } from '@/lib/game/mapReveal';
import { canSeeHiddenPlaces } from '@/lib/game/pathPowers';

// ============================================================
//  ST. LOUIS 1904 — the Gilded Fair: plaster palaces, borrowed
//  lightning, patrolling Caretakers, and the Wraith the ledgers
//  left behind. Walked at dusk, when the crowds are shades.
// ============================================================

export const FAIR_MAP_W = 46;
export const FAIR_MAP_H = 34;
export const FAIR_TILE = 16;
export const FAIR_VIEW_TILES = 13;

/** 0 promenade · 1 wall/facade · 2 arc-pylon hazard · 3 stall decor */
export type FairTile = 0 | 1 | 2 | 3;

export interface FairDynamo {
    id: number;
    gx: number;
    gy: number;
    val: number;
}

export interface FairFightZone {
    id: string;
    gx: number;
    gy: number;
    radius: number;
    combatId: string;
    cleared: boolean;
    hint: string;
}

export interface FairCard {
    id: string;
    gx: number;
    gy: number;
    title: string;
    text: string;
    read: boolean;
}

export interface FairCopperNode {
    id: string;
    gx: number;
    gy: number;
    collected: boolean;
}

export interface FairPickup {
    id: string;
    gx: number;
    gy: number;
    amount: number;
    collected: boolean;
}

export interface FairCache {
    id: string;
    gx: number;
    gy: number;
    health: number;
    opened: boolean;
    hidden: boolean;
}

export interface FairLevelState {
    dynamos: FairDynamo[];
    fights: FairFightZone[];
    cards: FairCard[];
    nodes: FairCopperNode[];
    pickups: FairPickup[];
    caches: FairCache[];
    dialsSet: boolean;
    wheelVista: boolean;
    gateOpen: boolean;
}

export const FAIR_DYNAMO_CODE = '1904';
export const FAIR_PYLON_PERIOD_MS = 950;

/** Arc pylons fire in three column-bands that sweep on a beat. */
export function fairHazardActive(gx: number, t: number): boolean {
    return Math.floor(gx / 4) % 3 === Math.floor(t / FAIR_PYLON_PERIOD_MS) % 3;
}

function buildFairTiles(): FairTile[][] {
    const W = FAIR_MAP_W;
    const H = FAIR_MAP_H;
    const g: FairTile[][] = Array.from({ length: H }, () => Array<FairTile>(W).fill(0));
    const wall = (x1: number, y1: number, x2: number, y2: number) => {
        for (let y = y1; y <= y2; y++)
            for (let x = x1; x <= x2; x++)
                if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = 1;
    };
    const carve = (x: number, y: number) => { g[y][x] = 0; };

    // perimeter
    wall(0, 0, W - 1, 0);
    wall(0, H - 1, W - 1, H - 1);
    wall(0, 0, 0, H - 1);
    wall(W - 1, 0, W - 1, H - 1);

    // —— Palace of Electricity (west building) ——
    wall(2, 3, 20, 3);
    wall(2, 19, 20, 19);
    wall(2, 3, 2, 19);
    wall(20, 3, 20, 19);
    carve(11, 19); carve(12, 19); // south doors → the Pike approach
    carve(20, 11); carve(20, 12); // east doors → the Grand Avenue

    // pylon rows — arcing hazards with coil pillars; cross on the dark beat
    for (const py of [9, 14]) {
        for (let x = 3; x <= 19; x++) {
            g[py][x] = [5, 9, 13, 17].includes(x) ? 1 : 2;
        }
    }

    // —— Festival Hall (north centre boss arena) ——
    wall(22, 2, 32, 2);
    wall(22, 9, 32, 9);
    wall(22, 2, 22, 9);
    wall(32, 2, 32, 9);
    carve(26, 9); carve(27, 9); // gate tiles (sealed until gateOpen)

    // —— Observation Wheel base (east plaza) ——
    wall(38, 13, 40, 14);

    // —— Pike stalls (walkable decor stands + banner poles) ——
    for (const [x, y] of [
        [6, 23], [12, 23], [18, 23], [28, 23], [34, 23], [40, 23],
        [8, 29], [17, 29], [26, 29], [38, 29],
    ] as const) if (g[y][x] === 0) g[y][x] = 3;

    // avenue planters
    for (const [x, y] of [[22, 16], [31, 16], [35, 11], [44, 20]] as const)
        if (g[y][x] === 0) g[y][x] = 3;

    return g;
}

export const FAIR_TILES = buildFairTiles();
export const FAIR_SPAWN = { gx: 23, gy: 31 };
export const FAIR_RELIC = { gx: 27, gy: 3 };
export const FAIR_GATE_TILES: [number, number][] = [[26, 9], [27, 9]];
export const FAIR_WHEEL = { gx: 39, gy: 13 };
export const FAIR_VISTA = { gx: 39, gy: 15 };

/** Patrolling Caretaker wardens — lantern cones cost vitality and shove. */
export interface FairWardenDef {
    id: string;
    x1: number; y1: number;
    x2: number; y2: number;
    speed: number;
}

export const FAIR_WARDENS: FairWardenDef[] = [
    { id: 'warden_avenue', x1: 26 * FAIR_TILE, y1: 11 * FAIR_TILE, x2: 26 * FAIR_TILE, y2: 20 * FAIR_TILE, speed: 26 },
    { id: 'warden_pike', x1: 16 * FAIR_TILE, y1: 25 * FAIR_TILE, x2: 31 * FAIR_TILE, y2: 25 * FAIR_TILE, speed: 30 },
];

export const FAIR_SPOT_RANGE = 72;
export const FAIR_SPOT_HALF_ANGLE = Math.PI / 6;

export const FAIR_CARDS: Record<string, { title: string; text: string }> = {
    card_0: {
        title: 'Postcard · The Pike at Dusk',
        text: 'They built an empire\'s smile out of staff and plaster and swore it eternal. Fifty nations paraded down this lane — each one an exhibit, each one a lesson in who holds the pen. Look how white the palaces are. Ask what the whiteness covers.',
    },
    card_1: {
        title: 'Postcard · The Palace of Electricity',
        text: 'Borrowed lightning, caged in copper and made to dance for a nickel. The dynamos hummed a note the newspapers never printed. Whatever truly lit this hall was demonstrated once, applauded twice, and quietly retired.',
    },
    card_2: {
        title: 'Postcard · The Observation Wheel',
        text: 'From the top car you could see the whole ivory city — twelve hundred palaces raised in a single season. A year later: rubble and receipts. Cathedrals are not built to be thrown away. Masks are.',
    },
};

export const FAIR_KEEPER_LINES: Record<string, string> = {
    wing_pike: 'Welcome to the Pike at dusk, child. The crowds are shades now, but the banners still lie beautifully. Read the ◆ postcard by the turnstiles, then walk the promenade.',
    wing_palace: 'The Palace of Electricity. The pylons still arc on the old rhythm — watch the sweep and cross on the dark beat. The four dynamos remember one year.',
    wing_wheel: 'The Observation Wheel — twenty-six stories of sky. From the top you could see the whole mask at once. The demolition crews missed something at its base.',
    wing_hall: 'Festival Hall. The glamour of the Fair thickened here until it took a shape and kept a ledger. Tread as a witness, not a guest.',
    wing_avenue: 'The Grand Avenue. Caretakers still walk their rounds with lanterns — the Fair never stopped guarding its secret. Stay out of the light.',
};

export const FAIR_RESPAWN_LINE =
    'Rest by the turnstiles. The Fair takes its toll from every visitor — pay it in patience, not in blood.';

export const FAIR_VISTA_LINE =
    'You stand beneath the great Wheel. Two hundred and sixty-four feet above, the top car once showed the whole ivory city at a glance — a mask so large it could only be seen from the sky.';

export function freshFairState(): FairLevelState {
    return {
        dynamos: [
            { id: 0, gx: 5, gy: 5, val: 0 },
            { id: 1, gx: 9, gy: 5, val: 0 },
            { id: 2, gx: 13, gy: 5, val: 0 },
            { id: 3, gx: 17, gy: 5, val: 0 },
        ],
        fights: [
            { id: 'fight_pike_1', gx: 10, gy: 26, radius: 18, combatId: 'fair_shades_1', cleared: false, hint: 'Two of the Erased drift the western Pike. Dodge their reach, then strike.' },
            { id: 'fight_pike_2', gx: 36, gy: 26, radius: 18, combatId: 'fair_shades_2', cleared: false, hint: 'Three Erased gather under the eastern arc-lamps. Draw one out at a time.' },
            { id: 'fight_wheel', gx: 39, gy: 18, radius: 18, combatId: 'fair_shades_3', cleared: false, hint: 'The Erased circle the Wheel\'s base, guarding what the crews missed.' },
            { id: 'fight_boss', gx: 27, gy: 5, radius: 22, combatId: 'fair_boss', cleared: false, hint: 'The Caretaker of the Fair keeps his ledger in Festival Hall. This is the Fair\'s last guard.' },
        ],
        cards: [
            { id: 'card_0', gx: 21, gy: 30, ...FAIR_CARDS.card_0, read: false },
            { id: 'card_1', gx: 12, gy: 6, ...FAIR_CARDS.card_1, read: false },
            { id: 'card_2', gx: 36, gy: 16, ...FAIR_CARDS.card_2, read: false },
        ],
        nodes: [
            { id: 'node_0', gx: 4, gy: 17, collected: false },
            { id: 'node_1', gx: 18, gy: 11, collected: false },
            { id: 'node_2', gx: 8, gy: 24, collected: false },
            { id: 'node_3', gx: 33, gy: 25, collected: false },
            { id: 'node_4', gx: 42, gy: 19, collected: false },
        ],
        pickups: [
            { id: 'hp_pike_w', gx: 14, gy: 30, amount: 25, collected: false },
            { id: 'hp_pike_e', gx: 30, gy: 24, amount: 25, collected: false },
            { id: 'hp_palace', gx: 4, gy: 12, amount: 30, collected: false },
            { id: 'hp_wheel', gx: 43, gy: 12, amount: 25, collected: false },
            { id: 'hp_lagoon', gx: 42, gy: 5, amount: 20, collected: false },
        ],
        caches: [
            { id: 'cache_wheel', gx: 41, gy: 15, health: 30, opened: false, hidden: true },
        ],
        dialsSet: false,
        wheelVista: false,
        gateOpen: false,
    };
}

const FAIR_DISC = (id: string) => `fair_${id}`;

export function hydrateFairState(character: GameCharacter): FairLevelState {
    const base = freshFairState();
    const disc = new Set(character.discovered);
    const dialsSet = disc.has(FAIR_DISC('dials_1904')) || character.solved.includes('puz_fair');

    let state: FairLevelState = {
        ...base,
        dynamos: dialsSet
            ? base.dynamos.map((d, i) => ({ ...d, val: Number(FAIR_DYNAMO_CODE[i]) }))
            : base.dynamos,
        fights: base.fights.map((f) => ({
            ...f,
            cleared: disc.has(FAIR_DISC(f.id)) || (f.combatId === 'fair_boss' && character.cleared.includes('dest_fair')),
        })),
        cards: base.cards.map((c) => ({ ...c, read: disc.has(FAIR_DISC(c.id)) })),
        nodes: base.nodes.map((n) => ({ ...n, collected: disc.has(FAIR_DISC(n.id)) })),
        pickups: base.pickups.map((p) => ({ ...p, collected: disc.has(FAIR_DISC(p.id)) })),
        caches: base.caches.map((c) => ({ ...c, opened: disc.has(FAIR_DISC(c.id)) })),
        dialsSet,
        wheelVista: disc.has(FAIR_DISC('wheel_vista')),
    };
    state = updateFairProgress(state);
    return state;
}

export function fairDiscoveriesFromState(level: FairLevelState, extra: string[] = []): string[] {
    const out: string[] = [...extra];
    for (const f of level.fights) if (f.cleared) out.push(FAIR_DISC(f.id));
    for (const c of level.cards) if (c.read) out.push(FAIR_DISC(c.id));
    for (const n of level.nodes) if (n.collected) out.push(FAIR_DISC(n.id));
    for (const p of level.pickups) if (p.collected) out.push(FAIR_DISC(p.id));
    for (const c of level.caches) if (c.opened) out.push(FAIR_DISC(c.id));
    if (level.dialsSet) out.push(FAIR_DISC('dials_1904'));
    if (level.wheelVista) out.push(FAIR_DISC('wheel_vista'));
    return out;
}

export function updateFairProgress(level: FairLevelState): FairLevelState {
    const pike1 = level.fights.find((f) => f.id === 'fight_pike_1')?.cleared ?? false;
    const pike2 = level.fights.find((f) => f.id === 'fight_pike_2')?.cleared ?? false;
    const gateOpen = level.dialsSet && pike1 && pike2;
    return { ...level, gateOpen };
}

export function isFairSolid(gx: number, gy: number, level: FairLevelState): boolean {
    if (gx < 0 || gx >= FAIR_MAP_W || gy < 0 || gy >= FAIR_MAP_H) return true;
    if (FAIR_TILES[gy][gx] === 1) return true;
    if (!level.gateOpen && FAIR_GATE_TILES.some(([x, y]) => x === gx && y === gy)) return true;
    return false;
}

export function allFairCardsRead(level: FairLevelState): boolean {
    return level.cards.every((c) => c.read);
}

export function canRevealFairCache(level: FairLevelState, character: GameCharacter): boolean {
    return allFairCardsRead(level) || canSeeHiddenPlaces(character);
}

export function fairZoneLabel(gx: number, gy: number): string {
    if (gy >= 22) return 'The Pike';
    if (gx <= 20 && gy <= 19) return 'Palace of Electricity';
    if (gy <= 9 && gx >= 22 && gx <= 32) return 'Festival Hall';
    if (gx >= 33 && gy >= 10 && gy <= 21) return 'The Observation Wheel';
    return 'The Grand Avenue';
}

export function fairWingId(gx: number, gy: number): string | null {
    const map: Record<string, string> = {
        'The Pike': 'wing_pike',
        'Palace of Electricity': 'wing_palace',
        'Festival Hall': 'wing_hall',
        'The Observation Wheel': 'wing_wheel',
        'The Grand Avenue': 'wing_avenue',
    };
    return map[fairZoneLabel(gx, gy)] ?? null;
}

export interface FairCombatDef extends CombatConfig {
    id: string;
    skirmish?: boolean;
}

export const FAIR_COMBATS: Record<string, FairCombatDef> = {
    fair_shades_1: {
        id: 'fair_shades_1',
        skirmish: true,
        challenge: 'Two of the Erased drift across the Pike — children of ledgers no record kept. Dodge their reach and strike.',
        enemyCount: 2,
        enemyHp: 18,
        enemyDmg: 8,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The shades thin into dusk air. The Pike lies quiet — a second trial waits across the promenade.',
    },
    fair_shades_2: {
        id: 'fair_shades_2',
        skirmish: true,
        challenge: 'Three Erased gather beneath the eastern arc-lamps, drawn like moths to a borrowed fire.',
        enemyCount: 3,
        enemyHp: 20,
        enemyDmg: 9,
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The lamps steady. Whatever the Fair erased, it cannot erase you. Set the dynamos in the Palace.',
    },
    fair_shades_3: {
        id: 'fair_shades_3',
        skirmish: true,
        challenge: 'The Erased circle the Wheel\'s base, guarding something the demolition crews missed.',
        enemyCount: 2,
        enemyHp: 22,
        enemyDmg: 10,
        enemyKinds: ['grunt', 'caster'],
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The base of the Wheel falls silent. Look close — the crews missed a cache.',
    },
    fair_boss: {
        id: 'fair_boss',
        challenge: 'The white halls are not empty. The Erased — those the ledgers forgot — drift the corridors, and the Caretaker comes to keep his secret buried.',
        enemyCount: 4,
        enemyHp: 24,
        enemyDmg: 10,
        bossName: 'The Caretaker of the Fair',
        bossArt: 'wraith',
        bossHp: 165,
        bossDmg: 20,
        bossPattern: 'blink',
        victory: 'The Caretaker fades, his ledger spilling burned pages across the marble. What was hidden is yours to read.',
    },
};

export function fairDestinationStub(combatId: string) {
    const c = FAIR_COMBATS[combatId];
    return {
        poiId: 'dest_fair',
        kind: 'portal' as const,
        name: 'St. Louis 1904 — The Gilded Fair',
        era: '',
        accent: '#fbbf24',
        bg: ['#1c1606', '#0a0803'] as [string, string],
        guide: { name: 'Mabel Hart', role: '', tile: { col: 0, row: 5 }, intro: '' },
        lore: [],
        relics: [],
        combat: c,
    };
}

export const FAIR_HINT_DELAYS_SEC = [10, 22, 38] as const;

export interface FairGuideContext {
    isGuardianCleared: boolean;
    isSolved: boolean;
    minigameDone: boolean;
    relicClaimed: boolean;
    hasWeapon: boolean;
}

export interface FairGuideStep {
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
): FairGuideStep {
    return { id, objective, tip, waypoint, timedHints: [h1, h2, h3] };
}

const cardRead = (level: FairLevelState, id: string) => level.cards.find((c) => c.id === id)?.read ?? false;
const fightDone = (level: FairLevelState, id: string) => level.fights.find((f) => f.id === id)?.cleared ?? false;

export function fairGuideStep(level: FairLevelState, ctx: FairGuideContext): FairGuideStep {
    if (ctx.relicClaimed) {
        return step('done', 'The Token is yours', 'Return to the overworld when ready.', null,
            'Your work at the Fair is complete.', 'Carry the Token forward — brass remembers.', 'The ivory city lets you go.');
    }

    const bossDone = ctx.isGuardianCleared || fightDone(level, 'fight_boss');
    const solved = ctx.isSolved || level.dialsSet;

    if (bossDone && solved) {
        return step('claim_relic', 'Claim the Fairgrounds Token', 'It gleams by the Festival Hall stage.',
            { gx: FAIR_RELIC.gx, gy: FAIR_RELIC.gy },
            '【Mabel Hart】 The Caretaker\'s ledger is ash. The Token gleams by the stage — stand beneath it.',
            '【Mabel Hart】 North through the hall, past where the wraith fell.',
            '【Mabel Hart】 Step directly onto the brass gleam. It waits for a witness.');
    }

    if (level.gateOpen && !bossDone) {
        return step('fight_boss', 'Face the Caretaker of the Fair', 'The boss trial waits inside Festival Hall.',
            { gx: 27, gy: 6 },
            '【Mabel Hart】 The hall doors stand open. The Caretaker blinks between the columns — enter the red circle when ready.',
            '【Mabel Hart】 Rest at red orbs first if the Pike wore you thin.',
            '【Mabel Hart】 He keeps the Fair\'s secret in a burned ledger. Take it from him.');
    }

    if (!cardRead(level, 'card_0')) {
        return step('card_0', 'Read the first postcard', 'Stand by the amber ◆ near the turnstiles and tap Read.',
            { gx: 21, gy: 30 },
            '【Mabel Hart】 The ◆ beside the turnstiles is a postcard from the Pike. Tap Read when close.',
            '【Mabel Hart】 Dark facades are walls — the promenade is your road. Begin with the card at your feet.',
            '【Mabel Hart】 Walk to the glowing ◆ just west of where you entered.');
    }

    if (!fightDone(level, 'fight_pike_1')) {
        const f = level.fights.find((x) => x.id === 'fight_pike_1')!;
        return step('fight_pike_1', 'Clear the western Pike trial (1/2)',
            ctx.hasWeapon ? 'Enter the gold dashed circle west along the promenade.' : 'Arm yourself at Truth\'s Hut first.',
            { gx: f.gx, gy: f.gy },
            `【Mabel Hart】 ${ctx.hasWeapon ? 'The first trial is west — a gold dashed circle among the stalls.' : 'Forge a weapon at Truth\'s Hut before the Erased will engage.'}`,
            `【Mabel Hart】 ${f.hint}`,
            '【Mabel Hart】 Keep clear of the Caretaker\'s lantern on your way — the light costs blood.');
    }

    if (!fightDone(level, 'fight_pike_2')) {
        const f = level.fights.find((x) => x.id === 'fight_pike_2')!;
        return step('fight_pike_2', 'Clear the eastern Pike trial (2/2)',
            ctx.hasWeapon ? 'A second gold circle waits east along the promenade.' : 'Arm yourself at Truth\'s Hut first.',
            { gx: f.gx, gy: f.gy },
            '【Mabel Hart】 One more trial on the Pike — east, past the stalls.',
            `【Mabel Hart】 ${f.hint}`,
            '【Mabel Hart】 Strike the copper sheets you pass — Hana can temper them at the forge.');
    }

    if (!level.dialsSet) {
        return step('dynamos', 'Set the dynamos to 1·9·0·4',
            ctx.minigameDone
                ? 'In the Palace of Electricity — cross the arc rows on the dark beat, then cycle each dynamo.'
                : 'Pass the White Blocks trial in Records before the current will flow.',
            { gx: 5, gy: 5 },
            '【Mabel Hart】 The Palace of Electricity stands west. The four dynamos remember one year: nineteen hundred and four.',
            '【Mabel Hart】 The pylons arc in a sweep — wait for the dark beat, then cross. Tap Cycle at each dynamo.',
            ctx.minigameDone
                ? '【Mabel Hart】 Left to right: 1 · 9 · 0 · 4. The turnstile listens.'
                : '【Mabel Hart】 The dials will not bite until the White Blocks trial in Records is passed.');
    }

    if (!level.gateOpen) {
        return step('open_gate', 'Open Festival Hall', 'Both Pike trials and the dynamos open the hall gate.',
            { gx: 26, gy: 10 },
            '【Mabel Hart】 The hall gate senses the year and the quiet Pike. Walk to the golden seal.',
            '【Mabel Hart】 If it holds, a trial or a dynamo still waits.',
            '【Mabel Hart】 The seal stands at the south face of Festival Hall.');
    }

    return step('explore', 'Explore the Fair', 'Read ◆ postcards, strike copper, visit the Wheel\'s base.',
        { gx: FAIR_VISTA.gx, gy: FAIR_VISTA.gy },
        '【Mabel Hart】 The Wheel\'s base holds a vista — and perhaps more, for those who read every postcard.',
        '【Mabel Hart】 Red orbs restore vitality. Amber ◆ stones hold the Fair\'s own confessions.',
        '【Mabel Hart】 Stay out of the lantern light. The Caretakers still take their toll.');
}

export const FAIR_MINIMAP_TERRAIN_COLORS: Record<number, string> = {
    0: '#6e6046',
    1: '#15151f',
    2: '#b45309',
    3: '#565064',
};

export function fairMinimapTerrain(): number[][] {
    return FAIR_TILES;
}

export function fairMinimapGates(level: FairLevelState): DestinationMapGate[] {
    return [
        { id: 'gate_festival', tiles: FAIR_GATE_TILES, open: level.gateOpen },
    ];
}

export function fairMinimapPois(
    level: FairLevelState,
    opts: { cacheVisible: boolean; relicClaimed: boolean; solved: boolean },
): DestinationMapPoi[] {
    const pois: DestinationMapPoi[] = [
        { id: 'spawn', gx: FAIR_SPAWN.gx, gy: FAIR_SPAWN.gy, kind: 'spawn' },
        { id: 'relic', gx: FAIR_RELIC.gx, gy: FAIR_RELIC.gy, kind: 'relic', muted: opts.relicClaimed },
        { id: 'wheel', gx: FAIR_WHEEL.gx, gy: FAIR_WHEEL.gy, kind: 'npc', muted: level.wheelVista },
    ];
    for (const d of level.dynamos) {
        pois.push({ id: `dynamo_${d.id}`, gx: d.gx, gy: d.gy, kind: 'crystal', muted: !opts.solved });
    }
    for (const c of level.cards) {
        pois.push({ id: c.id, gx: c.gx, gy: c.gy, kind: 'lore', muted: c.read });
    }
    for (const ch of level.caches) {
        pois.push({ id: ch.id, gx: ch.gx, gy: ch.gy, kind: 'chest', secret: ch.hidden && !opts.cacheVisible, muted: ch.opened });
    }
    for (const p of level.pickups) {
        pois.push({ id: p.id, gx: p.gx, gy: p.gy, kind: 'health', muted: p.collected });
    }
    for (const n of level.nodes) {
        pois.push({ id: n.id, gx: n.gx, gy: n.gy, kind: 'iron', muted: n.collected });
    }
    for (const f of level.fights) {
        pois.push({
            id: f.id, gx: f.gx, gy: f.gy,
            kind: f.combatId === 'fair_boss' ? 'boss' : 'fight',
            muted: f.cleared,
        });
    }
    return pois;
}
