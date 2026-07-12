import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import SanctumShell from '@/components/sanctum/SanctumShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
    title: {
        template: '%s | Truth B Told Hub',
        default: 'Truth B Told Hub | Return to the Source',
    },
    description: 'An aetheric awakening RPG. Walk with Truth, choose your path, and return to the Source inside the Truth B Told Hub.',
    applicationName: 'Sacred Sanctum',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Sacred Sanctum',
    },
    openGraph: {
        title: 'Truth B Told Hub | Return to the Source',
        description: 'Awaken. Walk with Truth. Cross the threshold into an aetheric RPG of prophecy, presence, and return.',
        url: 'https://truthbtoldhub.com',
        siteName: 'Truth B Told Hub',
        images: [
            {
                url: '/brand/keyart-return-source.jpg',
                width: 1200,
                height: 630,
                alt: 'Return to the Source'
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Truth B Told Hub | Return to the Source',
        description: 'An aetheric awakening experience — prophetic cinema, living community, and the journey home.',
        creator: '@truufbtold',
        images: ['/brand/keyart-return-source.jpg'],
    },
    metadataBase: new URL('https://truthbtoldhub.com'),
    icons: {
        icon: '/favicon.png',
        shortcut: '/favicon.png',
        apple: '/favicon.png',
    },
    other: {
        'theme-color': '#0a0805',
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
                <SanctumShell>{children}</SanctumShell>
            </body>
        </html>
    );
}
