'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useHutUi } from '../hutUiStore';
import StationPanel from './StationPanel';
import { useGameStore } from '@/lib/store/useGameStore';
import {
    truthDepth,
    truthTrustLabel,
    TRUTH_QUESTIONS,
} from '@/lib/game/truthLore';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { STATIONS } from '../scene/Stations';
import { queueHutJump } from '../scene/PlayerController';
import * as THREE from 'three';

/** React DOM overlay — best practice: keep game UI out of WebGL */
export default function HutHud({
    playerPosRef,
}: {
    playerPosRef: React.MutableRefObject<THREE.Vector3 | null>;
}) {
    const station = useHutUi((s) => s.station);
    const prompt = useHutUi((s) => s.prompt);
    const openStation = useHutUi((s) => s.openStation);
    const closeStation = useHutUi((s) => s.closeStation);
    const character = useGameStore((s) => s.character);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Escape') {
                if (useHutUi.getState().station) {
                    closeStation();
                    sacredUi.hover();
                }
                return;
            }
            if (e.code === 'KeyE' || e.code === 'Enter') {
                if (useHutUi.getState().station) return;
                const pos = playerPosRef.current;
                if (!pos) return;
                let best = null as (typeof STATIONS)[0] | null;
                let bestD = Infinity;
                for (const s of STATIONS) {
                    const d = pos.distanceTo(new THREE.Vector3(...s.position));
                    if (d < s.radius && d < bestD) {
                        best = s;
                        bestD = d;
                    }
                }
                if (best) {
                    openStation(best.id);
                    sacredUi.click();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [closeStation, openStation, playerPosRef]);

    const depth = truthDepth(character);

    return (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
            {/* Top bar */}
            <div className="pointer-events-auto flex items-start justify-between gap-3 p-3 sm:p-4">
                <div className="rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md px-3.5 py-2.5 max-w-[min(100%,20rem)]">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-aether-gold/70 font-bold">Truth&apos;s Hut</p>
                    <p className="text-sm text-white/90 font-medium truncate">
                        {character.name?.trim() || 'Wandering Soul'}
                        <span className="text-white/35"> · </span>
                        <span className="text-white/50">{truthTrustLabel(character)}</span>
                    </p>
                </div>
                <div className="rounded-2xl border border-aether-gold/25 bg-black/55 backdrop-blur-md px-3.5 py-2.5 text-right">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-aether-gold font-bold">Objective</p>
                    <p className="text-sm text-white/90">
                        {depth < 1 ? 'Speak with Truth' : 'Shape your vessel · walk the hut'}
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5">
                        Threads {depth}/{TRUTH_QUESTIONS.length}
                    </p>
                </div>
            </div>

            {/* Center / bottom controls */}
            <div className="flex-1" />

            <div className="pointer-events-auto flex flex-col items-center gap-3 pb-5 px-4" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                <AnimatePresence>
                    {prompt && !station && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="px-5 py-2.5 rounded-full border border-aether-gold/35 bg-black/70 backdrop-blur-md text-aether-gold text-sm font-semibold tracking-wide shadow-lg"
                        >
                            E · {prompt}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-white/40">
                    <span className="px-2 py-1 rounded-md bg-black/40 border border-white/10">WASD move</span>
                    <span className="px-2 py-1 rounded-md bg-black/40 border border-white/10">Space jump</span>
                    <span className="px-2 py-1 rounded-md bg-black/40 border border-white/10">E interact</span>
                    <span className="px-2 py-1 rounded-md bg-black/40 border border-white/10">Esc close</span>
                    <Link href="/" className="px-2 py-1 rounded-md bg-black/40 border border-white/10 hover:text-aether-gold">
                        Leave hut
                    </Link>
                </div>

                {/* Touch: jump + interact */}
                <div className="sm:hidden flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Jump"
                        className="w-14 h-14 rounded-full border-2 border-white/25 bg-white/10 text-white/80 font-bold text-xl"
                        onClick={() => queueHutJump()}
                    >
                        ⤒
                    </button>
                    <button
                        type="button"
                        className="w-16 h-16 rounded-full border-2 border-aether-gold/50 bg-aether-gold/15 text-aether-gold font-bold text-lg"
                        onClick={() => {
                            const pos = playerPosRef.current;
                            if (!pos) return;
                            if (station) {
                                closeStation();
                                return;
                            }
                            for (const s of STATIONS) {
                                if (pos.distanceTo(new THREE.Vector3(...s.position)) < s.radius) {
                                    openStation(s.id);
                                    sacredUi.click();
                                    break;
                                }
                            }
                        }}
                    >
                        E
                    </button>
                </div>
            </div>

            {/* Station panel */}
            <AnimatePresence>
                {station && (
                    <motion.div
                        className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) closeStation();
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            className="w-full max-w-lg max-h-[min(88dvh,720px)] rounded-2xl border border-white/12 bg-[#0c0a08]/shadow-[0_25px_80px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col"
                        >
                            <StationPanel station={station} onClose={closeStation} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
