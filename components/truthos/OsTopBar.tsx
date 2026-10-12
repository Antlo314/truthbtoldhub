'use client';

/**
 * Truth.OS 4 top bar.
 *
 * Left: the ✦ system menu, the focused app's name, the Window menu.
 * Right: soul power, Spotlight, Control Center, and the clock — which
 * opens Today (calendar + notifications) and carries the unread dot.
 *
 * On a phone it becomes a status strip: the time on the left, the same
 * three controls on the right.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Search, SlidersHorizontal } from 'lucide-react';
import type { OsAppId } from './truthOsStore';
import { APP_META } from './truthOsStore';

type MenuItem = { label: string; hint?: string; danger?: boolean; disabled?: boolean; onClick: () => void } | 'divider';

function DropMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 top-[calc(100%+4px)] z-[80] min-w-[230px] rounded-xl border border-white/12 bg-[#1d2029]/90 p-1.5 shadow-[0_18px_50px_-10px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        >
            {items.map((it, i) =>
                it === 'divider' ? (
                    <div key={i} className="mx-2 my-1 h-px bg-white/10" />
                ) : (
                    <button
                        key={it.label}
                        type="button"
                        disabled={it.disabled}
                        onClick={() => {
                            onClose();
                            it.onClick();
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors disabled:opacity-35 disabled:hover:bg-transparent ${
                            it.danger
                                ? 'text-rose-300 hover:bg-rose-500/80 hover:text-white'
                                : 'text-white/90 hover:bg-[var(--os-accent,#34d399)] hover:text-black'
                        }`}
                    >
                        <span>{it.label}</span>
                        {it.hint && <span className="ml-6 text-[11px] opacity-50">{it.hint}</span>}
                    </button>
                ),
            )}
        </motion.div>
    );
}

export type SystemAction = 'about' | 'settings' | 'library' | 'mission' | 'lock' | 'restart' | 'house' | 'shortcuts';
export type WindowAction = 'minimize' | 'zoom' | 'close' | 'showdesktop' | 'mission';

export default function OsTopBar({
    phone,
    focusApp,
    unread,
    soulPower,
    flyout,
    canHouse,
    onSystem,
    onWindow,
    onSearch,
    onControl,
    onToday,
    onSoul,
}: {
    phone: boolean;
    focusApp: OsAppId | null;
    unread: number;
    soulPower: number;
    flyout: string | null;
    canHouse: boolean;
    onSystem: (a: SystemAction) => void;
    onWindow: (a: WindowAction) => void;
    onSearch: () => void;
    onControl: () => void;
    onToday: () => void;
    onSoul: () => void;
}) {
    const [menu, setMenu] = useState<'system' | 'window' | null>(null);
    const [now, setNow] = useState(() => new Date());
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 15000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!menu) return;
        const close = (e: PointerEvent) => {
            if (!barRef.current?.contains(e.target as Node)) setMenu(null);
        };
        window.addEventListener('pointerdown', close);
        return () => window.removeEventListener('pointerdown', close);
    }, [menu]);

    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    const trayBtn = (active: boolean, title: string, onClick: () => void, child: React.ReactNode) => (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className={`relative flex h-full items-center rounded-md px-2 transition-colors ${
                active ? 'bg-white/20 text-white' : 'text-white/85 hover:bg-white/10'
            }`}
        >
            {child}
        </button>
    );

    const clock = (
        <button
            type="button"
            onClick={onToday}
            className={`relative flex h-full items-center gap-2 rounded-md px-2 text-[13px] font-medium tabular-nums transition-colors ${
                flyout === 'today' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
            }`}
        >
            {!phone && <span className="text-white/75">{date}</span>}
            <span>{time}</span>
            {unread > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[var(--os-accent,#34d399)]" />}
        </button>
    );

    if (phone) {
        return (
            <div
                className="absolute inset-x-0 top-0 z-[55] flex items-stretch justify-between px-3"
                style={{ height: 'var(--os-menubar)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
                {clock}
                <div className="flex items-stretch">
                    {trayBtn(false, 'Search', onSearch, <Search size={16} />)}
                    {trayBtn(flyout === 'control', 'Control Center', onControl, <SlidersHorizontal size={16} />)}
                </div>
            </div>
        );
    }

    const appName = focusApp ? APP_META[focusApp].label : 'Truth.OS';

    return (
        <div
            ref={barRef}
            className="absolute inset-x-0 top-0 z-[55] flex items-stretch justify-between bg-black/25 px-2 backdrop-blur-2xl"
            style={{ height: 'var(--os-menubar)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="flex items-stretch py-[3px]">
                <div className="relative">
                    <button
                        type="button"
                        aria-label="System menu"
                        onClick={() => setMenu(menu === 'system' ? null : 'system')}
                        onMouseEnter={() => menu && setMenu('system')}
                        className={`flex h-full items-center rounded-md px-2.5 transition-colors ${menu === 'system' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        <span className="bg-gradient-to-br from-amber-100 to-amber-500 bg-clip-text text-[15px] font-black text-transparent">✦</span>
                    </button>
                    <AnimatePresence>
                        {menu === 'system' && (
                            <DropMenu
                                onClose={() => setMenu(null)}
                                items={[
                                    { label: 'About Truth.OS', onClick: () => onSystem('about') },
                                    'divider',
                                    { label: 'Settings…', hint: 'Ctrl ,', onClick: () => onSystem('settings') },
                                    { label: 'App Library', hint: 'Ctrl E', onClick: () => onSystem('library') },
                                    { label: 'Mission Control', hint: 'Ctrl ↑', onClick: () => onSystem('mission') },
                                    { label: 'Keyboard shortcuts', hint: 'Ctrl /', onClick: () => onSystem('shortcuts') },
                                    'divider',
                                    { label: 'Enter the World', disabled: !canHouse, onClick: () => onSystem('house') },
                                    { label: 'Lock Screen', hint: 'Ctrl L', onClick: () => onSystem('lock') },
                                    { label: 'Restart…', onClick: () => onSystem('restart') },
                                ]}
                            />
                        )}
                    </AnimatePresence>
                </div>
                <span className="flex items-center px-2 text-[13px] font-semibold text-white">{appName}</span>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMenu(menu === 'window' ? null : 'window')}
                        onMouseEnter={() => menu && setMenu('window')}
                        className={`flex h-full items-center rounded-md px-2.5 text-[13px] text-white/90 transition-colors ${
                            menu === 'window' ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                    >
                        Window
                    </button>
                    <AnimatePresence>
                        {menu === 'window' && (
                            <DropMenu
                                onClose={() => setMenu(null)}
                                items={[
                                    { label: 'Minimise', hint: 'Ctrl ⇧ ↓', disabled: !focusApp, onClick: () => onWindow('minimize') },
                                    { label: 'Zoom', hint: 'Ctrl ⇧ ↑', disabled: !focusApp, onClick: () => onWindow('zoom') },
                                    { label: 'Close window', hint: 'Ctrl W', disabled: !focusApp, onClick: () => onWindow('close') },
                                    'divider',
                                    { label: 'Show desktop', hint: 'Ctrl D', onClick: () => onWindow('showdesktop') },
                                    { label: 'Mission Control', hint: 'Ctrl ↑', onClick: () => onWindow('mission') },
                                ]}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <div className="flex items-stretch gap-0.5 py-[3px]">
                {soulPower > 0 &&
                    trayBtn(false, `Soul power ${soulPower}`, onSoul, (
                        <span className="flex items-center gap-1">
                            <Flame size={13} className="text-amber-300" />
                            <span className="text-[12px] font-medium tabular-nums text-amber-100">{soulPower}</span>
                        </span>
                    ))}
                {trayBtn(false, 'Search (Ctrl K)', onSearch, <Search size={14} />)}
                {trayBtn(flyout === 'control', 'Control Center', onControl, <SlidersHorizontal size={14} />)}
                {clock}
            </div>
        </div>
    );
}
