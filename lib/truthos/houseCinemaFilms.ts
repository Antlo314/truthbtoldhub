/**
 * House Cinema reel — local MP4s under public/assets/cutscenes (+ brand loops).
 * The wall screen + Cinema panel share this catalog.
 *
 * Scenery only: the combat trials, the Eden road (winged figures) and the
 * Source return (a silhouette) were taken out with every other image of
 * people on the site (2026-10-12).
 */

export type HouseFilm = {
    id: string;
    title: string;
    blurb: string;
    /** Public path from site root */
    src: string;
    poster?: string;
};

const CUT = '/assets/cutscenes';

export const HOUSE_FILMS: HouseFilm[] = [
    {
        id: 'title',
        title: 'Title · Cinema',
        blurb: 'Opening transmission',
        src: `${CUT}/title-cinema.mp4`,
        poster: `${CUT}/cutscene-world-crossroads.jpg`,
    },
    {
        id: 'awakening',
        title: 'Awakening',
        blurb: 'The first light',
        src: `${CUT}/awakening-cinema.mp4`,
    },
    {
        id: 'paths',
        title: 'Paths',
        blurb: 'Crossroads of the soul',
        src: `${CUT}/paths-cinema.mp4`,
    },
    {
        id: 'forging',
        title: 'Forging',
        blurb: 'The self under fire',
        src: `${CUT}/forging-cinema.mp4`,
    },
    {
        id: 'world-crossroads',
        title: 'World Crossroads',
        blurb: 'Where the roads meet',
        src: `${CUT}/world-crossroads.mp4`,
        poster: `${CUT}/cutscene-world-crossroads.jpg`,
    },
    {
        id: 'dest-giza',
        title: 'Destination · Giza',
        blurb: 'Stone and sky',
        src: `${CUT}/dest-giza.mp4`,
        poster: `${CUT}/dest-giza.jpg`,
    },
    {
        id: 'dest-emerald',
        title: 'Destination · Emerald',
        blurb: 'Tablet road',
        src: `${CUT}/dest-emerald.mp4`,
        poster: `${CUT}/dest-emerald.jpg`,
    },
    {
        id: 'dest-kolbrin',
        title: 'Destination · Kolbrin',
        blurb: 'Sealed pages',
        src: `${CUT}/dest-kolbrin.mp4`,
        poster: `${CUT}/dest-kolbrin.jpg`,
    },
    {
        id: 'dest-fair',
        title: 'Destination · Fair',
        blurb: 'The fair ground',
        src: `${CUT}/dest-fair.mp4`,
        poster: `${CUT}/dest-fair.jpg`,
    },
    {
        id: 'loop-hut',
        title: 'Loop · Hut',
        blurb: 'Sanctuary ambient',
        src: '/brand/loop-hut.mp4',
        poster: '/brand/hut-interior-cinematic.jpg',
    },
    {
        id: 'loop-portal',
        title: 'Loop · Portal',
        blurb: 'Portal ambient',
        src: '/brand/loop-portal.mp4',
        poster: '/brand/bg-portal.jpg',
    },
];

export function getHouseFilm(id: string | null | undefined): HouseFilm | null {
    if (!id) return null;
    return HOUSE_FILMS.find((f) => f.id === id) ?? null;
}
