'use client';

import { BRAND } from '@/lib/brand/assets';
import { cn } from '@/lib/design/cn';

type Variant = 'portal' | 'hut' | 'awakening' | 'hall' | 'keyart';

const MAP: Record<Variant, { still: string; video?: string }> = {
    portal: { still: BRAND.portal, video: BRAND.video.portal },
    hut: { still: BRAND.hut, video: BRAND.video.hut },
    awakening: { still: BRAND.awakening, video: BRAND.video.awakening },
    hall: { still: BRAND.hall },
    keyart: { still: BRAND.keyart },
};

/**
 * Full-bleed ambient media layer for hub pages — video loop with still poster.
 */
export default function AmbientBackdrop({
    variant = 'portal',
    opacity = 0.28,
    className,
}: {
    variant?: Variant;
    opacity?: number;
    className?: string;
}) {
    const m = MAP[variant];
    return (
        <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden>
            {m.video ? (
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={m.still}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity, filter: 'saturate(0.85) brightness(0.55)' }}
                >
                    <source src={m.video} type="video/mp4" />
                </video>
            ) : (
                <div
                    className="absolute inset-0"
                    style={{
                        opacity,
                        backgroundImage: `url(${m.still})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'saturate(0.85) brightness(0.5)',
                    }}
                />
            )}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
                }}
            />
        </div>
    );
}
