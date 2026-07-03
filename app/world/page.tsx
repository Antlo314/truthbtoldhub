'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// =====================================================================
//  THE JOURNEY 3D — Truth's Hut (Unity WebGL)
//  The 3D hut replaced the 2D overworld here on 2026-07-02.
//  The classic 2D build still lives at /world2d (deep-links use it too).
//  Build artifacts are served from /public/hut3d/Build (see journey3d/).
// =====================================================================

declare global {
    interface Window {
        createUnityInstance?: (
            canvas: HTMLCanvasElement,
            config: Record<string, unknown>,
            onProgress?: (p: number) => void,
        ) => Promise<{ Quit: () => Promise<void> }>;
    }
}

const BUILD_BASE = '/hut3d/Build';

export default function World3DPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const instanceRef = useRef<{ Quit: () => Promise<void> } | null>(null);
    const [progress, setProgress] = useState(0);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const script = document.createElement('script');
        script.src = `${BUILD_BASE}/webgl.loader.js`;
        script.onload = () => {
            if (cancelled || !canvasRef.current || !window.createUnityInstance) return;
            window
                .createUnityInstance(
                    canvasRef.current,
                    {
                        dataUrl: `${BUILD_BASE}/webgl.data.unityweb`,
                        frameworkUrl: `${BUILD_BASE}/webgl.framework.js.unityweb`,
                        codeUrl: `${BUILD_BASE}/webgl.wasm.unityweb`,
                        companyName: 'Truth B Told',
                        productName: "The Journey - Truth's Hut",
                        productVersion: '1.0',
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
            instanceRef.current?.Quit().catch(() => undefined);
            script.remove();
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-[#06080e] flex flex-col">
            {/* top bar */}
            <div className="flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-zinc-500 border-b border-white/5">
                <Link href="/" className="hover:text-aether-gold transition-colors">← Truth B Told Hub</Link>
                <span className="text-aether-gold/80 font-black">The Journey · Truth&apos;s Hut</span>
                <Link href="/world2d" className="hover:text-white transition-colors">Classic 2D world</Link>
            </div>

            {/* game */}
            <div className="relative flex-1">
                <canvas
                    ref={canvasRef}
                    id="unity-canvas"
                    className="w-full h-full block"
                    style={{ background: '#06080e' }}
                />
                {!ready && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                        <div className="text-aether-gold text-xs uppercase tracking-[0.4em] animate-pulse">
                            Kindling the hearth…
                        </div>
                        <div className="w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200"
                                style={{ width: `${Math.round(progress * 100)}%` }}
                            />
                        </div>
                        <div className="text-zinc-600 text-[10px] uppercase tracking-[0.3em]">
                            WASD move · right-drag look · E interact
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                        <div className="text-red-400 text-sm">{error}</div>
                        <Link href="/world2d" className="text-aether-gold text-xs uppercase tracking-[0.3em] underline">
                            Enter the classic 2D world instead
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
