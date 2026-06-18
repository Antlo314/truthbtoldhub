'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface Props {
    src: string;
    loop?: boolean;
    className?: string;
    overlay?: 'heavy' | 'dark' | 'medium' | 'light' | 'none';
    startMuted?: boolean;
    showMuteControl?: boolean;
    subtitle?: string;
    showSubtitles?: boolean;
    onEnded?: () => void;
}

const OVERLAY: Record<NonNullable<Props['overlay']>, string> = {
    heavy: 'rgba(0,0,0,0.74)',
    dark: 'rgba(0,0,0,0.55)',
    medium: 'rgba(0,0,0,0.38)',
    light: 'rgba(0,0,0,0.22)',
    none: 'transparent',
};

/** Extra dimming on the video layer so UI text stays readable over bright stills. */
const VIDEO_BRIGHTNESS: Record<NonNullable<Props['overlay']>, number> = {
    heavy: 0.32,
    dark: 0.42,
    medium: 0.52,
    light: 0.72,
    none: 1,
};

export default function CinematicVideo({
    src,
    loop = true,
    className = '',
    overlay = 'medium',
    startMuted = true,
    showMuteControl = true,
    subtitle,
    showSubtitles = false,
    onEnded,
}: Props) {
    const ref = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(startMuted);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    const play = useCallback(() => {
        const v = ref.current;
        if (!v) return;
        v.play().catch(() => undefined);
    }, []);

    useEffect(() => {
        setReady(false);
        setFailed(false);
        const v = ref.current;
        if (!v) return;
        v.load();
        const onCanPlay = () => { setReady(true); play(); };
        v.addEventListener('canplay', onCanPlay);
        return () => v.removeEventListener('canplay', onCanPlay);
    }, [src, play]);

    useEffect(() => {
        const v = ref.current;
        if (v) v.muted = muted;
    }, [muted]);

    const toggleMute = () => {
        setMuted((m) => !m);
        play();
    };

    const ambience = 'radial-gradient(ellipse at 50% 20%, #1c1810 0%, #0a0805 50%, #000 100%)';

    return (
        <div className={`absolute inset-0 overflow-hidden bg-black ${className}`}>
            <div className="absolute inset-0" style={{ background: ambience }} />
            {!failed ? (
                <video
                    ref={ref}
                    src={src}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
                    style={{ filter: `brightness(${VIDEO_BRIGHTNESS[overlay]})` }}
                    autoPlay
                    loop={loop}
                    muted={muted}
                    playsInline
                    preload="auto"
                    onEnded={onEnded}
                    onError={() => setFailed(true)}
                />
            ) : null}
            {overlay !== 'none' && <div className="absolute inset-0 pointer-events-none" style={{ background: OVERLAY[overlay] }} />}
            {showSubtitles && subtitle && (
                <>
                    <div
                        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none z-[5]"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)' }}
                    />
                    <div className="absolute bottom-0 inset-x-0 p-6 pb-10 flex justify-center pointer-events-none z-10">
                        <p className="font-ritual text-base md:text-xl text-white/95 leading-relaxed max-w-xl text-center text-pretty" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>{subtitle}</p>
                    </div>
                </>
            )}
            {showMuteControl && !failed && (
                <>
                    <button
                        type="button"
                        onClick={toggleMute}
                        className="absolute top-5 left-5 z-20 p-2.5 rounded-full bg-black/50 border border-white/15 text-white/70 hover:text-white pointer-events-auto"
                        aria-label={muted ? 'Unmute' : 'Mute'}
                    >
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    {muted && (
                        <p className="absolute top-16 left-5 z-20 text-[9px] uppercase tracking-[0.3em] text-white/40 pointer-events-none">
                            Tap to unmute
                        </p>
                    )}
                </>
            )}
        </div>
    );
}