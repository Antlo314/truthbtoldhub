'use client';

import {
    useHouseUi,
    WALKTHROUGH_STEPS,
    markWalkthroughDone,
} from './houseUiStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

export default function HouseWalkthrough() {
    const open = useHouseUi((s) => s.walkthroughOpen);
    const step = useHouseUi((s) => s.walkthroughStep);
    const setWalkthrough = useHouseUi((s) => s.setWalkthrough);
    const nextWalkthrough = useHouseUi((s) => s.nextWalkthrough);

    if (!open) return null;

    const total = WALKTHROUGH_STEPS.length;
    const current = WALKTHROUGH_STEPS[Math.min(step, total - 1)];
    const isLast = step >= total - 1;

    const finish = () => {
        markWalkthroughDone();
        setWalkthrough(false);
        sacredUi.access();
    };

    const advance = () => {
        sacredUi.click();
        if (isLast) finish();
        else nextWalkthrough();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-6">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
                onClick={finish}
                aria-hidden
            />
            <div
                className="relative w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#0c0a14]/95 shadow-2xl overflow-hidden"
                role="dialog"
                aria-labelledby="walkthrough-title"
            >
                <div className="px-5 pt-5 pb-3 border-b border-white/10 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-400/80 font-mono">
                            House tour · {step + 1}/{total}
                        </p>
                        <h2 id="walkthrough-title" className="text-xl text-white font-semibold mt-1">
                            {current.title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={finish}
                        className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white shrink-0"
                    >
                        Skip
                    </button>
                </div>

                <div className="px-5 py-4 space-y-3">
                    <p className="text-sm text-white/75 leading-relaxed">{current.body}</p>
                    <p className="text-[11px] text-emerald-400/80 font-mono border-l-2 border-emerald-500/40 pl-3">
                        {current.tip}
                    </p>

                    {/* Progress dots */}
                    <div className="flex gap-1.5 pt-1">
                        {WALKTHROUGH_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={[
                                    'h-1 flex-1 rounded-full transition-colors',
                                    i <= step ? 'bg-emerald-400' : 'bg-white/10',
                                ].join(' ')}
                            />
                        ))}
                    </div>
                </div>

                <div className="px-5 pb-5 flex gap-2">
                    {step > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                sacredUi.hover();
                                setWalkthrough(true, step - 1);
                            }}
                            className="flex-1 py-3 rounded-xl border border-white/15 text-sm text-white/70 uppercase tracking-wider hover:bg-white/5"
                        >
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={advance}
                        className="flex-[1.4] py-3 rounded-xl bg-emerald-500/20 border border-emerald-400/45 text-emerald-100 text-sm font-semibold uppercase tracking-wider hover:bg-emerald-500/30"
                    >
                        {isLast ? 'Enter house' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}
