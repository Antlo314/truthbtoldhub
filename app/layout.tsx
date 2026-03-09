import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import './globals.css';
import Oracle from '@/components/Oracle';
import GeopoliticalTicker from '@/components/GeopoliticalTicker';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '700', '900'] });

export const metadata: Metadata = {
    title: 'Sacred Sanctum',
    description: 'The Obsidian Void Theme - Sacred Sanctum',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${cinzel.variable} font-sans bg-[#050505] text-white min-h-screen antialiased`}>
                <GeopoliticalTicker />
                {children}
                <Oracle />
            </body>
        </html>
    );
}
