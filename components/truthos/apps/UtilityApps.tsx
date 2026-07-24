'use client';

/**
 * Truth.OS utility programs — Terminal, Clock & Calendar, Task Manager.
 * Real interactive tools, all local — no network calls.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_META, useTruthOs, type OsAppId } from '../truthOsStore';
import { useOsSystem } from '../osSystemStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

/* ─── Terminal ───────────────────────────────────────────── */

type TermLine = { text: string; kind: 'in' | 'out' | 'ok' | 'err' | 'dim' };

const NEOFETCH = [
    '        ╭──────────╮   truth@sanctum',
    '        │  ╭────╮  │   ───────────────',
    '        │  │ ▲▲ │  │   OS: Truth.OS 3.0 · 2026 edition',
    '        │  ╰────╯  │   Shell: soulsh 1.2',
    '        │   TRUTH  │   WM: Bento Aero',
    '        ╰──────────╯   Uptime: this session',
];

export function TerminalApp() {
    const [lines, setLines] = useState<TermLine[]>([
        { text: 'Truth.OS soulsh — type `help` for commands.', kind: 'dim' },
    ]);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [histIdx, setHistIdx] = useState(-1);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const openApp = useTruthOs((s) => s.openApp);
    const clearDesktop = useTruthOs((s) => s.clearDesktop);
    const windows = useTruthOs((s) => s.windows);
    const sessionEmail = useTruthOs((s) => s.sessionEmail);
    const notify = useOsSystem((s) => s.notify);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines]);

    const print = (out: TermLine[]) => setLines((L) => [...L, ...out].slice(-300));

    const run = (raw: string) => {
        const cmd = raw.trim();
        if (!cmd) return;
        print([{ text: `truth@sanctum:~$ ${cmd}`, kind: 'in' }]);
        setHistory((h) => [cmd, ...h].slice(0, 50));
        setHistIdx(-1);

        const [name, ...args] = cmd.split(/\s+/);
        const arg = args.join(' ');

        switch (name.toLowerCase()) {
            case 'help':
                print(
                    [
                        'help            this list',
                        'apps            list installed programs',
                        'open <app>      launch a program (e.g. `open media`)',
                        'close-all       close every window',
                        'whoami          current session',
                        'date            local date & time',
                        'echo <text>     print text',
                        'notify <text>   push a desktop notification',
                        'neofetch        system info',
                        'clear           wipe the terminal',
                    ].map((t) => ({ text: t, kind: 'out' as const })),
                );
                break;
            case 'apps': {
                const ids = Object.keys(APP_META) as OsAppId[];
                print(
                    ids.map((id) => ({
                        text: `${id.padEnd(12)} ${APP_META[id].title}`,
                        kind: 'out' as const,
                    })),
                );
                break;
            }
            case 'open': {
                const id = arg.toLowerCase() as OsAppId;
                if (id && APP_META[id]) {
                    openApp(id);
                    print([{ text: `launching ${APP_META[id].title}…`, kind: 'ok' }]);
                    sacredUi.click();
                } else {
                    print([{ text: `unknown app "${arg}" — try \`apps\``, kind: 'err' }]);
                }
                break;
            }
            case 'close-all':
                clearDesktop();
                print([{ text: 'all windows closed.', kind: 'ok' }]);
                break;
            case 'whoami':
                print([
                    { text: sessionEmail ?? 'guest (not signed in)', kind: 'out' },
                    { text: `${windows.length} window(s) open`, kind: 'dim' },
                ]);
                break;
            case 'date':
                print([{ text: new Date().toString(), kind: 'out' }]);
                break;
            case 'echo':
                print([{ text: arg || '', kind: 'out' }]);
                break;
            case 'notify':
                notify({ title: 'Terminal', body: arg || 'ping', accent: 'emerald' });
                print([{ text: 'notification sent.', kind: 'ok' }]);
                break;
            case 'neofetch':
                print(NEOFETCH.map((t) => ({ text: t, kind: 'ok' as const })));
                break;
            case 'clear':
                setLines([]);
                break;
            default:
                print([{ text: `soulsh: command not found: ${name}`, kind: 'err' }]);
        }
    };

    return (
        <div
            className="h-full flex flex-col bg-[#04070a] font-mono text-[12px] leading-relaxed min-h-[240px]"
            onClick={() => inputRef.current?.focus()}
        >
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-0.5">
                {lines.map((ln, i) => (
                    <p
                        key={i}
                        className={
                            ln.kind === 'in'
                                ? 'text-cyan-300/90'
                                : ln.kind === 'ok'
                                  ? 'text-emerald-300/95 whitespace-pre'
                                  : ln.kind === 'err'
                                    ? 'text-rose-400/90'
                                    : ln.kind === 'dim'
                                      ? 'text-emerald-800'
                                      : 'text-emerald-200/85 whitespace-pre'
                        }
                    >
                        {ln.text}
                    </p>
                ))}
                <div ref={bottomRef} />
            </div>
            <form
                className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-emerald-900/40 bg-black/60"
                onSubmit={(e) => {
                    e.preventDefault();
                    run(input);
                    setInput('');
                }}
            >
                <span className="text-emerald-500 shrink-0">truth@sanctum:~$</span>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const ni = Math.min(histIdx + 1, history.length - 1);
                            if (history[ni]) {
                                setHistIdx(ni);
                                setInput(history[ni]);
                            }
                        } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const ni = histIdx - 1;
                            setHistIdx(Math.max(ni, -1));
                            setInput(ni >= 0 ? history[ni] : '');
                        }
                    }}
                    className="flex-1 min-w-0 bg-transparent outline-none text-emerald-100 placeholder:text-emerald-900 caret-emerald-400"
                    placeholder="type a command…"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                />
            </form>
        </div>
    );
}

/* ─── Clock & Calendar ───────────────────────────────────── */

const WORLD_ZONES: { label: string; tz: string }[] = [
    { label: 'New York', tz: 'America/New_York' },
    { label: 'London', tz: 'Europe/London' },
    { label: 'Jerusalem', tz: 'Asia/Jerusalem' },
    { label: 'Tokyo', tz: 'Asia/Tokyo' },
];

function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(t);
    }, [intervalMs]);
    return now;
}

export function MonthCalendar({ date }: { date: Date }) {
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y, m, 1);
    const days = new Date(y, m + 1, 0).getDate();
    const lead = first.getDay();
    const cells: (number | null)[] = [
        ...Array.from({ length: lead }, () => null),
        ...Array.from({ length: days }, (_, i) => i + 1),
    ];
    return (
        <div>
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] uppercase tracking-wider text-sky-300/60 mb-1.5">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i}>{d}</span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => (
                    <span
                        key={i}
                        className={`h-8 rounded-lg flex items-center justify-center text-[11px] ${
                            d === date.getDate()
                                ? 'bg-sky-400 text-black font-bold shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                                : d
                                  ? 'text-zinc-300 bg-white/[0.03] border border-white/5'
                                  : ''
                        }`}
                    >
                        {d ?? ''}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function ClockApp() {
    const now = useNow(1000);
    const [tab, setTab] = useState<'clock' | 'world' | 'stopwatch'>('clock');
    const [swRunning, setSwRunning] = useState(false);
    const [swMs, setSwMs] = useState(0);
    const swRef = useRef<{ start: number; base: number } | null>(null);

    useEffect(() => {
        if (!swRunning) return;
        let raf = 0;
        const tick = () => {
            if (swRef.current) setSwMs(swRef.current.base + (performance.now() - swRef.current.start));
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [swRunning]);

    const swText = useMemo(() => {
        const total = Math.floor(swMs);
        const mm = String(Math.floor(total / 60000)).padStart(2, '0');
        const ss = String(Math.floor((total % 60000) / 1000)).padStart(2, '0');
        const cs = String(Math.floor((total % 1000) / 10)).padStart(2, '0');
        return `${mm}:${ss}.${cs}`;
    }, [swMs]);

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-zinc-200 min-h-[300px]">
            <div className="shrink-0 flex border-b border-white/10">
                {(
                    [
                        ['clock', 'Clock'],
                        ['world', 'World'],
                        ['stopwatch', 'Stopwatch'],
                    ] as const
                ).map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => {
                            setTab(id);
                            sacredUi.click();
                        }}
                        className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors min-h-[42px] touch-manipulation ${
                            tab === id
                                ? 'text-sky-300 border-b-2 border-sky-400 bg-sky-500/5'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {tab === 'clock' && (
                    <div className="space-y-4">
                        <div className="text-center py-3">
                            <p className="text-5xl font-light text-white tabular-nums tracking-tight">
                                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[11px] text-sky-300/70 mt-1.5 uppercase tracking-[0.25em]">
                                {now.toLocaleDateString([], {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </p>
                        </div>
                        <MonthCalendar date={now} />
                    </div>
                )}
                {tab === 'world' && (
                    <ul className="space-y-2">
                        {WORLD_ZONES.map((z) => (
                            <li
                                key={z.tz}
                                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
                            >
                                <div>
                                    <p className="text-sm text-white/90 font-medium">{z.label}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono">{z.tz}</p>
                                </div>
                                <p className="text-xl text-sky-200 tabular-nums font-light">
                                    {now.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: z.tz,
                                    })}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
                {tab === 'stopwatch' && (
                    <div className="flex flex-col items-center gap-5 py-6">
                        <p className="text-5xl font-light text-white tabular-nums">{swText}</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (swRunning) {
                                        setSwRunning(false);
                                        if (swRef.current)
                                            swRef.current = {
                                                start: performance.now(),
                                                base: swMs,
                                            };
                                    } else {
                                        swRef.current = { start: performance.now(), base: swMs };
                                        setSwRunning(true);
                                    }
                                    sacredUi.click();
                                }}
                                className={`px-6 py-3 rounded-xl text-sm font-bold min-h-[46px] touch-manipulation ${
                                    swRunning
                                        ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200'
                                        : 'bg-sky-500/20 border border-sky-400/40 text-sky-100'
                                }`}
                            >
                                {swRunning ? 'Pause' : 'Start'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSwRunning(false);
                                    setSwMs(0);
                                    swRef.current = null;
                                    sacredUi.click();
                                }}
                                className="px-6 py-3 rounded-xl border border-white/15 text-sm text-zinc-300 hover:bg-white/5 min-h-[46px] touch-manipulation"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Task Manager ───────────────────────────────────────── */

export function TaskManagerApp() {
    const windows = useTruthOs((s) => s.windows);
    const closeWindow = useTruthOs((s) => s.closeWindow);
    const focusWindow = useTruthOs((s) => s.focusWindow);
    const [fps, setFps] = useState(0);
    const [tick, setTick] = useState(0);

    // FPS sampling
    useEffect(() => {
        let frames = 0;
        let last = performance.now();
        let raf = 0;
        const loop = (t: number) => {
            frames += 1;
            if (t - last >= 1000) {
                setFps(Math.round((frames * 1000) / (t - last)));
                frames = 0;
                last = t;
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const jitter = setInterval(() => setTick((v) => v + 1), 2000);
        return () => {
            cancelAnimationFrame(raf);
            clearInterval(jitter);
        };
    }, []);

    // Playful-but-stable per-window load figures, re-rolled every couple seconds
    const loads = useMemo(() => {
        return windows.map((w, i) => {
            const seed = (w.id.charCodeAt(1) * 31 + i * 17 + tick * 13) % 100;
            return {
                cpu: (seed % 18) + (w.minimized ? 0.4 : 2.1),
                mem: 38 + ((seed * 7) % 220),
            };
        });
    }, [windows, tick]);

    const mem =
        typeof performance !== 'undefined' &&
        (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })
            .memory;

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-zinc-200 min-h-[280px]">
            <div className="shrink-0 grid grid-cols-3 gap-2 p-3 border-b border-white/10">
                <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 px-3 py-2.5">
                    <p className="text-[9px] uppercase tracking-widest text-amber-300/70">FPS</p>
                    <p className="text-xl text-white font-semibold tabular-nums">{fps || '—'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500">Processes</p>
                    <p className="text-xl text-white font-semibold tabular-nums">{windows.length + 3}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500">JS Heap</p>
                    <p className="text-xl text-white font-semibold tabular-nums">
                        {mem ? `${Math.round(mem.usedJSHeapSize / 1048576)}M` : '—'}
                    </p>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
                <table className="w-full text-left text-[12px]">
                    <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur">
                        <tr className="text-[9px] uppercase tracking-widest text-zinc-500 border-b border-white/10">
                            <th className="px-3 py-2 font-medium">Process</th>
                            <th className="px-2 py-2 font-medium text-right">CPU</th>
                            <th className="px-2 py-2 font-medium text-right">Mem</th>
                            <th className="px-3 py-2 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['soulsh.sys', 0.3, 24],
                            ['bento-wm.sys', 1.1, 52],
                            ['aura-compositor.sys', 2.4, 96],
                        ].map(([nm, cpu, memMb]) => (
                            <tr key={nm as string} className="border-b border-white/5 text-zinc-500">
                                <td className="px-3 py-2 font-mono">{nm}</td>
                                <td className="px-2 py-2 text-right tabular-nums">{cpu}%</td>
                                <td className="px-2 py-2 text-right tabular-nums">{memMb} MB</td>
                                <td className="px-3 py-2 text-right text-[10px]">system</td>
                            </tr>
                        ))}
                        {windows.map((w, i) => (
                            <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                                <td className="px-3 py-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            focusWindow(w.id);
                                            sacredUi.click();
                                        }}
                                        className="text-white/90 hover:text-amber-200 font-medium truncate max-w-[180px] block text-left"
                                    >
                                        {w.title}
                                        {w.minimized && (
                                            <span className="text-zinc-600 ml-1.5 text-[10px]">
                                                (minimized)
                                            </span>
                                        )}
                                    </button>
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums text-zinc-400">
                                    {loads[i]?.cpu.toFixed(1)}%
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums text-zinc-400">
                                    {loads[i]?.mem} MB
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeWindow(w.id);
                                            sacredUi.click();
                                        }}
                                        className="text-[10px] px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/15 min-h-[32px] touch-manipulation"
                                    >
                                        End task
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {windows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-zinc-600 text-xs">
                                    No user processes — open an app from Start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
