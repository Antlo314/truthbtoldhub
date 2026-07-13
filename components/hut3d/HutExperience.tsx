'use client';

import { useRef, useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { useGameStore } from '@/lib/store/useGameStore';
import { gameMusic } from '@/lib/game/music';
import { loadSettings, applyMusicSetting } from '@/lib/game/settings';
import { unlockAudio } from '@/lib/game/sfx';
import HutHud from './hud/HutHud';
import { useHutUi } from './hutUiStore';

const HutCanvas = dynamic(() => import('./HutCanvas'), { ssr: false });

/**
 * Truth's Hut — React Three Fiber.
 */
export default function HutExperience() {
    const character = useGameStore((s) => s.character);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const playerPosRef = useRef<THREE.Vector3 | null>(null);
    const [booted, setBooted] = useState(false);
    const closeStation = useHutUi((s) => s.closeStation);

    useEffect(() => {
        closeStation();
        loadFromCloud?.();

        // Respect settings + start hut BGM (browser may block until gesture)
        const settings = loadSettings();
        applyMusicSetting(settings.music);

        const startHutMusic = () => {
            if (!loadSettings().music) return;
            unlockAudio();
            gameMusic.playBgm('world_cavern', {
                variant: gameMusic.pickVariant('world_cavern'),
                restart: false,
            });
        };

        try {
            startHutMusic();
        } catch { /* autoplay policy */ }

        // Retry on first user gesture (required after landing/page transitions)
        const onGesture = () => {
            startHutMusic();
            window.removeEventListener('pointerdown', onGesture);
            window.removeEventListener('keydown', onGesture);
            window.removeEventListener('touchstart', onGesture);
        };
        window.addEventListener('pointerdown', onGesture, { once: true });
        window.addEventListener('keydown', onGesture, { once: true });
        window.addEventListener('touchstart', onGesture, { once: true, passive: true });

        const t = window.setTimeout(() => setBooted(true), 400);
        // Safety re-kick after veil so Howl is not stuck silent
        const t2 = window.setTimeout(() => startHutMusic(), 700);

        return () => {
            window.clearTimeout(t);
            window.clearTimeout(t2);
            window.removeEventListener('pointerdown', onGesture);
            window.removeEventListener('keydown', onGesture);
            window.removeEventListener('touchstart', onGesture);
            closeStation();
        };
    }, [loadFromCloud, closeStation]);

    return (
        <div className="relative w-full h-[100dvh] bg-[#05060c] overflow-hidden select-none">
            <Suspense
                fallback={
                    <div className="absolute inset-0 flex items-center justify-center text-aether-gold/70 text-sm tracking-[0.3em] uppercase">
                        Kindling the hearth…
                    </div>
                }
            >
                <HutCanvas
                    avatar={character.avatar}
                    onPlayerPosition={(p) => {
                        playerPosRef.current = p;
                    }}
                />
            </Suspense>

            <HutHud playerPosRef={playerPosRef} />

            {!booted && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black text-center px-6">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-aether-gold/70 mb-3">Crossing</p>
                    <p className="font-ritual text-2xl sm:text-3xl text-white/90">A hearth remembers your name</p>
                    <div className="mt-8 h-px w-32 bg-gradient-to-r from-transparent via-aether-gold/50 to-transparent" />
                </div>
            )}
        </div>
    );
}
