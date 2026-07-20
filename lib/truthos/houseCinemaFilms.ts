/**
 * House Cinema reel — local MP4s under public/assets/cutscenes (+ brand loops).
 * The wall screen + Cinema panel share this catalog.
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
        id: 'source-return',
        title: 'Source Return',
        blurb: 'Return to the root',
        src: `${CUT}/source-return.mp4`,
        poster: `${CUT}/cutscene-source-return.jpg`,
    },
    {
        id: 'dest-eden',
        title: 'Destination · Eden',
        blurb: 'Garden road',
        src: `${CUT}/dest-eden.mp4`,
        poster: `${CUT}/dest-eden.jpg`,
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
        id: 'combat-eden',
        title: 'Combat · Eden',
        blurb: 'Trial in the garden',
        src: `${CUT}/combat-eden.mp4`,
        poster: `${CUT}/combat-eden.jpg`,
    },
    {
        id: 'combat-giza',
        title: 'Combat · Giza',
        blurb: 'Trial at the stones',
        src: `${CUT}/combat-giza.mp4`,
        poster: `${CUT}/combat-giza.jpg`,
    },
    {
        id: 'combat-emerald',
        title: 'Combat · Emerald',
        blurb: 'Trial of the tablet',
        src: `${CUT}/combat-emerald.mp4`,
        poster: `${CUT}/combat-emerald.jpg`,
    },
    {
        id: 'combat-kolbrin',
        title: 'Combat · Kolbrin',
        blurb: 'Trial of the page',
        src: `${CUT}/combat-kolbrin.mp4`,
        poster: `${CUT}/combat-kolbrin.jpg`,
    },
    {
        id: 'combat-fair',
        title: 'Combat · Fair',
        blurb: 'Trial at the fair',
        src: `${CUT}/combat-fair.mp4`,
        poster: `${CUT}/combat-fair.jpg`,
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
