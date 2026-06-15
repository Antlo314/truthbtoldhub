import { supabase } from '@/lib/supabase';

// ============================================================
//  FOUNDING SEALS — the first 12 / 40 / 144 souls.
//  A permanent `founder_number` on the profile (signup order)
//  maps to a tier. Tiers grant bonus skill points now and are
//  the key to season-two powerups & deeper gameplay.
// ============================================================

export type FounderTierId = 'twelve' | 'forty' | 'one44';

export interface FounderTier {
    id: FounderTierId;
    name: string;
    subtitle: string;
    max: number;             // highest founder_number in this tier
    bonusSkillPoints: number;
    color: string;
    ring: string;            // gradient for the seal
    blurb: string;
    perk: string;            // reserved season-two reward
}

// Ordered best -> broadest. The first matching tier (n <= max) wins.
export const FOUNDER_TIERS: FounderTier[] = [
    {
        id: 'twelve',
        name: 'The Twelve',
        subtitle: 'Cornerstone',
        max: 12,
        bonusSkillPoints: 3,
        color: '#fbbf24',
        ring: 'linear-gradient(135deg,#fff7d6 0%,#fbbf24 45%,#b45309 100%)',
        blurb: 'Among the first twelve to awaken — the cornerstone of the movement.',
        perk: 'Season II: a reserved super-perk slot + the Cornerstone relic.',
    },
    {
        id: 'forty',
        name: 'The Forty',
        subtitle: 'Wilderness Elect',
        max: 40,
        bonusSkillPoints: 2,
        color: '#a855f7',
        ring: 'linear-gradient(135deg,#e9d5ff 0%,#a855f7 45%,#6b21a8 100%)',
        blurb: 'Tested in the wilderness — among the first forty.',
        perk: 'Season II: an exclusive Wilderness skill branch.',
    },
    {
        id: 'one44',
        name: 'The 144',
        subtitle: 'Sealed Remnant',
        max: 144,
        bonusSkillPoints: 1,
        color: '#22d3ee',
        ring: 'linear-gradient(135deg,#cffafe 0%,#22d3ee 45%,#0e7490 100%)',
        blurb: 'Sealed among the first 144 to walk the path.',
        perk: 'Season II: the Sealed aura + early access to new caverns.',
    },
];

export const FOUNDER_CAP = 144;

export function founderTierFor(n: number | null | undefined): FounderTier | null {
    if (!n || n < 1) return null;
    for (const t of FOUNDER_TIERS) if (n <= t.max) return t;
    return null;
}

export async function getFounderStatus(): Promise<{ founderNumber: number | null; tier: FounderTier | null }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { founderNumber: null, tier: null };
        const { data } = await supabase.from('profiles').select('founder_number').eq('id', session.user.id).maybeSingle();
        const n = (data as { founder_number?: number } | null)?.founder_number ?? null;
        return { founderNumber: n, tier: founderTierFor(n) };
    } catch {
        return { founderNumber: null, tier: null };
    }
}

export async function countFounders(): Promise<number> {
    try {
        const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        return count ?? 0;
    } catch {
        return 0;
    }
}
