'use client';

import { cn } from '@/lib/design/cn';
import type { CSSProperties, ReactNode } from 'react';

interface VeilPanelProps {
    children: ReactNode;
    className?: string;
    /** Accent border / wash (hex) */
    accent?: string;
    /** denser glass for dialogue */
    density?: 'soft' | 'medium' | 'heavy';
    style?: CSSProperties;
    onClick?: () => void;
}

const densityBg = {
    soft: 'bg-black/25 backdrop-blur-md',
    medium: 'bg-black/40 backdrop-blur-lg',
    heavy: 'bg-black/55 backdrop-blur-xl',
} as const;

/**
 * Sacred glass surface — one material language for dialogue, cards, menus.
 */
export default function VeilPanel({
    children,
    className,
    accent = 'rgba(251,191,36,0.18)',
    density = 'medium',
    style,
    onClick,
}: VeilPanelProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.45)]',
                densityBg[density],
                className,
            )}
            style={{
                borderColor: accent,
                boxShadow: `0 20px 50px rgba(0,0,0,0.45), 0 0 40px ${accent.replace(/[\d.]+\)$/, '0.06)')}`,
                ...style,
            }}
        >
            {children}
        </div>
    );
}
