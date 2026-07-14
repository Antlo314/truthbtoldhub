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
    | 'arcade';

type HouseUiState = {
    panel: HousePanelId | null;
    walkthroughOpen: boolean;
    walkthroughStep: number;
    /** Transient toast for front door / soon stations */
    soonMessage: string | null;
    openPanel: (id: HousePanelId) => void;
    closePanel: () => void;
    setWalkthrough: (open: boolean, step?: number) => void;
    nextWalkthrough: () => void;
    setSoonMessage: (msg: string | null) => void;
};

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v6';

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

    openPanel: (id) => set({ panel: id }),
    closePanel: () => set({ panel: null }),
    setSoonMessage: (msg) => set({ soonMessage: msg }),

    setWalkthrough: (open, step = 0) => set({ walkthroughOpen: open, walkthroughStep: step }),

    nextWalkthrough: () => {
        const step = get().walkthroughStep + 1;
        set({ walkthroughStep: step });
    },
}));

export const WALKTHROUGH_STEPS = [
    {
        title: 'Welcome home',
        body: 'A staged modern house — living room, bedroom, library, study, studio. Each object opens one feature.',
        tip: 'Continue when you’re ready',
    },
    {
        title: 'How to move',
        body: 'Desktop: WASD or arrows · click to look. Mobile: left stick · right drag look.',
        tip: 'Explore at your pace',
    },
    {
        title: 'Gold rings',
        body: 'Rings mark what you can use: controller, mirror, studio, map, shelves, film screen, hall, front door, and more.',
        tip: 'Walk onto a ring · E or Use',
    },
    {
        title: 'Living room',
        body: 'Sofa faces the wall TV from across the room. Controller on the coffee table opens Arcade.',
        tip: 'Cyan ring on the table',
    },
    {
        title: 'Soul Mirror & Studio',
        body: 'Wall mirror shapes your vessel. SE Studio is the brand pulse — modern tools, not fantasy forge.',
        tip: 'Bedroom mirror · Studio desk',
    },
    {
        title: 'You’re home',
        body: 'Only LIVE players share the space. The front door opens to outside soon.',
        tip: 'Enter the house',
    },
] as const;
