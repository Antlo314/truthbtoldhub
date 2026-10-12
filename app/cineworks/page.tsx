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
                url: 'https://truthbtoldhub.com/images/aether_bg.png',
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
        images: ['https://truthbtoldhub.com/images/aether_bg.png'],
    },
};

export default function CineworksPage() {
    return (
        <>
            <CineworksClient />
        </>
    );
}
