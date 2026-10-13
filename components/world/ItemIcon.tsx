'use client';

/**
 * One look for every item: a lucide glyph on a tinted, softly lit tile —
 * the same language as Truth.OS's app icons, sized for a bag grid, a belt
 * slot or a shop row.
 */
import {
    Cherry,
    CircleDot,
    Droplet,
    Droplets,
    Fish,
    FlaskConical,
    Footprints,
    Ghost,
    HardHat,
    Hexagon,
    PawPrint,
    Shield,
    ShieldHalf,
    Sparkle,
    Sprout,
    Sword,
    Triangle,
    Wand,
    WandSparkles,
    Wheat,
    Package,
    type LucideIcon,
} from 'lucide-react';
import { item } from '@/lib/world/items';

const ICONS: Record<string, LucideIcon> = {
    Cherry,
    CircleDot,
    Droplet,
    Droplets,
    Fish,
    FlaskConical,
    Footprints,
    Ghost,
    HardHat,
    Hexagon,
    PawPrint,
    Shield,
    ShieldHalf,
    Sparkle,
    Sprout,
    Sword,
    Triangle,
    Wand,
    WandSparkles,
    Wheat,
};

export default function ItemIcon({ id, size = 44, count, dim = false }: { id: string; size?: number; count?: number; dim?: boolean }) {
    const d = item(id);
    const Icon = (d && ICONS[d.icon]) || Package;
    const tint = d?.tint ?? '#a8a29e';
    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center rounded-[28%] ${dim ? 'opacity-40' : ''}`}
            style={{
                width: size,
                height: size,
                background: `linear-gradient(155deg, ${tint}55, ${tint}18 60%, #00000033)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), inset 0 0 0 1px ${tint}66, 0 4px 14px -6px ${tint}aa`,
            }}
            title={d?.name}
        >
            <Icon style={{ width: size * 0.52, height: size * 0.52, color: tint, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }} strokeWidth={2.1} />
            {count !== undefined && count > 1 && (
                <span className="absolute -bottom-1 -right-1 min-w-[18px] rounded-full border border-black/50 bg-black/85 px-1 text-center text-[10px] font-bold tabular-nums leading-[16px] text-white">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </span>
    );
}
