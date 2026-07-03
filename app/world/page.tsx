'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gameMusic } from '@/lib/game/music';

// =====================================================================
//  THE JOURNEY 3D — Truth's Hut (Unity WebGL)
//  Mobile-first host: the canvas fills the viewport at native pixel
//  density, phones get a fullscreen+landscape button, and the game's
//  original soundtrack (public/audio/game) plays here on the page.
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

export default function World3DPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<{ Quit: () => Promise<void> } | null>(null);
    const [progress, setProgress] = useState(0);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTouch, setIsTouch] = useState(false);

    // size the render buffer to the element's real pixels (capped DPR for perf);
    // if an ancestor ever collapses the stage, fall back to the viewport
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

        // the original soundtrack, started on the first gesture (autoplay policy)
        const startMusic = () => {
            gameMusic.playBgm('world_cavern', { variant: gameMusic.pickVariant('world_cavern') });
            window.removeEventListener('pointerdown', startMusic);
            window.removeEventListener('keydown', startMusic);
        };
        window.addEventListener('pointerdown', startMusic);
        window.addEventListener('keydown', startMusic);

        let cancelled = false;
        const script = document.createElement('script');
        script.src = `${BUILD_BASE}/webgl.loader.js`;
        script.onload = () => {
            if (cancelled || !canvasRef.current || !window.createUnityInstance) return;
            fitCanvas();
            window
                .createUnityInstance(
                    canvasRef.current,
                    {
                        dataUrl: `${BUILD_BASE}/webgl.data.unityweb`,
                        frameworkUrl: `${BUILD_BASE}/webgl.framework.js.unityweb`,
                        codeUrl: `${BUILD_BASE}/webgl.wasm.unityweb`,
                        companyName: 'Truth B Told',
                        productName: "The Journey - Truth's Hut",
                        productVersion: '1.1',
                        matchWebGLToCanvasSize: false,   // we size the buffer ourselves
                        webglContextAttributes: { preserveDrawingBuffer: true },
                    },
                    (p) => setProgress(p),
                )
                .then((instance) => {
                    if (cancelled) { instance.Quit(); return; }
                    instanceRef.current = instance;
                    setReady(true);
                })
                .catch((e: Error) => setError(e.message));
        };
        script.onerror = () => setError('The hut could not be summoned. Refresh to try again.');
        document.body.appendChild(script);
        return () => {
            cancelled = true;
            gameMusic.stopBgm(600);
            window.removeEventListener('resize', fitCanvas);
            window.removeEventListener('orientationchange', fitCanvas);
            window.removeEventListener('pointerdown', startMusic);
            window.removeEventListener('keydown', startMusic);
            instanceRef.current?.Quit().catch(() => undefined);
            script.remove();
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
        } catch { /* not supported everywhere */ }
        setTimeout(fitCanvas, 350);
    };

    return (
        // NOTE: not position:fixed - an ancestor in the site layout creates a
        // containing block that collapses fixed elements to 0px height (the
        // "black screen"). Explicit dynamic-viewport height is bulletproof.
        <div className="w-full h-[100dvh] bg-[#06080e] flex flex-col overflow-hidden">
            {/* top bar — hidden in fullscreen for max play area */}
            <div className="flex items-center justify-between px-3 py-1.5 text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-zinc-500 border-b border-white/5 shrink-0">
                <Link href="/" className="hover:text-aether-gold transition-colors whitespace-nowrap">← Hub</Link>
                <span className="text-aether-gold/80 font-black truncate px-2">The Journey · Truth&apos;s Hut</span>
                <Link href="/support" className="hover:text-white transition-colors whitespace-nowrap">Fuel the Vision</Link>
            </div>

            {/* game stage */}
            <div ref={stageRef} className="relative flex-1 min-h-0 bg-[#06080e]">
                <canvas
                    ref={canvasRef}
                    id="unity-canvas"
                    className="absolute inset-0 w-full h-full block"
                    style={{ background: '#06080e' }}
                />
                {ready && isTouch && !error && (
                    <button
                        onClick={goFullscreen}
                        className="absolute top-2 right-2 z-10 px-3 py-2 rounded-lg bg-black/60 border border-aether-gold/40 text-aether-gold text-[10px] font-black uppercase tracking-[0.2em] active:scale-95"
                    >
                        ⛶ Fullscreen
                    </button>
                )}
                {!ready && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none px-6">
                        <div className="text-aether-gold text-xs uppercase tracking-[0.4em] animate-pulse text-center">
                            Kindling the hearth…
                        </div>
                        <div className="w-56 sm:w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200"
                                style={{ width: `${Math.round(progress * 100)}%` }}
                            />
                        </div>
                        <div className="text-zinc-600 text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-center">
                            {typeof window !== 'undefined' && 'ontouchstart' in window
                                ? 'left thumb: walk · right thumb: look · E button: interact'
                                : 'WASD move · right-drag look · E interact'}
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                        <div className="text-red-400 text-sm">{error}</div>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-aether-gold text-xs uppercase tracking-[0.3em] underline"
                        >
                            Reload the Hut
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
