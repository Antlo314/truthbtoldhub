'use client';

import Link from 'next/link';
import { Check, Crown, Lock, Sparkles, Zap, Globe, BookOpen, X } from 'lucide-react';
import type { GameCharacter, GamePath } from '@/lib/store/useGameStore';
import { PATH_BY_ID, type SkillKind } from '@/lib/game/paths';
import { ABILITY_BY_ID } from '@/lib/game/abilities';
import { Eye, Shield, ScrollText, Sparkles as SparkIcon } from 'lucide-react';

const ICONS = { eye: Eye, shield: Shield, scroll: ScrollText, spark: SparkIcon } as const;

const KIND_STYLE: Record<SkillKind, { label: string; Icon: typeof Zap }> = {
    passive: { label: 'Passive', Icon: Sparkles },
    ability: { label: 'Ability', Icon: Zap },
    super: { label: 'Super', Icon: Crown },
};

interface Props {
    character: GameCharacter;
    onLearn: (id: string) => void;
    onClose?: () => void;
    showEnterWorld?: boolean;
}

export default function AttunementPanel({ character, onLearn, onClose, showEnterWorld }: Props) {
    const active = character.path ? PATH_BY_ID[character.path] : null;
    if (!active) {
        return (
            <div className="p-6 text-center">
                <p className="text-sm text-zinc-400">No path embraced yet.</p>
                <Link href="/awakening/path" className="inline-block mt-4 text-[10px] font-black uppercase tracking-widest text-aether-gold">Choose your path →</Link>
            </div>
        );
    }

    const PathIcon = ICONS[active.icon];
    const learned = character.skills.length;
    const total = active.skills.length;
    const abilitiesLearned = active.skills.filter((n) => (n.kind === 'ability' || n.kind === 'super') && character.skills.includes(n.id)).length;
    const abilityTotal = active.skills.filter((n) => n.kind === 'ability' || n.kind === 'super').length;

    return (
        <div className="flex flex-col h-full max-h-[88dvh]">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0" style={{ borderColor: `${active.color}55`, background: `${active.color}14`, color: active.color }}>
                        <PathIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] tracking-[0.35em] uppercase" style={{ color: active.color }}>Attunement Tree</p>
                        <h2 className="font-ritual text-lg text-white truncate">{active.name}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ borderColor: `${active.color}40`, background: `${active.color}10` }}>
                        <Sparkles className="w-3 h-3" style={{ color: active.color }} />
                        <span className="text-[11px] font-black" style={{ color: active.color }}>{character.skillPoints}</span>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
                    )}
                </div>
            </div>

            <div className="px-5 py-3 border-b border-white/5 shrink-0">
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5">
                    <span>{learned} / {total} attunements</span>
                    <span>{abilitiesLearned} / {abilityTotal} abilities</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/10">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(learned / total) * 100}%`, background: `linear-gradient(90deg, ${active.color}, ${active.color}88)` }} />
                </div>
                <p className="text-[10px] text-zinc-500 mt-2 leading-snug">Passives strengthen you always. <span style={{ color: active.color }}>Abilities</span> unlock buttons in combat and powers in the world.</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4">
                <div className="flex flex-col items-center gap-0">
                    {active.skills.map((node, i) => {
                        const isLearned = character.skills.includes(node.id);
                        const prereqsMet = (node.requires || []).every((r) => character.skills.includes(r));
                        const learnable = !isLearned && prereqsMet && character.skillPoints > 0;
                        const locked = !isLearned && !prereqsMet;
                        const kind = KIND_STYLE[node.kind];
                        const KindIcon = kind.Icon;
                        const ability = node.abilityId ? ABILITY_BY_ID[node.abilityId] : null;

                        return (
                            <div key={node.id} className="w-full flex flex-col items-center">
                                {i > 0 && <div className="w-px h-3" style={{ background: prereqsMet ? active.color : 'rgba(255,255,255,0.12)' }} />}
                                <div
                                    className={`w-full rounded-xl border p-3 transition-all ${locked ? 'opacity-45' : ''}`}
                                    style={{
                                        borderColor: isLearned ? active.color : node.super ? `${active.color}66` : 'rgba(255,255,255,0.1)',
                                        background: isLearned ? `${active.color}12` : 'rgba(255,255,255,0.03)',
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border" style={{ borderColor: `${active.color}44`, color: active.color, background: `${active.color}10` }}>
                                            {isLearned ? <Check className="w-4 h-4" /> : locked ? <Lock className="w-3.5 h-3.5" /> : <KindIcon className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-ritual text-sm text-white">{node.name}</h3>
                                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full" style={{ background: `${active.color}18`, color: active.color }}>{kind.label}</span>
                                                {node.super && <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-aether-gold/20 text-aether-gold">Super</span>}
                                            </div>
                                            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{node.desc}</p>
                                            {node.combat && (
                                                <p className="text-[9px] font-black uppercase tracking-widest mt-1.5" style={{ color: active.color }}>⚔ {node.combat.label}</p>
                                            )}
                                            {ability && (
                                                <div className="mt-2 flex flex-wrap gap-2 text-[8px] uppercase tracking-widest">
                                                    {ability.scope === 'combat' && <span className="px-2 py-0.5 rounded-full border border-red-400/30 text-red-300/90">Combat · {ability.cooldownSec}s cd</span>}
                                                    {ability.scope === 'world' && <span className="px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-300/90 flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> World</span>}
                                                    {ability.scope === 'puzzle' && <span className="px-2 py-0.5 rounded-full border border-purple-400/30 text-purple-300/90 flex items-center gap-1"><BookOpen className="w-2.5 h-2.5" /> Riddles</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="shrink-0 self-center">
                                            {isLearned ? (
                                                <span className="text-[10px] font-black" style={{ color: active.color }}>✦</span>
                                            ) : learnable ? (
                                                <button onClick={() => onLearn(node.id)} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-black" style={{ background: active.color }}>Learn</button>
                                            ) : (
                                                <span className="text-[9px] uppercase tracking-widest text-zinc-600">{locked ? 'Locked' : '1 pt'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showEnterWorld && (
                <div className="px-5 py-4 border-t border-white/10 shrink-0">
                    <Link href="/world" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                        Enter the Cavern →
                    </Link>
                </div>
            )}
        </div>
    );
}