'use client';

/**
 * Truth.OS 4 — the shell.
 *
 * One way to do each thing:
 *   top bar      — system menu, the focused app, Spotlight, Control Center, Today
 *   dock         — App Library, pinned + running apps, the door to the world
 *   App Library  — every program and page, grouped (Ctrl+E)
 *   Spotlight    — search, sums, ask Truth (Ctrl+K)
 *   widgets      — the live home surface on the wallpaper
 * Phones get a home screen (widgets + every app) and full-screen apps.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { speak as truthSpeak } from '@/lib/truthVoice';
import { useWorldTime, phaseOf } from './house/worldTime';
import { useTruthOs, detectDevice, type OsAppId, type OsAppPayload } from './truthOsStore';
import { renderOsApp } from './apps/OsApps';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/adminEmails';
import { hubAudio } from '@/lib/truthos/hubAudio';
import AuthModal from '@/components/AuthModal';
import OsAmbient from './OsAmbient';
import OsWindowFrame from './OsWindowFrame';
import OsDock from './OsDock';
import OsTopBar, { type SystemAction, type WindowAction } from './OsTopBar';
import OsWidgets from './OsWidgets';
import { AppLibrary, PhoneHome } from './OsLibrary';
import { ACCENT_HEX, useOsSystem } from './osSystemStore';
import { resolveWallpaper } from './osWallpapers';
import { useOsGameBridge } from './useOsGameBridge';
import { OsContextMenu, OsControlCenter, OsLockScreen, OsMission, OsToasts, OsToday } from './OsSystemUI';
import OsCommandPalette from './OsCommandPalette';
import { OsShortcutsSheet, OsWindowSwitcher } from './OsSwitcher';
import type { Service } from '@/lib/truthos/services';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { holdInbox, syncTitle, useInbox } from '@/lib/archive/inbox';

const BOOT_STEPS = 8;

export default function TruthOSShell({
    onLogout,
    onEnterChamber,
}: {
    onLogout: () => void;
    onEnterChamber?: () => void;
}) {
    const windows = useTruthOs((s) => s.windows);
    const focusId = useTruthOs((s) => s.focusId);
    const bootDone = useTruthOs((s) => s.bootDone);
    const sessionEmail = useTruthOs((s) => s.sessionEmail);
    const authPrompt = useTruthOs((s) => s.authPrompt);
    const pendingApp = useTruthOs((s) => s.pendingApp);
    const pinned = useTruthOs((s) => s.pinned);
    const os = useTruthOs.getState;

    const flyout = useOsSystem((s) => s.flyout);
    const overlay = useOsSystem((s) => s.overlay);
    const locked = useOsSystem((s) => s.locked);
    const ctxMenu = useOsSystem((s) => s.ctxMenu);
    const wallpaperId = useOsSystem((s) => s.wallpaper);
    const brightness = useOsSystem((s) => s.brightness);
    const nightLight = useOsSystem((s) => s.nightLight);
    const notifications = useOsSystem((s) => s.notifications);
    const snapshot = useOsSystem((s) => s.snapshot);
    const accent = useOsSystem((s) => s.accent);
    const sys = useOsSystem.getState;

    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);

    const [hour, setHour] = useState(() => new Date().getHours());
    const [bootStep, setBootStep] = useState(0);
    const [bootKey, setBootKey] = useState(0);
    const [phone, setPhone] = useState(() => detectDevice() === 'phone');
    const [switcher, setSwitcher] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
    const switcherRef = useRef(switcher);
    switcherRef.current = switcher;
    const welcomed = useRef(-1);
    const restored = useRef(false);

    const email = sessionEmail;
    const isAdmin = isAdminEmail(email);
    const wallpaper = resolveWallpaper(wallpaperId, hour);
    const unread = notifications.filter((n) => !n.read).length;
    const visible = windows.filter((w) => !w.minimized);
    const focused = windows.find((w) => w.id === focusId && !w.minimized) ?? null;
    const onHouse = onEnterChamber
        ? () => {
              sys().setFlyout(null);
              sys().setOverlay(null);
              onEnterChamber();
          }
        : undefined;

    // Phone layout follows resize / rotate / a tab restored in the background
    useEffect(() => {
        const sync = () => setPhone(detectDevice() === 'phone');
        sync();
        window.addEventListener('resize', sync);
        window.addEventListener('orientationchange', sync);
        document.addEventListener('visibilitychange', sync);
        return () => {
            window.removeEventListener('resize', sync);
            window.removeEventListener('orientationchange', sync);
            document.removeEventListener('visibilitychange', sync);
        };
    }, []);

    // Boot: the mark and one thin bar. Reduced motion skips straight in.
    useEffect(() => {
        os().enterOs();
        setBootStep(0);
        hubAudio.osBootStart();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setBootStep(BOOT_STEPS);
            os().setBootDone(true);
            hubAudio.osBootReady();
            return;
        }
        let i = 0;
        const t = setInterval(() => {
            i += 1;
            setBootStep(i);
            if (i >= BOOT_STEPS) {
                clearInterval(t);
                setTimeout(() => {
                    os().setBootDone(true);
                    hubAudio.osBootReady();
                    sacredUi.access();
                }, 140);
            }
        }, 95);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bootKey]);

    // Welcome once per boot; Truth says it once per session (truthVoice remembers)
    useEffect(() => {
        if (bootDone && welcomed.current !== bootKey) {
            welcomed.current = bootKey;
            sys().notify({
                title: 'Welcome to Truth.OS',
                body:
                    detectDevice() === 'phone'
                        ? 'Every app is on your home screen. The search button finds anything.'
                        : 'Ctrl K searches everything. Every app is in the App Library.',
                accent: 'emerald',
            });
            void truthSpeak('os_boot');
        }
    }, [bootDone, bootKey, sys]);

    // Truth marks night and dawn — on the change, never just because it's 2am
    const lastPhase = useRef<string | null>(null);
    const worldHour = useWorldTime((s) => s.hour);
    useEffect(() => {
        if (!bootDone) return;
        const phase = phaseOf(worldHour);
        const prev = lastPhase.current;
        lastPhase.current = phase;
        if (prev === null || prev === phase) return;
        if (phase === 'night') void truthSpeak('os_night');
        if (phase === 'dawn') void truthSpeak('os_dawn');
    }, [worldHour, bootDone]);

    useEffect(() => {
        const t = setInterval(() => setHour(new Date().getHours()), 60000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => os().setSessionEmail(data.session?.user?.email ?? null));
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            os().setSessionEmail(session?.user?.email ?? null);
        });
        return () => sub.subscription.unsubscribe();
    }, [os]);

    useOsGameBridge(bootDone);

    // Whispers reach the desktop: a toast unless the Hall is already in front,
    // the dock badge and the tab title follow the unread count
    useEffect(() => {
        const release = holdInbox((w) => {
            const st = useTruthOs.getState();
            const front = st.windows.find((x) => x.id === st.focusId && !x.minimized);
            if (front?.app === 'archive') return;
            useOsSystem.getState().notify({ title: `Whisper from ${w.from}`, body: w.text, accent: 'violet' });
        });
        const unsub = useInbox.subscribe((s) => syncTitle(s.dmUnread));
        syncTitle(useInbox.getState().dmUnread);
        return () => {
            release();
            unsub();
            syncTitle(0);
        };
    }, []);

    // While the OS is up, page-level chrome that duplicates it (the floating
    // sound button) stands down — see globals.css [data-os]
    useEffect(() => {
        // Dev only: lets a headless check drive the window manager
        if (process.env.NODE_ENV !== 'production') {
            (window as unknown as { __os?: unknown }).__os = { os: useTruthOs, sys: useOsSystem };
        }
        document.documentElement.dataset.os = '1';
        return () => {
            document.documentElement.dataset.os = '';
        };
    }, []);

    useEffect(() => {
        if (bootDone && !restored.current) {
            restored.current = true;
            os().restoreSession();
        }
    }, [bootDone, os]);

    // Save geometry on the way out. Never from an effect cleanup: StrictMode's
    // double mount would overwrite the stored session with an empty desktop.
    useEffect(() => {
        const save = () => {
            if (restored.current) os().saveSession();
        };
        const onHide = () => {
            if (document.visibilityState === 'hidden') save();
        };
        window.addEventListener('beforeunload', save);
        document.addEventListener('visibilitychange', onHide);
        return () => {
            window.removeEventListener('beforeunload', save);
            document.removeEventListener('visibilitychange', onHide);
        };
    }, [os]);

    const launch = useCallback((app: OsAppId, payload?: OsAppPayload) => {
        sys().setFlyout(null);
        sys().setOverlay(null);
        os().openApp(app, payload ? { payload } : undefined);
        hubAudio.osWindowOpen();
        sacredUi.click();
    }, [os, sys]);

    const launchService = useCallback(
        (s: Service) => {
            if (s.launch.kind === 'app') launch(s.launch.app);
            else launch('browser', { content: s.launch.path, name: s.launch.name });
        },
        [launch],
    );

    const restartOs = () => {
        os().clearDesktop();
        sys().setFlyout(null);
        sys().setOverlay(null);
        os().setBootDone(false);
        setBootKey((k) => k + 1);
        sacredUi.access();
    };

    const showDesktop = () => {
        os().minimizeAll();
        sacredUi.click();
    };

    const onSystem = (a: SystemAction) => {
        sacredUi.click();
        if (a === 'about') launch('settings', { section: 'about' });
        else if (a === 'settings') launch('settings');
        else if (a === 'library') sys().toggleOverlay('library');
        else if (a === 'mission') sys().toggleOverlay('mission');
        else if (a === 'shortcuts') sys().toggleOverlay('shortcuts');
        else if (a === 'lock') sys().setLocked(true);
        else if (a === 'restart') restartOs();
        else if (a === 'house') onHouse?.();
    };

    const onWindow = (a: WindowAction) => {
        sacredUi.click();
        if (a === 'showdesktop') return showDesktop();
        if (a === 'mission') return sys().toggleOverlay('mission');
        if (!focused) return;
        if (a === 'minimize') os().minimizeWindow(focused.id);
        else if (a === 'zoom') os().toggleMaximize(focused.id);
        else if (a === 'close') {
            os().closeWindow(focused.id);
            hubAudio.osWindowClose();
        }
    };

    // Keyboard
    useEffect(() => {
        const typing = (t: EventTarget | null) => {
            const el = t as HTMLElement | null;
            if (!el?.tagName) return false;
            const tag = el.tagName.toLowerCase();
            return tag === 'input' || tag === 'textarea' || el.isContentEditable;
        };
        const snap = (dir: 'left' | 'right') => {
            if (!focused) return;
            const host = document.querySelector<HTMLElement>('[data-os-workspace]');
            const ww = host?.clientWidth ?? window.innerWidth;
            const hh = host?.clientHeight ?? window.innerHeight - 120;
            const g = 6;
            const hw = Math.floor((ww - g * 3) / 2);
            os().setRect(focused.id, { x: dir === 'left' ? g : g * 2 + hw, y: g, w: hw, h: hh - g * 2 });
        };
        const onKey = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            const key = e.key;
            const s = sys();
            if (key === 'Escape') {
                if (s.overlay) s.setOverlay(null);
                else if (s.ctxMenu) s.setCtxMenu(null);
                else if (s.flyout) s.setFlyout(null);
                else if (os().authPrompt) os().setAuthPrompt(false);
                return;
            }
            if (s.overlay === 'spotlight') return; // Spotlight owns its keys
            if (typing(e.target) && !(mod && key.toLowerCase() === 'k')) return;
            if (!mod) return;
            const k = key.toLowerCase();
            if (k === 'k') {
                e.preventDefault();
                s.toggleOverlay('spotlight');
            } else if (k === 'e') {
                e.preventDefault();
                s.toggleOverlay('library');
            } else if (key === '/') {
                e.preventDefault();
                s.toggleOverlay('shortcuts');
            } else if (key === ',') {
                e.preventDefault();
                launch('settings');
            } else if (k === 'l' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                s.setLocked(true);
            } else if (k === 'd' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                showDesktop();
            } else if (key === 'ArrowUp' && !e.shiftKey) {
                e.preventDefault();
                s.toggleOverlay('mission');
            } else if (key === '`' || key === '~') {
                // Ctrl+Tab is the browser's; Ctrl+` cycles windows while Ctrl is held
                e.preventDefault();
                const list = os().mruWindows();
                if (list.length < 2) return;
                setSwitcher((sw) => {
                    if (!sw.open) return { open: true, index: e.shiftKey ? list.length - 1 : 1 };
                    const step = e.shiftKey ? -1 : 1;
                    return { open: true, index: (sw.index + step + list.length) % list.length };
                });
            } else if (e.shiftKey && focused) {
                if (key === 'ArrowLeft') {
                    e.preventDefault();
                    snap('left');
                } else if (key === 'ArrowRight') {
                    e.preventDefault();
                    snap('right');
                } else if (key === 'ArrowUp') {
                    e.preventDefault();
                    os().toggleMaximize(focused.id);
                } else if (key === 'ArrowDown') {
                    e.preventDefault();
                    os().minimizeWindow(focused.id);
                }
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key !== 'Control' && e.key !== 'Meta') return;
            const sw = switcherRef.current;
            if (!sw.open) return;
            const pick = os().mruWindows()[sw.index];
            setSwitcher({ open: false, index: 0 });
            if (pick) {
                os().focusWindow(pick.id);
                sacredUi.click();
            }
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKeyUp);
        };
    });

    if (!bootDone) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
                <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12 select-none bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-7xl font-black text-transparent drop-shadow-[0_0_40px_rgba(251,191,36,0.25)]"
                >
                    ✦
                </motion.span>
                <div className="h-[5px] w-40 overflow-hidden rounded-full bg-white/15">
                    <div
                        className="h-full rounded-full bg-white transition-all duration-150 ease-out"
                        style={{ width: `${Math.min(100, (bootStep / BOOT_STEPS) * 100)}%` }}
                    />
                </div>
            </div>
        );
    }

    const displayName = character?.name?.trim() || profile?.display_name || null;
    const widgets = (
        <OsWidgets
            email={email}
            phone={phone}
            onLaunch={launch}
            onHouse={onHouse}
            onSignIn={() => {
                os().setAuthPrompt(true);
                sacredUi.click();
            }}
        />
    );

    return (
        <div
            data-os-shell
            className="fixed inset-0 z-40 select-none overflow-clip bg-[#07090f] antialiased"
            style={
                {
                    ['--os-menubar' as string]: phone
                        ? 'calc(2.4rem + env(safe-area-inset-top, 0px))'
                        : 'calc(2rem + env(safe-area-inset-top, 0px))',
                    ['--os-taskbar' as string]: phone
                        ? 'calc(6rem + env(safe-area-inset-bottom, 0px))'
                        : 'calc(5.4rem + env(safe-area-inset-bottom, 0px))',
                    ['--os-accent' as string]: ACCENT_HEX[accent] ?? ACCENT_HEX.emerald,
                } as CSSProperties
            }
        >
            {/* Wallpaper — desktop wallpapers breathe; phones stay still (battery) */}
            <div
                className={`pointer-events-none absolute inset-0 ${phone ? '' : wallpaper.kind === 'image' ? 'os-wall-image' : 'os-wall-gradient'}`}
                style={{ background: wallpaper.css }}
            />
            <OsAmbient accent={accent} phone={phone} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/35" />

            {/* Workspace */}
            <div
                data-os-workspace
                className="absolute inset-x-0"
                style={{ top: 'var(--os-menubar)', bottom: phone ? 0 : 'var(--os-taskbar)' }}
                onClick={() => {
                    const s = sys();
                    if (s.flyout) s.setFlyout(null);
                    if (s.ctxMenu) s.setCtxMenu(null);
                }}
                onContextMenu={(e) => {
                    if (phone || (e.target as HTMLElement).closest('[data-os-window]')) return;
                    e.preventDefault();
                    sys().setCtxMenu({ x: e.clientX, y: e.clientY });
                }}
            />

            {/* Home: widgets on the wallpaper (desktop), home screen (phone) */}
            {phone ? (
                <PhoneHome admin={isAdmin} widgets={widgets} onPick={launchService} />
            ) : (
                <div className="absolute left-5 z-[2]" style={{ top: 'calc(var(--os-menubar) + 18px)' }}>
                    {widgets}
                </div>
            )}

            {/* Windows */}
            <div
                className={`pointer-events-none absolute inset-x-0 [&>*]:pointer-events-auto ${phone ? 'z-[60]' : 'z-[5]'}`}
                style={phone ? { top: 0, bottom: 0 } : { top: 'var(--os-menubar)', bottom: 'var(--os-taskbar)' }}
            >
                <AnimatePresence>
                    {visible.map((w) => (
                        <OsWindowFrame
                            key={w.id}
                            title={w.title}
                            app={w.app}
                            x={w.x}
                            y={w.y}
                            w={w.w}
                            h={w.h}
                            z={w.z}
                            maximized={!!w.maximized}
                            focused={focusId === w.id}
                            phone={phone}
                            onFocus={() => {
                                if (focusId !== w.id) os().focusWindow(w.id);
                            }}
                            onClose={() => {
                                os().closeWindow(w.id);
                                hubAudio.osWindowClose();
                            }}
                            onMinimize={() => os().minimizeWindow(w.id)}
                            onMaximize={() => os().toggleMaximize(w.id)}
                            onMove={(x, y) => os().moveWindow(w.id, x, y)}
                            onRect={(r) => os().setRect(w.id, r)}
                        >
                            <div key={`${w.id}:${w.payload?.section ?? ''}`} className="h-full">
                                {renderOsApp(w.app, {
                                    onLogout,
                                    onExit: () => os().closeWindow(w.id),
                                    payload: w.payload,
                                })}
                            </div>
                        </OsWindowFrame>
                    ))}
                </AnimatePresence>
            </div>

            <OsTopBar
                phone={phone}
                focusApp={focused?.app ?? null}
                unread={unread}
                soulPower={email ? snapshot.soulPower : 0}
                flyout={flyout}
                canHouse={!!onHouse}
                onSystem={onSystem}
                onWindow={onWindow}
                onSearch={() => sys().toggleOverlay('spotlight')}
                onControl={() => sys().toggleFlyout('control')}
                onToday={() => sys().toggleFlyout('today')}
                onSoul={() => launch('soul')}
            />

            <OsDock
                pinned={pinned}
                windows={windows}
                focusApp={focused?.app ?? null}
                phone={phone}
                onLaunch={(app) => launch(app)}
                onFocusApp={(app) => {
                    const wins = windows.filter((w) => w.app === app);
                    const top = [...wins].sort((a, b) => b.z - a.z)[0];
                    if (!top) return;
                    // Clicking the frontmost app's icon tucks it away, like a dock should
                    if (top.id === focusId && !top.minimized && !phone) os().minimizeWindow(top.id);
                    else os().focusWindow(top.id);
                    sacredUi.click();
                }}
                onNewWindow={(app) => {
                    os().openApp(app, { newInstance: true });
                    hubAudio.osWindowOpen();
                }}
                onQuitApp={(app) => {
                    windows.filter((w) => w.app === app).forEach((w) => os().closeWindow(w.id));
                    hubAudio.osWindowClose();
                }}
                onTogglePin={(app) => {
                    os().togglePin(app);
                    sacredUi.click();
                }}
                onLibrary={() => {
                    sys().toggleOverlay('library');
                    hubAudio.osStartMenu();
                }}
                onHouse={onHouse}
            />

            {/* Top-bar panels */}
            <AnimatePresence>
                {flyout === 'control' && <OsControlCenter key="control" phone={phone} />}
                {flyout === 'today' && <OsToday key="today" phone={phone} />}
            </AnimatePresence>

            <OsContextMenu onSettings={() => launch('settings', { section: 'appearance' })} onShowDesktop={showDesktop} />

            {/* Full-screen overlays */}
            <AnimatePresence>
                {overlay === 'library' && !phone && (
                    <AppLibrary key="library" admin={isAdmin} onPick={launchService} onClose={() => sys().setOverlay(null)} />
                )}
                {overlay === 'mission' && (
                    <OsMission
                        key="mission"
                        onClose={() => sys().setOverlay(null)}
                        onPick={(id) => {
                            sys().setOverlay(null);
                            os().focusWindow(id);
                        }}
                    />
                )}
                {overlay === 'spotlight' && (
                    <OsCommandPalette
                        key="spotlight"
                        phone={phone}
                        onClose={() => sys().setOverlay(null)}
                        onHouse={onHouse}
                        onLogout={onLogout}
                        onRestart={restartOs}
                    />
                )}
                {overlay === 'shortcuts' && <OsShortcutsSheet key="keys" onClose={() => sys().setOverlay(null)} />}
                {switcher.open && <OsWindowSwitcher key="switch" windows={os().mruWindows()} index={switcher.index} />}
            </AnimatePresence>

            <OsToasts />

            {/* Screen filters */}
            {brightness < 1 && (
                <div className="pointer-events-none absolute inset-0 z-[85] bg-black" style={{ opacity: (1 - brightness) * 0.85 }} />
            )}
            {nightLight && <div className="pointer-events-none absolute inset-0 z-[85]" style={{ background: 'rgba(255,147,41,0.10)' }} />}

            <AnimatePresence>
                {locked && <OsLockScreen wallpaperCss={wallpaper.css} name={displayName} />}
            </AnimatePresence>

            <AuthModal
                isOpen={authPrompt}
                onClose={() => os().setAuthPrompt(false)}
                onSuccess={() => {
                    os().setAuthPrompt(false);
                    supabase.auth.getUser().then(({ data }) => {
                        os().setSessionEmail(data.user?.email ?? null);
                        if (pendingApp) os().openApp(pendingApp);
                    });
                }}
            />
        </div>
    );
}
