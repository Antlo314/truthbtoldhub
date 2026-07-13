'use client';

import Link from 'next/link';
import AvatarCanvas from '@/components/game/AvatarCanvas';
import { useGameStore } from '@/lib/store/useGameStore';

export default function SoulPanel({ onClose }: { onClose: () => void }) {
    const character = useGameStore((s) => s.character);

    return (
        <div className="flex flex-col h-full min-h-0">
            <header className="shrink-0 px-5 pt-5 pb-3 border-b border-white/10">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold">Soul Mirror</p>
                <h2 className="font-ritual text-2xl text-white mt-1">Your Vessel</h2>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">
                    Character creation stays on the forging path. Shape your vessel there — it walks with you here.
                </p>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 flex flex-col items-center gap-5">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_0_40px_rgba(251,191,36,0.08)]">
                    <AvatarCanvas config={character.avatar} scale={8} />
                </div>
                <div className="text-center">
                    <p className="font-ritual text-xl text-aether-gold">
                        {character.name?.trim() || 'Wandering Soul'}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/40 mt-1">
                        {character.path ? `Path · ${character.path}` : 'Path not yet chosen'}
                    </p>
                </div>
                <Link
                    href="/awakening/create"
                    className="w-full max-w-sm text-center py-3.5 rounded-xl bg-aether-gold text-black font-semibold text-sm uppercase tracking-[0.18em] hover:bg-aether-gold-soft transition-colors"
                >
                    Open character creator
                </Link>
                <p className="text-[12px] text-white/40 text-center max-w-xs leading-relaxed">
                    The full forging chamber — body, hair, face, outfit, aura — remains intact at this path.
                </p>
            </div>

            <footer className="shrink-0 p-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/15 text-sm uppercase tracking-[0.2em] text-white/70 hover:text-white"
                >
                    Close
                </button>
            </footer>
        </div>
    );
}
