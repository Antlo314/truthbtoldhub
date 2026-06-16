'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGameStore, type GamePath } from '@/lib/store/useGameStore';
import { PATHS, PATH_BY_ID } from '@/lib/game/paths';
import { Eye, Shield, ScrollText, Sparkles, Lock, Check, Crown, ArrowRight } from 'lucide-react';

// ============================================================
//  CHAPTER III — THE FOUR PATHS
//  Choose a path back to the Source, then walk its skill tree.
//  Compact single-screen mobile layout (no scrolling).
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

    useEffect(() => {
        if (character.path) setView('tree');
    }, [character.path]);

    const embrace = (id: GamePath) => {
        setPath(id);
        setView('tree');
        saveToCloud();
    };

    const learn = (id: string) => {
        learnSkill(id);
        saveToCloud();
    };

    if (!mounted) return <div className="bg-void" style={{ height: '100dvh' }} />;

    const active = character.path ? PATH_BY_ID[character.path] : null;

    // ---------------- TREE VIEW ----------------
    if (view === 'tree' && active) {
        const Icon = ICONS[active.icon];
        return (
            <main className="relative bg-void text-white overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
                <div className="grain-overlay" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${active.color}1f, transparent 55%)` }} />

                <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto px-4"
                    style={{ paddingTop: 'calc(0.7rem + env(safe-area-inset-top))', paddingBottom: 'calc(0.7rem + env(safe-area-inset-bottom))' }}>

                    {/* header row */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0" style={{ borderColor: `${active.color}55`, background: `${active.color}14`, color: active.color }}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[8px] tracking-[0.35em] uppercase" style={{ color: active.color }}>Your Path</p>
                            <h1 className="font-ritual text-xl font-black gold-shimmer leading-tight truncate">{active.name}</h1>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shrink-0" style={{ borderColor: `${active.color}40`, background: `${active.color}10` }}>
                            <Sparkles className="w-3 h-3" style={{ color: active.color }} />
                            <span className="text-[11px] font-black" style={{ color: active.color }}>{character.skillPoints}</span>
                        </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 italic mt-2 shrink-0 leading-snug">Spend what you have earned — every attunement is felt in the world and in every fight.</p>

                    {/* skill tree — fills the rest */}
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mt-2 flex flex-col items-center">
                        {active.skills.map((node, i) => {
                            const learned = character.skills.includes(node.id);
                            const prereqsMet = (node.requires || []).every((r) => character.skills.includes(r));
                            const learnable = !learned && prereqsMet && character.skillPoints > 0;
                            const locked = !learned && !prereqsMet;
                            return (
                                <div key={node.id} className="w-full flex flex-col items-center">
                                    {i > 0 && <div className="w-px h-2.5" style={{ background: prereqsMet ? active.color : 'rgba(255,255,255,0.12)' }} />}
                                    <div
                                        className={`w-full rounded-xl border p-2.5 flex items-center gap-2.5 transition-all ${locked ? 'opacity-45' : ''}`}
                                        title={node.desc}
                                        style={{
                                            borderColor: learned ? active.color : node.super ? `${active.color}66` : 'rgba(255,255,255,0.1)',
                                            background: learned ? `${active.color}14` : 'rgba(255,255,255,0.03)',
                                        }}
                                    >
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ borderColor: `${active.color}55`, color: active.color, background: `${active.color}12` }}>
                                            {learned ? <Check className="w-4 h-4" /> : locked ? <Lock className="w-3.5 h-3.5" /> : node.super ? <Crown className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="font-ritual text-sm text-white truncate">{node.name}</h3>
                                                {node.super && <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${active.color}22`, color: active.color }}>Super</span>}
                                            </div>
                                            {node.combat && <p className="text-[9px] font-black uppercase tracking-widest truncate" style={{ color: active.color }}>⚔ {node.combat.label}</p>}
                                        </div>
                                        <div className="shrink-0">
                                            {learned ? <span className="text-[10px] font-black" style={{ color: active.color }}>✦</span>
                                                : learnable ? <button onClick={() => learn(node.id)} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-black" style={{ background: active.color }}>Learn</button>
                                                    : <span className="text-[9px] uppercase tracking-widest text-zinc-600">{locked ? 'Locked' : '1 pt'}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Link href="/world" className="shrink-0 mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                        Enter the Cavern <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </main>
        );
    }

    // ---------------- SELECT VIEW ----------------
    return (
        <main className="relative bg-void text-white overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
            <div className="grain-overlay" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.08), transparent 55%)' }} />

            <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto px-4"
                style={{ paddingTop: 'calc(0.7rem + env(safe-area-inset-top))', paddingBottom: 'calc(0.7rem + env(safe-area-inset-bottom))' }}>

                <div className="shrink-0 text-center">
                    <p className="text-[9px] tracking-[0.4em] uppercase text-aether-gold/70">Chapter III · The Crossroads</p>
                    <p className="text-[12px] text-zinc-400 italic mt-1 leading-snug">
                        Four roads lie before you{character.name ? `, ${character.name}` : ''}. Choose with care — your strengths and weaknesses are born here.
                    </p>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mt-3 grid grid-cols-2 gap-2.5 content-start">
                    {PATHS.map((p) => {
                        const Icon = ICONS[p.icon];
                        const isSel = selected === p.id;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setSelected(p.id)}
                                className="text-left rounded-2xl border p-3 transition-all"
                                style={{
                                    borderColor: isSel ? p.color : 'rgba(255,255,255,0.1)',
                                    background: isSel ? `${p.color}14` : 'rgba(255,255,255,0.03)',
                                    boxShadow: isSel ? `0 0 24px ${p.color}22` : 'none',
                                }}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0" style={{ borderColor: `${p.color}55`, color: p.color, background: `${p.color}12` }}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-ritual text-base text-white leading-tight">{p.name}</h3>
                                </div>
                                <p className="text-[11px] text-zinc-300 leading-snug"><span className="font-black uppercase tracking-widest text-[8px]" style={{ color: p.color }}>Power · </span>{p.power}</p>
                                <p className="text-[10px] text-zinc-500 leading-snug mt-1"><span className="font-black uppercase tracking-widest text-[8px] text-zinc-500">Weak · </span>{p.weakness}</p>
                            </button>
                        );
                    })}
                </div>

                {selected && (
                    <button
                        onClick={() => embrace(selected)}
                        className="shrink-0 mt-2 w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform active:scale-[0.99]"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 30px rgba(251,191,36,0.25)' }}
                    >
                        Embrace {PATH_BY_ID[selected].name}
                    </button>
                )}
            </div>
        </main>
    );
}
