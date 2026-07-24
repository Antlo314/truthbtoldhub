'use client';

/**
 * Ctrl+Tab window switcher (MRU order) and the Ctrl+/ shortcuts sheet.
 * The switcher stays open while Ctrl is held; releasing it commits the
 * highlighted window, exactly like a desktop alt-tab.
 */
import { motion } from 'framer-motion';
import { Keyboard } from 'lucide-react';
import { OsIconTile } from './OsIcon';
import type { OsWindow } from './truthOsStore';

export function OsWindowSwitcher({ windows, index }: { windows: OsWindow[]; index: number }) {
    if (windows.length === 0) return null;
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 z-[76] flex items-center justify-center pointer-events-none px-4"
        >
            <div className="rounded-2xl border border-white/15 bg-[#0d1017]/95 backdrop-blur-2xl shadow-2xl ring-1 ring-white/10 p-3 max-w-[92vw]">
                <div className="flex items-center gap-2 flex-wrap justify-center max-w-2xl">
                    {windows.map((w, i) => (
                        <div
                            key={w.id}
                            className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 w-[92px] border transition-colors ${
                                i === index
                                    ? 'bg-white/15 border-white/30'
                                    : 'border-transparent opacity-60'
                            }`}
                        >
                            <OsIconTile app={w.app} size="lg" open={i === index} />
                            <span className="text-[10px] text-white/85 text-center leading-tight line-clamp-2">
                                {w.title}
                            </span>
                        </div>
                    ))}
                </div>
                <p className="text-center text-[10px] text-white/35 font-mono mt-2">
                    hold ctrl · press ` to cycle · release to switch
                </p>
            </div>
        </motion.div>
    );
}

type Shortcut = { keys: string; label: string };

const GROUPS: { title: string; items: Shortcut[] }[] = [
    {
        title: 'System',
        items: [
            { keys: 'Ctrl K', label: 'Command palette' },
            { keys: 'Ctrl E', label: 'Start menu' },
            { keys: 'Ctrl /', label: 'This shortcut sheet' },
            { keys: 'Esc', label: 'Close the top overlay' },
        ],
    },
    {
        title: 'Windows',
        items: [
            { keys: 'Ctrl `', label: 'Switch window (hold to cycle)' },
            { keys: 'Ctrl ⇧ `', label: 'Switch window, backwards' },
            { keys: 'Ctrl ↑', label: 'Task view' },
            { keys: 'Ctrl ⇧ ←/→', label: 'Snap window to half' },
            { keys: 'Ctrl ⇧ ↑', label: 'Maximise window' },
            { keys: 'Ctrl ⇧ ↓', label: 'Minimise window' },
            { keys: 'Ctrl D', label: 'Show desktop' },
        ],
    },
    {
        title: 'Workspaces',
        items: [
            { keys: 'Ctrl Alt ←/→', label: 'Previous / next desktop' },
            { keys: 'Ctrl Alt 1–4', label: 'Jump to desktop' },
            { keys: 'Ctrl Alt ⇧ ←/→', label: 'Move window to desktop' },
        ],
    },
];

export function OsShortcutsSheet({ onClose }: { onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 z-[75] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0e1118]/97 shadow-2xl ring-1 ring-white/10 overflow-hidden max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2.5 shrink-0">
                    <Keyboard size={16} className="text-emerald-300" />
                    <p className="text-[13px] text-white font-semibold flex-1">Keyboard shortcuts</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[11px] text-white/50 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 min-h-[32px] touch-manipulation"
                    >
                        Close
                    </button>
                </div>
                <div className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto">
                    {GROUPS.map((g) => (
                        <div key={g.title}>
                            <p className="text-[9px] uppercase tracking-[0.28em] text-emerald-300/70 font-mono mb-2">
                                {g.title}
                            </p>
                            <ul className="space-y-1.5">
                                {g.items.map((s) => (
                                    <li key={s.keys} className="flex items-center gap-3">
                                        <kbd className="shrink-0 text-[10px] font-mono text-white/80 border border-white/20 bg-white/[0.06] rounded px-2 py-1 min-w-[86px] text-center">
                                            {s.keys}
                                        </kbd>
                                        <span className="text-[12px] text-white/70 leading-snug">
                                            {s.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
