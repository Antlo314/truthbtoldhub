'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGameStore, type GamePath } from '@/lib/store/useGameStore';
import { PATHS, PATH_BY_ID } from '@/lib/game/paths';
import { Eye, Shield, ScrollText, Sparkles, Lock, Check, Crown, ArrowRight } from 'lucide-react';

// ============================================================
//  CHAPTER III — THE FOUR PATHS
//  Choose a path back to the Source, then walk its skill tree.
// ============================================================

const ICONS = { eye: Eye, shield: Shield, scroll: ScrollText, spark: Sparkles } as const;

export default function PathPage() {
    const character = useGameStore((s) => s.character);
    const setPath = useGameStore((s) => s.setPath);
    const learnSkill = useGameStore((s) => s.learnSkill);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const saveToCloud = useGameStore((s) => s.saveToCloud);

    const [mounted, setMounted] = useState(false);
    const [selected, setSelected] = useState<GamePath | null>(null);
    const [view, setView] = useState<'select' | 'tree'>('select');

    useEffect(() => {
        setMounted(true);
        loadFromCloud();
    }, [loadFromCloud]);

    // if a path was already chosen (loaded from cloud), go straight to the tree
    useEffect(() => {
        if (character.path) setView('tree');
    }, [character.path]);

    const embrace = async (id: GamePath) => {
        setPath(id);
        setView('tree');
        await saveToCloud();
    };

    const learn = async (id: string) => {
        learnSkill(id);
        await saveToCloud();
    };

    if (!mounted) return <div className="min-h-screen bg-void" />;

    const active = character.path ? PATH_BY_ID[character.path] : null;

    // ---------------- TREE VIEW ----------------
    if (view === 'tree' && active) {
        const Icon = ICONS[active.icon];
        return (
            <main className="min-h-screen bg-void text-white relative overflow-x-hidden">
                <div className="grain-overlay" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${active.color}1f, transparent 55%)` }} />

                <div className="relative z-10 max-w-2xl mx-auto px-5 py-12">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 border" style={{ borderColor: `${active.color}55`, background: `${active.color}14`, color: active.color }}>
                            <Icon className="w-8 h-8" />
                        </div>
                        <p className="text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: active.color }}>Your Path</p>
                        <h1 className="font-ritual text-3xl md:text-4xl font-black gold-shimmer">{active.name}</h1>
                        <p className="text-zinc-400 text-sm mt-2">{active.essence}</p>
                        <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full border" style={{ borderColor: `${active.color}40`, background: `${active.color}10` }}>
                            <Sparkles className="w-3.5 h-3.5" style={{ color: active.color }} />
                            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: active.color }}>
                                {character.skillPoints} skill point{character.skillPoints === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>

                    {/* skill tree */}
                    <div className="flex flex-col items-center">
                        {active.skills.map((node, i) => {
                            const learned = character.skills.includes(node.id);
                            const prereqsMet = (node.requires || []).every((r) => character.skills.includes(r));
                            const learnable = !learned && prereqsMet && character.skillPoints > 0;
                            const locked = !learned && !prereqsMet;

                            return (
                                <div key={node.id} className="w-full flex flex-col items-center">
                                    {i > 0 && (
                                        <div className="w-px h-6" style={{ background: prereqsMet ? active.color : 'rgba(255,255,255,0.1)' }} />
                                    )}
                                    <div
                                        className={`w-full max-w-md rounded-2xl border p-5 flex items-start gap-4 transition-all ${locked ? 'opacity-45' : ''}`}
                                        style={{
                                            borderColor: learned ? active.color : node.super ? `${active.color}66` : 'rgba(255,255,255,0.1)',
                                            background: learned ? `${active.color}14` : 'rgba(255,255,255,0.03)',
                                            boxShadow: node.super && !locked ? `0 0 26px ${active.color}22` : 'none',
                                        }}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                                            style={{ borderColor: `${active.color}55`, color: active.color, background: `${active.color}12` }}
                                        >
                                            {learned ? <Check className="w-5 h-5" /> : locked ? <Lock className="w-4 h-4" /> : node.super ? <Crown className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-ritual text-lg text-white">{node.name}</h3>
                                                {node.super && <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${active.color}22`, color: active.color }}>Super</span>}
                                            </div>
                                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{node.desc}</p>

                                            <div className="mt-3">
                                                {learned && <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: active.color }}>✦ Attuned</span>}
                                                {learnable && (
                                                    <button
                                                        onClick={() => learn(node.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg text-black transition-transform hover:scale-105"
                                                        style={{ background: active.color }}
                                                    >
                                                        Learn · 1 pt
                                                    </button>
                                                )}
                                                {locked && <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Locked</span>}
                                                {!learned && !learnable && !locked && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Needs a skill point</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 text-center space-y-4">
                        <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-[0.2em]">
                            Truth waits in the first cavern. Your journey begins.
                        </p>
                        <Link
                            href="/world"
                            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-black"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                        >
                            Enter the Cavern <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // ---------------- SELECT VIEW ----------------
    return (
        <main className="min-h-screen bg-void text-white relative overflow-x-hidden">
            <div className="grain-overlay" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.08), transparent 55%)' }} />

            <div className="relative z-10 max-w-5xl mx-auto px-5 py-12">
                <div className="text-center mb-10">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-3">Chapter III</p>
                    <h1 className="font-ritual text-3xl md:text-5xl font-black uppercase gold-shimmer">Choose Your Path</h1>
                    <p className="text-zinc-500 text-xs md:text-sm mt-3 max-w-lg mx-auto">
                        {character.name ? <>Four roads lie before you, <span className="text-aether-gold">{character.name}</span>.</> : 'Four roads lie before you.'} Each leads back to the Source by a different light. Choose with care — your strengths and your weaknesses are born here.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {PATHS.map((p) => {
                        const Icon = ICONS[p.icon];
                        const isSel = selected === p.id;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setSelected(p.id)}
                                className={`text-left rounded-3xl border p-6 transition-all ${isSel ? 'scale-[1.01]' : 'hover:border-white/20'}`}
                                style={{
                                    borderColor: isSel ? p.color : 'rgba(255,255,255,0.1)',
                                    background: isSel ? `${p.color}12` : 'rgba(255,255,255,0.03)',
                                    boxShadow: isSel ? `0 0 30px ${p.color}22` : 'none',
                                }}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ borderColor: `${p.color}55`, color: p.color, background: `${p.color}12` }}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-ritual text-xl text-white">{p.name}</h3>
                                        <p className="text-[11px] text-zinc-500">{p.essence}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    <p className="text-xs text-zinc-300 leading-relaxed"><span className="font-black uppercase tracking-widest text-[9px]" style={{ color: p.color }}>Power · </span>{p.power}</p>
                                    <p className="text-xs text-zinc-500 leading-relaxed"><span className="font-black uppercase tracking-widest text-[9px] text-zinc-500">Weakness · </span>{p.weakness}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {selected && (
                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={() => embrace(selected)}
                            className="px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.03]"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 40px rgba(251,191,36,0.25)' }}
                        >
                            Embrace {PATH_BY_ID[selected].name}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
