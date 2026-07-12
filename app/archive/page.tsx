import ArchiveClient from '@/components/archive/ArchiveClient';

export const metadata = {
    title: 'The Hall | Truth B Told Hub',
    description: 'Gather with fellow souls — chambers of live conversation, whispers, and the Architects who guide them.',
};

export default function ArchivePage() {
    return (
        <main className="h-[100dvh] w-full bg-void text-zinc-300 overflow-hidden flex flex-col font-sans">
            <ArchiveClient />
        </main>
    );
}
