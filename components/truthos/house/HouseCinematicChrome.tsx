'use client';

/**
 * Cinematic UI shells — different on PC vs mobile, always in-app.
 * Interact HUD reads hotspot label + hint with clear hierarchy.
 */
import type { Hotspot } from './houseMap';
import { hutCompletion, STATION_LABELS } from './stationProgress';

export default function HouseCinematicChrome({
    mobile,
    characterName,
    peerLiveCount,
    hotspot,
    pointerLocked,
    fullscreen,
    onInteract,
    onTour,
    onFullscreen,
    onRequestLock,
    guest,
    onSignIn,
}: {
    mobile: boolean;
    characterName: string;
    peerLiveCount: number;
    hotspot: Hotspot | null;
    pointerLocked: boolean;
    fullscreen: boolean;
    onInteract: () => void;
    onTour: () => void;
    onFullscreen: () => void;
    onRequestLock: () => void;
    guest: boolean;
    onSignIn: () => void;
}) {
    const hut = hutCompletion();
    const stationTitle = hotspot
        ? STATION_LABELS[hotspot.id] || hotspot.label
        : null;

    if (mobile) {
        return (
            <>
                <div className="pointer-events-none fixed inset-x-0 top-0 z-[42] h-10 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[42] h-28 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                <div
                    className="fixed top-0 inset-x-0 z-[45] flex items-start justify-between px-3 pt-2 pointer-events-none"
                    style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
                >
                    <div className="pointer-events-none">
                        <p className="text-[9px] uppercase tracking-[0.35em] text-amber-200/70 font-mono">
                            Truth.OS · Mobile
                        </p>
                        <p className="text-sm text-white font-medium drop-shadow-md leading-tight">
                            {characterName}
                        </p>
                    </div>
                    <div className="flex gap-2 pointer-events-auto">
                        <button
                            type="button"
                            onClick={onTour}
                            className="w-9 h-9 rounded-full border border-white/20 bg-black/55 text-white/85 text-sm font-semibold backdrop-blur-md"
                            aria-label="Tour"
                        >
                            ?
                        </button>
                        {guest && (
                            <button
                                type="button"
                                onClick={onSignIn}
                                className="px-2.5 h-9 rounded-full border border-white/20 bg-black/55 text-[9px] uppercase tracking-widest text-white/70 backdrop-blur-md"
                            >
                                Sign in
                            </button>
                        )}
                    </div>
                </div>

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
                                {hotspot.hint}
                            </p>
                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                                Tap Use
                            </p>
                        </div>
                    </div>
                )}

                <div className="pointer-events-none fixed inset-y-0 left-0 w-8 z-[41] bg-gradient-to-r from-black/40 to-transparent" />
                <div className="pointer-events-none fixed inset-y-0 right-0 w-8 z-[41] bg-gradient-to-l from-black/40 to-transparent" />
            </>
        );
    }

    return (
        <>
            <div className="pointer-events-none fixed inset-x-0 top-0 z-[42] h-[4.5vh] min-h-[28px] bg-black" />
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[42] h-[4.5vh] min-h-[28px] bg-black" />
            <div className="pointer-events-none fixed inset-y-0 left-0 w-[6vw] max-w-[80px] z-[41] bg-gradient-to-r from-black/50 to-transparent" />
            <div className="pointer-events-none fixed inset-y-0 right-0 w-[6vw] max-w-[80px] z-[41] bg-gradient-to-l from-black/50 to-transparent" />

            <div
                className="fixed z-[45] left-6 top-[calc(4.5vh+0.75rem)] pointer-events-none space-y-0.5"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
            >
                <p className="text-[10px] uppercase tracking-[0.4em] text-amber-200/60 font-mono">
                    Truth.OS House · Cinematic
                </p>
                <p className="text-base text-white font-medium drop-shadow-lg">
                    {characterName}
                    {peerLiveCount > 0 && (
                        <span className="text-emerald-400 text-xs ml-2 font-mono">
                            · {peerLiveCount} LIVE
                        </span>
                    )}
                </p>
                {hut.seen < hut.total && (
                    <p className="text-[10px] text-white/35 font-mono tracking-wider">
                        Rooms {hut.seen}/{hut.total}
                    </p>
                )}
            </div>

            <div
                className="fixed z-[45] right-6 top-[calc(4.5vh+0.75rem)] flex items-center gap-2 pointer-events-auto"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
            >
                <button
                    type="button"
                    onClick={onTour}
                    className="h-9 px-3 rounded-lg border border-white/15 bg-black/60 text-[10px] uppercase tracking-widest text-white/70 hover:text-white hover:border-amber-400/40 backdrop-blur-md"
                >
                    Tour
                </button>
                <button
                    type="button"
                    onClick={onFullscreen}
                    className="h-9 px-3 rounded-lg border border-white/15 bg-black/60 text-[10px] uppercase tracking-widest text-white/70 hover:text-white hover:border-amber-400/40 backdrop-blur-md"
                    title="F · fullscreen"
                >
                    {fullscreen ? 'Window' : 'Full'}
                </button>
                {!pointerLocked && (
                    <button
                        type="button"
                        onClick={onRequestLock}
                        className="h-9 px-3 rounded-lg border border-emerald-400/35 bg-emerald-500/10 text-[10px] uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/20 backdrop-blur-md animate-pulse"
                    >
                        Click to look
                    </button>
                )}
                {pointerLocked && (
                    <span className="h-9 px-3 rounded-lg border border-white/10 bg-black/50 text-[10px] uppercase tracking-widest text-white/40 flex items-center">
                        Look locked · Esc
                    </span>
                )}
                {guest && (
                    <button
                        type="button"
                        onClick={onSignIn}
                        className="h-9 px-3 rounded-lg border border-white/15 bg-black/60 text-[10px] uppercase tracking-widest text-white/70 hover:text-white backdrop-blur-md"
                    >
                        Sign in
                    </button>
                )}
            </div>

            <div
                className="fixed left-1/2 top-1/2 z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                aria-hidden
            >
                <div className="relative w-5 h-5">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/35" />
                    <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-white/35" />
                    <div className="absolute left-1/2 top-1/2 w-1 h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />
                </div>
            </div>

            <div className="fixed bottom-[calc(4.5vh+1.25rem)] inset-x-0 z-30 flex flex-col items-center gap-2 pointer-events-none">
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
                            {hotspot.hint}
                        </p>
                        <p className="text-[10px] text-white/45 mt-1.5 font-mono tracking-wide">
                            Press <span className="text-amber-200">E</span> · or click
                        </p>
                    </button>
                ) : (
                    <p className="text-[11px] text-white/40 font-mono bg-black/50 px-4 py-1.5 rounded-full border border-white/8 tracking-wide">
                        {pointerLocked
                            ? 'WASD move · mouse look · Space jump · E use · Esc release look'
                            : 'Click scene to capture look · WASD · Space · E'}
                    </p>
                )}
            </div>
        </>
    );
}
