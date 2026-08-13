'use client';

/**
 * The Wall — yearly mark. The mural lives in The Mark (west bedroom).
 * This window is the quiet OS face: your year, your caption, a way in.
 */
import { useTruthOs } from '../truthOsStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

export default function WallApp({ onEnterChamber }: { onEnterChamber?: () => void }) {
    const year = new Date().getUTCFullYear();
    const nextOpen = new Date(Date.UTC(year + 1, 0, 1));
    const email = useTruthOs((s) => s.sessionEmail);

    return (
        <div className="h-full overflow-y-auto p-5 text-sm text-zinc-200 bg-zinc-950 space-y-5">
            <header className="pb-3 border-b border-white/8">
                <p className="text-[10px] uppercase tracking-[0.32em] font-mono text-amber-300/80">The Wall</p>
                <h3 className="text-white font-semibold text-lg mt-1 leading-tight">One mark a year. It stays.</h3>
            </header>

            <p className="text-zinc-400 leading-relaxed">
                In the west room of the house — The Mark — every soul may leave a small painting
                on the plaster. Your name sits under it. {year} is open until January 1.
            </p>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-amber-200/70 font-mono">This year</p>
                <p className="text-white font-medium">{year}</p>
                <p className="text-xs text-zinc-500">
                    {email
                        ? `Next year opens ${nextOpen.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} UTC.`
                        : 'Sign in to leave a mark. Looking is free.'}
                </p>
            </div>

            {onEnterChamber && (
                <button
                    type="button"
                    onClick={() => {
                        sacredUi.access();
                        onEnterChamber();
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold text-sm hover:brightness-110 transition min-h-[48px]"
                >
                    Leave terminal → walk to The Mark
                </button>
            )}

            <p className="text-[11px] text-zinc-600 leading-relaxed">
                Tools and the color wheel rise when you choose a cell. Supporters receive a gold
                frame — not a second mark.
            </p>
        </div>
    );
}
