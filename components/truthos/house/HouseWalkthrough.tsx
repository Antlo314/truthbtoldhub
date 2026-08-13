'use client';

import { useEffect, useRef } from 'react';
import {
    useHouseUi,
    WALKTHROUGH_STEPS,
    markWalkthroughDone,
} from './houseUiStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { isOutdoors } from './homeMap';
import { getWalkerPose } from './walkerPose';

export default function HouseWalkthrough({
    activity,
    usedAt,
}: {
    activity: 'move' | 'look' | 'jump' | 'idle' | null;
    usedAt: number;
}) {
    const open = useHouseUi((s) => s.walkthroughOpen);
    const step = useHouseUi((s) => s.walkthroughStep);
    const setWalkthrough = useHouseUi((s) => s.setWalkthrough);
    const nextWalkthrough = useHouseUi((s) => s.nextWalkthrough);
    const usedAtOnStep = useRef(0);
    const armed = useRef(false);

    useEffect(() => {
        usedAtOnStep.current = usedAt;
        armed.current = false;
        const t = window.setTimeout(() => {
            armed.current = true;
        }, 400);
        return () => window.clearTimeout(t);
        // Capture usedAt at the step change only — a later use must beat this.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    useEffect(() => {
        if (!open) return;
        const current = WALKTHROUGH_STEPS[Math.min(step, WALKTHROUGH_STEPS.length - 1)];
        if (!current || current.wait === 'tap' || !armed.current) return;
        if (current.wait === 'look' && activity === 'look') nextWalkthrough();
        if (current.wait === 'move' && activity === 'move') nextWalkthrough();
        if (current.wait === 'use' && usedAt > usedAtOnStep.current) nextWalkthrough();
        if (current.wait === 'out') {
            const p = getWalkerPose();
            if (isOutdoors(p.x, p.z)) nextWalkthrough();
        }
    }, [activity, usedAt, open, step, nextWalkthrough]);

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
        if (current.wait !== 'tap' && !isLast) return;
        sacredUi.click();
        if (isLast) finish();
        else nextWalkthrough();
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 pointer-events-none">
            <div
                className="pointer-events-auto w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#0c0a14]/92 shadow-2xl backdrop-blur-md overflow-hidden"
                role="dialog"
                aria-labelledby="walkthrough-title"
            >
                <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.32em] text-emerald-400/80 font-mono">
                            Tour · {step + 1}/{total}
                        </p>
                        <h2 id="walkthrough-title" className="text-base text-white font-semibold mt-0.5">
                            {current.title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={finish}
                        className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white shrink-0 min-h-[36px]"
                    >
                        Skip
                    </button>
                </div>
                <div className="px-4 pb-3 space-y-2">
                    <p className="text-sm text-white/75 leading-relaxed">{current.body}</p>
                    <p className="text-[11px] text-emerald-400/80 font-mono">{current.tip}</p>
                    <div className="flex gap-1">
                        {WALKTHROUGH_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-emerald-400' : 'bg-white/10'}`}
                            />
                        ))}
                    </div>
                    {current.wait === 'tap' && (
                        <button
                            type="button"
                            onClick={advance}
                            className="w-full mt-1 py-2.5 rounded-xl bg-emerald-500/90 text-black text-sm font-semibold min-h-[44px]"
                        >
                            {isLast ? 'Begin' : 'Continue'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
