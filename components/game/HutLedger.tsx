'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Users, Crown, Footprints } from 'lucide-react';
import { fetchCommunityLedger, type CommunityLedger } from '@/lib/game/hut';
import { fetchWorldPresence } from '@/lib/game/worldPresence';

interface Props {
    characterName?: string;
}

export default function HutLedger({ characterName }: Props) {
    const [ledger, setLedger] = useState<CommunityLedger | null>(null);
    const [walkedToday, setWalkedToday] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        Promise.all([fetchCommunityLedger(), fetchWorldPresence()]).then(([ledgerData, presence]) => {
            if (alive) {
                setLedger(ledgerData);
                setWalkedToday(presence.walkedToday);
                setLoading(false);
            }
        });
        return () => { alive = false; };
    }, []);

    const total = ledger?.totalSouls ?? 0;
    const leaders = ledger?.leaders ?? [];

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-aether-gold/25 bg-gradient-to-br from-aether-gold/10 via-black/40 to-black/60 p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-aether-gold" />
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-aether-gold/80">Souls Awakened</p>
                </div>
                {loading ? (
                    <p className="font-ritual text-3xl text-white/40 animate-pulse">—</p>
                ) : (
                    <p className="font-ritual text-4xl md:text-5xl gold-shimmer tabular-nums">{total.toLocaleString()}</p>
                )}
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                    {characterName ? `${characterName}, you` : 'You'} walk among those who chose to return. Every soul that signs in adds another light in the cavern.
                </p>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Footprints className="w-3.5 h-3.5 text-violet-300/80" />
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-violet-300/70">Walked Today</p>
                </div>
                {loading ? (
                    <p className="font-ritual text-2xl text-white/40 animate-pulse text-center">—</p>
                ) : (
                    <p className="font-ritual text-3xl text-violet-100/95 tabular-nums text-center">
                        {(walkedToday ?? 0).toLocaleString()}
                    </p>
                )}
                <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed text-center">
                    Souls who roamed the cavern today. Faint walkers may appear on your road — you are not alone in the wide grass.
                </p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-aether-gold" />
                        Sovereign Ledger
                    </p>
                    <Link
                        href="/hierarchy"
                        className="text-[9px] font-black uppercase tracking-widest text-aether-gold/80 hover:text-aether-gold"
                    >
                        Full rank ↗
                    </Link>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }, (_, i) => (
                            <div key={i} className="h-10 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : leaders.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-6">The ledger is still forming. Be among the first to walk.</p>
                ) : (
                    <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                        {leaders.map((row) => {
                            const podium = row.rank <= 3;
                            return (
                                <div
                                    key={row.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                                        podium ? 'border-aether-gold/25 bg-aether-gold/[0.06]' : 'border-white/8 bg-white/[0.02]'
                                    }`}
                                >
                                    <span className={`w-6 text-center text-[10px] font-black tabular-nums shrink-0 ${podium ? 'text-aether-gold' : 'text-zinc-500'}`}>
                                        {row.rank === 1 ? <Crown className="w-3.5 h-3.5 mx-auto text-aether-gold" /> : row.rank}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{row.name}</p>
                                        {row.founderNumber != null && (
                                            <p className="text-[8px] uppercase tracking-widest text-zinc-600">Founder #{row.founderNumber}</p>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-mono tabular-nums text-aether-gold/90 shrink-0">
                                        {row.soulPower > 0 ? row.soulPower : '—'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}