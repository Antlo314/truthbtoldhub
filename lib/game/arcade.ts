import { supabase } from '@/lib/supabase';

// ============================================================
//  THE SANCTUM ARCADE — a small corner of Truth's Hut where
//  souls play for the highest score. Each season the champion
//  is crowned. Fails soft if the `arcade_scores` table doesn't
//  exist yet (returns empty / throws a readable message).
//
//  Run `arcade_scores_schema.sql` once in the Supabase SQL editor.
// ============================================================

export interface ArcadeGameDef {
    id: string;
    title: string;
    tagline: string;
    /** what the score counts */
    scoreUnit: string;
    /** secondary count noun shown on the leaderboard (e.g. 'lines', 'orbs') */
    metric: string;
    /** leaderboard row prefix for the `level` field (default 'Lv'; e.g. 'Try' for attempts) */
    levelLabel?: string;
    accent: string;
    /** false = "coming soon" placeholder card */
    live: boolean;
}

// The arcade's game roster. More slots are reserved so the lobby
// reads as a growing arcade, not a one-off.
export const ARCADE_GAMES: ArcadeGameDef[] = [
    {
        id: 'tetra',
        title: 'Tetra',
        tagline: 'Stack the falling stones. Clear the lines. Rise the levels.',
        scoreUnit: 'points',
        metric: 'lines',
        accent: '#22d3ee',
        live: true,
    },
    {
        id: 'serpent',
        title: 'Serpent',
        tagline: 'Gather the luminous orbs. Grow, quicken, and survive your own coils.',
        scoreUnit: 'points',
        metric: 'orbs',
        accent: '#22c55e',
        live: true,
    },
    {
        id: 'veil',
        title: 'Veil',
        tagline: 'Pierce the veil. Ride the pulse. Return to the Source.',
        scoreUnit: 'units',
        metric: 'coins',
        levelLabel: 'Try',
        accent: '#7c5cff',
        live: true,
    },
    {
        id: 'soon',
        title: 'More Trials Coming',
        tagline: 'New arcade challenges will open here. Keep watch.',
        scoreUnit: '',
        metric: '',
        accent: '#a855f7',
        live: false,
    },
];

/** Just the playable games. */
export const LIVE_GAMES = ARCADE_GAMES.filter((g) => g.live);

export function gameById(id: string): ArcadeGameDef | undefined {
    return ARCADE_GAMES.find((g) => g.id === id);
}

// The prize is intentionally framed but not yet pinned to a concrete
// reward — edit this copy (and later wire a real reward) in one place.
export const ARCADE_PRIZE = {
    title: 'Champion of the Season',
    blurb:
        'Each season the soul who climbs highest is crowned Champion of the Arcade — honored before the whole community when the season turns. The crown carries a real reward, revealed at season’s end.',
};

// ---------- seasons ----------
// Monthly seasons give the competition a natural "end" for prizes.
// A season id is 'YYYY-MM' (UTC-stable enough for a leaderboard label).
export function currentSeason(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export function seasonLabel(season: string): string {
    if (season === 'all') return 'All-Time';
    const [y, m] = season.split('-').map(Number);
    if (!y || !m) return season;
    return `${MONTHS[m - 1]} ${y}`;
}

/** Days remaining in the given (current) monthly season. */
export function daysLeftInSeason(d: Date = new Date()): number {
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day of month
    const ms = end.getTime() - d.getTime();
    return Math.max(0, Math.ceil(ms / 86_400_000));
}

// ---------- score model ----------
export interface ScoreResult {
    game: string;
    score: number;
    lines: number;
    level: number;
}

export interface ArcadeScore {
    id: string;
    user_id: string | null;
    player_name: string;
    game: string;
    score: number;
    lines: number;
    level: number;
    season: string;
    created_at: string;
}

export interface LeaderRow {
    rank: number;
    user_id: string | null;
    player_name: string;
    score: number;
    lines: number;
    level: number;
    isYou: boolean;
}

/**
 * Submit a run. Every run is stored on the CURRENT season's board.
 * Returns the inserted row, or throws a readable error (e.g. table
 * missing / not signed in) for the caller to surface.
 */
export async function submitScore(result: ScoreResult, playerName: string): Promise<ArcadeScore> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in to record your score.');
    const row = {
        user_id: session.user.id,
        player_name: (playerName || 'A soul').slice(0, 40),
        game: result.game,
        score: Math.max(0, Math.floor(result.score)),
        lines: Math.max(0, Math.floor(result.lines)),
        level: Math.max(1, Math.floor(result.level)),
        season: currentSeason(),
    };
    const { data, error } = await supabase.from('arcade_scores').insert(row).select().single();
    if (error) throw new Error(error.message);
    return data as ArcadeScore;
}

/** Reduce raw rows to each soul's BEST run, ranked desc. */
function rankBestPerPlayer(rows: ArcadeScore[], youId: string | null, limit: number): LeaderRow[] {
    const best = new Map<string, ArcadeScore>();
    for (const r of rows) {
        const key = r.user_id || `anon:${r.id}`;
        const prev = best.get(key);
        if (!prev || r.score > prev.score) best.set(key, r);
    }
    return Array.from(best.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((r, i) => ({
            rank: i + 1,
            user_id: r.user_id,
            player_name: r.player_name,
            score: r.score,
            lines: r.lines,
            level: r.level,
            isYou: !!youId && r.user_id === youId,
        }));
}

/**
 * Top of the board for a game + season. Pass season='all' for the
 * all-time board. Best-per-player is computed client-side from the
 * top raw rows (fine at community scale) so no DB view is required.
 */
export async function fetchLeaderboard(
    game: string,
    season: string,
    limit = 25,
): Promise<LeaderRow[]> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const youId = session?.user?.id ?? null;
        let q = supabase
            .from('arcade_scores')
            .select('id, user_id, player_name, game, score, lines, level, season, created_at')
            .eq('game', game)
            .order('score', { ascending: false })
            .limit(400);
        if (season !== 'all') q = q.eq('season', season);
        const { data, error } = await q;
        if (error) return [];
        return rankBestPerPlayer((data || []) as ArcadeScore[], youId, limit);
    } catch {
        return [];
    }
}

// ---------- personal stats ----------
export interface PersonalStats {
    runs: number;
    best: number;
    avg: number;
}

/** The signed-in soul's record for a game + season (null if no runs). */
export async function fetchPersonalStats(game: string, season: string): Promise<PersonalStats | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        let q = supabase
            .from('arcade_scores')
            .select('score')
            .eq('game', game)
            .eq('user_id', session.user.id)
            .order('score', { ascending: false })
            .limit(200);
        if (season !== 'all') q = q.eq('season', season);
        const { data, error } = await q;
        if (error || !data || data.length === 0) return null;
        const scores = (data as { score: number }[]).map((r) => r.score);
        return {
            runs: scores.length,
            best: scores[0],
            avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        };
    } catch {
        return null;
    }
}

// ---------- hall of champions ----------
/** The N season ids before the current one, newest first. */
export function pastSeasons(count: number, d: Date = new Date()): string[] {
    const out: string[] = [];
    let y = d.getFullYear();
    let m = d.getMonth(); // 0-based; start one month back
    for (let i = 0; i < count; i++) {
        m -= 1;
        if (m < 0) { m += 12; y -= 1; }
        out.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    }
    return out;
}

export interface PastChampion {
    season: string;
    player_name: string;
    score: number;
}

/** Crowned champions of the last `count` finished seasons (skips empty ones). */
export async function fetchPastChampions(game: string, count = 3): Promise<PastChampion[]> {
    try {
        const out: PastChampion[] = [];
        for (const s of pastSeasons(count)) {
            const { data, error } = await supabase
                .from('arcade_scores')
                .select('player_name, score')
                .eq('game', game)
                .eq('season', s)
                .order('score', { ascending: false })
                .limit(1);
            if (!error && data && data.length > 0) {
                const top = data[0] as { player_name: string; score: number };
                out.push({ season: s, player_name: top.player_name, score: top.score });
            }
        }
        return out;
    } catch {
        return [];
    }
}

/** The signed-in soul's best score for a game + season (null if none). */
export async function fetchPersonalBest(game: string, season: string): Promise<number | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        let q = supabase
            .from('arcade_scores')
            .select('score')
            .eq('game', game)
            .eq('user_id', session.user.id)
            .order('score', { ascending: false })
            .limit(1);
        if (season !== 'all') q = q.eq('season', season);
        const { data, error } = await q;
        if (error || !data || data.length === 0) return null;
        return (data[0] as { score: number }).score;
    } catch {
        return null;
    }
}
