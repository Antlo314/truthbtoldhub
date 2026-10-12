'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Crown, Play } from 'lucide-react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import {
    LIVE_GAMES, ARCADE_PRIZE, currentSeason, seasonLabel, daysLeftInSeason,
    fetchLeaderboard, fetchPersonalBest, fetchPersonalStats, fetchPastChampions, submitScore,
    type LeaderRow, type ArcadeGameDef, type PersonalStats, type PastChampion,
} from '@/lib/game/arcade';
import { unlockArcadeAudio } from '@/lib/game/arcadeSfx';
import { hubAudio } from '@/lib/truthos/hubAudio';
import TetrisGame from '@/components/game/arcade/TetrisGame';
import SnakeGame from '@/components/game/arcade/SnakeGame';
import VeilGame from '@/components/game/arcade/VeilGame';
import Leaderboard from '@/components/game/arcade/Leaderboard';
import GameArt from '@/components/game/arcade/GameArt';

// The 3D runner pulls in three.js — only load it when someone runs
const AscentGame = dynamic(() => import('@/components/game/arcade/AscentGame'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#0b0820] text-[13px] text-white/55">
            Raising the road…
        </div>
    ),
});

/**
 * The Arcade — a launcher, not a menu. The selected game fills the hero
 * with its own art and one Play button; the shelf below switches games;
 * the leaderboard, your record and the season's crown sit under that.
 * Scores are the fixed three ints (score / lines / level) per game.
 */

interface Props {
    character: GameCharacter;
    onClose: () => void;
}

type GameResult = { score: number; lines: number; level: number };

/**
 * No header of its own: the lobby always lives inside something that
 * already has one — a Truth.OS window, or the house's panel with its
 * Close button — and a second "Back · Arcade" bar was the same chrome
 * twice. `onClose` stays in the props for callers that hold it.
 */
export default function ArcadeLobby({ character }: Props) {
    const profile = useSoulStore((s) => s.profile);
    const playerName = character.name?.trim() || profile?.display_name?.trim() || 'A soul';

    const [view, setView] = useState<'lobby' | 'playing'>('lobby');
    const [game, setGame] = useState<ArcadeGameDef>(LIVE_GAMES[0]);
    const [scope, setScope] = useState<'current' | 'all'>('current');
    const seasonKey = scope === 'current' ? currentSeason() : 'all';

    const [rows, setRows] = useState<LeaderRow[]>([]);
    const [loadingBoard, setLoadingBoard] = useState(true);
    const [best, setBest] = useState<number | null>(null);
    const [stats, setStats] = useState<PersonalStats | null>(null);
    const [champs, setChamps] = useState<PastChampion[]>([]);

    const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [submitMessage, setSubmitMessage] = useState<string | undefined>(undefined);
    const [isNewBest, setIsNewBest] = useState(false);

    const loadBoard = useCallback(async () => {
        setLoadingBoard(true);
        const [b, pb, ps] = await Promise.all([
            fetchLeaderboard(game.id, seasonKey),
            fetchPersonalBest(game.id, seasonKey),
            fetchPersonalStats(game.id, seasonKey),
        ]);
        setRows(b);
        setBest(pb);
        setStats(ps);
        setLoadingBoard(false);
    }, [game.id, seasonKey]);

    useEffect(() => {
        loadBoard();
    }, [loadBoard]);

    useEffect(() => {
        let alive = true;
        fetchPastChampions(game.id, 3).then((c) => {
            if (alive) setChamps(c);
        });
        return () => {
            alive = false;
        };
    }, [game.id]);

    useEffect(() => {
        hubAudio.arcadeLobby();
    }, []);

    const play = (g: ArcadeGameDef) => {
        if (!g.live) return;
        unlockArcadeAudio();
        setGame(g);
        setSubmitState('idle');
        setSubmitMessage(undefined);
        setIsNewBest(false);
        setView('playing');
        if (g.id === 'tetra' || g.id === 'serpent' || g.id === 'veil' || g.id === 'ascent') hubAudio.arcadeGame(g.id);
    };

    const handleGameOver = useCallback(
        async (r: GameResult) => {
            setSubmitState('saving');
            setIsNewBest(r.score > (best ?? -1));
            try {
                await submitScore({ game: game.id, score: r.score, lines: r.lines, level: r.level }, playerName);
                setSubmitState('saved');
                setSubmitMessage(`✦ Recorded · ${seasonLabel(currentSeason())}`);
            } catch (e) {
                setSubmitState('error');
                setSubmitMessage(e instanceof Error ? e.message : 'Could not record score.');
            }
            loadBoard();
        },
        [game.id, best, playerName, loadBoard],
    );

    const handleReset = useCallback(() => {
        setSubmitState('idle');
        setSubmitMessage(undefined);
        setIsNewBest(false);
    }, []);

    if (view === 'playing') {
        const common = {
            accent: game.accent,
            onExit: () => {
                setView('lobby');
                hubAudio.arcadeLobby();
            },
            onGameOver: handleGameOver,
            onReset: handleReset,
            submitState,
            submitMessage,
            isNewBest,
        };
        if (game.id === 'serpent') return <SnakeGame {...common} />;
        if (game.id === 'veil') return <VeilGame {...common} />;
        if (game.id === 'ascent') return <AscentGame {...common} />;
        return <TetrisGame {...common} />;
    }

    const champion = rows[0] ?? null;
    const daysLeft = daysLeftInSeason();
    const acc = game.accent;

    return (
        <div className="@container absolute inset-0 z-[55] overflow-y-auto overscroll-contain bg-[#0a0b11] text-white">
            <div className="mx-auto max-w-5xl px-4 pb-16 pt-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                {/* hero */}
                <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/10">
                    <div className="aspect-[4/3] @[560px]:aspect-[21/9]">
                        <GameArt game={game.id} accent={acc} />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1.5 text-[12px] text-white/80 backdrop-blur-md">
                        {seasonLabel(currentSeason())} · {daysLeft}d left
                    </span>
                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 @[560px]:flex-row @[560px]:items-end @[560px]:justify-between @[560px]:p-7">
                        <div className="max-w-md">
                            <p className="text-[12px] font-medium" style={{ color: acc }}>
                                {game.id === 'ascent' ? '3D · Runner' : game.id === 'veil' ? 'Rhythm runner' : game.id === 'serpent' ? 'Arcade classic' : 'Puzzle'}
                            </p>
                            <h2 className="mt-0.5 text-[36px] font-black leading-none tracking-tight @[560px]:text-[46px]">{game.title}</h2>
                            <p className="mt-2 text-[14px] leading-snug text-white/75">{game.tagline}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {(stats?.best ?? best) != null && (
                                <div className="text-right">
                                    <p className="text-[11.5px] text-white/55">Your best</p>
                                    <p className="text-[18px] font-semibold tabular-nums">{(stats?.best ?? best ?? 0).toLocaleString()}</p>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => play(game)}
                                className="flex h-12 items-center gap-2 rounded-full px-7 text-[15px] font-semibold text-black shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] transition-transform hover:scale-[1.03] active:scale-95"
                                style={{ background: acc }}
                            >
                                <Play size={17} fill="currentColor" /> Play
                            </button>
                        </div>
                    </div>
                </div>

                {/* shelf */}
                <div className="mt-4 grid grid-cols-2 gap-3 @[560px]:grid-cols-4">
                    {LIVE_GAMES.map((g) => {
                        const on = g.id === game.id;
                        return (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => setGame(g)}
                                onDoubleClick={() => play(g)}
                                className={`group overflow-hidden rounded-2xl text-left transition-[transform,box-shadow] active:scale-[0.98] ${
                                    on ? 'ring-2' : 'ring-1 ring-white/10 hover:ring-white/25'
                                }`}
                                style={on ? { boxShadow: `0 0 0 2px ${g.accent}` } : undefined}
                            >
                                <div className="aspect-[16/10] overflow-hidden">
                                    <div className="h-full w-full transition-transform duration-300 group-hover:scale-105">
                                        <GameArt game={g.id} accent={g.accent} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-white/[0.04] px-3 py-2">
                                    <span className="text-[13.5px] font-semibold">{g.title}</span>
                                    {g.id === 'ascent' && (
                                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-white/80">3D</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* board + record */}
                <div className="mt-6 grid gap-4 @[760px]:grid-cols-[1.4fr_1fr]">
                    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="flex items-center gap-2 text-[15px] font-semibold">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/assets/kenney/game-icons/podium.png" alt="" className="h-5 w-5 opacity-80" />
                                Leaderboard
                            </p>
                            <div className="inline-flex rounded-lg bg-white/[0.07] p-0.5">
                                {(['current', 'all'] as const).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setScope(s)}
                                        className={`min-h-[28px] rounded-md px-3 text-[12px] font-medium ${
                                            scope === s ? 'bg-white/[0.16] text-white' : 'text-white/55 hover:text-white/85'
                                        }`}
                                    >
                                        {s === 'current' ? 'This season' : 'All time'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Leaderboard rows={rows} accent={acc} loading={loadingBoard} metric={game.metric} levelLabel={game.levelLabel} />
                    </section>

                    <div className="space-y-4">
                        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                            <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/assets/kenney/game-icons/medal.png" alt="" className="h-5 w-5 opacity-80" />
                                Your record
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                    ['Best', (stats?.best ?? best ?? 0).toLocaleString()],
                                    ['Runs', stats?.runs != null ? String(stats.runs) : '—'],
                                    ['Average', stats ? stats.avg.toLocaleString() : '—'],
                                ].map(([l, v]) => (
                                    <div key={l} className="rounded-xl bg-white/[0.05] py-2.5">
                                        <p className="text-[11.5px] text-white/45">{l}</p>
                                        <p className="text-[18px] font-semibold tabular-nums">{v}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section
                            className="relative overflow-hidden rounded-2xl border p-4"
                            style={{ borderColor: 'rgba(251,191,36,0.25)', background: 'linear-gradient(150deg, rgba(251,191,36,0.12), rgba(180,83,9,0.05) 60%, transparent)' }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/assets/kenney/game-icons/trophy.png" alt="" className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 opacity-[0.12]" />
                            <p className="text-[12px] font-medium text-amber-200/80">The prize</p>
                            <p className="mt-0.5 text-[16px] font-semibold">{ARCADE_PRIZE.title}</p>
                            <p className="mt-1.5 text-[12.5px] leading-snug text-white/60">{ARCADE_PRIZE.blurb}</p>
                            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-white/80">
                                <Crown size={14} className="text-amber-300" />
                                {champion ? `${champion.player_name} leads ${game.title} · ${champion.score.toLocaleString()}` : `${game.title}’s crown is unclaimed`}
                            </p>
                        </section>

                        {champs.length > 0 && (
                            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                                <p className="mb-2.5 text-[15px] font-semibold">Hall of champions</p>
                                <div className="space-y-1.5">
                                    {champs.map((c) => (
                                        <div key={c.season} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                                            <Crown size={15} className="shrink-0 text-amber-300" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13px]">{c.player_name}</p>
                                                <p className="text-[11.5px] text-white/40">{seasonLabel(c.season)}</p>
                                            </div>
                                            <p className="text-[14px] font-semibold tabular-nums" style={{ color: acc }}>
                                                {c.score.toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
                <p className="mt-6 text-center text-[12px] text-white/35">Scores are tied to your soul. Climb before the season turns.</p>
            </div>
        </div>
    );
}
