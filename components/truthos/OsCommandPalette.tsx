'use client';

/**
 * Truth.OS command palette (Ctrl/Cmd+K) — one box that searches every
 * program, system action, and saved document, evaluates arithmetic, and
 * jumps to sanctum routes. Keyboard-first: ↑↓ to move, Enter to run.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Calculator as CalcIcon,
    FileText,
    Globe,
    Search,
    Settings2,
    Sparkles,
    SquareStack,
} from 'lucide-react';
import { APP_META, useTruthOs, type OsAppId } from './truthOsStore';
import { useOsSystem } from './osSystemStore';
import { ACCENT_STYLES, OsIconTile, getAppAccent } from './OsIcon';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { isAdminEmail } from '@/lib/adminEmails';

type CmdKind = 'app' | 'action' | 'file' | 'route' | 'math';

type Command = {
    id: string;
    kind: CmdKind;
    title: string;
    sub?: string;
    app?: OsAppId;
    icon?: ReactNode;
    keywords?: string;
    run: () => void;
};

/** Sanctum routes the browser can jump to */
const ROUTES: { path: string; label: string }[] = [
    { path: '/library', label: 'Library' },
    { path: '/archive', label: 'The Hall' },
    { path: '/cinema', label: 'Cinema' },
    { path: '/codex', label: 'Codex' },
    { path: '/support', label: 'Support' },
    { path: '/self', label: 'Soul page' },
    { path: '/treasury', label: 'Treasury' },
];

type VNodeLite = { id: string; name: string; type: 'folder' | 'file'; kind?: string };

function readVfs(): VNodeLite[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem('truthos_vfs_v1');
        if (!raw) return [];
        const parsed = JSON.parse(raw) as VNodeLite[];
        return Array.isArray(parsed) ? parsed.filter((n) => n.type === 'file') : [];
    } catch {
        return [];
    }
}

/** Arithmetic-only evaluator — no identifiers, so nothing executable slips in */
function tryMath(q: string): string | null {
    const expr = q.replace(/^=\s*/, '').trim();
    if (!expr || !/[0-9]/.test(expr) || !/[+\-*/%^()]/.test(expr)) return null;
    if (!/^[0-9+\-*/%^().,\s]+$/.test(expr)) return null;
    try {
        const js = expr.replace(/\^/g, '**').replace(/,/g, '');
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict";return (${js})`)() as unknown;
        if (typeof val !== 'number' || !Number.isFinite(val)) return null;
        return String(parseFloat(val.toPrecision(12)));
    } catch {
        return null;
    }
}

/** Subsequence fuzzy match — returns a score, or -1 when it doesn't match */
function score(hay: string, needle: string): number {
    if (!needle) return 0;
    const h = hay.toLowerCase();
    const n = needle.toLowerCase();
    const direct = h.indexOf(n);
    if (direct === 0) return 1000;
    if (direct > 0) return 700 - direct;
    let hi = 0;
    let gaps = 0;
    let matched = 0;
    for (let ni = 0; ni < n.length; ni++) {
        const c = n[ni];
        if (c === ' ') {
            matched++;
            continue;
        }
        const found = h.indexOf(c, hi);
        if (found === -1) return -1;
        if (found > hi) gaps += found - hi;
        hi = found + 1;
        matched++;
    }
    return matched === n.length ? Math.max(1, 400 - gaps * 6) : -1;
}

export default function OsCommandPalette({
    phone,
    onClose,
    onEnterChamber,
    onLogout,
    onRestart,
}: {
    phone: boolean;
    onClose: () => void;
    onEnterChamber?: () => void;
    onLogout: () => void;
    onRestart: () => void;
}) {
    const [q, setQ] = useState('');
    const [sel, setSel] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const openApp = useTruthOs((s) => s.openApp);
    const setDesktop = useTruthOs((s) => s.setDesktop);
    const setLayoutMode = useTruthOs((s) => s.setLayoutMode);
    const layoutMode = useTruthOs((s) => s.layoutMode);
    const clearAll = useTruthOs((s) => s.clearDesktop);
    const sessionEmail = useTruthOs((s) => s.sessionEmail);

    const sys = useOsSystem();

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const commands = useMemo<Command[]>(() => {
        const list: Command[] = [];

        // Programs
        (Object.keys(APP_META) as OsAppId[]).forEach((app) => {
            if (app === 'admin' && !isAdminEmail(sessionEmail)) return;
            list.push({
                id: `app:${app}`,
                kind: 'app',
                title: APP_META[app].title,
                sub: 'Program',
                app,
                keywords: app,
                run: () => openApp(app),
            });
        });

        // System actions
        const action = (id: string, title: string, sub: string, run: () => void, icon?: ReactNode) =>
            list.push({ id: `act:${id}`, kind: 'action', title, sub, run, icon, keywords: id });

        action('lock', 'Lock screen', 'System', () => sys.setLocked(true));
        action('restart', 'Restart Truth.OS', 'System', onRestart);
        action('taskview', 'Open task view', 'Window', () => sys.setTaskView(true), <SquareStack size={15} />);
        action('closeall', 'Close all windows', 'Window', clearAll);
        action('nightlight', `Night light ${sys.nightLight ? 'off' : 'on'}`, 'Display', () =>
            sys.setNightLight(!sys.nightLight),
        );
        action('dnd', `Do not disturb ${sys.doNotDisturb ? 'off' : 'on'}`, 'Display', () =>
            sys.setDoNotDisturb(!sys.doNotDisturb),
        );
        action('wallpaper', 'Change wallpaper', 'Personalize', () => openApp('settings'), <Settings2 size={15} />);
        action('notifications', 'Open notification centre', 'System', () => sys.setFlyout('notifications'));
        action('widgets', 'Open widgets', 'System', () => sys.setFlyout('widgets'));
        for (let i = 0; i < 4; i++) {
            action(`desk${i + 1}`, `Go to desktop ${i + 1}`, 'Workspace', () => setDesktop(i));
        }
        if (onEnterChamber) action('chamber', 'Leave terminal → 3D house', 'Navigate', onEnterChamber, <Sparkles size={15} />);
        action('signout', 'Sign out', 'Account', onLogout);

        // Saved documents from the virtual file system
        for (const f of readVfs()) {
            const target: OsAppId = f.kind === 'png' ? 'photos' : 'notepad';
            list.push({
                id: `file:${f.id}`,
                kind: 'file',
                title: f.name,
                sub: `Open in ${APP_META[target].label}`,
                app: target,
                icon: <FileText size={15} />,
                run: () => openApp(target, { payload: { nodeId: f.id, name: f.name } }),
            });
        }

        // Routes → open in the in-OS browser
        for (const r of ROUTES) {
            list.push({
                id: `route:${r.path}`,
                kind: 'route',
                title: r.label,
                sub: `Browse ${r.path}`,
                icon: <Globe size={15} />,
                keywords: r.path,
                run: () => openApp('browser', { payload: { content: r.path, name: r.label } }),
            });
        }

        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layoutMode, sessionEmail, sys.nightLight, sys.doNotDisturb]);

    const results = useMemo(() => {
        const query = q.trim();
        const out: Command[] = [];

        const math = tryMath(query);
        if (math !== null) {
            out.push({
                id: 'math',
                kind: 'math',
                title: `${query.replace(/^=\s*/, '')} = ${math}`,
                sub: 'Copy result',
                icon: <CalcIcon size={15} />,
                run: () => {
                    navigator.clipboard?.writeText(math).catch(() => undefined);
                    useOsSystem.getState().notify({
                        title: 'Copied',
                        body: `${math} is on the clipboard.`,
                        accent: 'emerald',
                    });
                },
            });
        }

        if (!query) {
            return [...out, ...commands.filter((c) => c.kind === 'app').slice(0, 8)];
        }

        const scored = commands
            .map((c) => ({
                c,
                s: Math.max(score(c.title, query), score(c.keywords ?? '', query) - 40),
            }))
            .filter((r) => r.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 40)
            .map((r) => r.c);

        return [...out, ...scored];
    }, [q, commands]);

    useEffect(() => {
        setSel(0);
    }, [q]);

    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [sel]);

    const run = (c: Command | undefined) => {
        if (!c) return;
        c.run();
        sacredUi.click();
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={`absolute inset-0 z-[75] bg-black/50 backdrop-blur-sm flex items-start justify-center px-3 ${
                phone ? 'pt-[8vh]' : 'pt-[12vh]'
            }`}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.14 }}
                className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0e1118]/97 shadow-2xl ring-1 ring-white/10 overflow-hidden flex flex-col max-h-[min(70vh,520px)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/10 shrink-0">
                    <Search size={17} className="text-emerald-300/80 shrink-0" />
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSel((i) => Math.min(results.length - 1, i + 1));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSel((i) => Math.max(0, i - 1));
                            } else if (e.key === 'Enter') {
                                e.preventDefault();
                                run(results[sel]);
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                onClose();
                            }
                        }}
                        placeholder="Search programs, actions, files… or type a sum"
                        className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-white placeholder:text-white/35"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    <kbd className="hidden sm:block text-[10px] text-white/35 font-mono border border-white/15 rounded px-1.5 py-0.5 shrink-0">
                        esc
                    </kbd>
                </div>

                <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-2">
                    {results.length === 0 && (
                        <p className="text-center text-[13px] text-white/40 py-10">
                            Nothing matches “{q}”.
                        </p>
                    )}
                    {results.map((c, i) => {
                        const accent = c.app ? ACCENT_STYLES[getAppAccent(c.app)] : null;
                        const active = i === sel;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                data-idx={i}
                                onMouseEnter={() => setSel(i)}
                                onClick={() => run(c)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors min-h-[46px] touch-manipulation ${
                                    active ? 'bg-white/12' : 'hover:bg-white/[0.06]'
                                }`}
                            >
                                {c.app ? (
                                    <OsIconTile app={c.app} size="sm" />
                                ) : (
                                    <span
                                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 border ${
                                            active
                                                ? 'bg-white/15 border-white/25 text-white'
                                                : 'bg-white/[0.06] border-white/10 text-white/60'
                                        }`}
                                    >
                                        {c.icon ?? <ArrowRight size={14} />}
                                    </span>
                                )}
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] text-white font-medium truncate">
                                        {c.title}
                                    </span>
                                    {c.sub && (
                                        <span className="block text-[11px] text-white/45 truncate">
                                            {c.sub}
                                        </span>
                                    )}
                                </span>
                                {active && (
                                    <kbd
                                        className={`hidden sm:block text-[9px] font-mono border rounded px-1.5 py-0.5 shrink-0 ${
                                            accent ? `${accent.soft} text-white/80` : 'border-white/20 text-white/50'
                                        }`}
                                    >
                                        ↵
                                    </kbd>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="shrink-0 px-3 py-2 border-t border-white/10 bg-black/30 flex items-center gap-3 text-[10px] text-white/35 font-mono">
                    <span>↑↓ move</span>
                    <span>↵ run</span>
                    <span className="hidden sm:inline">type = for maths</span>
                    <span className="ml-auto">{results.length} result{results.length === 1 ? '' : 's'}</span>
                </div>
            </motion.div>
        </motion.div>
    );
}
