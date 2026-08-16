'use client';

/**
 * Walking HUD — room or grove, clock, pause. Everything else is Pause or Use.
 */
import { useEffect, useState } from 'react';
import { DESTINATIONS, destCenter } from './jungleMap';
import { getWalkerPose } from './walkerPose';
import { formatClock, useWorldTime } from './worldTime';
import { isOutdoors, roomAt } from './homeMap';
import { useHouseUi } from './houseUiStore';

const COMPASS_FOV = 1.15;

export default function WorldHud({
    visible = true,
    compact = false,
    onOpenOs,
}: {
    visible?: boolean;
    compact?: boolean;
    onOpenOs?: () => void;
}) {
    const hour = useWorldTime((s) => s.hour);
    const setPaused = useHouseUi((s) => s.setPaused);
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick((n) => n + 1), 400);
        return () => clearInterval(t);
    }, []);

    if (!visible) return null;

    const pose = getWalkerPose();
    const place = roomAt(pose.x, pose.z);
    const outdoors = isOutdoors(pose.x, pose.z);
    const title =
        place.kind === 'grove'
            ? `${place.name.replace(/^The /, '')} · ${Math.round(place.dist)}m`
            : place.name;

    return (
        <div className="pointer-events-none absolute inset-0 z-[45] select-none">
            {onOpenOs && (
                <button
                    type="button"
                    onClick={onOpenOs}
                    className="pointer-events-auto absolute left-3 z-[46] rounded-xl border border-amber-300/40 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-amber-100 backdrop-blur-md min-h-[40px]"
                    style={{ top: `calc(0.55rem + env(safe-area-inset-top, 0px))` }}
                >
                    Open Truth.OS
                </button>
            )}
            <div
                className="absolute inset-x-0 top-0 flex items-start justify-center gap-2 px-3"
                style={{
                    paddingTop: `calc(${compact ? '3.4rem' : '3.6rem'} + env(safe-area-inset-top, 0px))`,
                }}
            >
                <div className="flex flex-col items-center gap-1.5 min-w-0 max-w-[min(92vw,360px)]">
                    <div className="rounded-full border border-white/12 bg-black/55 backdrop-blur-md px-3 py-1.5 shadow-xl">
                        <p className="text-[12px] text-white/90 font-medium tracking-wide text-center truncate max-w-[240px]">
                            {title}
                        </p>
                    </div>
                    {outdoors && <CompassRibbon />}
                </div>

                <div className="pointer-events-auto absolute right-3 flex items-center gap-1.5"
                    style={{ top: `calc(${compact ? '3.4rem' : '3.6rem'} + env(safe-area-inset-top, 0px))` }}
                >
                    <span className="rounded-full border border-white/12 bg-black/55 backdrop-blur-md px-2.5 py-1 text-[12px] text-white/80 tabular-nums font-semibold">
                        {formatClock(hour)}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPaused(true)}
                        className="rounded-full border border-white/15 bg-black/55 backdrop-blur-md px-2.5 py-1 text-[11px] uppercase tracking-widest text-white/70 hover:text-white min-h-[32px]"
                        aria-label="Pause"
                    >
                        ☰
                    </button>
                </div>
            </div>
        </div>
    );
}

function CompassRibbon() {
    const pose = getWalkerPose();
    const facing = Math.atan2(-Math.sin(pose.yaw), -Math.cos(pose.yaw));

    return (
        <div className="relative w-[160px] h-5 rounded-full border border-white/12 bg-black/50 backdrop-blur-md overflow-hidden">
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
            {DESTINATIONS.map((d) => {
                const c = destCenter(d);
                const dx = c.x - pose.x;
                const dz = c.z - pose.z;
                const dist = Math.hypot(dx, dz);
                let rel = facing - Math.atan2(dx, dz);
                while (rel > Math.PI) rel -= Math.PI * 2;
                while (rel < -Math.PI) rel += Math.PI * 2;
                const a = Math.abs(rel);
                const behind = a > COMPASS_FOV;
                const t = behind
                    ? Math.sign(rel) * (0.72 + 0.28 * ((a - COMPASS_FOV) / (Math.PI - COMPASS_FOV)))
                    : (rel / COMPASS_FOV) * 0.72;
                return (
                    <span
                        key={d.id}
                        className={`absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 -translate-x-1/2 rounded-full ${
                            dist < d.r ? 'bg-emerald-400' : behind ? 'bg-white/35' : 'bg-amber-300'
                        }`}
                        style={{ left: `${50 + t * 46}%` }}
                    />
                );
            })}
        </div>
    );
}
