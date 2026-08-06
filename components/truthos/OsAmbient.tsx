'use client';

/**
 * The living layer behind the desktop.
 *
 * A still wallpaper under flat cards is most of why an OS reads as "plain" —
 * nothing on screen is alive, so the whole surface feels like a printed page.
 * This sits between the wallpaper and the content and gives it depth three
 * ways: slow drifting aurora blobs, a parallax tilt that answers the pointer,
 * and film grain so large flat areas aren't dead gradient.
 *
 * All CSS — the drift runs as keyframe animation on the compositor rather than
 * a rAF loop, so it costs effectively nothing and keeps running while React is
 * busy. Parallax is the only JS, throttled to pointer moves and written
 * straight to a CSS variable rather than through state.
 *
 * Honours prefers-reduced-motion by dropping the drift and the parallax.
 */
import { useEffect, useRef } from 'react';
import { ACCENT_HEX } from './osSystemStore';
import type { OsAccentId } from './OsIcon';
import AetherDust from './AetherDust';

export default function OsAmbient({
    accent,
    phone = false,
}: {
    accent: OsAccentId;
    phone?: boolean;
}) {
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (phone) return;
        const el = root.current;
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let raf = 0;
        let tx = 0;
        let ty = 0;
        const onMove = (e: PointerEvent) => {
            // -1..1 from centre; the layers below scale this differently
            tx = (e.clientX / window.innerWidth - 0.5) * 2;
            ty = (e.clientY / window.innerHeight - 0.5) * 2;
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                el.style.setProperty('--px', tx.toFixed(3));
                el.style.setProperty('--py', ty.toFixed(3));
            });
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
            window.removeEventListener('pointermove', onMove);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [phone]);

    const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.emerald;

    return (
        <div
            ref={root}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ ['--px' as string]: '0', ['--py' as string]: '0' }}
        >
            <style>{`
                @keyframes os-drift-a {
                    0%,100% { transform: translate3d(0,0,0) scale(1); }
                    33%     { transform: translate3d(6%, -4%, 0) scale(1.12); }
                    66%     { transform: translate3d(-4%, 5%, 0) scale(0.94); }
                }
                @keyframes os-drift-b {
                    0%,100% { transform: translate3d(0,0,0) scale(1.05); }
                    50%     { transform: translate3d(-7%, 6%, 0) scale(0.9); }
                }
                @keyframes os-drift-c {
                    0%,100% { transform: translate3d(0,0,0) scale(0.95); }
                    40%     { transform: translate3d(5%, 7%, 0) scale(1.15); }
                    75%     { transform: translate3d(-6%, -3%, 0) scale(1.02); }
                }
                @keyframes os-sheen {
                    0%   { opacity: 0;   transform: translateX(-30%) skewX(-14deg); }
                    45%  { opacity: 0.5; }
                    100% { opacity: 0;   transform: translateX(130%) skewX(-14deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .os-amb { animation: none !important; }
                }
            `}</style>

            {/* Aurora blobs — accent-tinted so the desktop recolours with the theme */}
            <div
                className="os-amb absolute rounded-full blur-[90px] opacity-[0.55] will-change-transform"
                style={{
                    width: '58vmax',
                    height: '58vmax',
                    left: '-14vmax',
                    top: '-18vmax',
                    background: `radial-gradient(circle at 40% 40%, ${hex}66, transparent 68%)`,
                    animation: phone ? undefined : 'os-drift-a 34s ease-in-out infinite',
                    transform: 'translate3d(calc(var(--px) * -14px), calc(var(--py) * -14px), 0)',
                }}
            />
            <div
                className="os-amb absolute rounded-full blur-[100px] opacity-[0.42] will-change-transform"
                style={{
                    width: '52vmax',
                    height: '52vmax',
                    right: '-16vmax',
                    top: '-8vmax',
                    // Brand indigo (--aether-indigo), not generic sky cyan
                    background: 'radial-gradient(circle at 50% 50%, #6366f166, transparent 66%)',
                    animation: phone ? undefined : 'os-drift-b 46s ease-in-out infinite',
                    transform: 'translate3d(calc(var(--px) * -22px), calc(var(--py) * -18px), 0)',
                }}
            />
            <div
                className="os-amb absolute rounded-full blur-[110px] opacity-[0.38] will-change-transform"
                style={{
                    width: '62vmax',
                    height: '62vmax',
                    left: '18vmax',
                    bottom: '-30vmax',
                    background: 'radial-gradient(circle at 50% 50%, #a78bfa55, transparent 70%)',
                    animation: phone ? undefined : 'os-drift-c 58s ease-in-out infinite',
                    transform: 'translate3d(calc(var(--px) * -30px), calc(var(--py) * -24px), 0)',
                }}
            />

            {/* True 3D: gold aether motes drifting in depth. Desktop only —
                a phone GPU has better things to do than a wallpaper. */}
            <AetherDust enabled={!phone} />

            {/* Slow specular sweep — the thing that makes glass read as glass */}
            {!phone && (
                <div
                    className="os-amb absolute inset-y-0 w-[38%] opacity-0"
                    style={{
                        background:
                            'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                        animation: 'os-sheen 19s ease-in-out infinite',
                    }}
                />
            )}

            {/* Depth: darken the edges so content sits forward */}
            <div className="absolute inset-0 bg-[radial-gradient(120%_95%_at_50%_38%,transparent_38%,rgba(0,0,0,0.55)_100%)]" />

            {/* Film grain — kills gradient banding on large flat areas */}
            <div
                className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'repeat',
                }}
            />
        </div>
    );
}
