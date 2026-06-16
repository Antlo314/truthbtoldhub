'use client';

import { useState } from 'react';
import KenneySprite, { ROGUELIKE_CHAR } from '@/components/game/KenneySprite';
import PuzzleScene from '@/components/game/PuzzleScene';
import type { Destination } from '@/lib/game/destinations';
import { useGameStore } from '@/lib/store/useGameStore';
import { puzzleHintFor } from '@/lib/game/pathPowers';
import { ArrowLeft, Gem, Check, ChevronDown, Lock, Puzzle as PuzzleIcon } from 'lucide-react';

// Import the new interactive mini-worlds
import EdenWorld from '@/components/game/destinations/EdenWorld';
import StLouisWorld from '@/components/game/destinations/StLouisWorld';
import GizaWorld from '@/components/game/destinations/GizaWorld';
import KolbrinWorld from '@/components/game/destinations/KolbrinWorld';
import EmeraldWorld from '@/components/game/destinations/EmeraldWorld';

interface Props {
    destination: Destination;
    inventory: string[];
    solved: string[];
    onClaim: (relicId: string) => void;
    onSolve: (puzzleId: string) => void;
    onExit: () => void;
}

export default function DestinationScene({ destination: d, inventory, solved, onClaim, onSolve, onExit }: Props) {
    const character = useGameStore((s) => s.character);
    const [open, setOpen] = useState<number>(0);
    const [puzzleOpen, setPuzzleOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'world' | 'lore'>('world');
    const questDone = !d.puzzle || solved.includes(d.puzzle.id);
    const cleared = character.cleared;

    // Map POIs to respective components
    const renderMiniWorld = () => {
        const props = {
            character,
            isSolved: questDone,
            onSolve: () => {
                if (d.puzzle) onSolve(d.puzzle.id);
            },
            onClaim: () => {
                onClaim(d.relics[0].id);
            },
            onExit: onExit
        };

        switch (d.poiId) {
            case 'dest_eden':
                return <EdenWorld {...props} />;
            case 'dest_fair':
                return <StLouisWorld {...props} />;
            case 'dest_giza':
                return <GizaWorld {...props} />;
            case 'dest_kolbrin':
                return <KolbrinWorld {...props} />;
            case 'dest_emerald':
                return <EmeraldWorld {...props} />;
            default:
                return null;
        }
    };

    return (
        <div
            className="absolute inset-0 z-40 overflow-y-auto custom-scrollbar flex flex-col"
            style={{ background: `radial-gradient(circle at 50% -5%, ${d.accent}22, transparent 55%), linear-gradient(180deg, ${d.bg[0]} 0%, ${d.bg[1]} 100%)` }}
        >
            {/* sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ background: `${d.bg[1]}cc`, backdropFilter: 'blur(6px)' }}>
                <button onClick={onExit} className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:text-white">
                    <ArrowLeft className="w-4 h-4" /> Return
                </button>

                {/* Explore / Lore Toggle tabs */}
                <div className="flex items-center gap-2 bg-black/40 p-0.5 rounded-lg border border-white/5">
                    <button 
                        onClick={() => setViewMode('world')} 
                        className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'world' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                    >
                        Explore
                    </button>
                    <button 
                        onClick={() => setViewMode('lore')} 
                        className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'lore' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                    >
                        Records
                    </button>
                </div>

                <span className="text-[9px] font-mono uppercase tracking-widest hidden sm:inline" style={{ color: d.accent }}>{d.era}</span>
            </div>

            {/* Interactive World View */}
            {viewMode === 'world' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 w-full max-w-xl mx-auto">
                    {renderMiniWorld()}
                </div>
            ) : (
                /* Lore & Records View */
                <div className="max-w-xl mx-auto px-5 pt-6 pb-28 w-full">
                    <p className="text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: d.accent }}>
                        {d.kind === 'portal' ? 'Portal' : 'Cavern'}
                    </p>
                    <h1 className="font-ritual text-3xl md:text-4xl font-black text-white leading-tight mb-6">{d.name}</h1>

                    {/* guide */}
                    <div className="glass-panel rounded-2xl p-4 flex items-center gap-4 mb-5 border" style={{ borderColor: d.accent + '33' }}>
                        <div className="relative flex items-center justify-center shrink-0" style={{ width: 72, height: 72 }}>
                            <div className="absolute rounded-full" style={{ width: 72, height: 72, background: `radial-gradient(circle, ${d.accent}44, transparent 68%)` }} />
                            <KenneySprite {...ROGUELIKE_CHAR} col={d.guide.tile.col} row={d.guide.tile.row} scale={4} style={{ position: 'relative' }} />
                        </div>
                        <div>
                            <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: d.accent }}>{d.guide.role}</p>
                            <h3 className="font-ritual text-xl text-white">{d.guide.name}</h3>
                        </div>
                    </div>

                    {/* intro */}
                    <div className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-8">
                        <p className="font-ritual italic text-white/90 leading-relaxed">“{d.guide.intro}”</p>
                    </div>

                    {/* lore accordion */}
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">{d.guide.name} speaks</p>
                    <div className="space-y-2 mb-9">
                        {d.lore.map((s, i) => {
                            const isOpen = open === i;
                            return (
                                <div key={i} className="rounded-2xl border overflow-hidden" style={{ borderColor: isOpen ? d.accent + '44' : 'rgba(255,255,255,0.08)', background: isOpen ? d.accent + '0d' : 'rgba(255,255,255,0.02)' }}>
                                    <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full flex items-center justify-between p-4 text-left">
                                        <span className="font-ritual text-base text-white">{s.heading}</span>
                                        <ChevronDown className="w-4 h-4 transition-transform" style={{ color: d.accent, transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                                    </button>
                                    {isOpen && <p className="px-4 pb-4 text-sm text-zinc-300 leading-relaxed">{s.body}</p>}
                                </div>
                            );
                        })}
                </div>

                {/* revisit lore — after the guardian falls */}
                {cleared.includes(d.poiId) && d.deepLore && (
                    <div className="mb-8 rounded-2xl border p-5" style={{ borderColor: d.accent + '33', background: d.accent + '08' }}>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: d.accent }}>On Second Passing</p>
                        <h4 className="font-ritual text-lg text-white mb-2">{d.deepLore.heading}</h4>
                        <p className="text-sm text-zinc-300 leading-relaxed">{d.deepLore.body}</p>
                    </div>
                )}

                {/* quest gate, then relics */}
                    {d.puzzle && !questDone ? (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">The Quest</p>
                            <button
                                onClick={() => setPuzzleOpen(true)}
                                className="w-full text-left rounded-2xl border p-5 transition-transform hover:scale-[1.01]"
                                style={{ borderColor: d.accent + '44', background: d.accent + '0d' }}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <PuzzleIcon className="w-4 h-4" style={{ color: d.accent }} />
                                        <h4 className="font-ritual text-lg text-white">{d.puzzle.title}</h4>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest shrink-0" style={{ color: d.accent }}>Solve →</span>
                                </div>
                                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">A riddle of this place guards its relic. Solve it, and what lies here is yours.</p>
                            </button>
                            <div className="mt-3 flex items-center gap-2 text-zinc-600 text-[11px]">
                                <Lock className="w-3.5 h-3.5" /> {d.relics.length} relic{d.relics.length === 1 ? '' : 's'} locked behind the quest
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Relics of this place</p>
                            <div className="space-y-3">
                                {d.relics.map((r) => {
                                    const have = inventory.includes(r.id);
                                    return (
                                        <div key={r.id} className="glass bg-white/[0.03] border rounded-2xl p-4 flex items-center gap-4" style={{ borderColor: have ? d.accent + '44' : 'rgba(255,255,255,0.1)' }}>
                                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: d.accent + '14', border: `1px solid ${d.accent}44`, color: d.accent }}>
                                                <Gem className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white">{r.name}</h4>
                                                <p className="text-[11px] text-zinc-400 leading-relaxed">{r.desc}</p>
                                            </div>
                                            {have ? (
                                                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0" style={{ color: d.accent }}>
                                                    <Check className="w-3.5 h-3.5" /> Claimed
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => onClaim(r.id)}
                                                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg text-black shrink-0"
                                                    style={{ background: d.accent }}
                                                >
                                                    Claim
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* the puzzle quest backup */}
            {puzzleOpen && d.puzzle && (
                <PuzzleScene
                    puzzle={d.puzzle}
                    accent={d.accent}
                    insightHint={puzzleHintFor(character, d.puzzle.id, d.puzzle.hint)}
                    onSolve={() => { onSolve(d.puzzle!.id); setPuzzleOpen(false); }}
                    onExit={() => setPuzzleOpen(false)}
                />
            )}
        </div>
    );
}
