'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store/useGameStore';
import { truthDepth, truthTrustLabel, TRUTH_QUESTIONS } from '@/lib/game/truthLore';

/**
 * Truth as a small guide widget — never takes over the experience.
 */
export default function TruthGuideWidget() {
    const [open, setOpen] = useState(false);
    const character = useGameStore((s) => s.character);
    const depth = truthDepth(character);
    const trust = truthTrustLabel(character);

    return (
        <div className="fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-2 pointer-events-auto">
            {open && (
                <div className="w-[min(100vw-2rem,300px)] rounded-xl border border-emerald-500/30 bg-black/90 backdrop-blur-md shadow-2xl overflow-hidden font-mono text-[11px]">
                    <div className="px-3 py-2 border-b border-emerald-500/20 flex justify-between items-center">
                        <span className="text-emerald-400/90 tracking-widest">TRUTH.GUIDE</span>
                        <button type="button" className="text-white/40 hover:text-white" onClick={() => setOpen(false)}>
                            ×
                        </button>
                    </div>
                    <div className="p-3 space-y-2 text-emerald-400/85 leading-relaxed">
                        <p>I am a guide process — not the whole system.</p>
                        <p className="text-emerald-600">
                            Walk the house. Objects open the Hub: library, offering, chamber, hall…
                        </p>
                        <p className="text-[10px] text-emerald-700">
                            {trust} · threads {depth}/{TRUTH_QUESTIONS.length}
                        </p>
                        <p className="text-emerald-500/70">
                            Tip: gold rings mark interactables. Press E when near.
                        </p>
                    </div>
                </div>
            )}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-12 h-12 rounded-full border border-emerald-500/40 bg-black/80 text-emerald-400 font-mono text-xs shadow-lg hover:bg-emerald-500/10 hover:border-emerald-400/60"
                title="Truth guide"
            >
                ::
            </button>
        </div>
    );
}
