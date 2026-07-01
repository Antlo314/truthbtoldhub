'use client';

/**
 * PathStatPreview — a compact, animated readout of a path's combat identity.
 * Shown on the path-selection screen so the choice feels weighty: each road
 * gets bars for Power, Reach, Vitality and Resilience derived from its base
 * combat modifiers (lib/game/pathPowers.ts).
 *
 * Bars animate from 0 to their value on mount / when the selected path
 * changes, easing with a confident deceleration.
 */
import { useEffect, useState } from 'react';

export interface PathStatProfile {
    power: number;      // 0..100 — damage output
    reach: number;      // 0..100 — strike range
    vitality: number;   // 0..100 — HP pool
    resilience: number; // 0..100 — damage mitigation / sustain
}

interface StatRow {
    key: keyof PathStatProfile;
    label: string;
}

const ROWS: StatRow[] = [
    { key: 'power', label: 'Power' },
    { key: 'reach', label: 'Reach' },
    { key: 'vitality', label: 'Vitality' },
    { key: 'resilience', label: 'Resilience' },
];

export default function PathStatPreview({
    profile,
    color,
    animateKey,
}: {
    profile: PathStatProfile;
    color: string;
    /** change this to re-trigger the bar fill animation (e.g. the path id) */
    animateKey: string;
}) {
    const [shown, setShown] = useState<PathStatProfile>({ power: 0, reach: 0, vitality: 0, resilience: 0 });

    useEffect(() => {
        // reset then ease toward the target so a new selection re-fills.
        setShown({ power: 0, reach: 0, vitality: 0, resilience: 0 });
        const start = performance.now();
        const dur = 650;
        let raf = 0;
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            setShown({
                power: profile.power * eased,
                reach: profile.reach * eased,
                vitality: profile.vitality * eased,
                resilience: profile.resilience * eased,
            });
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animateKey]);

    return (
        <div className="mt-2 space-y-1.5">
            {ROWS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                    <span className="w-[52px] shrink-0 text-[8px] uppercase tracking-[0.2em] text-zinc-500">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${Math.max(4, shown[key])}%`,
                                background: `linear-gradient(90deg, ${color}99, ${color})`,
                                boxShadow: `0 0 8px ${color}66`,
                                transition: 'background 0.2s',
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
