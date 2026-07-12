/**
 * Unsealed "vision portals" — cinematic previews of each destination
 * until full 3D chambers ship. Media from /public/assets/cutscenes.
 */

export type VisionId = 'eden' | 'fair' | 'giza' | 'kolbrin' | 'emerald';

export interface VisionDef {
    id: VisionId;
    name: string;
    guide: string;
    accent: string;
    quote: string;
    body: string;
    video: string;
    poster: string;
    status: 'open' | 'sealed';
}

export const VISIONS: VisionDef[] = [
    {
        id: 'eden',
        name: 'Eden — Before the Fall',
        guide: 'The Gardener',
        accent: '#22c55e',
        quote: 'The garden remembers every hand that tended it.',
        body: 'A first vision of the garden before the fracture. Walk with the Gardener in light; the full 3D chamber is still being laid.',
        video: '/assets/cutscenes/dest-eden.mp4',
        poster: '/assets/cutscenes/dest-eden.jpg',
        status: 'open',
    },
    {
        id: 'fair',
        name: 'St. Louis, 1904',
        guide: 'Mabel Hart',
        accent: '#fbbf24',
        quote: 'The ivory city shines brightest for those who look twice.',
        body: 'The fairgrounds glimmer in memory. Mabel Hart waits at the edge of the ivory city — a vision until the road opens.',
        video: '/assets/cutscenes/dest-fair.mp4',
        poster: '/assets/cutscenes/dest-fair.jpg',
        status: 'open',
    },
    {
        id: 'giza',
        name: 'Giza — The Engine of Stone',
        guide: 'Khaemwaset',
        accent: '#f97316',
        quote: 'Stone holds what parchment forgets.',
        body: 'Pyramids as engines of memory. Khaemwaset opens a crack in the stone — look through, then return to the hut.',
        video: '/assets/cutscenes/dest-giza.mp4',
        poster: '/assets/cutscenes/dest-giza.jpg',
        status: 'open',
    },
    {
        id: 'kolbrin',
        name: 'The Kolbrin Vault',
        guide: 'Elder Scribe',
        accent: '#22d3ee',
        quote: 'What was buried was not destroyed.',
        body: 'Buried pages surface in the vault light. The Elder Scribe holds the thread of what survived the fire.',
        video: '/assets/cutscenes/dest-kolbrin.mp4',
        poster: '/assets/cutscenes/dest-kolbrin.jpg',
        status: 'open',
    },
    {
        id: 'emerald',
        name: 'The Emerald Halls',
        guide: 'Hermes Trismegistus',
        accent: '#7c5cff',
        quote: 'As above, so below — as within, so without.',
        body: 'Halls of green fire and mirrored law. Hermes speaks in fragments until the full road is cut.',
        video: '/assets/cutscenes/dest-emerald.mp4',
        poster: '/assets/cutscenes/dest-emerald.jpg',
        status: 'open',
    },
];

export function visionById(id: string): VisionDef | undefined {
    return VISIONS.find((v) => v.id === id);
}
