'use client';

import { create } from 'zustand';
import type { QualitySetting } from './renderQuality';

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
    /** Camera behind the eyes or behind the body */
    view: 'first' | 'third';
    /** Chosen render quality; `auto` resolves per device */
    quality: QualitySetting;
    /** How many tiers the frame-rate monitor has walked quality down this session */
    qualityDrop: number;
    /** Emote the local body is performing, and when it began (performance.now()) */
    emote: string | null;
    emoteAt: number;
    setView: (v: 'first' | 'third') => void;
    toggleView: () => void;
    setQuality: (q: QualitySetting) => void;
    dropQuality: () => void;
    playEmote: (id: string | null) => void;
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
    view: 'first',
    quality: 'auto',
    qualityDrop: 0,
    emote: null,
    emoteAt: 0,

    setView: (v) => set({ view: v }),
    toggleView: () => set((s) => ({ view: s.view === 'first' ? 'third' : 'first' })),
    // Choosing a tier by hand also forgets any automatic step-down
    setQuality: (q) => set({ quality: q, qualityDrop: 0 }),
    dropQuality: () => set((s) => ({ qualityDrop: Math.min(3, s.qualityDrop + 1) })),
    playEmote: (id) =>
        set({ emote: id, emoteAt: typeof performance !== 'undefined' ? performance.now() : 0 }),

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

// `voice` is the id of the line Truth speaks when the step opens — see
// lib/truthVoice.ts and public/voice/manifest.json. The written body
// stays as the caption; the voice says the fuller thing.
export const WALKTHROUGH_STEPS = [
    {
        title: 'You’re here',
        body: 'You wake at the rec-room desk. One floor. Gold rings open things. The front door is just a door — walk through it.',
        tip: 'Continue, then the house will wait on you',
        wait: 'tap' as const,
        voice: 'welcome',
    },
    {
        title: 'Look',
        body: 'Desktop: click the scene, then move the mouse. Phone: drag the right pad.',
        tip: 'Look left or right',
        wait: 'look' as const,
        voice: 'move_pc', // swapped for move_mobile on touch devices at speak time
    },
    {
        title: 'Walk',
        body: 'WASD or arrows. Shift runs. Phone: left stick.',
        tip: 'Take a few steps',
        wait: 'move' as const,
        voice: null,
    },
    {
        title: 'Use',
        body: 'Walk into a gold ring. Press E, or tap Use. The paper, the arcade, The Mark, the library and the ledger all answer.',
        tip: 'Open anything that glows',
        wait: 'use' as const,
        voice: 'station_truth',
    },
    {
        title: 'The door',
        body: 'The front opening is not a menu. Walk out. Four paths leave the clearing.',
        tip: 'Step outside',
        wait: 'out' as const,
        // Not `world_leave` — that line says "you HAVE stepped out", and the
        // player is still indoors being told to. Firing it here also burned
        // its once-per-session slot so the real arrival never spoke. The
        // narrator speaks world_leave at the actual threshold instead.
        voice: null,
    },
    {
        title: 'You’re home',
        body: 'Live souls share this floor. Esc or Pause opens Map and Tour. Enter speaks to the room. V shows your own body; 1–4 move your hands. Twenty-four shards hang on the shelf.',
        tip: 'Esc or Pause · Map and Tour',
        wait: 'tap' as const,
        voice: 'live_echo',
    },
] as const;
