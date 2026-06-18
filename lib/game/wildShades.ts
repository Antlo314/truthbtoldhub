import type { BossArt, Destination, WildEncounterMods } from '@/lib/game/destinations';
import type { WorldEventId } from '@/lib/game/worldEvents';

// ============================================================
//  WILD SHADE VARIETY — roaming packs and overworld skins.
//  Each archetype changes accent, boss art, roster, and lines.
// ============================================================

export type WildFoeKind = 'grunt' | 'caster' | 'brute' | 'flanker';

export interface WildOverworldSkin {
    col: number;
    row: number;
    aura: string;
    label: string;
}

export interface WildShadeArchetype {
    id: string;
    name: string;
    bossName: string;
    bossArt: BossArt;
    accent: string;
    bg: [string, string];
    challenge: string;
    victory: string;
    encounterToast: string;
    minClears: number;
    /** Favored on Shade Surge days. */
    aggressive?: boolean;
    /** Pack fight only — no greater shade phase. */
    skirmish?: boolean;
    enemyBonus?: number;
    hpMult?: number;
    dmgMult?: number;
    roster: WildFoeKind[];
    skin: WildOverworldSkin;
}

export const WILD_OVERWORLD_SKINS: WildOverworldSkin[] = [
    { col: 0, row: 3, aura: '#22d3ee', label: 'Cyan drift' },
    { col: 0, row: 4, aura: '#a78bfa', label: 'Violet echo' },
    { col: 0, row: 5, aura: '#34d399', label: 'Jade whisper' },
    { col: 1, row: 3, aura: '#fbbf24', label: 'Amber memory' },
    { col: 1, row: 4, aura: '#f87171', label: 'Crimson remnant' },
];

export const WILD_SHADE_ARCHETYPES: WildShadeArchetype[] = [
    {
        id: 'dust_walkers',
        name: 'Dust Walkers',
        bossName: 'A Dust-Worn Shade',
        bossArt: 'wraith',
        accent: '#22d3ee',
        bg: ['#0a1410', '#04080a'],
        challenge: 'Dust walkers rise from the road you forgot. Cut through before they circle.',
        victory: 'The dust settles — and something glints where they stood.',
        encounterToast: '✦ Dust Walkers · shades from the forgotten road',
        minClears: 0,
        roster: ['grunt', 'grunt', 'flanker'],
        skin: WILD_OVERWORLD_SKINS[0],
    },
    {
        id: 'echo_whispers',
        name: 'Echo Whispers',
        bossName: 'The Echoing Shade',
        bossArt: 'wraith',
        accent: '#c084fc',
        bg: ['#120a1a', '#06040c'],
        challenge: 'Whispers take shape — casters hang back while flankers cut your escape.',
        victory: 'The echoes break. Silence returns to the grass.',
        encounterToast: '✦ Echo Whispers · casters and flankers in the mist',
        minClears: 0,
        roster: ['grunt', 'caster', 'flanker'],
        skin: WILD_OVERWORLD_SKINS[1],
    },
    {
        id: 'hollow_chorus',
        name: 'Hollow Chorus',
        bossName: '',
        bossArt: 'wraith',
        accent: '#a855f7',
        bg: ['#0e0818', '#05030a'],
        challenge: 'A whole chorus hunts you — no alpha, only the pack. Break the circle.',
        victory: 'The chorus scatters. The cavern exhales.',
        encounterToast: '✦ Hollow Chorus · a pack with no master',
        minClears: 1,
        skirmish: true,
        aggressive: true,
        enemyBonus: 1,
        roster: ['caster', 'flanker', 'caster', 'grunt'],
        skin: WILD_OVERWORLD_SKINS[1],
    },
    {
        id: 'stone_memory',
        name: 'Stone Memory',
        bossName: 'A Stone-Bound Shade',
        bossArt: 'golem',
        accent: '#22d3ee',
        bg: ['#081418', '#030a0c'],
        challenge: 'Memory turned to stone — brutes lead, grunts follow. Dodge the charge.',
        victory: 'The stone cracks. What it guarded falls to dust.',
        encounterToast: '✦ Stone Memory · brutes from the buried measure',
        minClears: 1,
        hpMult: 1.12,
        roster: ['grunt', 'brute', 'grunt'],
        skin: WILD_OVERWORLD_SKINS[2],
    },
    {
        id: 'serpent_coil',
        name: 'Serpent Coil',
        bossName: 'The Coiling Shade',
        bossArt: 'serpent',
        accent: '#a855f7',
        bg: ['#140a18', '#08040e'],
        challenge: 'They strike in coils — casters loose bolts while flankers tighten the ring.',
        victory: 'The coil unwinds. The road is yours again.',
        encounterToast: '✦ Serpent Coil · bolts and circling teeth',
        minClears: 2,
        dmgMult: 1.08,
        aggressive: true,
        roster: ['caster', 'flanker', 'caster'],
        skin: WILD_OVERWORLD_SKINS[4],
    },
    {
        id: 'sentinel_watch',
        name: 'Sentinel Watch',
        bossName: 'The Watching Shade',
        bossArt: 'sentinel',
        accent: '#fbbf24',
        bg: ['#141008', '#080604'],
        challenge: 'A sentinel shade marshals the pack — brute first, then the flank.',
        victory: 'The watch ends. The sentinel dissolves into pale gold.',
        encounterToast: '✦ Sentinel Watch · a marshal leads the pack',
        minClears: 2,
        roster: ['brute', 'flanker', 'caster', 'grunt'],
        skin: WILD_OVERWORLD_SKINS[3],
    },
    {
        id: 'iron_remnant',
        name: 'Iron Remnant',
        bossName: 'The Iron Remnant',
        bossArt: 'titan',
        accent: '#f97316',
        bg: ['#180c08', '#0a0604'],
        challenge: 'An iron remnant rises — the heaviest shade you have met in the open.',
        victory: 'Even iron memory yields. The remnant falls.',
        encounterToast: '✦ Iron Remnant · the heaviest open-road shade',
        minClears: 3,
        aggressive: true,
        hpMult: 1.18,
        dmgMult: 1.1,
        roster: ['brute', 'caster', 'flanker'],
        skin: WILD_OVERWORLD_SKINS[4],
    },
];

export function wildArchetypeById(id: string): WildShadeArchetype | undefined {
    return WILD_SHADE_ARCHETYPES.find((a) => a.id === id);
}

export function overworldSkinForShade(index: number): WildOverworldSkin {
    return WILD_OVERWORLD_SKINS[index % WILD_OVERWORLD_SKINS.length];
}

export function rollWildArchetype(
    clearedCount: number,
    worldEventId?: WorldEventId,
): WildShadeArchetype {
    const tier = Math.min(clearedCount, 4);
    let pool = WILD_SHADE_ARCHETYPES.filter((a) => a.minClears <= tier);
    if (worldEventId === 'shade_surge') {
        const aggressive = pool.filter((a) => a.aggressive);
        if (aggressive.length) pool = aggressive;
    } else if (worldEventId === 'still_garden') {
        const calm = pool.filter((a) => !a.skirmish && !a.aggressive);
        if (calm.length) pool = calm;
    }
    return pool[Math.floor(Math.random() * pool.length)] ?? WILD_SHADE_ARCHETYPES[0];
}

export function buildWildEncounter(
    clearedCount: number,
    mods: WildEncounterMods = {},
    archetype?: WildShadeArchetype,
): Destination {
    const arch = archetype ?? rollWildArchetype(clearedCount, mods.worldEventId);
    const t = Math.min(clearedCount, 4);
    const hpM = (mods.hpMult ?? 1) * (arch.hpMult ?? 1);
    const dmgM = (mods.dmgMult ?? 1) * (arch.dmgMult ?? 1);
    const extra = (mods.enemyBonus ?? 0) + (arch.enemyBonus ?? 0);
    const baseCount = arch.roster.length + (t >= 2 ? 1 : 0);
    const enemyCount = Math.min(6, baseCount + extra);
    const roster = [...arch.roster];
    while (roster.length < enemyCount) {
        roster.push(roster.length % 2 === 0 ? 'flanker' : 'grunt');
    }
    const enemyHp = Math.round((16 + t * 4) * hpM);
    const enemyDmg = Math.round((8 + t) * dmgM);
    const bossHp = Math.round((55 + t * 16) * hpM);
    const bossDmg = Math.round((11 + t * 2) * dmgM);
    const surge = extra > 0;

    return {
        poiId: 'enc_wild',
        kind: 'cave',
        name: arch.name,
        era: 'Wild cavern',
        accent: arch.accent,
        bg: arch.bg,
        guide: { name: 'Truth', role: '', tile: { col: 1, row: 10 }, intro: '' },
        lore: [],
        relics: [],
        combat: {
            challenge: surge ? `${arch.challenge} The surge thickens them.` : arch.challenge,
            enemyCount,
            enemyHp,
            enemyDmg,
            bossName: arch.bossName || arch.name,
            bossArt: arch.bossArt,
            bossHp,
            bossDmg,
            victory: arch.victory,
            // bosses are locked behind destinations — roaming packs are always a
            // boss-free skirmish (clear the pack, no "greater shade" phase).
            skirmish: true,
            enemyKinds: roster.slice(0, enemyCount),
        },
    };
}

export const WILD_SHADE_DISCOVER_PREFIX = 'wild_shade_';

export function wildShadeDiscoverId(archetypeId: string): string {
    return `${WILD_SHADE_DISCOVER_PREFIX}${archetypeId}`;
}

/** Roll and build a wild overworld encounter. */
export function wildEncounter(
    clearedCount: number,
    mods: WildEncounterMods = {},
    archetype?: WildShadeArchetype,
): Destination {
    return buildWildEncounter(clearedCount, mods, archetype);
}