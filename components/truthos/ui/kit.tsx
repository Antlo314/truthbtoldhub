'use client';

/**
 * Truth.OS 4 app kit — the one visual grammar every built-in app speaks.
 *
 * Sentence-case titles, grouped inset lists, a real toggle, segmented tabs,
 * and a sidebar layout that folds to tabs when its window is narrow (it
 * reads its own width with a container query, not the screen's). Colour
 * comes from --os-accent so the whole system recolours with one setting.
 */
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { sacredUi } from '@/lib/game/sacredUiSfx';

export function cx(...parts: (string | false | null | undefined)[]) {
    return parts.filter(Boolean).join(' ');
}

/** App root: fills the window, owns scrolling */
export function AppSurface({ children, className = '', scroll = true }: { children: ReactNode; className?: string; scroll?: boolean }) {
    return (
        <div className={cx('h-full min-h-0 bg-[#101219] text-white/90 text-[13px]', scroll && 'overflow-y-auto overscroll-contain', className)}>
            {children}
        </div>
    );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
    return (
        <div className="flex items-end justify-between gap-3 pb-4">
            <div className="min-w-0">
                <h2 className="text-[22px] font-semibold tracking-tight text-white leading-tight">{title}</h2>
                {subtitle && <p className="mt-1 text-[13px] text-white/50 leading-snug">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    );
}

export function Group({ title, footer, children, className = '' }: { title?: string; footer?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cx('mb-5', className)}>
            {title && <p className="mb-1.5 px-1 text-[12px] font-medium text-white/45">{title}</p>}
            <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.035] divide-y divide-white/[0.06]">
                {children}
            </div>
            {footer && <p className="mt-1.5 px-1 text-[11.5px] leading-snug text-white/40">{footer}</p>}
        </section>
    );
}

export function Row({
    label,
    detail,
    icon,
    right,
    onClick,
    danger = false,
    chevron,
}: {
    label: ReactNode;
    detail?: ReactNode;
    icon?: ReactNode;
    right?: ReactNode;
    onClick?: () => void;
    danger?: boolean;
    chevron?: boolean;
}) {
    const body = (
        <>
            {icon && <span className="flex shrink-0 items-center justify-center">{icon}</span>}
            <span className="min-w-0 flex-1">
                <span className={cx('block truncate', danger ? 'text-rose-300' : 'text-white/90')}>{label}</span>
                {detail && <span className="mt-0.5 block text-[11.5px] leading-snug text-white/45">{detail}</span>}
            </span>
            {right && <span className="flex shrink-0 items-center gap-2 text-white/50">{right}</span>}
            {(chevron ?? !!onClick) && !right && <ChevronRight size={15} className="shrink-0 text-white/25" />}
        </>
    );
    const base = 'flex w-full items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-left';
    if (!onClick) return <div className={base}>{body}</div>;
    return (
        <button
            type="button"
            onClick={() => {
                sacredUi.click();
                onClick();
            }}
            className={cx(base, 'transition-colors hover:bg-white/[0.05] active:bg-white/[0.08] touch-manipulation')}
        >
            {body}
        </button>
    );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={(e) => {
                e.stopPropagation();
                sacredUi.click();
                onChange(!checked);
            }}
            className={cx(
                'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 touch-manipulation',
                checked ? 'bg-[var(--os-accent,#34d399)]' : 'bg-white/[0.16]',
            )}
        >
            <span
                className={cx(
                    'absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-[left] duration-200',
                    checked ? 'left-[18px]' : 'left-[2px]',
                )}
            />
        </button>
    );
}

export function Segmented<T extends string>({
    options,
    value,
    onChange,
    className = '',
}: {
    options: readonly { id: T; label: ReactNode }[];
    value: T;
    onChange: (v: T) => void;
    className?: string;
}) {
    return (
        <div className={cx('inline-flex rounded-lg bg-white/[0.07] p-0.5', className)}>
            {options.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                        sacredUi.click();
                        onChange(o.id);
                    }}
                    className={cx(
                        'min-h-[30px] rounded-md px-3 text-[12px] font-medium transition-colors touch-manipulation',
                        value === o.id ? 'bg-white/[0.16] text-white shadow-sm' : 'text-white/55 hover:text-white/85',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function Btn({
    children,
    onClick,
    variant = 'secondary',
    size = 'md',
    disabled,
    className = '',
    type = 'button',
}: {
    children: ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit';
}) {
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={() => {
                if (disabled) return;
                sacredUi.click();
                onClick?.();
            }}
            className={cx(
                'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-[filter,background-color] touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed',
                size === 'sm' && 'h-8 px-3 text-[12px]',
                size === 'md' && 'h-9 px-3.5 text-[13px]',
                size === 'lg' && 'h-11 px-5 text-[14px]',
                variant === 'primary' && 'bg-[var(--os-accent,#34d399)] text-black hover:brightness-110',
                variant === 'secondary' && 'bg-white/[0.09] text-white hover:bg-white/[0.14]',
                variant === 'ghost' && 'text-white/70 hover:bg-white/[0.07] hover:text-white',
                variant === 'danger' && 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25',
                className,
            )}
        >
            {children}
        </button>
    );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
    return (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3.5 py-3">
            <p className="text-[11.5px] text-white/45">{label}</p>
            <p className="mt-0.5 text-[22px] font-semibold tabular-nums tracking-tight text-white leading-tight">{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-white/40">{sub}</p>}
        </div>
    );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            {icon && <div className="mb-3 text-white/25">{icon}</div>}
            <p className="text-[14px] font-medium text-white/80">{title}</p>
            {body && <p className="mt-1 max-w-[34ch] text-[12.5px] leading-snug text-white/45">{body}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export type SideItem<T extends string> = { id: T; label: string; icon: ReactNode; hidden?: boolean };

/**
 * Sidebar + content, like a system settings window. Below ~560px of WINDOW
 * width the sidebar becomes a horizontal tab strip, so a narrow window and
 * a phone get the same app, not a squeezed one.
 */
export function SidebarLayout<T extends string>({
    items,
    active,
    onSelect,
    header,
    children,
}: {
    items: SideItem<T>[];
    active: T;
    onSelect: (id: T) => void;
    header?: ReactNode;
    children: ReactNode;
}) {
    const shown = items.filter((i) => !i.hidden);
    return (
        <div className="@container h-full min-h-0 bg-[#101219] text-[13px] text-white/90">
            <div className="flex h-full min-h-0 flex-col @[560px]:flex-row">
                <nav className="shrink-0 border-b border-white/[0.06] bg-black/20 @[560px]:w-[208px] @[560px]:border-b-0 @[560px]:border-r @[560px]:overflow-y-auto">
                    {header && <div className="hidden p-3 pb-1 @[560px]:block">{header}</div>}
                    <div className="flex gap-1 overflow-x-auto p-2 @[560px]:flex-col @[560px]:overflow-visible">
                        {shown.map((it) => (
                            <button
                                key={it.id}
                                type="button"
                                onClick={() => {
                                    sacredUi.click();
                                    onSelect(it.id);
                                }}
                                className={cx(
                                    'flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 min-h-[34px] text-left text-[13px] transition-colors touch-manipulation',
                                    active === it.id
                                        ? 'bg-[color-mix(in_srgb,var(--os-accent,#34d399)_22%,transparent)] text-white'
                                        : 'text-white/65 hover:bg-white/[0.06] hover:text-white',
                                )}
                            >
                                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center">{it.icon}</span>
                                <span className="truncate">{it.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
            </div>
        </div>
    );
}

/** Small coloured square for sidebar and list icons */
export function IconChip({ color, children }: { color: string; children: ReactNode }) {
    return (
        <span
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
            style={{ background: color }}
        >
            {children}
        </span>
    );
}

export function Loading({ label }: { label: string }) {
    return (
        <div className="flex h-full min-h-[200px] items-center justify-center gap-2.5 text-[12.5px] text-white/45">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/15 border-t-[var(--os-accent,#34d399)]" />
            {label}
        </div>
    );
}
