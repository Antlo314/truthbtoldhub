import type { LucideIcon } from 'lucide-react';
import { Flame, Radio, ScrollText, Crown, Sparkles, Heart, Music, Star, ShieldCheck, Gem } from 'lucide-react';

// ============================================================
//  DONATION TIERS — recurring patronage + one-time gifts.
//  Each tier lists in-game (Sacred Sanctum / hub) and
//  out-of-game (400 Series, community) rewards.
//  Fulfillment: Stripe webhook or manual match via code "400".
// ============================================================

export type DonationKind = 'recurring' | 'one_time';

export interface DonationGrants {
    /** One-time Soul Power credit on hub profile */
    soulPower?: number;
    /** Monthly Soul Power while subscription is active */
    soulPowerMonthly?: number;
    isSupporter?: boolean;
    skillPoints?: number;
    clothingId?: string;
    customTitle?: string;
    auraColor?: string;
    supporterDays?: number;
}

export interface DonationTier {
    id: string;
    kind: DonationKind;
    amount: number;
    interval?: 'month';
    priceLabel: string;
    title: string;
    tagline: string;
    description: string;
    icon: LucideIcon;
    best?: boolean;
    inGame: string[];
    outOfGame: string[];
    delivery: string;
    grants: DonationGrants;
}

export const STRIPE_SUPPORT_CODE = '400';

export const RECURRING_TIERS: DonationTier[] = [
    {
        id: 'rec_ember',
        kind: 'recurring',
        amount: 3,
        interval: 'month',
        priceLabel: '$3/mo',
        title: 'Ember Keeper',
        tagline: 'Keep the flame alive.',
        description: 'Steady monthly fuel for hosting, the hub, and the chamber while we build the next age of quests.',
        icon: Flame,
        inGame: [
            '50 Soul Power credited each month on your hub profile',
            'Ember aura tint on profile and overworld presence',
            'Supporter acknowledgment in Truth\'s Hut dispatches',
        ],
        outOfGame: [
            'Name on the private Supporter Roll (updated quarterly)',
            'Early email when production milestones are hit',
            'Personal thank-you in the monthly patron rollup',
        ],
        delivery: 'Soul Power and profile perks applied within 72 hours — include hub username or the email on your Stripe receipt.',
        grants: { soulPowerMonthly: 50, auraColor: '#f97316' },
    },
    {
        id: 'rec_frequency',
        kind: 'recurring',
        amount: 7,
        interval: 'month',
        priceLabel: '$7/mo',
        title: 'Frequency Member',
        tagline: 'The full 400 soundtrack, every month you ride with us.',
        description: 'The heartbeat tier — music, supporter status, and a garment woven for the chamber.',
        icon: Radio,
        best: true,
        inGame: [
            'Everything in Ember Keeper',
            '150 Soul Power / month',
            'Supporter flag on hub profile (is_supporter)',
            'Frequency Vest wardrobe unlock (+10 vitality, +1 might while worn)',
            '+1 skill point on your first paid month',
        ],
        outOfGame: [
            'Full 400 digital album — all six tracks',
            'Early production-resume alerts before public posts',
            'Type "400" in Stripe so we can match your gift instantly',
        ],
        delivery: 'Album link emailed within 48 hours. In-game rewards applied within 72 hours.',
        grants: {
            soulPowerMonthly: 150,
            isSupporter: true,
            skillPoints: 1,
            clothingId: 'supporter_frequency',
            auraColor: '#22d3ee',
        },
    },
    {
        id: 'rec_chronicle',
        kind: 'recurring',
        amount: 15,
        interval: 'month',
        priceLabel: '$15/mo',
        title: 'Chronicle Circle',
        tagline: 'Behind the lens.',
        description: 'For souls who want the work-in-progress — previews, BTS, and a chronicle cloak in the world.',
        icon: ScrollText,
        inGame: [
            'Everything in Frequency Member',
            '350 Soul Power / month',
            'Chronicle Cloak unlock (+15 vitality, +2 might)',
            'Gold quest-trail motes on the overworld (cosmetic)',
            'Early Hut bulletin when new world content ships',
        ],
        outOfGame: [
            'Digital BTS pack: cineworks posters, storyboard stills, production notes',
            'Preview drops 48 hours before public YouTube release',
            'Gold supporter badge on hub profile',
        ],
        delivery: 'BTS pack on first payment; monthly perks renewed while subscribed.',
        grants: {
            soulPowerMonthly: 350,
            isSupporter: true,
            clothingId: 'supporter_chronicle',
            auraColor: '#fbbf24',
        },
    },
    {
        id: 'rec_sanctum',
        kind: 'recurring',
        amount: 25,
        interval: 'month',
        priceLabel: '$25/mo',
        title: 'Sanctum Patron',
        tagline: 'Visible in the sanctum.',
        description: 'A patron of the chamber — named in credits, dressed in oracle weave, heard first.',
        icon: Crown,
        inGame: [
            'Everything in Chronicle Circle',
            '600 Soul Power / month',
            'Oracle Mantle unlock (+22 vitality, +3 might)',
            'Custom profile title: "Sanctum Patron"',
            'Gold aura ring on your soul in the overworld',
            '+2 bonus skill points on each anniversary month',
        ],
        outOfGame: [
            'Name in site credits under Vision Supporters',
            'Priority response on @truufbtold DMs',
            'Invited to patron-only rollout threads',
        ],
        delivery: 'Credits updated monthly. Include hub username on checkout or DM after subscribing.',
        grants: {
            soulPowerMonthly: 600,
            isSupporter: true,
            clothingId: 'supporter_oracle',
            customTitle: 'Sanctum Patron',
            auraColor: '#fcd34d',
        },
    },
    {
        id: 'rec_truth',
        kind: 'recurring',
        amount: 40,
        interval: 'month',
        priceLabel: '$40/mo',
        title: 'Truth Circle',
        tagline: 'Executive patronage.',
        description: 'The inner circle — homepage feature, producer credit, and the prophetic vestment in-game.',
        icon: Sparkles,
        inGame: [
            'Everything in Sanctum Patron',
            '1,000 Soul Power / month',
            'Prophetic Vestment unlock (+30 vitality, +5 might, +1 renewal/s)',
            'Permanent custom title: "Truth Circle"',
            'Reserved Season II super-perk slot (locked in now)',
            'Name etched on the Founding Wall in Truth\'s Hut',
        ],
        outOfGame: [
            'Rotating featured supporter slot on the hub homepage',
            'Executive Producer credit on 400 Series episode descriptions',
            'Live Q&A and rollout briefing invitations',
            'Custom video shout-out from Ant Cee (annual)',
        ],
        delivery: 'EP credit rolls on the next episode after the $5k production resume. Homepage rotation monthly.',
        grants: {
            soulPowerMonthly: 1000,
            isSupporter: true,
            clothingId: 'supporter_prophetic',
            customTitle: 'Truth Circle',
            auraColor: '#fcd34d',
        },
    },
];

export const ONE_TIME_TIERS: DonationTier[] = [
    {
        id: 'once_ember',
        kind: 'one_time',
        amount: 5,
        priceLabel: '$5',
        title: 'Ember Spark',
        tagline: 'A single spark in the dark.',
        description: 'A one-time gift to say you believe in the work — recorded on the roll, felt in the chamber.',
        icon: Heart,
        inGame: [
            '100 Soul Power (one-time)',
            'Ember aura on profile for 30 days',
        ],
        outOfGame: [
            'Personal thank-you from Ant Cee',
            'Name on the public Supporter Roll',
            'Early email when production resumes at $5k',
        ],
        delivery: 'DM @truufbtold with your display name, or use Stripe code "400".',
        grants: { soulPower: 100, auraColor: '#f97316', supporterDays: 30 },
    },
    {
        id: 'once_frequency',
        kind: 'one_time',
        amount: 15,
        priceLabel: '$15',
        title: 'Frequency Gift',
        tagline: 'The soundtrack and a stitch in the world.',
        description: 'One payment — full album, supporter status, and gear for your soul in the sanctum.',
        icon: Music,
        best: true,
        inGame: [
            '400 Soul Power (one-time)',
            'Frequency Vest permanent unlock (+10 vitality, +1 might)',
            '+1 skill point',
            'Supporter flag for 90 days',
        ],
        outOfGame: [
            'Full 400 digital album — all six tracks',
            'Mention in the next Truth\'s Hut dispatch thank-you',
            'Stripe code "400" for instant matching',
        ],
        delivery: 'Album link within 48 hours. In-game unlocks within 72 hours.',
        grants: {
            soulPower: 400,
            isSupporter: true,
            skillPoints: 1,
            clothingId: 'supporter_frequency',
            supporterDays: 90,
        },
    },
    {
        id: 'once_chronicle',
        kind: 'one_time',
        amount: 40,
        priceLabel: '$40',
        title: 'Chronicle Offering',
        tagline: 'Behind-the-scenes in one gift.',
        description: 'BTS archive access, preview lane, and chronicle weave for your avatar\'s journey.',
        icon: ScrollText,
        inGame: [
            '900 Soul Power (one-time)',
            'Chronicle Cloak permanent unlock (+15 vitality, +2 might)',
            'Gold profile badge for 6 months',
        ],
        outOfGame: [
            'Digital BTS pack download',
            '6 months of preview-drop access',
            'Credits listing under Vision Supporters',
        ],
        delivery: 'Download link emailed within 48 hours of confirmed payment.',
        grants: {
            soulPower: 900,
            isSupporter: true,
            clothingId: 'supporter_chronicle',
            supporterDays: 180,
        },
    },
    {
        id: 'once_oracle',
        kind: 'one_time',
        amount: 100,
        priceLabel: '$100',
        title: 'Oracle Seed',
        tagline: 'Planted in the foundation.',
        description: 'A founding gift — wall, mantle, and a seat at the briefing table.',
        icon: Star,
        inGame: [
            '2,500 Soul Power (one-time)',
            'Oracle Mantle permanent unlock (+22 vitality, +3 might)',
            '+2 skill points',
            'Permanent gold aura on hub profile',
        ],
        outOfGame: [
            'Permanent Founding Wall spot on the hub',
            'First-wave access when $5k production rollout goes live',
            'Live Q&A / rollout briefing invitation',
        ],
        delivery: 'Founding Wall goes up at $5k milestone — you are locked in now.',
        grants: {
            soulPower: 2500,
            isSupporter: true,
            skillPoints: 2,
            clothingId: 'supporter_oracle',
            auraColor: '#fcd34d',
        },
    },
    {
        id: 'once_prophetic',
        kind: 'one_time',
        amount: 400,
        priceLabel: '$400',
        title: 'Prophetic Ancestor',
        tagline: 'Executive seed gift.',
        description: 'The largest single offering — producer credit, homepage feature, prophetic vestment.',
        icon: Gem,
        inGame: [
            '10,000 Soul Power (one-time)',
            'Prophetic Vestment permanent unlock (+30 vitality, +5 might, +1 renewal/s)',
            '+5 skill points',
            'Permanent title: "Truth Circle"',
            'Reserved Season II super-perk slot',
        ],
        outOfGame: [
            'Executive Producer credit on 400 Series episodes',
            'Featured supporter slot on hub homepage',
            'Custom video shout-out from Ant Cee',
            'Everything in Oracle Seed',
        ],
        delivery: 'EP credit on next episode after production resume. Video shout-out within 2 weeks.',
        grants: {
            soulPower: 10000,
            isSupporter: true,
            skillPoints: 5,
            clothingId: 'supporter_prophetic',
            customTitle: 'Truth Circle',
            auraColor: '#fcd34d',
        },
    },
];

export const ALL_DONATION_TIERS: DonationTier[] = [...RECURRING_TIERS, ...ONE_TIME_TIERS];

export const DONATION_TIER_BY_ID: Record<string, DonationTier> = Object.fromEntries(
    ALL_DONATION_TIERS.map((t) => [t.id, t]),
);

export function tierById(id: string): DonationTier | undefined {
    return DONATION_TIER_BY_ID[id];
}