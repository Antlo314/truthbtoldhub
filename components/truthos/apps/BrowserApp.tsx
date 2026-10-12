'use client';

/**
 * Sanctum Browser — in-OS browser for the sanctum's own routes.
 * Back/forward history, address bar, bookmarks. External URLs open
 * in a real tab (the OS iframe only trusts same-origin pages).
 */
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Home, RotateCw, Star } from 'lucide-react';
import { sacredUi } from '@/lib/game/sacredUiSfx';

/**
 * Only the sanctum pages with no app of their own. The Hall, the Library
 * and the Cinema open as apps; bookmarking their pages here was the same
 * screen twice.
 */
const BOOKMARKS: { path: string; label: string }[] = [
    { path: '/codex', label: 'Codex' },
    { path: '/self', label: 'Your Page' },
    { path: '/treasury', label: 'Treasury' },
    { path: '/cineworks', label: 'Cineworks' },
    { path: '/support', label: 'Support' },
    { path: '/hierarchy', label: 'Hierarchy' },
];

const HOME_PATH = '/codex';

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

export function BrowserApp({ initialPath }: { initialPath?: string } = {}) {
    const start = initialPath && initialPath.startsWith('/') ? initialPath : HOME_PATH;
    const [stack, setStack] = useState<string[]>([start]);
    const [idx, setIdx] = useState(0);
    const [bar, setBar] = useState(start);
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
        <div className="h-full flex flex-col bg-[#101219] text-zinc-200 min-h-[300px]">
            {/* Toolbar */}
            <div className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b border-white/[0.07] bg-[#171a22]">
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
                    className="flex-1 min-w-0 flex items-center gap-2 h-8 px-3 rounded-lg bg-white/[0.08] focus-within:ring-2 focus-within:ring-[var(--os-accent,#34d399)]/60"
                    onSubmit={(e) => {
                        e.preventDefault();
                        go(bar);
                    }}
                >
                    <span className="text-[12px] text-white/40 shrink-0">sanctum://</span>
                    <input
                        value={bar.replace(/^\//, '')}
                        onChange={(e) => setBar(`/${e.target.value.replace(/^\/+/, '')}`)}
                        className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-white placeholder:text-white/30"
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
            <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-white/[0.07] bg-[#141720] overflow-x-auto no-scrollbar">
                {BOOKMARKS.map((b) => (
                    <button
                        key={b.path}
                        type="button"
                        onClick={() => go(b.path)}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors min-h-[32px] touch-manipulation ${
                            current === b.path
                                ? 'bg-white/[0.12] text-white'
                                : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
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
