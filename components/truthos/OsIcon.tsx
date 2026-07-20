'use client';

/**
 * Truth.OS app icons — colored squircle tiles with real press / open states.
 * Lucide glyphs for sharpness; one component for dock, Start, home, windows.
 */
import type { OsAppId } from './truthOsStore';
import {
    BookOpen,
    Calculator,
    DoorOpen,
    FileText,
    FolderOpen,
    Gamepad2,
    Gift,
    Hash,
    Heart,
    Image,
    Library,
    Newspaper,
    Palette,
    Settings,
    Shield,
    Sparkles,
    User,
    Users,
    type LucideIcon,
} from 'lucide-react';

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

export const ACCENT_STYLES: Record<
    OsAccentId,
    { tile: string; glow: string; ring: string; bar: string; soft: string }
> = {
    emerald: {
        tile: 'from-emerald-400 via-emerald-500 to-teal-600',
        glow: 'shadow-[0_4px_20px_rgba(16,185,129,0.45)]',
        ring: 'ring-emerald-400/50',
        bar: 'bg-emerald-400',
        soft: 'border-emerald-400/40 bg-emerald-500/10',
    },
    amber: {
        tile: 'from-amber-300 via-amber-400 to-orange-500',
        glow: 'shadow-[0_4px_20px_rgba(251,191,36,0.4)]',
        ring: 'ring-amber-400/50',
        bar: 'bg-amber-400',
        soft: 'border-amber-400/40 bg-amber-500/10',
    },
    gold: {
        tile: 'from-yellow-300 via-amber-400 to-yellow-600',
        glow: 'shadow-[0_4px_20px_rgba(245,196,81,0.45)]',
        ring: 'ring-amber-300/50',
        bar: 'bg-amber-300',
        soft: 'border-amber-300/40 bg-amber-400/10',
    },
    cyan: {
        tile: 'from-cyan-300 via-cyan-400 to-sky-600',
        glow: 'shadow-[0_4px_20px_rgba(34,211,238,0.4)]',
        ring: 'ring-cyan-400/50',
        bar: 'bg-cyan-400',
        soft: 'border-cyan-400/40 bg-cyan-500/10',
    },
    violet: {
        tile: 'from-violet-400 via-purple-500 to-fuchsia-600',
        glow: 'shadow-[0_4px_20px_rgba(167,139,250,0.45)]',
        ring: 'ring-violet-400/50',
        bar: 'bg-violet-400',
        soft: 'border-violet-400/40 bg-violet-500/10',
    },
    rose: {
        tile: 'from-rose-400 via-rose-500 to-pink-600',
        glow: 'shadow-[0_4px_20px_rgba(251,113,133,0.4)]',
        ring: 'ring-rose-400/50',
        bar: 'bg-rose-400',
        soft: 'border-rose-400/40 bg-rose-500/10',
    },
    sky: {
        tile: 'from-sky-300 via-sky-400 to-blue-600',
        glow: 'shadow-[0_4px_20px_rgba(56,189,248,0.4)]',
        ring: 'ring-sky-400/50',
        bar: 'bg-sky-400',
        soft: 'border-sky-400/40 bg-sky-500/10',
    },
    indigo: {
        tile: 'from-indigo-400 via-indigo-500 to-violet-700',
        glow: 'shadow-[0_4px_20px_rgba(129,140,248,0.45)]',
        ring: 'ring-indigo-400/50',
        bar: 'bg-indigo-400',
        soft: 'border-indigo-400/40 bg-indigo-500/10',
    },
    pink: {
        tile: 'from-pink-300 via-pink-400 to-rose-500',
        glow: 'shadow-[0_4px_20px_rgba(244,114,182,0.4)]',
        ring: 'ring-pink-400/50',
        bar: 'bg-pink-400',
        soft: 'border-pink-400/40 bg-pink-500/10',
    },
    zinc: {
        tile: 'from-slate-300 via-slate-400 to-slate-600',
        glow: 'shadow-[0_4px_16px_rgba(148,163,184,0.35)]',
        ring: 'ring-slate-400/40',
        bar: 'bg-slate-300',
        soft: 'border-slate-400/35 bg-slate-500/10',
    },
};

const APP_ICON: Record<OsAppId, { Icon: LucideIcon; accent: OsAccentId; label: string }> = {
    truth: { Icon: Sparkles, accent: 'emerald', label: 'Guide' },
    updates: { Icon: Newspaper, accent: 'amber', label: 'Updates' },
    ledger: { Icon: BookOpen, accent: 'gold', label: 'Ledger' },
    soul: { Icon: Heart, accent: 'cyan', label: 'Soul' },
    arcade: { Icon: Gamepad2, accent: 'violet', label: 'Arcade' },
    offering: { Icon: Gift, accent: 'rose', label: 'Offering' },
    visions: { Icon: Image, accent: 'sky', label: 'Visions' },
    library: { Icon: Library, accent: 'sky', label: 'Library' },
    archive: { Icon: Users, accent: 'indigo', label: 'Hall' },
    files: { Icon: FolderOpen, accent: 'sky', label: 'Files' },
    calculator: { Icon: Calculator, accent: 'emerald', label: 'Calc' },
    paint: { Icon: Palette, accent: 'pink', label: 'Paint' },
    notepad: { Icon: FileText, accent: 'zinc', label: 'Notepad' },
    account: { Icon: User, accent: 'cyan', label: 'Account' },
    settings: { Icon: Settings, accent: 'zinc', label: 'Settings' },
    admin: { Icon: Shield, accent: 'rose', label: 'Admin' },
    chamber: { Icon: DoorOpen, accent: 'emerald', label: 'Leave' },
};

export function getAppAccent(app: OsAppId): OsAccentId {
    return APP_ICON[app]?.accent ?? 'emerald';
}

export function getAppIconMeta(app: OsAppId) {
    return APP_ICON[app] ?? { Icon: Hash, accent: 'emerald' as OsAccentId, label: app };
}

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<Size, { box: string; icon: number }> = {
    sm: { box: 'w-8 h-8 rounded-[10px]', icon: 15 },
    md: { box: 'w-10 h-10 rounded-[12px]', icon: 18 },
    lg: { box: 'w-12 h-12 rounded-[14px]', icon: 22 },
    xl: { box: 'w-14 h-14 rounded-2xl', icon: 26 },
};

export function OsIconTile({
    app,
    size = 'md',
    open = false,
    className = '',
}: {
    app: OsAppId;
    size?: Size;
    open?: boolean;
    className?: string;
}) {
    const { Icon, accent } = getAppIconMeta(app);
    const a = ACCENT_STYLES[accent];
    const s = SIZE[size];
    return (
        <span
            className={`relative inline-flex items-center justify-center ${s.box} bg-gradient-to-br ${a.tile} text-white ${a.glow} ring-1 ${open ? a.ring : 'ring-white/25'} shadow-inner ${className}`}
            style={{
                boxShadow: open
                    ? undefined
                    : 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2)',
            }}
        >
            <Icon size={s.icon} strokeWidth={2.25} className="drop-shadow-sm" aria-hidden />
            {/* specular */}
            <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/25 via-transparent to-transparent opacity-80" />
        </span>
    );
}

/** Labeled launcher button (Start menu / utility grid) */
export function OsAppButton({
    app,
    label,
    open = false,
    large = false,
    compact = false,
    onClick,
}: {
    app: OsAppId;
    label?: string;
    open?: boolean;
    large?: boolean;
    /** Tighter tiles for phone Start grids */
    compact?: boolean;
    onClick: () => void;
}) {
    const meta = getAppIconMeta(app);
    const a = ACCENT_STYLES[meta.accent];
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group flex flex-col items-center justify-center gap-1 sm:gap-1.5 rounded-2xl border bg-white/[0.05] hover:bg-white/[0.1] transition-all active:scale-[0.94] duration-150 touch-manipulation select-none w-full ${
                open ? `${a.soft} border` : 'border-white/12 hover:border-white/25'
            } ${
                large
                    ? 'min-h-[92px] p-3'
                    : compact
                      ? 'min-h-[72px] sm:min-h-[80px] p-1.5 sm:p-2'
                      : 'min-h-[80px] sm:min-h-[76px] p-2'
            }`}
        >
            <OsIconTile
                app={app}
                size={large ? 'lg' : compact ? 'md' : 'md'}
                open={open}
                className="motion-safe:group-hover:scale-105 transition-transform duration-150 [@media(hover:none)]:group-hover:scale-100"
            />
            <span className="text-[10px] sm:text-[11px] font-medium text-white/90 group-hover:text-white text-center leading-tight px-0.5 line-clamp-2">
                {label ?? meta.label}
            </span>
            {open && <span className={`h-0.5 w-4 rounded-full ${a.bar}`} />}
        </button>
    );
}

/** Taskbar running app pill */
export function OsTaskbarItem({
    app,
    title,
    focused,
    minimized,
    onClick,
    iconOnly = false,
}: {
    app: OsAppId;
    title: string;
    focused: boolean;
    minimized?: boolean;
    onClick: () => void;
    /** Phone dock: icon-first, 44px min hit */
    iconOnly?: boolean;
}) {
    const accent = getAppAccent(app);
    const a = ACCENT_STYLES[accent];
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={`relative rounded-xl text-[11px] border transition-all duration-150 flex items-center justify-center gap-2 shrink-0 active:scale-[0.96] touch-manipulation select-none ${
                iconOnly
                    ? 'min-w-[44px] min-h-[44px] h-11 w-11 p-0'
                    : 'h-10 min-h-[40px] pl-1.5 pr-2.5 max-w-[160px]'
            } ${
                focused && !minimized
                    ? `bg-white/14 border-white/20 text-white ${a.glow}`
                    : minimized
                      ? 'border-white/5 text-white/40 hover:bg-white/8'
                      : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'
            }`}
        >
            <OsIconTile app={app} size={iconOnly ? 'md' : 'sm'} open={focused && !minimized} />
            {!iconOnly && <span className="truncate hidden sm:inline font-medium">{title}</span>}
            <span
                className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all ${
                    focused && !minimized ? `w-5 ${a.bar}` : minimized ? 'w-1.5 bg-white/25' : `w-2 ${a.bar}/70`
                }`}
            />
        </button>
    );
}

/** Home bento card with colored icon */
export function OsHomeCard({
    app,
    title,
    blurb,
    span,
    onClick,
}: {
    app: OsAppId;
    title: string;
    blurb: string;
    span?: string;
    onClick: () => void;
}) {
    const accent = getAppAccent(app);
    const a = ACCENT_STYLES[accent];
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group relative text-left rounded-2xl border border-white/12 bg-black/50 sm:bg-black/50 hover:bg-black/60 backdrop-blur-md p-3 sm:p-4 transition-all active:scale-[0.98] shadow-lg overflow-hidden min-h-[100px] sm:min-h-[104px] touch-manipulation select-none w-full ${
                a.soft
            } ${span || ''}`}
        >
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}`} />
            <OsIconTile
                app={app}
                size="lg"
                className="mb-2 sm:mb-2.5 motion-safe:group-hover:scale-105 transition-transform [@media(hover:none)]:group-hover:scale-100"
            />
            <span className="block text-sm sm:text-base font-semibold text-white tracking-tight">{title}</span>
            <span className="block text-[11px] sm:text-[12px] text-white/70 mt-0.5 leading-snug line-clamp-2">{blurb}</span>
        </button>
    );
}
