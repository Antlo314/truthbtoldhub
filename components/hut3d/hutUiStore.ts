'use client';

import { create } from 'zustand';

export type HutStationId =
    | 'truth'
    | 'soul'
    | 'wayfinder'
    | 'ledger'
    | 'sanctum'
    | null;

interface HutUiState {
    station: HutStationId;
    prompt: string | null;
    inputLocked: boolean;
    openStation: (id: HutStationId) => void;
    closeStation: () => void;
    setPrompt: (label: string | null) => void;
    setInputLocked: (v: boolean) => void;
}

export const useHutUi = create<HutUiState>((set) => ({
    station: null,
    prompt: null,
    inputLocked: false,
    openStation: (id) => set({ station: id, inputLocked: !!id }),
    closeStation: () => set({ station: null, inputLocked: false, prompt: null }),
    setPrompt: (label) => set({ prompt: label }),
    setInputLocked: (v) => set({ inputLocked: v }),
}));
