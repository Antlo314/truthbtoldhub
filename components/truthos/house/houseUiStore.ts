'use client';

import { create } from 'zustand';

/** In-house stations / overlays — never leave the house build */
export type HousePanelId =
    | 'truth'
    | 'soul'
    | 'wayfinder'
    | 'ledger'
    | 'chamber'
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

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v1';

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
        body: 'This is Truth.OS House — one continuous build. Every room maps to a feature of the sanctum. Nothing here leaves for an old runtime.',
        tip: 'Tap Continue when ready',
    },
    {
        title: 'Move',
        body: 'Desktop: WASD or arrow keys. Mobile: use the left joystick.',
        tip: 'Walk toward the gold rings on the floor',
    },
    {
        title: 'Look around',
        body: 'Desktop: click-drag the view. Mobile: drag anywhere on the world (not on the pads).',
        tip: 'Find the glowing monitor in the bedroom',
    },
    {
        title: 'Jump',
        body: 'Desktop: Space. Mobile: the Jump button on the right.',
        tip: 'Hop once — just for the joy of it',
    },
    {
        title: 'Interact',
        body: 'Gold rings mark stations. Desktop: press E. Mobile: tap Interact when near. Computer boots Truth.OS; other stations open in-house panels (Truth, Library, Chamber…).',
        tip: 'Try the computer or the envelope on the table',
    },
    {
        title: 'You are free',
        body: 'Explore the house. Multiplayer souls appear as glowing vessels. Truth stays a small guide — never the whole system.',
        tip: 'Replay this tour anytime from the ? button',
    },
] as const;
