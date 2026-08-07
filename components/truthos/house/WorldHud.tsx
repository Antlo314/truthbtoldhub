'use client';

/**
 * Third-person world HUD — the persistent readout while you're walking around.
 *
 * Name badge, world clock with day phase, weather, and a skill rail. Values
 * come from the real character/profile stores and the world clock; nothing is
 * placeholder except the skill slots themselves, which render whatever the
 * player's path actually grants and show an honest empty state until the
 * system is built out.
 *
 * Deliberately non-interactive except for the skill buttons — it sits over a
 * pointer-locked 3D view, so it must never steal the cursor. Everything is
 * `pointer-events-none` apart from the controls that need clicks.
 */
import { useEffect, useState } from 'react';
import { CloudRain, CloudSun, Cloud, Sun, Moon, CloudFog, Sunrise, Sunset } from 'lucide-react';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { DESTINATIONS, destCenter } from './jungleMap';
import { getWalkerPose } from './walkerPose';
import {
    formatClock,
    phaseOf,
    useWorldTime,
    WEATHER_LABEL,
    type Phase,
    type Weather,
} from './worldTime';

const PHASE_LABEL: Record<Phase, string> = {
    dawn: 'Dawn',
    day: 'Day',
    dusk: 'Dusk',
    night: 'Night',
};

function WeatherIcon({ weather, phase, size = 15 }: { weather: Weather; phase: Phase; size?: number }) {
    if (weather === 'rain') return <CloudRain size={size} />;
    if (weather === 'fog') return <CloudFog size={size} />;
    if (weather === 'overcast') return <Cloud size={size} />;
    if (weather === 'cloudy') return <CloudSun size={size} />;
    if (phase === 'night') return <Moon size={size} />;
    if (phase === 'dawn') return <Sunrise size={size} />;
    if (phase === 'dusk') return <Sunset size={size} />;
    return <Sun size={size} />;
}

/**
 * Compass strip — where the four destinations are from where you stand.
 *
 * Bearings are derived from jungleMap, so a new destination appears here the
 * moment it appears in the world. Markers slide across a ±FOV band as you
 * turn and pin to the edges when a place is behind you; distance is real.
 */
const COMPASS_FOV = 1.15; // radians of world visible across the strip

const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'] as const;
const arrowFor = (rel: number) => ARROWS[((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8];

/**
 * The compass was unreadable for two independent reasons, and both are fixed
 * here rather than restyled:
 *
 *  1. THE BEARING WAS BACKWARDS. `atan2(-dx, -dz) - facing` negates the
 *     destination vector but not the forward vector, so markers swung the
 *     wrong way as you turned. The signed bearing is `facing - atan2(dx, dz)`,
 *     which is exactly atan2(d·right, d·forward) for the forward/right basis
 *     FirstPersonController uses. Positive is to your right, which is what
 *     `left: 50% + t*46%` already assumed.
 *
 *  2. THE LABELS COULD NOT MISS EACH OTHER. Four absolutely-positioned
 *     `whitespace-nowrap` spans needing ~430px of text shared a 300px strip,
 *     and anything outside the FOV was CLAMPED to exactly ±1 — so two places
 *     behind you landed on the identical pixel and printed through each other.
 *     Position and identity are now separate: the ribbon carries dots only
 *     (overlapping dots are harmless), and the names live in a grid, where
 *     overlap is impossible by construction. The rear hemisphere compresses
 *     into the outer band instead of clamping, so two markers can never share
 *     one x again.
 */
function Compass({ compact }: { compact: boolean }) {
    const pose = getWalkerPose();
    // Yaw 0 faces −z in this world, so the forward vector is (−sin, −cos)
    const facing = Math.atan2(-Math.sin(pose.yaw), -Math.cos(pose.yaw));

    const marks = DESTINATIONS.map((d) => {
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
        return { d, dist, rel, t, behind, arrived: dist < d.r, short: d.name.replace(/^The /, '') };
    });

    const dotClass = (m: (typeof marks)[number]) =>
        m.arrived ? 'bg-emerald-400' : m.behind ? 'bg-white/35' : 'bg-amber-300';

    return (
        <div className="flex flex-col items-center gap-1.5 w-[min(92vw,420px)]">
            {/* Ribbon — position only, zero text */}
            <div className="relative w-full h-6 rounded-full border border-white/12 bg-black/55 backdrop-blur-md shadow-xl overflow-hidden">
                <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
                {marks.map((m) => (
                    <span
                        key={m.d.id}
                        className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full ring-1 ring-black/60 transition-[left] duration-200 ease-out ${dotClass(m)}`}
                        style={{ left: `${50 + m.t * 46}%`, opacity: m.behind ? 0.55 : 1 }}
                    />
                ))}
            </div>

            {/* Legend — grid flow, so nothing can sit on anything */}
            <ul className="grid w-full grid-cols-2 gap-x-3 gap-y-1 rounded-2xl border border-white/12 bg-black/55 backdrop-blur-md px-2.5 py-1.5 shadow-xl">
                {marks.map((m) => (
                    <li
                        key={m.d.id}
                        className={`flex min-w-0 items-center gap-1.5 font-mono leading-none ${
                            m.arrived ? 'text-emerald-300' : m.behind ? 'text-white/45' : 'text-white/80'
                        }`}
                    >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass(m)}`} />
                        <span className={`w-3 shrink-0 text-center ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                            {arrowFor(m.rel)}
                        </span>
                        <span
                            className={`min-w-0 flex-1 truncate uppercase tracking-[0.08em] ${
                                compact ? 'text-[8px]' : 'text-[9px]'
                            }`}
                        >
                            {m.short}
                        </span>
                        <span
                            className={`shrink-0 tabular-nums text-white/45 ${
                                compact ? 'text-[8px]' : 'text-[9px]'
                            }`}
                        >
                            {Math.round(m.dist)}m
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Skill rail — reads the path the player actually chose */
function SkillRail({ compact }: { compact: boolean }) {
    const character = useGameStore((s) => s.character);
    const skills: string[] = Array.isArray(character?.skills) ? character.skills : [];
    const points = Number(character?.skillPoints ?? 0);

    // Nothing granted yet — show nothing rather than a row of dead slots
    if (skills.length === 0 && points === 0) return null;

    // Four slots is the shape the rail will keep once abilities are bound
    const slots = Array.from({ length: 4 }, (_, i) => skills[i] ?? null);

    return (
        <div className="pointer-events-auto flex items-center gap-1.5">
            {slots.map((skill, i) => (
                <div
                    key={i}
                    title={skill ? String(skill) : 'Empty slot'}
                    className={`relative rounded-xl border flex items-center justify-center font-mono transition-colors ${
                        compact ? 'w-10 h-10 text-[10px]' : 'w-12 h-12 text-[11px]'
                    } ${
                        skill
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                            : 'border-white/12 bg-black/40 text-white/25 border-dashed'
                    }`}
                >
                    {skill ? String(skill).slice(0, 2).toUpperCase() : '—'}
                    <span className="absolute -bottom-1.5 -right-1 text-[8px] text-white/40 font-mono">
                        {i + 1}
                    </span>
                </div>
            ))}
            {points > 0 && (
                <span className="ml-1 text-[10px] font-mono text-amber-300 whitespace-nowrap">
                    +{points} pt{points === 1 ? '' : 's'}
                </span>
            )}
        </div>
    );
}

export default function WorldHud({
    visible = true,
    compact = false,
}: {
    visible?: boolean;
    /** Phone layout — tighter, drops the secondary text */
    compact?: boolean;
}) {
    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);
    const hour = useWorldTime((s) => s.hour);
    const weather = useWorldTime((s) => s.weather);
    const day = useWorldTime((s) => s.day);

    // The clock advances every frame in the scene; re-render the HUD ~2/sec
    const [, force] = useState(0);
    useEffect(() => {
        const t = setInterval(() => force((n) => n + 1), 500);
        return () => clearInterval(t);
    }, []);

    if (!visible) return null;

    const name = character?.name?.trim() || profile?.display_name || 'Wanderer';
    const title = profile?.custom_title || (character?.path ? String(character.path) : null);
    const ph: Phase = phaseOf(hour);

    return (
        <div className="pointer-events-none absolute inset-0 z-[45] select-none">
            {/* One grid row owns the three top islands. They used to be three
                absolutely-positioned blocks that simply overlapped once the
                viewport got narrow; now the browser keeps them apart. */}
            <div
                className="absolute inset-x-0 top-0 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,auto)] items-start gap-2 px-3"
                style={{ paddingTop: `calc(${compact ? '0.5rem' : '0.75rem'} + env(safe-area-inset-top, 0px))` }}
            >
            {/* Who you are */}
            <div
                className="justify-self-start flex items-center gap-2.5 rounded-2xl border border-white/12 bg-black/55 backdrop-blur-md px-3 py-2 shadow-xl"
            >
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-black text-sm ring-1 ring-white/25 shrink-0">
                    {name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                    <span className="block text-[13px] text-white font-semibold leading-tight truncate max-w-[160px]">
                        {name}
                    </span>
                    {title && !compact && (
                        <span className="block text-[10px] text-emerald-300/80 uppercase tracking-[0.18em] truncate max-w-[160px]">
                            {title}
                        </span>
                    )}
                </span>
                {typeof profile?.soul_power === 'number' && (
                    <span className="ml-1 pl-2.5 border-l border-white/12 text-[11px] font-mono text-amber-200 tabular-nums shrink-0">
                        {profile.soul_power}
                    </span>
                )}
            </div>

            {/* When, and what the sky is doing */}
            <div
                className="justify-self-end flex items-center gap-2.5 rounded-2xl border border-white/12 bg-black/55 backdrop-blur-md px-3 py-2 shadow-xl"
            >
                <span className="text-white/85">
                    <WeatherIcon weather={weather} phase={ph} size={compact ? 15 : 17} />
                </span>
                <span className="text-right">
                    <span className="block text-[13px] text-white font-semibold tabular-nums leading-tight">
                        {formatClock(hour)}
                    </span>
                    {!compact && (
                        <span className="block text-[10px] text-white/55 uppercase tracking-[0.16em]">
                            {PHASE_LABEL[ph]} · {WEATHER_LABEL[weather]}
                        </span>
                    )}
                </span>
                {!compact && (
                    <span className="ml-1 pl-2.5 border-l border-white/12 text-[10px] font-mono text-white/45 shrink-0">
                        D{day}
                    </span>
                )}
            </div>

            {/* The compass, so a path always has a destination */}
            <div className="justify-self-center min-w-0 order-2">
                <Compass compact={compact} />
            </div>
            </div>

            {/* Bottom-centre — skill rail (hidden until a path grants one) */}
            <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: compact ? 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' : '1.25rem' }}
            >
                <SkillRail compact={compact} />
            </div>
        </div>
    );
}
