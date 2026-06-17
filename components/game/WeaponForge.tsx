'use client';

import { useState } from 'react';
import TruthSprite from '@/components/game/TruthSprite';
import { useGameStore } from '@/lib/store/useGameStore';
import { WEAPON_TIERS, WEAPON_BY_ID, type Weapon } from '@/lib/game/weapons';
import { Hammer, X, Gem, Flame } from 'lucide-react';
import { sfx } from '@/lib/game/sfx';
import { truthForgeLine } from '@/lib/game/truthVoice';

export default function WeaponForge({ onForge, onClose }: { onForge: (id: string) => void; onClose?: () => void }) {
    const character = useGameStore((s) => s.character);
    const spendMaterials = useGameStore((s) => s.spendMaterials);
    const saveToCloud = useGameStore((s) => s.saveToCloud);
    const [forging, setForging] = useState(false);

    const currentWeaponId = character.equipped.weapon;
    const currentWeapon = currentWeaponId ? WEAPON_BY_ID[currentWeaponId] : null;

    // Find next weapon index
    const currentIdx = currentWeaponId ? WEAPON_TIERS.findIndex(w => w.id === currentWeaponId) : -1;
    const nextWeapon: Weapon | null = currentIdx < WEAPON_TIERS.length - 1 ? WEAPON_TIERS[currentIdx + 1] : null;

    // Materials backpack
    const mats = character.materials || { iron: 0, copper: 0, cosmic: 0 };

    // Cost checks
    const hasEnoughMats = () => {
        if (!nextWeapon || !nextWeapon.cost) return true;
        const reqIron = nextWeapon.cost.iron || 0;
        const reqCopper = nextWeapon.cost.copper || 0;
        const reqCosmic = nextWeapon.cost.cosmic || 0;
        return mats.iron >= reqIron && mats.copper >= reqCopper && mats.cosmic >= reqCosmic;
    };

    const handleUpgrade = async () => {
        if (!nextWeapon) return;
        if (!hasEnoughMats()) return;

        setForging(true);
        sfx.strike();
        setTimeout(async () => {
            sfx.hit();
            // Spend
            if (nextWeapon.cost) {
                spendMaterials(nextWeapon.cost);
            }
            // Forge/Equip
            onForge(nextWeapon.id);
            await saveToCloud();
            setForging(false);
        }, 1200);
    };

    return (
        <div
            className="absolute inset-0 z-50 overflow-y-auto custom-scrollbar flex flex-col justify-between"
            style={{ background: 'radial-gradient(circle at 50% -5%, rgba(251,191,36,0.18), transparent 60%), linear-gradient(180deg,#090703,#030408)' }}
        >
            <div className="max-w-xl mx-auto px-5 pt-8 pb-28 relative w-full flex-1">
                {onClose && (
                    <button onClick={onClose} className="absolute top-6 right-5 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-2">Truth's Forge</p>
                <h1 className="font-ritual text-3xl md:text-4xl font-black gold-shimmer mb-6">Forge & Smelt</h1>

                {/* Guide Dialogue */}
                <div className="glass-panel rounded-2xl p-4 flex items-start gap-4 mb-7 border border-[rgba(251,191,36,0.2)] bg-amber-950/10">
                    <div className="relative flex items-center justify-center shrink-0" style={{ width: 64, height: 96 }}>
                        <div className="absolute rounded-full" style={{ width: 72, height: 72, top: '10%', background: 'radial-gradient(circle, rgba(251,191,36,0.3), transparent 68%)' }} />
                        <TruthSprite scale={4} style={{ position: 'relative' }} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-aether-gold/70">Truth</p>
                        <p className="font-ritual italic text-white/90 text-sm leading-relaxed mt-1">
                            {truthForgeLine(character, !!currentWeapon)}
                        </p>
                    </div>
                </div>

                {/* Materials Backpack View */}
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Your Materials</p>
                <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">
                    Iron Ore — Giza tomb · Copper Sheets — St. Louis Fair · Cosmic Shards — Emerald Halls
                </p>
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="glass bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                        <span className="block text-[8px] uppercase tracking-widest text-zinc-500 mb-1">Iron Ore</span>
                        <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            <span className="text-base font-bold text-white">{mats.iron || 0}</span>
                        </div>
                    </div>
                    <div className="glass bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                        <span className="block text-[8px] uppercase tracking-widest text-zinc-500 mb-1">Copper Sheets</span>
                        <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-600" />
                            <span className="text-base font-bold text-white">{mats.copper || 0}</span>
                        </div>
                    </div>
                    <div className="glass bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                        <span className="block text-[8px] uppercase tracking-widest text-zinc-500 mb-1">Cosmic Shards</span>
                        <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-base font-bold text-white">{mats.cosmic || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Weapons Crafting Details */}
                <div className="space-y-4">
                    {/* Current weapon stats */}
                    {currentWeapon && (
                        <div className="glass bg-amber-950/[0.08] border border-amber-500/20 rounded-2xl p-5">
                            <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold">Currently Equipped</span>
                            <div className="flex items-center justify-between mt-1">
                                <h3 className="font-ritual text-xl text-white">{currentWeapon.name}</h3>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">⚔ {currentWeapon.damage} might</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{currentWeapon.flavor}</p>
                        </div>
                    )}

                    {/* Next weapon upgrade path */}
                    {nextWeapon ? (
                        <div className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Next Available Upgrade</span>
                            <div className="flex items-center justify-between mt-1">
                                <h3 className="font-ritual text-xl text-white">{nextWeapon.name}</h3>
                                <span className="text-[10px] font-black uppercase tracking-widest text-aether-gold">⚔ {nextWeapon.damage} might</span>
                            </div>
                            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{nextWeapon.flavor}</p>
                            <p className="text-[11px] text-zinc-400 mt-2 italic"><span className="text-aether-gold/80 font-bold uppercase tracking-widest text-[9px] not-italic">How · </span>{nextWeapon.forge}</p>

                            {/* Cost display */}
                            {nextWeapon.cost && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 block mb-2">Required Materials</span>
                                    <div className="flex flex-wrap gap-4">
                                        {(nextWeapon.cost.iron || 0) > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="w-2.5 h-2.5 rounded bg-slate-500 shrink-0" />
                                                <span className={mats.iron >= (nextWeapon.cost.iron || 0) ? 'text-emerald-400' : 'text-rose-400'}>
                                                    Iron Ore: {mats.iron}/{nextWeapon.cost.iron || 0}
                                                </span>
                                            </div>
                                        )}
                                        {(nextWeapon.cost.copper || 0) > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="w-2.5 h-2.5 rounded bg-amber-600 shrink-0" />
                                                <span className={mats.copper >= (nextWeapon.cost.copper || 0) ? 'text-emerald-400' : 'text-rose-400'}>
                                                    Copper Sheets: {mats.copper}/{nextWeapon.cost.copper || 0}
                                                </span>
                                            </div>
                                        )}
                                        {(nextWeapon.cost.cosmic || 0) > 0 && (
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="w-2.5 h-2.5 rounded bg-emerald-400 shrink-0" />
                                                <span className={mats.cosmic >= (nextWeapon.cost.cosmic || 0) ? 'text-emerald-400' : 'text-rose-400'}>
                                                    Cosmic Shards: {mats.cosmic}/{nextWeapon.cost.cosmic || 0}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="glass bg-emerald-950/[0.08] border border-emerald-500/20 rounded-2xl p-5 text-center">
                            <Gem className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                            <h3 className="font-ritual text-xl text-white">Ultimate Weapon Attained</h3>
                            <p className="text-xs text-emerald-400/80 mt-1">The Sword of Light burns bright. You hold the final weapon of the Source.</p>
                        </div>
                    )}
                </div>

                {/* Forge Button */}
                {nextWeapon && (
                    <button
                        onClick={handleUpgrade}
                        disabled={forging || !hasEnoughMats()}
                        className="w-full mt-7 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 30px rgba(251,191,36,0.15)' }}
                    >
                        {forging ? (
                            <>
                                <Flame className="w-4 h-4 animate-bounce text-amber-500" />
                                Smelting & Forging...
                            </>
                        ) : (
                            <>
                                <Hammer className="w-4 h-4" />
                                {currentWeapon ? `Forge ${nextWeapon.name}` : `Forge Starter ${nextWeapon.name}`}
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
