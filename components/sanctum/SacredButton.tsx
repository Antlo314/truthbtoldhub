'use client';

import { cn } from '@/lib/design/cn';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { sacredUi } from '@/lib/game/sacredUiSfx';

type Variant = 'primary' | 'ghost' | 'veil' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface SacredButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    pulse?: boolean;
    children: ReactNode;
}

const sizeCls: Record<Size, string> = {
    sm: 'px-4 py-2 text-[10px] tracking-[0.22em]',
    md: 'px-7 py-3 text-[11px] tracking-[0.28em]',
    lg: 'px-10 py-4 text-[11px] tracking-[0.3em]',
};

export default function SacredButton({
    variant = 'primary',
    size = 'md',
    pulse = false,
    className,
    children,
    disabled,
    type = 'button',
    onClick,
    onMouseEnter,
    ...rest
}: SacredButtonProps) {
    const base =
        'inline-flex items-center justify-center gap-2 rounded-full font-black uppercase transition-all duration-300 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aether-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black ' +
        'active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none';

    const variants: Record<Variant, string> = {
        primary:
            'text-black hover:scale-[1.02] shadow-[0_0_32px_rgba(251,191,36,0.22)] ' +
            'bg-[linear-gradient(135deg,#fcd34d_0%,#b45309_100%)]',
        ghost:
            'text-aether-gold/90 border border-aether-gold/30 bg-aether-gold/[0.06] hover:bg-aether-gold/15 hover:border-aether-gold/50',
        veil:
            'text-white/70 border border-white/10 bg-white/[0.04] hover:text-white hover:border-white/25 hover:bg-white/[0.08]',
        link:
            'rounded-none px-0 py-0 text-[10px] tracking-[0.2em] font-bold text-white/35 hover:text-aether-gold/80 normal-case',
    };

    return (
        <button
            type={type}
            disabled={disabled}
            className={cn(
                base,
                sizeCls[size],
                variants[variant],
                pulse && variant === 'primary' && 'cta-pulse',
                className,
            )}
            onMouseEnter={(e) => {
                if (!disabled) sacredUi.hover();
                onMouseEnter?.(e);
            }}
            onClick={(e) => {
                if (!disabled) sacredUi.click();
                onClick?.(e);
            }}
            {...rest}
        >
            {children}
        </button>
    );
}
