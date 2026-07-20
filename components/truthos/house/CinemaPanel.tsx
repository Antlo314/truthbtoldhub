'use client';

/**
 * House Cinema station — pick an uploaded MP4; plays on the wall screen + here.
 */
import { useEffect, useRef } from 'react';
import { HOUSE_FILMS, getHouseFilm } from '@/lib/truthos/houseCinemaFilms';
import { useHouseUi } from './houseUiStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

export default function CinemaPanel({ onClose }: { onClose: () => void }) {
    const filmId = useHouseUi((s) => s.cinemaFilmId);
    const playing = useHouseUi((s) => s.cinemaPlaying);
    const playCinemaFilm = useHouseUi((s) => s.playCinemaFilm);
    const setCinemaPlaying = useHouseUi((s) => s.setCinemaPlaying);
    const stopCinema = useHouseUi((s) => s.stopCinema);
    const videoRef = useRef<HTMLVideoElement>(null);

    const film = getHouseFilm(filmId);

    // Keep panel <video> in sync with store (same src as wall)
    useEffect(() => {
        const el = videoRef.current;
        if (!el || !film) return;
        if (el.getAttribute('src') !== film.src) {
            el.src = film.src;
            el.load();
        }
        if (playing) {
            void el.play().catch(() => {
                /* gesture */
            });
        } else {
            el.pause();
        }
    }, [film, playing, film?.src]);

    // Auto-select first film when opening with nothing loaded
    useEffect(() => {
        if (!filmId && HOUSE_FILMS[0]) {
            playCinemaFilm(HOUSE_FILMS[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- open once
    }, []);

    return (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                aria-label="Close cinema"
                onClick={onClose}
            />
            <div className="relative w-full h-[min(96dvh,900px)] sm:max-w-5xl bg-[#08060f] border border-white/12 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/60">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-rose-300">House · Cinema</p>
                        <h2 className="text-white font-semibold text-lg leading-tight">Film screen</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg border border-white/15 text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
                    >
                        Close
                    </button>
                </header>

                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_280px]">
                    {/* Player */}
                    <div className="relative bg-black flex flex-col min-h-[40vh] md:min-h-0">
                        <video
                            ref={videoRef}
                            className="w-full flex-1 min-h-0 object-contain bg-black"
                            controls
                            playsInline
                            loop
                            poster={film?.poster}
                            onPlay={() => setCinemaPlaying(true)}
                            onPause={() => setCinemaPlaying(false)}
                        />
                        <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-3 border-t border-white/10 bg-black/50">
                            <p className="text-sm text-white font-medium flex-1 min-w-[8rem]">
                                {film?.title ?? 'Select a film'}
                            </p>
                            <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-[10px] uppercase tracking-widest text-rose-100"
                                onClick={() => {
                                    sacredUi.click();
                                    if (!film) {
                                        if (HOUSE_FILMS[0]) playCinemaFilm(HOUSE_FILMS[0].id);
                                        return;
                                    }
                                    setCinemaPlaying(!playing);
                                    const el = videoRef.current;
                                    if (!el) return;
                                    if (playing) el.pause();
                                    else void el.play().catch(() => {});
                                }}
                            >
                                {playing ? 'Pause' : 'Play'}
                            </button>
                            <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg border border-white/15 text-[10px] uppercase tracking-widest text-white/60"
                                onClick={() => {
                                    sacredUi.click();
                                    stopCinema();
                                    const el = videoRef.current;
                                    if (el) {
                                        el.pause();
                                        el.currentTime = 0;
                                    }
                                }}
                            >
                                Stop
                            </button>
                        </div>
                        {film?.blurb && (
                            <p className="px-4 pb-3 text-[11px] text-white/45">{film.blurb} · also playing on the wall screen</p>
                        )}
                    </div>

                    {/* Reel list */}
                    <div className="border-t md:border-t-0 md:border-l border-white/10 overflow-y-auto max-h-[40vh] md:max-h-none bg-[#0a0814]">
                        <p className="sticky top-0 z-10 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-white/40 bg-[#0a0814]/border-b border-white/10">
                            Uploaded reel · {HOUSE_FILMS.length}
                        </p>
                        <ul className="p-2 space-y-1">
                            {HOUSE_FILMS.map((f) => {
                                const active = f.id === filmId;
                                return (
                                    <li key={f.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                sacredUi.click();
                                                playCinemaFilm(f.id);
                                                // Ensure play after selection (user gesture)
                                                requestAnimationFrame(() => {
                                                    void videoRef.current?.play().catch(() => {});
                                                });
                                            }}
                                            className={[
                                                'w-full text-left rounded-xl px-3 py-2.5 border transition-colors',
                                                active
                                                    ? 'border-rose-400/50 bg-rose-500/15 text-white'
                                                    : 'border-transparent hover:border-white/15 hover:bg-white/5 text-white/80',
                                            ].join(' ')}
                                        >
                                            <span className="block text-sm font-medium leading-snug">{f.title}</span>
                                            <span className="block text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">
                                                {f.blurb}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
