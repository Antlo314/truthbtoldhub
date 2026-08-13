'use client';

import { create } from 'zustand';

/** House panels only — Truth is never here; Truth is only in Truth.OS */
export type HousePanelId =
    | 'soul'
    | 'wayfinder'
    | 'ledger'
    | 'library'
    | 'codex'
    | 'cinema'
    | 'hall'
    | 'offering'
    | 'studio'
    | 'arcade'
    | 'news'
    | 'wall'
    | 'cineworks';

type HouseUiState = {
    panel: HousePanelId | null;
    walkthroughOpen: boolean;
    walkthroughStep: number;
    soonMessage: string | null;
    /** House cinema — active film id from HOUSE_FILMS */
    cinemaFilmId: string | null;
    cinemaPlaying: boolean;
    openPanel: (id: HousePanelId) => void;
    closePanel: () => void;
    setWalkthrough: (open: boolean, step?: number) => void;
    nextWalkthrough: () => void;
    setSoonMessage: (msg: string | null) => void;
    playCinemaFilm: (id: string) => void;
    setCinemaPlaying: (playing: boolean) => void;
    stopCinema: () => void;
};

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v9';

export function shouldShowWalkthrough(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return localStorage.getItem(WALKTHROUGH_KEY) !== 'done';
    } catch {
        return true;
    }
}

export function markWalkthroughDone() {
    try {
        localStorage.setItem(WALKTHROUGH_KEY, 'done');
    } catch {
        /* */
    }
}

export const useHouseUi = create<HouseUiState>((set, get) => ({
    panel: null,
    walkthroughOpen: false,
    walkthroughStep: 0,
    soonMessage: null,
    cinemaFilmId: null,
    cinemaPlaying: false,

    openPanel: (id) => set({ panel: id }),
    closePanel: () => set({ panel: null }),
    setSoonMessage: (msg) => set({ soonMessage: msg }),

    setWalkthrough: (open, step = 0) => set({ walkthroughOpen: open, walkthroughStep: step }),

    nextWalkthrough: () => {
        const step = get().walkthroughStep + 1;
        set({ walkthroughStep: step });
    },

    playCinemaFilm: (id) => set({ cinemaFilmId: id, cinemaPlaying: true }),
    setCinemaPlaying: (playing) => set({ cinemaPlaying: playing }),
    stopCinema: () => set({ cinemaPlaying: false, cinemaFilmId: null }),
}));

export const WALKTHROUGH_STEPS = [
    {
        title: 'Welcome home',
        body: 'You wake at the rec-room desk on the main floor. This is a two-storey house drawn from real plans — a full stair connects it to the living floor above.',
        tip: 'Continue',
    },
    {
        title: 'How to move',
        body: 'Desktop: WASD or arrows · click the scene to look · Shift to run · Space to jump. Mobile: left stick move · right drag look · Use button to interact.',
        tip: 'Try a few steps',
    },
    {
        title: 'The main floor',
        body: 'Rec room, The Mark (west, one mark a year), and the garage. The computer at your desk boots Truth.OS; the arcade cabinet and the mail tray open their own rooms.',
        tip: 'Gold rings mark what opens',
    },
    {
        title: 'Upstairs',
        body: 'Take the stair up to kitchen, dining, living and the master wing. The library, the ledger, the codex niche and the wayfinder map all live on that floor.',
        tip: 'Follow the stair',
    },
    {
        title: 'The Mark',
        body: 'Once a year every soul may leave a small painting on the west-room plaster. Your name sits under it. It stays for everyone to see.',
        tip: 'One email, one year',
    },
    {
        title: 'Out into the jungle',
        body: 'Step outside and four paths leave the clearing: the Cinema Grove east (films and Cineworks), the Hall Stones west, the Mirror Pool southeast, the Signal Studio southwest. An offering bowl sits on the front stoop.',
        tip: 'The wayfinder maps them',
    },
    {
        title: 'The world has a clock',
        body: 'A full day passes about every twelve minutes. Lamps warm at dusk and fade by morning, stars come and go, and weather rolls on its own.',
        tip: 'Watch the sky',
    },
    {
        title: 'You’re home',
        body: 'Only LIVE players share the space — you will see them walking, upstairs or down. Tour again anytime from the house menu.',
        tip: 'Enter the house',
    },
] as const;
