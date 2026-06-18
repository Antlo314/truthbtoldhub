'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Radio } from 'lucide-react';
import type { DispatchMedia } from '@/lib/game/hut';

// ============================================================
//  HUT FREQUENCIES — an inline player for the Archive's audio
//  transmissions (the 400 soundtrack, spoken word, etc.). One
//  shared <audio> element; choosing a track swaps the source so
//  only one frequency sounds at a time. Independent of the game
//  BGM (they may overlap — kept simple on purpose).
// ============================================================

export default function HutFrequencies({ tracks }: { tracks: DispatchMedia[] }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // 0..1 of the current track

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onTime = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
        const onEnd = () => { setPlaying(false); setProgress(0); };
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('ended', onEnd);
        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('ended', onEnd);
            audio.pause();
        };
    }, []);

    function toggle(track: DispatchMedia) {
        const audio = audioRef.current;
        if (!audio) return;
        if (currentId === track.id) {
            if (audio.paused) audio.play().catch(() => {}); else audio.pause();
            return;
        }
        setCurrentId(track.id);
        setProgress(0);
        audio.src = track.url;
        audio.play().catch(() => {});
    }

    function seek(track: DispatchMedia, e: React.MouseEvent<HTMLDivElement>) {
        const audio = audioRef.current;
        if (!audio || currentId !== track.id || !audio.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        audio.currentTime = frac * audio.duration;
    }

    if (tracks.length === 0) {
        return (
            <p className="text-[11px] text-zinc-500 text-center py-6 font-mono uppercase tracking-widest">
                The frequencies are quiet — transmissions soon.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio ref={audioRef} preload="none" />
            {tracks.map((t) => {
                const isCurrent = currentId === t.id;
                const isPlaying = isCurrent && playing;
                return (
                    <div
                        key={t.id}
                        className={`rounded-xl border p-3 transition-colors ${isCurrent ? 'border-aether-gold/40 bg-aether-gold/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}
                    >
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => toggle(t)}
                                aria-label={isPlaying ? `Pause ${t.title}` : `Play ${t.title}`}
                                className="w-9 h-9 rounded-full bg-aether-gold/15 border border-aether-gold/30 text-aether-gold flex items-center justify-center shrink-0 hover:bg-aether-gold/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aether-gold/70"
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{t.title}</p>
                                <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">Frequency · {t.category}</p>
                            </div>
                            <Radio className={`w-4 h-4 shrink-0 ${isPlaying ? 'text-aether-gold animate-pulse' : 'text-zinc-600'}`} aria-hidden />
                        </div>
                        {t.description && (
                            <p className="text-[11px] text-zinc-400 leading-snug mt-2 break-words text-pretty">{t.description}</p>
                        )}
                        {isCurrent && (
                            <div
                                onClick={(e) => seek(t, e)}
                                role="progressbar"
                                aria-label="Track progress"
                                aria-valuenow={Math.round(progress * 100)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                className="mt-2.5 h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer"
                            >
                                <div className="h-full rounded-full bg-aether-gold transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
