'use client';

/**
 * Truth.OS system surfaces — toasts, notification center, quick settings,
 * calendar flyout, task view (Alt-grid), desktop context menu, widgets
 * board, lock screen. All chrome that isn't a window or the taskbar.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bell,
    BellOff,
    Expand,
    Image as ImageIcon,
    Keyboard,
    LayoutGrid,
    Lock,
    Search,
    Moon,
    Music,
    Newspaper,
    Power,
    RefreshCw,
    Sun,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { useTruthOs, type OsAppId } from './truthOsStore';
import { useOsSystem, OS_WALLPAPERS, ACCENT_HEX } from './osSystemStore';
import { ACCENT_STYLES, OsAppButton, OsIconTile, getAppAccent, type OsAccentId } from './OsIcon';
import { MonthCalendar } from './apps/UtilityApps';
import { loadSettings, saveSettings, applyMusicSetting } from '@/lib/game/settings';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { fetchBulletins, type Bulletin } from '@/lib/game/hut';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { hubAudio } from '@/lib/truthos/hubAudio';

function timeAgo(at: number): string {
    const s = Math.max(1, Math.round((Date.now() - at) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.round(m / 60)}h ago`;
}

/* ─── Toast stack ────────────────────────────────────────── */

export function OsToasts() {
    const notifications = useOsSystem((s) => s.notifications);
    const toastIds = useOsSystem((s) => s.toastIds);
    const dismissToast = useOsSystem((s) => s.dismissToast);
    const toasts = notifications.filter((n) => toastIds.includes(n.id)).slice(0, 3);

    return (
        <div
            // Notifications arrive top-right, sliding in under the menu bar
            className="pointer-events-none absolute right-2 sm:right-3 z-[70] flex flex-col gap-2 w-[min(92vw,340px)]"
            style={{ top: 'calc(var(--os-menubar, 1.8rem) + 0.5rem)' }}
        >
            <AnimatePresence>
                {toasts.map((n) => {
                    const a = ACCENT_STYLES[(n.accent ?? 'emerald') as OsAccentId];
                    return (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 60 }}
                            className={`pointer-events-auto rounded-2xl border bg-[#0d1017]/95 backdrop-blur-xl shadow-2xl overflow-hidden ${a.soft}`}
                        >
                            <div className="flex items-start gap-2.5 p-3">
                                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.bar}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] text-white font-semibold leading-tight">
                                        {n.title}
                                    </p>
                                    {n.body && (
                                        <p className="text-[11px] text-white/60 mt-0.5 leading-snug line-clamp-2">
                                            {n.body}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => dismissToast(n.id)}
                                    className="shrink-0 w-7 h-7 rounded-lg text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center touch-manipulation"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

/* ─── Flyout scaffold (bottom-right panel / phone sheet) ─── */

function Flyout({
    phone,
    children,
    width = 360,
    align = 'right',
}: {
    phone: boolean;
    children: React.ReactNode;
    width?: number;
    align?: 'right' | 'left';
}) {
    return (
        <motion.div
            // Desktop flyouts drop DOWN from the menu bar now; phone keeps
            // the bottom sheet, which is the right grammar for a thumb.
            initial={phone ? { opacity: 0, y: 14 } : { opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={phone ? { opacity: 0, y: 14 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={`absolute z-[60] border border-white/15 bg-[#0e1118]/90 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.8)] ring-1 ring-black/40 overflow-hidden flex flex-col max-sm:backdrop-blur-md sm:backdrop-blur-2xl ${
                phone
                    ? 'left-0 right-0 bottom-0 rounded-t-3xl border-b-0 max-h-[min(80dvh,600px)]'
                    : `rounded-2xl max-h-[min(72vh,640px)] ${align === 'right' ? 'right-2' : 'left-2'}`
            }`}
            style={
                {
                    ...(phone ? {} : { top: 'calc(var(--os-menubar, 1.8rem) + 0.4rem)' }),
                    width: phone ? undefined : Math.min(width, 420),
                } as CSSProperties
            }
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </motion.div>
    );
}

/* ─── Quick settings ─────────────────────────────────────── */

function QuickToggle({
    active,
    label,
    icon,
    onClick,
}: {
    active: boolean;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col items-start gap-2 rounded-2xl border p-3 min-h-[76px] transition-all active:scale-[0.97] touch-manipulation ${
                active
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-white shadow-[0_0_16px_rgba(52,211,153,0.2)]'
                    : 'bg-white/[0.05] border-white/12 text-white/70 hover:bg-white/[0.09]'
            }`}
        >
            <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    active ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white/80'
                }`}
            >
                {icon}
            </span>
            <span className="text-[11px] font-semibold leading-tight">{label}</span>
        </button>
    );
}

export function OsQuickSettings({ phone }: { phone: boolean }) {
    const {
        brightness,
        nightLight,
        accent,
        volume,
        doNotDisturb,
        setBrightness,
        setNightLight,
        setAccent,
        setVolume,
        setDoNotDisturb,
        setLocked,
        setFlyout,
    } = useOsSystem();
    const layoutMode = useTruthOs((s) => s.layoutMode);
    const setLayoutMode = useTruthOs((s) => s.setLayoutMode);
    const [music, setMusic] = useState(() => loadSettings().music);
    const [fs, setFs] = useState(
        () => typeof document !== 'undefined' && !!document.fullscreenElement,
    );

    return (
        <Flyout phone={phone} width={352}>
            <div className="p-3 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                    <QuickToggle
                        active={music}
                        label={`Music · ${music ? 'On' : 'Off'}`}
                        icon={<Music size={15} />}
                        onClick={() => {
                            const next = !music;
                            setMusic(next);
                            saveSettings({ music: next });
                            applyMusicSetting(next);
                            sacredUi.click();
                        }}
                    />
                    <QuickToggle
                        active={nightLight}
                        label="Night light"
                        icon={<Moon size={15} />}
                        onClick={() => {
                            setNightLight(!nightLight);
                            sacredUi.click();
                        }}
                    />
                    <QuickToggle
                        active={layoutMode === 'bento'}
                        label={layoutMode === 'bento' ? 'Bento snap' : 'Free float'}
                        icon={<LayoutGrid size={15} />}
                        onClick={() => {
                            setLayoutMode(layoutMode === 'bento' ? 'float' : 'bento');
                            sacredUi.click();
                        }}
                    />
                    <QuickToggle
                        active={doNotDisturb}
                        label="Do not disturb"
                        icon={<BellOff size={15} />}
                        onClick={() => {
                            setDoNotDisturb(!doNotDisturb);
                            sacredUi.click();
                        }}
                    />
                    <QuickToggle
                        active={fs}
                        label="Fullscreen"
                        icon={<Expand size={15} />}
                        onClick={() => {
                            if (document.fullscreenElement) {
                                void document.exitFullscreen();
                                setFs(false);
                            } else {
                                void document.documentElement.requestFullscreen().catch(() => undefined);
                                setFs(true);
                            }
                            sacredUi.click();
                        }}
                    />
                </div>

                {/* Brightness */}
                <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-mono flex items-center gap-1.5">
                            <Sun size={12} /> Brightness
                        </span>
                        <span className="text-[11px] text-white/70 tabular-nums">
                            {Math.round(brightness * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min={55}
                        max={100}
                        value={Math.round(brightness * 100)}
                        onChange={(e) => setBrightness(Number(e.target.value) / 100)}
                        className="w-full accent-emerald-400 h-6 touch-manipulation"
                    />
                </div>

                {/* Volume */}
                <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-mono flex items-center gap-1.5">
                            {volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />} Volume
                        </span>
                        <span className="text-[11px] text-white/70 tabular-nums">
                            {Math.round(volume * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        onChange={(e) => {
                            const v = Number(e.target.value) / 100;
                            setVolume(v);
                            hubAudio.setMaster(v);
                        }}
                        className="w-full accent-emerald-400 h-6 touch-manipulation"
                    />
                </div>

                {/* Accent */}
                <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-mono mb-2">
                        Accent color
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(ACCENT_HEX) as OsAccentId[]).map((a) => (
                            <button
                                key={a}
                                type="button"
                                title={a}
                                onClick={() => {
                                    setAccent(a);
                                    sacredUi.click();
                                }}
                                className={`w-8 h-8 min-w-[32px] rounded-full border-2 transition-transform active:scale-90 touch-manipulation ${
                                    accent === a
                                        ? 'border-white scale-110 shadow-lg'
                                        : 'border-white/20 hover:scale-105'
                                }`}
                                style={{ background: ACCENT_HEX[a] }}
                            />
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setFlyout(null);
                        setLocked(true);
                        sacredUi.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border border-white/12 bg-white/[0.04] text-[12px] text-white/80 hover:bg-white/[0.08] min-h-[46px] font-medium touch-manipulation"
                >
                    <Lock size={14} /> Lock screen
                </button>
            </div>
        </Flyout>
    );
}

/* ─── Calendar flyout ────────────────────────────────────── */

export function OsCalendarFlyout({ phone }: { phone: boolean }) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <Flyout phone={phone} width={330}>
            <div className="p-4 space-y-3">
                <div>
                    <p className="text-3xl font-light text-white tabular-nums">
                        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                    <p className="text-[11px] text-sky-300/70 uppercase tracking-[0.25em] mt-1">
                        {now.toLocaleDateString([], {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </p>
                </div>
                <MonthCalendar date={now} />
            </div>
        </Flyout>
    );
}

/* ─── Notification center ────────────────────────────────── */

export function OsNotificationCenter({ phone }: { phone: boolean }) {
    const notifications = useOsSystem((s) => s.notifications);
    const clearNotifications = useOsSystem((s) => s.clearNotifications);
    const markAllRead = useOsSystem((s) => s.markAllRead);

    useEffect(() => {
        markAllRead();
    }, [markAllRead]);

    return (
        <Flyout phone={phone} width={360}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 font-mono flex items-center gap-2">
                    <Bell size={13} /> Notifications
                </p>
                {notifications.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            clearNotifications();
                            sacredUi.click();
                        }}
                        className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 touch-manipulation"
                    >
                        Clear all
                    </button>
                )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
                {notifications.length === 0 && (
                    <p className="text-center text-[12px] text-white/40 py-10">
                        All clear — no notifications.
                    </p>
                )}
                {notifications.map((n) => {
                    const a = ACCENT_STYLES[(n.accent ?? 'emerald') as OsAccentId];
                    return (
                        <div
                            key={n.id}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 flex items-start gap-2.5"
                        >
                            <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${a.bar}`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] text-white/95 font-medium leading-tight">
                                    {n.title}
                                </p>
                                {n.body && (
                                    <p className="text-[11px] text-white/55 mt-0.5 leading-snug">{n.body}</p>
                                )}
                                <p className="text-[9px] text-white/35 mt-1 font-mono">{timeAgo(n.at)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Flyout>
    );
}

/* ─── Widgets board ──────────────────────────────────────── */

export function OsWidgetsPanel({
    phone,
    onLaunch,
}: {
    phone: boolean;
    onLaunch: (app: OsAppId) => void;
}) {
    const [now, setNow] = useState(() => new Date());
    const profile = useSoulStore((s) => s.profile);
    const [rows, setRows] = useState<Bulletin[]>([]);
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        fetchBulletins(4)
            .then(setRows)
            .catch(() => setRows([]));
        return () => clearInterval(t);
    }, []);

    return (
        <Flyout phone={phone} width={400} align="left">
            <div className="p-3 space-y-2.5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2.5">
                    {/* Clock widget */}
                    <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/15 to-transparent p-3.5">
                        <p className="text-3xl font-light text-white tabular-nums">
                            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] text-sky-200/70 uppercase tracking-[0.2em] mt-1">
                            {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                    {/* Soul widget */}
                    <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 to-transparent p-3.5">
                        <p className="text-[9px] uppercase tracking-[0.25em] text-cyan-200/70 font-mono">
                            Soul power
                        </p>
                        <p className="text-3xl font-light text-white tabular-nums mt-0.5">
                            {profile?.soul_power ?? '—'}
                        </p>
                        <p className="text-[10px] text-white/50 mt-1 truncate">
                            {profile?.display_name || 'Sign in to grow'}
                        </p>
                    </div>
                </div>

                {/* Quick launch */}
                <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-2.5">
                    <p className="text-[9px] uppercase tracking-[0.28em] text-white/45 font-mono mb-2 px-1">
                        Quick launch
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                        {(['truth', 'media', 'arcade', 'terminal'] as OsAppId[]).map((app) => (
                            <OsAppButton key={app} app={app} compact onClick={() => onLaunch(app)} />
                        ))}
                    </div>
                </div>

                {/* Dispatches widget */}
                <div className="rounded-2xl border border-amber-400/20 bg-white/[0.03] p-3">
                    <p className="text-[9px] uppercase tracking-[0.28em] text-amber-200/70 font-mono mb-2 flex items-center gap-1.5">
                        <Newspaper size={11} /> Latest dispatches
                    </p>
                    {rows.length === 0 && (
                        <p className="text-[11px] text-white/40">No dispatches yet.</p>
                    )}
                    <ul className="space-y-1.5">
                        {rows.map((r) => (
                            <li key={r.id} className="text-[11px] text-white/75 leading-snug">
                                <span className="text-amber-200/80 font-medium">
                                    {r.title || 'Dispatch'}
                                </span>
                                {r.body && (
                                    <span className="text-white/45"> — {r.body.slice(0, 64)}…</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Flyout>
    );
}

/* ─── Task View ──────────────────────────────────────────── */

export function OsTaskView({ onPick }: { onPick: (id: string) => void }) {
    const windows = useTruthOs((s) => s.windows);
    const closeWindow = useTruthOs((s) => s.closeWindow);
    const setTaskView = useOsSystem((s) => s.setTaskView);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[65] bg-black/70 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setTaskView(false)}
        >
            <div className="w-full max-w-3xl mb-[var(--os-taskbar)]">
                <p className="text-center text-[10px] uppercase tracking-[0.4em] text-white/50 font-mono mb-4">
                    Task view · {windows.length} window{windows.length === 1 ? '' : 's'}
                </p>
                {windows.length === 0 ? (
                    <p className="text-center text-white/50 text-sm">Nothing open. Press Start.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {windows.map((w) => {
                            const a = ACCENT_STYLES[getAppAccent(w.app)];
                            return (
                                <motion.button
                                    key={w.id}
                                    type="button"
                                    initial={{ opacity: 0, scale: 0.92 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPick(w.id);
                                        sacredUi.click();
                                    }}
                                    className={`group relative rounded-2xl border bg-[#0d1017]/95 p-4 text-left hover:bg-[#141926] transition-colors min-h-[110px] ${a.soft} touch-manipulation`}
                                >
                                    <OsIconTile app={w.app} size="lg" className="mb-2.5" />
                                    <p className="text-[12px] text-white font-semibold truncate pr-6">
                                        {w.title}
                                    </p>
                                    <p className="text-[10px] text-white/45 mt-0.5">
                                        {w.minimized ? 'Minimized' : 'Running'}
                                    </p>
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            closeWindow(w.id);
                                            sacredUi.click();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.stopPropagation();
                                                closeWindow(w.id);
                                            }
                                        }}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-red-500/80 hover:text-white transition-colors touch-manipulation"
                                    >
                                        <X size={14} />
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* ─── Desktop context menu ───────────────────────────────── */

export function OsContextMenu({
    onOpenSettings,
    onRestart,
}: {
    onOpenSettings: () => void;
    onRestart: () => void;
}) {
    const ctxMenu = useOsSystem((s) => s.ctxMenu);
    const setCtxMenu = useOsSystem((s) => s.setCtxMenu);
    const setTaskView = useOsSystem((s) => s.setTaskView);
    const setLocked = useOsSystem((s) => s.setLocked);
    const setWallpaper = useOsSystem((s) => s.setWallpaper);
    const setOverlay = useOsSystem((s) => s.setOverlay);
    const wallpaper = useOsSystem((s) => s.wallpaper);

    if (!ctxMenu) return null;

    const items: { label: string; icon: React.ReactNode; run: () => void }[] = [
        { label: 'Command palette', icon: <Search size={13} />, run: () => setOverlay('palette') },
        { label: 'Task view', icon: <Expand size={13} />, run: () => setTaskView(true) },
        {
            label: 'Next wallpaper',
            icon: <ImageIcon size={13} />,
            run: () => {
                const i = OS_WALLPAPERS.findIndex((w) => w.id === wallpaper);
                setWallpaper(OS_WALLPAPERS[(i + 1) % OS_WALLPAPERS.length].id);
            },
        },
        { label: 'Personalize', icon: <LayoutGrid size={13} />, run: onOpenSettings },
        { label: 'Keyboard shortcuts', icon: <Keyboard size={13} />, run: () => setOverlay('shortcuts') },
        { label: 'Lock', icon: <Lock size={13} />, run: () => setLocked(true) },
        { label: 'Restart Truth.OS', icon: <RefreshCw size={13} />, run: onRestart },
    ];

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    return (
        <div
            className="absolute z-[66] w-52 rounded-xl border border-white/15 bg-[#10131b]/97 backdrop-blur-2xl shadow-2xl ring-1 ring-white/10 py-1.5"
            style={{
                left: Math.min(ctxMenu.x, vw - 220),
                top: Math.min(ctxMenu.y, vh - 260),
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((it) => (
                <button
                    key={it.label}
                    type="button"
                    onClick={() => {
                        setCtxMenu(null);
                        it.run();
                        sacredUi.click();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] text-white/80 hover:bg-white/10 hover:text-white min-h-[40px] touch-manipulation"
                >
                    <span className="text-white/50">{it.icon}</span>
                    {it.label}
                </button>
            ))}
        </div>
    );
}

/* ─── Lock screen ────────────────────────────────────────── */

export function OsLockScreen({ wallpaperCss }: { wallpaperCss: string }) {
    const setLocked = useOsSystem((s) => s.setLocked);
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') setLocked(false);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            clearInterval(t);
            window.removeEventListener('keydown', onKey);
        };
    }, [setLocked]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            className="absolute inset-0 z-[80] overflow-hidden cursor-pointer select-none"
            onClick={() => {
                setLocked(false);
                sacredUi.access();
            }}
        >
            <div
                className="absolute inset-0 bg-cover bg-center scale-105"
                style={{ backgroundImage: wallpaperCss }}
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
            {/* macOS grammar: date over a huge thin clock in the top third,
                identity + unlock hint resting at the bottom */}
            <div className="relative h-full flex flex-col items-center text-center px-6 pt-[13vh]">
                <p className="text-[13px] font-semibold text-white/85 tracking-wide">
                    {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="mt-1 text-[86px] sm:text-[110px] leading-none font-thin text-white tabular-nums drop-shadow-2xl tracking-tight">
                    {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="mt-auto mb-[9vh] flex flex-col items-center gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-2xl font-black bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-transparent shadow-xl">
                        ✦
                    </span>
                    <p className="text-[12px] font-medium text-white/80">Truth.OS</p>
                    <p className="text-[11px] text-white/50 animate-pulse flex items-center gap-2">
                        <Power size={11} /> Click anywhere to unlock
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
