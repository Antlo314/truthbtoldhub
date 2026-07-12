import ArchiveClient from '@/components/archive/ArchiveClient';

export const metadata = {
    title: 'The Hall | Truth B Told Hub',
    description: 'Gather with fellow souls — chambers of live conversation, whispers, and the Architects who guide them.',
};

export default function ArchivePage() {
    return (
        <main className="relative h-[100dvh] w-full bg-void text-zinc-300 overflow-hidden flex flex-col font-sans">
            {/* Ambient temple wash behind the Hall chrome */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.12] z-0"
                style={{
                    backgroundImage: 'url(/brand/bg-hall.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'saturate(0.7) brightness(0.45)',
                }}
                aria-hidden
            />
            <div className="relative z-10 flex-1 min-h-0 flex flex-col">
                <ArchiveClient />
            </div>
        </main>
    );
}
