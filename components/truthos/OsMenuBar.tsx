'use client';

/**
 * Truth.OS menu bar — the strip that makes it read as a Mac.
 *
 * Left: the Truth mark (system menu — About, Lock, Restart, Leave),
 * the focused app's name in bold, and a Window menu that carries the
 * real window commands. Right: live game readout, search, control
 * center, notifications, and the clock that opens the calendar.
 *
 * Every item here calls the same store actions the old taskbar did —
 * this is chrome, not new behaviour.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Flame, Search, SlidersHorizontal } from 'lucide-react';
import type { OsAppId } from './truthOsStore';
import { APP_META, DESKTOP_COUNT } from './truthOsStore';

type MenuItem =
    | { label: string; hint?: string; danger?: boolean; onClick: () => void }
    | 'divider';

function DropMenu({
    open,
    items,
    onClose,
}: {
    open: boolean;
    items: MenuItem[];
    onClose: () => void;
}) {
    if (!open) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-[calc(100%+4px)] z-[80] min-w-[210px] overflow-hidden rounded-lg border border-white/15 bg-[#1b1e28]/90 p-1 shadow-[0_18px_50px_-10px_rgba(0,0,0,0.8)] ring-1 ring-black/40 backdrop-blur-2xl"
        >
            {items.map((it, i) =>
                it === 'divider' ? (
                    <div key={i} className="mx-2 my-1 h-px bg-white/10" />
                ) : (
                    <button
                        key={it.label}
                        type="button"
                        onClick={() => {
                            onClose();
                            it.onClick();
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                            it.danger
                                ? 'text-rose-300 hover:bg-rose-500/80 hover:text-white'
                                : 'text-white/90 hover:bg-[#6366f1] hover:text-white'
                        }`}
                    >
                        <span>{it.label}</span>
                        {it.hint && (
                            <span className="ml-6 text-[11px] text-white/40">{it.hint}</span>
                        )}
                    </button>
                ),
            )}
        </motion.div>
    );
}

export default function OsMenuBar({
    focusApp,
    clock,
    unread,
    soulPower,
    tier,
    isAdmin,
    desktop,
    flyout,
    onGlyphAction,
    onWindowAction,
    onDesktop,
    onSearch,
    onQuick,
    onNotifications,
    onCalendar,
    onSoul,
}: {
    focusApp: OsAppId | null;
    clock: string;
    unread: number;
    soulPower: number;
    tier: string | null;
    isAdmin: boolean;
    desktop: number;
    flyout: string | null;
    onGlyphAction: (a: 'about' | 'lock' | 'restart' | 'leave' | 'settings') => void;
    onWindowAction: (a: 'minimize' | 'zoom' | 'taskview' | 'showdesktop' | 'close') => void;
    onDesktop: (i: number) => void;
    onSearch: () => void;
    onQuick: () => void;
    onNotifications: () => void;
    onCalendar: () => void;
    onSoul: () => void;
}) {
    const [menu, setMenu] = useState<'glyph' | 'window' | 'desktops' | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

    // Any click outside the bar closes an open menu — menus are modal on a Mac
    useEffect(() => {
        if (!menu) return;
        const close = (e: PointerEvent) => {
            if (!barRef.current?.contains(e.target as Node)) setMenu(null);
        };
        window.addEventListener('pointerdown', close);
        return () => window.removeEventListener('pointerdown', close);
    }, [menu]);

    const appName = focusApp ? APP_META[focusApp].label : 'Truth.OS';

    const menuBtn = (id: 'glyph' | 'window' | 'desktops', label: React.ReactNode, bold = false) => (
        <div className="relative h-full" data-menu-state={menu ?? 'none'}>
            <button
                type="button"
                onClick={() => setMenu(menu === id ? null : id)}
                onMouseEnter={() => {
                    // Once one menu is open, sliding along the bar switches menus
                    if (menu && menu !== id) setMenu(id);
                }}
                className={`flex h-full items-center rounded px-2.5 text-[13px] transition-colors ${
                    menu === id ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
                } ${bold ? 'font-bold' : 'font-medium'}`}
            >
                {label}
            </button>
            <>
                {menu === 'glyph' && id === 'glyph' && (
                    <DropMenu
                        open
                        onClose={() => setMenu(null)}
                        items={[
                            { label: 'About Truth.OS', onClick: () => onGlyphAction('about') },
                            'divider',
                            { label: 'System Settings…', onClick: () => onGlyphAction('settings') },
                            'divider',
                            { label: 'Lock Screen', hint: '⌃L', onClick: () => onGlyphAction('lock') },
                            { label: 'Restart…', onClick: () => onGlyphAction('restart') },
                            {
                                label: 'Leave the Terminal…',
                                hint: 'Chamber',
                                onClick: () => onGlyphAction('leave'),
                            },
                        ]}
                    />
                )}
                {menu === 'window' && id === 'window' && (
                    <DropMenu
                        open
                        onClose={() => setMenu(null)}
                        items={[
                            { label: 'Minimize', hint: '⌃↓', onClick: () => onWindowAction('minimize') },
                            { label: 'Zoom', hint: '⌃↑', onClick: () => onWindowAction('zoom') },
                            { label: 'Close Window', hint: '⌃W', onClick: () => onWindowAction('close') },
                            'divider',
                            { label: 'Mission Control', onClick: () => onWindowAction('taskview') },
                            { label: 'Show Desktop', onClick: () => onWindowAction('showdesktop') },
                        ]}
                    />
                )}
                {menu === 'desktops' && id === 'desktops' && (
                    <DropMenu
                        open
                        onClose={() => setMenu(null)}
                        items={Array.from({ length: DESKTOP_COUNT }, (_, i) => ({
                            label: `Desktop ${i + 1}`,
                            hint: i === desktop ? '✓' : undefined,
                            onClick: () => onDesktop(i),
                        }))}
                    />
                )}
            </>
        </div>
    );

    const trayBtn = (
        active: boolean,
        title: string,
        onClick: () => void,
        children: React.ReactNode,
    ) => (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`relative flex h-full items-center rounded px-2 transition-colors ${
                active ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-white/10'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div
            ref={barRef}
            className="absolute inset-x-0 top-0 z-[55] flex items-stretch justify-between border-b border-white/10 bg-[#0b0d14]/60 px-2 backdrop-blur-2xl"
            style={{
                height: 'var(--os-menubar)',
                paddingTop: 'env(safe-area-inset-top, 0px)',
            }}
        >
            <div className="flex items-stretch">
                {menuBtn(
                    'glyph',
                    <span className="bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text text-[15px] font-black text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]">
                        ✦
                    </span>,
                )}
                <span className="flex items-center px-2 text-[13px] font-bold text-white/95">
                    {appName}
                </span>
                {menuBtn('window', 'Window')}
                {menuBtn('desktops', 'Desktops')}
            </div>
            <div className="flex items-stretch gap-0.5">
                {isAdmin && (
                    <span className="hidden items-center px-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-300 lg:flex">
                        Admin
                    </span>
                )}
                {soulPower > 0 &&
                    trayBtn(false, `Soul power ${soulPower}${tier ? ` · ${tier}` : ''}`, onSoul, (
                        <span className="flex items-center gap-1">
                            <Flame size={13} className="text-amber-300" />
                            <span className="font-mono text-[11px] tabular-nums text-amber-100">
                                {soulPower}
                            </span>
                        </span>
                    ))}
                {trayBtn(false, 'Search (⌘K)', onSearch, <Search size={14} />)}
                {trayBtn(flyout === 'quick', 'Control Center', onQuick, (
                    <SlidersHorizontal size={14} />
                ))}
                {trayBtn(flyout === 'notifications', 'Notifications', onNotifications, (
                    <>
                        <Bell size={14} />
                        {unread > 0 && (
                            <span className="absolute right-0.5 top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white ring-1 ring-black/60">
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </>
                ))}
                {trayBtn(flyout === 'calendar', 'Calendar', onCalendar, (
                    <span className="font-medium text-[12px] tabular-nums tracking-tight">
                        {clock}
                    </span>
                ))}
            </div>
        </div>
    );
}
