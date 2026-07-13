'use client';

/**
 * Small house tip widget — never opens Truth lore.
 * Points players to the computer for Truth.OS only.
 */
import { useState } from 'react';

export default function TruthGuideWidget({
    placement = 'desktop',
}: {
    placement?: 'desktop' | 'mobile';
}) {
    const [open, setOpen] = useState(false);

    const wrapClass =
        placement === 'mobile'
            ? 'relative z-40 flex flex-col items-start gap-2 pointer-events-auto'
            : 'fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-2 pointer-events-auto';

    return (
        <div className={wrapClass}>
            {open && (
                <div
                    className={[
                        'w-[min(100vw-2rem,300px)] rounded-xl border border-emerald-500/30 bg-black/90 backdrop-blur-md shadow-2xl overflow-hidden font-mono text-[11px]',
                        placement === 'mobile' ? 'order-first' : '',
                    ].join(' ')}
                >
                    <div className="px-3 py-2 border-b border-emerald-500/20 flex justify-between items-center">
                        <span className="text-emerald-400/90 tracking-widest">HOUSE.TIP</span>
                        <button type="button" className="text-white/40 hover:text-white" onClick={() => setOpen(false)}>
                            ×
                        </button>
                    </div>
                    <div className="p-3 space-y-2 text-emerald-400/85 leading-relaxed">
                        <p>Walk the house. Gold rings open hub rooms.</p>
                        <p className="text-emerald-600">
                            All Truth content lives only in <span className="text-emerald-300">Truth.OS</span> —
                            boot the green computer in the bedroom.
                        </p>
                    </div>
                </div>
            )}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-12 h-12 rounded-full border border-emerald-500/40 bg-black/80 text-emerald-400 font-mono text-xs shadow-lg hover:bg-emerald-500/10 hover:border-emerald-400/60"
                title="House tip"
            >
                ?
            </button>
        </div>
    );
}
