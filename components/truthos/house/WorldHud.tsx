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
import {
    formatClock,
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

/** Skill rail — reads the path the player actually chose */
function SkillRail({ compact }: { compact: boolean }) {
    const character = useGameStore((s) => s.character);
    const skills: string[] = Array.isArray(character?.skills) ? character.skills : [];
    const points = Number(character?.skillPoints ?? 0);

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
    const phase = useWorldTime.getState().hour;
    const ph: Phase =
        phase >= 5.2 && phase < 7.4
            ? 'dawn'
            : phase >= 7.4 && phase < 17.5
              ? 'day'
              : phase >= 17.5 && phase < 20.4
                ? 'dusk'
                : 'night';

    return (
        <div className="pointer-events-none absolute inset-0 z-[45] select-none">
            {/* Top-left — who you are */}
            <div
                className={`absolute left-3 flex items-center gap-2.5 rounded-2xl border border-white/12 bg-black/55 backdrop-blur-md px-3 py-2 shadow-xl ${
                    compact ? 'top-2' : 'top-3'
                }`}
                style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
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

            {/* Top-right — when and what the sky is doing */}
            <div
                className={`absolute right-3 flex items-center gap-2.5 rounded-2xl border border-white/12 bg-black/55 backdrop-blur-md px-3 py-2 shadow-xl ${
                    compact ? 'top-2' : 'top-3'
                }`}
                style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
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

            {/* Bottom-centre — skill rail */}
            <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: compact ? 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' : '1.25rem' }}
            >
                <SkillRail compact={compact} />
            </div>
        </div>
    );
}
