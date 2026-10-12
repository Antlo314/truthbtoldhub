'use client';

/**
 * App Library (desktop) and the phone home screen.
 *
 * Both lay out the same catalog in the same groups. The desktop library is
 * a full-screen glass sheet with a search field; the phone home screen is
 * the widgets above the same grid, with the dock below it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, type MotionStyle } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { GROUP_META, GROUP_ORDER, searchableServices, type Service } from '@/lib/truthos/services';
import { ServiceTile } from './OsIcon';
import { sacredUi } from '@/lib/game/sacredUiSfx';

function matches(s: Service, q: string) {
    const n = q.toLowerCase();
    return s.label.toLowerCase().includes(n) || s.hint.toLowerCase().includes(n) || s.id.includes(n);
}

function Grid({
    services,
    onPick,
    icon,
    compact = false,
}: {
    services: Service[];
    onPick: (s: Service) => void;
    icon: number;
    compact?: boolean;
}) {
    return (
        <div
            className="grid gap-y-4"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 72 : 96}px, 1fr))` }}
        >
            {services.map((s) => (
                <button
                    key={s.id}
                    type="button"
                    onClick={() => onPick(s)}
                    className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-1.5 transition-transform active:scale-90 touch-manipulation"
                >
                    <span className="transition-transform duration-150 group-hover:-translate-y-0.5">
                        <ServiceTile service={s} size={icon} />
                    </span>
                    <span className={`w-full truncate text-center text-white/90 drop-shadow ${compact ? 'text-[11.5px]' : 'text-[12.5px]'}`}>
                        {s.label}
                    </span>
                </button>
            ))}
        </div>
    );
}

export function AppLibrary({
    admin,
    onPick,
    onClose,
}: {
    admin: boolean;
    onPick: (s: Service) => void;
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const all = useMemo(() => searchableServices({ admin }), [admin]);
    const hits = q.trim() ? all.filter((s) => matches(s, q.trim())) : null;

    useEffect(() => {
        const t = setTimeout(() => input.current?.focus(), 60);
        return () => clearTimeout(t);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-[70] bg-black/45 backdrop-blur-3xl"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 1.04, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.03, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="mx-auto flex h-full max-w-5xl flex-col px-8"
                style={{ paddingTop: 'calc(var(--os-menubar) + 28px)', paddingBottom: 'calc(var(--os-taskbar) + 12px)' } as unknown as MotionStyle}
            >
                <div className="mx-auto mb-7 flex h-10 w-full max-w-sm shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.1] px-3" onClick={(e) => e.stopPropagation()}>
                    <Search size={15} className="text-white/50" />
                    <input
                        ref={input}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && hits?.[0]) onPick(hits[0]);
                            if (e.key === 'Escape') onClose();
                        }}
                        placeholder="Search"
                        className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/40"
                    />
                    {q && (
                        <button type="button" onClick={() => setQ('')} aria-label="Clear" className="text-white/45 hover:text-white">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
                    {hits ? (
                        hits.length ? (
                            <Grid services={hits} onPick={onPick} icon={64} />
                        ) : (
                            <p className="pt-10 text-center text-[14px] text-white/50">Nothing called “{q}”.</p>
                        )
                    ) : (
                        GROUP_ORDER.map((g) => {
                            const list = all.filter((s) => s.group === g);
                            if (!list.length) return null;
                            return (
                                <section key={g} className="mb-7" onClick={(e) => e.stopPropagation()}>
                                    <p className="mb-3 px-2 text-[13px] font-semibold text-white/70">{GROUP_META[g].label}</p>
                                    <Grid services={list} onPick={onPick} icon={64} />
                                </section>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

/** Phone home screen: widgets on top, every app below, grouped */
export function PhoneHome({
    admin,
    widgets,
    onPick,
}: {
    admin: boolean;
    widgets: React.ReactNode;
    onPick: (s: Service) => void;
}) {
    const all = useMemo(() => searchableServices({ admin }), [admin]);
    return (
        <div
            className="absolute inset-0 z-[2] overflow-y-auto overscroll-contain px-4"
            style={{ paddingTop: 'calc(var(--os-menubar) + 4px)', paddingBottom: 'calc(var(--os-taskbar) + 16px)' }}
        >
            {widgets}
            <div className="mt-5 space-y-5">
                {GROUP_ORDER.map((g) => {
                    const list = all.filter((s) => s.group === g);
                    if (!list.length) return null;
                    return (
                        <section key={g}>
                            <p className="mb-2 px-1 text-[12.5px] font-semibold text-white/75 drop-shadow">{GROUP_META[g].label}</p>
                            <div className="rounded-[22px] border border-white/10 bg-black/20 p-2.5 backdrop-blur-xl">
                                <Grid
                                    services={list}
                                    compact
                                    icon={54}
                                    onPick={(s) => {
                                        sacredUi.click();
                                        onPick(s);
                                    }}
                                />
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
