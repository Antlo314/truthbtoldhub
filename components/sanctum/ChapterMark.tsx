'use client';

import { cn } from '@/lib/design/cn';
import { motion } from 'framer-motion';
import { DURATION, EASE } from '@/lib/design/motion';

interface ChapterMarkProps {
    chapter?: string;
    title?: string;
    subtitle?: string;
    className?: string;
    align?: 'center' | 'left';
}

/** Eyebrow + optional title — consistent chapter voice across the arc */
export default function ChapterMark({
    chapter,
    title,
    subtitle,
    className,
    align = 'center',
}: ChapterMarkProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.settle, ease: EASE.breath }}
            className={cn(
                'flex flex-col gap-2',
                align === 'center' && 'items-center text-center',
                align === 'left' && 'items-start text-left',
                className,
            )}
        >
            {chapter && (
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-aether-gold/70">
                    {chapter}
                </span>
            )}
            {chapter && (
                <div
                    className="h-px w-20 rule-draw"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.65), transparent)' }}
                />
            )}
            {title && (
                <h1 className="font-ritual text-2xl sm:text-4xl font-black uppercase tracking-tight gold-shimmer leading-tight">
                    {title}
                </h1>
            )}
            {subtitle && (
                <p className="text-[11px] sm:text-xs text-white/45 max-w-md leading-relaxed text-balance">
                    {subtitle}
                </p>
            )}
        </motion.div>
    );
}
