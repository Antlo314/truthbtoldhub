'use client';

/**
 * Talking to a soul on the plain: their name, their words a line at a
 * time, and — when they have something for you — the choice to take it
 * on. E, Space or Enter turns the page; Escape walks away.
 */
import { useEffect, useState } from 'react';
import type { Quest } from '@/lib/world/quests';

export type Dialogue = {
    name: string;
    title: string;
    aura: string;
    lines: string[];
    offer?: Quest | null;
};

export default function PlainDialogue({ dialogue, onClose, onAccept }: { dialogue: Dialogue | null; onClose: () => void; onAccept: (q: Quest) => void }) {
    const [i, setI] = useState(0);
    useEffect(() => setI(0), [dialogue]);
    const last = dialogue ? i >= dialogue.lines.length - 1 : true;

    useEffect(() => {
        if (!dialogue) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
                return;
            }
            if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (!last) setI((n) => n + 1);
                else if (dialogue.offer) onAccept(dialogue.offer);
                else onClose();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [dialogue, last, onAccept, onClose]);

    if (!dialogue) return null;
    return (
        <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-[#0c0a12]/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <div className="flex items-center gap-2.5">
                    <span className="h-8 w-8 shrink-0 rounded-full border-2" style={{ borderColor: dialogue.aura, background: `radial-gradient(circle, ${dialogue.aura}55, transparent 70%)` }} />
                    <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-white">{dialogue.name}</p>
                        <p className="text-[11px] text-white/45">{dialogue.title}</p>
                    </div>
                    {dialogue.offer && <span className="ml-auto rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-200">{dialogue.offer.name}</span>}
                </div>
                <p className="mt-3 min-h-[3.2em] text-[15px] leading-relaxed text-white/90">{dialogue.lines[i]}</p>
                {dialogue.offer && last && (
                    <p className="mt-1 text-[12px] text-emerald-200/80">
                        Reward: {dialogue.offer.xp} xp{dialogue.offer.skillPoints ? ` · ${dialogue.offer.skillPoints} skill point` : ''}
                    </p>
                )}
                <div className="mt-3 flex items-center justify-end gap-2">
                    <span className="mr-auto text-[11px] tabular-nums text-white/30">
                        {i + 1} / {dialogue.lines.length}
                    </span>
                    {!last ? (
                        <button type="button" onClick={() => setI((n) => n + 1)} className="min-h-[40px] rounded-xl border border-white/15 bg-white/[0.06] px-4 text-[13px] text-white hover:bg-white/[0.1]">
                            Go on
                        </button>
                    ) : dialogue.offer ? (
                        <>
                            <button type="button" onClick={onClose} className="min-h-[40px] rounded-xl border border-white/12 px-4 text-[13px] text-white/65 hover:text-white">
                                Not now
                            </button>
                            <button type="button" onClick={() => onAccept(dialogue.offer!)} className="min-h-[40px] rounded-xl border border-amber-300/50 bg-amber-400/15 px-4 text-[13px] font-medium text-amber-50 hover:bg-amber-400/25">
                                I will
                            </button>
                        </>
                    ) : (
                        <button type="button" onClick={onClose} className="min-h-[40px] rounded-xl border border-white/15 bg-white/[0.06] px-4 text-[13px] text-white hover:bg-white/[0.1]">
                            Farewell
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
