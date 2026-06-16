'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface Props {
    src: string;
    loop?: boolean;
    className?: string;
    overlay?: 'dark' | 'medium' | 'light' | 'none';
    startMuted?: boolean;
    showMuteControl?: boolean;
    onEnded?: () => void;
}

const OVERLAY: Record<NonNullable<Props['overlay']>, string> = {
    dark: 'rgba(0,0,0,0.55)',
    medium: 'rgba(0,0,0,0.38)',
    light: 'rgba(0,0,0,0.22)',
    none: 'transparent',
};

export default function CinematicVideo({
    src,
    loop = true,
    className = '',
    overlay = 'medium',
    startMuted = true,
    showMuteControl = true,
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

    return (
        <div className={`absolute inset-0 overflow-hidden bg-black ${className}`}>
            {!failed ? (
                <video
                    ref={ref}
                    src={src}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
                    autoPlay
                    loop={loop}
                    muted={muted}
                    playsInline
                    preload="auto"
                    onEnded={onEnded}
                    onError={() => setFailed(true)}
                />
            ) : (
                <div className="absolute inset-0 bg-black" />
            )}
            {overlay !== 'none' && <div className="absolute inset-0 pointer-events-none" style={{ background: OVERLAY[overlay] }} />}
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