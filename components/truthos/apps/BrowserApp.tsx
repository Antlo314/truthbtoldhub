'use client';

/**
 * Sanctum Browser — in-OS browser for the sanctum's own routes.
 * Back/forward history, address bar, bookmarks. External URLs open
 * in a real tab (the OS iframe only trusts same-origin pages).
 */
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Home, RotateCw, Star } from 'lucide-react';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const BOOKMARKS: { path: string; label: string }[] = [
    { path: '/library', label: 'Library' },
    { path: '/archive', label: 'The Hall' },
    { path: '/cinema', label: 'Cinema' },
    { path: '/codex', label: 'Codex' },
    { path: '/vision', label: 'Visions' },
    { path: '/support', label: 'Support' },
];

const HOME_PATH = '/library';

function normalize(raw: string): { internal: string | null; external: string | null } {
    const t = raw.trim();
    if (!t) return { internal: null, external: null };
    if (t.startsWith('/')) return { internal: t, external: null };
    if (/^https?:\/\//i.test(t)) {
        try {
            const u = new URL(t);
            if (typeof window !== 'undefined' && u.origin === window.location.origin) {
                return { internal: u.pathname + u.search, external: null };
            }
            return { internal: null, external: u.href };
        } catch {
            return { internal: null, external: null };
        }
    }
    // bare words → treat as internal route guess
    return { internal: `/${t.replace(/^\/+/, '')}`, external: null };
}

export function BrowserApp() {
    const [stack, setStack] = useState<string[]>([HOME_PATH]);
    const [idx, setIdx] = useState(0);
    const [bar, setBar] = useState(HOME_PATH);
    const [reloadKey, setReloadKey] = useState(0);
    const frameRef = useRef<HTMLIFrameElement>(null);
    const current = stack[idx];

    const go = (raw: string) => {
        const { internal, external } = normalize(raw);
        if (external) {
            window.open(external, '_blank', 'noopener');
            sacredUi.click();
            return;
        }
        if (!internal) return;
        const next = [...stack.slice(0, idx + 1), internal];
        setStack(next);
        setIdx(next.length - 1);
        setBar(internal);
        sacredUi.click();
    };

    const nav = (d: number) => {
        const ni = Math.min(stack.length - 1, Math.max(0, idx + d));
        setIdx(ni);
        setBar(stack[ni]);
        sacredUi.click();
    };

    const isBookmarked = useMemo(() => BOOKMARKS.some((b) => b.path === current), [current]);

    return (
        <div className="h-full flex flex-col bg-zinc-950 text-zinc-200 min-h-[300px]">
            {/* Toolbar */}
            <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b border-white/10 bg-black/40">
                <button
                    type="button"
                    onClick={() => nav(-1)}
                    disabled={idx === 0}
                    className="w-9 h-9 min-w-[36px] rounded-lg flex items-center justify-center text-zinc-300 hover:bg-white/10 disabled:opacity-30 touch-manipulation"
                    title="Back"
                >
                    <ArrowLeft size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => nav(1)}
                    disabled={idx >= stack.length - 1}
                    className="w-9 h-9 min-w-[36px] rounded-lg flex items-center justify-center text-zinc-300 hover:bg-white/10 disabled:opacity-30 touch-manipulation"
                    title="Forward"
                >
                    <ArrowRight size={15} />
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReloadKey((k) => k + 1);
                        sacredUi.click();
                    }}
                    className="w-9 h-9 min-w-[36px] rounded-lg flex items-center justify-center text-zinc-300 hover:bg-white/10 touch-manipulation"
                    title="Reload"
                >
                    <RotateCw size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => go(HOME_PATH)}
                    className="w-9 h-9 min-w-[36px] rounded-lg flex items-center justify-center text-zinc-300 hover:bg-white/10 touch-manipulation"
                    title="Home"
                >
                    <Home size={14} />
                </button>
                <form
                    className="flex-1 min-w-0 flex items-center gap-2 h-9 px-3 rounded-xl border border-white/12 bg-white/[0.05] focus-within:border-cyan-400/50"
                    onSubmit={(e) => {
                        e.preventDefault();
                        go(bar);
                    }}
                >
                    <span className="text-[10px] text-cyan-300/70 font-mono shrink-0">sanctum://</span>
                    <input
                        value={bar.replace(/^\//, '')}
                        onChange={(e) => setBar(`/${e.target.value.replace(/^\/+/, '')}`)}
                        className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-white placeholder:text-zinc-600"
                        placeholder="route or url…"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    {isBookmarked && <Star size={12} className="text-amber-300 shrink-0 fill-amber-300" />}
                </form>
                <a
                    href={current}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => sacredUi.click()}
                    className="w-9 h-9 min-w-[36px] rounded-lg flex items-center justify-center text-zinc-400 hover:bg-white/10 touch-manipulation"
                    title="Open in real tab"
                >
                    <ExternalLink size={14} />
                </a>
            </div>
            {/* Bookmarks bar */}
            <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-white/8 bg-black/25 overflow-x-auto no-scrollbar">
                {BOOKMARKS.map((b) => (
                    <button
                        key={b.path}
                        type="button"
                        onClick={() => go(b.path)}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors min-h-[32px] touch-manipulation ${
                            current === b.path
                                ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30'
                                : 'text-zinc-400 hover:bg-white/8 hover:text-zinc-200 border border-transparent'
                        }`}
                    >
                        {b.label}
                    </button>
                ))}
            </div>
            <iframe
                key={`${current}-${reloadKey}`}
                ref={frameRef}
                title="Sanctum Browser"
                src={current}
                className="flex-1 w-full border-0 bg-black min-h-[220px]"
            />
        </div>
    );
}
