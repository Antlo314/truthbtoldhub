'use client';

import { useState, useEffect } from 'react';
import { useGameStore, type GamePath } from '@/lib/store/useGameStore';
import { PATHS, PATH_BY_ID } from '@/lib/game/paths';
import { Eye, Shield, ScrollText, Sparkles } from 'lucide-react';
import CinematicVideo from '@/components/game/CinematicVideo';
import AttunementPanel from '@/components/game/AttunementPanel';
import { CINEMA } from '@/lib/game/cutscenes';
import RestartJourneyButton from '@/components/game/RestartJourneyButton';
import { usePageMusic } from '@/lib/game/usePageMusic';

// ============================================================
//  CHAPTER III — THE FOUR PATHS
//  Choose a path back to the Source, then walk its attunement tree.
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

    usePageMusic('paths_crossroads');

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

    if (view === 'tree' && active) {
        return (
            <main className="relative bg-black text-white overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
                <CinematicVideo src={CINEMA.paths} overlay="heavy" showMuteControl />
                <div className="grain-overlay pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${active.color}1f, transparent 55%)` }} />
                <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto">
                    <AttunementPanel character={character} onLearn={learn} showEnterWorld />
                    <div className="shrink-0 pb-3 flex justify-center" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
                        <RestartJourneyButton label="Start a new soul" variant="link" />
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="relative bg-black text-white overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
            <CinematicVideo src={CINEMA.paths} overlay="heavy" showMuteControl />
            <div className="grain-overlay pointer-events-none" />
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
                <div className="shrink-0 mt-3 flex justify-center">
                    <RestartJourneyButton label="Start a new soul" variant="link" />
                </div>
            </div>
        </main>
    );
}