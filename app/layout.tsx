import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
    title: {
        template: '%s | Sacred Sanctum',
        default: 'Sacred Sanctum | The Aetheric Sanctuary',
    },
    description: 'Enter the Aetheric Sanctuary. An elegant repository of prophetic breakdowns, geopolitical radar tracking, and celestial truth. Unlearn everything.',
    openGraph: {
        title: 'Sacred Sanctum | TruthBTold Hub',
        description: 'Watch the uncut, unedited prophetic breakdowns and track live geopolitical radar events in an ethereal space.',
        url: 'https://truthbtoldhub.com',
        siteName: 'Sacred Sanctum',
        images: [
            {
                url: 'https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg',
                width: 1200,
                height: 630,
                alt: 'Sacred Sanctum Preview'
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Sacred Sanctum | Aetheric Sanctuary',
        description: 'Explore deep biblical prophecy and end-times geopolitical radar in a premium celestial environment.',
        creator: '@truufbtold',
        images: ['https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg'],
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
            <body className={`${inter.variable} ${playfair.variable} font-sans bg-void text-white min-h-screen antialiased`}>
                <div className="grain-overlay" />
                {children}
            </body>
        </html>
    );
}
