import type { CombatConfig } from '@/lib/game/destinations';
import type { GameCharacter } from '@/lib/store/useGameStore';
import type { DestinationMapGate, DestinationMapPoi } from '@/lib/game/mapReveal';

// ============================================================
//  THE EMERALD HALLS — "As Above, So Below": the finale age.
//  Luminous green mirrored halls: the Antechamber of Smoke,
//  the Inverted Gallery (secrets readable only in reflection),
//  the Orrery of seven wanderers, and the Emerald Throne where
//  the Guardian of the Threshold coils around the last Fragment.
// ============================================================

export const EMERALD_MAP_W = 44;
export const EMERALD_MAP_H = 36;
export const EMERALD_TILE = 16;
export const EMERALD_VIEW_TILES = 13;

/** 0 floor · 1 wall · 2 smoke vent · 3 mosaic decor */
export type EmeraldTile = 0 | 1 | 2 | 3;

/** Row index where the mirror-floor begins. The reflection axis sits on the
 *  pixel line EMERALD_MIRROR_Y * EMERALD_TILE: source row gy (16..20) reflects
 *  onto row (2 * EMERALD_MIRROR_Y - 1) - gy = 41 - gy (21..25). */
export const EMERALD_MIRROR_Y = 21;
export const mirrorRow = (gy: number) => 2 * EMERALD_MIRROR_Y - 1 - gy;

export interface EmeraldDoor {
    id: string;
    gx: number;
    gy: number;
    kind: 'true' | 'false' | 'throne';
    open: boolean;
    label: string;
}

export interface EmeraldFightZone {
    id: string;
    gx: number;
    gy: number;
    radius: number;
    combatId: string;
    cleared: boolean;
    hint: string;
}

export interface EmeraldLoreStone {
    id: string;
    gx: number;
    gy: number;
    title: string;
    text: string;
    read: boolean;
}

export interface EmeraldCosmicNode {
    id: string;
    gx: number;
    gy: number;
    collected: boolean;
}

export interface EmeraldPickup {
    id: string;
    gx: number;
    gy: number;
    kind: 'health';
    amount: number;
    collected: boolean;
}

export interface EmeraldChest {
    id: string;
    gx: number;
    gy: number;
    health: number;
    label: string;
    opened: boolean;
}

export interface EmeraldVent {
    id: string;
    gx: number;
    gy: number;
    tripped: boolean;
}

export interface EmeraldShrine {
    id: number;
    name: string;
    gx: number;
    gy: number;
    color: string;
}

export interface EmeraldOrb {
    id: number;
    cx: number;
    cy: number;
    radius: number;
    speed: number;
    angle: number;
}

export interface EmeraldLevelState {
    doors: EmeraldDoor[];
    fights: EmeraldFightZone[];
    axioms: EmeraldLoreStone[];
    nodes: EmeraldCosmicNode[];
    pickups: EmeraldPickup[];
    chests: EmeraldChest[];
    vents: EmeraldVent[];
    trueDoorFound: boolean;
    mirrorSecretFound: boolean;
    throneOpen: boolean;
    bossFelled: boolean;
}

// —— landmarks ————————————————————————————————————————————————
export const EMERALD_SPAWN = { gx: 22, gy: 31 };
export const EMERALD_RELIC = { gx: 40, gy: 8 };   // the Emerald Throne seat
export const EMERALD_THRONE_DOOR = { gx: 30, gy: 8 };
export const EMERALD_MIRROR_CACHE = { gx: 38, gy: 23 }; // exists only in the reflection
export const EMERALD_TRUE_DOOR_ID = 'door_east';

/** Antechamber column bases (solid). */
const ANTE_COLS: [number, number][] = [];
for (const x of [8, 13, 18, 26, 31, 36]) for (const y of [29, 32]) ANTE_COLS.push([x, y]);

/** Gallery columns (upper half — these are what the mirror repeats below). */
export const EMERALD_GALLERY_COLUMNS: [number, number][] = [];
for (const x of [6, 12, 24, 30, 36, 40]) for (const y of [17, 19]) EMERALD_GALLERY_COLUMNS.push([x, y]);

/** Glyph pedestals beside each gallery door. Blank tablets above — only the
 *  reflection shows which arch bears the burning glyph. */
export const EMERALD_GLYPHS: { doorId: string; gx: number; gy: number }[] = [
    { doorId: 'door_west', gx: 7, gy: 16 },
    { doorId: 'door_mid', gx: 17, gy: 16 },
    { doorId: 'door_east', gx: 27, gy: 16 },
];

export const EMERALD_SHRINES: EmeraldShrine[] = [
    { id: 0, name: 'Saturn', gx: 16, gy: 2, color: '#eab308' },
    { id: 1, name: 'Jupiter', gx: 8, gy: 4, color: '#f97316' },
    { id: 2, name: 'Mars', gx: 24, gy: 4, color: '#ef4444' },
    { id: 3, name: 'Sun', gx: 16, gy: 7, color: '#facc15' },
    { id: 4, name: 'Venus', gx: 8, gy: 10, color: '#ec4899' },
    { id: 5, name: 'Mercury', gx: 24, gy: 10, color: '#3b82f6' },
    { id: 6, name: 'Moon', gx: 16, gy: 12, color: '#a855f7' },
];

/** Two Astral Orbs riding rings around the Sun sphere — knockback, -8 vitality,
 *  and the chain of wanderers resets. */
export function freshEmeraldOrbs(): EmeraldOrb[] {
    return [
        { id: 0, cx: 16 * EMERALD_TILE + 8, cy: 7 * EMERALD_TILE + 8, radius: 46, speed: 2.1, angle: 0 },
        { id: 1, cx: 16 * EMERALD_TILE + 8, cy: 7 * EMERALD_TILE + 8, radius: 72, speed: -1.5, angle: Math.PI },
    ];
}

function buildEmeraldTiles(): EmeraldTile[][] {
    const W = EMERALD_MAP_W;
    const H = EMERALD_MAP_H;
    const g: EmeraldTile[][] = Array.from({ length: H }, () => Array<EmeraldTile>(W).fill(0));
    const wall = (x1: number, y1: number, x2: number, y2: number) => {
        for (let y = y1; y <= y2; y++)
            for (let x = x1; x <= x2; x++)
                if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = 1;
    };
    const carve = (x: number, y: number) => { g[y][x] = 0; };

    // outer shell
    wall(0, 0, W - 1, 0);
    wall(0, H - 1, W - 1, H - 1);
    wall(0, 0, 0, H - 1);
    wall(W - 1, 0, W - 1, H - 1);

    // —— Antechamber of Smoke (south, y 27..34) ——
    wall(1, 26, W - 2, 26);           // north wall of the antechamber
    carve(21, 26); carve(22, 26);     // the gate of smoke (always open)
    for (const [x, y] of ANTE_COLS) g[y][x] = 1;

    // —— Inverted Gallery (y 16..25) · three arches north (y 15) ——
    wall(1, 15, W - 2, 15);
    carve(8, 15); carve(18, 15); carve(28, 15); // door tiles (gated by level state)
    for (const [x, y] of EMERALD_GALLERY_COLUMNS) g[y][x] = 1;
    for (const gl of EMERALD_GLYPHS) g[gl.gy][gl.gx] = 1; // glyph pedestals

    // —— Orrery (north-west, x 1..29) / Emerald Throne (north-east, x 31..42) ——
    wall(30, 1, 30, 14);
    carve(EMERALD_THRONE_DOOR.gx, EMERALD_THRONE_DOOR.gy); // throne door (opens on solve)

    // mosaic inlay (walkable decor) — the hermetic seal around the Sun sphere
    for (const [x, y] of [[15, 6], [17, 6], [15, 8], [17, 8], [16, 5], [16, 9]] as const)
        if (g[y][x] === 0) g[y][x] = 3;
    // mosaic path down the antechamber aisle
    for (const y of [28, 30, 33]) if (g[y][22] === 0) g[y][22] = 3;

    // smoke vents (hazard tiles) in the antechamber
    for (const [x, y] of [[19, 29], [25, 29], [31, 33]] as const)
        if (g[y][x] === 0) g[y][x] = 2;

    return g;
}

export const EMERALD_TILES = buildEmeraldTiles();

// —— voice of the halls ———————————————————————————————————————
export const EMERALD_AXIOMS: Record<string, { title: string; text: string }> = {
    axiom_1: {
        title: 'The First Axiom — The All Is Mind',
        text: 'Every hall you have walked, every age you unsealed — thought, thinking itself into stone. The universe is mental. Change the thought, and the stone must follow.',
    },
    axiom_2: {
        title: 'The Second Axiom — Correspondence',
        text: 'As above, so below; as below, so above. The pattern of the heavens is written in the seed, the cell, the soul. Read the small truly and you have read the vast.',
    },
    axiom_3: {
        title: 'The Third Axiom — Vibration',
        text: 'Nothing rests. Everything moves; everything vibrates. What you call matter is a slow note, what you call spirit a swift one — and between the two lies every mystery of these halls.',
    },
};

export const EMERALD_KEEPER_LINES: Record<string, string> = {
    wing_antechamber: 'Welcome to the last age. Smoke first, then clarity — read the three axioms among the columns before you seek the doors.',
    wing_gallery: 'The Inverted Gallery. The wall lies; the floor confesses. What is written above is blank — walk the dark glass and read what only the reflection shows.',
    wing_orrery: 'The Orrery. Seven wanderers, one law. Touch them from the slowest sphere to the swiftest — Saturn leads, the Moon closes — and keep clear of the burning orbits.',
    wing_throne: 'The Emerald Throne. The Guardian of the Threshold coils here, and nothing false passes it. Speak your strikes plainly.',
};

export const EMERALD_RESPAWN_LINE =
    'Rest in the smoke. The halls do not punish the fallen — only the unreflecting.';

export const EMERALD_MIRROR_LINES = {
    blankGlyphs: 'Three blank tablets above three sealed arches. Yet the glass below shimmers — as above, so below.',
    trueDoor: 'The arch answers your step and swings wide. The mirror told true — what glows below is law above.',
    falseDoorSealed: 'The seam is silent now. The mirror still denies this door.',
    secret: 'Your hand closes on a cache that exists only in the reflection — green glass, cold as a held breath. The halls reward those who trust the glass.',
};

// —— combats ———————————————————————————————————————————————————
export interface EmeraldCombatDef extends CombatConfig {
    id: string;
    skirmish?: boolean;
}

export const EMERALD_COMBATS: Record<string, EmeraldCombatDef> = {
    emerald_ante: {
        id: 'emerald_ante',
        skirmish: true,
        challenge: 'Thought-forms condense out of the emerald smoke. They test whether you walk awake.',
        enemyCount: 2,
        enemyHp: 26,
        enemyDmg: 11,
        enemyKinds: ['grunt', 'caster'],
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The smoke thins. The gate of smoke stands open — the Inverted Gallery waits beyond.',
    },
    emerald_ambush: {
        id: 'emerald_ambush',
        skirmish: true,
        challenge: 'The arch is false — shades pour from the seam to punish the unreflecting.',
        enemyCount: 3,
        enemyHp: 24,
        enemyDmg: 12,
        enemyKinds: ['flanker', 'grunt', 'flanker'],
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The shades scatter and the false arch seals itself — glass to glass. Read the reflection before you choose again.',
    },
    emerald_orrery: {
        id: 'emerald_orrery',
        skirmish: true,
        challenge: 'Keepers of the spheres wake among the orbits. They will not let an untested hand touch the wanderers.',
        enemyCount: 3,
        enemyHp: 28,
        enemyDmg: 12,
        enemyKinds: ['caster', 'brute', 'caster'],
        bossName: '',
        bossHp: 0,
        bossDmg: 0,
        victory: 'The keepers bow out of the orbits. Saturn first — the Moon last. Mind the burning rings.',
    },
    emerald_boss: {
        id: 'emerald_boss',
        challenge: 'No one reads the Tablets unchallenged. The thought-forms of every age that ever sought them rise — and the Guardian of the Threshold rises with them.',
        enemyCount: 4,
        enemyHp: 30,
        enemyDmg: 12,
        bossName: 'The Guardian of the Threshold',
        bossArt: 'serpent',
        bossPattern: 'rings',
        bossDifficulty: 4,
        bossHp: 230,
        bossDmg: 24,
        victory: 'The Guardian inclines its head and unmakes itself. "Pass," says Hermes. "You have earned the All."',
    },
};

export function emeraldDestinationStub(combatId: string) {
    const c = EMERALD_COMBATS[combatId];
    return {
        poiId: 'dest_emerald',
        kind: 'portal' as const,
        name: 'The Emerald Halls',
        era: '',
        accent: '#10b981',
        bg: ['#04140f', '#020a07'] as [string, string],
        guide: { name: 'Hermes Trismegistus', role: '', tile: { col: 1, row: 11 }, intro: '' },
        lore: [],
        relics: [],
        combat: c,
    };
}

// —— level state ———————————————————————————————————————————————
export function freshEmeraldState(): EmeraldLevelState {
    return {
        doors: [
            { id: 'door_west', gx: 8, gy: 15, kind: 'false', open: false, label: 'Western arch' },
            { id: 'door_mid', gx: 18, gy: 15, kind: 'false', open: false, label: 'Middle arch' },
            { id: 'door_east', gx: 28, gy: 15, kind: 'true', open: false, label: 'Eastern arch' },
            { id: 'door_throne', gx: EMERALD_THRONE_DOOR.gx, gy: EMERALD_THRONE_DOOR.gy, kind: 'throne', open: false, label: 'Throne door' },
        ],
        fights: [
            { id: 'fight_ante', gx: 22, gy: 28, radius: 18, combatId: 'emerald_ante', cleared: false, hint: 'Thought-forms bar the gate of smoke. Dodge, then strike them apart.' },
            { id: 'fight_ambush_w', gx: 8, gy: 15, radius: 20, combatId: 'emerald_ambush', cleared: false, hint: 'The western arch shivers — shades wait behind a false door.' },
            { id: 'fight_ambush_m', gx: 18, gy: 15, radius: 20, combatId: 'emerald_ambush', cleared: false, hint: 'The middle arch shivers — shades wait behind a false door.' },
            { id: 'fight_orrery', gx: 22, gy: 12, radius: 20, combatId: 'emerald_orrery', cleared: false, hint: 'Keepers of the spheres circle the orbits. Clear them before you touch the wanderers.' },
            { id: 'fight_boss', gx: 36, gy: 8, radius: 22, combatId: 'emerald_boss', cleared: false, hint: 'The Guardian of the Threshold coils about the throne. This is the last measure.' },
        ],
        axioms: [
            { id: 'axiom_1', gx: 19, gy: 31, ...EMERALD_AXIOMS.axiom_1, read: false },
            { id: 'axiom_2', gx: 5, gy: 29, ...EMERALD_AXIOMS.axiom_2, read: false },
            { id: 'axiom_3', gx: 39, gy: 29, ...EMERALD_AXIOMS.axiom_3, read: false },
        ],
        nodes: [
            { id: 'cosmic_0', gx: 3, gy: 33, collected: false },
            { id: 'cosmic_1', gx: 40, gy: 31, collected: false },
            { id: 'cosmic_2', gx: 21, gy: 23, collected: false },
            { id: 'cosmic_3', gx: 3, gy: 7, collected: false },
            { id: 'cosmic_4', gx: 27, gy: 2, collected: false },
        ],
        pickups: [
            { id: 'hp_ante', gx: 37, gy: 33, kind: 'health', amount: 25, collected: false },
            { id: 'hp_gallery_w', gx: 3, gy: 20, kind: 'health', amount: 25, collected: false },
            { id: 'hp_gallery_e', gx: 33, gy: 24, kind: 'health', amount: 30, collected: false },
            { id: 'hp_orrery', gx: 4, gy: 13, kind: 'health', amount: 30, collected: false },
            { id: 'hp_throne', gx: 33, gy: 13, kind: 'health', amount: 30, collected: false },
        ],
        chests: [
            { id: 'chest_gallery', gx: 40, gy: 20, health: 25, label: 'Reliquary of the Gallery', opened: false },
            { id: 'chest_orrery', gx: 2, gy: 2, health: 30, label: "Sphere-tender's cache", opened: false },
        ],
        vents: [
            { id: 'vent_0', gx: 19, gy: 29, tripped: false },
            { id: 'vent_1', gx: 25, gy: 29, tripped: false },
            { id: 'vent_2', gx: 31, gy: 33, tripped: false },
        ],
        trueDoorFound: false,
        mirrorSecretFound: false,
        throneOpen: false,
        bossFelled: false,
    };
}

const EMERALD_DISC = (id: string) => `emerald_${id}`;

export function hydrateEmeraldState(character: GameCharacter): EmeraldLevelState {
    const base = freshEmeraldState();
    const disc = new Set(character.discovered);
    const fights = base.fights.map((f) => ({
        ...f,
        cleared: disc.has(EMERALD_DISC(f.id)) || (f.combatId === 'emerald_boss' && character.cleared.includes('dest_emerald')),
    }));
    const state: EmeraldLevelState = {
        ...base,
        fights,
        axioms: base.axioms.map((s) => ({ ...s, read: disc.has(EMERALD_DISC(s.id)) })),
        nodes: base.nodes.map((n) => ({ ...n, collected: disc.has(EMERALD_DISC(n.id)) })),
        pickups: base.pickups.map((p) => ({ ...p, collected: disc.has(EMERALD_DISC(p.id)) })),
        chests: base.chests.map((c) => ({ ...c, opened: disc.has(EMERALD_DISC(c.id)) })),
        vents: base.vents.map((v) => ({ ...v, tripped: disc.has(EMERALD_DISC(v.id)) })),
        trueDoorFound: disc.has(EMERALD_DISC('truedoor')),
        mirrorSecretFound: disc.has(EMERALD_DISC('secret_mirror')),
        throneOpen: character.solved.includes('puz_emerald'),
        bossFelled: false,
    };
    return updateEmeraldProgress(state);
}

export function emeraldDiscoveriesFromState(level: EmeraldLevelState, extra: string[] = []): string[] {
    const out: string[] = [...extra];
    for (const f of level.fights) if (f.cleared) out.push(EMERALD_DISC(f.id));
    for (const s of level.axioms) if (s.read) out.push(EMERALD_DISC(s.id));
    for (const n of level.nodes) if (n.collected) out.push(EMERALD_DISC(n.id));
    for (const p of level.pickups) if (p.collected) out.push(EMERALD_DISC(p.id));
    for (const c of level.chests) if (c.opened) out.push(EMERALD_DISC(c.id));
    for (const v of level.vents) if (v.tripped) out.push(EMERALD_DISC(v.id));
    if (level.trueDoorFound) out.push(EMERALD_DISC('truedoor'));
    if (level.mirrorSecretFound) out.push(EMERALD_DISC('secret_mirror'));
    return out;
}

/** Recompute derived flags: door open states + bossFelled. */
export function updateEmeraldProgress(level: EmeraldLevelState): EmeraldLevelState {
    const bossFelled = level.fights.find((f) => f.combatId === 'emerald_boss')?.cleared ?? false;
    const doors = level.doors.map((d) => {
        if (d.kind === 'true') return { ...d, open: level.trueDoorFound };
        if (d.kind === 'throne') return { ...d, open: level.throneOpen };
        return { ...d, open: false }; // false arches always reseal
    });
    return { ...level, doors, bossFelled };
}

export function isEmeraldSolid(gx: number, gy: number, level: EmeraldLevelState): boolean {
    if (gx < 0 || gx >= EMERALD_MAP_W || gy < 0 || gy >= EMERALD_MAP_H) return true;
    const door = level.doors.find((d) => d.gx === gx && d.gy === gy);
    if (door) {
        if (door.kind === 'true') return !level.trueDoorFound;
        if (door.kind === 'throne') return !level.throneOpen;
        return true; // false arches never open
    }
    return EMERALD_TILES[gy][gx] === 1;
}

// —— zones ————————————————————————————————————————————————————
export function emeraldZoneLabel(gx: number, gy: number): string | null {
    if (gy >= 27) return 'Antechamber of Smoke';
    if (gy >= 16) return 'The Inverted Gallery';
    if (gx <= 30) return 'The Orrery';
    return 'The Emerald Throne';
}

export function emeraldWingId(gx: number, gy: number): string | null {
    const label = emeraldZoneLabel(gx, gy);
    if (!label) return null;
    const map: Record<string, string> = {
        'Antechamber of Smoke': 'wing_antechamber',
        'The Inverted Gallery': 'wing_gallery',
        'The Orrery': 'wing_orrery',
        'The Emerald Throne': 'wing_throne',
    };
    return map[label] ?? null;
}

// —— guide machine ——————————————————————————————————————————————
export const EMERALD_HINT_DELAYS_SEC = [12, 26, 44] as const;

export interface EmeraldGuideContext {
    isGuardianCleared: boolean;
    isSolved: boolean;
    minigameDone: boolean;
    relicClaimed: boolean;
    hasWeapon: boolean;
    shrinesLit: number;
}

export interface EmeraldGuideStep {
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
): EmeraldGuideStep {
    return { id, objective, tip, waypoint, timedHints: [h1, h2, h3] };
}

const axiomRead = (level: EmeraldLevelState, id: string) => level.axioms.find((s) => s.id === id)?.read ?? false;
const fightDone = (level: EmeraldLevelState, id: string) => level.fights.find((f) => f.id === id)?.cleared ?? false;

export function emeraldGuideStep(level: EmeraldLevelState, ctx: EmeraldGuideContext): EmeraldGuideStep {
    const throneOpen = level.throneOpen || ctx.isSolved;

    if (ctx.relicClaimed) {
        return step('done', 'The Fragment is yours', 'Return to the overworld when ready — the last age is read.', null,
            '【Hermes】 The halls hold nothing more from you.', '【Hermes】 Carry the Fragment. It holds light after the room goes dark.', '【Hermes】 As above, so below. So within.');
    }

    if (level.bossFelled || ctx.isGuardianCleared) {
        if (throneOpen) {
            return step('claim_relic', 'Claim the Emerald Fragment', 'It rests upon the throne where the Guardian coiled.',
                { gx: EMERALD_RELIC.gx, gy: EMERALD_RELIC.gy },
                '【Hermes】 The throne is empty of guardians and full of light. Walk to the green gleam.',
                '【Hermes】 East past the fallen threshold — stand at the seat itself.',
                '【Hermes】 The Fragment waits on the throne. Step directly beneath its glow.');
        }
    }

    if (throneOpen && !fightDone(level, 'fight_boss')) {
        return step('fight_boss', 'Face the Guardian of the Threshold', 'The throne door stands open — the last trial is east of the Orrery.',
            { gx: 36, gy: 8 },
            '【Hermes】 The seven spheres sing and the throne door stands open. The Guardian waits within the red circle.',
            '【Hermes】 Rest at the red orbs first if your vitality runs low. The Threshold does not forgive twice.',
            '【Hermes】 Through the eastern door of the Orrery — the pulsing marker leads to the Guardian.');
    }

    if (level.trueDoorFound) {
        if (!fightDone(level, 'fight_orrery')) {
            const f = level.fights.find((x) => x.id === 'fight_orrery')!;
            return step('fight_orrery', 'Clear the keepers of the spheres', ctx.hasWeapon ? 'Enter the gold dashed circle in the Orrery.' : "Arm yourself at Truth's Hut first.",
                { gx: f.gx, gy: f.gy },
                `【Hermes】 ${ctx.hasWeapon ? 'The keepers circle the orbits — step into the gold circle when ready.' : "Forge a weapon at Truth's Hut before the keepers will engage."}`,
                `【Hermes】 ${f.hint}`,
                '【Hermes】 The Orrery lies through the eastern arch — the one the mirror lit.');
        }
        if (!ctx.minigameDone && ctx.shrinesLit >= 6) {
            return step('records_trial', 'Pass the Trial of the Seven Spheres', 'Open Records and clear the trial — then the seventh sphere will answer.', null,
                '【Hermes】 The seventh wanderer refuses an untested hand. Records holds the Trial of the Seven Spheres.',
                '【Hermes】 Six spheres burn. The last waits on your trial, not your feet.',
                '【Hermes】 Return with the trial passed and touch the Moon.');
        }
        if (ctx.shrinesLit < 7) {
            const next = EMERALD_SHRINES[ctx.shrinesLit];
            const order = EMERALD_SHRINES.map((s) => s.name);
            return step(
                `shrine_${next.id}`,
                `Touch the ${next.name} sphere (${ctx.shrinesLit + 1}/7)`,
                'Chaldean order — slowest to swiftest: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon.',
                { gx: next.gx, gy: next.gy },
                `【Hermes】 The ${next.name} sphere waits. Walk onto it — and stay clear of the burning orbits.`,
                `【Hermes】 The order so far: ${order.slice(0, ctx.shrinesLit + 1).join(' → ')}${ctx.shrinesLit < 6 ? ' → …' : ''}.`,
                '【Hermes】 A wrong sphere — or a burning orb — breaks the chain back to Saturn.',
            );
        }
    }

    if (!axiomRead(level, 'axiom_1')) {
        return step('axiom_1', 'Read the first axiom', 'Stand by the glowing ◆ beside the spawn and tap Read.',
            { gx: 19, gy: 31 },
            '【Hermes】 The first axiom stands beside you. Tap Read when close.',
            '【Hermes】 Dark emerald is wall; the luminous floor is road. Begin with the stone at your feet.',
            '【Hermes】 Three axioms wait among the columns of smoke. Read the nearest first.');
    }

    if (!fightDone(level, 'fight_ante')) {
        const f = level.fights.find((x) => x.id === 'fight_ante')!;
        return step('fight_ante', 'Clear the smoke trial', ctx.hasWeapon ? 'Enter the gold dashed circle before the gate of smoke.' : "Arm yourself at Truth's Hut first.",
            { gx: f.gx, gy: f.gy },
            `【Hermes】 ${ctx.hasWeapon ? 'Thought-forms bar the gate north of you — a gold dashed circle.' : "Forge a weapon at Truth's Hut before the smoke will part."}`,
            `【Hermes】 ${f.hint}`,
            '【Hermes】 The gate of smoke sits at the top of the aisle — the trial waits before it.');
    }

    if (!axiomRead(level, 'axiom_2') || !axiomRead(level, 'axiom_3')) {
        const target = !axiomRead(level, 'axiom_2') ? level.axioms[1] : level.axioms[2];
        const done = level.axioms.filter((a) => a.read).length;
        return step(`read_${target.id}`, `Read the axioms (${done}/3)`, 'The ◆ stones among the columns hold the three axioms.',
            { gx: target.gx, gy: target.gy },
            '【Hermes】 The axioms are the grammar of these halls. Read them all before the doors.',
            `【Hermes】 A ◆ stone waits ${target.id === 'axiom_2' ? 'west' : 'east'} among the columns.`,
            '【Hermes】 Knowledge first, thresholds after. The stones are marked on your map.');
    }

    if (!level.trueDoorFound) {
        const glyph = EMERALD_GLYPHS.find((g) => g.doorId === EMERALD_TRUE_DOOR_ID)!;
        return step('read_mirror', 'Find the true arch', 'Three arches, three blank tablets. Walk the dark glass south of them and read the reflection.',
            { gx: glyph.gx, gy: mirrorRow(glyph.gy) },
            '【Hermes】 The wall lies; the floor confesses. Stand on the mirror-glass and look at what the tablets become below.',
            '【Hermes】 Only one arch bears a burning glyph — and only in the reflection. The false arches bite.',
            '【Hermes】 Follow the marker onto the glass. The glowing glyph below marks the true arch above.');
    }

    return step('explore', 'Explore the halls', 'Read ◆ stones, gather cosmic shards, and trust the reflection over the wall.',
        { gx: 22, gy: 20 },
        '【Hermes】 Luminous floor is road; dark emerald is wall. The glass south of the arches repeats what is true.',
        '【Hermes】 Red orbs restore vitality. Pink shards are cosmic — Hana can forge with them.',
        '【Hermes】 If a way seems sealed, the mirror has already told you why.');
}

// —— minimap ————————————————————————————————————————————————————
export const EMERALD_MINIMAP_TERRAIN_COLORS: Record<number, string> = {
    0: '#065f46',
    1: '#03150f',
    2: '#0d9488',
    3: '#047857',
};

export function emeraldMinimapTerrain(): number[][] {
    return EMERALD_TILES;
}

export function emeraldMinimapGates(level: EmeraldLevelState): DestinationMapGate[] {
    return level.doors.map((d) => ({
        id: d.id,
        tiles: [[d.gx, d.gy]],
        open: d.open,
    }));
}

export function emeraldMinimapPois(
    level: EmeraldLevelState,
    opts: { relicClaimed: boolean; shrinesLit: number[] },
): DestinationMapPoi[] {
    const pois: DestinationMapPoi[] = [
        { id: 'spawn', gx: EMERALD_SPAWN.gx, gy: EMERALD_SPAWN.gy, kind: 'spawn' },
        { id: 'relic', gx: EMERALD_RELIC.gx, gy: EMERALD_RELIC.gy, kind: 'relic', muted: opts.relicClaimed },
    ];
    for (const s of level.axioms) pois.push({ id: s.id, gx: s.gx, gy: s.gy, kind: 'lore', muted: s.read });
    for (const c of level.chests) pois.push({ id: c.id, gx: c.gx, gy: c.gy, kind: 'chest', muted: c.opened });
    for (const p of level.pickups) pois.push({ id: p.id, gx: p.gx, gy: p.gy, kind: 'health', muted: p.collected });
    for (const n of level.nodes) pois.push({ id: n.id, gx: n.gx, gy: n.gy, kind: 'iron', muted: n.collected });
    for (const v of level.vents) pois.push({ id: v.id, gx: v.gx, gy: v.gy, kind: 'trap', muted: v.tripped });
    for (const f of level.fights) {
        if (f.combatId === 'emerald_boss') pois.push({ id: f.id, gx: f.gx, gy: f.gy, kind: 'boss', muted: f.cleared });
        else pois.push({ id: f.id, gx: f.gx, gy: f.gy, kind: 'fight', muted: f.cleared });
    }
    for (const s of EMERALD_SHRINES) {
        pois.push({ id: `shrine_${s.id}`, gx: s.gx, gy: s.gy, kind: 'crystal', muted: !opts.shrinesLit.includes(s.id), color: s.color });
    }
    if (!level.mirrorSecretFound) {
        pois.push({ id: 'mirror_cache', gx: EMERALD_MIRROR_CACHE.gx, gy: EMERALD_MIRROR_CACHE.gy, kind: 'chest', secret: true });
    }
    return pois;
}
