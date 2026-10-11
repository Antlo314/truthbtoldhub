/**
 * What a soul wears, resolved for the rigged vessel.
 *
 * The creator (SoulPanel) still speaks in the pixel avatar's vocabulary —
 * fourteen hair styles, eight outfits, a face, an extra. The rigged body
 * (public/models/vessels, built by scripts/build-vessels.mjs from
 * Quaternius' CC0 kits) carries five hair meshes, two outfits and a hood.
 * This module is the one place that vocabulary is translated, in both
 * directions: from a saved AvatarConfig, and from the compact fields the
 * presence channel carries for every other player in the room.
 */
import type { AvatarConfig, HairStyle, OutfitStyle } from '@/lib/game/avatar';
import { BOOT_COLORS, CLOTH_COLORS, HAIR_COLORS, SKIN_TONES } from '@/lib/game/avatar';

export type VesselHair = 'buzzed' | 'parted' | 'buns' | 'long' | 'none';
export type VesselOutfit = 'peasant' | 'ranger';

export type VesselWear = {
    build: 'masc' | 'fem';
    /** hex colours, already resolved from the palettes */
    skin: string;
    hair: string;
    top: string;
    bottom: string;
    boots: string;
    aura: string;
    hairStyle: VesselHair;
    outfit: VesselOutfit;
    hood: boolean;
    beard: boolean;
};

/** Compact wire form — what rides the presence channel per player. */
export type VesselWire = {
    build: 'masc' | 'fem';
    skin: number;
    hair: number;
    top: number;
    bottom: number;
    boots: number;
    /** hair style key */
    hs: VesselHair;
    /** outfit key */
    of: VesselOutfit;
    hd: 0 | 1;
    bd: 0 | 1;
};

const pick = (arr: readonly string[], i: number | undefined, fallback: number) =>
    arr[((((i ?? fallback) | 0) % arr.length) + arr.length) % arr.length];

export function hairFor(style: HairStyle | undefined): VesselHair {
    switch (style) {
        case 'buzz':
            return 'buzzed';
        case 'long':
        case 'braids':
        case 'locs':
        case 'twists':
            return 'long';
        case 'afro':
        case 'curls':
        case 'bun':
        case 'crown':
        case 'ponytail':
            return 'buns';
        case 'short':
        case 'waves':
        case 'coils':
        case 'highTop':
        default:
            return 'parted';
    }
}

export function outfitFor(style: OutfitStyle | undefined, build: 'masc' | 'fem'): VesselOutfit {
    if (build === 'fem') {
        return style === 'robe' || style === 'wanderer' || style === 'vestment' ? 'ranger' : 'peasant';
    }
    return style === 'robe' || style === 'cloak' || style === 'vestment' ? 'ranger' : 'peasant';
}

export function wireFromAvatar(cfg: AvatarConfig): VesselWire {
    const build = cfg.build === 'fem' ? 'fem' : 'masc';
    const face = cfg.face ?? 'calm';
    return {
        build,
        skin: cfg.skin ?? 6,
        hair: cfg.hairColor ?? 0,
        top: cfg.top ?? 0,
        bottom: cfg.bottom ?? 6,
        boots: cfg.boots ?? 0,
        hs: hairFor(cfg.hairStyle),
        of: outfitFor(cfg.outfit, build),
        hd: cfg.outfit === 'cloak' || cfg.extra === 'hood' ? 1 : 0,
        bd: build === 'masc' && (face === 'beard' || face === 'goatee' || face === 'mustache') ? 1 : 0,
    };
}

export function wearFromWire(w: Partial<VesselWire> & { build?: string }, aura: string): VesselWear {
    const build = w.build === 'fem' ? 'fem' : 'masc';
    return {
        build,
        skin: pick(SKIN_TONES, w.skin, 6),
        hair: pick(HAIR_COLORS, w.hair, 0),
        top: pick(CLOTH_COLORS, w.top, 0),
        bottom: pick(CLOTH_COLORS, w.bottom, 6),
        boots: pick(BOOT_COLORS, w.boots, 0),
        aura: aura || '#a78bfa',
        hairStyle: isHair(w.hs) ? w.hs : 'parted',
        outfit: w.of === 'ranger' ? 'ranger' : 'peasant',
        hood: w.hd === 1,
        beard: build === 'masc' && w.bd === 1,
    };
}

export function wearFromAvatar(cfg: AvatarConfig, aura: string): VesselWear {
    return wearFromWire(wireFromAvatar(cfg), aura);
}

function isHair(v: unknown): v is VesselHair {
    return v === 'buzzed' || v === 'parted' || v === 'buns' || v === 'long' || v === 'none';
}

/** Stable identity for memoising a body — changes only when the look does. */
export function wearKey(w: VesselWear): string {
    return [w.build, w.skin, w.hair, w.top, w.bottom, w.boots, w.hairStyle, w.outfit, w.hood ? 1 : 0, w.beard ? 1 : 0].join('|');
}
