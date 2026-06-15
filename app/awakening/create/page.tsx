'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store/useGameStore';
import KenneySprite, {
    ROGUELIKE_CHAR,
    CHARACTER_OPTIONS,
    AURA_OPTIONS,
} from '@/components/game/KenneySprite';
import { Loader2 } from 'lucide-react';

// ============================================================
//  CHAPTER II — THE FORGING OF SELF  (character creator)
//  Pick your form (Kenney sprite), gender, aura, and confirm your
//  name. Saved to Supabase (game_state) + localStorage.
// ============================================================

export default function CreatePage() {
    const router = useRouter();
    const character = useGameStore((s) => s.character);
    const setName = useGameStore((s) => s.setName);
    const setAppearance = useGameStore((s) => s.setAppearance);
    const completeAwakening = useGameStore((s) => s.completeAwakening);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const saveToCloud = useGameStore((s) => s.saveToCloud);

    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadFromCloud();
    }, [loadFromCloud]);

    const { gender, bodyTile, aura } = character.appearance;
    const forms = CHARACTER_OPTIONS.filter((o) => o.gender === gender);

    const chooseGender = (g: 'male' | 'female') => {
        const first = CHARACTER_OPTIONS.find((o) => o.gender === g);
        setAppearance({ gender: g, ...(first ? { bodyTile: { col: first.col, row: first.row } } : {}) });
    };

    const confirm = async () => {
        if (!character.name.trim()) return;
        setSaving(true);
        completeAwakening();
        await saveToCloud();
        router.push('/awakening/path');
    };

    if (!mounted) return <div className="min-h-screen bg-void" />;

    return (
        <main className="relative min-h-screen bg-void text-white overflow-x-hidden">
            <div className="grain-overlay" />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.08), transparent 55%)' }}
            />

            <div className="relative z-10 max-w-5xl mx-auto px-5 py-10 md:py-14">
                <div className="text-center mb-10">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-3">Chapter II</p>
                    <h1 className="font-ritual text-3xl md:text-5xl font-black uppercase gold-shimmer">The Forging of Self</h1>
                    <p className="text-zinc-500 text-xs md:text-sm mt-3 max-w-md mx-auto">
                        Truth studies you in the half-light. Shape the vessel you carry into the world.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ===== live preview ===== */}
                    <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[360px]">
                        <div
                            className="absolute rounded-full"
                            style={{
                                width: 300,
                                height: 300,
                                background: `radial-gradient(circle, ${aura}40 0%, ${aura}10 45%, transparent 70%)`,
                                filter: 'blur(10px)',
                            }}
                        />
                        <KenneySprite
                            {...ROGUELIKE_CHAR}
                            col={bodyTile.col}
                            row={bodyTile.row}
                            scale={12}
                            className="truth-float"
                            style={{ position: 'relative', filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.5))' }}
                        />
                        <div
                            className="absolute"
                            style={{
                                bottom: 70,
                                width: 150,
                                height: 22,
                                borderRadius: '50%',
                                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5), transparent 70%)',
                            }}
                        />
                        <p className="relative font-ritual text-2xl text-white mt-6 tracking-wide">
                            {character.name || <span className="text-zinc-600 italic">Unnamed Soul</span>}
                        </p>
                    </div>

                    {/* ===== controls ===== */}
                    <div className="space-y-7">
                        {/* name */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2 block">Your Name</label>
                            <input
                                value={character.name}
                                onChange={(e) => setName(e.target.value.slice(0, 24))}
                                placeholder="speak your name"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-base text-white font-ritual tracking-wide focus:outline-none focus:border-aether-gold transition-colors"
                            />
                        </div>

                        {/* gender */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2 block">Form</label>
                            <div className="flex gap-3">
                                {(['male', 'female'] as const).map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => chooseGender(g)}
                                        className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] border transition-all ${
                                            gender === g
                                                ? 'bg-aether-gold/15 border-aether-gold/50 text-aether-gold'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                                        }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* appearance gallery */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2 block">Appearance</label>
                            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                                {forms.map((o) => {
                                    const selected = o.col === bodyTile.col && o.row === bodyTile.row;
                                    return (
                                        <button
                                            key={`${o.col}-${o.row}`}
                                            onClick={() => setAppearance({ bodyTile: { col: o.col, row: o.row } })}
                                            className={`aspect-square rounded-lg flex items-center justify-center border transition-all ${
                                                selected
                                                    ? 'bg-aether-gold/15 border-aether-gold/60'
                                                    : 'bg-white/5 border-white/10 hover:border-white/25'
                                            }`}
                                        >
                                            <KenneySprite {...ROGUELIKE_CHAR} col={o.col} row={o.row} scale={3} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* aura */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2 block">Aura</label>
                            <div className="flex flex-wrap gap-3">
                                {AURA_OPTIONS.map((a) => {
                                    const selected = a.color === aura;
                                    return (
                                        <button
                                            key={a.color}
                                            onClick={() => setAppearance({ aura: a.color })}
                                            title={a.name}
                                            className={`w-9 h-9 rounded-full border-2 transition-transform ${selected ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                                            style={{
                                                background: a.color,
                                                borderColor: selected ? '#fff' : 'transparent',
                                                boxShadow: selected ? `0 0 16px ${a.color}` : 'none',
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* confirm */}
                        <button
                            onClick={confirm}
                            disabled={saving || !character.name.trim()}
                            className="w-full mt-2 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {saving ? 'Forging…' : 'Begin your journey →'}
                        </button>
                        <p className="text-[10px] text-zinc-600 text-center">Your form, name, and aura are saved to your soul-record.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
