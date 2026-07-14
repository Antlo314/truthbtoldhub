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

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v5';

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
        title: 'Welcome home',
        body: 'A staged house — living room, bedroom, library, study, forge. Each object opens one feature. Nothing is repeated.',
        tip: 'Continue when you’re ready',
    },
    {
        title: 'How to move',
        body: 'Desktop: WASD or arrows · click to look. Mobile: left stick · right drag look.',
        tip: 'Explore at your pace',
    },
    {
        title: 'Gold rings',
        body: 'Rings mark interactables: controller (Arcade), mirror (vessel), forge, map, shelves, film screen, hall arch, and more.',
        tip: 'Walk onto a ring · E or Use',
    },
    {
        title: 'Arcade',
        body: 'Sofa faces the living-room TV. Pick up the controller on the coffee table to open the Arcade — PC uses keys, phone uses tap.',
        tip: 'Controller · cyan ring',
    },
    {
        title: 'Truth.OS computer',
        body: 'Sensitive data, updates, and Truth.sys live only on the bedroom desk computer. Sign in to boot the OS.',
        tip: 'Bedroom · green monitor',
    },
    {
        title: 'You’re home',
        body: 'Only LIVE players share the space. Replay this tour anytime from Tour.',
        tip: 'Enter the house',
    },
] as const;
