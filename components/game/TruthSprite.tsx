'use client';

import type { CSSProperties } from 'react';

// Truth's bespoke 16x16 pixel sprite — a hooded mystic with a young
// visage and a goatee, drawn to sit naturally beside the Kenney tiles.
// Lives at public/assets/truth.png (the whole sprite, not a sheet crop).

export const TRUTH_SPRITE_SRC = '/assets/truth.png';

export default function TruthSprite({
    scale = 12,
    className,
    style,
}: {
    scale?: number;
    className?: string;
    style?: CSSProperties;
}) {
    const size = 16 * scale;
    return (
        <div
            className={className}
            role="img"
            aria-label="Truth"
            style={{
                width: size,
                height: size,
                backgroundImage: `url(${TRUTH_SPRITE_SRC})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                ...style,
            }}
        />
    );
}
