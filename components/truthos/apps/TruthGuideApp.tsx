'use client';

/**
 * Truth — AI guide for Truth.OS & the world (Gemini + SOUL.md).
 */
import { useEffect, useRef, useState } from 'react';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { useGameStore } from '@/lib/store/useGameStore';

type Msg = { role: 'user' | 'truth' | 'sys'; text: string };

const STARTERS = [
    'What does judgment mean for us right now?',
    'Break down Deuteronomy 28 for me.',
    'How do I use Truth.OS without the 3D house?',
    'Who are the Hebrews according to scripture?',
    'How do I love people and still speak hard truth?',
];

export default function TruthGuideApp() {
    const name = useGameStore((s) => s.character?.name?.trim()) || 'soul';
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const bottom = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setMsgs([
            {
                role: 'sys',
                text: 'TRUTH.OS · GUIDE · SOUL.md loaded',
            },
            {
                role: 'truth',
                text: `I’m Truth. Not a soft pastor bot — your brother in the signal. Ask me anything: scripture, end times, who we are, how to walk, or how this OS works. ${name !== 'soul' ? `Good to see you, ${name}.` : 'What you need?'}`,
            },
        ]);
    }, [name]);

    useEffect(() => {
        bottom.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs, busy]);

    const send = async (raw: string, mode: 'chat' | 'scripture' | 'os_help' = 'chat') => {
        const message = raw.trim();
        if (!message && mode === 'chat') return;
        if (busy) return;
        setErr(null);
        setBusy(true);
        sacredUi.click();

        if (mode === 'chat') {
            setMsgs((m) => [...m, { role: 'user', text: message }]);
            setInput('');
        } else if (mode === 'scripture') {
            setMsgs((m) => [
                ...m,
                { role: 'user', text: message ? `Daily Word · ${message}` : 'Daily Word · what we need today' },
            ]);
        } else {
            setMsgs((m) => [...m, { role: 'user', text: message }]);
            setInput('');
        }

        const history = msgs
            .filter((m) => m.role === 'user' || m.role === 'truth')
            .slice(-10)
            .map((m) => ({
                role: m.role === 'truth' ? 'model' : 'user',
                text: m.text,
            }));

        try {
            const res = await fetch('/api/guide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    message: message || (mode === 'scripture' ? '' : '…'),
                    history,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || `Signal failed (${res.status})`);
            }
            setMsgs((m) => [...m, { role: 'truth', text: String(data.reply || '').trim() || '…' }]);
            sacredUi.access();
        } catch (e: any) {
            const msg = e?.message || 'Couldn’t reach me. Try again.';
            setErr(msg);
            setMsgs((m) => [...m, { role: 'sys', text: msg }]);
        } finally {
            setBusy(false);
            inputRef.current?.focus();
        }
    };

    return (
        <div className="h-full min-h-[280px] flex flex-col bg-[#0a080c] text-[#f0d4a8]">
            <header className="shrink-0 px-3 py-2.5 border-b border-amber-900/35 bg-gradient-to-r from-amber-950/50 to-black/70 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-amber-400/90 font-semibold">
                        Truth · Guide
                    </p>
                    <p className="text-[10px] text-amber-700/80 mt-0.5 truncate">
                        AI brother · scripture · OS · end times · love for all
                    </p>
                </div>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => send('', 'scripture')}
                    className="shrink-0 px-2.5 py-1.5 rounded-lg border border-amber-500/35 text-[10px] uppercase tracking-wider text-amber-200 hover:bg-amber-500/10 disabled:opacity-40 min-h-[40px]"
                >
                    Daily Word
                </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2.5 overscroll-contain">
                {msgs.map((m, i) => (
                    <div
                        key={i}
                        className={`text-[13px] sm:text-[13px] leading-relaxed ${
                            m.role === 'user'
                                ? 'text-cyan-200/90 pl-2 border-l-2 border-cyan-500/40'
                                : m.role === 'sys'
                                  ? 'text-amber-800/90 font-mono text-[11px]'
                                  : 'text-[#f0d4a8]'
                        }`}
                    >
                        {m.role === 'user' && <span className="text-cyan-500/70 text-[10px] uppercase tracking-wider block mb-0.5">You</span>}
                        {m.role === 'truth' && <span className="text-amber-500/70 text-[10px] uppercase tracking-wider block mb-0.5">Truth</span>}
                        <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                ))}
                {busy && (
                    <p className="text-amber-600/80 font-mono text-[11px] animate-pulse">Truth is speaking…</p>
                )}
                <div ref={bottom} />
            </div>

            {err && (
                <p className="px-3 text-[11px] text-red-300/90 shrink-0">{err}</p>
            )}

            <div className="shrink-0 border-t border-white/10 bg-black/50 p-2 space-y-2 safe-pb">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {STARTERS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            disabled={busy}
                            onClick={() => send(s, 'chat')}
                            className="shrink-0 px-2.5 py-1.5 rounded-full border border-white/10 text-[10px] text-white/60 hover:text-white hover:border-amber-500/30 max-w-[200px] truncate disabled:opacity-40"
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <form
                    className="flex gap-2 items-end"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input, 'chat');
                    }}
                >
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void send(input, 'chat');
                            }
                        }}
                        rows={2}
                        placeholder="Ask Truth… scripture, judgment, love, how this OS works"
                        className="flex-1 min-h-[48px] max-h-28 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-amber-500/40 resize-none"
                        disabled={busy}
                    />
                    <button
                        type="submit"
                        disabled={busy || !input.trim()}
                        className="shrink-0 h-12 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black text-[12px] font-bold disabled:opacity-40 min-w-[72px]"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}
