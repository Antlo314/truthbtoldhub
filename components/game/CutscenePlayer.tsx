'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CutsceneDef } from '@/lib/game/cutscenes';
import CinematicVideo from '@/components/game/CinematicVideo';
import { loadSettings } from '@/lib/game/settings';

// ============================================================
//  CUTSCENE PLAYER — video only (no still slideshow).
//  Tap / click / key to skip. Audio via CinematicVideo mute toggle.
// ============================================================

interface Props {
    scene: CutsceneDef;
    onComplete: () => void;
    onSkip?: () => void;
    className?: string;
}

export default function CutscenePlayer({ scene, onComplete, onSkip, className = '' }: Props) {
    const [visible, setVisible] = useState(true);
    const doneRef = useRef(false);

    const finish = useCallback(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        setVisible(false);
        onComplete();
    }, [onComplete]);

    const skip = useCallback(() => {
        onSkip?.();
        finish();
    }, [onSkip, finish]);

    useEffect(() => {
        doneRef.current = false;
        setVisible(true);
        if (!scene.video) finish();
    }, [scene, finish]);

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

    if (!visible || !scene.video) return null;

    // Destination/combat cutscenes carry their location title in the first frame's
    // caption — always shown as a cinematic reveal. The narration line honors the
    // Subtitles setting (captions on/off). The scrim only renders when there's text.
    const title = scene.frames[0]?.caption;
    const showLine = loadSettings().subtitles && !!scene.line;
    const hasText = !!title || showLine;

    return (
        <div
            className={`absolute inset-0 z-[80] overflow-hidden bg-black select-none ${className}`}
            onClick={skip}
            role="presentation"
        >
            <CinematicVideo
                src={scene.video}
                loop={false}
                overlay="light"
                showMuteControl
                onEnded={finish}
                className="z-0"
            />

            {/* Lower-third scrim — copy stays legible over any bright frame */}
            {hasText && (
                <div
                    className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none z-[5]"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 42%, transparent 100%)' }}
                />
            )}

            {hasText && (
                <div
                    className="absolute bottom-0 inset-x-0 px-6 flex flex-col items-center text-center pointer-events-none z-10"
                    style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}
                >
                    {title && (
                        <>
                            <h2
                                className="font-ritual text-xl sm:text-3xl font-black text-white leading-tight text-balance"
                                style={{ textShadow: '0 2px 18px rgba(0,0,0,0.95)' }}
                            >
                                {title}
                            </h2>
                            <div
                                className="h-px w-16 my-3"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.85), transparent)' }}
                            />
                        </>
                    )}
                    {showLine && (
                        <p
                            className="font-ritual text-base sm:text-xl text-white/95 leading-relaxed max-w-xl text-pretty"
                            style={{ textShadow: '0 1px 10px rgba(0,0,0,0.9)' }}
                        >
                            {scene.line}
                        </p>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); skip(); }}
                className="absolute top-5 right-6 z-30 text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors pointer-events-auto"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}
            >
                skip ▸
            </button>
        </div>
    );
}