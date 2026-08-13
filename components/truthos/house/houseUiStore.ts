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
    seated: boolean;
    paused: boolean;
    recenterToken: number;
    faceHomeToken: number;
    lookInvert: boolean;
    lookSens: number;
    /** Which plaster face The Mark panel should open on */
    wallFace: 'w' | 's' | 'n' | null;
    cinemaFilmId: string | null;
    cinemaPlaying: boolean;
    openPanel: (id: HousePanelId) => void;
    closePanel: () => void;
    setWalkthrough: (open: boolean, step?: number) => void;
    nextWalkthrough: () => void;
    setSoonMessage: (msg: string | null) => void;
    toggleSeated: () => void;
    setSeated: (v: boolean) => void;
    setPaused: (v: boolean) => void;
    requestRecenter: () => void;
    requestFaceHome: () => void;
    setLookFeel: (p: { invert?: boolean; sens?: number }) => void;
    setWallFace: (f: 'w' | 's' | 'n' | null) => void;
    playCinemaFilm: (id: string) => void;
    setCinemaPlaying: (playing: boolean) => void;
    stopCinema: () => void;
};

const WALKTHROUGH_KEY = 'tbth-house-walkthrough-v12';

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
    seated: false,
    paused: false,
    recenterToken: 0,
    faceHomeToken: 0,
    lookInvert: false,
    lookSens: 1,
    wallFace: null,
    cinemaFilmId: null,
    cinemaPlaying: false,

    openPanel: (id) => set({ panel: id, paused: false }),
    closePanel: () => set({ panel: null }),
    setSoonMessage: (msg) => set({ soonMessage: msg }),
    toggleSeated: () => set((s) => ({ seated: !s.seated })),
    setSeated: (v) => set({ seated: v }),
    setPaused: (v) => set({ paused: v }),
    requestRecenter: () => set((s) => ({ recenterToken: s.recenterToken + 1, paused: false, seated: false })),
    requestFaceHome: () => set((s) => ({ faceHomeToken: s.faceHomeToken + 1, paused: false })),
    setLookFeel: (p) =>
        set((s) => ({
            lookInvert: p.invert ?? s.lookInvert,
            lookSens: p.sens ?? s.lookSens,
        })),
    setWallFace: (f) => set({ wallFace: f }),

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
        title: 'You’re here',
        body: 'You wake at the rec-room desk. One floor. Gold rings open things. The front door is just a door — walk through it.',
        tip: 'Continue, then the house will wait on you',
        wait: 'tap' as const,
    },
    {
        title: 'Look',
        body: 'Desktop: click the scene, then move the mouse. Phone: drag the right pad.',
        tip: 'Look left or right',
        wait: 'look' as const,
    },
    {
        title: 'Walk',
        body: 'WASD or arrows. Shift runs. Phone: left stick.',
        tip: 'Take a few steps',
        wait: 'move' as const,
    },
    {
        title: 'Use',
        body: 'Walk into a gold ring. Press E, or tap Use. The paper, the arcade, The Mark, the library and the ledger all answer.',
        tip: 'Open anything that glows',
        wait: 'use' as const,
    },
    {
        title: 'The door',
        body: 'The front opening is not a menu. Walk out. Four paths leave the clearing.',
        tip: 'Step outside',
        wait: 'out' as const,
    },
    {
        title: 'You’re home',
        body: 'Live souls share this floor. Esc or Pause opens Map and Tour. Enter speaks to the room.',
        tip: 'Esc or Pause · Map and Tour',
        wait: 'tap' as const,
    },
] as const;
