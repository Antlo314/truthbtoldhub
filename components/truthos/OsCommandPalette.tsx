'use client';

/**
 * Spotlight (Ctrl/Cmd+K) — one box for every program, sanctum page,
 * system action and saved document. It does sums, and anything that isn't
 * a command becomes a question for Truth. ↑↓ to move, Enter to run.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
    Calculator as CalcIcon,
    DoorOpen,
    FileText,
    Lock,
    LogOut,
    Moon,
    RefreshCw,
    Search,
    Sparkles,
    SquareStack,
    Volume2,
    VolumeX,
    BellOff,
} from 'lucide-react';
import { APP_META, useTruthOs, type OsAppId } from './truthOsStore';
import { useOsSystem } from './osSystemStore';
import { OsIconTile, ServiceTile } from './OsIcon';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { isAdminEmail } from '@/lib/adminEmails';
import { isMuted, setMuted, subscribe as voiceSub } from '@/lib/truthVoice';
import { searchableServices, type Service } from '@/lib/truthos/services';

const GUIDE_PROMPT = 'Guide me through Truth.OS';

type Command = {
    id: string;
    title: string;
    sub?: string;
    icon: ReactNode;
    keywords?: string;
    section: 'Top hit' | 'Programs' | 'Pages' | 'Actions' | 'Documents' | 'Ask';
    run: () => void;
};

type VNodeLite = { id: string; name: string; type: 'folder' | 'file'; kind?: string };

function readVfs(): VNodeLite[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem('truthos_vfs_v1');
        const parsed = raw ? (JSON.parse(raw) as VNodeLite[]) : [];
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

/** Subsequence fuzzy match — a score, or -1 when it doesn't match */
function score(hay: string, needle: string): number {
    if (!needle) return 0;
    const h = hay.toLowerCase();
    const n = needle.toLowerCase();
    const direct = h.indexOf(n);
    if (direct === 0) return 1000;
    if (direct > 0) return 700 - direct;
    let hi = 0;
    let gaps = 0;
    for (const c of n) {
        if (c === ' ') continue;
        const found = h.indexOf(c, hi);
        if (found === -1) return -1;
        gaps += found - hi;
        hi = found + 1;
    }
    return Math.max(1, 400 - gaps * 6);
}

const actionIcon = (node: ReactNode) => (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white/[0.1] text-white/80">{node}</span>
);

export default function OsCommandPalette({
    phone,
    onClose,
    onHouse,
    onLogout,
    onRestart,
}: {
    phone: boolean;
    onClose: () => void;
    onHouse?: () => void;
    onLogout: () => void;
    onRestart: () => void;
}) {
    const [q, setQ] = useState('');
    const [sel, setSel] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const openApp = useTruthOs((s) => s.openApp);
    const clearAll = useTruthOs((s) => s.clearDesktop);
    const sessionEmail = useTruthOs((s) => s.sessionEmail);
    const sys = useOsSystem();
    const [voiceOff, setVoiceOff] = useState(true);
    useEffect(() => voiceSub((s) => setVoiceOff(s.muted)), []);
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const launchService = (s: Service) => {
        if (s.launch.kind === 'app') openApp(s.launch.app);
        else openApp('browser', { payload: { content: s.launch.path, name: s.launch.name } });
    };

    const commands = useMemo<Command[]>(() => {
        const list: Command[] = [];
        for (const s of searchableServices({ admin: isAdminEmail(sessionEmail) })) {
            list.push({
                id: `svc:${s.id}`,
                title: s.label,
                sub: s.hint,
                icon: <ServiceTile service={s} size={28} />,
                keywords: `${s.id} ${s.launch.kind === 'app' ? s.launch.app : s.launch.path}`,
                section: s.launch.kind === 'app' ? 'Programs' : 'Pages',
                run: () => launchService(s),
            });
        }
        const act = (id: string, title: string, icon: ReactNode, run: () => void, keywords = '') =>
            list.push({ id: `act:${id}`, title, icon: actionIcon(icon), keywords: `${id} ${keywords}`, section: 'Actions', run });

        list.push({
            id: 'act:guide',
            title: 'Guide me through Truth.OS',
            sub: 'Truth walks you round',
            icon: <OsIconTile app="truth" size={28} />,
            keywords: 'tour help how walkthrough',
            section: 'Actions',
            run: () => openApp('truth', { payload: { content: GUIDE_PROMPT } }),
        });
        if (onHouse) act('house', 'Enter the House', <DoorOpen size={15} />, onHouse, '3d world chamber walk');
        act('mission', 'Mission Control', <SquareStack size={15} />, () => sys.toggleOverlay('mission'), 'windows overview');
        act('nightlight', `Turn night light ${sys.nightLight ? 'off' : 'on'}`, <Moon size={15} />, () => sys.setNightLight(!sys.nightLight), 'display warm');
        act('dnd', `Turn Do Not Disturb ${sys.doNotDisturb ? 'off' : 'on'}`, <BellOff size={15} />, () => sys.setDoNotDisturb(!sys.doNotDisturb), 'focus quiet');
        act('voice', `Truth’s voice ${voiceOff ? 'on' : 'off'}`, voiceOff ? <Volume2 size={15} /> : <VolumeX size={15} />, () => setMuted(!isMuted()), 'speak mute');
        act('wallpaper', 'Change wallpaper', <Sparkles size={15} />, () => openApp('settings', { payload: { section: 'appearance' } }), 'appearance background accent');
        act('closeall', 'Close all windows', <SquareStack size={15} />, clearAll);
        act('lock', 'Lock screen', <Lock size={15} />, () => sys.setLocked(true));
        act('restart', 'Restart Truth.OS', <RefreshCw size={15} />, onRestart, 'reboot');
        if (sessionEmail) act('signout', 'Sign out', <LogOut size={15} />, onLogout, 'logout');

        for (const f of readVfs()) {
            const target: OsAppId = f.kind === 'png' ? 'photos' : 'notepad';
            list.push({
                id: `file:${f.id}`,
                title: f.name,
                sub: `Open in ${APP_META[target].label}`,
                icon: actionIcon(<FileText size={15} />),
                section: 'Documents',
                run: () => openApp(target, { payload: { nodeId: f.id, name: f.name } }),
            });
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionEmail, sys.nightLight, sys.doNotDisturb, voiceOff, onHouse]);

    const results = useMemo(() => {
        const query = q.trim();
        const out: Command[] = [];
        const math = tryMath(query);
        if (math !== null) {
            out.push({
                id: 'math',
                title: `${query.replace(/^=\s*/, '')} = ${math}`,
                sub: 'Copy the result',
                icon: actionIcon(<CalcIcon size={15} />),
                section: 'Top hit',
                run: () => {
                    navigator.clipboard?.writeText(math).catch(() => undefined);
                    useOsSystem.getState().notify({ title: 'Copied', body: `${math} is on the clipboard.`, accent: 'emerald' });
                },
            });
        }
        if (!query) return [...out, ...commands.filter((c) => c.section === 'Programs').slice(0, 7)];
        const scored = commands
            .map((c) => ({ c, s: Math.max(score(c.title, query), score(c.keywords ?? '', query) - 60) }))
            .filter((r) => r.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 24)
            .map((r, i) => (i === 0 && r.s >= 600 && !out.length ? { ...r.c, section: 'Top hit' as const } : r.c));
        const ask: Command = {
            id: 'ask',
            title: `Ask Truth “${query}”`,
            sub: 'The guide answers',
            icon: <OsIconTile app="truth" size={28} />,
            section: 'Ask',
            run: () => openApp('truth', { payload: { content: query } }),
        };
        return math ? [...out, ...scored] : [...out, ...scored, ask];
    }, [q, commands, openApp]);

    useEffect(() => setSel(0), [q]);
    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [sel]);

    const run = (c: Command | undefined) => {
        if (!c) return;
        c.run();
        sacredUi.click();
        onClose();
    };

    let lastSection = '';
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={`absolute inset-0 z-[75] flex items-start justify-center bg-black/25 px-3 ${phone ? 'pt-[9vh]' : 'pt-[16vh]'}`}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.14 }}
                className="flex max-h-[min(64vh,520px)] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-white/[0.14] bg-[#1d2029]/85 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] backdrop-blur-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex h-14 shrink-0 items-center gap-3 px-4">
                    <Search size={19} className="shrink-0 text-white/45" />
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
                        placeholder="Search, or ask Truth"
                        className="min-w-0 flex-1 bg-transparent text-[19px] font-light text-white outline-none placeholder:text-white/35"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                </div>
                {results.length > 0 && (
                    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.08] p-1.5">
                        {results.map((c, i) => {
                            const header = c.section !== lastSection ? c.section : null;
                            lastSection = c.section;
                            const active = i === sel;
                            return (
                                <div key={c.id}>
                                    {header && q.trim() && (
                                        <p className="px-2.5 pb-1 pt-2 text-[11.5px] font-semibold text-white/40">{header}</p>
                                    )}
                                    <button
                                        type="button"
                                        data-idx={i}
                                        onMouseMove={() => setSel(i)}
                                        onClick={() => run(c)}
                                        className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left touch-manipulation ${
                                            active ? 'bg-[var(--os-accent,#34d399)] text-black' : 'text-white'
                                        }`}
                                    >
                                        {c.icon}
                                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{c.title}</span>
                                        {c.sub && (
                                            <span className={`hidden shrink-0 truncate text-[12px] sm:block ${active ? 'text-black/60' : 'text-white/40'}`}>
                                                {c.sub}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
