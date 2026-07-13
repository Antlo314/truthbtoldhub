'use client';

import type { CSSProperties } from 'react';

/**
 * Abstract Presence glyph — geometric vessel of light, never a human figure.
 */
export default function TruthSprite({
    scale = 8,
    className,
    style,
}: {
    scale?: number;
    className?: string;
    style?: CSSProperties;
}) {
    const size = Math.round(16 * scale);

    return (
        <div
            className={className}
            role="img"
            aria-label="The Presence"
            style={{
                width: size,
                height: Math.round(size * 1.35),
                position: 'relative',
                ...style,
            }}
        >
            {/* outer ring */}
            <div
                aria-hidden
                className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-aether-gold/50"
                style={{
                    width: size * 0.92,
                    height: size * 0.92,
                    boxShadow: '0 0 28px rgba(251,191,36,0.35)',
                }}
            />
            {/* core */}
            <div
                aria-hidden
                className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                    width: size * 0.42,
                    height: size * 0.55,
                    background:
                        'radial-gradient(circle at 40% 35%, #fef3c7 0%, #fbbf24 35%, #22d3ee 70%, #0ea5e9 100%)',
                    boxShadow: '0 0 36px rgba(251,191,36,0.55), 0 0 18px rgba(34,211,238,0.35)',
                }}
            />
            {/* dais glow */}
            <div
                aria-hidden
                className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full"
                style={{
                    width: size * 0.7,
                    height: size * 0.12,
                    background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.45), transparent 70%)',
                }}
            />
        </div>
    );
}
