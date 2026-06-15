import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// ============================================================
//  THE JOURNEY — game state
//  Local-first (localStorage) for instant UX, synced to Supabase
//  `game_state` so progress follows the soul, not the browser.
//  Cloud calls are resilient: if the table doesn't exist yet (or
//  the user is offline), we silently keep the local copy.
//  Soul Power continues to live on `profiles`.
// ============================================================

export type Gender = 'male' | 'female';

// The four Paths back to the Source.
export type GamePath = 'seer' | 'sentinel' | 'scribe' | 'mystic';

export interface TileRef {
    col: number;
    row: number;
}

export interface CharacterAppearance {
    gender: Gender;
    bodyTile: TileRef;   // chosen Kenney character tile
    aura: string;        // aura glow colour (hex)
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
    skills: string[];        // learned skill ids
    skillPoints: number;     // unspent points
    equipped: EquippedItems;
}

const DEFAULT_CHARACTER: GameCharacter = {
    name: '',
    appearance: {
        gender: 'male',
        bodyTile: { col: 1, row: 6 },
        aura: '#fbbf24',
    },
    path: null,
    skills: [],
    skillPoints: 1,
    equipped: { clothing: 'plain', relic: null, scroll: null },
};

function freshCharacter(): GameCharacter {
    return {
        ...DEFAULT_CHARACTER,
        appearance: { ...DEFAULT_CHARACTER.appearance, bodyTile: { ...DEFAULT_CHARACTER.appearance.bodyTile } },
        skills: [...DEFAULT_CHARACTER.skills],
        equipped: { ...DEFAULT_CHARACTER.equipped },
    };
}

interface GameState {
    initiated: boolean;          // has the Awakening been completed?
    character: GameCharacter;
    cloudLoaded: boolean;        // have we pulled this soul's row from Supabase?

    setName: (name: string) => void;
    setAppearance: (updates: Partial<CharacterAppearance>) => void;
    setPath: (path: GamePath) => void;
    learnSkill: (id: string) => void;
    completeAwakening: () => void;
    reset: () => void;

    loadFromCloud: () => Promise<void>;
    saveToCloud: () => Promise<void>;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            initiated: false,
            character: freshCharacter(),
            cloudLoaded: false,

            setName: (name) => set((s) => ({ character: { ...s.character, name } })),

            setAppearance: (updates) =>
                set((s) => ({
                    character: {
                        ...s.character,
                        appearance: { ...s.character.appearance, ...updates },
                    },
                })),

            setPath: (path) => set((s) => ({ character: { ...s.character, path } })),

            learnSkill: (id) =>
                set((s) => {
                    const c = s.character;
                    if (c.skills.includes(id) || c.skillPoints <= 0) return {};
                    return { character: { ...c, skills: [...c.skills, id], skillPoints: c.skillPoints - 1 } };
                }),

            completeAwakening: () => set({ initiated: true }),

            reset: () => set({ initiated: false, character: freshCharacter(), cloudLoaded: false }),

            loadFromCloud: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const { data, error } = await supabase
                        .from('game_state')
                        .select('character, initiated')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    // table missing / RLS / offline -> keep the local copy
                    if (error) {
                        set({ cloudLoaded: true });
                        return;
                    }

                    if (data && data.character && Object.keys(data.character).length > 0) {
                        const c = data.character as Partial<GameCharacter>;
                        set({
                            character: {
                                ...freshCharacter(),
                                ...c,
                                appearance: { ...DEFAULT_CHARACTER.appearance, ...(c.appearance || {}) },
                                equipped: { ...DEFAULT_CHARACTER.equipped, ...(c.equipped || {}) },
                            },
                            initiated: !!data.initiated,
                            cloudLoaded: true,
                        });
                    } else {
                        set({ cloudLoaded: true });
                    }
                } catch {
                    /* offline — local copy stands */
                }
            },

            saveToCloud: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const { character, initiated } = get();
                    await supabase.from('game_state').upsert(
                        {
                            user_id: session.user.id,
                            character,
                            initiated,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'user_id' }
                    );
                } catch {
                    /* ignore — localStorage retains it until the table exists */
                }
            },
        }),
        {
            name: 'tbth-journey',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: (s) => ({ initiated: s.initiated, character: s.character }),
            // Heal any older persisted shape (e.g. pre-Kenney appearance) into the
            // current one so required fields like bodyTile/aura always exist.
            merge: (persisted, current) => {
                const c = current as GameState;
                const p = (persisted as Partial<GameState>) || {};
                const pc = (p.character || {}) as Partial<GameCharacter>;
                return {
                    ...c,
                    initiated: typeof p.initiated === 'boolean' ? p.initiated : c.initiated,
                    character: {
                        ...c.character,
                        ...pc,
                        appearance: {
                            ...c.character.appearance,
                            ...(pc.appearance || {}),
                            bodyTile: pc.appearance?.bodyTile || c.character.appearance.bodyTile,
                        },
                        skills: pc.skills || c.character.skills,
                        skillPoints: typeof pc.skillPoints === 'number' ? pc.skillPoints : c.character.skillPoints,
                        equipped: { ...c.character.equipped, ...(pc.equipped || {}) },
                    },
                };
            },
        }
    )
);
