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
import { hubAudio } from '@/lib/truthos/hubAudio';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { joinHousePresence, type HousePeer, type HousePresenceApi } from '@/lib/truthos/housePresence';
import type { Hotspot } from './houseMap';
// isOnLivingRug inlined in onPose for rug footsteps
import TruthGuideWidget from './TruthGuideWidget';
import TruthOSShell from '../TruthOSShell';
import { useTruthOs } from '../truthOsStore';
import { useClientDevice } from '../engine/useClientDevice';
import {
    useHouseUi,
    shouldShowWalkthrough,
    type HousePanelId,
} from './houseUiStore';
import HouseWalkthrough from './HouseWalkthrough';
import HousePanels from './HousePanels';
import HouseMobileControls from './HouseMobileControls';
import HouseHints from './HouseHints';
import HouseCinematicChrome from './HouseCinematicChrome';
import { useHouseImmersion } from './useHouseImmersion';
import { markVisited } from './stationProgress';

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
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const { device } = useClientDevice();
    const { enterOs, closeToRoom } = useTruthOs();
    const openPanel = useHouseUi((s) => s.openPanel);
    const setSoonMessage = useHouseUi((s) => s.setSoonMessage);
    const soonMessage = useHouseUi((s) => s.soonMessage);
    const panel = useHouseUi((s) => s.panel);
    const setWalkthrough = useHouseUi((s) => s.setWalkthrough);
    const walkthroughOpen = useHouseUi((s) => s.walkthroughOpen);
    /** After guest signs in from the computer, open OS once session lands */
    const pendingOsLogin = useRef(false);

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
    const {
        shellRef,
        pointerLocked,
        fullscreen,
        requestPointerLock,
        toggleFullscreen,
    } = useHouseImmersion({
        enabled: ready && authed,
        mobile: isMobile,
        uiLocked,
    });

    useEffect(() => {
        hubAudio.unlock();
        hubAudio.enterHouse();
        return () => hubAudio.leaveHouse();
    }, []);

    useEffect(() => {
        hotspotRef.current = hotspot;
        if (hotspot && !uiLocked) hubAudio.approachHotspot(hotspot.id);
    }, [hotspot, uiLocked]);

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
        let pendingPanel: string | null = null;
        try {
            pendingPanel = sessionStorage.getItem('tbth-open-panel');
            if (pendingPanel) {
                sessionStorage.removeItem('tbth-open-panel');
                openPanel(pendingPanel as HousePanelId);
            }
        } catch {
            /* */
        }

        // New members get a short house/Hut tour (skip if deep-linking into a station)
        if (!pendingPanel && shouldShowWalkthrough()) {
            const t = window.setTimeout(() => setWalkthrough(true, 0), 900);
            return () => window.clearTimeout(t);
        }
    }, [openPanel, setWalkthrough]);

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
                    void loadFromCloud();
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
                void loadFromCloud();
                if (pendingOsLogin.current) {
                    pendingOsLogin.current = false;
                    setOsOpen(true);
                    enterOs();
                }
            } else {
                const gid = ensureGuestId();
                selfId.current = gid;
                setPresenceKey(gid);
                setGuest(true);
                setAuthed(true);
                setOsOpen(false);
                closeToRoom();
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
    }, [loadFromCloud, enterOs, closeToRoom]);

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
                x: 4.55,
                y: 0,
                z: 6.35,
                yaw: Math.PI,
            },
            (list) => {
                if (dead) return;
                // Belt-and-suspenders: never show local presence as a remote body
                const me = presenceKey;
                setPeers(list.filter((p) => p.id !== me && String(p.id) !== me));
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

    const movingRef = useRef(false);
    const lastPoseAt = useRef(0);

    const onPose = useCallback(
        (p: { x: number; y: number; z: number; yaw: number }) => {
            presence.current?.track({
                name: character.name?.trim() || (guest ? 'Guest' : 'Soul'),
                aura: character.appearance?.aura || '#a78bfa',
                skin: character.avatar?.skin ?? 6,
                build: character.avatar?.build === 'fem' ? 'fem' : 'masc',
                ...p,
            });
            if (!uiLocked) {
                const now = performance.now();
                if (now - lastPoseAt.current > 80) {
                    lastPoseAt.current = now;
                    const onRug = Math.abs(p.x) < 4.5 && p.z > -8.5 && p.z < -2.2;
                    hubAudio.updateHousePose(p.x, p.z, movingRef.current, onRug);
                }
            }
        },
        [character, guest, uiLocked],
    );

    const activateHotspot = useCallback(
        (h: Hotspot) => {
            sacredUi.click();
            hubAudio.useHotspot(h.id);
            markVisited(h.id);
            if (h.action.type === 'os') {
                markVisited('computer');
                // Truth.OS requires a real signed-in soul (not guest)
                if (guest) {
                    pendingOsLogin.current = true;
                    setAuthOpen(true);
                    return;
                }
                setOsOpen(true);
                enterOs();
                return;
            }
            if (h.action.type === 'panel') {
                openPanel(h.action.panel as HousePanelId);
                return;
            }
            if (h.action.type === 'soon') {
                setSoonMessage(h.action.message);
                window.setTimeout(() => setSoonMessage(null), 4200);
            }
        },
        [enterOs, openPanel, guest, setSoonMessage],
    );

    const tryInteract = useCallback(() => {
        const h = hotspotRef.current;
        if (h && !uiLocked) activateHotspot(h);
    }, [activateHotspot, uiLocked]);

    const onMoveActivity = useCallback((kind: 'move' | 'look' | 'jump' | 'idle') => {
        setActivity(kind);
        movingRef.current = kind === 'move';
        if (kind === 'jump') {
            // land cue shortly after jump impulse
            window.setTimeout(() => hubAudio.jumpLand(), 280);
        }
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'KeyE' && hotspot && !uiLocked) activateHotspot(hotspot);
            if (e.code === 'Escape') {
                if (osOpen) {
                    setOsOpen(false);
                    closeToRoom();
                    hubAudio.osExitToHouse();
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
        void loadFromCloud();
        if (pendingOsLogin.current) {
            pendingOsLogin.current = false;
            setOsOpen(true);
            enterOs();
        }
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
    const liveCount = peers.filter((p) => p.kind === 'live').length;
    const prevLive = useRef(0);
    useEffect(() => {
        if (liveCount > prevLive.current) hubAudio.peerJoined();
        else if (liveCount < prevLive.current && prevLive.current > 0) hubAudio.peerLeft();
        prevLive.current = liveCount;
    }, [liveCount]);

    return (
        <div
            ref={shellRef}
            className="relative w-full overflow-hidden bg-black select-none"
            style={{
                height: '100dvh',
                minHeight: '100vh',
                width: '100%',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
            onContextMenu={(e) => e.preventDefault()}
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
                            selfId={presenceKey}
                            avatar={character.avatar}
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
                    <div className="max-w-md space-y-3" data-allow-select>
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
                    <div className="w-full max-w-md space-y-3" data-allow-select>
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

            {showHud && (
                <>
                    <HouseCinematicChrome
                        mobile={isMobile}
                        characterName={character.name?.trim() || (guest ? 'Guest' : 'Soul')}
                        peerLiveCount={liveCount}
                        hotspot={hotspot}
                        pointerLocked={pointerLocked}
                        fullscreen={fullscreen}
                        onInteract={tryInteract}
                        onTour={() => {
                            sacredUi.click();
                            setWalkthrough(true, 0);
                        }}
                        onFullscreen={() => {
                            sacredUi.click();
                            void toggleFullscreen();
                        }}
                        onRequestLock={requestPointerLock}
                        guest={guest}
                        onSignIn={() => setAuthOpen(true)}
                    />
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

            <HouseWalkthrough />
            <HousePanels />

            {soonMessage && (
                <div className="fixed inset-x-0 bottom-[18%] z-[56] flex justify-center px-4 pointer-events-none">
                    <p className="max-w-md text-center text-sm text-amber-50 bg-black/85 border border-amber-400/40 px-5 py-3 rounded-2xl backdrop-blur-md shadow-xl">
                        {soonMessage}
                    </p>
                </div>
            )}

            {osOpen && (
                <div
                    className="fixed z-50 inset-0 sm:inset-[1.5%] sm:rounded-xl overflow-hidden border-0 sm:border border-zinc-700 shadow-2xl bg-black"
                    data-allow-select
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
                    <TruthOSShell onLogout={onLogout} />
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
