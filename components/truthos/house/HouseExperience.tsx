'use client';

/**
 * First-person multiplayer house.
 * 3D house loads immediately (guest by default). Login is optional for identity / MP name.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
        /* private mode */
    }
    return false;
}

function ensureGuestId(): string {
    try {
        const existing = sessionStorage.getItem('tbth-house-guest-id');
        if (existing) return existing;
        const id = 'guest-' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('tbth-house-guest-id', id);
        return id;
    } catch {
        return 'guest-' + Math.random().toString(36).slice(2, 10);
    }
}

export default function HouseExperience() {
    const router = useRouter();
    const character = useGameStore((s) => s.character);
    const { device } = useClientDevice();
    const { enterOs, closeToRoom } = useTruthOs();

    // Start ready + in-house immediately so the game is never a black auth wall
    const [ready, setReady] = useState(true);
    const [authed, setAuthed] = useState(true);
    const [guest, setGuest] = useState(true);
    const [authOpen, setAuthOpen] = useState(false);
    const [hotspot, setHotspot] = useState<Hotspot | null>(null);
    const [peers, setPeers] = useState<HousePeer[]>([]);
    const [osOpen, setOsOpen] = useState(false);
    const [canvasError, setCanvasError] = useState<string | null>(null);
    const presence = useRef<HousePresenceApi | null>(null);
    const selfId = useRef<string>('');

    usePageMusic('world_cavern');

    useEffect(() => {
        applyMusicSetting(loadSettings().music);

        // Persist guest so reloads stay in the house without a gate
        try {
            if (!localStorage.getItem('tbth-house-guest') && !isGuestSession()) {
                localStorage.setItem('tbth-house-guest', '1');
            }
        } catch {
            /* */
        }
        selfId.current = ensureGuestId();
        setGuest(true);
        setAuthed(true);
        setReady(true);

        let cancelled = false;

        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (cancelled) return;
                if (data.session) {
                    setGuest(false);
                    setAuthed(true);
                    selfId.current = data.session.user.id;
                    try {
                        localStorage.removeItem('tbth-house-guest');
                    } catch {
                        /* */
                    }
                }
            })
            .catch(() => {
                /* stay guest — house still plays */
            });

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (session) {
                setAuthed(true);
                setGuest(false);
                setAuthOpen(false);
                selfId.current = session.user.id;
            } else {
                // Signed out → stay in house as guest
                selfId.current = ensureGuestId();
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

    // Multiplayer presence
    useEffect(() => {
        if (!authed || !selfId.current) return;
        let dead = false;
        const aura = character.appearance?.aura || '#a78bfa';
        joinHousePresence(
            selfId.current,
            {
                name: character.name?.trim() || (guest ? 'Guest' : 'Soul'),
                aura,
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
        };
    }, [authed, guest, character.name, character.appearance?.aura, character.avatar?.skin, character.avatar?.build]);

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
            if (h.action.type === 'route') {
                router.push(h.action.href);
            }
        },
        [enterOs, router],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'KeyE' && hotspot && !osOpen) activateHotspot(hotspot);
            if (e.code === 'Escape' && osOpen) {
                setOsOpen(false);
                closeToRoom();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [hotspot, osOpen, activateHotspot, closeToRoom]);

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
        selfId.current = ensureGuestId();
        setGuest(true);
        setAuthed(true);
        setOsOpen(false);
        closeToRoom();
        setAuthOpen(false);
    };

    return (
        <div
            className="relative w-full overflow-hidden bg-[#1a1528]"
            style={{ height: '100dvh', minHeight: '100vh', width: '100%' }}
        >
            {/* 3D — fixed to viewport so flex parents never collapse the canvas */}
            {ready && authed && (
                <div
                    className="fixed inset-0 z-0"
                    style={{ width: '100vw', height: '100dvh', minHeight: '100vh' }}
                >
                    <ErrorBoundary onError={(m) => setCanvasError(m)}>
                        <HouseCanvas
                            locked={osOpen || authOpen}
                            peers={peers}
                            onHotspot={setHotspot}
                            onPose={onPose}
                        />
                    </ErrorBoundary>
                </div>
            )}

            {canvasError && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6 text-center">
                    <div className="max-w-md space-y-3">
                        <p className="text-red-400 font-mono text-sm">3D failed to start</p>
                        <p className="text-white/50 text-xs break-all">{canvasError}</p>
                        <p className="text-white/40 text-[11px]">
                            Try Chrome/Edge, enable hardware acceleration, or reload.
                        </p>
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

            {/* Optional sign-in (does not block the house) */}
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

            {/* HUD */}
            {ready && authed && !osOpen && !authOpen && (
                <>
                    <div className="fixed top-4 left-4 z-30 pointer-events-none space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-mono drop-shadow">
                            Truth.OS House
                        </p>
                        <p className="text-sm text-white font-medium drop-shadow-md">
                            {character.name?.trim() || (guest ? 'Guest' : 'Soul')}
                            {peers.length > 0 && (
                                <span className="text-emerald-400 text-xs ml-2">
                                    · {peers.length} other{peers.length === 1 ? '' : 's'} here
                                </span>
                            )}
                        </p>
                    </div>

                    {guest && (
                        <button
                            type="button"
                            onClick={() => setAuthOpen(true)}
                            className="fixed top-4 right-4 z-30 px-3 py-1.5 rounded-full border border-white/20 bg-black/60 text-[10px] uppercase tracking-widest text-white/70 hover:text-white hover:border-white/40 backdrop-blur-md"
                        >
                            Sign in
                        </button>
                    )}

                    {/* Center crosshair so empty-looking views still feel interactive */}
                    <div
                        className="fixed left-1/2 top-1/2 z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2 w-3 h-3"
                        aria-hidden
                    >
                        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/40" />
                        <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-white/40" />
                    </div>

                    <div className="fixed bottom-6 inset-x-0 z-30 flex flex-col items-center gap-2 pointer-events-none">
                        {hotspot ? (
                            <button
                                type="button"
                                className="pointer-events-auto px-5 py-2.5 rounded-full border border-amber-400/50 bg-black/80 text-amber-100 text-sm font-semibold backdrop-blur-md shadow-lg"
                                onClick={() => activateHotspot(hotspot)}
                            >
                                E · {hotspot.hint}
                            </button>
                        ) : (
                            <p className="text-[11px] text-white/70 font-mono bg-black/55 px-3 py-1.5 rounded-full border border-white/10">
                                WASD move · drag to look · E interact
                            </p>
                        )}
                    </div>

                    <TruthGuideWidget />
                </>
            )}

            {osOpen && (
                <div
                    className={
                        device === 'mobile'
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
                        mode={device === 'mobile' ? 'phone' : 'desktop'}
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
