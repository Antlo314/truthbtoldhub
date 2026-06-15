'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGameStore } from '@/lib/store/useGameStore';

// Placeholder for CHAPTER II — The Forging of Self (character creator).
// Next build replaces this with the live LPC paper-doll customizer.
export default function CreatePage() {
    const name = useGameStore((s) => s.character.name);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <main className="min-h-screen bg-void flex flex-col items-center justify-center text-center px-6">
            <div className="grain-overlay" />
            <div className="glass-panel rounded-3xl p-10 md:p-12 max-w-lg relative">
                <div
                    className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.15), transparent 70%)' }}
                />
                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-4 relative">Chapter II</p>
                <h1 className="font-ritual text-3xl md:text-4xl gold-shimmer mb-5 relative">The Forging of Self</h1>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6 relative">
                    {mounted && name ? (
                        <>
                            Welcome, <span className="text-aether-gold font-bold">{name}</span>.{' '}
                        </>
                    ) : null}
                    Truth studies you in the half-light. Soon you will shape the vessel you carry into the
                    world — your form, your features, and the plain garments of the newly awakened.
                </p>
                <p className="text-[11px] text-zinc-600 font-mono uppercase tracking-[0.25em] mb-8 relative">
                    Character Creator — next build
                </p>
                <Link
                    href="/awakening"
                    className="text-xs uppercase tracking-[0.3em] text-aether-gold hover:text-white transition-colors relative"
                >
                    ↺ Return to the Awakening
                </Link>
            </div>
        </main>
    );
}
