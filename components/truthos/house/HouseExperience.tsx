'use client';

/**
 * First-person multiplayer house.
 * Login OR guest → walk house → E on hotspots → Hub sections / OS.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a12] font-mono text-emerald-400/70 text-sm">
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
    } catch { /* */ }
    return false;
}

export default function HouseExperience() {
    const router = useRouter();
    const character = useGameStore((s) => s.character);
    const { device } = useClientDevice();
    const { enterOs, closeToRoom } = useTruthOs();

    const [ready, setReady] = useState(false);
    const [authed, setAuthed] = useState(false);
    const [guest, setGuest] = useState(false);
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

        const guestOk = isGuestSession();
        if (guestOk) {
            setGuest(true);
            setAuthed(true);
            selfId.current = 'guest-' + Math.random().toString(36).slice(2, 9);
            setReady(true);
            return;
        }

        let cancelled = false;
        const timeout = window.setTimeout(() => {
            // Don't leave user on black screen if auth hangs
            if (!cancelled) setReady(true);
        }, 2500);

        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (cancelled) return;
                if (data.session) {
                    setAuthed(true);
                    selfId.current = data.session.user.id;
                } else {
                    setAuthOpen(true);
                }
                setReady(true);
            })
            .catch(() => {
                if (!cancelled) {
                    setAuthOpen(true);
                    setReady(true);
                }
            });

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (session) {
                setAuthed(true);
                setGuest(false);
                setAuthOpen(false);
                selfId.current = session.user.id;
            } else if (!isGuestSession()) {
                setAuthed(false);
            }
        });

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
            sub.subscription.unsubscribe();
        };
    }, []);

    // Multiplayer (skip pure guest if channel rejects anon — still try with guest id)
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

    const enterGuest = () => {
        localStorage.setItem('tbth-house-guest', '1');
        selfId.current = 'guest-' + Math.random().toString(36).slice(2, 9);
        setGuest(true);
        setAuthed(true);
        setAuthOpen(false);
        sacredUi.access();
    };

    const onAuthSuccess = () => {
        localStorage.removeItem('tbth-house-guest');
        setGuest(false);
        setAuthed(true);
        setAuthOpen(false);
        sacredUi.access();
    };

    const onLogout = async () => {
        await presence.current?.leave();
        localStorage.removeItem('tbth-house-guest');
        localStorage.removeItem('tbth-demo');
        try {
            await supabase.auth.signOut();
        } catch { /* */ }
        setAuthed(false);
        setGuest(false);
        setOsOpen(false);
        closeToRoom();
        setAuthOpen(true);
    };

    const showHouse = ready && authed;

    return (
        <div className="relative h-[100dvh] w-full bg-[#0a0a12] overflow-hidden">
            {/* 3D — always full viewport when in house */}
            {showHouse && (
                <div className="absolute inset-0 z-0 h-full w-full">
                    <ErrorCatch onError={(m) => setCanvasError(m)}>
                        <HouseCanvas
                            locked={osOpen}
                            peers={peers}
                            onHotspot={setHotspot}
                            onPose={onPose}
                        />
                    </ErrorCatch>
                </div>
            )}

            {canvasError && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black p-6 text-center">
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

            {/* Loading */}
            {!ready && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black font-mono text-emerald-400/60 text-xs tracking-[0.3em]">
                    waking the house…
                </div>
            )}

            {/* Auth gate */}
            {ready && !authed && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 p-4 overflow-y-auto">
                    <div className="w-full max-w-md space-y-4">
                        <p className="text-center font-mono text-[10px] tracking-[0.4em] text-emerald-400/70">
                            FOLLOW THE WHITE RABBIT
                        </p>
                        <AuthModal
                            isOpen={authOpen || true}
                            isGated
                            onClose={() => setAuthOpen(false)}
                            onSuccess={onAuthSuccess}
                        />
                        <button
                            type="button"
                            onClick={enterGuest}
                            className="w-full py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-sm uppercase tracking-[0.2em] hover:bg-emerald-500/20"
                        >
                            Enter house as guest →
                        </button>
                        <p className="text-center text-[11px] text-zinc-600">
                            Guest mode skips login so you can see the 3D house immediately.
                        </p>
                    </div>
                </div>
            )}

            {/* HUD */}
            {showHouse && !osOpen && (
                <>
                    <div className="absolute top-4 left-4 z-30 pointer-events-none space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono">
                            Truth.OS House
                        </p>
                        <p className="text-sm text-white/90 font-medium drop-shadow-md">
                            {character.name?.trim() || (guest ? 'Guest' : 'Soul')}
                            {peers.length > 0 && (
                                <span className="text-emerald-400 text-xs ml-2">
                                    · {peers.length} other{peers.length === 1 ? '' : 's'} here
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="absolute bottom-6 inset-x-0 z-30 flex flex-col items-center gap-2">
                        {hotspot ? (
                            <button
                                type="button"
                                className="px-5 py-2.5 rounded-full border border-amber-400/50 bg-black/80 text-amber-100 text-sm font-semibold backdrop-blur-md shadow-lg"
                                onClick={() => activateHotspot(hotspot)}
                            >
                                E · {hotspot.hint}
                            </button>
                        ) : (
                            <p className="text-[11px] text-white/50 font-mono bg-black/40 px-3 py-1.5 rounded-full">
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
                            ? 'absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw-12px,400px)] h-[min(100dvh-16px,800px)] rounded-[1.75rem] overflow-hidden border-[3px] border-zinc-800'
                            : 'absolute z-50 inset-[2%] rounded-xl overflow-hidden border border-zinc-700 shadow-2xl bg-black'
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

/** Lightweight error boundary for WebGL failures */
function ErrorCatch({
    children,
    onError,
}: {
    children: React.ReactNode;
    onError: (msg: string) => void;
}) {
    return (
        <ErrorBoundary onError={onError}>{children}</ErrorBoundary>
    );
}

import React from 'react';

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
