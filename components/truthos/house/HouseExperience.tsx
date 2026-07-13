'use client';

/**
 * First-person multiplayer house.
 * Auto-guest · in-house stations · jump · mobile controls · walkthrough.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import { useGameStore } from '@/lib/store/useGameStore';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { joinHousePresence, type HousePeer, type HousePresenceApi } from '@/lib/truthos/housePresence';
import type { Hotspot } from './houseMap';
import TruthGuideWidget from './TruthGuideWidget';
import TruthOSShell from '../TruthOSShell';
import { useTruthOs } from '../truthOsStore';
import { useClientDevice } from '../engine/useClientDevice';
import {
    useHouseUi,
    type HousePanelId,
} from './houseUiStore';
import HouseWalkthrough from './HouseWalkthrough';
import HousePanels from './HousePanels';
import HouseMobileControls from './HouseMobileControls';
import HouseHints from './HouseHints';

const HouseCanvas = dynamic(() => import('./HouseCanvas'), {
    ssr: false,
    loading: () => (
        <div
            className="fixed inset-0 z-0 flex items-center justify-center bg-[#1a1528] font-mono text-emerald-300 text-sm"
            style={{ width: '100vw', height: '100dvh' }}
        >
            loading 3D house…
        </div>
    ),
});

function isGuestSession(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        if (localStorage.getItem('tbth-demo') === 'true') return true;
        if (document.cookie.includes('sb-access-token=demo-token')) return true;
        if (localStorage.getItem('tbth-house-guest') === '1') return true;
    } catch {
        /* */
    }
    return false;
}

function ensureGuestId(): string {
    // Stable across reloads so presence doesn't spawn ghost keys every visit
    try {
        const existing = localStorage.getItem('tbth-house-guest-id');
        if (existing) return existing;
        const id = 'guest-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('tbth-house-guest-id', id);
        return id;
    } catch {
        try {
            const s = sessionStorage.getItem('tbth-house-guest-id');
            if (s) return s;
            const id = 'guest-' + Math.random().toString(36).slice(2, 10);
            sessionStorage.setItem('tbth-house-guest-id', id);
            return id;
        } catch {
            return 'guest-' + Math.random().toString(36).slice(2, 10);
        }
    }
}

export default function HouseExperience() {
    const character = useGameStore((s) => s.character);
    const { device } = useClientDevice();
    const { enterOs, closeToRoom } = useTruthOs();
    const openPanel = useHouseUi((s) => s.openPanel);
    const panel = useHouseUi((s) => s.panel);
    const setWalkthrough = useHouseUi((s) => s.setWalkthrough);
    const walkthroughOpen = useHouseUi((s) => s.walkthroughOpen);

    const [ready, setReady] = useState(true);
    const [authed, setAuthed] = useState(true);
    const [guest, setGuest] = useState(true);
    const [authOpen, setAuthOpen] = useState(false);
    const [hotspot, setHotspot] = useState<Hotspot | null>(null);
    const [peers, setPeers] = useState<HousePeer[]>([]);
    const [osOpen, setOsOpen] = useState(false);
    const [canvasError, setCanvasError] = useState<string | null>(null);
    const [activity, setActivity] = useState<'move' | 'look' | 'jump' | 'idle' | null>(null);
    const presence = useRef<HousePresenceApi | null>(null);
    const selfId = useRef<string>('');
    const [presenceKey, setPresenceKey] = useState('');
    const hotspotRef = useRef<Hotspot | null>(null);

    const isMobile = device === 'mobile';
    const uiLocked = osOpen || authOpen || !!panel || walkthroughOpen;

    usePageMusic('world_cavern');

    useEffect(() => {
        hotspotRef.current = hotspot;
    }, [hotspot]);

    useEffect(() => {
        applyMusicSetting(loadSettings().music);
        try {
            if (!localStorage.getItem('tbth-house-guest') && !isGuestSession()) {
                localStorage.setItem('tbth-house-guest', '1');
            }
        } catch {
            /* */
        }
        const gid = ensureGuestId();
        selfId.current = gid;
        setPresenceKey(gid);
        setGuest(true);
        setAuthed(true);
        setReady(true);

        // Deep-link from /world or other redirects
        try {
            const pending = sessionStorage.getItem('tbth-open-panel');
            if (pending) {
                sessionStorage.removeItem('tbth-open-panel');
                openPanel(pending as HousePanelId);
            }
        } catch {
            /* */
        }
        // No auto walkthrough — progressive hints guide players in-world
    }, [openPanel]);

    useEffect(() => {
        let cancelled = false;
        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (cancelled) return;
                if (data.session) {
                    setGuest(false);
                    setAuthed(true);
                    selfId.current = data.session.user.id;
                    setPresenceKey(data.session.user.id);
                    try {
                        localStorage.removeItem('tbth-house-guest');
                    } catch {
                        /* */
                    }
                }
            })
            .catch(() => {
                /* stay guest */
            });

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (session) {
                setAuthed(true);
                setGuest(false);
                setAuthOpen(false);
                selfId.current = session.user.id;
                setPresenceKey(session.user.id);
            } else {
                const gid = ensureGuestId();
                selfId.current = gid;
                setPresenceKey(gid);
                setGuest(true);
                setAuthed(true);
                try {
                    localStorage.setItem('tbth-house-guest', '1');
                } catch {
                    /* */
                }
            }
        });

        return () => {
            cancelled = true;
            sub.subscription.unsubscribe();
        };
    }, []);

    // Join once per presence identity — not on every avatar field tick (that spawned ghosts)
    useEffect(() => {
        if (!authed || !presenceKey) return;
        let dead = false;
        joinHousePresence(
            presenceKey,
            {
                name: character.name?.trim() || (guest ? 'Guest' : 'Soul'),
                aura: character.appearance?.aura || '#a78bfa',
                skin: character.avatar?.skin ?? 6,
                build: character.avatar?.build === 'fem' ? 'fem' : 'masc',
                x: 0,
                y: 0,
                z: 5.5,
                yaw: Math.PI,
            },
            (list) => {
                if (!dead) setPeers(list);
            },
        ).then((api) => {
            if (dead) {
                void api?.leave();
                return;
            }
            presence.current = api;
        });
        return () => {
            dead = true;
            void presence.current?.leave();
            presence.current = null;
            setPeers([]);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authed, presenceKey]);

    const onPose = useCallback(
        (p: { x: number; y: number; z: number; yaw: number }) => {
            presence.current?.track({
                name: character.name?.trim() || (guest ? 'Guest' : 'Soul'),
                aura: character.appearance?.aura || '#a78bfa',
                skin: character.avatar?.skin ?? 6,
                build: character.avatar?.build === 'fem' ? 'fem' : 'masc',
                ...p,
            });
        },
        [character, guest],
    );

    const activateHotspot = useCallback(
        (h: Hotspot) => {
            sacredUi.click();
            if (h.action.type === 'os') {
                setOsOpen(true);
                enterOs();
                return;
            }
            if (h.action.type === 'panel') {
                openPanel(h.action.panel as HousePanelId);
            }
        },
        [enterOs, openPanel],
    );

    const tryInteract = useCallback(() => {
        const h = hotspotRef.current;
        if (h && !uiLocked) activateHotspot(h);
    }, [activateHotspot, uiLocked]);

    const onMoveActivity = useCallback((kind: 'move' | 'look' | 'jump' | 'idle') => {
        setActivity(kind);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'KeyE' && hotspot && !uiLocked) activateHotspot(hotspot);
            if (e.code === 'Escape') {
                if (osOpen) {
                    setOsOpen(false);
                    closeToRoom();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [hotspot, uiLocked, osOpen, activateHotspot, closeToRoom]);

    const onAuthSuccess = () => {
        try {
            localStorage.removeItem('tbth-house-guest');
        } catch {
            /* */
        }
        setGuest(false);
        setAuthed(true);
        setAuthOpen(false);
        sacredUi.access();
    };

    const onLogout = async () => {
        await presence.current?.leave();
        try {
            localStorage.setItem('tbth-house-guest', '1');
            localStorage.removeItem('tbth-demo');
        } catch {
            /* */
        }
        try {
            await supabase.auth.signOut();
        } catch {
            /* */
        }
        const gid = ensureGuestId();
        selfId.current = gid;
        setPresenceKey(gid);
        setGuest(true);
        setAuthed(true);
        setOsOpen(false);
        closeToRoom();
        setAuthOpen(false);
    };

    const showHud = ready && authed && !osOpen && !authOpen && !panel && !walkthroughOpen;

    return (
        <div
            className="relative w-full overflow-hidden bg-[#1a1528]"
            style={{ height: '100dvh', minHeight: '100vh', width: '100%' }}
        >
            {ready && authed && (
                <div
                    className="fixed inset-0 z-0"
                    style={{ width: '100vw', height: '100dvh', minHeight: '100vh' }}
                >
                    <ErrorBoundary onError={(m) => setCanvasError(m)}>
                        <HouseCanvas
                            locked={uiLocked}
                            mobile={isMobile}
                            peers={peers}
                            onHotspot={setHotspot}
                            onPose={onPose}
                            onInteractRequest={tryInteract}
                            onMoveActivity={onMoveActivity}
                        />
                    </ErrorBoundary>
                </div>
            )}

            {canvasError && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6 text-center">
                    <div className="max-w-md space-y-3">
                        <p className="text-red-400 font-mono text-sm">3D failed to start</p>
                        <p className="text-white/50 text-xs break-all">{canvasError}</p>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg border border-white/20 text-white text-sm"
                            onClick={() => window.location.reload()}
                        >
                            Reload
                        </button>
                    </div>
                </div>
            )}

            {authOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
                    <div className="w-full max-w-md space-y-3">
                        <AuthModal
                            isOpen
                            isGated={false}
                            onClose={() => setAuthOpen(false)}
                            onSuccess={onAuthSuccess}
                        />
                        <button
                            type="button"
                            onClick={() => setAuthOpen(false)}
                            className="w-full py-2 text-xs text-zinc-400 hover:text-white uppercase tracking-widest"
                        >
                            Keep playing as guest
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop + shared HUD */}
            {showHud && (
                <>
                    <div
                        className={[
                            'fixed z-[45] pointer-events-none space-y-1',
                            isMobile ? 'top-3 left-3' : 'top-4 left-4',
                        ].join(' ')}
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-mono drop-shadow">
                            Truth.OS House
                        </p>
                        <p className="text-sm text-white font-medium drop-shadow-md">
                            {character.name?.trim() || (guest ? 'Guest' : 'Soul')}
                            {peers.length > 0 && (
                                <span className="text-emerald-400 text-xs ml-2">
                                    · {peers.length} other{peers.length === 1 ? '' : 's'}
                                </span>
                            )}
                        </p>
                    </div>

                    <div
                        className={[
                            'fixed z-[45] flex items-center gap-2 pointer-events-auto',
                            isMobile ? 'top-3 right-3' : 'top-4 right-4',
                        ].join(' ')}
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                sacredUi.click();
                                setWalkthrough(true, 0);
                            }}
                            className="w-9 h-9 rounded-full border border-white/20 bg-black/55 text-white/80 text-sm font-semibold backdrop-blur-md hover:border-emerald-400/40"
                            aria-label="House tour"
                            title="House tour"
                        >
                            ?
                        </button>
                        {guest && (
                            <button
                                type="button"
                                onClick={() => setAuthOpen(true)}
                                className="px-3 py-1.5 rounded-full border border-white/20 bg-black/60 text-[10px] uppercase tracking-widest text-white/70 hover:text-white backdrop-blur-md"
                            >
                                Sign in
                            </button>
                        )}
                    </div>

                    {/* Crosshair — desktop only (mobile uses thumb UI) */}
                    {!isMobile && (
                        <div
                            className="fixed left-1/2 top-1/2 z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2 w-3 h-3"
                            aria-hidden
                        >
                            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/40" />
                            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-white/40" />
                        </div>
                    )}

                    {/* Desktop interact — only when near something (no permanent cheat sheet) */}
                    {!isMobile && hotspot && (
                        <div className="fixed bottom-8 inset-x-0 z-30 flex justify-center pointer-events-none">
                            <button
                                type="button"
                                className="pointer-events-auto px-5 py-2.5 rounded-full border border-amber-400/50 bg-black/80 text-amber-100 text-sm font-semibold backdrop-blur-md shadow-lg"
                                onClick={() => activateHotspot(hotspot)}
                            >
                                E · {hotspot.hint}
                            </button>
                        </div>
                    )}

                    {/* Desktop only guide widget — mobile keeps chrome clean */}
                    {!isMobile && <TruthGuideWidget placement="desktop" />}
                </>
            )}

            <HouseHints
                visible={showHud}
                isMobile={isMobile}
                hotspot={hotspot}
                activity={activity}
            />

            <HouseMobileControls
                hotspot={hotspot}
                onInteract={tryInteract}
                visible={showHud && isMobile}
            />

            {/* Optional full tour — never auto-opens */}
            <HouseWalkthrough />
            <HousePanels />

            {osOpen && (
                <div
                    className={
                        isMobile
                            ? 'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw-12px,400px)] h-[min(100dvh-16px,800px)] rounded-[1.75rem] overflow-hidden border-[3px] border-zinc-800'
                            : 'fixed z-50 inset-[2%] rounded-xl overflow-hidden border border-zinc-700 shadow-2xl bg-black'
                    }
                >
                    <button
                        type="button"
                        className="absolute top-2 right-2 z-[60] text-[10px] uppercase tracking-widest text-white/50 hover:text-white bg-black/50 px-2 py-1 rounded"
                        onClick={() => {
                            setOsOpen(false);
                            closeToRoom();
                        }}
                    >
                        Exit OS · house
                    </button>
                    <TruthOSShell
                        mode={isMobile ? 'phone' : 'desktop'}
                        onLogout={onLogout}
                    />
                </div>
            )}
        </div>
    );
}

class ErrorBoundary extends React.Component<
    { children: React.ReactNode; onError: (m: string) => void },
    { err: string | null }
> {
    state = { err: null as string | null };
    static getDerivedStateFromError(e: Error) {
        return { err: e?.message || 'Unknown WebGL error' };
    }
    componentDidCatch(e: Error) {
        this.props.onError(e?.message || 'Unknown WebGL error');
    }
    render() {
        if (this.state.err) return null;
        return this.props.children;
    }
}
