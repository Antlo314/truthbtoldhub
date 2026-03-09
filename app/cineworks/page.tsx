import { Metadata } from 'next';
import CineworksClient from './components/CineworksClient';

export const metadata: Metadata = {
    title: 'Cineworks Archive',
    description: 'Watch the uncut, unedited prophetic breakdowns. Currently Featuring: Who are the Sabeans? (Joel 3).',
    openGraph: {
        title: 'Cineworks Archive | TruthBTold Hub',
        description: 'Watch the uncut, unedited prophetic breakdowns. Currently Featuring: Who are the Sabeans? (Joel 3) and geopolitical radar tracking.',
        url: 'https://truthbtoldhub.com/cineworks',
        type: 'video.other',
        images: [
            {
                url: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.png', // Fallback until OG is made, uses the Joel 3 poster
                width: 1920,
                height: 1080,
                alt: 'Cineworks Archive Premiere - Joel 3',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Cineworks Archive | TruthBTold Hub',
        description: 'Watch the uncut, unedited prophetic breakdowns. Currently Featuring: Who are the Sabeans? (Joel 3).',
        images: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.png'],
    },
};

export default function CineworksPage() {
    return (
        <>
            <CineworksClient />
        </>
    );
}
