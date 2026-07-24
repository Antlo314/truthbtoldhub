'use client';

/**
 * Truth.OS Music — an ambient player over the sanctum's real local audio.
 * Every source below is an actual file under /public/audio (verified on disk):
 * the hub ambient beds, the Truth.OS system themes, the game score, and the
 * prophecy songs. Nothing streams; nothing leaves the machine.
 *
 * Owns a single <audio> element. Last track + volume + shuffle/repeat persist
 * to localStorage under `truthos_music_v1`.
 */
import { useEffect, useRef, useState } from 'react';
import {
    ListMusic,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const STORE_KEY = 'truthos_music_v1';

type MusicTrack = {
    id: string;
    title: string;
    album: string;
    blurb: string;
    /** Public path from site root — spaces are pre-encoded. */
    src: string;
    art: string;
};

const HUB = '/audio/hub/music';
const BGM = '/audio/game/bgm';
const SONG = '/audio';

const ART_HUT = '/brand/hut-interior-cinematic.jpg';
const ART_HALL = '/brand/bg-hall.jpg';
const ART_PORTAL = '/brand/bg-portal.jpg';
const ART_VOID = '/brand/bg-awakening-void.jpg';
const ART_SANCTUARY = '/brand/bg-hut-sanctuary.jpg';
const ART_SOURCE = '/brand/keyart-return-source.jpg';
const ART_OS = '/truthos/os-wallpaper.jpg';

const TRACKS: MusicTrack[] = [
    /* ── Sanctum Ambient ── */
    {
        id: 'house_ambient_main',
        title: 'Sanctum Ambient',
        album: 'Sanctum Ambient',
        blurb: 'The house at rest',
        src: `${HUB}/house_ambient_main.mp3`,
        art: ART_HUT,
    },
    {
        id: 'house_hearth_warm',
        title: 'Hearth Warm',
        album: 'Sanctum Ambient',
        blurb: 'Firelight and slow air',
        src: `${HUB}/house_hearth_warm.mp3`,
        art: ART_HUT,
    },
    {
        id: 'house_bedroom_night',
        title: 'Bedroom Night',
        album: 'Sanctum Ambient',
        blurb: 'Low lamp, long shadows',
        src: `${HUB}/house_bedroom_night.mp3`,
        art: ART_SANCTUARY,
    },
    {
        id: 'house_library_dust',
        title: 'Library Dust',
        album: 'Sanctum Ambient',
        blurb: 'Old paper, older questions',
        src: `${HUB}/house_library_dust.mp3`,
        art: ART_HALL,
    },
    {
        id: 'house_studio_pulse',
        title: 'Studio Pulse',
        album: 'Sanctum Ambient',
        blurb: 'Where the work gets made',
        src: `${HUB}/house_studio_pulse.mp3`,
        art: ART_HUT,
    },
    {
        id: 'house_living_arcade_glow',
        title: 'Arcade Glow',
        album: 'Sanctum Ambient',
        blurb: 'Neon bleeding through the wall',
        src: `${HUB}/house_living_arcade_glow.mp3`,
        art: ART_PORTAL,
    },
    {
        id: 'soul_mirror_reflect',
        title: 'Soul Mirror',
        album: 'Sanctum Ambient',
        blurb: 'The reflection answers back',
        src: `${HUB}/soul_mirror_reflect.mp3`,
        art: ART_VOID,
    },
    {
        id: 'offering_sustain',
        title: 'Offering',
        album: 'Sanctum Ambient',
        blurb: 'A held note, given freely',
        src: `${HUB}/offering_sustain.mp3`,
        art: ART_SOURCE,
    },

    /* ── Truth.OS ── */
    {
        id: 'truthos_desktop_idle',
        title: 'Desktop Idle',
        album: 'Truth.OS',
        blurb: 'The machine breathing',
        src: `${HUB}/truthos_desktop_idle.mp3`,
        art: ART_OS,
    },
    {
        id: 'truthos_boot_theme',
        title: 'Boot Theme',
        album: 'Truth.OS',
        blurb: 'Cold start, warm signal',
        src: `${HUB}/truthos_boot_theme.mp3`,
        art: ART_OS,
    },
    {
        id: 'arcade_lobby',
        title: 'Arcade Lobby',
        album: 'Truth.OS',
        blurb: 'Coins waiting in the dark',
        src: `${HUB}/arcade_lobby.mp3`,
        art: ART_PORTAL,
    },
    {
        id: 'arcade_tetra',
        title: 'Tetra',
        album: 'Truth.OS',
        blurb: 'Stacking the inevitable',
        src: `${HUB}/arcade_tetra.mp3`,
        art: ART_PORTAL,
    },
    {
        id: 'arcade_serpent',
        title: 'Serpent',
        album: 'Truth.OS',
        blurb: 'Longer with every bite',
        src: `${HUB}/arcade_serpent.mp3`,
        art: ART_PORTAL,
    },
    {
        id: 'arcade_veil',
        title: 'Veil',
        album: 'Truth.OS',
        blurb: 'Behind the last screen',
        src: `${HUB}/arcade_veil.mp3`,
        art: ART_VOID,
    },

    /* ── The Score ── */
    {
        id: 'title_landing',
        title: 'Title · Landing',
        album: 'The Score',
        blurb: 'Opening transmission',
        src: `${BGM}/title_landing.mp3`,
        art: ART_SOURCE,
    },
    {
        id: 'awakening_truth',
        title: 'Awakening',
        album: 'The Score',
        blurb: 'The first light',
        src: `${BGM}/awakening_truth.mp3`,
        art: ART_VOID,
    },
    {
        id: 'forging_self',
        title: 'Forging the Self',
        album: 'The Score',
        blurb: 'The self under fire',
        src: `${BGM}/forging_self.mp3`,
        art: ART_HALL,
    },
    {
        id: 'paths_crossroads',
        title: 'Paths & Crossroads',
        album: 'The Score',
        blurb: 'Where the roads meet',
        src: `${BGM}/paths_crossroads.mp3`,
        art: ART_PORTAL,
    },
    {
        id: 'world_cavern',
        title: 'World · Cavern',
        album: 'The Score',
        blurb: 'Stone that remembers',
        src: `${BGM}/world_cavern.mp3`,
        art: ART_HALL,
    },
    {
        id: 'eden_garden',
        title: 'Eden Garden',
        album: 'The Score',
        blurb: 'Green before the fall',
        src: `${BGM}/eden_garden.mp3`,
        art: ART_SANCTUARY,
    },
    {
        id: 'combat_skirmish',
        title: 'Skirmish',
        album: 'The Score',
        blurb: 'Short, sharp, decided',
        src: `${BGM}/combat_skirmish.mp3`,
        art: ART_HALL,
    },
    {
        id: 'combat_eden_cherub',
        title: 'The Cherub',
        album: 'The Score',
        blurb: 'A sword that turns every way',
        src: `${BGM}/combat_eden_cherub.mp3`,
        art: ART_SANCTUARY,
    },

    /* ── Prophecy Songs ── */
    {
        id: 'song_400_years',
        title: '400 Years Prophesy',
        album: 'Prophecy Songs',
        blurb: 'Counted out in generations',
        src: `${SONG}/400%20Years%20Prophesy.mp3`,
        art: ART_SOURCE,
    },
    {
        id: 'song_400_crown',
        title: '400-Year Crown',
        album: 'Prophecy Songs',
        blurb: 'What the waiting earned',
        src: `${SONG}/400-Year%20Crown.mp3`,
        art: ART_SOURCE,
    },
    {
        id: 'song_ascension',
        title: 'Ascension at Dusk',
        album: 'Prophecy Songs',
        blurb: 'Rising as the light goes',
        src: `${SONG}/Ascension%20at%20Dusk.mp3`,
        art: ART_VOID,
    },
    {
        id: 'song_ashen',
        title: 'Ashen Covenant',
        album: 'Prophecy Songs',
        blurb: 'A promise kept in ash',
        src: `${SONG}/Ashen%20Covenant.mp3`,
        art: ART_HALL,
    },
    {
        id: 'song_ur',
        title: 'Ur of the Chaldees',
        album: 'Prophecy Songs',
        blurb: 'The city that was left behind',
        src: `${SONG}/Ur%20Chaldees.mp3`,
        art: ART_HALL,
    },
    {
        id: 'song_wilderness',
        title: 'Wilderness Whispers',
        album: 'Prophecy Songs',
        blurb: 'A voice where nothing grows',
        src: `${SONG}/Wilderness%20Whispers.mp3`,
        art: ART_SANCTUARY,
    },
];

/** Contiguous album runs, precomputed once — the catalog never changes. */
const TRACK_GROUPS: { album: string; items: { track: MusicTrack; index: number }[] }[] = (() => {
    const out: { album: string; items: { track: MusicTrack; index: number }[] }[] = [];
    TRACKS.forEach((track, index) => {
        const last = out[out.length - 1];
        if (last && last.album === track.album) last.items.push({ track, index });
        else out.push({ album: track.album, items: [{ track, index }] });
    });
    return out;
})();

type RepeatMode = 'off' | 'all' | 'one';

type MusicSave = {
    v: 1;
    trackId: string;
    volume: number;
    shuffle: boolean;
    repeat: RepeatMode;
};

const DEFAULT_SAVE: MusicSave = {
    v: 1,
    trackId: TRACKS[0].id,
    volume: 0.55,
    shuffle: false,
    repeat: 'all',
};

function loadSave(): MusicSave {
    if (typeof window === 'undefined') return DEFAULT_SAVE;
    try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw) return DEFAULT_SAVE;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return DEFAULT_SAVE;
        const r = parsed as Record<string, unknown>;
        const rep = r.repeat;
        return {
            v: 1,
            trackId:
                typeof r.trackId === 'string' && TRACKS.some((t) => t.id === r.trackId)
                    ? r.trackId
                    : DEFAULT_SAVE.trackId,
            volume:
                typeof r.volume === 'number' && Number.isFinite(r.volume)
                    ? Math.min(1, Math.max(0, r.volume))
                    : DEFAULT_SAVE.volume,
            shuffle: r.shuffle === true,
            repeat: rep === 'off' || rep === 'one' || rep === 'all' ? rep : DEFAULT_SAVE.repeat,
        };
    } catch {
        return DEFAULT_SAVE;
    }
}

function saveState(next: MusicSave) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
        /* private mode / quota — playback still works */
    }
}

function fmtTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function MusicApp() {
    const [initial] = useState<MusicSave>(loadSave);

    const [index, setIndex] = useState(() => {
        const i = TRACKS.findIndex((t) => t.id === initial.trackId);
        return i >= 0 ? i : 0;
    });
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(initial.volume);
    const [muted, setMuted] = useState(false);
    const [shuffle, setShuffle] = useState(initial.shuffle);
    const [repeat, setRepeat] = useState<RepeatMode>(initial.repeat);
    const [failed, setFailed] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    /** Whether playback should resume automatically after a source swap. */
    const wantPlayRef = useRef(false);
    /** True once the component is tearing down — silences late media events. */
    const teardownRef = useRef(false);

    const track = TRACKS[index];

    /* Persist the shape the next session restores from. */
    useEffect(() => {
        saveState({ v: 1, trackId: track.id, volume, shuffle, repeat });
    }, [track.id, volume, shuffle, repeat]);

    /* Source swap — imperative so React never fights the media element. */
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        setTime(0);
        setDuration(0);
        setFailed(false);
        a.src = track.src;
        a.load();
        if (wantPlayRef.current) {
            a.play().catch(() => {
                wantPlayRef.current = false;
                setPlaying(false);
            });
        }
    }, [track.src]);

    /* Volume / mute. */
    useEffect(() => {
        const a = audioRef.current;
        if (a) a.volume = muted ? 0 : volume;
    }, [volume, muted]);

    /* Smooth progress while playing — throttled inside the frame loop. */
    useEffect(() => {
        if (!playing) return;
        let raf = 0;
        let last = 0;
        const tick = (t: number) => {
            if (t - last > 90) {
                last = t;
                const a = audioRef.current;
                if (a) {
                    setTime(a.currentTime);
                    if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
                }
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing]);

    /* Hard stop on unmount — never leave audio playing behind a closed window. */
    useEffect(() => {
        const a = audioRef.current;
        return () => {
            teardownRef.current = true;
            if (!a) return;
            a.pause();
            // Drop the buffered resource; the empty-src error this provokes is
            // swallowed by the teardown guard on onError.
            a.removeAttribute('src');
            a.load();
        };
    }, []);

    const goTo = (next: number, autoplay: boolean) => {
        wantPlayRef.current = autoplay;
        setIndex(((next % TRACKS.length) + TRACKS.length) % TRACKS.length);
    };

    const pickNext = (dir: number): number => {
        if (shuffle && TRACKS.length > 1) {
            let n = index;
            while (n === index) n = Math.floor(Math.random() * TRACKS.length);
            return n;
        }
        return index + dir;
    };

    const step = (dir: number) => {
        sacredUi.click();
        // Tapping "previous" mid-track restarts it first, like a real deck.
        const a = audioRef.current;
        if (dir < 0 && a && a.currentTime > 3) {
            a.currentTime = 0;
            setTime(0);
            return;
        }
        goTo(pickNext(dir), true);
    };

    const toggle = () => {
        sacredUi.click();
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) {
            wantPlayRef.current = true;
            a.play().catch(() => {
                wantPlayRef.current = false;
                setPlaying(false);
                setFailed(true);
            });
        } else {
            wantPlayRef.current = false;
            a.pause();
        }
    };

    const onEnded = () => {
        const a = audioRef.current;
        if (repeat === 'one' && a) {
            a.currentTime = 0;
            a.play().catch(() => setPlaying(false));
            return;
        }
        if (repeat === 'all' || shuffle) {
            goTo(pickNext(1), true);
            return;
        }
        if (index < TRACKS.length - 1) {
            goTo(index + 1, true);
            return;
        }
        wantPlayRef.current = false;
        setPlaying(false);
    };

    const cycleRepeat = () => {
        sacredUi.click();
        setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
    };

    const seekMax = duration > 0 ? duration : 1;

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-zinc-200 min-h-[220px]">
            <audio
                ref={audioRef}
                preload="metadata"
                className="hidden"
                onPlay={() => {
                    wantPlayRef.current = true;
                    setPlaying(true);
                }}
                onPause={() => setPlaying(false)}
                onEnded={onEnded}
                onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d) && d > 0) setDuration(d);
                }}
                onDurationChange={(e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d) && d > 0) setDuration(d);
                }}
                onSeeked={(e) => setTime(e.currentTarget.currentTime)}
                onError={() => {
                    if (teardownRef.current) return;
                    wantPlayRef.current = false;
                    setPlaying(false);
                    setFailed(true);
                }}
            />

            <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
                {/* Library */}
                <aside className="shrink-0 sm:w-56 flex flex-col min-h-0 max-h-[38%] sm:max-h-none border-b sm:border-b-0 sm:border-r border-white/10 bg-black/40">
                    <div className="shrink-0 flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
                        <ListMusic size={13} className="text-cyan-300 shrink-0" />
                        <p className="text-[9px] uppercase tracking-[0.28em] text-cyan-300/80 font-mono truncate">
                            Library · {TRACKS.length}
                        </p>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                        {TRACK_GROUPS.map((group) => (
                            <div key={group.album} className="mb-1.5">
                                <p className="px-1.5 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600 font-mono">
                                    {group.album}
                                </p>
                                <ul className="space-y-0.5">
                                    {group.items.map(({ track: t, index: i }) => {
                                        const active = i === index;
                                        return (
                                            <li key={t.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (i === index) {
                                                            toggle();
                                                            return;
                                                        }
                                                        sacredUi.click();
                                                        goTo(i, true);
                                                    }}
                                                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[12px] min-h-[40px] touch-manipulation transition-colors border ${
                                                        active
                                                            ? 'bg-cyan-500/20 text-white border-cyan-400/30'
                                                            : 'text-zinc-400 border-transparent hover:bg-white/5 hover:text-zinc-200'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        {active && playing && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shrink-0 animate-pulse" />
                                                        )}
                                                        <span className="block font-medium truncate">
                                                            {t.title}
                                                        </span>
                                                    </span>
                                                    <span className="block text-[10px] text-zinc-600 truncate">
                                                        {t.blurb}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Now playing */}
                <section className="flex-1 min-w-0 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 relative overflow-hidden bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={track.art}
                            alt=""
                            className={`w-full h-full object-cover transition-transform duration-[6000ms] ${
                                playing ? 'scale-110' : 'scale-100'
                            }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 px-3.5 pb-2.5 pt-6">
                            <p className="text-[9px] uppercase tracking-[0.3em] text-cyan-300/80 font-mono truncate">
                                {failed ? 'Source unavailable' : playing ? 'Now playing' : 'Paused'} ·{' '}
                                {track.album}
                            </p>
                            <p className="text-base sm:text-lg font-semibold text-white truncate leading-snug">
                                {track.title}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">{track.blurb}</p>
                        </div>
                    </div>

                    {/* Transport */}
                    <div className="shrink-0 border-t border-white/10 bg-zinc-950/95 px-3 py-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] tabular-nums text-zinc-500 w-9 shrink-0">
                                {fmtTime(time)}
                            </span>
                            <input
                                type="range"
                                min={0}
                                max={seekMax}
                                step={0.25}
                                value={Math.min(time, seekMax)}
                                disabled={duration <= 0}
                                aria-label="Seek"
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setTime(v);
                                    const a = audioRef.current;
                                    if (a && Number.isFinite(a.duration)) a.currentTime = v;
                                }}
                                className="flex-1 min-w-0 h-4 accent-cyan-400 cursor-pointer disabled:opacity-40 touch-manipulation"
                            />
                            <span className="text-[10px] tabular-nums text-zinc-500 w-9 shrink-0 text-right">
                                {fmtTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                type="button"
                                onClick={() => {
                                    sacredUi.click();
                                    setShuffle((s) => !s);
                                }}
                                title={shuffle ? 'Shuffle on' : 'Shuffle off'}
                                aria-pressed={shuffle}
                                className={`w-10 h-10 min-w-[40px] rounded-lg flex items-center justify-center touch-manipulation transition-colors ${
                                    shuffle
                                        ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-400/35'
                                        : 'text-zinc-500 border border-transparent hover:bg-white/5 hover:text-zinc-300'
                                }`}
                            >
                                <Shuffle size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => step(-1)}
                                title="Previous"
                                className="w-10 h-10 min-w-[40px] rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-300 touch-manipulation"
                            >
                                <SkipBack size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={toggle}
                                title={playing ? 'Pause' : 'Play'}
                                className="w-11 h-11 min-w-[44px] rounded-xl bg-cyan-500/25 border border-cyan-400/40 hover:bg-cyan-500/35 flex items-center justify-center text-white touch-manipulation"
                            >
                                {playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => step(1)}
                                title="Next"
                                className="w-10 h-10 min-w-[40px] rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-300 touch-manipulation"
                            >
                                <SkipForward size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={cycleRepeat}
                                title={
                                    repeat === 'one'
                                        ? 'Repeat one'
                                        : repeat === 'all'
                                          ? 'Repeat all'
                                          : 'Repeat off'
                                }
                                className={`w-10 h-10 min-w-[40px] rounded-lg flex items-center justify-center touch-manipulation transition-colors ${
                                    repeat !== 'off'
                                        ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-400/35'
                                        : 'text-zinc-500 border border-transparent hover:bg-white/5 hover:text-zinc-300'
                                }`}
                            >
                                {repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
                            </button>

                            <div className="flex items-center gap-1.5 flex-1 min-w-[96px] ml-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        sacredUi.click();
                                        setMuted((m) => !m);
                                    }}
                                    title={muted ? 'Unmute' : 'Mute'}
                                    className="w-10 h-10 min-w-[40px] rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-400 touch-manipulation shrink-0"
                                >
                                    {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                                </button>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={muted ? 0 : volume}
                                    aria-label="Volume"
                                    onChange={(e) => {
                                        setMuted(false);
                                        setVolume(Number(e.target.value));
                                    }}
                                    className="flex-1 min-w-0 h-4 accent-cyan-400 cursor-pointer touch-manipulation"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
