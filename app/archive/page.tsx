import ArchiveClient from '@/components/archive/ArchiveClient';

export const metadata = {
    title: 'The Archive | Sanctum Communications',
    description: 'Real-time encrypted communication node for the Bos operating system.',
};

export default function ArchivePage() {
    return (
        <main className="h-[100dvh] w-full bg-zinc-950 text-zinc-300 overflow-hidden flex flex-col font-sans">
            <ArchiveClient />
        </main>
    );
}
