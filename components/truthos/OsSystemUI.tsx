'use client';

/**
 * Truth.OS 4 system surfaces: toasts, Control Center, Today (calendar and
 * notifications in one panel — they were three flyouts), Mission Control,
 * the desktop menu, and the lock screen.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BellOff,
    ChevronLeft,
    ChevronRight,
    Expand,
    Lock,
    Moon,
    Music,
    Sun,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { useTruthOs, APP_META } from './truthOsStore';
import { useOsSystem, OS_WALLPAPERS, ACCENT_HEX, isUnlocked } from './osSystemStore';
import { ACCENT_STYLES, OsIconTile, type OsAccentId } from './OsIcon';
import { setAllSound, soundOn } from '@/components/sanctum/SoundToggle';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { hubAudio } from '@/lib/truthos/hubAudio';

function timeAgo(at: number): string {
    const s = Math.max(1, Math.round((Date.now() - at) / 1000));
    if (s < 60) return 'now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}

const glass = 'border border-white/[0.12] bg-[#1b1e27]/80 shadow-[0_24px_70px_-14px_rgba(0,0,0,0.85)] backdrop-blur-3xl';

/* ─── Toasts ─────────────────────────────────────────────── */

export function OsToasts() {
    const notifications = useOsSystem((s) => s.notifications);
    const toastIds = useOsSystem((s) => s.toastIds);
    const dismiss = useOsSystem((s) => s.dismissToast);
    const toasts = notifications.filter((n) => toastIds.includes(n.id)).slice(0, 3);
    return (
        <div
            className="pointer-events-none absolute right-3 z-[72] flex w-[min(92vw,340px)] flex-col gap-2"
            style={{ top: 'calc(var(--os-menubar) + 10px)' }}
        >
            <AnimatePresence>
            {toasts.map((n) => {
                const a = ACCENT_STYLES[(n.accent ?? 'emerald') as OsAccentId];
                return (
                    <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className={`pointer-events-auto flex items-start gap-3 rounded-2xl p-3 ${glass}`}
                    >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.bar}`} />
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold leading-tight text-white">{n.title}</p>
                            {n.body && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/60">{n.body}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={() => dismiss(n.id)}
                            aria-label="Dismiss"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
                        >
                            <X size={13} />
                        </button>
                    </motion.div>
                );
            })}
            </AnimatePresence>
        </div>
    );
}

/* ─── Panel scaffold — drops from the top bar, or a sheet on phones ── */

function Panel({ phone, width, children }: { phone: boolean; width: number; children: React.ReactNode }) {
    return (
        <motion.div
            initial={phone ? { opacity: 0, y: -16 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={phone ? { opacity: 0, y: -16 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={`absolute z-[66] flex flex-col overflow-hidden ${glass} ${
                phone ? 'inset-x-2 rounded-3xl' : 'right-2 rounded-2xl'
            }`}
            style={
                {
                    top: 'calc(var(--os-menubar) + 6px)',
                    width: phone ? undefined : width,
                    maxHeight: 'calc(100% - var(--os-menubar) - var(--os-taskbar) - 12px)',
                } as CSSProperties
            }
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </motion.div>
    );
}

/* ─── Control Center ─────────────────────────────────────── */

function Tile({ on, label, sub, icon, onClick }: { on: boolean; label: string; sub?: string; icon: React.ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={() => {
                sacredUi.click();
                onClick();
            }}
            className="flex min-h-[58px] items-center gap-2.5 rounded-2xl bg-white/[0.08] px-3 text-left transition-colors hover:bg-white/[0.12] active:scale-[0.98] touch-manipulation"
        >
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    on ? 'bg-[var(--os-accent,#34d399)] text-black' : 'bg-white/[0.12] text-white/80'
                }`}
            >
                {icon}
            </span>
            <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-white">{label}</span>
                {sub && <span className="block truncate text-[11px] text-white/50">{sub}</span>}
            </span>
        </button>
    );
}

function Slider({ icon, value, min = 0, onChange }: { icon: React.ReactNode; value: number; min?: number; onChange: (v: number) => void }) {
    return (
        <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.08] px-3 py-2.5">
            <span className="text-white/70">{icon}</span>
            <input
                type="range"
                min={min}
                max={100}
                value={Math.round(value * 100)}
                onChange={(e) => onChange(Number(e.target.value) / 100)}
                className="h-6 w-full touch-manipulation"
                style={{ accentColor: 'var(--os-accent, #34d399)' }}
            />
        </div>
    );
}

export function OsControlCenter({ phone }: { phone: boolean }) {
    const brightness = useOsSystem((s) => s.brightness);
    const nightLight = useOsSystem((s) => s.nightLight);
    const accent = useOsSystem((s) => s.accent);
    const volume = useOsSystem((s) => s.volume);
    const dnd = useOsSystem((s) => s.doNotDisturb);
    const setBrightness = useOsSystem((s) => s.setBrightness);
    const setNightLight = useOsSystem((s) => s.setNightLight);
    const setAccent = useOsSystem((s) => s.setAccent);
    const setVolume = useOsSystem((s) => s.setVolume);
    const setDnd = useOsSystem((s) => s.setDoNotDisturb);
    const setLocked = useOsSystem((s) => s.setLocked);
    const [music, setMusic] = useState(() => soundOn());
    useEffect(() => {
        const sync = (e: Event) => setMusic(!!(e as CustomEvent<boolean>).detail);
        window.addEventListener('tbth-sound', sync);
        return () => window.removeEventListener('tbth-sound', sync);
    }, []);
    const [fs, setFs] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);

    return (
        <Panel phone={phone} width={330}>
            <div className="space-y-2.5 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2.5">
                    <Tile
                        on={music}
                        label="Sound"
                        sub={music ? 'On' : 'Muted'}
                        icon={<Music size={15} />}
                        onClick={() => setAllSound(!music)}
                    />
                    <Tile on={dnd} label="Focus" sub={dnd ? 'Do Not Disturb' : 'Off'} icon={<BellOff size={15} />} onClick={() => setDnd(!dnd)} />
                    <Tile on={nightLight} label="Night light" sub={nightLight ? 'On' : 'Off'} icon={<Moon size={15} />} onClick={() => setNightLight(!nightLight)} />
                    <Tile
                        on={fs}
                        label="Full screen"
                        icon={<Expand size={15} />}
                        onClick={() => {
                            if (document.fullscreenElement) {
                                void document.exitFullscreen();
                                setFs(false);
                            } else {
                                void document.documentElement.requestFullscreen().catch(() => undefined);
                                setFs(true);
                            }
                        }}
                    />
                </div>
                <Slider icon={<Sun size={16} />} value={brightness} min={55} onChange={setBrightness} />
                <Slider
                    icon={volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    value={volume}
                    onChange={(v) => {
                        setVolume(v);
                        hubAudio.setMaster(v);
                    }}
                />
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/[0.08] px-3 py-2.5">
                    {(Object.keys(ACCENT_HEX) as OsAccentId[]).map((a) => (
                        <button
                            key={a}
                            type="button"
                            title={a}
                            onClick={() => {
                                setAccent(a);
                                sacredUi.click();
                            }}
                            className={`h-6 w-6 rounded-full transition-transform active:scale-90 ${
                                accent === a ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2a2d36]' : 'hover:scale-110'
                            }`}
                            style={{ background: ACCENT_HEX[a] }}
                        />
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setLocked(true);
                        sacredUi.click();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-2xl bg-white/[0.08] px-3 py-3 text-[13px] text-white/85 hover:bg-white/[0.12]"
                >
                    <Lock size={15} /> Lock screen
                </button>
            </div>
        </Panel>
    );
}

/* ─── Today: calendar + notifications ───────────────────── */

function Calendar() {
    const [now] = useState(() => new Date());
    const [view, setView] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
    const y = view.getFullYear();
    const m = view.getMonth();
    const lead = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
    const isThisMonth = now.getFullYear() === y && now.getMonth() === m;
    return (
        <div className="rounded-2xl bg-white/[0.06] p-3">
            <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white">
                    {view.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                </p>
                <div className="flex gap-0.5">
                    {[-1, 1].map((d) => (
                        <button
                            key={d}
                            type="button"
                            aria-label={d < 0 ? 'Previous month' : 'Next month'}
                            onClick={() => setView(new Date(y, m + d, 1))}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                        >
                            {d < 0 ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-7 text-center text-[10.5px] font-medium text-white/40">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i} className="py-1">
                        {d}
                    </span>
                ))}
            </div>
            <div className="grid grid-cols-7 text-center">
                {cells.map((d, i) => (
                    <span key={i} className="flex h-8 items-center justify-center">
                        {d && (
                            <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] tabular-nums ${
                                    isThisMonth && d === now.getDate()
                                        ? 'bg-[var(--os-accent,#34d399)] font-semibold text-black'
                                        : 'text-white/80'
                                }`}
                            >
                                {d}
                            </span>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function OsToday({ phone }: { phone: boolean }) {
    const notifications = useOsSystem((s) => s.notifications);
    const clear = useOsSystem((s) => s.clearNotifications);
    const markAllRead = useOsSystem((s) => s.markAllRead);
    useEffect(() => {
        markAllRead();
    }, [markAllRead]);
    return (
        <Panel phone={phone} width={350}>
            <div className="space-y-3 overflow-y-auto p-3">
                <Calendar />
                <div>
                    <div className="mb-1.5 flex items-center justify-between px-1">
                        <p className="text-[12.5px] font-semibold text-white/70">Notifications</p>
                        {notifications.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    clear();
                                    sacredUi.click();
                                }}
                                className="rounded-md px-1.5 py-0.5 text-[12px] text-white/50 hover:bg-white/10 hover:text-white"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <p className="rounded-2xl bg-white/[0.06] px-3 py-6 text-center text-[12.5px] text-white/45">You’re all caught up.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {notifications.map((n) => {
                                const a = ACCENT_STYLES[(n.accent ?? 'emerald') as OsAccentId];
                                return (
                                    <div key={n.id} className="flex items-start gap-2.5 rounded-2xl bg-white/[0.06] px-3 py-2.5">
                                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${a.bar}`} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[12.5px] font-medium leading-tight text-white">{n.title}</p>
                                            {n.body && <p className="mt-0.5 text-[11.5px] leading-snug text-white/55">{n.body}</p>}
                                        </div>
                                        <span className="shrink-0 text-[11px] text-white/35">{timeAgo(n.at)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Panel>
    );
}

/* ─── Mission Control ────────────────────────────────────── */

export function OsMission({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
    const windows = useTruthOs((s) => s.windows);
    const closeWindow = useTruthOs((s) => s.closeWindow);
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 z-[68] flex items-center justify-center bg-black/55 p-6 backdrop-blur-xl"
            onClick={onClose}
        >
            {windows.length === 0 ? (
                <p className="text-[14px] text-white/60">No windows open.</p>
            ) : (
                <div className="grid w-full max-w-4xl grid-cols-2 gap-5 sm:grid-cols-3">
                    {windows.map((w, i) => (
                        <motion.button
                            key={w.id}
                            type="button"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                sacredUi.click();
                                onPick(w.id);
                            }}
                            className="group relative flex flex-col items-center gap-2.5 text-left"
                        >
                            <span className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-[#14161e] shadow-2xl ring-[var(--os-accent,#34d399)] transition-shadow group-hover:ring-2">
                                <span className="absolute inset-x-0 top-0 flex h-6 items-center gap-1.5 bg-[#1b1e28] px-2">
                                    <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                                    <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                                    <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                                </span>
                                <OsIconTile app={w.app} size={56} />
                                {w.minimized && (
                                    <span className="absolute bottom-2 right-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10.5px] text-white/60">Minimised</span>
                                )}
                            </span>
                            <span className="max-w-full truncate text-[12.5px] font-medium text-white/85">{w.title || APP_META[w.app].label}</span>
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label="Close window"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeWindow(w.id);
                                    sacredUi.click();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.stopPropagation();
                                        closeWindow(w.id);
                                    }
                                }}
                                className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2a2d36] text-white/70 opacity-0 shadow ring-1 ring-white/20 transition-opacity hover:bg-rose-500 hover:text-white group-hover:opacity-100"
                            >
                                <X size={12} />
                            </span>
                        </motion.button>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

/* ─── Desktop menu ───────────────────────────────────────── */

export function OsContextMenu({ onSettings, onShowDesktop }: { onSettings: () => void; onShowDesktop: () => void }) {
    const ctxMenu = useOsSystem((s) => s.ctxMenu);
    const setCtxMenu = useOsSystem((s) => s.setCtxMenu);
    const setWallpaper = useOsSystem((s) => s.setWallpaper);
    const setAccent = useOsSystem((s) => s.setAccent);
    const toggleOverlay = useOsSystem((s) => s.toggleOverlay);
    const wallpaper = useOsSystem((s) => s.wallpaper);
    const snapshot = useOsSystem((s) => s.snapshot);
    if (!ctxMenu) return null;

    const items: ({ label: string; run: () => void } | 'divider')[] = [
        {
            label: 'Next wallpaper',
            run: () => {
                const open = OS_WALLPAPERS.filter((w) => isUnlocked(w, snapshot));
                const i = open.findIndex((w) => w.id === wallpaper);
                const next = open[(i + 1) % open.length];
                setWallpaper(next.id);
                setAccent(next.accent);
            },
        },
        { label: 'Change wallpaper…', run: onSettings },
        'divider',
        { label: 'Show desktop', run: onShowDesktop },
        { label: 'Mission Control', run: () => toggleOverlay('mission') },
        { label: 'App Library', run: () => toggleOverlay('library') },
    ];
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return (
        <div
            className="absolute z-[67] w-56 rounded-xl border border-white/12 bg-[#1d2029]/92 p-1.5 shadow-2xl backdrop-blur-2xl"
            style={{ left: Math.min(ctxMenu.x, vw - 236), top: Math.min(ctxMenu.y, vh - 220) }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((it, i) =>
                it === 'divider' ? (
                    <div key={i} className="mx-2 my-1 h-px bg-white/10" />
                ) : (
                    <button
                        key={it.label}
                        type="button"
                        onClick={() => {
                            setCtxMenu(null);
                            it.run();
                            sacredUi.click();
                        }}
                        className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-white/90 hover:bg-[var(--os-accent,#34d399)] hover:text-black"
                    >
                        {it.label}
                    </button>
                ),
            )}
        </div>
    );
}

/* ─── Lock screen ────────────────────────────────────────── */

export function OsLockScreen({ wallpaperCss, name }: { wallpaperCss: string; name: string | null }) {
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
            className="absolute inset-0 z-[90] cursor-pointer select-none overflow-hidden"
            onClick={() => {
                setLocked(false);
                sacredUi.access();
            }}
        >
            {/* background SHORTHAND (url(...) center/cover) — must go on `background` */}
            <div className="absolute inset-0 scale-105" style={{ background: wallpaperCss }} />
            <div className="absolute inset-0 bg-black/30 backdrop-blur-2xl" />
            <div className="relative flex h-full flex-col items-center px-6 pt-[12vh] text-center">
                <p className="text-[17px] font-medium text-white/90">
                    {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="mt-1 text-[96px] font-extralight leading-none tracking-tight text-white tabular-nums drop-shadow-2xl sm:text-[120px]">
                    {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
                <div className="mb-[10vh] mt-auto flex flex-col items-center gap-2.5">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/10 text-3xl backdrop-blur-md">
                        <span className="bg-gradient-to-br from-amber-100 to-amber-500 bg-clip-text font-black text-transparent">✦</span>
                    </span>
                    <p className="text-[14px] font-medium text-white">{name ?? 'Truth.OS'}</p>
                    <p className="text-[12px] text-white/55">Click or press Enter to unlock</p>
                </div>
            </div>
        </motion.div>
    );
}
