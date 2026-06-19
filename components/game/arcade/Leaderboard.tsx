'use client';

import { Crown, Trophy, Medal } from 'lucide-react';
import type { LeaderRow } from '@/lib/game/arcade';

interface Props {
    rows: LeaderRow[];
    accent: string;
    loading?: boolean;
    emptyLabel?: string;
    /** secondary count noun, e.g. 'lines' or 'orbs' */
    metric?: string;
}

function RankBadge({ rank, accent }: { rank: number; accent: string }) {
    if (rank === 1) return <Crown className="w-4 h-4" style={{ color: '#fcd34d' }} />;
    if (rank === 2) return <Medal className="w-4 h-4 text-zinc-300" />;
    if (rank === 3) return <Medal className="w-4 h-4" style={{ color: '#d6915a' }} />;
    return <span className="text-[11px] font-mono text-white/40 w-4 text-center">{rank}</span>;
}

export default function Leaderboard({ rows, accent, loading, emptyLabel, metric = 'lines' }: Props) {
    if (loading) {
        return <p className="text-[11px] text-zinc-500 text-center py-8 font-mono uppercase tracking-widest">Reading the ledger…</p>;
    }
    if (rows.length === 0) {
        return (
            <div className="text-center py-8">
                <Trophy className="w-7 h-7 mx-auto mb-2 text-white/20" />
                <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-widest">{emptyLabel || 'No scores yet — be the first to climb.'}</p>
            </div>
        );
    }
    return (
        <div className="space-y-1.5">
            {rows.map((r) => (
                <div
                    key={`${r.user_id ?? r.player_name}-${r.rank}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                    style={{
                        borderColor: r.isYou ? `${accent}66` : 'rgba(255,255,255,0.07)',
                        background: r.isYou ? `${accent}14` : r.rank <= 3 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                    }}
                >
                    <div className="w-5 flex items-center justify-center shrink-0"><RankBadge rank={r.rank} accent={accent} /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90 font-semibold truncate">
                            {r.player_name}
                            {r.isYou && <span className="ml-2 text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>You</span>}
                        </p>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-white/35">Lv {r.level} · {r.lines} {metric}</p>
                    </div>
                    <p className="font-ritual text-lg shrink-0" style={{ color: r.rank === 1 ? '#fcd34d' : accent }}>{r.score.toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
}
