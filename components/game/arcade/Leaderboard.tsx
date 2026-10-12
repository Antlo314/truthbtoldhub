'use client';

import { Crown, Medal, Trophy } from 'lucide-react';
import type { LeaderRow } from '@/lib/game/arcade';

interface Props {
    rows: LeaderRow[];
    accent: string;
    loading?: boolean;
    emptyLabel?: string;
    /** secondary count noun, e.g. 'lines' or 'orbs' */
    metric?: string;
    /** prefix for the level field (default 'Lv'; e.g. 'Try' for attempts) */
    levelLabel?: string;
}

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="h-4 w-4" style={{ color: '#fcd34d' }} />;
    if (rank === 2) return <Medal className="h-4 w-4 text-zinc-300" />;
    if (rank === 3) return <Medal className="h-4 w-4" style={{ color: '#d6915a' }} />;
    return <span className="w-4 text-center text-[12px] tabular-nums text-white/40">{rank}</span>;
}

export default function Leaderboard({ rows, accent, loading, emptyLabel, metric = 'lines', levelLabel = 'Lv' }: Props) {
    if (loading) {
        return (
            <div className="space-y-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[46px] animate-pulse rounded-xl bg-white/[0.04]" />
                ))}
            </div>
        );
    }
    if (rows.length === 0) {
        return (
            <div className="py-8 text-center">
                <Trophy className="mx-auto mb-2 h-7 w-7 text-white/20" />
                <p className="text-[13px] text-white/50">{emptyLabel || 'No scores yet — be the first to climb.'}</p>
            </div>
        );
    }
    return (
        <div className="space-y-1">
            {rows.map((r) => (
                <div
                    key={`${r.user_id ?? r.player_name}-${r.rank}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2"
                    style={{ background: r.isYou ? `${accent}1f` : r.rank <= 3 ? 'rgba(255,255,255,0.045)' : 'transparent' }}
                >
                    <div className="flex w-5 shrink-0 items-center justify-center">
                        <RankBadge rank={r.rank} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-white/90">
                            {r.player_name}
                            {r.isYou && (
                                <span className="ml-2 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-black" style={{ background: accent }}>
                                    You
                                </span>
                            )}
                        </p>
                        <p className="text-[11.5px] text-white/40">
                            {levelLabel} {r.level} · {r.lines} {metric}
                        </p>
                    </div>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums" style={{ color: r.rank === 1 ? '#fcd34d' : accent }}>
                        {r.score.toLocaleString()}
                    </p>
                </div>
            ))}
        </div>
    );
}
