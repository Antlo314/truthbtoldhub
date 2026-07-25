'use client';

/**
 * Truth.OS wallpaper catalogue.
 *
 * Three families:
 *  · Sanctum  — the game's own key art
 *  · Abstract — procedural CSS mesh gradients (crisp at any resolution, 0 bytes)
 *  · Living   — repaints itself from the player's local clock
 *
 * Because this OS lives inside the game, several wallpapers are earned rather
 * than listed: each carries an `unlock` predicate evaluated against real
 * character/profile state, so the personalise grid doubles as a progress
 * trophy case. Nothing here fabricates progress — the predicates read fields
 * that already exist on the stores.
 */
import type { OsAccentId } from './OsIcon';

export type WallpaperFamily = 'Sanctum' | 'Abstract' | 'Living';

/** Real progress fields the unlock predicates are allowed to read */
export type GameSnapshot = {
    soulPower: number;
    tier: string | null;
    isSupporter: boolean;
    sourceReturned: boolean;
    founderClaimed: boolean;
    discovered: number;
};

export const EMPTY_SNAPSHOT: GameSnapshot = {
    soulPower: 0,
    tier: null,
    isSupporter: false,
    sourceReturned: false,
    founderClaimed: false,
    discovered: 0,
};

export type OsWallpaper = {
    id: string;
    name: string;
    family: WallpaperFamily;
    /** Suggested accent so the desktop recolours coherently */
    accent: OsAccentId;
    /** Full CSS `background` value. Images use url(); abstracts layer gradients. */
    css: string;
    kind: 'image' | 'gradient';
    /** Absent = always available */
    unlock?: { label: string; test: (s: GameSnapshot) => boolean };
};

/* ── Sanctum: the game's own art ─────────────────────────── */

const SANCTUM: OsWallpaper[] = [
    {
        id: 'aurora',
        name: 'Sanctum Aurora',
        family: 'Sanctum',
        accent: 'emerald',
        css: 'url(/truthos/os-wallpaper.jpg) center/cover no-repeat',
        kind: 'image',
    },
    {
        id: 'hut',
        name: 'The Hut',
        family: 'Sanctum',
        accent: 'amber',
        css: 'url(/brand/hut-interior-cinematic.jpg) center/cover no-repeat',
        kind: 'image',
    },
    {
        id: 'hall',
        name: 'The Hall',
        family: 'Sanctum',
        accent: 'indigo',
        css: 'url(/brand/bg-hall.jpg) center/cover no-repeat',
        kind: 'image',
    },
    {
        id: 'portal',
        name: 'The Portal',
        family: 'Sanctum',
        accent: 'violet',
        css: 'url(/brand/bg-portal.jpg) center/cover no-repeat',
        kind: 'image',
    },
    {
        id: 'sanctuary',
        name: 'Sanctuary',
        family: 'Sanctum',
        accent: 'gold',
        css: 'url(/brand/bg-hut-sanctuary.jpg) center/cover no-repeat',
        kind: 'image',
    },
    {
        id: 'void',
        name: 'Awakening Void',
        family: 'Sanctum',
        accent: 'cyan',
        css: 'url(/brand/bg-awakening-void.jpg) center/cover no-repeat',
        kind: 'image',
    },
    {
        id: 'source',
        name: 'Return to Source',
        family: 'Sanctum',
        accent: 'gold',
        css: 'url(/brand/keyart-return-source.jpg) center/cover no-repeat',
        kind: 'image',
        unlock: {
            label: 'Return to the Source',
            test: (s) => s.sourceReturned,
        },
    },
];

/* ── Abstract: procedural mesh gradients ─────────────────── */

/** Layered radial "mesh gradient" — the look modern OS wallpapers ship with */
const mesh = (stops: string[], base: string) => `${stops.join(', ')}, ${base}`;

const ABSTRACT: OsWallpaper[] = [
    {
        id: 'emerald-flow',
        name: 'Emerald Flow',
        family: 'Abstract',
        accent: 'emerald',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 18% 22%, #065f46 0px, transparent 55%)',
                'radial-gradient(at 82% 18%, #0e7490 0px, transparent 50%)',
                'radial-gradient(at 70% 82%, #047857 0px, transparent 48%)',
            ],
            'linear-gradient(155deg, #021410 0%, #04231c 55%, #062b2b 100%)',
        ),
    },
    {
        id: 'midnight',
        name: 'Midnight Glass',
        family: 'Abstract',
        accent: 'indigo',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 25% 18%, #312e81 0px, transparent 52%)',
                'radial-gradient(at 78% 30%, #1e3a8a 0px, transparent 48%)',
                'radial-gradient(at 55% 88%, #4c1d95 0px, transparent 45%)',
            ],
            'linear-gradient(165deg, #020617 0%, #0b1120 60%, #131a34 100%)',
        ),
    },
    {
        id: 'ember',
        name: 'Ember Dusk',
        family: 'Abstract',
        accent: 'amber',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 22% 78%, #7c2d12 0px, transparent 55%)',
                'radial-gradient(at 80% 62%, #b45309 0px, transparent 48%)',
                'radial-gradient(at 60% 12%, #451a03 0px, transparent 50%)',
            ],
            'linear-gradient(160deg, #140b06 0%, #23110a 55%, #2e1508 100%)',
        ),
    },
    {
        id: 'nebula',
        name: 'Nebula',
        family: 'Abstract',
        accent: 'violet',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 20% 25%, #4c1d95 0px, transparent 55%)',
                'radial-gradient(at 82% 14%, #0e7490 0px, transparent 50%)',
                'radial-gradient(at 66% 78%, #9d174d 0px, transparent 45%)',
                'radial-gradient(at 8% 84%, #1e1b4b 0px, transparent 52%)',
            ],
            'linear-gradient(160deg, #050418 0%, #0b1026 100%)',
        ),
    },
    {
        id: 'deep-current',
        name: 'Deep Current',
        family: 'Abstract',
        accent: 'cyan',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 30% 20%, #0369a1 0px, transparent 52%)',
                'radial-gradient(at 75% 40%, #155e75 0px, transparent 48%)',
                'radial-gradient(at 45% 90%, #082f49 0px, transparent 55%)',
            ],
            'linear-gradient(170deg, #020c18 0%, #04182b 60%, #062038 100%)',
        ),
    },
    {
        id: 'gilded',
        name: 'Gilded Veil',
        family: 'Abstract',
        accent: 'gold',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 25% 25%, #a16207 0px, transparent 50%)',
                'radial-gradient(at 78% 22%, #713f12 0px, transparent 48%)',
                'radial-gradient(at 58% 85%, #78350f 0px, transparent 50%)',
            ],
            'linear-gradient(155deg, #14100a 0%, #201808 55%, #2b1f0a 100%)',
        ),
    },
    {
        id: 'rose-dusk',
        name: 'Rose Dusk',
        family: 'Abstract',
        accent: 'rose',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 24% 28%, #9f1239 0px, transparent 52%)',
                'radial-gradient(at 80% 20%, #86198f 0px, transparent 46%)',
                'radial-gradient(at 60% 86%, #4c0519 0px, transparent 50%)',
            ],
            'linear-gradient(160deg, #150610 0%, #240a1a 60%, #2d0f22 100%)',
        ),
    },
    {
        id: 'obsidian',
        name: 'Obsidian Grid',
        family: 'Abstract',
        accent: 'zinc',
        kind: 'gradient',
        css: [
            'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px) 0 0/64px 64px',
            'linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px) 0 0/64px 64px',
            'radial-gradient(at 50% 0%, #1e293b 0px, transparent 60%)',
            'linear-gradient(170deg, #0a0a0c 0%, #111318 100%)',
        ].join(', '),
    },
    {
        id: 'verdant',
        name: 'Verdant Deep',
        family: 'Abstract',
        accent: 'emerald',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 18% 80%, #14532d 0px, transparent 55%)',
                'radial-gradient(at 80% 72%, #365314 0px, transparent 50%)',
                'radial-gradient(at 55% 10%, #052e16 0px, transparent 52%)',
            ],
            'linear-gradient(165deg, #04140b 0%, #071c10 60%, #0a2414 100%)',
        ),
    },
    {
        id: 'ascendant',
        name: 'Ascendant',
        family: 'Abstract',
        accent: 'gold',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 50% 105%, #f59e0b 0px, transparent 45%)',
                'radial-gradient(at 20% 30%, #7c2d12 0px, transparent 50%)',
                'radial-gradient(at 82% 26%, #4c1d95 0px, transparent 48%)',
            ],
            'linear-gradient(175deg, #0a0710 0%, #170d16 60%, #23121a 100%)',
        ),
        unlock: {
            label: 'Reach 500 soul power',
            test: (s) => s.soulPower >= 500,
        },
    },
    {
        id: 'founder',
        name: "Founder's Seal",
        family: 'Abstract',
        accent: 'gold',
        kind: 'gradient',
        css: [
            'radial-gradient(at 50% 50%, rgba(245,196,81,0.20) 0px, transparent 42%)',
            'repeating-conic-gradient(from 0deg at 50% 50%, rgba(245,196,81,0.10) 0deg 6deg, transparent 6deg 12deg)',
            'radial-gradient(at 50% 50%, #2b1f0a 0px, transparent 70%)',
            'linear-gradient(160deg, #0c0904 0%, #171106 100%)',
        ].join(', '),
        unlock: {
            label: 'Claim founder status',
            test: (s) => s.founderClaimed,
        },
    },
    {
        id: 'patron',
        name: 'Patron Aurora',
        family: 'Abstract',
        accent: 'pink',
        kind: 'gradient',
        css: mesh(
            [
                'radial-gradient(at 15% 20%, #be185d 0px, transparent 50%)',
                'radial-gradient(at 85% 25%, #6d28d9 0px, transparent 48%)',
                'radial-gradient(at 50% 92%, #0e7490 0px, transparent 50%)',
            ],
            'linear-gradient(160deg, #0b0512 0%, #170a20 60%, #1f0f2b 100%)',
        ),
        unlock: {
            label: 'Support the work',
            test: (s) => s.isSupporter,
        },
    },
];

/* ── Living: repaints from the local clock ───────────────── */

type Phase = { from: number; name: string; accent: OsAccentId; css: string };

const PHASES: Phase[] = [
    {
        from: 0,
        name: 'Deep Night',
        accent: 'indigo',
        css: mesh(
            [
                'radial-gradient(at 30% 12%, #1e1b4b 0px, transparent 55%)',
                'radial-gradient(at 78% 30%, #0f172a 0px, transparent 50%)',
            ],
            'linear-gradient(170deg, #01030a 0%, #060b1a 100%)',
        ),
    },
    {
        from: 5,
        name: 'Dawn',
        accent: 'rose',
        css: mesh(
            [
                'radial-gradient(at 50% 100%, #fb7185 0px, transparent 45%)',
                'radial-gradient(at 20% 30%, #4c1d95 0px, transparent 52%)',
            ],
            'linear-gradient(175deg, #0b0718 0%, #1c1030 60%, #33172e 100%)',
        ),
    },
    {
        from: 9,
        name: 'Daylight',
        accent: 'sky',
        css: mesh(
            [
                'radial-gradient(at 50% 8%, #0ea5e9 0px, transparent 50%)',
                'radial-gradient(at 20% 70%, #0369a1 0px, transparent 48%)',
            ],
            'linear-gradient(170deg, #041426 0%, #072742 60%, #0b3358 100%)',
        ),
    },
    {
        from: 17,
        name: 'Dusk',
        accent: 'amber',
        css: mesh(
            [
                'radial-gradient(at 50% 100%, #f59e0b 0px, transparent 42%)',
                'radial-gradient(at 25% 25%, #7c2d12 0px, transparent 52%)',
                'radial-gradient(at 80% 20%, #4c1d95 0px, transparent 48%)',
            ],
            'linear-gradient(175deg, #0a0710 0%, #1b0f14 60%, #2e1710 100%)',
        ),
    },
    {
        from: 21,
        name: 'Nightfall',
        accent: 'violet',
        css: mesh(
            [
                'radial-gradient(at 30% 18%, #4c1d95 0px, transparent 52%)',
                'radial-gradient(at 76% 70%, #0e7490 0px, transparent 46%)',
            ],
            'linear-gradient(170deg, #03030e 0%, #0a0a1f 100%)',
        ),
    },
];

/** Which phase the given hour falls in */
export function livingPhase(hour: number): Phase {
    let cur = PHASES[0];
    for (const p of PHASES) if (hour >= p.from) cur = p;
    return cur;
}

const LIVING: OsWallpaper[] = [
    {
        id: 'living-sky',
        name: 'Living Sky',
        family: 'Living',
        accent: 'sky',
        kind: 'gradient',
        // Placeholder; resolveWallpaper() swaps in the current phase
        css: PHASES[0].css,
    },
];

export const OS_WALLPAPERS: OsWallpaper[] = [...SANCTUM, ...ABSTRACT, ...LIVING];

export const WALLPAPER_FAMILIES: WallpaperFamily[] = ['Sanctum', 'Abstract', 'Living'];

/** True when a wallpaper has no gate, or the player has met it */
export function isUnlocked(w: OsWallpaper, snap: GameSnapshot): boolean {
    return !w.unlock || w.unlock.test(snap);
}

/**
 * Resolve an id to something renderable. Handles `custom:<url>` ids saved by
 * the Photos app, keeps Living Sky in step with the clock, and never returns
 * undefined — an unknown id falls back to the default.
 */
export function resolveWallpaper(
    id: string,
    hour = new Date().getHours(),
): { css: string; name: string; accent: OsAccentId; kind: 'image' | 'gradient' } {
    if (id.startsWith('custom:')) {
        const url = id.slice('custom:'.length);
        return {
            css: `url(${url}) center/cover no-repeat`,
            name: 'Custom',
            accent: 'emerald',
            kind: 'image',
        };
    }
    const w = OS_WALLPAPERS.find((x) => x.id === id) ?? OS_WALLPAPERS[0];
    if (w.family === 'Living') {
        const p = livingPhase(hour);
        return { css: p.css, name: `Living Sky · ${p.name}`, accent: p.accent, kind: 'gradient' };
    }
    return { css: w.css, name: w.name, accent: w.accent, kind: w.kind };
}
