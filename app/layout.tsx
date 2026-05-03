import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
    title: {
        template: '%s | Truth B Told Hub',
        default: 'Truth B Told Hub | The Sovereign Ledger',
    },
    description: 'Enter the Truth B Told Hub. An elegant repository of prophetic breakdowns, geopolitical radar tracking, and celestial truth. Unlearn everything.',
    openGraph: {
        title: 'Truth B Told Hub | The Sovereign Ledger',
        description: 'Watch the uncut, unedited prophetic breakdowns and track live geopolitical radar events in an ethereal space.',
        url: 'https://truthbtoldhub.com',
        siteName: 'Truth B Told Hub',
        images: [
            {
                url: 'https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg',
                width: 1200,
                height: 630,
                alt: 'Truth B Told Hub Preview'
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Truth B Told Hub | Aetheric Sanctuary',
        description: 'Explore deep biblical prophecy and end-times geopolitical radar in a premium celestial environment.',
        creator: '@truufbtold',
        images: ['https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg'],
    },
    metadataBase: new URL('https://truthbtoldhub.com'),
    icons: {
        icon: '/favicon.png',
        shortcut: '/favicon.png',
        apple: '/favicon.png',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${playfair.variable} font-sans bg-void text-white min-h-screen antialiased`}>
                <div className="grain-overlay" />
                {children}
            </body>
        </html>
    );
}
