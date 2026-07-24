'use client';

/**
 * Truth.OS media suite — Media Player (cutscene reels) + Photos (gallery).
 * Sources are the local cutscene/brand assets; no network required.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { HOUSE_FILMS, type HouseFilm } from '@/lib/truthos/houseCinemaFilms';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { useOsSystem } from '../osSystemStore';
import {
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    MonitorUp,
    Pause,
    Play,
    SkipBack,
    SkipForward,
} from 'lucide-react';

/* ─── Media Player ───────────────────────────────────────── */

export function MediaPlayerApp() {
    const [filmId, setFilmId] = useState<string>(HOUSE_FILMS[0]?.id ?? '');
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const film = useMemo(
        () => HOUSE_FILMS.find((f) => f.id === filmId) ?? HOUSE_FILMS[0],
        [filmId],
    );
    const idx = HOUSE_FILMS.findIndex((f) => f.id === film?.id);

    useEffect(() => {
        const v = videoRef.current;
        if (!v || !film) return;
        v.load();
        if (playing) {
            v.play().catch(() => setPlaying(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [film?.id]);

    const toggle = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) {
            v.play().catch(() => undefined);
        } else {
            v.pause();
        }
        sacredUi.click();
    };

    const step = (d: number) => {
        const next = HOUSE_FILMS[(idx + d + HOUSE_FILMS.length) % HOUSE_FILMS.length];
        setFilmId(next.id);
        setPlaying(true);
        sacredUi.click();
    };

    if (!film) {
        return (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500">
                No reels found.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col sm:flex-row bg-black text-zinc-200 min-h-[300px]">
            {/* Playlist */}
            <div className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-white/10 overflow-y-auto max-h-[38%] sm:max-h-none bg-zinc-950/80">
                <p className="px-3 pt-3 pb-1.5 text-[9px] uppercase tracking-[0.3em] text-violet-300/80 font-mono">
                    Reels · {HOUSE_FILMS.length}
                </p>
                <ul className="p-2 space-y-1">
                    {HOUSE_FILMS.map((f) => (
                        <li key={f.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    setFilmId(f.id);
                                    setPlaying(true);
                                    sacredUi.click();
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-[12px] transition-colors min-h-[40px] ${
                                    f.id === film.id
                                        ? 'bg-violet-500/20 text-white border border-violet-400/30'
                                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
                                }`}
                            >
                                <span className="block font-medium truncate">{f.title}</span>
                                <span className="block text-[10px] text-zinc-600 truncate">{f.blurb}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Stage */}
            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex-1 min-h-0 flex items-center justify-center bg-black relative">
                    <video
                        ref={videoRef}
                        className="max-h-full max-w-full w-full h-full object-contain"
                        poster={film.poster}
                        controls
                        playsInline
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onEnded={() => step(1)}
                    >
                        <source src={film.src} type="video/mp4" />
                    </video>
                </div>
                <div className="shrink-0 px-3 py-2.5 border-t border-white/10 bg-zinc-950/90 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => step(-1)}
                        className="w-10 h-10 min-w-[40px] rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-300 touch-manipulation"
                        title="Previous"
                    >
                        <SkipBack size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={toggle}
                        className="w-11 h-11 min-w-[44px] rounded-xl bg-violet-500/25 border border-violet-400/40 hover:bg-violet-500/35 flex items-center justify-center text-white touch-manipulation"
                        title={playing ? 'Pause' : 'Play'}
                    >
                        {playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => step(1)}
                        className="w-10 h-10 min-w-[40px] rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-300 touch-manipulation"
                        title="Next"
                    >
                        <SkipForward size={16} />
                    </button>
                    <div className="min-w-0 flex-1 ml-1">
                        <p className="text-[13px] text-white font-semibold truncate">{film.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">
                            {film.blurb} · {idx + 1}/{HOUSE_FILMS.length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Photos ─────────────────────────────────────────────── */

type Photo = { src: string; title: string };

const BRAND_PHOTOS: Photo[] = [
    { src: '/brand/hut-interior-cinematic.jpg', title: 'Hut Interior' },
    { src: '/brand/bg-hall.jpg', title: 'The Hall' },
    { src: '/brand/bg-portal.jpg', title: 'Portal' },
    { src: '/brand/bg-hut-sanctuary.jpg', title: 'Hut Sanctuary' },
    { src: '/brand/bg-awakening-void.jpg', title: 'Awakening Void' },
    { src: '/brand/keyart-return-source.jpg', title: 'Return to Source' },
    { src: '/truthos/os-wallpaper.jpg', title: 'Sanctum Aurora' },
];

function filmPhotos(): Photo[] {
    return HOUSE_FILMS.filter((f): f is HouseFilm & { poster: string } => !!f.poster).map((f) => ({
        src: f.poster,
        title: f.title,
    }));
}

export function PhotosApp() {
    const photos = useMemo(() => {
        const seen = new Set<string>();
        return [...BRAND_PHOTOS, ...filmPhotos()].filter((p) => {
            if (seen.has(p.src)) return false;
            seen.add(p.src);
            return true;
        });
    }, []);
    const [view, setView] = useState<number | null>(null);
    const setWallpaper = useOsSystem((s) => s.setWallpaper);
    const notify = useOsSystem((s) => s.notify);

    const current = view !== null ? photos[view] : null;

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-zinc-200 min-h-[280px]">
            {current ? (
                <div className="h-full flex flex-col">
                    <div className="flex-1 min-h-0 relative bg-black flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={current.src}
                            alt={current.title}
                            className="max-h-full max-w-full object-contain"
                        />
                        <button
                            type="button"
                            onClick={() => setView(view! > 0 ? view! - 1 : photos.length - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:bg-black/80 touch-manipulation"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setView((view! + 1) % photos.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white hover:bg-black/80 touch-manipulation"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="shrink-0 px-3 py-2.5 border-t border-white/10 flex items-center gap-2 bg-zinc-950">
                        <p className="text-[13px] text-white font-semibold truncate flex-1">
                            {current.title}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setWallpaper(`custom:${current.src}`);
                                notify({
                                    title: 'Wallpaper applied',
                                    body: `${current.title} is now your desktop background.`,
                                    accent: 'pink',
                                });
                                sacredUi.access();
                            }}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pink-500/20 border border-pink-400/35 text-pink-100 text-[11px] font-semibold hover:bg-pink-500/30 min-h-[40px] touch-manipulation"
                        >
                            <MonitorUp size={14} /> Set as wallpaper
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setView(null);
                                sacredUi.click();
                            }}
                            className="shrink-0 px-3 py-2 rounded-lg border border-white/15 text-zinc-300 text-[11px] hover:bg-white/10 min-h-[40px] touch-manipulation"
                        >
                            Back
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-full overflow-y-auto p-3">
                    <div className="flex items-center gap-2 mb-3 px-0.5">
                        <ImageIcon size={15} className="text-pink-300" />
                        <p className="text-[10px] uppercase tracking-[0.3em] text-pink-300/80 font-mono">
                            Gallery · {photos.length} images
                        </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {photos.map((p, i) => (
                            <button
                                key={p.src}
                                type="button"
                                onClick={() => {
                                    setView(i);
                                    sacredUi.click();
                                }}
                                className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-pink-400/40 transition-colors bg-black touch-manipulation"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={p.src}
                                    alt={p.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[10px] text-white/90 bg-gradient-to-t from-black/85 to-transparent text-left truncate">
                                    {p.title}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
