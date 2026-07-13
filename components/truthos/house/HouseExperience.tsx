'use client';

/**
 * First-person multiplayer house.
 * Login → bedroom spawn → walk house → E on hotspots → Hub sections / OS.
 * Truth = small guide widget only.
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

const HouseCanvas = dynamic(() => import('./HouseCanvas'), { ssr: false });

export default function HouseExperience() {
    const router = useRouter();
    const character = useGameStore((s) => s.character);
    const { device } = useClientDevice();
    const { phase: osPhase, enterOs, closeToRoom } = useTruthOs();

    const [authed, setAuthed] = useState(false);
    const [authOpen, setAuthOpen] = useState(true);
    const [hotspot, setHotspot] = useState<Hotspot | null>(null);
    const [peers, setPeers] = useState<HousePeer[]>([]);
    const [osOpen, setOsOpen] = useState(false);
    const presence = useRef<HousePresenceApi | null>(null);
    const selfId = useRef<string>('');

    usePageMusic('world_cavern');

    useEffect(() => {
        applyMusicSetting(loadSettings().music);
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setAuthed(true);
                setAuthOpen(false);
                selfId.current = data.session.user.id;
            }
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            setAuthed(!!session);
            if (session) {
                setAuthOpen(false);
                selfId.current = session.user.id;
            }
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    // Multiplayer join
    useEffect(() => {
        if (!authed || !selfId.current) return;
        let dead = false;
        const aura = character.appearance?.aura || '#a78bfa';
        joinHousePresence(
            selfId.current,
            {
                name: character.name?.trim() || 'Soul',
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
    }, [authed, character.name, character.appearance?.aura, character.avatar?.skin, character.avatar?.build]);

    const onPose = useCallback(
        (p: { x: number; y: number; z: number; yaw: number }) => {
            presence.current?.track({
                name: character.name?.trim() || 'Soul',
                aura: character.appearance?.aura || '#a78bfa',
                skin: character.avatar?.skin ?? 6,
                build: character.avatar?.build === 'fem' ? 'fem' : 'masc',
                ...p,
            });
        },
        [character],
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
            if (e.code === 'KeyE' && hotspot && !osOpen) {
                activateHotspot(hotspot);
            }
            if (e.code === 'Escape' && osOpen) {
                setOsOpen(false);
                closeToRoom();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [hotspot, osOpen, activateHotspot, closeToRoom]);

    const onAuthSuccess = () => {
        setAuthed(true);
        setAuthOpen(false);
        sacredUi.access();
    };

    const onLogout = async () => {
        await presence.current?.leave();
        await supabase.auth.signOut();
        setAuthed(false);
        setOsOpen(false);
        closeToRoom();
        setAuthOpen(true);
    };

    const showHouse = authed && !authOpen;

    return (
        <div className="relative min-h-[100dvh] w-full bg-[#0a0a12] overflow-hidden">
            {showHouse && (
                <HouseCanvas
                    locked={osOpen}
                    peers={peers}
                    onHotspot={setHotspot}
                    onPose={onPose}
                />
            )}

            {/* Auth gate */}
            {!authed && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                    <div className="w-full max-w-md">
                        <p className="text-center font-mono text-[10px] tracking-[0.4em] text-emerald-400/70 mb-3">
                            FOLLOW THE WHITE RABBIT
                        </p>
                        <AuthModal isOpen={authOpen || true} isGated onClose={() => {}} onSuccess={onAuthSuccess} />
                    </div>
                </div>
            )}

            {/* HUD */}
            {showHouse && !osOpen && (
                <>
                    <div className="absolute top-4 left-4 z-30 pointer-events-none space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">Truth.OS House</p>
                        <p className="text-sm text-white/80 font-medium">
                            {character.name?.trim() || 'Soul'}
                            {peers.length > 0 && (
                                <span className="text-emerald-400/80 text-xs ml-2">
                                    · {peers.length} other{peers.length === 1 ? '' : 's'} here
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="absolute bottom-6 inset-x-0 z-30 flex flex-col items-center gap-2 pointer-events-none">
                        {hotspot ? (
                            <button
                                type="button"
                                className="pointer-events-auto px-5 py-2.5 rounded-full border border-amber-400/40 bg-black/75 text-amber-200 text-sm font-semibold backdrop-blur-md"
                                onClick={() => activateHotspot(hotspot)}
                            >
                                E · {hotspot.hint}
                            </button>
                        ) : (
                            <p className="text-[11px] text-white/35 font-mono">
                                WASD move · drag look · E interact · gold rings mark places
                            </p>
                        )}
                    </div>

                    <TruthGuideWidget />
                </>
            )}

            {/* Truth.OS on computer — overlay, Truth is just one dock app (widget-scale) */}
            {osOpen && (
                <div
                    className={
                        device === 'mobile'
                            ? 'absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw-12px,400px)] h-[min(100dvh-16px,800px)] rounded-[1.75rem] overflow-hidden border-[3px] border-zinc-800'
                            : 'absolute z-50 inset-[2%] rounded-xl overflow-hidden border border-zinc-700 shadow-2xl'
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
                        Exit OS · back to house
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
