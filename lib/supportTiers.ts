import type { LucideIcon } from 'lucide-react';
import { Eye, Music, ScrollText, Star, ShieldCheck, Sparkles } from 'lucide-react';

export interface SupportTier {
    amount: number;
    tier: string;
    title: string;
    icon: LucideIcon;
    best?: boolean;
    tagline: string;
    rewards: string[];
    delivery: string;
}

export const SUPPORT_TIERS: SupportTier[] = [
    {
        amount: 5,
        tier: '$5',
        title: 'Echo Ticket',
        icon: Eye,
        tagline: 'Get on the record.',
        rewards: [
            'Personal thank-you from Ant Cee',
            'Your name on the public Supporter Roll on TruthBTold.com',
            'Early email when production resumes at $5k',
        ],
        delivery: 'Send via Cash App or Stripe — DM @truufbtold with your preferred display name.',
    },
    {
        amount: 10,
        tier: '$10',
        title: 'Frequency Bundle',
        icon: Music,
        best: true,
        tagline: 'The full 400 soundtrack.',
        rewards: [
            'Everything in Echo Ticket',
            'Full 400 digital album — all six tracks in /audio/',
            'Supporter status on your hub profile (is_supporter + 400 Soul Power)',
            'Type "400" in the Stripe Support Code so we can match your gift',
        ],
        delivery: 'Stripe: enter code "400". Cash App: note your hub email or @truufbtold handle.',
    },
    {
        amount: 25,
        tier: '$25',
        title: 'Chronicle Pass',
        icon: ScrollText,
        tagline: 'Behind the lens.',
        rewards: [
            'Everything in Frequency Bundle',
            'Digital BTS pack: cineworks posters, storyboard stills, and production notes',
            'Early access to preview drops before public YouTube release',
        ],
        delivery: 'We email a download link within 48 hours of confirmed payment.',
    },
    {
        amount: 50,
        tier: '$50',
        title: 'Oracle Status',
        icon: Star,
        tagline: 'Visible in the sanctum.',
        rewards: [
            'Everything in Chronicle Pass',
            'Supporter badge and gold aura on your hub profile',
            'Name in site credits under "Vision Supporters"',
            'Priority response on @truufbtold DMs',
        ],
        delivery: 'Profile perks applied manually within 72 hours — include your hub username.',
    },
    {
        amount: 100,
        tier: '$100',
        title: 'Founding Architect',
        icon: ShieldCheck,
        tagline: 'Built into the foundation.',
        rewards: [
            'Everything in Oracle Status',
            'Permanent spot on the Founding Wall on the hub',
            'First-wave access when the $5k production rollout goes live',
            'Invited to a live Q&A / rollout briefing with Ant Cee',
        ],
        delivery: 'Founding Wall goes up at $5k milestone — you are locked in now.',
    },
    {
        amount: 400,
        tier: '$400',
        title: 'Prophetic Ancestor',
        icon: Sparkles,
        tagline: 'Executive tier.',
        rewards: [
            'Everything in Founding Architect',
            'Executive Producer credit on 400 Series episodes',
            'Featured supporter slot on the hub homepage',
            'Custom video shout-out from Ant Cee',
        ],
        delivery: 'EP credit rolls on the next episode after the $5k production resume.',
    },
];