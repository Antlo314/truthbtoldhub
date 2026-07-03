import Link from 'next/link';
import DonationSection from '@/components/DonationSection';

export const metadata = {
    title: 'Fuel the Vision | Truth B Told Hub',
    description: 'Patronage keeps the forge lit — the 400 Series, the Sanctum, and the ground the chamber stands on.',
};

export default function SupportPage() {
    return (
        <main className="min-h-screen bg-[#06080e] text-white">
            <div className="mx-auto max-w-2xl px-5 py-10">
                <Link
                    href="/world"
                    className="text-[10px] uppercase tracking-[0.3em] text-aether-gold hover:text-white transition-colors"
                >
                    ← Enter the Hut
                </Link>
                <h1 className="mt-6 font-ritual text-3xl text-aether-gold">The Offering</h1>
                <p className="mt-2 mb-8 max-w-lg text-sm text-white/60">
                    Every offering, one-time or monthly, is fuel — for the 400 Series, the Sanctum, and the
                    ground this chamber stands on.
                </p>
                <DonationSection variant="page" showFundingBar />
            </div>
        </main>
    );
}
