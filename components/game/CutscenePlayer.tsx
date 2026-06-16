'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CutsceneDef } from '@/lib/game/cutscenes';

// ============================================================
//  CUTSCENE PLAYER — plays MP4 when available, otherwise
//  Ken Burns slideshow across still frames. Tap / click / key
//  to skip. Mobile-first fullscreen overlay.
// ============================================================

interface Props {
    scene: CutsceneDef;
    onComplete: () => void;
    onSkip?: () => void;
    /** Prefer video clip over slideshow when both exist */
    preferVideo?: boolean;
    className?: string;
}

export default function CutscenePlayer({ scene, onComplete, onSkip, preferVideo = true, className = '' }: Props) {
    const [frame, setFrame] = useState(0);
    const [mode, setMode] = useState<'video' | 'slides' | null>(null);
    const [visible, setVisible] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const doneRef = useRef(false);

    const finish = useCallback(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        setVisible(false);
        onComplete();
    }, [onComplete]);

    const skip = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        onSkip?.();
        finish();
    }, [onSkip, finish]);

    // pick playback mode
    useEffect(() => {
        doneRef.current = false;
        setFrame(0);
        setVisible(true);
        if (preferVideo && scene.video) {
            setMode('video');
        } else if (scene.frames.length > 0) {
            setMode('slides');
        } else {
            finish();
        }
    }, [scene, preferVideo, finish]);

    // slideshow advance
    useEffect(() => {
        if (mode !== 'slides') return;
        const frames = scene.frames.filter((f) => f.durationMs > 0);
        if (!frames.length) {
            finish();
            return;
        }
        const f = frames[Math.min(frame, frames.length - 1)];
        const id = setTimeout(() => {
            if (frame < frames.length - 1) setFrame((n) => n + 1);
            else finish();
        }, f.durationMs);
        return () => clearTimeout(id);
    }, [mode, frame, scene.frames, finish]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                skip();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [skip]);

    if (!visible || !mode) return null;

    const activeFrame = scene.frames[Math.min(frame, scene.frames.length - 1)];

    return (
        <div
            className={`absolute inset-0 z-[80] overflow-hidden bg-black select-none ${className}`}
            onClick={skip}
            role="presentation"
        >
            {mode === 'video' && scene.video ? (
                <video
                    ref={videoRef}
                    src={scene.video}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                    onEnded={finish}
                    onError={() => setMode('slides')}
                />
            ) : (
                scene.frames.map((f, i) => (
                    <div
                        key={f.src}
                        className="absolute inset-0 transition-opacity duration-[1400ms] ease-out"
                        style={{ opacity: i === frame ? 1 : 0 }}
                    >
                        <div
                            className="absolute inset-[-8%] bg-cover bg-center animate-cutscene-kenburns"
                            style={{ backgroundImage: `url(${f.src})` }}
                        />
                    </div>
                ))
            )}

            {/* scrims for legibility */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.7) 100%)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'url(https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/film_grain.png)', backgroundRepeat: 'repeat' }} />

            {/* caption */}
            <div className="absolute bottom-0 inset-x-0 p-6 pb-10 flex flex-col items-center text-center pointer-events-none">
                {(activeFrame?.caption || scene.line) && (
                    <p className="font-ritual text-lg md:text-2xl text-white/90 leading-relaxed max-w-xl animate-pulse">
                        {activeFrame?.caption || scene.line}
                    </p>
                )}
                <p className="mt-4 text-[9px] uppercase tracking-[0.35em] text-white/30">tap to skip</p>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); skip(); }}
                className="absolute top-5 right-6 z-10 text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-white transition-colors pointer-events-auto"
            >
                skip ▸
            </button>
        </div>
    );
}