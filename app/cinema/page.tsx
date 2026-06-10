import { Metadata } from 'next';
import CinemaClient from './components/CinemaClient';

export const metadata: Metadata = {
    title: 'The Cinema | Truth B Told Hub',
    description: 'The 400 Series is on pause until fiscally solid. Preview transmissions and support the Truth B Told vision.',
    openGraph: {
        title: 'The Cinema | Truth B Told Hub',
        description: 'The 400 Series is on pause. Preview transmissions and support @truufbtold.',
        url: 'https://truthbtoldhub.com/cinema',
        type: 'video.other',
        images: [
            {
                url: 'https://truthbtoldhub.com/viralcartel/400_manga_logo.jpg',
                width: 1200,
                height: 630,
                alt: 'The 400 Series — On Pause',
            },
        ],
    },
};

export default function CinemaPage() {
    return <CinemaClient />;
}
