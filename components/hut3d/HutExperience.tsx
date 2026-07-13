'use client';

import { useRef, useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { useGameStore } from '@/lib/store/useGameStore';
import { gameMusic } from '@/lib/game/music';
import HutHud from './hud/HutHud';
import { useHutUi } from './hutUiStore';

const HutCanvas = dynamic(() => import('./HutCanvas'), { ssr: false });

/**
 * Truth's Hut — React Three Fiber.
 * Best practices applied from successful R3F/web games:
 * - Canvas client-only (dynamic, ssr:false)
 * - Game UI as React DOM overlay (not WebGL menus)
 * - Zustand for journey + hut UI state
 * - dpr capped, shadows selective
 * - Keep creator + Truth systems on existing web lore/store
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
        try {
            gameMusic.playBgm('world_cavern', { variant: gameMusic.pickVariant('world_cavern') });
        } catch { /* autoplay */ }
        const t = window.setTimeout(() => setBooted(true), 400);
        return () => {
            window.clearTimeout(t);
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
