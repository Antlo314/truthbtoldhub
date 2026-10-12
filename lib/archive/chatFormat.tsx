/**
 * How a message reads: links you can open, @mentions that stand out (and
 * shine when they name you), day labels between the days. Shared by the
 * Halls and the Whispers so both speak the same way.
 */
import { Fragment, type ReactNode } from 'react';

const URL_RE = /\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/gi;
const MENTION_RE = new RegExp('(^|[\\s(])@([\\p{L}\\p{N}_.-]{2,32})', 'gu');

/** Names a soul answers to, lower-cased, for mention matching */
export function myHandles(displayName?: string | null, username?: string | null): string[] {
    const out = new Set<string>();
    for (const n of [displayName, username]) {
        if (!n) continue;
        const t = n.trim().toLowerCase();
        if (!t) continue;
        out.add(t);
        out.add(t.replace(/\s+/g, ''));
        out.add(t.split(/\s+/)[0]);
    }
    return Array.from(out).filter((h) => h.length >= 2);
}

/** Does this text @mention any of these handles (or @everyone)? */
export function mentionsMe(text: string, handles: string[]): boolean {
    if (!text || handles.length === 0) return false;
    MENTION_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MENTION_RE.exec(text))) {
        const h = m[2].toLowerCase().replace(/[.-]+$/, '');
        if (h === 'everyone' || h === 'here' || handles.includes(h)) return true;
    }
    return false;
}

/** Message text with links and @mentions rendered; newlines kept by the caller's whitespace-pre-wrap */
export function RichText({ text, handles = [] }: { text: string; handles?: string[] }) {
    const parts: ReactNode[] = [];
    let last = 0;
    let key = 0;
    URL_RE.lastIndex = 0;
    const pushText = (s: string) => {
        if (!s) return;
        // mentions inside the plain stretches
        let i = 0;
        MENTION_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = MENTION_RE.exec(s))) {
            const start = m.index + m[1].length;
            if (start > i) parts.push(<Fragment key={key++}>{s.slice(i, start)}</Fragment>);
            const h = m[2].toLowerCase().replace(/[.-]+$/, '');
            const me = h === 'everyone' || h === 'here' || handles.includes(h);
            parts.push(
                <span key={key++} className={`rounded px-0.5 font-semibold ${me ? 'bg-aether-gold/25 text-aether-gold' : 'bg-sky-400/10 text-sky-300'}`}>
                    @{m[2]}
                </span>,
            );
            i = start + 1 + m[2].length;
        }
        if (i < s.length) parts.push(<Fragment key={key++}>{s.slice(i)}</Fragment>);
    };
    let u: RegExpExecArray | null;
    while ((u = URL_RE.exec(text))) {
        pushText(text.slice(last, u.index));
        const href = u[0];
        parts.push(
            <a key={key++} href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-sky-300 underline decoration-sky-300/40 underline-offset-2 hover:decoration-sky-300">
                {href.replace(/^https?:\/\//, '').slice(0, 64)}
                {href.replace(/^https?:\/\//, '').length > 64 ? '…' : ''}
            </a>,
        );
        last = u.index + href.length;
    }
    pushText(text.slice(last));
    return <>{parts}</>;
}

/* ── days ─────────────────────────────────────────────────── */

export function dayKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayLabel(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const that = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((today - that) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export function DayDivider({ iso }: { iso: string }) {
    return (
        <div className="my-4 flex items-center gap-3" role="separator">
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[11px] font-medium text-zinc-500">{dayLabel(iso)}</span>
            <span className="h-px flex-1 bg-white/[0.07]" />
        </div>
    );
}

export function NewDivider() {
    return (
        <div className="my-3 flex items-center gap-3" role="separator" aria-label="New messages">
            <span className="h-px flex-1 bg-red-400/50" />
            <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">New</span>
        </div>
    );
}

/** Clock time for a message, in the reader's locale */
export function clockTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
