'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Trophy, Crown, Gamepad2, Clock, ChevronRight, Lock } from 'lucide-react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import {
    ARCADE_GAMES, LIVE_GAMES, ARCADE_PRIZE, currentSeason, seasonLabel, daysLeftInSeason,
    fetchLeaderboard, fetchPersonalBest, fetchPersonalStats, fetchPastChampions, submitScore,
    type LeaderRow, type ArcadeGameDef, type PersonalStats, type PastChampion,
} from '@/lib/game/arcade';
import { unlockArcadeAudio } from '@/lib/game/arcadeSfx';
import TetrisGame from '@/components/game/arcade/TetrisGame';
import SnakeGame from '@/components/game/arcade/SnakeGame';
import VeilGame from '@/components/game/arcade/VeilGame';
import Leaderboard from '@/components/game/arcade/Leaderboard';

// ============================================================
//  THE SANCTUM ARCADE — the lobby. Prize banner, game roster,
//  and a per-game seasonal leaderboard. Tapping a live game
//  drops you into a full-screen play scene; on game over the
//  run is recorded and the board refreshes. Full-screen from
//  Truth's Hut.
// ============================================================

interface Props {
    character: GameCharacter;
    onClose: () => void;
}

type GameResult = { score: number; lines: number; level: number };

export default function ArcadeLobby({ character, onClose }: Props) {
    const profile = useSoulStore((s) => s.profile);
    const playerName = character.name?.trim() || profile?.display_name?.trim() || 'A soul';

    const [view, setView] = useState<'lobby' | 'playing'>('lobby');
    const [activeGame, setActiveGame] = useState<ArcadeGameDef>(LIVE_GAMES[0]);
    const [boardGame, setBoardGame] = useState<ArcadeGameDef>(LIVE_GAMES[0]);
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
            fetchLeaderboard(boardGame.id, seasonKey),
            fetchPersonalBest(boardGame.id, seasonKey),
            fetchPersonalStats(boardGame.id, seasonKey),
        ]);
        setRows(b);
        setBest(pb);
        setStats(ps);
        setLoadingBoard(false);
    }, [boardGame.id, seasonKey]);

    useEffect(() => { loadBoard(); }, [loadBoard]);

    // hall of champions — the crowned souls of finished seasons
    useEffect(() => {
        let alive = true;
        fetchPastChampions(boardGame.id, 3).then((c) => { if (alive) setChamps(c); });
        return () => { alive = false; };
    }, [boardGame.id]);

    const handlePlay = (g: ArcadeGameDef) => {
        if (!g.live) return;
        unlockArcadeAudio();
        setActiveGame(g);
        setBoardGame(g);
        setSubmitState('idle');
        setSubmitMessage(undefined);
        setIsNewBest(false);
        setView('playing');
    };

    const handleGameOver = useCallback(async (r: GameResult) => {
        setSubmitState('saving');
        setIsNewBest(r.score > (best ?? -1));
        try {
            await submitScore({ game: activeGame.id, score: r.score, lines: r.lines, level: r.level }, playerName);
            setSubmitState('saved');
            setSubmitMessage(`✦ Recorded · ${seasonLabel(currentSeason())}`);
        } catch (e) {
            setSubmitState('error');
            setSubmitMessage(e instanceof Error ? e.message : 'Could not record score.');
        }
        loadBoard();
    }, [activeGame.id, best, playerName, loadBoard]);

    const handleReset = useCallback(() => {
        setSubmitState('idle');
        setSubmitMessage(undefined);
        setIsNewBest(false);
    }, []);

    if (view === 'playing') {
        const common = {
            accent: activeGame.accent,
            onExit: () => setView('lobby'),
            onGameOver: handleGameOver,
            onReset: handleReset,
            submitState,
            submitMessage,
            isNewBest,
        };
        return activeGame.id === 'serpent' ? <SnakeGame {...common} />
            : activeGame.id === 'veil' ? <VeilGame {...common} />
            : <TetrisGame {...common} />;
    }

    const champion = rows[0] ?? null;
    const daysLeft = daysLeftInSeason();
    const acc = boardGame.accent;

    return (
        <div
            className="absolute inset-0 z-[55] overflow-y-auto custom-scrollbar"
            style={{
                background:
                    'radial-gradient(120% 60% at 50% -8%, rgba(34,211,238,0.14), transparent 55%), linear-gradient(180deg, #070a12 0%, #05060a 100%)',
            }}
        >
            {/* header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 backdrop-blur-md bg-black/40 border-b border-white/5" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
                <button onClick={onClose} className="p-2.5 rounded-full bg-black/40 border border-white/10 text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Leave the Arcade">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-center pointer-events-none">
                    <p className="text-[9px] tracking-[0.4em] uppercase text-cyan-400/70">Truth.OS House</p>
                    <p className="font-ritual text-lg leading-tight flex items-center gap-2 justify-center text-white">
                        <Gamepad2 className="w-4 h-4 text-cyan-400" /> The Arcade
                    </p>
                </div>
                <div className="w-[44px]" />
            </div>

            <div className="max-w-lg mx-auto px-4 pb-28 pt-5">
                {/* prize banner */}
                <div className="relative rounded-3xl border border-aether-gold/25 p-5 overflow-hidden mb-6" style={{ background: 'linear-gradient(150deg, rgba(252,211,77,0.12), rgba(180,83,9,0.06) 60%, transparent)' }}>
                    <div className="absolute -top-6 -right-4 opacity-15"><Trophy className="w-28 h-28 text-aether-gold" /></div>
                    <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">The Prize</p>
                    <h2 className="font-ritual text-2xl gold-shimmer mb-2">{ARCADE_PRIZE.title}</h2>
                    <p className="text-sm text-zinc-300 leading-relaxed mb-4 max-w-[34ch]">{ARCADE_PRIZE.blurb}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-aether-gold/90 px-2.5 py-1 rounded-full bg-black/30 border border-aether-gold/20">
                            <Clock className="w-3 h-3" /> {seasonLabel(currentSeason())} · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                        </span>
                        {champion ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-white/80 px-2.5 py-1 rounded-full bg-black/30 border border-white/10">
                                <Crown className="w-3 h-3 text-aether-gold" /> {boardGame.title}: {champion.player_name} · {champion.score.toLocaleString()}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-white/50 px-2.5 py-1 rounded-full bg-black/30 border border-white/10">
                                <Crown className="w-3 h-3" /> {boardGame.title} crown unclaimed
                            </span>
                        )}
                    </div>
                </div>

                {/* games */}
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-3">The Games</p>
                <div className="space-y-3 mb-7">
                    {ARCADE_GAMES.map((g) => (
                        <button
                            key={g.id}
                            onClick={() => handlePlay(g)}
                            disabled={!g.live}
                            className="w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-colors disabled:cursor-default"
                            style={{
                                borderColor: g.live ? `${g.accent}44` : 'rgba(255,255,255,0.07)',
                                background: g.live ? `linear-gradient(120deg, ${g.accent}14, rgba(0,0,0,0.25))` : 'rgba(255,255,255,0.015)',
                                opacity: g.live ? 1 : 0.6,
                            }}
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border" style={{ borderColor: `${g.accent}55`, background: `${g.accent}1a`, color: g.accent }}>
                                {g.live ? <Gamepad2 className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-ritual text-lg text-white leading-tight">{g.title}</p>
                                <p className="text-xs text-zinc-400 leading-snug mt-0.5">{g.tagline}</p>
                            </div>
                            {g.live ? (
                                <span className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-black" style={{ background: g.accent }}>
                                    Play <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            ) : (
                                <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest text-white/40">Soon</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* leaderboard */}
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-3">Leaderboard</p>

                {/* game tabs */}
                {LIVE_GAMES.length > 1 && (
                    <div className="flex gap-2 mb-3">
                        {LIVE_GAMES.map((g) => {
                            const on = g.id === boardGame.id;
                            return (
                                <button
                                    key={g.id}
                                    onClick={() => setBoardGame(g)}
                                    className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-colors"
                                    style={on
                                        ? { background: g.accent, borderColor: g.accent, color: '#000' }
                                        : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.25)' }}
                                >
                                    {g.title}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* season scope */}
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: acc }}>{boardGame.title}</p>
                    <div className="flex rounded-full border border-white/10 bg-black/30 p-0.5 text-[9px] font-black uppercase tracking-widest">
                        <button onClick={() => setScope('current')} className={`px-3 py-1 rounded-full transition-colors ${scope === 'current' ? 'text-black' : 'text-white/50'}`} style={scope === 'current' ? { background: acc } : undefined}>Season</button>
                        <button onClick={() => setScope('all')} className={`px-3 py-1 rounded-full transition-colors ${scope === 'all' ? 'text-black' : 'text-white/50'}`} style={scope === 'all' ? { background: acc } : undefined}>All-Time</button>
                    </div>
                </div>

                {(stats || best != null) && (
                    <div className="rounded-xl border px-3 py-2.5 mb-3" style={{ borderColor: `${acc}40`, background: `${acc}10` }}>
                        <p className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: acc }}>Your record · {scope === 'current' ? seasonLabel(currentSeason()) : 'All-Time'}</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-[8px] uppercase tracking-widest text-white/40">Best</p>
                                <p className="font-ritual text-lg leading-tight" style={{ color: acc }}>{(stats?.best ?? best ?? 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[8px] uppercase tracking-widest text-white/40">Runs</p>
                                <p className="font-ritual text-lg leading-tight text-white/85">{stats?.runs ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-[8px] uppercase tracking-widest text-white/40">Average</p>
                                <p className="font-ritual text-lg leading-tight text-white/85">{stats ? stats.avg.toLocaleString() : '—'}</p>
                            </div>
                        </div>
                    </div>
                )}

                <Leaderboard rows={rows} accent={acc} loading={loadingBoard} metric={boardGame.metric} levelLabel={boardGame.levelLabel} />

                {champs.length > 0 && (
                    <div className="mt-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-3">Hall of Champions</p>
                        <div className="space-y-2">
                            {champs.map((c) => (
                                <div key={c.season} className="flex items-center gap-3 rounded-xl border border-aether-gold/20 bg-black/30 px-3 py-2.5">
                                    <Crown className="w-4 h-4 text-aether-gold shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate leading-tight">{c.player_name}</p>
                                        <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">{seasonLabel(c.season)} · {boardGame.title}</p>
                                    </div>
                                    <p className="font-ritual text-base shrink-0" style={{ color: acc }}>{c.score.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-[10px] text-zinc-600 text-center mt-5 leading-relaxed">
                    Scores are tied to your soul. Climb the board before the season turns.
                </p>
            </div>
        </div>
    );
}
