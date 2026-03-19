import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '700', '900'] });

export const metadata: Metadata = {
    title: {
        template: '%s | Sacred Sanctum',
        default: 'Sacred Sanctum | TruthBTold Hub',
    },
    description: 'Enter the Obsidian Void. Watch uncensored prophetic breakdowns, track live geopolitical radar events, and unlearn everything. The truth shall make you free.',
    openGraph: {
        title: 'Sacred Sanctum | TruthBTold Hub',
        description: 'Watch the uncut, unedited prophetic breakdowns and track live geopolitical radar events before the world shakes.',
        url: 'https://truthbtoldhub.com',
        siteName: 'Sacred Sanctum',
        images: [
            {
                url: 'https://img.youtube.com/vi/msKxh1gInMU/maxresdefault.jpg', // Epic 14 video thumbnail as the default share image!
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
        title: 'Sacred Sanctum | The Obsidian Void',
        description: 'Explore deep biblical prophecy, end-times geopolitical radar, and unfiltered truth.',
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
            <body className={`${inter.variable} ${cinzel.variable} font-sans bg-[#050505] text-white min-h-screen antialiased`}>
                {children}
            </body>
        </html>
    );
}
