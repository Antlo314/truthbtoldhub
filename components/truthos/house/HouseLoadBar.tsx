'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';

/** Hooks DefaultLoadingManager so the chamber shows real load, not a pulse. */
export default function HouseLoadBar({ label = 'Entering the house' }: { label?: string }) {
    const [ratio, setRatio] = useState(0.08);

    useEffect(() => {
        const mgr = THREE.DefaultLoadingManager;
        const prevProgress = mgr.onProgress;
        const prevLoad = mgr.onLoad;
        mgr.onProgress = (url, loaded, total) => {
            prevProgress?.(url, loaded, total);
            setRatio(total > 0 ? Math.max(0.08, loaded / total) : 0.35);
        };
        mgr.onLoad = () => {
            prevLoad?.();
            setRatio(1);
        };
        return () => {
            mgr.onProgress = prevProgress;
            mgr.onLoad = prevLoad;
        };
    }, []);

    const pct = Math.round(ratio * 100);

    return (
        <div className="fixed inset-0 z-[85] flex flex-col items-center justify-center bg-[#07060a] gap-5">
            <p className="font-mono text-[11px] tracking-[0.34em] uppercase text-emerald-400/80">{label}</p>
            <div className="w-[min(72vw,280px)] h-[5px] rounded-full bg-white/10 overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-[width] duration-200"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="font-mono text-[10px] tabular-nums text-white/35">{pct}%</p>
        </div>
    );
}
