'use client';

import { useState } from 'react';
import KenneySprite, { ROGUELIKE_CHAR, TRUTH_TILE } from '@/components/game/KenneySprite';
import { STARTER_WEAPONS, WEAPON_BY_ID } from '@/lib/game/weapons';
import { Hammer, X } from 'lucide-react';

export default function WeaponForge({ onForge, onClose }: { onForge: (id: string) => void; onClose?: () => void }) {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <div
            className="absolute inset-0 z-50 overflow-y-auto custom-scrollbar"
            style={{ background: 'radial-gradient(circle at 50% -5%, rgba(251,191,36,0.14), transparent 55%), linear-gradient(180deg,#0a0803,#05060a)' }}
        >
            <div className="max-w-xl mx-auto px-5 pt-8 pb-28 relative">
                {onClose && (
                    <button onClick={onClose} className="absolute top-6 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                )}
                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-2">Truth's First Lesson</p>
                <h1 className="font-ritual text-3xl md:text-4xl font-black gold-shimmer mb-6">Forge Your First Weapon</h1>

                {/* Truth */}
                <div className="glass-panel rounded-2xl p-4 flex items-start gap-4 mb-7 border border-[rgba(251,191,36,0.2)]">
                    <div className="relative flex items-center justify-center shrink-0" style={{ width: 64, height: 64 }}>
                        <div className="absolute rounded-full" style={{ width: 64, height: 64, background: 'radial-gradient(circle, rgba(251,191,36,0.3), transparent 68%)' }} />
                        <KenneySprite {...ROGUELIKE_CHAR} {...TRUTH_TILE} scale={4} style={{ position: 'relative' }} />
                    </div>
                    <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-aether-gold/70">Truth</p>
                        <p className="font-ritual italic text-white/90 text-sm leading-relaxed mt-1">
                            “You will not reach the Source without passing through what guards the way. Hear me well: these weapons strike the spirit, never the flesh. They cut what binds a soul — fear, the lie, the shades of the unwilling dead. Choose the form that fits your hand, and forge it.”
                        </p>
                    </div>
                </div>

                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Find or build</p>
                <div className="space-y-3">
                    {STARTER_WEAPONS.map((w) => {
                        const sel = selected === w.id;
                        return (
                            <button
                                key={w.id}
                                onClick={() => setSelected(w.id)}
                                className="w-full text-left rounded-2xl border p-5 transition-all"
                                style={{ borderColor: sel ? '#fbbf24' : 'rgba(255,255,255,0.1)', background: sel ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)' }}
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-ritual text-xl text-white">{w.name}</h3>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-aether-gold">⚔ {w.damage}</span>
                                </div>
                                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{w.flavor}</p>
                                <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed"><span className="text-aether-gold/70 font-bold uppercase tracking-widest text-[9px]">How · </span>{w.forge}</p>
                            </button>
                        );
                    })}
                </div>

                {selected && (
                    <button
                        onClick={() => onForge(selected)}
                        className="w-full mt-7 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                    >
                        <Hammer className="w-4 h-4" /> Forge {WEAPON_BY_ID[selected].name}
                    </button>
                )}
            </div>
        </div>
    );
}
