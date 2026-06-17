'use client';

import Link from 'next/link';
import type { GameCharacter } from '@/lib/store/useGameStore';

interface Props {
    character: GameCharacter;
    founderNumber: number | null;
    onClose: () => void;
}

export default function SourceEpilogue({ character, founderNumber, onClose }: Props) {
    const relics = character.inventory.length;
    const quests = character.questsClaimed.length;
    const cleared = character.cleared.length;

    return (
        <div className="absolute inset-0 z-[80] flex items-center justify-center p-6 bg-black/92 backdrop-blur-xl">
            <div className="w-full max-w-lg text-center">
                <p className="text-[10px] tracking-[0.5em] uppercase text-aether-gold/70">Season I · Complete</p>
                <h1 className="font-ritual text-3xl md:text-4xl font-black gold-shimmer mt-3">The Source Dwells in You</h1>
                <p className="text-sm text-zinc-400 mt-4 leading-relaxed">
                    {character.name || 'Soul'}, you walked every road, gathered every fragment, and woke where you always were.
                </p>

                <div className="grid grid-cols-3 gap-3 mt-8">
                    <div className="rounded-xl border border-white/10 p-3 bg-white/[0.03]">
                        <p className="text-2xl font-black text-aether-gold">{relics}</p>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-1">Relics</p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-3 bg-white/[0.03]">
                        <p className="text-2xl font-black text-aether-gold">{quests}</p>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-1">Missions</p>
                    </div>
                    <div className="rounded-xl border border-white/10 p-3 bg-white/[0.03]">
                        <p className="text-2xl font-black text-aether-gold">{cleared}</p>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-1">Guardians</p>
                    </div>
                </div>

                {founderNumber && (
                    <p className="text-[10px] text-aether-gold/80 mt-4 uppercase tracking-widest">Founding Seal #{founderNumber}</p>
                )}

                <p className="text-xs text-zinc-500 mt-6 italic leading-relaxed">
                    Season II opens when the sanctum stirs anew — deeper caverns, super-skills, and the sealed auras await.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                    <Link href="/codex" className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/15 text-white hover:border-aether-gold/40">
                        Read the Codex
                    </Link>
                    <Link href="/cinema" className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/15 text-white hover:border-aether-gold/40">
                        Watch Transmissions
                    </Link>
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                        Keep Roaming
                    </button>
                </div>
            </div>
        </div>
    );
}