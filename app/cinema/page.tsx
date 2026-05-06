import { Metadata } from 'next';
import CinemaClient from './components/CinemaClient';

export const metadata: Metadata = {
    title: 'The Cinema | Truth B Told Hub',
    description: 'Exclusive access to the 400 Series and prophetic cinematic transmissions.',
    openGraph: {
        title: 'The Cinema | Truth B Told Hub',
        description: 'Watch the 400 Series Premiere and ultra-rare cinematic artifacts.',
        url: 'https://truthbtoldhub.com/cinema',
        type: 'video.other',
        images: [
            {
                url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=2000',
                width: 1920,
                height: 1080,
                alt: 'The Cinema Premiere',
            },
        ],
    },
};

export default function CinemaPage() {
    return <CinemaClient />;
}
