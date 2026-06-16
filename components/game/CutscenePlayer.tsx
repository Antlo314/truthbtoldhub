'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CutsceneDef } from '@/lib/game/cutscenes';
import CinematicVideo from '@/components/game/CinematicVideo';

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

    return (
        <div
            className={`absolute inset-0 z-[80] overflow-hidden bg-black select-none ${className}`}
            onClick={skip}
            role="presentation"
        >
            <CinematicVideo src={scene.video} loop={false} overlay="light" showMuteControl onEnded={finish} className="z-0" />

            <div className="absolute bottom-0 inset-x-0 p-6 pb-10 flex flex-col items-center text-center pointer-events-none z-10">
                {scene.line && (
                    <p className="font-ritual text-lg md:text-2xl text-white/90 leading-relaxed max-w-xl">{scene.line}</p>
                )}
                <p className="mt-4 text-[9px] uppercase tracking-[0.35em] text-white/30">tap to skip · unmute top-left</p>
            </div>

            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); skip(); }}
                className="absolute top-5 right-6 z-30 text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-white transition-colors pointer-events-auto"
            >
                skip ▸
            </button>
        </div>
    );
}