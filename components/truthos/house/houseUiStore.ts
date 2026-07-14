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
    soonMessage: string | null;
    openPanel: (id: HousePanelId) => void;
    closePanel: () => void;
    setWalkthrough: (open: boolean, step?: number) => void;
    nextWalkthrough: () => void;
    setSoonMessage: (msg: string | null) => void;
};

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v7';

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
        body: 'You are in the foyer. A real hallway connects living, bedroom, library, and the east wing. Take a full walk — the house is bigger now.',
        tip: 'Continue',
    },
    {
        title: 'How to move',
        body: 'Desktop: WASD or arrows · click the scene to look. Mobile: left stick move · right drag look · Use button to interact.',
        tip: 'Try a few steps',
    },
    {
        title: 'The hallway',
        body: 'The runner marks the main corridor. Doorways open to every wing. Gold rings mark what you can open.',
        tip: 'Look for gold rings',
    },
    {
        title: 'Living room',
        body: 'North of the hall — sofa, TV, and a real wall fireplace. Controller on the coffee table opens the Arcade.',
        tip: 'Cyan ring · controller',
    },
    {
        title: 'Bedroom & Truth.OS',
        body: 'South wing — bed, Soul Mirror on the wall, and the green desktop. Only the computer boots Truth.OS.',
        tip: 'Green monitor · bedroom',
    },
    {
        title: 'Wings',
        body: 'West: library shelves on the wall. East: study, cinema, Signal Studio. Northwest arch opens The Hall community.',
        tip: 'Explore freely',
    },
    {
        title: 'You’re home',
        body: 'Only LIVE players share the space. Tour again anytime. Front door leads outside soon.',
        tip: 'Enter the house',
    },
] as const;
