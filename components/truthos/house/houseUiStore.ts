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
    | 'forge';

type HouseUiState = {
    panel: HousePanelId | null;
    walkthroughOpen: boolean;
    walkthroughStep: number;
    openPanel: (id: HousePanelId) => void;
    closePanel: () => void;
    setWalkthrough: (open: boolean, step?: number) => void;
    nextWalkthrough: () => void;
};

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v3';

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

    openPanel: (id) => set({ panel: id }),
    closePanel: () => set({ panel: null }),

    setWalkthrough: (open, step = 0) => set({ walkthroughOpen: open, walkthroughStep: step }),

    nextWalkthrough: () => {
        const step = get().walkthroughStep + 1;
        set({ walkthroughStep: step });
    },
}));

export const WALKTHROUGH_STEPS = [
    {
        title: 'Welcome to the House',
        body: 'This is Truth.OS House — a walkable home. Rooms open hub sections. There is no separate Hut.',
        tip: 'Continue when you’re ready',
    },
    {
        title: 'How to move',
        body: 'Desktop: WASD or arrows · click to look. Mobile: left stick · right drag look.',
        tip: 'Explore at your pace',
    },
    {
        title: 'Gold rings',
        body: 'Gold rings mark interactables: library, cinema, hall, offering, mirror, and more.',
        tip: 'Walk onto a ring · E or Use',
    },
    {
        title: 'Truth lives in Truth.OS',
        body: 'All Truth threads, lore, and Ask Truth content open only inside Truth.OS — boot the green computer in the bedroom. Nowhere else.',
        tip: 'Bedroom · glowing monitor',
    },
    {
        title: 'You’re home',
        body: 'Only LIVE players share the space with you. Replay this tour with Tour anytime.',
        tip: 'Enter the house',
    },
] as const;
