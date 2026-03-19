import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import './globals.css';
import Oracle from '@/components/Oracle';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '700', '900'] });

export const metadata: Metadata = {
    title: {
        template: '%s | TruthBTold Hub',
        default: 'TruthBTold Hub | Prophetic Breakdowns & Geopolitical Radar',
    },
    description: 'Explore deep biblical prophecy, end-times geopolitical radar, and unfiltered truth. Dive into the Valley of Decision with TruthBTold.',
    openGraph: {
        title: 'TruthBTold Hub',
        description: 'Watch the uncut, unedited prophetic breakdowns and track live geopolitical radar events.',
        url: 'https://truthbtoldhub.com',
        siteName: 'TruthBTold Hub',
        images: [
            {
                url: 'https://truthbtoldhub.com/api/og', // This is a standard Next.js OG Image route convention if we add one later, or it will fallback gracefully.
                width: 1200,
                height: 630,
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'TruthBTold Hub | Uncut Prophecy',
        description: 'Explore deep biblical prophecy, end-times geopolitical radar, and unfiltered truth.',
        creator: '@truufbtold', // Assumed from YouTube handle
    },
    metadataBase: new URL('https://truthbtoldhub.com'),
};
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${cinzel.variable} font-sans bg-[#050505] text-white min-h-screen antialiased`}>
                {children}
                <Oracle />
            </body>
        </html>
    );
}
