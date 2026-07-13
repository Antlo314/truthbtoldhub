'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { gameMusic } from '@/lib/game/music';
import { DURATION, EASE } from '@/lib/design/motion';
import SacredButton from '@/components/sanctum/SacredButton';
import JourneyBrief from '@/components/sanctum/JourneyBrief';
import { BRAND } from '@/lib/brand/assets';
import { visionStats } from '@/lib/brand/visionProgress';
import { suggestNextRoad } from '@/lib/brand/nextRoad';
import { sacredUi } from '@/lib/game/sacredUiSfx';

// =====================================================================
//  THE JOURNEY 3D — Truth's Hut
//  Crossing is a ritual. The hut is a living sanctuary.
// =====================================================================

declare global {
    interface Window {
        createUnityInstance?: (
            canvas: HTMLCanvasElement,
            config: Record<string, unknown>,
            onProgress?: (p: number) => void,
        ) => Promise<{ Quit: () => Promise<void>; SetFullscreen: (f: number) => void }>;
    }
}

const BUILD_BASE = '/hut3d/Build';

const CROSSING: { at: number; t: string }[] = [
    { at: 0, t: 'Darkness holds its breath…' },
    { at: 0.1, t: 'A hearth remembers your name.' },
    { at: 0.25, t: 'Truth stands in the light, waiting.' },
    { at: 0.42, t: 'Wood grain. Gold dust. Sacred ground.' },
    { at: 0.6, t: 'Your vessel steps into the chamber.' },
    { at: 0.78, t: 'The door is open. Walk.' },
    { at: 0.92, t: 'Welcome home.' },
];

function lineForProgress(p: number): string {
    let line = CROSSING[0].t;
    for (const c of CROSSING) if (p >= c.at) line = c.t;
    return line;
}

export default function World3DPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<{ Quit: () => Promise<void> } | null>(null);
    const [progress, setProgress] = useState(0);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTouch, setIsTouch] = useState(false);
    const [veilLifted, setVeilLifted] = useState(false);
    const [vStats, setVStats] = useState({ seen: 0, total: 5, relics: 0, complete: false });
    const [nextHint, setNextHint] = useState<{ href: string; label: string } | null>(null);

    const whisper = useMemo(() => lineForProgress(progress), [progress]);

    useEffect(() => {
        const refresh = () => {
            try {
                setVStats(visionStats());
                const n = suggestNextRoad();
                setNextHint({ href: n.href, label: n.label });
            } catch { /* */ }
        };
        refresh();
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);

    const fitCanvas = () => {
        const c = canvasRef.current;
        const stage = stageRef.current;
        if (!c || !stage) return;
        const r = stage.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = r.width > 50 ? r.width : window.innerWidth;
        const h = r.height > 50 ? r.height : window.innerHeight - 40;
        c.width = Math.max(1, Math.round(w * dpr));
        c.height = Math.max(1, Math.round(h * dpr));
    };

    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
        fitCanvas();
        window.addEventListener('resize', fitCanvas);
        window.addEventListener('orientationchange', fitCanvas);

        const startMusic = () => {
            gameMusic.playBgm('world_cavern', { variant: gameMusic.pickVariant('world_cavern') });
            window.removeEventListener('pointerdown', startMusic);
            window.removeEventListener('keydown', startMusic);
        };
        window.addEventListener('pointerdown', startMusic);
        window.addEventListener('keydown', startMusic);
        try {
            gameMusic.playBgm('world_cavern', { variant: gameMusic.pickVariant('world_cavern') });
        } catch { /* autoplay */ }

        let cancelled = false;
        let script: HTMLScriptElement | null = null;

        const boot = async () => {
            let v = String(Date.now());
            try {
                const txt = await fetch(`/hut3d/version.txt?t=${Date.now()}`, { cache: 'no-store' }).then((r) => r.text());
                if (txt && txt.trim()) v = txt.trim();
            } catch { /* */ }
            if (cancelled) return;
            const q = `?v=${encodeURIComponent(v)}`;

            script = document.createElement('script');
            script.src = `${BUILD_BASE}/webgl.loader.js${q}`;
            // Warm the browser cache for heavy WebGL binaries while the loader boots
            try {
                ['webgl.data.unityweb', 'webgl.framework.js.unityweb', 'webgl.wasm.unityweb'].forEach((f) => {
                    const l = document.createElement('link');
                    l.rel = 'prefetch';
                    l.href = `${BUILD_BASE}/${f}${q}`;
                    l.as = f.endsWith('.wasm.unityweb') ? 'fetch' : 'fetch';
                    document.head.appendChild(l);
                });
            } catch { /* ignore */ }
            script.onload = () => {
                if (cancelled || !canvasRef.current || !window.createUnityInstance) return;
                fitCanvas();
                window
                    .createUnityInstance(
                        canvasRef.current,
                        {
                            dataUrl: `${BUILD_BASE}/webgl.data.unityweb${q}`,
                            frameworkUrl: `${BUILD_BASE}/webgl.framework.js.unityweb${q}`,
                            codeUrl: `${BUILD_BASE}/webgl.wasm.unityweb${q}`,
                            companyName: 'Truth B Told',
                            productName: "The Journey - Truth's Hut",
                            productVersion: '1.3',
                            matchWebGLToCanvasSize: false,
                            webglContextAttributes: { preserveDrawingBuffer: true },
                        },
                        (p) => setProgress(p),
                    )
                    .then((instance) => {
                        if (cancelled) {
                            instance.Quit();
                            return;
                        }
                        instanceRef.current = instance;
                        setReady(true);
                        setTimeout(() => setVeilLifted(true), 900);
                    })
                    .catch((e: Error) => setError(e.message));
            };
            script.onerror = () => setError('The hut could not be summoned. Refresh to try again.');
            document.body.appendChild(script);
        };
        boot();

        return () => {
            cancelled = true;
            gameMusic.stopBgm(800);
            window.removeEventListener('resize', fitCanvas);
            window.removeEventListener('orientationchange', fitCanvas);
            window.removeEventListener('pointerdown', startMusic);
            window.removeEventListener('keydown', startMusic);
            instanceRef.current?.Quit().catch(() => undefined);
            script?.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goFullscreen = async () => {
        const stage = stageRef.current;
        if (!stage) return;
        try {
            if (!document.fullscreenElement) await stage.requestFullscreen();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const so: any = screen.orientation;
            if (so?.lock) await so.lock('landscape').catch(() => undefined);
        } catch { /* */ }
        setTimeout(fitCanvas, 350);
    };

    const pct = Math.round(progress * 100);

    return (
        <div className="w-full h-[100dvh] bg-[#05060c] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-2 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.28em] text-zinc-500 border-b border-aether-gold/10 shrink-0 bg-black/55 backdrop-blur-md">
                <Link
                    href="/"
                    onClick={() => sacredUi.click()}
                    className="hover:text-aether-gold transition-colors whitespace-nowrap shrink-0"
                >
                    ← Sanctum
                </Link>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-center flex-1">
                    <span className="text-aether-gold/85 font-black truncate tracking-[0.18em] sm:tracking-[0.22em]">
                        Truth&apos;s Hut
                    </span>
                    {(vStats.seen > 0 || vStats.relics > 0) && (
                        <span className="hidden sm:inline text-[8px] normal-case tracking-normal text-white/30 tabular-nums shrink-0">
                            {vStats.seen}/{vStats.total} · {vStats.relics} relics
                        </span>
                    )}
                </div>
                <nav className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <Link
                        href="/vision"
                        onClick={() => sacredUi.threshold()}
                        className="hover:text-aether-gold transition-colors whitespace-nowrap"
                    >
                        Visions
                    </Link>
                    <Link
                        href="/archive"
                        onClick={() => sacredUi.click()}
                        className="hidden xs:inline hover:text-white transition-colors whitespace-nowrap sm:inline"
                    >
                        Hall
                    </Link>
                    {vStats.complete ? (
                        <Link
                            href="/epilogue"
                            onClick={() => sacredUi.access()}
                            className="text-aether-gold hover:text-white transition-colors whitespace-nowrap"
                        >
                            Source
                        </Link>
                    ) : (
                        <Link
                            href="/support"
                            onClick={() => sacredUi.click()}
                            className="hover:text-white transition-colors whitespace-nowrap"
                        >
                            Offer
                        </Link>
                    )}
                </nav>
            </div>

            <div ref={stageRef} className="relative flex-1 min-h-0 bg-[#05060c]">
                <canvas
                    ref={canvasRef}
                    id="unity-canvas"
                    className="absolute inset-0 w-full h-full block"
                    style={{ background: '#05060c' }}
                />

                {ready && isTouch && !error && veilLifted && (
                    <button
                        type="button"
                        onClick={goFullscreen}
                        className="absolute z-10 px-4 py-2.5 rounded-full bg-black/70 border border-aether-gold/45 text-aether-gold text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 backdrop-blur-md min-h-[44px] min-w-[44px]"
                        style={{ top: 'calc(0.5rem + env(safe-area-inset-top))', right: 'calc(0.5rem + env(safe-area-inset-right))' }}
                    >
                        ⛶ Fullscreen
                    </button>
                )}

                {ready && veilLifted && !error && (
                    <div
                        className="absolute left-1/2 -translate-x-1/2 z-10 px-4 flex flex-col items-center gap-2 pointer-events-none"
                        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
                    >
                        {nextHint && (
                            <Link
                                href={nextHint.href}
                                onClick={() => sacredUi.threshold()}
                                className="pointer-events-auto text-[8px] sm:text-[9px] uppercase tracking-[0.22em] text-aether-gold/85 text-center bg-black/65 backdrop-blur-sm rounded-full px-4 py-2 border border-aether-gold/30 hover:border-aether-gold/55 transition-colors max-w-[min(92vw,20rem)] truncate"
                            >
                                Next · {nextHint.label} →
                            </Link>
                        )}
                        <p className="text-[8px] sm:text-[9px] uppercase tracking-[0.28em] text-white/40 text-center bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10 pointer-events-none">
                            {isTouch
                                ? 'Left stick walk · drag right look · E interact'
                                : 'WASD walk · right-drag look · E interact'}
                        </p>
                    </div>
                )}

                {ready && veilLifted && !error && <JourneyBrief ready />}

                <AnimatePresence>
                    {!veilLifted && !error && (
                        <motion.div
                            key="crossing"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: DURATION.ritual, ease: EASE.breath }}
                            className="absolute inset-0 z-20"
                        >
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center px-6"
                                style={{
                                    background:
                                        'radial-gradient(ellipse 75% 60% at 50% 42%, rgba(28,18,8,0.94) 0%, rgba(5,6,12,0.98) 72%, #05060c 100%)',
                                }}
                            >
                                <video
                                    autoPlay muted loop playsInline
                                    poster={BRAND.hut}
                                    className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
                                    style={{ filter: 'saturate(0.75) brightness(0.4)' }}
                                >
                                    <source src={BRAND.video.hut} type="video/mp4" />
                                </video>
                                <div
                                    aria-hidden
                                    className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none title-breath"
                                    style={{
                                        background:
                                            'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 65%)',
                                        filter: 'blur(14px)',
                                    }}
                                />

                                <p className="relative text-[9px] uppercase tracking-[0.55em] text-aether-gold/55 mb-5">
                                    Crossing the threshold
                                </p>

                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={whisper}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: DURATION.settle, ease: EASE.breath }}
                                        className="relative font-ritual text-xl sm:text-3xl text-white/92 text-center max-w-md leading-relaxed min-h-[3.2em] flex items-center justify-center px-2"
                                    >
                                        {whisper}
                                    </motion.p>
                                </AnimatePresence>

                                <div className="relative mt-10 w-56 sm:w-80">
                                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-200"
                                            style={{
                                                width: `${pct}%`,
                                                background: 'linear-gradient(90deg, #b45309, #fcd34d, #fbbf24)',
                                                boxShadow: '0 0 18px rgba(251,191,36,0.4)',
                                            }}
                                        />
                                    </div>
                                    <p className="mt-3 text-center text-[9px] uppercase tracking-[0.32em] text-white/30 tabular-nums">
                                        {ready ? 'The veil lifts…' : `${pct}%`}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 text-center px-6 bg-black/92">
                        <p className="text-[10px] uppercase tracking-[0.4em] text-aether-gold/50">The veil resisted</p>
                        <p className="font-ritual text-lg text-white/80 max-w-sm">{error}</p>
                        <SacredButton onClick={() => window.location.reload()}>
                            Try the threshold again
                        </SacredButton>
                    </div>
                )}
            </div>
        </div>
    );
}
