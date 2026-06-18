import { Howl } from 'howler';
import { unlockAudio } from '@/lib/game/sfx';

// ============================================================
//  GAME MUSIC — BGM loops, cues, and stings from /audio/game
// ============================================================

const BGM = '/audio/game/bgm';
const CUE = '/audio/game/cue';
const STING = '/audio/game/sting';

export type BgmId =
    | 'title_landing'
    | 'awakening_truth'
    | 'forging_self'
    | 'paths_crossroads'
    | 'world_cavern'
    | 'eden_garden'
    | 'combat_skirmish'
    | 'combat_eden_cherub';

export type CueId = 'river_attune' | 'rivers_converge';
export type StingId = 'relic_claim' | 'soul_recognized';

type Variant = 'main' | 'alt';

interface BgmMeta {
    main: string;
    alt?: string;
    volume: number;
    fadeInMs: number;
    fadeOutMs: number;
}

const BGM_META: Record<BgmId, BgmMeta> = {
    title_landing: { main: `${BGM}/title_landing.mp3`, alt: `${BGM}/title_landing_alt.mp3`, volume: 0.42, fadeInMs: 2800, fadeOutMs: 1800 },
    awakening_truth: { main: `${BGM}/awakening_truth.mp3`, alt: `${BGM}/awakening_truth_alt.mp3`, volume: 0.38, fadeInMs: 2400, fadeOutMs: 1600 },
    forging_self: { main: `${BGM}/forging_self.mp3`, volume: 0.4, fadeInMs: 2000, fadeOutMs: 1500 },
    paths_crossroads: { main: `${BGM}/paths_crossroads.mp3`, volume: 0.4, fadeInMs: 2200, fadeOutMs: 1600 },
    world_cavern: { main: `${BGM}/world_cavern.mp3`, alt: `${BGM}/world_cavern_alt.mp3`, volume: 0.45, fadeInMs: 2600, fadeOutMs: 1800 },
    eden_garden: { main: `${BGM}/eden_garden.mp3`, alt: `${BGM}/eden_garden_alt.mp3`, volume: 0.44, fadeInMs: 2200, fadeOutMs: 1600 },
    combat_skirmish: { main: `${BGM}/combat_skirmish.mp3`, alt: `${BGM}/combat_skirmish_alt.mp3`, volume: 0.5, fadeInMs: 600, fadeOutMs: 900 },
    combat_eden_cherub: { main: `${BGM}/combat_eden_cherub.mp3`, volume: 0.52, fadeInMs: 800, fadeOutMs: 1200 },
};

const CUE_SRC: Record<CueId, { main: string; alt?: string; volume: number }> = {
    river_attune: { main: `${CUE}/river_attune.mp3`, alt: `${CUE}/river_attune_alt.mp3`, volume: 0.65 },
    rivers_converge: { main: `${CUE}/rivers_converge.mp3`, volume: 0.72 },
};

const STING_SRC: Record<StingId, { main: string; alt?: string; volume: number }> = {
    relic_claim: { main: `${STING}/relic_claim.mp3`, alt: `${STING}/relic_claim_alt.mp3`, volume: 0.7 },
    soul_recognized: { main: `${STING}/soul_recognized.mp3`, volume: 0.68 },
};

const howlCache = new Map<string, Howl>();

function srcForBgm(id: BgmId, variant: Variant): string {
    const m = BGM_META[id];
    return variant === 'alt' && m.alt ? m.alt : m.main;
}

function getHowl(src: string, loop: boolean, volume: number): Howl {
    const key = `${src}|${loop}`;
    let h = howlCache.get(key);
    if (!h) {
        h = new Howl({ src: [src], loop, volume: 0, html5: true, preload: true });
        howlCache.set(key, h);
    }
    return h;
}

class GameMusicController {
    private current: Howl | null = null;
    private currentId: BgmId | null = null;
    private lastTrackId: BgmId | null = null;
    private muted = false;
    private duckTimer: ReturnType<typeof setTimeout> | null = null;
    private unlocked = false;

    private ensureUnlock() {
        if (this.unlocked || typeof window === 'undefined') return;
        unlockAudio();
        this.unlocked = true;
    }

    setMuted(m: boolean) {
        this.muted = m;
        if (m && this.current) {
            const ref = this.current;
            ref.fade(ref.volume(), 0, 400);
            setTimeout(() => { if (this.muted) ref.stop(); }, 420);
        } else if (!m) {
            // Revive whatever the current page wants — currentId if still set, else
            // the last track we were asked to play (a navigation while muted clears
            // currentId, so without this fallback unmuting would stay silent).
            const revive = this.currentId ?? this.lastTrackId;
            if (revive) this.playBgm(revive, { restart: true });
        }
    }

    isMuted() { return this.muted; }

    stopBgm(fadeMs?: number) {
        const h = this.current;
        if (!h) return;
        const ms = fadeMs ?? (this.currentId ? BGM_META[this.currentId].fadeOutMs : 1200);
        const vol = h.volume();
        h.fade(vol, 0, ms);
        const ref = h;
        this.current = null;
        this.currentId = null;
        // Only stop once the fade completes AND this track hasn't been re-adopted.
        // Tracks are cached by URL, so navigating away then back replays the SAME
        // Howl — without this guard a stale stop-timer would kill the restart
        // (music "shuts off when you come back" with no way to revive it).
        setTimeout(() => { if (this.current !== ref) ref.stop(); }, ms + 80);
    }

    playBgm(id: BgmId, opts?: { variant?: Variant; restart?: boolean; crossfadeMs?: number }) {
        if (typeof window === 'undefined') return;
        // Remember the desired track even while muted, so unmuting can revive the
        // page's BGM after a navigation cleared currentId.
        this.lastTrackId = id;
        if (this.muted) return;
        this.ensureUnlock();
        if (this.currentId === id && this.current?.playing() && !opts?.restart) return;

        const meta = BGM_META[id];
        const variant = opts?.variant ?? 'main';
        const src = srcForBgm(id, variant);
        const next = getHowl(src, true, meta.volume);
        const fadeIn = opts?.crossfadeMs ?? meta.fadeInMs;

        if (this.current && this.current !== next) {
            const prev = this.current;
            const outMs = opts?.crossfadeMs ?? (this.currentId ? BGM_META[this.currentId].fadeOutMs : 1400);
            prev.fade(prev.volume(), 0, outMs);
            setTimeout(() => { if (this.current !== prev) prev.stop(); }, outMs + 80);
        }

        // Ramp from the live level (not 0) when re-adopting a still-playing cached
        // Howl, so navigating back doesn't snap the track to silence and back.
        const from = next.playing() ? next.volume() : 0;
        if (!next.playing()) {
            next.volume(0);
            next.play();
        }
        next.fade(from, meta.volume, fadeIn);
        this.current = next;
        this.currentId = id;
    }

    crossfadeBgm(id: BgmId, ms = 2400, variant: Variant = 'main') {
        this.playBgm(id, { variant, crossfadeMs: ms, restart: true });
    }

    /** Pick alt variant ~35% of the time when available. */
    pickVariant(id: BgmId): Variant {
        const m = BGM_META[id];
        if (!m.alt) return 'main';
        return Math.random() < 0.35 ? 'alt' : 'main';
    }

    private duckBgm(durationMs = 3200, level = 0.18) {
        if (!this.current || this.muted) return;
        const meta = this.currentId ? BGM_META[this.currentId] : null;
        const base = meta?.volume ?? 0.4;
        const h = this.current;
        h.fade(h.volume(), base * level, 280);
        if (this.duckTimer) clearTimeout(this.duckTimer);
        this.duckTimer = setTimeout(() => {
            if (this.current === h && h.playing()) h.fade(h.volume(), base, 600);
        }, durationMs);
    }

    playCue(id: CueId, variant: Variant = 'main') {
        if (typeof window === 'undefined' || this.muted) return;
        this.ensureUnlock();
        const c = CUE_SRC[id];
        const src = variant === 'alt' && c.alt ? c.alt : c.main;
        const h = getHowl(src, false, c.volume);
        h.volume(c.volume);
        h.stop();
        h.play();
        this.duckBgm(2200, 0.22);
    }

    playSting(id: StingId, variant: Variant = 'main') {
        if (typeof window === 'undefined' || this.muted) return;
        this.ensureUnlock();
        const s = STING_SRC[id];
        const src = variant === 'alt' && s.alt ? s.alt : s.main;
        const h = getHowl(src, false, s.volume);
        h.volume(s.volume);
        h.stop();
        h.play();
        this.duckBgm(4500, 0.12);
    }

    combatBgmFor(edenBoss: boolean, skirmish: boolean): BgmId {
        if (edenBoss) return 'combat_eden_cherub';
        return 'combat_skirmish';
    }
}

export const gameMusic = new GameMusicController();