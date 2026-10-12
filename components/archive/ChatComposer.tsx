'use client';

/**
 * The composer every conversation uses. Grows with what you write up to
 * a few lines; Enter sends, Shift+Enter breaks the line, Escape lets go of
 * a reply. Typing @ offers the souls in the room; Tab or Enter takes one.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { DEFAULT_AVATAR } from '@/lib/archive/access';

/** the @word being typed at the caret, and the same tail for replacement */
const QUERY_RE = new RegExp('(^|\\s)@([\\p{L}\\p{N}_.-]{0,32})$', 'u');
const TAIL_RE = new RegExp('@([\\p{L}\\p{N}_.-]{0,32})$', 'u');

export type MentionCandidate = { id: string; name: string; avatar?: string | null };

export default function ChatComposer({
    value,
    onChange,
    onSubmit,
    onTyping,
    onEscape,
    onArrowUpEmpty,
    placeholder,
    disabled = false,
    sending = false,
    maxLength = 2000,
    candidates = [],
    attached = false,
    autoFocusKey,
}: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    onTyping?: () => void;
    onEscape?: () => void;
    /** ArrowUp in an empty composer — edit your last message */
    onArrowUpEmpty?: () => void;
    placeholder: string;
    disabled?: boolean;
    sending?: boolean;
    maxLength?: number;
    candidates?: MentionCandidate[];
    /** a reply bar sits on top — square the top corners */
    attached?: boolean;
    /** focus again whenever this changes (switching rooms) */
    autoFocusKey?: string | null;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [query, setQuery] = useState<string | null>(null);
    const [pick, setPick] = useState(0);

    // grow to fit, up to ~6 lines
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }, [value]);

    useEffect(() => {
        if (autoFocusKey === undefined) return;
        // phones would pop the keyboard on every room switch; only desktop
        if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) ref.current?.focus();
    }, [autoFocusKey]);

    const matches = useMemo(() => {
        if (query === null) return [];
        const q = query.toLowerCase();
        const seen = new Set<string>();
        return candidates
            .filter((c) => {
                if (seen.has(c.id)) return false;
                seen.add(c.id);
                return c.name.toLowerCase().includes(q);
            })
            .slice(0, 6);
    }, [query, candidates]);

    const readQuery = (text: string, caret: number) => {
        const m = QUERY_RE.exec(text.slice(0, caret));
        setQuery(m ? m[2] : null);
        setPick(0);
    };

    const takeMention = (c: MentionCandidate) => {
        const el = ref.current;
        const caret = el?.selectionStart ?? value.length;
        const handle = '@' + c.name.replace(/\s+/g, '') + ' ';
        const before = value.slice(0, caret).replace(TAIL_RE, () => handle);
        const next = before + value.slice(caret);
        onChange(next.slice(0, maxLength));
        setQuery(null);
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(before.length, before.length);
        });
    };

    const canSend = !!value.trim() && !disabled && !sending;

    return (
        <div className="relative">
            {matches.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#141119] shadow-2xl">
                    <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Souls</p>
                    {matches.map((c, i) => (
                        <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                takeMention(c);
                            }}
                            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] ${i === pick ? 'bg-white/[0.07] text-white' : 'text-zinc-300 hover:bg-white/[0.04]'}`}
                        >
                            <img src={c.avatar || DEFAULT_AVATAR} alt="" className="h-6 w-6 rounded-full object-cover" />
                            {c.name}
                        </button>
                    ))}
                </div>
            )}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (canSend) onSubmit();
                }}
                className={`flex items-end gap-2 border border-white/[0.08] bg-[#15121b] px-3 py-2 transition-colors focus-within:border-aether-gold/40 ${attached ? 'rounded-b-2xl rounded-tr-2xl' : 'rounded-2xl'}`}
            >
                <textarea
                    ref={ref}
                    rows={1}
                    value={value}
                    disabled={disabled}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    onChange={(e) => {
                        onChange(e.target.value);
                        readQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
                        onTyping?.();
                    }}
                    onKeyDown={(e) => {
                        if (matches.length > 0) {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setPick((p) => (p + 1) % matches.length);
                                return;
                            }
                            if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setPick((p) => (p - 1 + matches.length) % matches.length);
                                return;
                            }
                            if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                takeMention(matches[pick]);
                                return;
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                setQuery(null);
                                return;
                            }
                        }
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            if (canSend) onSubmit();
                            return;
                        }
                        if (e.key === 'Escape') onEscape?.();
                        if (e.key === 'ArrowUp' && !value && onArrowUpEmpty) {
                            e.preventDefault();
                            onArrowUpEmpty();
                        }
                    }}
                    onBlur={() => setTimeout(() => setQuery(null), 120)}
                    className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={!canSend}
                    aria-label="Send"
                    className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${canSend ? 'bg-aether-gold text-black hover:brightness-110' : 'text-zinc-600'}`}
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
            {value.length > maxLength * 0.85 && (
                <p className="mt-1 text-right text-[11px] tabular-nums text-zinc-500">
                    {value.length} / {maxLength}
                </p>
            )}
        </div>
    );
}
