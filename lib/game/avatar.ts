// ============================================================
//  AVATAR — a procedural, layered full-body pixel character.
//  Inspired by the Emberwilds creator: independent skin tone,
//  hair (style + colour), face, and outfit (top/bottom/boots),
//  with masculine/feminine builds. The builder is PURE — it
//  returns a grid of hex colours (or null) so it can be drawn
//  on the browser canvas AND rendered headless for verification.
//  Grid is 16 wide x 24 tall, front-facing.
// ============================================================

export const AV_W = 16;
export const AV_H = 24;

export type Build = 'masc' | 'fem';
export type HairStyle = 'buzz' | 'short' | 'afro' | 'long' | 'bun' | 'braids' | 'locs';
export type OutfitStyle = 'tunic' | 'robe' | 'vest' | 'dress' | 'gown' | 'cloak';
export type FaceStyle = 'calm' | 'keen' | 'goatee' | 'beard';

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
];
export const BOOT_COLORS = ['#4a3324', '#2b2b30', '#5a4632', '#3a2a44'];

const skinShade = ['#d9a066', '#c68642', '#a96d3c', '#8d5524', '#7a4a22', '#67421d',
    '#523015', '#3d2410', '#2b1a0c', '#1f1209', '#160c06', '#0e0704', '#7d9a5e', '#9a8cc4'];

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
    const shade = skinShade[cfg.skin] ?? '#8d5524';
    const hair = HAIR_COLORS[cfg.hairColor] ?? HAIR_COLORS[0];
    const top = CLOTH_COLORS[cfg.top] ?? CLOTH_COLORS[0];
    const topShade = shadeHex(top);
    const bottom = CLOTH_COLORS[cfg.bottom] ?? CLOTH_COLORS[6];
    const boot = BOOT_COLORS[cfg.boots] ?? BOOT_COLORS[0];
    const fem = cfg.build === 'fem';

    // ---- legs / lower body ----
    // Feminine builds read distinctly female: a flared skirt, or — under
    // trousers — wide hips tapering to slim legs. A dress skirts either build.
    // Masculine builds keep straight, even trousers.
    const lLift = step === 1 ? 1 : 0;
    const rLift = step === 2 ? 1 : 0;
    const skirted = cfg.outfit === 'dress' || cfg.outfit === 'gown' || (fem && cfg.outfit === 'robe');
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

    // ---- arms ----
    rect(g, 4, 10, 1, 5, top); rect(g, 11, 10, 1, 5, top);
    px(g, 4, 15, skin); px(g, 11, 15, skin); // hands

    // ---- neck ----
    rect(g, 7, 9, 2, 1, shade);

    // ---- head + face/hair, by facing ----
    if (dir === 'up') {
        rect(g, 5, 3, 6, 6, skin);                 // nape
        drawHairBack(g, cfg.hairStyle, hair);
    } else if (dir === 'left') {
        rect(g, 5, 3, 6, 6, skin);
        px(g, 4, 6, skin); px(g, 4, 7, shade);     // nose / jaw at the front edge
        drawProfileFace(g, cfg.face, shade, hair);
        drawHairSide(g, cfg.hairStyle, hair);
    } else {
        rect(g, 5, 3, 6, 6, skin);
        px(g, 4, 6, skin); px(g, 11, 6, skin);     // ears
        px(g, 5, 8, shade); px(g, 10, 8, shade);   // jaw shading
        drawFace(g, cfg.face, shade, hair);
        drawHair(g, cfg.hairStyle, hair, fem);
    }

    return g;
}

// Back of the head (facing up): hair covers the crown + back; long styles flow down.
function drawHairBack(g: (string | null)[][], style: HairStyle, hair: string) {
    const hi = lightenHex(hair);
    rect(g, 5, 2, 6, 5, hair);
    rect(g, 4, 3, 1, 3, hair); rect(g, 11, 3, 1, 3, hair);
    if (style === 'afro') { rect(g, 4, 0, 8, 4, hair); rect(g, 3, 1, 1, 3, hair); rect(g, 12, 1, 1, 3, hair); }
    else if (style === 'bun') { rect(g, 6, 0, 4, 2, hair); }
    if (style === 'long' || style === 'braids' || style === 'locs') rect(g, 4, 7, 8, 5, hair);
    rect(g, 5, 2, 6, 1, hi);
}

// Profile face (facing left): a single eye toward the front, mouth + facial hair at the chin.
function drawProfileFace(g: (string | null)[][], face: FaceStyle, shade: string, hair: string) {
    px(g, 6, 6, '#2a2030');
    if (face === 'keen') px(g, 6, 5, shade);
    px(g, 5, 8, shade);
    if (face === 'goatee') { px(g, 5, 8, hair); px(g, 5, 9, hair); }
    if (face === 'beard') { rect(g, 5, 7, 3, 2, hair); px(g, 5, 6, hair); }
}

// Side hair (facing left): hair on top + the back (right) of the head.
function drawHairSide(g: (string | null)[][], style: HairStyle, hair: string) {
    const hi = lightenHex(hair);
    rect(g, 6, 2, 5, 4, hair);
    rect(g, 9, 3, 2, 4, hair); rect(g, 11, 3, 1, 3, hair);
    if (style === 'afro') { rect(g, 6, 0, 6, 4, hair); rect(g, 11, 1, 2, 3, hair); }
    else if (style === 'bun') { rect(g, 9, 0, 3, 2, hair); }
    if (style === 'long' || style === 'braids' || style === 'locs') rect(g, 9, 6, 3, 6, hair);
    rect(g, 6, 2, 5, 1, hi);
}

function drawFace(g: (string | null)[][], face: FaceStyle, shade: string, hair: string) {
    const eye = '#2a2030';
    // eyes
    px(g, 6, 6, eye); px(g, 9, 6, eye);
    px(g, 6, 6, eye);
    // brows for 'keen'
    if (face === 'keen') { px(g, 6, 5, shade); px(g, 9, 5, shade); }
    // mouth hint
    px(g, 7, 8, shade);
    // facial hair
    if (face === 'goatee') { px(g, 7, 8, hair); px(g, 8, 8, hair); px(g, 7, 9 - 0, hair); }
    if (face === 'beard') { rect(g, 5, 7, 6, 2, hair); rect(g, 5, 6, 1, 2, hair); rect(g, 10, 6, 1, 2, hair); px(g, 6, 6, '#2a2030'); px(g, 9, 6, '#2a2030'); }
}

function drawHair(g: (string | null)[][], style: HairStyle, hair: string, fem: boolean) {
    const hi = lightenHex(hair);
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
            rect(g, 4, 1, 8, 3, hair); rect(g, 4, 4, 1, 8, hair); rect(g, 11, 4, 1, 8, hair); rect(g, 6, 4, 1, 7, hair); rect(g, 9, 4, 1, 7, hair);
            break;
    }
    void fem;
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
    { build: 'masc', skin: 4, hairStyle: 'short', hairColor: 2, face: 'keen', top: 2, bottom: 6, boots: 0, outfit: 'vest' },
    { build: 'masc', skin: 10, hairStyle: 'locs', hairColor: 0, face: 'beard', top: 1, bottom: 0, boots: 1, outfit: 'robe' },
    { build: 'masc', skin: 2, hairStyle: 'buzz', hairColor: 5, face: 'calm', top: 4, bottom: 6, boots: 2, outfit: 'tunic' },
    { build: 'masc', skin: 6, hairStyle: 'short', hairColor: 1, face: 'goatee', top: 5, bottom: 0, boots: 0, outfit: 'tunic' },
    { build: 'masc', skin: 9, hairStyle: 'buzz', hairColor: 0, face: 'beard', top: 10, bottom: 6, boots: 1, outfit: 'vest' },
    { build: 'masc', skin: 1, hairStyle: 'short', hairColor: 6, face: 'calm', top: 3, bottom: 6, boots: 3, outfit: 'robe' },
    { build: 'masc', skin: 7, hairStyle: 'afro', hairColor: 8, face: 'keen', top: 8, bottom: 0, boots: 0, outfit: 'tunic' },
    { build: 'masc', skin: 5, hairStyle: 'locs', hairColor: 2, face: 'calm', top: 9, bottom: 6, boots: 2, outfit: 'tunic' },
    { build: 'masc', skin: 3, hairStyle: 'short', hairColor: 3, face: 'goatee', top: 6, bottom: 0, boots: 1, outfit: 'vest' },
    { build: 'masc', skin: 11, hairStyle: 'buzz', hairColor: 7, face: 'beard', top: 7, bottom: 6, boots: 0, outfit: 'robe' },
    { build: 'masc', skin: 0, hairStyle: 'short', hairColor: 4, face: 'keen', top: 11, bottom: 6, boots: 1, outfit: 'tunic' },
    { build: 'masc', skin: 8, hairStyle: 'afro', hairColor: 6, face: 'calm', top: 5, bottom: 0, boots: 0, outfit: 'vest' },
];
export const FEM_PRESETS: AvatarConfig[] = [
    { build: 'fem', skin: 7, hairStyle: 'long', hairColor: 0, face: 'calm', top: 7, bottom: 6, boots: 0, outfit: 'dress' },
    { build: 'fem', skin: 3, hairStyle: 'bun', hairColor: 2, face: 'keen', top: 3, bottom: 6, boots: 1, outfit: 'tunic' },
    { build: 'fem', skin: 10, hairStyle: 'braids', hairColor: 0, face: 'calm', top: 1, bottom: 0, boots: 0, outfit: 'dress' },
    { build: 'fem', skin: 1, hairStyle: 'long', hairColor: 6, face: 'calm', top: 0, bottom: 6, boots: 2, outfit: 'tunic' },
    { build: 'fem', skin: 5, hairStyle: 'afro', hairColor: 0, face: 'keen', top: 5, bottom: 0, boots: 0, outfit: 'gown' },
    { build: 'fem', skin: 9, hairStyle: 'braids', hairColor: 8, face: 'calm', top: 4, bottom: 6, boots: 1, outfit: 'dress' },
    { build: 'fem', skin: 2, hairStyle: 'bun', hairColor: 3, face: 'calm', top: 10, bottom: 6, boots: 3, outfit: 'tunic' },
    { build: 'fem', skin: 6, hairStyle: 'long', hairColor: 1, face: 'keen', top: 8, bottom: 0, boots: 0, outfit: 'robe' },
    { build: 'fem', skin: 11, hairStyle: 'afro', hairColor: 7, face: 'calm', top: 9, bottom: 6, boots: 2, outfit: 'dress' },
    { build: 'fem', skin: 4, hairStyle: 'long', hairColor: 4, face: 'calm', top: 6, bottom: 6, boots: 0, outfit: 'tunic' },
    { build: 'fem', skin: 8, hairStyle: 'bun', hairColor: 0, face: 'keen', top: 2, bottom: 0, boots: 1, outfit: 'tunic' },
    { build: 'fem', skin: 0, hairStyle: 'braids', hairColor: 5, face: 'calm', top: 11, bottom: 6, boots: 0, outfit: 'dress' },
    { build: 'fem', skin: 7, hairStyle: 'long', hairColor: 9, face: 'calm', top: 3, bottom: 0, boots: 2, outfit: 'tunic' },
];

export function defaultAvatar(): AvatarConfig {
    return { ...MASC_PRESETS[0] };
}

// option lists for the creator UI
export const HAIR_STYLES: HairStyle[] = ['short', 'afro', 'locs', 'long', 'bun', 'braids', 'buzz'];
export const OUTFIT_STYLES: OutfitStyle[] = ['tunic', 'vest', 'robe', 'dress', 'gown', 'cloak'];
// Gender-appropriate garment sets for the creator. Some are shared (tunic/robe);
// gown is feminine-exclusive, vest + cloak are masculine-exclusive.
export const MASC_OUTFITS: OutfitStyle[] = ['tunic', 'vest', 'robe', 'cloak'];
export const FEM_OUTFITS: OutfitStyle[] = ['dress', 'gown', 'robe', 'tunic'];
/** The default garment a build wears when its Form is chosen. */
export function defaultOutfitFor(build: Build): OutfitStyle {
    return build === 'fem' ? 'dress' : 'tunic';
}
export const FACE_STYLES: FaceStyle[] = ['calm', 'keen', 'goatee', 'beard'];

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
    };
}

// A representative preset for a build (used by the ♂/♀ preset buttons).
export function presetFor(build: Build): AvatarConfig {
    const pool = build === 'fem' ? FEM_PRESETS : MASC_PRESETS;
    return { ...pool[randI(pool.length)] };
}
