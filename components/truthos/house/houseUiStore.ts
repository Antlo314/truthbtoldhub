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
    | 'forge'
    | 'arcade';

type HouseUiState = {
    panel: HousePanelId | null;
    walkthroughOpen: boolean;
    walkthroughStep: number;
    openPanel: (id: HousePanelId) => void;
    closePanel: () => void;
    setWalkthrough: (open: boolean, step?: number) => void;
    nextWalkthrough: () => void;
};

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v4';

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
        body: 'Truth.OS House is a walkable home. Each room object opens one feature — nothing is repeated.',
        tip: 'Continue when you’re ready',
    },
    {
        title: 'How to move',
        body: 'Desktop: WASD or arrows · click to look. Mobile: left stick · right drag look.',
        tip: 'Explore at your pace',
    },
    {
        title: 'Gold rings',
        body: 'Gold rings mark objects: controller (Arcade), mirror (vessel), forge bench, map, shelves, film screen, hall arch, and more.',
        tip: 'Walk onto a ring · E or Use',
    },
    {
        title: 'Arcade',
        body: 'Living room wall TV and console are for show — pick up the controller on the coffee table to open the Arcade.',
        tip: 'Controller · cyan ring',
    },
    {
        title: 'Truth.OS computer',
        body: 'Sensitive data, updates, and Truth.sys live only on the bedroom computer. Sign in at the desk to boot the OS.',
        tip: 'Bedroom · green monitor',
    },
    {
        title: 'You’re home',
        body: 'Only LIVE players share the space. Replay this tour anytime from Tour.',
        tip: 'Enter the house',
    },
] as const;
