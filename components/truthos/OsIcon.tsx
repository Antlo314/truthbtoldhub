'use client';

/**
 * Truth.OS 4 app icons.
 *
 * Each app owns a two-stop gradient chosen for it — not a shared accent
 * family — so the dock reads as a set of distinct, recognisable things.
 * The tile is a continuous-corner square with a soft top light and a hairline
 * inner rim; no glossy half-sweep. Glyphs are the bespoke solids in OsGlyph.
 *
 * `size` takes a preset or a pixel number; `fill` makes the tile take its
 * parent's box (the dock animates the parent for magnification).
 */
import type { CSSProperties } from 'react';
import type { OsAppId } from './truthOsStore';
import { APP_META } from './truthOsStore';
import { HouseGlyph, OsGlyph } from './OsGlyph';
import { Film, Globe, Landmark, ScrollText, UserRound, type LucideIcon } from 'lucide-react';
import type { Service } from '@/lib/truthos/services';

export type OsAccentId =
    | 'emerald'
    | 'amber'
    | 'gold'
    | 'cyan'
    | 'violet'
    | 'rose'
    | 'sky'
    | 'indigo'
    | 'pink'
    | 'zinc';

/** Tailwind snippets for accent-tinted UI (toasts, dots) */
export const ACCENT_STYLES: Record<OsAccentId, { bar: string; soft: string }> = {
    emerald: { bar: 'bg-emerald-400', soft: 'border-emerald-400/30 bg-emerald-500/10' },
    amber: { bar: 'bg-amber-400', soft: 'border-amber-400/30 bg-amber-500/10' },
    gold: { bar: 'bg-amber-300', soft: 'border-amber-300/30 bg-amber-400/10' },
    cyan: { bar: 'bg-cyan-400', soft: 'border-cyan-400/30 bg-cyan-500/10' },
    violet: { bar: 'bg-violet-400', soft: 'border-violet-400/30 bg-violet-500/10' },
    rose: { bar: 'bg-rose-400', soft: 'border-rose-400/30 bg-rose-500/10' },
    sky: { bar: 'bg-sky-400', soft: 'border-sky-400/30 bg-sky-500/10' },
    indigo: { bar: 'bg-indigo-400', soft: 'border-indigo-400/30 bg-indigo-500/10' },
    pink: { bar: 'bg-pink-400', soft: 'border-pink-400/30 bg-pink-500/10' },
    zinc: { bar: 'bg-slate-300', soft: 'border-slate-400/30 bg-slate-500/10' },
};

type Tile = { from: string; to: string; glyph?: string; accent: OsAccentId };

const TILES: Record<OsAppId, Tile> = {
    truth: { from: '#5eead4', to: '#0f766e', accent: 'emerald' },
    ledger: { from: '#fde68a', to: '#b45309', accent: 'gold' },
    library: { from: '#7dd3fc', to: '#1d4ed8', accent: 'sky' },
    archive: { from: '#a5b4fc', to: '#4338ca', accent: 'indigo' },
    wall: { from: '#fdba74', to: '#c2410c', accent: 'amber' },
    offering: { from: '#fda4af', to: '#be123c', accent: 'rose' },
    arcade: { from: '#c4b5fd', to: '#6d28d9', accent: 'violet' },
    soul: { from: '#67e8f9', to: '#0e7490', accent: 'cyan' },
    media: { from: '#f0abfc', to: '#86198f', accent: 'pink' },
    paint: { from: '#f9a8d4', to: '#be185d', accent: 'pink' },
    photos: { from: '#fde68a', to: '#ec4899', accent: 'pink' },
    music: { from: '#fb7185', to: '#9f1239', accent: 'rose' },
    browser: { from: '#93c5fd', to: '#1e40af', accent: 'sky' },
    files: { from: '#7dd3fc', to: '#0369a1', accent: 'sky' },
    notepad: { from: '#fef08a', to: '#ca8a04', glyph: '#422006', accent: 'amber' },
    tasks: { from: '#86efac', to: '#15803d', accent: 'emerald' },
    calculator: { from: '#52525b', to: '#18181b', glyph: '#fb923c', accent: 'zinc' },
    clock: { from: '#3f3f46', to: '#09090b', accent: 'zinc' },
    terminal: { from: '#334155', to: '#020617', glyph: '#4ade80', accent: 'emerald' },
    settings: { from: '#a1a1aa', to: '#3f3f46', accent: 'zinc' },
    taskmgr: { from: '#1f2937', to: '#030712', glyph: '#34d399', accent: 'emerald' },
    admin: { from: '#fca5a5', to: '#991b1b', accent: 'rose' },
};

const HOUSE_TILE: Tile = { from: '#fde68a', to: '#a16207', glyph: '#1c1305', accent: 'gold' };

export function getAppAccent(app: OsAppId): OsAccentId {
    return TILES[app]?.accent ?? 'emerald';
}

export function getAppIconMeta(app: OsAppId) {
    return { accent: getAppAccent(app), label: APP_META[app]?.label ?? app };
}

/** The two gradient stops, for UI that wants an app's colour (window glow, splash) */
export function appColors(app: OsAppId): { from: string; to: string } {
    const t = TILES[app] ?? TILES.truth;
    return { from: t.from, to: t.to };
}

const PRESET = { xs: 22, sm: 28, md: 40, lg: 52, xl: 64, xxl: 76 } as const;
export type OsIconSize = keyof typeof PRESET | number;

function tileStyle(t: Tile, px: number | null): CSSProperties {
    return {
        width: px ?? '100%',
        height: px ?? '100%',
        // Continuous-corner feel: ~23% radius, the iOS/macOS squircle proportion
        borderRadius: px ? Math.round(px * 0.235) : '23.5%',
        background: `radial-gradient(120% 90% at 22% 8%, rgba(255,255,255,0.32), transparent 52%), linear-gradient(160deg, ${t.from}, ${t.to})`,
        color: t.glyph ?? '#ffffff',
        boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.38)',
            'inset 0 0 0 1px rgba(255,255,255,0.10)',
            'inset 0 -6px 12px -6px rgba(0,0,0,0.35)',
            px && px < 30 ? '0 1px 2px rgba(0,0,0,0.45)' : '0 4px 14px -4px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4)',
        ].join(', '),
    };
}

function Tile({ t, size, children, className = '' }: { t: Tile; size: OsIconSize | 'fill'; children: React.ReactNode; className?: string }) {
    const px = size === 'fill' ? null : typeof size === 'number' ? size : PRESET[size];
    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center select-none ${className}`}
            style={tileStyle(t, px)}
        >
            {children}
        </span>
    );
}

export function OsIconTile({
    app,
    size = 'md',
    className = '',
}: {
    app: OsAppId;
    size?: OsIconSize | 'fill';
    className?: string;
}) {
    const t = TILES[app] ?? TILES.truth;
    const px = size === 'fill' ? null : typeof size === 'number' ? size : PRESET[size];
    return (
        <Tile t={t} size={size} className={className}>
            <OsGlyph app={app} size={px ? Math.round(px * 0.58) : '58%'} />
        </Tile>
    );
}

/** The gold door into the 3D house */
export function HouseTile({ size = 'md', className = '' }: { size?: OsIconSize | 'fill'; className?: string }) {
    const px = size === 'fill' ? null : typeof size === 'number' ? size : PRESET[size];
    return (
        <Tile t={HOUSE_TILE} size={size} className={className}>
            <HouseGlyph size={px ? Math.round(px * 0.58) : '58%'} />
        </Tile>
    );
}

/* ── Sanctum pages that open in the Browser ─────────────── */

const PAGE_TILES: Record<string, { from: string; to: string; Icon: LucideIcon }> = {
    codex: { from: '#e9d5ff', to: '#7e22ce', Icon: ScrollText },
    profile: { from: '#bae6fd', to: '#0f766e', Icon: UserRound },
    treasury: { from: '#fde047', to: '#a16207', Icon: Landmark },
    cineworks: { from: '#fecaca', to: '#7f1d1d', Icon: Film },
};

/** Tile for a catalog entry: the app's own icon, or a page tile */
export function ServiceTile({ service, size = 'md' }: { service: Service; size?: OsIconSize | 'fill' }) {
    if (service.launch.kind === 'app') return <OsIconTile app={service.launch.app} size={size} />;
    const p = PAGE_TILES[service.id] ?? { from: '#cbd5e1', to: '#334155', Icon: Globe };
    const px = size === 'fill' ? null : typeof size === 'number' ? size : PRESET[size];
    return (
        <Tile t={{ from: p.from, to: p.to, accent: 'sky' }} size={size}>
            <p.Icon strokeWidth={2.2} style={{ width: px ? Math.round(px * 0.5) : '50%', height: px ? Math.round(px * 0.5) : '50%' }} />
        </Tile>
    );
}
