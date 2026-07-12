'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BookOpen, Film, Library, ScrollText, Sparkles,
    Home, User, Coins, Users, Globe, X, Menu,
} from 'lucide-react';
import AmbientEmbers from '@/components/game/AmbientEmbers';
import { DURATION, EASE } from '@/lib/design/motion';
import { cn } from '@/lib/design/cn';
import { sacredUi } from '@/lib/game/sacredUiSfx';

/** Routes that are pure immersion — no constellation chrome */
const FULL_IMMERSIVE = [
    /^\/world(\/|$)/,
    /^\/world2d(\/|$)/,
    /^\/awakening(\/|$)/, // full awakening arc — no chrome break
];

/** Routes where atmosphere is cinematic (embers + soft grain intensity) */
const RITUAL_ROUTES = [/^\/$/, /^\/awakening/, /^\/trial/];

type NavItem = { href: string; label: string; whisper: string; icon: typeof Home };

const CONSTELLATION: NavItem[] = [
    { href: '/world', label: 'Journey', whisper: 'Truth\'s hut', icon: Globe },
    { href: '/vision/eden', label: 'Visions', whisper: 'Unsealed roads', icon: Sparkles },
    { href: '/archive', label: 'The Hall', whisper: 'Voices gather', icon: Users },
    { href: '/codex', label: 'Codex', whisper: 'Memory', icon: BookOpen },
    { href: '/library', label: 'Library', whisper: 'Scrolls', icon: Library },
    { href: '/cinema', label: 'Cinema', whisper: 'Films', icon: Film },
    { href: '/support', label: 'Offering', whisper: 'Sustain the work', icon: Coins },
    { href: '/hierarchy', label: 'Seals', whisper: 'Founders', icon: ScrollText },
    { href: '/self', label: 'Soul', whisper: 'Your vessel', icon: User },
];

function matchAny(path: string, patterns: RegExp[]) {
    return patterns.some((r) => r.test(path));
}

/**
 * Persistent sanctum atmosphere + veil navigation.
 * Unity / full-immersion routes hide chrome; ritual routes get denser atmosphere.
 */
export default function SanctumShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '/';
    const [open, setOpen] = useState(false);
    const immersive = matchAny(pathname, FULL_IMMERSIVE);
    const ritual = matchAny(pathname, RITUAL_ROUTES);

    // Close veil on navigate + soft threshold tone
    useEffect(() => {
        setOpen(false);
        sacredUi.unlock();
    }, [pathname]);

    // Escape closes
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const toggle = useCallback(() => {
        setOpen((v) => {
            if (v) sacredUi.veilClose();
            else sacredUi.veilOpen();
            return !v;
        });
    }, []);

    return (
        <div className="relative min-h-[100dvh] flex flex-col">
            {/* Living atmosphere — never on Unity (perf + focus) */}
            {!immersive && (
                <div
                    className="pointer-events-none fixed inset-0 z-[1]"
                    aria-hidden
                >
                    <AmbientEmbers density={ritual ? 36 : 18} tint="#fbbf24" />
                    <div
                        className="absolute inset-0"
                        style={{
                            background: ritual
                                ? 'radial-gradient(ellipse 70% 60% at 50% 40%, transparent 20%, rgba(0,0,0,0.35) 100%)'
                                : 'radial-gradient(ellipse 80% 70% at 50% 30%, transparent 40%, rgba(0,0,0,0.25) 100%)',
                        }}
                    />
                </div>
            )}

            <div className="relative z-[2] flex-1 flex flex-col min-h-0">{children}</div>

            {/* Veil trigger — hidden inside Unity world */}
            {!immersive && (
                <>
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={open ? 'Close veil' : 'Open sanctum menu'}
                        aria-expanded={open}
                        className={cn(
                            'fixed z-[60] flex items-center justify-center rounded-full border transition-all duration-300',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aether-gold/50',
                            'w-11 h-11 sm:w-12 sm:h-12',
                            'right-4 bottom-4 sm:right-6 sm:bottom-6',
                            open
                                ? 'border-aether-gold/50 bg-aether-gold/15 text-aether-gold'
                                : 'border-white/15 bg-black/50 text-white/60 backdrop-blur-md hover:text-aether-gold hover:border-aether-gold/35',
                        )}
                        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                        {open && (
                            <>
                                <motion.div
                                    key="veil-scrim"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: DURATION.quick }}
                                    className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm"
                                    onClick={() => setOpen(false)}
                                    aria-hidden
                                />
                                <motion.nav
                                    key="veil-panel"
                                    role="navigation"
                                    aria-label="Sanctum constellation"
                                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 16, scale: 0.98 }}
                                    transition={{ duration: DURATION.settle, ease: EASE.breath }}
                                    className="fixed z-[56] left-4 right-4 sm:left-auto sm:right-6 sm:w-[min(100%,380px)] bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
                                >
                                    <div className="rounded-3xl border border-aether-gold/20 bg-black/85 backdrop-blur-xl p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden relative ambient-glow">
                                        <div
                                            className="absolute inset-0 opacity-[0.12] pointer-events-none"
                                            style={{
                                                backgroundImage: 'url(/brand/bg-portal.jpg)',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        />
                                        <div className="relative flex items-center gap-2 mb-4">
                                            <Sparkles className="w-3.5 h-3.5 text-aether-gold/80" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-aether-gold/70">
                                                Constellation
                                            </span>
                                            <div className="flex-1 h-px gold-edge" />
                                        </div>
                                        <ul className="relative grid grid-cols-2 gap-2">
                                            {CONSTELLATION.map((item) => {
                                                const Icon = item.icon;
                                                const active =
                                                    pathname === item.href ||
                                                    (item.href !== '/' && pathname.startsWith(item.href));
                                                return (
                                                    <li key={item.href}>
                                                        <Link
                                                            href={item.href}
                                                            onClick={() => sacredUi.threshold()}
                                                            onMouseEnter={() => sacredUi.hover()}
                                                            className={cn(
                                                                'flex flex-col gap-0.5 rounded-2xl border px-3 py-3 transition-all duration-300',
                                                                active
                                                                    ? 'border-aether-gold/45 bg-aether-gold/15 text-aether-gold shadow-[0_0_20px_rgba(251,191,36,0.12)]'
                                                                    : 'border-white/8 bg-black/40 text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white',
                                                            )}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                                                <span className="text-[11px] font-black uppercase tracking-[0.12em]">
                                                                    {item.label}
                                                                </span>
                                                            </span>
                                                            <span className="text-[9px] text-white/35 pl-5 tracking-wide">
                                                                {item.whisper}
                                                            </span>
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        <p className="mt-4 text-center text-[8px] uppercase tracking-[0.35em] text-white/25">
                                            Cross a threshold · return to the Source
                                        </p>
                                    </div>
                                </motion.nav>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}
