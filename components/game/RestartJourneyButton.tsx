'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, X } from 'lucide-react';
import { useGameStore } from '@/lib/store/useGameStore';

interface Props {
    label?: string;
    redirectTo?: string;
    variant?: 'link' | 'button' | 'danger';
    className?: string;
    /** Called after reset succeeds, before navigation. */
    onRestart?: () => void;
}

export default function RestartJourneyButton({
    label = 'Start Over',
    redirectTo = '/awakening',
    variant = 'link',
    className = '',
    onRestart,
}: Props) {
    const router = useRouter();
    const restartJourney = useGameStore((s) => s.restartJourney);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const confirm = async () => {
        setBusy(true);
        try {
            await restartJourney();
            setOpen(false);
            onRestart?.();
            router.push(redirectTo);
        } finally {
            setBusy(false);
        }
    };

    const triggerClass =
        variant === 'danger'
            ? 'w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] text-red-200 border border-red-500/35 bg-red-950/40 hover:bg-red-900/50 transition-colors'
            : variant === 'button'
                ? 'px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300 border border-white/15 hover:border-white/30 hover:text-white transition-colors'
                : 'text-[10px] font-black uppercase tracking-[0.25em] text-white/50 hover:text-aether-gold transition-colors';

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={`${triggerClass} ${className}`}>
                {variant === 'danger' && <RotateCcw className="w-3.5 h-3.5 inline-block mr-2 -mt-0.5" />}
                {label}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => !busy && setOpen(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl border border-red-500/25 bg-zinc-950 p-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                                <p className="text-[9px] uppercase tracking-[0.35em] text-red-400/80">New Soul</p>
                                <h3 className="font-ritual text-xl text-white mt-1">Start over?</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => !busy && setOpen(false)}
                                className="p-2 rounded-full hover:bg-white/10 text-zinc-500"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            This erases your name, path, attunements, relics, quests, and all world progress. You will begin again at the Awakening.
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-2">Account sign-in and founder seal status are kept.</p>
                        <div className="flex gap-2 mt-5">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={busy}
                                className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-white/10 hover:bg-white/5 disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirm}
                                disabled={busy}
                                className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg,#fca5a5 0%,#dc2626 100%)' }}
                            >
                                {busy ? 'Resetting…' : 'Begin anew'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}