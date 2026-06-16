'use client';

import { useState, useMemo } from 'react';
import type { Puzzle } from '@/lib/game/puzzles';
import { shuffle, caesarShift } from '@/lib/game/puzzles';
import { ArrowLeft, Check, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
    puzzle: Puzzle;
    accent?: string;
    /** Shown when Scribe path or a matching scroll grants insight */
    insightHint?: string | null;
    onSolve: () => void;
    onExit: () => void;
}

export default function PuzzleScene({ puzzle, accent = '#fbbf24', insightHint, onSolve, onExit }: Props) {
    const [solved, setSolved] = useState(false);
    const [wrong, setWrong] = useState(false);

    const shuffled = useMemo(
        () => (puzzle.kind === 'sequence' ? shuffle(puzzle.tokens.map((t, i) => ({ t, i }))) : []),
        [puzzle]
    );
    const [placed, setPlaced] = useState<number[]>([]);
    const [dialIdx, setDialIdx] = useState<number[]>(() => (puzzle.kind === 'dials' ? puzzle.dials.map(() => 0) : []));
    const [wheel, setWheel] = useState(0);          // cipher: current wheel position
    const [traced, setTraced] = useState<string[]>([]); // constellation: stars tapped so far

    const flashWrong = () => {
        setWrong(true);
        setTimeout(() => setWrong(false), 700);
    };

    const tapToken = (si: number) => {
        if (puzzle.kind !== 'sequence' || placed.includes(si) || solved) return;
        const next = [...placed, si];
        setPlaced(next);
        if (next.length === puzzle.solution.length) {
            const ok = next.every((x, k) => shuffled[x].t === puzzle.solution[k]);
            if (ok) setSolved(true);
            else {
                flashWrong();
                setTimeout(() => setPlaced([]), 700);
            }
        }
    };

    const cycle = (d: number, dir: number) => {
        if (puzzle.kind !== 'dials' || solved) return;
        setDialIdx((arr) => {
            const a = [...arr];
            const n = puzzle.dials[d].values.length;
            a[d] = (a[d] + dir + n) % n;
            return a;
        });
    };

    const seal = () => {
        if (puzzle.kind !== 'dials') return;
        if (dialIdx.every((v, k) => v === puzzle.solution[k])) setSolved(true);
        else flashWrong();
    };

    // cipher: rotate the wheel, then seal when the message reads true
    const turn = (dir: number) => {
        if (puzzle.kind !== 'cipher' || solved) return;
        setWheel((w) => (w + dir + 26) % 26);
    };
    const sealCipher = () => {
        if (puzzle.kind !== 'cipher') return;
        if (wheel === puzzle.shift) setSolved(true);
        else flashWrong();
    };

    // constellation: tap stars in order; a wrong star resets the trace
    const tapStar = (label: string) => {
        if (puzzle.kind !== 'constellation' || solved || traced.includes(label)) return;
        if (puzzle.solution[traced.length] === label) {
            const next = [...traced, label];
            setTraced(next);
            if (next.length === puzzle.solution.length) setSolved(true);
        } else {
            flashWrong();
            setTraced([]);
        }
    };

    // screen coords (0-100) of the stars traced so far, for the polyline
    const tracedCoords = puzzle.kind === 'constellation'
        ? traced.map((label) => puzzle.stars.find((s) => s.label === label)!).filter(Boolean).map((s) => ({ x: s.x, y: s.y }))
        : [];

    return (
        <div className="absolute inset-0 z-[60] overflow-y-auto custom-scrollbar" style={{ background: `radial-gradient(circle at 50% -5%, ${accent}22, transparent 55%), #05060a` }}>
            <div className="max-w-lg mx-auto px-5 pt-6 pb-28">
                <button onClick={onExit} className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white mb-5">
                    <ArrowLeft className="w-4 h-4" /> Leave the puzzle
                </button>
                <p className="text-[10px] tracking-[0.4em] uppercase mb-2" style={{ color: accent }}>The Quest</p>
                <h1 className="font-ritual text-2xl md:text-3xl font-black text-white mb-4">{puzzle.title}</h1>
                <p className="text-sm text-zinc-300 leading-relaxed mb-3">{puzzle.prompt}</p>
                {insightHint ? (
                    <p className="text-[11px] italic mb-7 px-3 py-2 rounded-xl border" style={{ color: accent, borderColor: accent + '44', background: accent + '0d' }}>
                        Insight · {insightHint}
                    </p>
                ) : puzzle.hint ? (
                    <p className="text-[11px] text-zinc-600 italic mb-7">A sealed hint waits — seek the Scribe&apos;s path or a scroll that opens this riddle.</p>
                ) : null}

                {solved ? (
                    <div className="rounded-2xl border p-6 text-center" style={{ borderColor: accent + '55', background: accent + '12' }}>
                        <Check className="w-8 h-8 mx-auto mb-3" style={{ color: accent }} />
                        <p className="font-ritual italic text-white/90 leading-relaxed mb-5">{puzzle.solvedText}</p>
                        <button onClick={onSolve} className="px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black" style={{ background: accent }}>
                            Claim your reward →
                        </button>
                    </div>
                ) : puzzle.kind === 'sequence' ? (
                    <>
                        <div className="flex flex-wrap gap-2 mb-6 min-h-[3rem]">
                            {Array.from({ length: puzzle.solution.length }).map((_, k) => {
                                const si = placed[k];
                                const filled = si !== undefined;
                                return (
                                    <div
                                        key={k}
                                        onClick={() => filled && k === placed.length - 1 && setPlaced((p) => p.slice(0, -1))}
                                        className={`px-3 py-2 rounded-lg border min-w-[3rem] text-center text-sm ${filled && k === placed.length - 1 ? 'cursor-pointer' : ''}`}
                                        style={{ borderColor: wrong ? '#ef4444' : filled ? accent : 'rgba(255,255,255,0.15)', background: filled ? accent + '14' : 'transparent', color: wrong ? '#fca5a5' : '#fff' }}
                                    >
                                        {filled ? shuffled[si].t : <span className="text-zinc-600">·</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {shuffled.map((tk, si) => (
                                <button
                                    key={si}
                                    disabled={placed.includes(si)}
                                    onClick={() => tapToken(si)}
                                    className="px-4 py-2.5 rounded-xl border text-sm text-white disabled:opacity-20"
                                    style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}
                                >
                                    {tk.t}
                                </button>
                            ))}
                        </div>
                        {placed.length > 0 && (
                            <button onClick={() => setPlaced([])} className="mt-6 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> Reset
                            </button>
                        )}
                    </>
                ) : puzzle.kind === 'dials' ? (
                    <>
                        <div className="flex flex-wrap justify-center gap-4 mb-7">
                            {puzzle.dials.map((d, di) => (
                                <div key={di} className="flex flex-col items-center gap-2">
                                    <span className="text-[9px] uppercase tracking-widest text-zinc-500">{d.label}</span>
                                    <button onClick={() => cycle(di, 1)} className="text-zinc-400 hover:text-white"><ChevronUp className="w-5 h-5" /></button>
                                    <div className="w-14 h-16 rounded-xl border flex items-center justify-center font-ritual text-2xl text-white" style={{ borderColor: wrong ? '#ef4444' : accent + '55', background: accent + '0d' }}>
                                        {d.values[dialIdx[di]]}
                                    </div>
                                    <button onClick={() => cycle(di, -1)} className="text-zinc-400 hover:text-white"><ChevronDown className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={seal} className="w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black" style={{ background: accent }}>
                            Seal
                        </button>
                        {wrong && <p className="text-center text-[11px] text-red-400 mt-3 uppercase tracking-widest">The lock holds. Not yet…</p>}
                    </>
                ) : puzzle.kind === 'cipher' ? (
                    <>
                        <div className="rounded-2xl border p-6 mb-6 text-center" style={{ borderColor: accent + '33', background: '#ffffff05' }}>
                            <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 mb-3">Sealed inscription</p>
                            <p className="font-mono text-lg tracking-[0.3em] text-zinc-500 mb-5 break-words">{puzzle.cipherText}</p>
                            <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 mb-2">Reads</p>
                            <p className="font-ritual text-3xl tracking-[0.25em] break-words" style={{ color: wrong ? '#fca5a5' : accent }}>
                                {caesarShift(puzzle.cipherText, -wheel)}
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-5 mb-7">
                            <button onClick={() => turn(-1)} className="w-12 h-12 rounded-full border flex items-center justify-center text-white/80 hover:text-white" style={{ borderColor: accent + '55' }}><ChevronLeft className="w-6 h-6" /></button>
                            <div className="flex flex-col items-center w-12">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-500">Wheel</span>
                                <span className="font-ritual text-2xl" style={{ color: accent }}>{wheel}</span>
                            </div>
                            <button onClick={() => turn(1)} className="w-12 h-12 rounded-full border flex items-center justify-center text-white/80 hover:text-white" style={{ borderColor: accent + '55' }}><ChevronRight className="w-6 h-6" /></button>
                        </div>
                        <button onClick={sealCipher} className="w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black" style={{ background: accent }}>
                            Speak it
                        </button>
                        {wrong && <p className="text-center text-[11px] text-red-400 mt-3 uppercase tracking-widest">Not the true name. Turn again…</p>}
                    </>
                ) : (
                    <>
                        <div className="relative w-full mx-auto mb-5 rounded-2xl border overflow-hidden" style={{ aspectRatio: '1 / 1', maxWidth: 360, borderColor: accent + '33', background: 'radial-gradient(circle at 50% 40%, #0b1430, #04060a)' }}>
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {tracedCoords.length > 1 && (
                                    <polyline points={tracedCoords.map((c) => `${c.x},${c.y}`).join(' ')} fill="none" stroke={accent} strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
                                )}
                            </svg>
                            {puzzle.stars.map((s) => {
                                const lit = traced.includes(s.label);
                                return (
                                    <button key={s.label} onClick={() => tapStar(s.label)} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                                        <span className="rounded-full transition-all" style={{ width: lit ? 14 : 10, height: lit ? 14 : 10, background: lit ? accent : '#cbd5e1', boxShadow: lit ? `0 0 12px ${accent}` : '0 0 6px rgba(203,213,225,0.55)' }} />
                                        <span className="mt-1 text-[8px] uppercase tracking-widest" style={{ color: lit ? accent : '#94a3b8' }}>{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-center text-[10px] uppercase tracking-widest text-zinc-500">{traced.length} / {puzzle.solution.length} traced</p>
                        {traced.length > 0 && (
                            <button onClick={() => setTraced([])} className="mt-4 mx-auto text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" /> Start over
                            </button>
                        )}
                        {wrong && <p className="text-center text-[11px] text-red-400 mt-3 uppercase tracking-widest">That star breaks the line. Begin again…</p>}
                    </>
                )}
            </div>
        </div>
    );
}
