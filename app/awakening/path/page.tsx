'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/lib/store/useGameStore';
import KenneySprite, { ROGUELIKE_CHAR } from '@/components/game/KenneySprite';

// Placeholder for CHAPTER III — The Four Paths (Seer / Sentinel / Scribe / Mystic).
export default function PathPage() {
    const character = useGameStore((s) => s.character);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadFromCloud();
    }, [loadFromCloud]);

    const aura = character.appearance.aura;

    return (
        <main className="min-h-screen bg-void text-white flex flex-col items-center justify-center text-center px-6">
            <div className="grain-overlay" />
            {mounted && (
                <div className="relative mb-8 flex items-center justify-center" style={{ width: 200, height: 200 }}>
                    <div
                        className="absolute rounded-full"
                        style={{ width: 220, height: 220, background: `radial-gradient(circle, ${aura}40, transparent 68%)`, filter: 'blur(8px)' }}
                    />
                    <KenneySprite
                        {...ROGUELIKE_CHAR}
                        col={character.appearance.bodyTile.col}
                        row={character.appearance.bodyTile.row}
                        scale={9}
                        className="truth-float"
                        style={{ position: 'relative' }}
                    />
                </div>
            )}
            <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-3">Chapter III</p>
            <h1 className="font-ritual text-3xl md:text-4xl gold-shimmer mb-4">Choose Your Path</h1>
            <p className="text-zinc-400 text-sm max-w-md mb-2">
                {mounted && character.name ? (
                    <>
                        You are forged, <span className="text-aether-gold font-bold">{character.name}</span>. Truth gestures toward four roads
                        back to the Source — the Seer, the Sentinel, the Scribe, the Mystic.
                    </>
                ) : (
                    <>Four roads lead back to the Source — the Seer, the Sentinel, the Scribe, the Mystic.</>
                )}
            </p>
            <p className="text-[11px] text-zinc-600 font-mono uppercase tracking-[0.25em] mt-4 mb-8">Path selection — next build</p>
            <Link href="/awakening/create" className="text-xs uppercase tracking-[0.3em] text-aether-gold hover:text-white transition-colors">
                ↺ Reforge your self
            </Link>
        </main>
    );
}
