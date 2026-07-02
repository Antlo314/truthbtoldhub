// ============================================================
//  AVATAR — a procedural, layered full-body pixel character.
//  Inspired by the Emberwilds creator: independent skin tone,
//  hair (style + colour), face, outfit (top/bottom/boots) and
//  an optional extra (circlet/hood/…), with masculine/feminine
//  builds. The builder is PURE — it returns a grid of hex
//  colours (or null) so it can be drawn on the browser canvas
//  AND rendered headless for verification.
//  Grid is 16 wide x 24 tall, front-facing.
// ============================================================

export const AV_W = 16;
export const AV_H = 24;

export type Build = 'masc' | 'fem';
export type HairStyle =
    | 'buzz' | 'short' | 'afro' | 'long' | 'bun' | 'braids' | 'locs'
    | 'twists' | 'highTop' | 'waves' | 'coils'
    | 'ponytail' | 'crown' | 'curls';
export type OutfitStyle = 'tunic' | 'robe' | 'vest' | 'dress' | 'gown' | 'cloak' | 'wanderer' | 'vestment';
export type FaceStyle = 'calm' | 'keen' | 'goatee' | 'beard' | 'mustache';
export type Extra = 'none' | 'circlet' | 'hood' | 'earrings' | 'glasses' | 'warpaint' | 'belt' | 'flower' | 'scar';

export interface AvatarConfig {
    build: Build;
    skin: number;       // index into SKIN_TONES
    hairStyle: HairStyle;
    hairColor: number;  // index into HAIR_COLORS
    face: FaceStyle;
    top: number;        // index into CLOTH_COLORS
    bottom: number;     // index into CLOTH_COLORS
    boots: number;      // index into BOOT_COLORS
    outfit: OutfitStyle;
    extra?: Extra;      // optional adornment layer — old saves omit it
    eyes?: number;      // index into EYE_COLORS — old saves omit it (dark)
    beardColor?: number; // index into HAIR_COLORS — defaults to hairColor
    /** Worn wardrobe garment id (clothing.ts) — rendered as a gear overlay.
     *  Set at RENDER time from equipped.clothing (see wornAvatar), never saved. */
    garment?: string;
}

// ---- palettes ------------------------------------------------
export const SKIN_TONES = [
    '#ffe0bd', '#f5cfa0', '#eab98a', '#d9a066', '#c68642', '#a96d3c',
    '#8d5524', '#7a4a22', '#67421d', '#523015', '#3d2410', '#2b1a0c',
    '#a8c686', '#c7b8e6', // a couple of otherworldly tones
];
export const HAIR_COLORS = [
    '#1b1b1f', '#2d2118', '#4a3119', '#6b4423', '#8a5a2b', '#b07a3a',
    '#d9b35c', '#e8e0d0', '#9aa0a6', '#5b6e8c',
];
export const CLOTH_COLORS = [
    '#3b6ea5', '#2f8f5b', '#a23b3b', '#7a4fb0', '#b9882e', '#2b8a8a',
    '#465063', '#b05a8a', '#d4a017', '#5a6b2f', '#7a3b2e', '#cfcfcf',
    // appended (indexes stable for old saves)
    '#1f2937', '#14532d', '#831843', '#78350f',
];
export const BOOT_COLORS = ['#4a3324', '#2b2b30', '#5a4632', '#3a2a44', '#6b7280', '#7f1d1d'];
/** Iris colours — index 0 matches the original dark eye. */
export const EYE_COLORS = ['#2a2030', '#5b3a1e', '#2e5b8a', '#2f6b4f', '#6b3a6e', '#8a8f98'];
export const EYE_NAMES = ['Deep', 'Amber', 'Sea', 'Verdant', 'Violet', 'Storm'];

// Hand-tuned shadow tones for the first tones; any tone without an
// entry (or new tones appended later) falls back to a derived darken.
const skinShade = ['#d9a066', '#c68642', '#a96d3c', '#8d5524', '#7a4a22', '#67421d',
    '#523015', '#3d2410', '#2b1a0c', '#1f1209', '#160c06', '#0e0704', '#7d9a5e', '#9a8cc4'];

const TRIM = '#d4a017';     // ceremonial gold
const TRIM_SH = '#b9882e';
const LEATHER = '#4a3324';  // traveller's leather

function emptyGrid(): (string | null)[][] {
    return Array.from({ length: AV_H }, () => Array<string | null>(AV_W).fill(null));
}
function rect(g: (string | null)[][], x: number, y: number, w: number, h: number, c: string) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (yy >= 0 && yy < AV_H && xx >= 0 && xx < AV_W) g[yy][xx] = c;
    }
}
function px(g: (string | null)[][], x: number, y: number, c: string) {
    if (y >= 0 && y < AV_H && x >= 0 && x < AV_W) g[y][x] = c;
}

export type Facing = 'down' | 'up' | 'left' | 'right';

// Build the full character. Layers are drawn back-to-front.
// `step` drives a 2-frame walk cycle (0 idle, 1/2 lift each foot); `dir`
// gives 4-directional facing — down shows the face, up the back of the
// head, left a profile (right is left mirrored).
export function buildAvatarPixels(cfg: AvatarConfig, step = 0, dir: Facing = 'down'): (string | null)[][] {
    if (dir === 'right') return buildAvatarPixels(cfg, step, 'left').map((row) => [...row].reverse());
    const g = emptyGrid();
    const skin = SKIN_TONES[cfg.skin] ?? SKIN_TONES[4];
    const shade = skinShade[cfg.skin] ?? shadeHex(skin, -40);
    const hair = HAIR_COLORS[cfg.hairColor] ?? HAIR_COLORS[0];
    const beard = HAIR_COLORS[cfg.beardColor ?? cfg.hairColor] ?? hair;
    const eye = EYE_COLORS[cfg.eyes ?? 0] ?? EYE_COLORS[0];
    const top = CLOTH_COLORS[cfg.top] ?? CLOTH_COLORS[0];
    const topShade = shadeHex(top);
    const bottom = CLOTH_COLORS[cfg.bottom] ?? CLOTH_COLORS[6];
    const boot = BOOT_COLORS[cfg.boots] ?? BOOT_COLORS[0];
    const fem = cfg.build === 'fem';
    const extra = cfg.extra ?? 'none';

    // ---- legs / lower body ----
    // Feminine builds read distinctly female: a flared skirt, or — under
    // trousers — wide hips tapering to slim legs. A dress skirts either build.
    // Masculine builds keep straight, even trousers.
    const lLift = step === 1 ? 1 : 0;
    const rLift = step === 2 ? 1 : 0;
    const skirted = cfg.outfit === 'dress' || cfg.outfit === 'gown' || cfg.outfit === 'vestment' || (fem && cfg.outfit === 'robe');
    if (skirted) {
        // a skirt that flares from a narrow waist down to a wide hem
        rect(g, 6, 16, 4, 1, top);
        rect(g, 5, 17, 6, 2, top);
        rect(g, 4, 19, 8, 2, top);
        rect(g, 4, 20, 8, 1, topShade);                            // hem shadow
        rect(g, 5, 21, 2, 1, skin); rect(g, 9, 21, 2, 1, skin);    // calves peek
        rect(g, 5, 22, 2, 2, boot); rect(g, 9, 22, 2, 2, boot);    // shoes
        if (cfg.outfit === 'gown') {
            // a fuller, sweeping hem + a waist sash — distinctly a gown
            rect(g, 3, 19, 10, 2, top);
            rect(g, 3, 20, 10, 1, topShade);
            rect(g, 5, 16, 6, 1, topShade);
        }
        if (cfg.outfit === 'vestment') {
            // floor-length ceremonial fall with a gold-trimmed hem
            rect(g, 4, 20, 8, 1, TRIM_SH);
            px(g, 4, 19, TRIM); px(g, 11, 19, TRIM);
        }
    } else if (fem) {
        // wide hips taper to slim legs held close together
        rect(g, 4, 16, 8, 1, bottom);                              // hip line, wide
        rect(g, 5, 17, 6, 2, bottom);                              // hips / upper thighs
        rect(g, 5, 19, 2, 3 - lLift, bottom); rect(g, 9, 19, 2, 3 - rLift, bottom);
        rect(g, 5, 22 - lLift, 2, 2, boot); rect(g, 9, 22 - rLift, 2, 2, boot);
        px(g, 7, 18, shadeHex(bottom)); px(g, 8, 18, shadeHex(bottom)); // inner-leg shadow
    } else {
        // masculine trousers — two even legs with a centre gap; a lifted foot
        // shortens its lower leg and raises its boot for the walk cycle.
        rect(g, 5, 16, 6, 4, bottom);
        rect(g, 5, 20, 2, 2 - lLift, bottom); rect(g, 9, 20, 2, 2 - rLift, bottom);
        rect(g, 5, 22 - lLift, 2, 2, boot); rect(g, 9, 22 - rLift, 2, 2, boot);
        px(g, 7, 21, shade); px(g, 8, 21, shade);                  // crotch gap shadow
    }

    // ---- torso (outfit top) ----
    if (fem) {
        // an hourglass: shoulder line → bust → pinched waist → hips
        rect(g, 5, 10, 6, 1, top);                                 // shoulders
        rect(g, 6, 11, 4, 2, top);                                 // bust
        px(g, 6, 12, topShade); px(g, 9, 12, topShade);            // under-bust curve
        rect(g, 6, 13, 4, 1, top);                                 // waist band…
        px(g, 6, 13, topShade); px(g, 9, 13, topShade);            // …pinched to ~2px
        rect(g, 5, 14, 6, 2, top);                                 // hips widen back out
        px(g, 7, 10, topShade); px(g, 8, 10, topShade);            // neckline
    } else {
        rect(g, 5, 10, 6, 6, top);                                 // broad, straight torso
        rect(g, 7, 10, 2, 1, topShade);                            // collar
    }
    if (cfg.outfit === 'robe') { rect(g, 5, 14, 6, 2, topShade); } // robe hem
    if (cfg.outfit === 'vest') { px(g, 7, 11, topShade); px(g, 8, 11, topShade); px(g, 7, 13, topShade); px(g, 8, 13, topShade); }
    if (cfg.outfit === 'cloak') {
        // a mantle across the shoulders + capes draping outside the arms
        rect(g, 3, 10, 10, 1, top);
        rect(g, 3, 11, 1, 8, top); rect(g, 12, 11, 1, 8, top);
        px(g, 3, 18, topShade); px(g, 12, 18, topShade);
        rect(g, 6, 10, 4, 1, topShade);                            // collar clasp
    }
    if (cfg.outfit === 'wanderer') {
        // layered travel garb: shoulder mantle, cross-strap, belt + hip pouch
        rect(g, 5, 10, 6, 1, topShade);                            // travel mantle
        px(g, 6, 11, LEATHER); px(g, 7, 12, LEATHER); px(g, 8, 13, LEATHER); // satchel strap
        rect(g, 5, 14, 6, 1, LEATHER);                             // belt
        px(g, 8, 14, TRIM);                                        // buckle
        rect(g, 9, 15, 2, 1, '#5a4632');                           // hip pouch
    }
    if (cfg.outfit === 'vestment') {
        // ceremonial: gold collar + a stole falling in two bands
        rect(g, 6, 10, 4, 1, TRIM);
        rect(g, 6, 11, 1, 4, topShade); rect(g, 9, 11, 1, 4, topShade);
        px(g, 6, 15, TRIM); px(g, 9, 15, TRIM);                    // stole ends
    }

    // ---- arms ----
    rect(g, 4, 10, 1, 5, top); rect(g, 11, 10, 1, 5, top);
    px(g, 4, 15, skin); px(g, 11, 15, skin); // hands

    // ---- worn gear (equipped wardrobe garment) — over the outfit, under the head ----
    if (cfg.garment && cfg.garment !== 'plain') drawGarment(g, cfg.garment);

    // ---- neck ----
    rect(g, 7, 9, 2, 1, shade);

    // ---- head + face/hair, by facing ----
    if (dir === 'up') {
        rect(g, 5, 3, 6, 6, skin);                 // nape
        drawHairBack(g, cfg.hairStyle, hair);
    } else if (dir === 'left') {
        rect(g, 5, 3, 6, 6, skin);
        px(g, 4, 6, skin); px(g, 4, 7, shade);     // nose / jaw at the front edge
        drawProfileFace(g, cfg.face, shade, beard, eye);
        drawHairSide(g, cfg.hairStyle, hair, fem);
    } else {
        rect(g, 5, 3, 6, 6, skin);
        px(g, 4, 6, skin); px(g, 11, 6, skin);     // ears
        px(g, 5, 8, shade); px(g, 10, 8, shade);   // jaw shading
        drawFace(g, cfg.face, shade, beard, eye);
        drawHair(g, cfg.hairStyle, hair, fem);
    }

    // ---- extras (adornments) — always drawn AFTER the hair ----
    drawExtra(g, extra, dir, top);

    return g;
}

// Back of the head (facing up): every style gets its own silhouette —
// long is a smooth sheet, braids segmented columns, locs thick ropes.
function drawHairBack(g: (string | null)[][], style: HairStyle, hair: string) {
    const hi = lightenHex(hair);
    const lo = shadeHex(hair);
    if (style === 'highTop') {
        // tall flat box, shaved fade beneath — nape skin stays visible
        rect(g, 5, 0, 6, 5, hair);
        rect(g, 5, 0, 6, 1, hi);
        rect(g, 5, 5, 6, 1, lo);
        return;
    }
    rect(g, 5, 2, 6, 5, hair);
    rect(g, 4, 3, 1, 3, hair); rect(g, 11, 3, 1, 3, hair);
    switch (style) {
        case 'afro':
            rect(g, 4, 0, 8, 4, hair); rect(g, 3, 1, 1, 3, hair); rect(g, 12, 1, 1, 3, hair);
            rect(g, 5, 0, 6, 1, hi);
            break;
        case 'bun':
            rect(g, 6, 0, 4, 2, hair); rect(g, 6, 0, 4, 1, hi);
            px(g, 7, 1, lo); px(g, 8, 1, lo);                      // knot crease
            break;
        case 'long':
            rect(g, 4, 7, 8, 6, hair);                             // one smooth sheet
            rect(g, 7, 7, 1, 4, hi);                               // sheen streak
            rect(g, 4, 12, 8, 1, lo);                              // hem shadow
            break;
        case 'braids':
            for (const x of [4, 6, 9, 11]) {                       // segmented columns
                rect(g, x, 7, 1, 5, hair);
                px(g, x, 8, hi); px(g, x, 10, hi);                 // segment ties
                px(g, x, 12, lo);                                  // tip
            }
            break;
        case 'locs':
            rect(g, 4, 7, 2, 4, hair); rect(g, 7, 7, 2, 5, hair); rect(g, 10, 7, 2, 4, hair); // thick ropes
            px(g, 4, 11, lo); px(g, 5, 11, hi);                    // tip pixels
            px(g, 7, 12, lo); px(g, 8, 12, hi);
            px(g, 10, 11, lo); px(g, 11, 11, hi);
            break;
        case 'twists':
            for (const x of [4, 7, 10]) {                          // spiral-textured strands
                for (let y = 7; y <= 11; y++) px(g, x, y, y % 2 ? hair : hi);
                px(g, x, 12, lo);
            }
            break;
        case 'waves':
            px(g, 5, 3, hi); px(g, 7, 3, hi); px(g, 9, 3, hi);     // ripple rows
            px(g, 6, 5, hi); px(g, 8, 5, hi); px(g, 10, 5, hi);
            break;
        case 'coils':
            px(g, 5, 1, hair); px(g, 7, 1, hair); px(g, 9, 1, hair); // bumpy crown
            px(g, 6, 3, hi); px(g, 9, 4, hi); px(g, 7, 5, hi);       // coil glints
            break;
        case 'ponytail':
            rect(g, 7, 7, 2, 6, hair);                             // the tail, centred down the back
            px(g, 7, 8, hi); px(g, 8, 8, hi);                      // tie
            px(g, 7, 12, lo); px(g, 8, 12, lo);                    // tip
            break;
        case 'crown':
            for (let x = 5; x <= 10; x++) px(g, x, 2, x % 2 ? hi : hair); // braided ring
            px(g, 4, 3, hair); px(g, 11, 3, hair);
            break;
        case 'curls':
            rect(g, 4, 7, 8, 3, hair);                             // a soft cloud down the nape
            px(g, 4, 10, hair); px(g, 6, 10, hair); px(g, 8, 10, hair); px(g, 10, 10, hair); // bumpy hem
            px(g, 5, 8, hi); px(g, 8, 7, hi); px(g, 10, 9, hi);    // curl glints
            break;
    }
    rect(g, 5, 2, 6, 1, hi);
}

// Profile face (facing left): a single eye toward the front, mouth + facial hair at the chin.
function drawProfileFace(g: (string | null)[][], face: FaceStyle, shade: string, beard: string, eye: string) {
    px(g, 6, 6, eye);
    if (face === 'keen') px(g, 6, 5, shade);
    px(g, 5, 8, shade);
    if (face === 'goatee') { px(g, 5, 8, beard); px(g, 5, 9, beard); px(g, 6, 9, beard); }
    if (face === 'beard') { rect(g, 5, 7, 3, 2, beard); px(g, 5, 6, beard); px(g, 5, 9, beard); px(g, 6, 9, beard); }
    if (face === 'mustache') { px(g, 5, 7, beard); px(g, 6, 7, beard); }
}

// Side hair (facing left): hair on top + the back (right) of the head;
// each long style keeps its own silhouette in profile too.
function drawHairSide(g: (string | null)[][], style: HairStyle, hair: string, fem = false) {
    const hi = lightenHex(hair);
    const lo = shadeHex(hair);
    if (style === 'highTop') {
        rect(g, 6, 0, 6, 5, hair);                                 // tall flat box
        rect(g, 6, 0, 6, 1, hi);
        px(g, 10, 5, lo); px(g, 11, 5, lo);                        // fade at the nape
        return;
    }
    rect(g, 6, 2, 5, 4, hair);
    rect(g, 9, 3, 2, 4, hair); rect(g, 11, 3, 1, 3, hair);
    switch (style) {
        case 'afro':
            rect(g, 6, 0, 6, 4, hair); rect(g, 11, 1, 2, 3, hair);
            rect(g, 7, 0, 5, 1, hi);
            break;
        case 'bun':
            rect(g, 9, 0, 3, 2, hair); rect(g, 9, 0, 3, 1, hi);
            break;
        case 'long': {
            const len = fem ? 8 : 7;                               // smooth sheet down the back
            rect(g, 9, 6, 3, len, hair);
            px(g, 10, 7, hi); px(g, 10, 9, hi);                    // sheen
            rect(g, 9, 5 + len, 3, 1, lo);                         // hem shadow
            break;
        }
        case 'braids':
            rect(g, 9, 6, 1, 6, hair);                             // two segmented plaits
            px(g, 9, 7, hi); px(g, 9, 9, hi); px(g, 9, 11, hi);
            px(g, 9, 12, lo);
            rect(g, 11, 6, 1, 5, hair);
            px(g, 11, 8, hi); px(g, 11, 10, hi);
            px(g, 11, 11, lo);
            break;
        case 'locs':
            rect(g, 9, 6, 2, 6, hair);                             // one thick rope
            rect(g, 11, 6, 1, 5, hair);
            px(g, 9, 12, lo); px(g, 10, 12, hi); px(g, 11, 11, lo); // tip pixels
            break;
        case 'twists':
            for (let y = 5; y <= 10; y++) { px(g, 10, y, y % 2 ? hair : hi); px(g, 11, y, y % 2 ? hi : hair); }
            px(g, 10, 11, lo); px(g, 11, 11, lo);
            break;
        case 'waves':
            px(g, 6, 3, hi); px(g, 8, 3, hi); px(g, 10, 3, hi);    // ripple arcs
            px(g, 7, 4, hi); px(g, 9, 4, hi);
            break;
        case 'coils':
            px(g, 7, 1, hair); px(g, 9, 1, hair); px(g, 11, 2, hair); // bumps
            px(g, 8, 3, hi); px(g, 10, 4, hi);
            break;
        case 'ponytail':
            rect(g, 10, 5, 2, 7, hair);                            // tail swinging behind
            px(g, 10, 6, hi); px(g, 11, 6, hi);                    // tie
            px(g, 10, 11, lo); px(g, 11, 11, lo);                  // tip
            break;
        case 'crown':
            for (let x = 6; x <= 11; x++) px(g, x, 2, x % 2 ? hi : hair); // braid ring in profile
            break;
        case 'curls':
            rect(g, 9, 6, 3, 4, hair);                             // cloud at the nape
            px(g, 9, 10, hair); px(g, 11, 10, hair);               // bumpy hem
            px(g, 10, 7, hi); px(g, 9, 9, hi);                     // glints
            break;
    }
    rect(g, 6, 2, 5, 1, hi);
}

function drawFace(g: (string | null)[][], face: FaceStyle, shade: string, beard: string, eye: string) {
    // eyes
    px(g, 6, 6, eye); px(g, 9, 6, eye);
    // brows for 'keen'
    if (face === 'keen') { px(g, 6, 5, shade); px(g, 9, 5, shade); }
    // mouth hint
    px(g, 7, 8, shade);
    // facial hair — sized to read at 16px
    if (face === 'goatee') {
        rect(g, 7, 8, 2, 1, beard);                                // moustache-to-chin patch
        rect(g, 7, 9, 2, 1, beard);                                // pointed chin fall
    }
    if (face === 'beard') {
        rect(g, 5, 7, 6, 2, beard); rect(g, 5, 6, 1, 2, beard); rect(g, 10, 6, 1, 2, beard);
        rect(g, 6, 9, 4, 1, beard);                                // full chin fall
        px(g, 6, 6, eye); px(g, 9, 6, eye);
    }
    if (face === 'mustache') {
        rect(g, 6, 7, 4, 1, beard);                                // a clean bar over the lip
        px(g, 7, 8, shade);                                        // mouth stays visible
    }
}

function drawHair(g: (string | null)[][], style: HairStyle, hair: string, fem: boolean) {
    const hi = lightenHex(hair);
    const lo = shadeHex(hair);
    switch (style) {
        case 'buzz':
            rect(g, 5, 2, 6, 2, hair); px(g, 4, 3, hair); px(g, 11, 3, hair);
            break;
        case 'short':
            rect(g, 5, 1, 6, 3, hair); rect(g, 4, 3, 1, 2, hair); rect(g, 11, 3, 1, 2, hair);
            rect(g, 5, 1, 6, 1, hi);
            break;
        case 'afro':
            rect(g, 4, 0, 8, 4, hair); rect(g, 3, 1, 1, 3, hair); rect(g, 12, 1, 1, 3, hair);
            rect(g, 4, 4, 1, 2, hair); rect(g, 11, 4, 1, 2, hair);
            rect(g, 5, 0, 6, 1, hi);
            break;
        case 'long':
            rect(g, 5, 1, 6, 3, hair); rect(g, 4, 2, 1, 9, hair); rect(g, 11, 2, 1, 9, hair);
            rect(g, 5, 1, 6, 1, hi);
            break;
        case 'bun':
            rect(g, 5, 2, 6, 2, hair); rect(g, 6, 0, 4, 2, hair); rect(g, 4, 3, 1, 1, hair); rect(g, 11, 3, 1, 1, hair);
            rect(g, 6, 0, 4, 1, hi);
            break;
        case 'braids':
            rect(g, 5, 1, 6, 3, hair); rect(g, 4, 2, 1, 10, hair); rect(g, 11, 2, 1, 10, hair);
            px(g, 4, 12, hi); px(g, 11, 12, hi);
            break;
        case 'locs':
            // crown + side ropes; face-framing strands stop ABOVE the eyes
            rect(g, 4, 1, 8, 3, hair);
            rect(g, 5, 1, 6, 1, hi);                               // highlight pass
            rect(g, 4, 4, 1, 8, hair); rect(g, 11, 4, 1, 8, hair); // ropes down the sides
            px(g, 5, 4, hair); px(g, 10, 4, hair);                 // framing strands…
            px(g, 5, 5, lo); px(g, 10, 5, lo);                     // …ending row 5 — eyes stay clear
            px(g, 4, 11, hi); px(g, 11, 11, hi);                   // rope tips
            break;
        case 'twists':
            rect(g, 5, 1, 6, 3, hair); rect(g, 5, 1, 6, 1, hi);
            for (let y = 3; y <= 9; y++) { const c = y % 2 ? hair : hi; px(g, 4, y, c); px(g, 11, y, c); } // spiral strands
            px(g, 4, 10, lo); px(g, 11, 10, lo);                   // tips
            break;
        case 'highTop':
            rect(g, 5, 0, 6, 4, hair);                             // tall flat crown
            rect(g, 5, 0, 6, 1, hi);                               // flat-top sheen
            px(g, 5, 4, lo); px(g, 10, 4, lo);                     // temple fade
            break;
        case 'waves':
            rect(g, 5, 1, 6, 3, hair); px(g, 4, 3, hair); px(g, 11, 3, hair);
            px(g, 6, 1, hi); px(g, 8, 1, hi); px(g, 10, 1, hi);    // ripple pattern
            px(g, 5, 2, hi); px(g, 7, 2, hi); px(g, 9, 2, hi);
            px(g, 6, 3, hi); px(g, 8, 3, hi);
            break;
        case 'coils':
            rect(g, 5, 1, 6, 3, hair);
            px(g, 6, 0, hair); px(g, 8, 0, hair); px(g, 10, 0, hair); // bumpy silhouette
            px(g, 4, 2, hair); px(g, 11, 2, hair);
            px(g, 6, 2, hi); px(g, 8, 1, hi); px(g, 10, 2, hi);    // coil glints
            px(g, 7, 3, lo);
            break;
        case 'ponytail':
            rect(g, 5, 1, 6, 3, hair); px(g, 4, 3, hair); px(g, 11, 3, hair); // swept-back crown
            rect(g, 5, 1, 6, 1, hi);
            px(g, 7, 0, hair); px(g, 8, 0, hair);                  // gathered peak at the tie
            break;
        case 'crown':
            rect(g, 5, 1, 6, 3, hair);
            for (let x = 5; x <= 10; x++) px(g, x, 1, x % 2 ? hi : lo); // braided ring across the brow
            px(g, 4, 3, hair); px(g, 11, 3, hair);
            break;
        case 'curls':
            rect(g, 5, 1, 6, 3, hair);
            px(g, 5, 0, hair); px(g, 7, 0, hair); px(g, 9, 0, hair); px(g, 10, 0, hair); // cloud top
            rect(g, 4, 2, 1, 6, hair); rect(g, 11, 2, 1, 6, hair); // curls falling past the ears
            px(g, 4, 8, lo); px(g, 11, 8, lo);                     // bouncy tips
            px(g, 6, 1, hi); px(g, 9, 2, hi); px(g, 4, 4, hi); px(g, 11, 5, hi); // glints
            break;
    }
    // subtle build-aware shaping — feminine builds soften / lengthen where it helps
    if (fem) {
        if (style === 'long') { px(g, 4, 11, hair); px(g, 11, 11, hair); }              // a touch longer
        else if (style === 'braids') { px(g, 4, 13, hi); px(g, 11, 13, hi); }           // bead tips
        else if (style === 'twists') { px(g, 4, 11, lo); px(g, 11, 11, lo); }           // longer twists
        else if (style === 'bun') { px(g, 5, 1, hair); px(g, 10, 1, hair); }            // fuller bun
        else if (style === 'short' || style === 'waves' || style === 'buzz') { px(g, 4, 4, hair); px(g, 11, 4, hair); } // soft side sweep
    }
}

// Adornments — drawn last so they sit over hair in every facing.
function drawExtra(g: (string | null)[][], extra: Extra, dir: Facing, top: string) {
    if (extra === 'none') return;
    const frame = '#1d2430';
    const paint = '#b03a2e';
    switch (extra) {
        case 'circlet':
            rect(g, 5, 4, 6, 1, TRIM);                             // brow band over the hair
            if (dir === 'down') px(g, 7, 4, '#8fd8cc');            // centre gem
            else if (dir === 'left') px(g, 5, 4, '#8fd8cc');       // gem faces front
            break;
        case 'hood': {
            const h = shadeHex(top, -22);
            const hs = shadeHex(top, -60);
            if (dir === 'up') {
                rect(g, 4, 0, 8, 9, h); rect(g, 3, 2, 1, 5, h); rect(g, 12, 2, 1, 5, h);
                rect(g, 5, 0, 6, 1, hs); rect(g, 4, 8, 8, 1, hs);  // crown crease + drape hem
            } else if (dir === 'left') {
                rect(g, 5, 0, 7, 4, h);                            // cowl over the crown
                rect(g, 10, 4, 2, 5, h);                           // drape down the back
                px(g, 4, 2, h); px(g, 4, 3, h);                    // brow overhang
                rect(g, 6, 3, 5, 1, hs);                           // shadow under the cowl
            } else {
                rect(g, 4, 0, 8, 4, h);                            // cowl — eyes stay visible
                rect(g, 4, 4, 1, 5, h); rect(g, 11, 4, 1, 5, h);   // side frame
                rect(g, 5, 3, 6, 1, hs);                           // inner shadow at the brow
                px(g, 5, 9, hs); px(g, 10, 9, hs);                 // drape at the shoulders
            }
            break;
        }
        case 'earrings':
            if (dir === 'down') { px(g, 4, 7, TRIM); px(g, 11, 7, TRIM); }
            else if (dir === 'left') px(g, 8, 7, TRIM);
            break;
        case 'glasses':
            if (dir === 'down') { px(g, 5, 6, frame); px(g, 7, 6, frame); px(g, 8, 6, frame); px(g, 10, 6, frame); }
            else if (dir === 'left') { px(g, 5, 6, frame); px(g, 7, 6, frame); px(g, 8, 6, frame); }
            break;
        case 'warpaint':
            if (dir === 'down') { px(g, 5, 7, paint); px(g, 6, 7, paint); px(g, 9, 7, paint); px(g, 10, 7, paint); }
            else if (dir === 'left') { px(g, 5, 7, paint); px(g, 6, 7, paint); }
            break;
        case 'belt':
            rect(g, 5, 14, 6, 1, LEATHER);                         // waist strap over any garb
            px(g, 7, 14, TRIM); px(g, 8, 14, TRIM_SH);             // buckle
            break;
        case 'flower':
            if (dir === 'down') { px(g, 4, 3, '#f472b6'); px(g, 4, 2, '#fbcfe8'); }        // bloom at the temple
            else if (dir === 'left') { px(g, 5, 2, '#f472b6'); px(g, 5, 1, '#fbcfe8'); }
            else { px(g, 11, 3, '#f472b6'); px(g, 11, 2, '#fbcfe8'); }                     // seen from behind too
            break;
        case 'scar':
            if (dir === 'down') { px(g, 5, 5, '#9a4b3c'); px(g, 5, 6, '#9a4b3c'); px(g, 5, 7, '#7f3b2e'); } // left cheek
            else if (dir === 'left') { px(g, 5, 4, '#9a4b3c'); px(g, 5, 5, '#7f3b2e'); }
            break;
    }
}

// ---- worn wardrobe gear — a thin overlay pass keyed by clothing.ts id ----
// The torso occupies the same pixels in every facing, so one pass serves
// all four directions. Unknown ids draw nothing (fail-safe).
function drawGarment(g: (string | null)[][], id: string) {
    switch (id) {
        case 'eden_leaf': // Leafweave Mantle — living green across the shoulders
            rect(g, 5, 10, 6, 1, '#166534');
            px(g, 4, 10, '#34d399'); px(g, 11, 10, '#34d399');     // leaf tips at the shoulders
            px(g, 6, 15, '#34d399');                               // a stray leaf at the hem
            break;
        case 'fair_coat': // Exposition Coat — lapels and brass buttons
            px(g, 6, 11, '#78350f'); px(g, 9, 11, '#78350f');      // lapels
            px(g, 7, 12, '#fbbf24'); px(g, 7, 14, '#fbbf24');      // brass buttons
            px(g, 4, 14, '#fbbf24'); px(g, 11, 14, '#fbbf24');     // cuff trim
            break;
        case 'giza_linen': // Linen of the Stone — a pale sash across the chest
            px(g, 6, 11, '#e7e5e4'); px(g, 7, 12, '#e7e5e4'); px(g, 8, 13, '#e7e5e4'); px(g, 9, 14, '#c2b280');
            break;
        case 'kolbrin_cloak': // Bronzebook Cloak — dark drape with a bronze clasp
            rect(g, 3, 10, 1, 7, '#3b1d5e'); rect(g, 12, 10, 1, 7, '#3b1d5e');
            px(g, 3, 17, '#2a1544'); px(g, 12, 17, '#2a1544');     // drape ends
            px(g, 7, 10, '#b45309'); px(g, 8, 10, '#b45309');      // clasp
            break;
        case 'emerald_vestment': // Hermetic Vestment — twin emerald stole bands
            rect(g, 6, 11, 1, 4, '#065f46'); rect(g, 9, 11, 1, 4, '#065f46');
            px(g, 6, 15, TRIM); px(g, 9, 15, TRIM);                // gold-tipped ends
            break;
        case 'supporter_frequency': // a cyan thread humming through the weave
            rect(g, 5, 10, 6, 1, '#0e7490');
            px(g, 5, 11, '#22d3ee'); px(g, 10, 13, '#22d3ee');
            break;
        case 'supporter_chronicle': // a silver chronicler's band
            rect(g, 5, 14, 6, 1, '#cbd5e1');
            px(g, 8, 14, '#475569');
            break;
        case 'supporter_oracle': // the oracle's violet sigil
            rect(g, 5, 10, 6, 1, '#6d28d9');
            px(g, 7, 12, '#a855f7'); px(g, 8, 12, '#a855f7');
            break;
        case 'supporter_prophetic': // a golden flame over the heart
            rect(g, 5, 10, 6, 1, TRIM_SH);
            px(g, 7, 11, '#fbbf24'); px(g, 8, 12, '#fbbf24'); px(g, 7, 13, '#fbbf24');
            break;
    }
}

/** Merge the equipped wardrobe garment into a config at RENDER time.
 *  Callers should also key their frame caches off the returned object. */
export function wornAvatar(cfg: AvatarConfig, garment?: string | null): AvatarConfig {
    return garment && garment !== 'plain' ? { ...cfg, garment } : cfg;
}

// ---- colour helpers ----
function clamp(n: number) { return n < 0 ? 0 : n > 255 ? 255 : n; }
function shadeHex(hex: string, amt = -34): string {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(clamp(r + amt), clamp(g + amt), clamp(b + amt));
}
function lightenHex(hex: string, amt = 36): string { return shadeHex(hex, amt); }
function hexToRgb(hex: string) {
    const h = hex.replace('#', '');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex(r: number, g: number, b: number) {
    return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

// ---- presets: 13 distinct men + 13 distinct women ----
export const MASC_PRESETS: AvatarConfig[] = [
    { build: 'masc', skin: 8, hairStyle: 'afro', hairColor: 0, face: 'goatee', top: 0, bottom: 6, boots: 0, outfit: 'tunic' },
    { build: 'masc', skin: 4, hairStyle: 'short', hairColor: 2, face: 'keen', top: 2, bottom: 6, boots: 0, outfit: 'vest', extra: 'glasses' },
    { build: 'masc', skin: 10, hairStyle: 'locs', hairColor: 0, face: 'beard', top: 1, bottom: 0, boots: 1, outfit: 'robe' },
    { build: 'masc', skin: 2, hairStyle: 'buzz', hairColor: 5, face: 'calm', top: 4, bottom: 6, boots: 2, outfit: 'tunic' },
    { build: 'masc', skin: 6, hairStyle: 'short', hairColor: 1, face: 'goatee', top: 5, bottom: 0, boots: 0, outfit: 'tunic' },
    { build: 'masc', skin: 9, hairStyle: 'buzz', hairColor: 0, face: 'beard', top: 10, bottom: 6, boots: 1, outfit: 'vest' },
    { build: 'masc', skin: 1, hairStyle: 'short', hairColor: 6, face: 'calm', top: 3, bottom: 6, boots: 3, outfit: 'robe', extra: 'circlet' },
    { build: 'masc', skin: 7, hairStyle: 'afro', hairColor: 8, face: 'keen', top: 8, bottom: 0, boots: 0, outfit: 'tunic', extra: 'warpaint' },
    { build: 'masc', skin: 5, hairStyle: 'locs', hairColor: 2, face: 'calm', top: 9, bottom: 6, boots: 2, outfit: 'tunic' },
    { build: 'masc', skin: 3, hairStyle: 'short', hairColor: 3, face: 'goatee', top: 6, bottom: 0, boots: 1, outfit: 'vest' },
    { build: 'masc', skin: 11, hairStyle: 'buzz', hairColor: 7, face: 'beard', top: 7, bottom: 6, boots: 0, outfit: 'robe' },
    { build: 'masc', skin: 0, hairStyle: 'short', hairColor: 4, face: 'keen', top: 11, bottom: 6, boots: 1, outfit: 'tunic' },
    { build: 'masc', skin: 8, hairStyle: 'afro', hairColor: 6, face: 'calm', top: 5, bottom: 0, boots: 0, outfit: 'vest' },
];
export const FEM_PRESETS: AvatarConfig[] = [
    { build: 'fem', skin: 7, hairStyle: 'long', hairColor: 0, face: 'calm', top: 7, bottom: 6, boots: 0, outfit: 'dress', extra: 'earrings' },
    { build: 'fem', skin: 3, hairStyle: 'bun', hairColor: 2, face: 'keen', top: 3, bottom: 6, boots: 1, outfit: 'tunic' },
    { build: 'fem', skin: 10, hairStyle: 'braids', hairColor: 0, face: 'calm', top: 1, bottom: 0, boots: 0, outfit: 'dress' },
    { build: 'fem', skin: 1, hairStyle: 'long', hairColor: 6, face: 'calm', top: 0, bottom: 6, boots: 2, outfit: 'tunic' },
    { build: 'fem', skin: 5, hairStyle: 'afro', hairColor: 0, face: 'keen', top: 5, bottom: 0, boots: 0, outfit: 'gown', extra: 'circlet' },
    { build: 'fem', skin: 9, hairStyle: 'braids', hairColor: 8, face: 'calm', top: 4, bottom: 6, boots: 1, outfit: 'dress' },
    { build: 'fem', skin: 2, hairStyle: 'bun', hairColor: 3, face: 'calm', top: 10, bottom: 6, boots: 3, outfit: 'tunic' },
    { build: 'fem', skin: 6, hairStyle: 'long', hairColor: 1, face: 'keen', top: 8, bottom: 0, boots: 0, outfit: 'robe' },
    { build: 'fem', skin: 11, hairStyle: 'afro', hairColor: 7, face: 'calm', top: 9, bottom: 6, boots: 2, outfit: 'dress' },
    { build: 'fem', skin: 4, hairStyle: 'long', hairColor: 4, face: 'calm', top: 6, bottom: 6, boots: 0, outfit: 'tunic' },
    { build: 'fem', skin: 8, hairStyle: 'bun', hairColor: 0, face: 'keen', top: 2, bottom: 0, boots: 1, outfit: 'tunic' },
    { build: 'fem', skin: 0, hairStyle: 'braids', hairColor: 5, face: 'calm', top: 11, bottom: 6, boots: 0, outfit: 'dress', extra: 'earrings' },
    { build: 'fem', skin: 7, hairStyle: 'long', hairColor: 9, face: 'calm', top: 3, bottom: 0, boots: 2, outfit: 'tunic' },
];

export function defaultAvatar(): AvatarConfig {
    return { ...MASC_PRESETS[0] };
}

// option lists for the creator UI
export const HAIR_STYLES: HairStyle[] = ['short', 'afro', 'locs', 'twists', 'coils', 'waves', 'highTop', 'long', 'bun', 'braids', 'buzz', 'ponytail', 'crown', 'curls'];
export const OUTFIT_STYLES: OutfitStyle[] = ['tunic', 'vest', 'robe', 'dress', 'gown', 'cloak', 'wanderer', 'vestment'];
// Gender-appropriate garment sets for the creator. Some are shared
// (tunic/robe/wanderer/vestment); gown is feminine-exclusive, vest + cloak
// are masculine-exclusive.
export const MASC_OUTFITS: OutfitStyle[] = ['tunic', 'vest', 'robe', 'cloak', 'wanderer', 'vestment'];
export const FEM_OUTFITS: OutfitStyle[] = ['dress', 'gown', 'robe', 'tunic', 'wanderer', 'vestment'];
/** The default garment a build wears when its Form is chosen. */
export function defaultOutfitFor(build: Build): OutfitStyle {
    return build === 'fem' ? 'dress' : 'tunic';
}
export const FACE_STYLES: FaceStyle[] = ['calm', 'keen', 'goatee', 'beard', 'mustache'];
export const EXTRA_OPTIONS: Extra[] = ['none', 'circlet', 'hood', 'earrings', 'glasses', 'warpaint', 'belt', 'flower', 'scar'];

const randI = (n: number) => Math.floor(Math.random() * n);

// A random preset of the given build (or any), with colours jittered.
export function randomAvatar(build?: Build): AvatarConfig {
    const pool = build === 'fem' ? FEM_PRESETS : build === 'masc' ? MASC_PRESETS : [...MASC_PRESETS, ...FEM_PRESETS];
    const base = pool[randI(pool.length)];
    return {
        ...base,
        skin: randI(SKIN_TONES.length),
        hairColor: randI(HAIR_COLORS.length),
        hairStyle: HAIR_STYLES[randI(HAIR_STYLES.length)],
        top: randI(CLOTH_COLORS.length),
        bottom: randI(CLOTH_COLORS.length),
        boots: randI(BOOT_COLORS.length),
        eyes: Math.random() < 0.45 ? randI(EYE_COLORS.length) : 0,
        // a small chance of a tasteful adornment
        extra: Math.random() < 0.2 ? EXTRA_OPTIONS[1 + randI(EXTRA_OPTIONS.length - 1)] : 'none',
    };
}

// A representative preset for a build (used by the ♂/♀ preset buttons).
export function presetFor(build: Build): AvatarConfig {
    const pool = build === 'fem' ? FEM_PRESETS : MASC_PRESETS;
    return { ...pool[randI(pool.length)] };
}
