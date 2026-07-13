'use client';

import { create } from 'zustand';

/** In-house stations — Hut features staged as house rooms */
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

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v2';

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

/**
 * New-member tour — maps classic Hut stations into the house layout.
 */
export const WALKTHROUGH_STEPS = [
    {
        title: 'Welcome to the House',
        body: 'This is Truth.OS House — the Hut, rebuilt as a home you walk. Every station from the old sanctum lives in a room here.',
        tip: 'Continue when you’re ready',
    },
    {
        title: 'How to move',
        body: 'Desktop: WASD or arrows. Mobile: hold the left half of the screen and slide. Drag the right side to look around.',
        tip: 'You’re free to explore anytime',
    },
    {
        title: 'Hut stations = gold rings',
        body: 'Truth (dais), Soul Mirror, Wayfinder, Ledger, and the Sanctum door are the core Hut. Library, Hall, Cinema, and Offering expand the house.',
        tip: 'Walk onto a ring · E or Use',
    },
    {
        title: 'Truth.OS computer',
        body: 'The bedroom monitor boots Truth.OS — apps for every station without leaving this build.',
        tip: 'Green screen in the bedroom',
    },
    {
        title: 'Souls you’ll see',
        body: 'LIVE labels are people here right now. Faint “echo” figures are footprints of souls who visited before — not fake NPCs.',
        tip: 'Truth on the dais is a station, not a multiplayer ghost',
    },
    {
        title: 'You’re home',
        body: 'Explore at your pace. A quiet Hut counter tracks stations you’ve opened. Replay this tour with ? anytime.',
        tip: 'Enter the house',
    },
] as const;
