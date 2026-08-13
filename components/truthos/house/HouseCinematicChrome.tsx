'use client';

/**
 * Bottom chrome — Use card, or one next-line. Sit shows Stand.
 */
import { useEffect, useState } from 'react';
import type { Hotspot } from './houseMap';
import { STATION_LABELS } from './stationProgress';
import { nextLine } from './nextLine';
import { useHouseUi } from './houseUiStore';

export default function HouseCinematicChrome({
    mobile,
    hotspot,
    pointerLocked,
    onInteract,
    hasLooked,
    hasMoved,
}: {
    mobile: boolean;
    characterName?: string;
    peerLiveCount?: number;
    hotspot: Hotspot | null;
    pointerLocked: boolean;
    fullscreen?: boolean;
    onInteract: () => void;
    onTour?: () => void;
    onFullscreen?: () => void;
    onRequestLock?: () => void;
    guest?: boolean;
    onSignIn?: () => void;
    hasLooked: boolean;
    hasMoved: boolean;
}) {
    const seated = useHouseUi((s) => s.seated);
    const tourOpen = useHouseUi((s) => s.walkthroughOpen);
    const [line, setLine] = useState<string | null>(null);
    const [lineKey, setLineKey] = useState('');
    const [fade, setFade] = useState(false);

    useEffect(() => {
        if (hotspot || tourOpen) {
            setLine(null);
            return;
        }
        const next = nextLine({ hasLooked, hasMoved, isMobile: mobile, tourOpen });
        if (!next) {
            setLine(null);
            return;
        }
        if (next === lineKey) return;
        setLineKey(next);
        setFade(false);
        setLine(next);
        const hide = window.setTimeout(() => setFade(true), 6000);
        const clear = window.setTimeout(() => setLine(null), 6400);
        return () => {
            window.clearTimeout(hide);
            window.clearTimeout(clear);
        };
    }, [hotspot, tourOpen, hasLooked, hasMoved, mobile, lineKey]);

    const stationTitle = hotspot ? STATION_LABELS[hotspot.id] || hotspot.label : null;
    const sitHere = seated || hotspot?.action.type === 'sit';
    const useLabel = seated ? 'Stand' : sitHere ? 'Sit' : 'Use';

    if (mobile) {
        return (
            <>
                {hotspot && (
                    <div
                        className="fixed inset-x-0 z-[44] flex justify-center px-4 pointer-events-none"
                        style={{ bottom: 'calc(min(42dvh, 280px) + 0.5rem)' }}
                    >
                        <div className="bg-black/80 border border-amber-400/45 px-4 py-2.5 rounded-2xl backdrop-blur-md max-w-[90vw] text-center shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-amber-200/80 font-mono">
                                {stationTitle}
                            </p>
                            <p className="text-[13px] text-amber-50 font-medium mt-0.5 leading-snug">
                                {seated ? 'Stand up' : hotspot.hint}
                            </p>
                            {hotspot.action.type !== 'soon' && (
                                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                                    Tap Use to {useLabel.toLowerCase()}
                                </p>
                            )}
                        </div>
                    </div>
                )}
                {!hotspot && line && (
                    <div
                        className="fixed inset-x-0 z-[43] flex justify-center px-4 pointer-events-none"
                        style={{ bottom: 'calc(min(36dvh, 220px) + 0.5rem)' }}
                    >
                        <p
                            className="text-[12px] text-white/70 bg-black/50 border border-white/10 px-3 py-1.5 rounded-full transition-opacity"
                            style={{ opacity: fade ? 0 : 1 }}
                        >
                            {line}
                        </p>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="fixed bottom-6 inset-x-0 z-30 flex flex-col items-center gap-2 pointer-events-none">
            {hotspot ? (
                <button
                    type="button"
                    className="pointer-events-auto group min-w-[220px] px-6 py-3.5 rounded-2xl border border-amber-400/55 bg-black/90 text-left backdrop-blur-md shadow-[0_0_40px_rgba(251,191,36,0.22)] hover:bg-black hover:border-amber-300/70 transition-colors"
                    onClick={onInteract}
                >
                    <p className="text-[9px] uppercase tracking-[0.32em] text-amber-200/75 font-mono">
                        {stationTitle}
                    </p>
                    <p className="text-sm text-amber-50 font-semibold mt-0.5 leading-snug">
                        {seated ? 'Stand up' : hotspot.hint}
                    </p>
                    {hotspot.action.type !== 'soon' && (
                        <p className="text-[10px] text-white/45 mt-1.5 font-mono tracking-wide">
                            Press <span className="text-amber-200">E</span>
                            {` to ${useLabel.toLowerCase()} · or click`}
                        </p>
                    )}
                </button>
            ) : line ? (
                <p
                    className="text-[12px] text-white/65 font-mono bg-black/50 px-4 py-1.5 rounded-full border border-white/8 tracking-wide transition-opacity"
                    style={{ opacity: fade ? 0 : 1 }}
                >
                    {line}
                </p>
            ) : !hasMoved ? (
                <p className="text-[11px] text-white/40 font-mono bg-black/50 px-4 py-1.5 rounded-full border border-white/8 tracking-wide">
                    {pointerLocked
                        ? 'WASD move · mouse look · E use'
                        : 'Click scene to look · WASD · E'}
                </p>
            ) : null}
        </div>
    );
}
