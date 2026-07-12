'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/design/cn';

interface HubChromeProps {
    /** Eyebrow above the title */
    chapter?: string;
    title: string;
    subtitle?: string;
    /** Fall-back route when history is empty */
    backHref?: string;
    trailing?: ReactNode;
    children: ReactNode;
    className?: string;
    /** Wider content column (cinema, etc.) */
    wide?: boolean;
}

/**
 * Shared chrome for Memory-layer routes (Library, Cinema, Support, etc.).
 * One breath: back, chapter mark, gold wash — then the content.
 */
export default function HubChrome({
    chapter,
    title,
    subtitle,
    backHref = '/',
    trailing,
    children,
    className,
    wide = false,
}: HubChromeProps) {
    const router = useRouter();

    const goBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push(backHref);
    };

    return (
        <div className={cn('relative min-h-[100dvh] bg-black text-white overflow-x-hidden', className)}>
            <div
                className="pointer-events-none fixed inset-0"
                style={{
                    background:
                        'radial-gradient(120% 70% at 50% -10%, rgba(251,191,36,0.10), transparent 60%)',
                }}
            />

            <div
                className={cn(
                    'relative z-10 mx-auto w-full px-4 sm:px-6 pb-28',
                    wide ? 'max-w-7xl' : 'max-w-5xl',
                )}
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
            >
                <header className="flex items-start gap-3 py-4 mb-2">
                    <button
                        type="button"
                        onClick={goBack}
                        className="mt-1 p-2.5 rounded-full bg-black/45 border border-white/10 text-zinc-200 hover:text-aether-gold hover:border-aether-gold/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aether-gold/60"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        {chapter && (
                            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.45em] text-aether-gold/70 mb-1.5">
                                {chapter}
                            </p>
                        )}
                        <h1 className="font-ritual text-2xl sm:text-4xl font-black uppercase tracking-tight gold-shimmer leading-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-[11px] sm:text-xs text-white/45 mt-2 max-w-lg leading-relaxed">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {trailing && <div className="shrink-0 pt-1">{trailing}</div>}
                </header>

                {children}
            </div>
        </div>
    );
}
