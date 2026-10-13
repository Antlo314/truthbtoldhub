'use client';

/** Truth's narration: full, brief (long lines end at a sentence), or off */
import { useEffect, useState } from 'react';
import { getNarration, setNarration, type NarrationMode } from '@/lib/truthVoice';

const LABEL: Record<NarrationMode, string> = { full: 'Full', brief: 'Brief', off: 'Off' };

export default function NarrationSetting() {
    const [mode, setMode] = useState<NarrationMode>('brief');
    useEffect(() => setMode(getNarration()), []);
    return (
        <div className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/80">
            <p>Truth’s narration</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(['full', 'brief', 'off'] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => {
                            setNarration(m);
                            setMode(m);
                        }}
                        className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-[11px] uppercase tracking-wider transition-colors ${
                            mode === m ? 'border-amber-300/50 bg-amber-400/15 text-amber-100' : 'border-white/12 bg-white/[0.03] text-white/60 hover:text-white'
                        }`}
                    >
                        {LABEL[m]}
                    </button>
                ))}
            </div>
            <p className="mt-1.5 text-[11px] text-white/40">Brief ends long guide lines after a sentence or two. Answers you ask for are never cut.</p>
        </div>
    );
}
