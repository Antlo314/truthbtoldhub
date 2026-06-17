'use client';

import { useState } from 'react';
import { FlaskConical, Hammer } from 'lucide-react';
import { useGameStore } from '@/lib/store/useGameStore';
import {
    canAffordCost,
    canCraftConsumable,
    consumableStock,
    formatConsumableEffect,
    formatMaterialCost,
    MAX_CONSUMABLE_STACK,
    visibleConsumables,
} from '@/lib/game/consumables';
import { sfx } from '@/lib/game/sfx';

interface Props {
    onOpenForge?: () => void;
    onCrafted?: (name: string, effect: string) => void;
}

export default function HutConsumableCraft({ onOpenForge, onCrafted }: Props) {
    const character = useGameStore((s) => s.character);
    const craftConsumable = useGameStore((s) => s.craftConsumable);
    const saveToCloud = useGameStore((s) => s.saveToCloud);
    const [brewing, setBrewing] = useState<string | null>(null);

    const recipes = visibleConsumables(character);
    const armed = !!character.equipped.weapon;

    if (!armed) {
        return (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/[0.08] p-4 mb-4">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/70 mb-1">Hut Crafting</p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                    Forge your first weapon before Truth will brew tonics for the road.
                </p>
                {onOpenForge && (
                    <button
                        type="button"
                        onClick={onOpenForge}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-black"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                    >
                        <Hammer className="w-3.5 h-3.5" /> Open the Forge
                    </button>
                )}
            </div>
        );
    }

    const handleCraft = async (id: string) => {
        if (brewing || !canCraftConsumable(character, id)) return;
        setBrewing(id);
        sfx.pickup();
        setTimeout(async () => {
            const def = recipes.find((r) => r.id === id);
            const ok = craftConsumable(id);
            if (ok && def) {
                onCrafted?.(def.name, formatConsumableEffect(def.effect));
                await saveToCloud();
            }
            setBrewing(null);
        }, 900);
    };

    return (
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] via-black/35 to-black/50 p-4 mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <FlaskConical className="w-3.5 h-3.5 text-emerald-300/80" />
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-300/75">Hut Crafting</p>
                    </div>
                    <p className="font-ritual text-base text-white leading-tight">Road Tonics</p>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        Brew here, carry in your satchel, drink before the next fight.
                    </p>
                </div>
                {onOpenForge && (
                    <button
                        type="button"
                        onClick={onOpenForge}
                        className="shrink-0 text-[8px] font-black uppercase tracking-widest text-aether-gold/80 hover:text-aether-gold border border-aether-gold/25 rounded-lg px-2 py-1.5"
                    >
                        Forge ↗
                    </button>
                )}
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-0.5">
                {recipes.map((def) => {
                    const stock = consumableStock(character, def.id);
                    const canCraft = canCraftConsumable(character, def.id);
                    const afford = canAffordCost(character, def.cost);
                    const full = stock >= MAX_CONSUMABLE_STACK;

                    return (
                        <article
                            key={def.id}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                            style={{ borderLeftWidth: 2, borderLeftColor: `${def.accent}55` }}
                        >
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-sm text-white leading-tight">{def.name}</h4>
                                <span className="text-[9px] font-mono tabular-nums text-zinc-500 shrink-0">
                                    ×{stock}/{MAX_CONSUMABLE_STACK}
                                </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-snug mb-2">{def.desc}</p>
                            <p className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: def.accent }}>
                                {formatConsumableEffect(def.effect)} · next fight
                            </p>
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-[9px] ${afford ? 'text-zinc-500' : 'text-rose-400/90'}`}>
                                    {formatMaterialCost(def.cost)}
                                </span>
                                <button
                                    type="button"
                                    disabled={brewing !== null || !canCraft}
                                    onClick={() => handleCraft(def.id)}
                                    className="shrink-0 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-black disabled:opacity-35 disabled:pointer-events-none"
                                    style={{ background: canCraft ? 'linear-gradient(135deg,#6ee7b7 0%,#059669 100%)' : 'rgba(255,255,255,0.15)' }}
                                >
                                    {brewing === def.id ? 'Brewing…' : full ? 'Satchel full' : 'Brew'}
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}