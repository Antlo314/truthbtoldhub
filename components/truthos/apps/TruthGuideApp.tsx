'use client';

/**
 * Truth — AI guide for Truth.OS & the world (Gemini + SOUL.md).
 */
import { useEffect, useRef, useState } from 'react';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { useGameStore } from '@/lib/store/useGameStore';
import { TRUTH_QUESTIONS } from '@/lib/game/truthLore';
import { speak as truthSpeak, replay as truthReplay, isMuted, setMuted, subscribe as voiceSub, stop as truthStop } from '@/lib/truthVoice';

/**
 * A reply may carry a `voice` id — one of the pre-generated lore lines
 * in /voice — in which case Truth SAYS it. Free-form Gemini replies have
 * no recording, so they get no id and stay text; the "hear" affordance
 * only appears when there is a real voice behind it.
 */
type Msg = { role: 'user' | 'truth' | 'sys'; text: string; voice?: string };

/**
 * If the question is one Truth has already answered — in his own voice —
 * find it, so "who are you" gets the recorded "who" answer rather than a
 * fresh paraphrase.
 *
 * Deliberately careful. An earlier version matched on ≥60% of the prompt's
 * long words with no stop-word list, and "Why do you follow me?" reduced
 * to the single word "follow" — so "how do I follow the path" got the
 * canned lore answer and never reached the model. Being wrongly certain
 * is the worst thing a guide can do.
 *
 * But most prompts here genuinely have ONE content word — "What is the
 * Source?", "Tell me about your family." — and those words are specific
 * enough that a question containing them almost certainly wants that
 * answer. So the rule is about the WORD, not the count:
 *   - stop-words carry no weight
 *   - a single-word match is allowed only if that word is on the
 *     KEYWORDS list: nouns that name a topic of Truth's story. Generic
 *     verbs and adjectives ("follow", "walk", "stop") never match alone.
 *   - multi-word prompts must hit ≥ 70% of their content words
 * If in doubt, this returns null and Gemini answers. That is the safe
 * direction.
 */
/** Single words that unambiguously name one of Truth's stories. */
const KEYWORDS = new Set([
    'source', 'family', 'children', 'wilderness', 'drinking', 'fasting', 'sorrow',
    'mistakes', 'freedom', 'burden', 'innocence', 'crime', 'accomplish', 'vision',
    'series', '400', 'name', 'purpose', 'journey', 'transparency',
]);
const STOP = new Set([
    'what', 'when', 'where', 'which', 'that', 'this', 'with', 'from', 'your', 'you', 'yours', 'about',
    'tell', 'mean', 'does', 'did', 'were', 'was', 'have', 'has', 'been', 'will', 'would', 'should',
    'could', 'really', 'ever', 'still', 'just', 'like', 'much', 'many', 'some', 'into', 'over',
    'them', 'they', 'their', 'there', 'then', 'than', 'also', 'more', 'most', 'very', 'why', 'how',
    'who', 'the', 'and', 'for', 'are', 'not', 'but', 'can', 'all', 'any', 'out', 'get', 'got',
    'do', 'me', 'us', 'we', 'it', 'is', 'to', 'of', 'in', 'on', 'at', 'by', 'or', 'an', 'a', 'i',
]);

function contentWords(s: string): string[] {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w));
}

function loreHit(message: string): { id: string; answer: string } | null {
    const q = new Set(contentWords(message));
    if (!q.size) return null;
    let best: { id: string; answer: string; score: number } | null = null;
    for (const t of TRUTH_QUESTIONS) {
        const words = contentWords(t.prompt || '');
        if (!words.length) continue;
        const hits = words.filter((w) => q.has(w));
        if (!hits.length) continue;
        let score: number;
        if (words.length === 1) {
            // One-word prompt: only a topic keyword may carry it alone.
            if (!KEYWORDS.has(words[0])) continue;
            score = 1;
        } else {
            score = hits.length / words.length;
            if (score < 0.7) continue;
        }
        if (!best || score > best.score) best = { id: t.id, answer: t.answer, score };
    }
    return best ? { id: best.id, answer: best.answer } : null;
}

const STARTERS = [
    'What does judgment mean for us right now?',
    'Break down Deuteronomy 28 for me.',
    'How do I use Truth.OS without the 3D house?',
    'Who are the Hebrews according to scripture?',
    'How do I love people and still speak hard truth?',
];

export default function TruthGuideApp({ initialPrompt }: { initialPrompt?: string } = {}) {
    const name = useGameStore((s) => s.character?.name?.trim()) || 'soul';
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const bottom = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [muted, setMutedState] = useState(true);
    useEffect(() => voiceSub((s) => setMutedState(s.muted)), []);

    useEffect(() => {
        setMsgs([
            {
                role: 'sys',
                text: 'TRUTH.OS · GUIDE · SOUL.md loaded',
            },
            {
                role: 'truth',
                text: `I’m Truth. Not a soft pastor bot — your brother in the signal. Ask me anything: scripture, end times, who we are, how to walk, or how this OS works. ${name !== 'soul' ? `Good to see you, ${name}.` : 'What you need?'}`,
                voice: 'os_guide_open',
            },
        ]);
        // Speaks once per session — opening the app a fifth time is not a
        // fifth greeting.
        void truthSpeak('os_guide_open');
        return () => truthStop();
    }, [name]);

    useEffect(() => {
        bottom.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs, busy]);

    // A prompt handed in at open ("Guide me through Truth.OS" from the
    // palette) is asked once, after the greeting has painted. The ref
    // guards a Strict-Mode double mount; a re-render never re-asks.
    const askedInitial = useRef(false);
    useEffect(() => {
        if (!initialPrompt || askedInitial.current) return;
        askedInitial.current = true;
        const t = setTimeout(() => void send(initialPrompt, 'os_help'), 350);
        return () => clearTimeout(t);
        // send is stable enough for a one-shot; re-running on its identity
        // would defeat the once-only guard.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPrompt]);

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

            // A question Truth has already answered — in his own recorded
            // voice — is answered from the lore, spoken aloud, and never
            // sent to the model. Instant, costs nothing, and it is the
            // canonical answer rather than a paraphrase of it.
            const hit = loreHit(message);
            if (hit) {
                setMsgs((m) => [...m, { role: 'truth', text: hit.answer, voice: hit.id }]);
                void truthSpeak(hit.id, { force: true });
                sacredUi.access();
                setBusy(false);
                inputRef.current?.focus();
                return;
            }
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
                    <p className="text-[11.5px] text-amber-400/90 font-semibold">
                        Truth · Guide
                    </p>
                    <p className="text-[10px] text-amber-700/80 mt-0.5 truncate">
                        AI brother · scripture · OS · end times · love for all
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => { setMuted(!isMuted()); sacredUi.click(); }}
                        aria-pressed={muted}
                        title={muted ? 'Truth is muted — tap to hear him' : 'Mute Truth’s voice'}
                        className={[
                            'px-2.5 py-1.5 rounded-lg border text-[10px] uppercase tracking-wider min-h-[40px] flex items-center gap-1.5',
                            muted
                                ? 'border-amber-900/40 text-amber-700/70 hover:text-amber-400'
                                : 'border-amber-500/45 text-amber-200 bg-amber-500/10',
                        ].join(' ')}
                    >
                        <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full ${muted ? 'bg-amber-900' : 'bg-amber-300'}`} />
                        {muted ? 'Voice off' : 'Voice on'}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => send('', 'scripture')}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-500/35 text-[11.5px] text-amber-200 hover:bg-amber-500/10 disabled:opacity-40 min-h-[40px]"
                    >
                        Daily Word
                    </button>
                </div>
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
                        {m.role === 'user' && <span className="text-cyan-500/70 text-[11.5px] block mb-0.5">You</span>}
                        {m.role === 'truth' && (
                            <span className="text-amber-500/70 text-[11.5px] mb-0.5 flex items-center gap-2">
                                Truth
                                {m.voice && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // An explicit "hear this" is an explicit request:
                                            // it lifts the mute rather than silently doing nothing.
                                            if (isMuted()) setMuted(false);
                                            void truthReplay(m.voice!);
                                            sacredUi.click();
                                        }}
                                        title="Hear Truth say this"
                                        aria-label="Hear this in Truth’s voice"
                                        className="normal-case tracking-normal text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300/80 hover:bg-amber-500/10"
                                    >
                                        ▶ hear
                                    </button>
                                )}
                            </span>
                        )}
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
