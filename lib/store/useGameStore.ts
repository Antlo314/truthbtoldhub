import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================
//  THE JOURNEY — game state
//  Local-first (localStorage). We sync to Supabase `game_state`
//  in the Foundation phase so progress follows the soul, not the
//  browser. Soul Power continues to live on `profiles`.
// ============================================================

export type Gender = 'male' | 'female';

// The four Paths back to the Source.
export type GamePath = 'seer' | 'sentinel' | 'scribe' | 'mystic';

export interface CharacterAppearance {
    gender: Gender;
    skinTone: string;   // key into the curated LPC tone set
    hairStyle: string;  // key into the curated LPC hair set (incl. 'afro')
    hairColor: string;  // key into the curated LPC hair palette
}

export interface EquippedItems {
    clothing: string | null;
    relic: string | null;
    scroll: string | null;
}

export interface GameCharacter {
    name: string;
    appearance: CharacterAppearance;
    path: GamePath | null;
    equipped: EquippedItems;
}

const DEFAULT_CHARACTER: GameCharacter = {
    name: '',
    appearance: {
        gender: 'male',
        skinTone: 'brown',
        hairStyle: 'afro',
        hairColor: 'black',
    },
    path: null,
    equipped: { clothing: 'plain', relic: null, scroll: null },
};

interface GameState {
    initiated: boolean;            // has the Awakening been completed?
    character: GameCharacter;

    setName: (name: string) => void;
    setAppearance: (updates: Partial<CharacterAppearance>) => void;
    setPath: (path: GamePath) => void;
    completeAwakening: () => void;
    reset: () => void;
}

export const useGameStore = create<GameState>()(
    persist(
        (set) => ({
            initiated: false,
            character: { ...DEFAULT_CHARACTER, appearance: { ...DEFAULT_CHARACTER.appearance } },

            setName: (name) =>
                set((s) => ({ character: { ...s.character, name } })),

            setAppearance: (updates) =>
                set((s) => ({
                    character: {
                        ...s.character,
                        appearance: { ...s.character.appearance, ...updates },
                    },
                })),

            setPath: (path) =>
                set((s) => ({ character: { ...s.character, path } })),

            completeAwakening: () => set({ initiated: true }),

            reset: () =>
                set({
                    initiated: false,
                    character: {
                        ...DEFAULT_CHARACTER,
                        appearance: { ...DEFAULT_CHARACTER.appearance },
                        equipped: { ...DEFAULT_CHARACTER.equipped },
                    },
                }),
        }),
        {
            name: 'tbth-journey',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
