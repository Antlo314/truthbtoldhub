'use client';

import { useEffect, useRef } from 'react';

/**
 * AmbientEmbers — a lightweight canvas particle field used behind the title
 * card and other "atmospheric" screens. Slow-rising embers + faint drifting
 * motes give the scene a constant, living motion so the screen never feels
 * frozen while a cinematic video buffers or waits muted.
 *
 * Tuned to be cheap: ~50 particles, single canvas, requestAnimationFrame with
 * an IntersectionObserver pause when off-screen. Respects prefers-reduced-motion.
 */
export default function AmbientEmbers({
    density = 46,
    className = '',
    tint = '#fbbf24',
}: {
    density?: number;
    className?: string;
    tint?: string;
}) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf = 0;
        let running = true;
        let w = 0;
        let h = 0;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        interface P {
            x: number; y: number; vx: number; vy: number;
            r: number; a: number; drift: number; tw: number; hue: string;
        }
        let parts: P[] = [];

        const tintRgb = hexToRgb(tint);

        function resize() {
            const rect = canvas!.getBoundingClientRect();
            w = rect.width;
            h = rect.height;
            canvas!.width = Math.floor(w * dpr);
            canvas!.height = Math.floor(h * dpr);
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        }

        function seed() {
            parts = [];
            const n = reduce ? Math.floor(density * 0.25) : density;
            for (let i = 0; i < n; i++) parts.push(spawn(true));
        }

        function spawn(initial = false): P {
            const isEmber = Math.random() < 0.6;
            return {
                x: Math.random() * w,
                y: initial ? Math.random() * h : h + 10,
                vx: (Math.random() - 0.5) * 6,
                vy: -(isEmber ? 9 + Math.random() * 18 : 3 + Math.random() * 6),
                r: isEmber ? 0.7 + Math.random() * 1.6 : 0.4 + Math.random() * 0.8,
                a: isEmber ? 0.25 + Math.random() * 0.5 : 0.06 + Math.random() * 0.18,
                drift: Math.random() * Math.PI * 2,
                tw: 0.4 + Math.random() * 1.6,
                hue: isEmber ? tintRgb : '255,240,210',
            };
        }

        let last = performance.now();
        function frame(now: number) {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            ctx!.clearRect(0, 0, w, h);
            ctx!.globalCompositeOperation = 'lighter';
            for (const p of parts) {
                p.drift += dt * p.tw;
                p.x += (p.vx + Math.sin(p.drift) * 4) * dt;
                p.y += p.vy * dt;
                // twinkle
                const tw = 0.65 + 0.35 * Math.sin(p.drift * 1.7);
                const alpha = p.a * tw;
                if (p.y < -12 || p.x < -20 || p.x > w + 20) {
                    Object.assign(p, spawn(false));
                    continue;
                }
                ctx!.beginPath();
                ctx!.fillStyle = `rgba(${p.hue},${alpha.toFixed(3)})`;
                ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx!.fill();
                // soft halo on the bigger embers
                if (p.r > 1.2) {
                    ctx!.beginPath();
                    ctx!.fillStyle = `rgba(${p.hue},${(alpha * 0.22).toFixed(3)})`;
                    ctx!.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
                    ctx!.fill();
                }
            }
            ctx!.globalCompositeOperation = 'source-over';
            raf = requestAnimationFrame(frame);
        }

        function hexToRgb(hex: string): string {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!m) return '251,191,36';
            return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
        }

        resize();
        window.addEventListener('resize', resize);
        raf = requestAnimationFrame(frame);

        const io = new IntersectionObserver(
            (entries) => {
                running = entries[0].isIntersecting;
                if (running && !raf) {
                    last = performance.now();
                    raf = requestAnimationFrame(frame);
                } else if (!running) {
                    cancelAnimationFrame(raf);
                    raf = 0;
                }
            },
            { threshold: 0 },
        );
        io.observe(canvas);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            io.disconnect();
        };
    }, [density, tint]);

    return (
        <canvas
            ref={ref}
            aria-hidden
            className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
        />
    );
}
