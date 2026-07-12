import Link from 'next/link';
import DonationSection from '@/components/DonationSection';

export const metadata = {
    title: 'The Offering | Truth B Told Hub',
    description: 'Lay a stone for the awakening — the 400 Series, the Sanctum, and the ground the chamber stands on.',
};

export default function SupportPage() {
    return (
        <main className="relative min-h-[100dvh] bg-black text-white overflow-x-hidden">
            <div
                className="pointer-events-none fixed inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(251,191,36,0.12), transparent 55%)',
                }}
            />
            <div
                className="relative z-10 mx-auto max-w-2xl px-5 pb-24"
                style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top))' }}
            >
                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <Link
                        href="/world"
                        className="text-[10px] uppercase tracking-[0.3em] text-aether-gold/80 hover:text-aether-gold transition-colors"
                    >
                        ← Enter the Hut
                    </Link>
                    <span className="text-white/15">·</span>
                    <Link
                        href="/"
                        className="text-[10px] uppercase tracking-[0.3em] text-white/35 hover:text-white/60 transition-colors"
                    >
                        Sanctum
                    </Link>
                </div>

                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.5em] text-aether-gold/70 mb-3">
                    Sustain the work
                </p>
                <div
                    className="h-px w-16 mb-5 rule-draw"
                    style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.7), transparent)' }}
                />
                <h1 className="font-ritual text-3xl sm:text-4xl font-black uppercase tracking-tight gold-shimmer leading-tight">
                    The Offering
                </h1>
                <p className="mt-3 mb-10 max-w-lg text-sm text-white/50 leading-relaxed">
                    Every gift — one-time or monthly — is fuel for the 400 Series, the living Sanctum,
                    and the ground this chamber stands on. You are not checking out. You are laying a stone.
                </p>

                <div className="rounded-3xl border border-aether-gold/15 bg-white/[0.02] p-5 sm:p-7 backdrop-blur-sm">
                    <DonationSection variant="page" showFundingBar />
                </div>
            </div>
        </main>
    );
}
