'use client';

/**
 * Truth.OS immersive orchestrator
 * Auth → Create (preload) → Room → GSAP zoom → Truth.OS HTML overlay
 */
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import { useGameStore } from '@/lib/store/useGameStore';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { useClientDevice } from './useClientDevice';
import { preloadTruthOsAssets, type PreloadProgress } from './assetPreload';
import type { ImmersivePhase } from './types';
import TruthOSShell from '../TruthOSShell';
import { useTruthOs } from '../truthOsStore';

const ImmersiveCanvas = dynamic(() => import('./ImmersiveCanvas'), { ssr: false });

export default function ImmersiveExperience() {
    const { device, target, ready } = useClientDevice();
    const character = useGameStore((s) => s.character);
    const { enterOs, closeToRoom, phase: osPhase } = useTruthOs();

    const [phase, setPhase] = useState<ImmersivePhase>('auth');
    const [authOpen, setAuthOpen] = useState(true);
    const [preload, setPreload] = useState<PreloadProgress | null>(null);
    const [assetsReady, setAssetsReady] = useState(false);

    usePageMusic('title_landing');

    // Background preload during auth/create
    useEffect(() => {
        applyMusicSetting(loadSettings().music);
        let cancelled = false;
        preloadTruthOsAssets((p) => {
            if (!cancelled) setPreload(p);
        }).then(() => {
            if (!cancelled) setAssetsReady(true);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    // Session restore
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setAuthOpen(false);
                // Skip create if vessel already forged
                if (character?.name?.trim() && character?.created !== false) {
                    // GameCharacter uses initiated at store level
                }
                const initiated = useGameStore.getState().initiated;
                setPhase(initiated ? 'room' : 'create');
            }
        });
    }, [character?.name]);

    const onAuthSuccess = useCallback(() => {
        setAuthOpen(false);
        sacredUi.access();
        const initiated = useGameStore.getState().initiated;
        setPhase(initiated ? 'room' : 'create');
    }, []);

    const onCreateDone = useCallback(() => {
        // Character forge is /awakening/create — here we only gate "continue to room"
        setPhase('room');
    }, []);

    const onEnterDevice = useCallback(() => {
        setPhase('zooming');
        // GSAP completes then:
        setTimeout(() => {
            setPhase('os');
            enterOs();
            sacredUi.access();
        }, 50);
        // zoom callback from canvas will fire onEnterDevice after animation —
        // we set os immediately after parent receives completion from canvas
    }, [enterOs]);

    // Canvas reports zoom complete
    const handleZoomComplete = useCallback(() => {
        setPhase('os');
        enterOs();
        sacredUi.access();
    }, [enterOs]);

    const onLogout = async () => {
        await supabase.auth.signOut();
        closeToRoom();
        setPhase('auth');
        setAuthOpen(true);
    };

    const roomInteractive = phase === 'room';
    const showOs = phase === 'os' || osPhase === 'os';

    if (!ready) {
        return (
            <div className="min-h-[100dvh] bg-black flex items-center justify-center font-mono text-emerald-500/50 text-xs tracking-[0.3em]">
                detecting device…
            </div>
        );
    }

    return (
        <div className="relative min-h-[100dvh] w-full bg-[#0a0a12] overflow-hidden">
            {/* 3D room always mounted after auth so preload textures can warm GPU */}
            {(phase === 'room' || phase === 'zooming' || phase === 'create') && (
                <div
                    className={`absolute inset-0 transition-opacity duration-500 ${
                        phase === 'create' ? 'opacity-40' : 'opacity-100'
                    }`}
                >
                    <ImmersiveCanvas
                        target={target}
                        interactive={roomInteractive}
                        onEnterDevice={handleZoomComplete}
                    />
                </div>
            )}

            {/* AUTH overlay */}
            {phase === 'auth' && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="w-full max-w-md">
                        <p className="text-center font-mono text-[10px] tracking-[0.4em] text-emerald-400/70 mb-4">
                            FOLLOW THE WHITE RABBIT
                        </p>
                        <AuthModal
                            isOpen={authOpen || true}
                            isGated
                            onClose={() => {}}
                            onSuccess={onAuthSuccess}
                        />
                    </div>
                </div>
            )}

            {/* CREATE gate — deep-link forge, silent preload indicator */}
            {phase === 'create' && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
                    <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-black/80 p-6 text-center space-y-4">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400/80">
                            Vessel forge
                        </p>
                        <p className="text-white text-sm leading-relaxed">
                            Shape your identity while the room loads in silence.
                        </p>
                        {preload && !assetsReady && (
                            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-400/80 transition-all"
                                    style={{ width: `${Math.round(preload.ratio * 100)}%` }}
                                />
                            </div>
                        )}
                        <a
                            href="/awakening/create"
                            className="block py-3 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-xs uppercase tracking-[0.2em]"
                        >
                            Open forge
                        </a>
                        <button
                            type="button"
                            onClick={onCreateDone}
                            className="text-xs text-white/40 hover:text-white/70"
                        >
                            Skip · enter room
                        </button>
                    </div>
                </div>
            )}

            {/* Room hint */}
            {phase === 'room' && (
                <div className="absolute bottom-8 inset-x-0 z-20 pointer-events-none text-center">
                    <p className="font-mono text-[10px] tracking-[0.35em] text-emerald-400/70 mb-1">
                        {device === 'mobile' ? 'TAP THE PHONE' : 'CLICK THE MONITOR'}
                    </p>
                    <p className="text-xs text-white/35">
                        {assetsReady ? 'signal ready' : 'loading assets…'}
                    </p>
                </div>
            )}

            {/* Truth.OS HTML overlay — Windows vs Android chrome */}
            {showOs && (
                <div
                    className={
                        device === 'mobile'
                            ? 'absolute z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw-12px,400px)] h-[min(100dvh-16px,800px)] rounded-[1.75rem] overflow-hidden border-[3px] border-zinc-800 shadow-2xl'
                            : 'absolute z-50 inset-0 overflow-hidden'
                    }
                >
                    <TruthOSShell
                        mode={device === 'mobile' ? 'phone' : 'desktop'}
                        onLogout={onLogout}
                    />
                </div>
            )}
        </div>
    );
}
