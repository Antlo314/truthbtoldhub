import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { getFounderStatus, type FounderTier } from '@/lib/game/founders';
import { CLOTHING_BY_ID } from '@/lib/game/clothing';

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
    weapon: string | null;
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
    founderClaimed: boolean; // one-time founder reward granted?
    inventory: string[];     // claimed relic ids
    cleared: string[];       // destination ids whose guardians are defeated
    solved: string[];        // puzzle ids solved
    questsClaimed: string[]; // quest ids whose reward was taken
    wardrobe: string[];      // clothing ids the soul has found
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
    founderClaimed: false,
    inventory: [],
    cleared: [],
    solved: [],
    questsClaimed: [],
    wardrobe: ['plain'],
    equipped: { weapon: null, clothing: 'plain', relic: null, scroll: null },
};

function freshCharacter(): GameCharacter {
    return {
        ...DEFAULT_CHARACTER,
        appearance: { ...DEFAULT_CHARACTER.appearance, bodyTile: { ...DEFAULT_CHARACTER.appearance.bodyTile } },
        skills: [...DEFAULT_CHARACTER.skills],
        inventory: [...DEFAULT_CHARACTER.inventory],
        cleared: [...DEFAULT_CHARACTER.cleared],
        solved: [...DEFAULT_CHARACTER.solved],
        questsClaimed: [...DEFAULT_CHARACTER.questsClaimed],
        wardrobe: [...DEFAULT_CHARACTER.wardrobe],
        equipped: { ...DEFAULT_CHARACTER.equipped },
    };
}

interface GameState {
    initiated: boolean;          // has the Awakening been completed?
    character: GameCharacter;
    cloudLoaded: boolean;        // have we pulled this soul's row from Supabase?
    founderNumber: number | null;

    setName: (name: string) => void;
    setAppearance: (updates: Partial<CharacterAppearance>) => void;
    setPath: (path: GamePath) => void;
    learnSkill: (id: string) => void;
    claimRelic: (id: string) => void;
    equipWeapon: (id: string) => void;
    findClothing: (id: string) => void;
    equipClothing: (id: string) => void;
    markCleared: (destId: string) => void;
    markSolved: (puzzleId: string) => void;
    claimQuest: (questId: string, skillPointsReward: number) => void;
    completeAwakening: () => void;
    reset: () => void;

    loadFromCloud: () => Promise<void>;
    saveToCloud: () => Promise<void>;
    loadFounder: () => Promise<FounderTier | null>;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            initiated: false,
            character: freshCharacter(),
            cloudLoaded: false,
            founderNumber: null,

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

            claimRelic: (id) =>
                set((s) => {
                    const c = s.character;
                    if (c.inventory.includes(id)) return {};
                    return { character: { ...c, inventory: [...c.inventory, id] } };
                }),

            equipWeapon: (id) =>
                set((s) => ({ character: { ...s.character, equipped: { ...s.character.equipped, weapon: id } } })),

            // Add a found garment to the wardrobe (and grant its one-time skill
            // point on first find). Idempotent — re-finding does nothing.
            findClothing: (id) =>
                set((s) => {
                    const c = s.character;
                    if (c.wardrobe.includes(id)) return {};
                    const bonus = CLOTHING_BY_ID[id]?.skillPointsOnFind || 0;
                    return { character: { ...c, wardrobe: [...c.wardrobe, id], skillPoints: c.skillPoints + bonus } };
                }),

            // Wear a garment you already own.
            equipClothing: (id) =>
                set((s) => {
                    const c = s.character;
                    if (!c.wardrobe.includes(id)) return {};
                    return { character: { ...c, equipped: { ...c.equipped, clothing: id } } };
                }),

            markCleared: (destId) =>
                set((s) => {
                    const c = s.character;
                    if (c.cleared.includes(destId)) return {};
                    return { character: { ...c, cleared: [...c.cleared, destId] } };
                }),

            markSolved: (puzzleId) =>
                set((s) => {
                    const c = s.character;
                    if (c.solved.includes(puzzleId)) return {};
                    return { character: { ...c, solved: [...c.solved, puzzleId] } };
                }),

            claimQuest: (questId, skillPointsReward) =>
                set((s) => {
                    const c = s.character;
                    if (c.questsClaimed.includes(questId)) return {};
                    return { character: { ...c, questsClaimed: [...c.questsClaimed, questId], skillPoints: c.skillPoints + skillPointsReward } };
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

            loadFounder: async () => {
                const status = await getFounderStatus();
                set({ founderNumber: status.founderNumber });
                const tier = status.tier;
                if (tier && !get().character.founderClaimed) {
                    set((s) => ({
                        character: {
                            ...s.character,
                            founderClaimed: true,
                            skillPoints: s.character.skillPoints + tier.bonusSkillPoints,
                        },
                    }));
                    await get().saveToCloud();
                    return tier;
                }
                return null;
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
                        founderClaimed: typeof pc.founderClaimed === 'boolean' ? pc.founderClaimed : c.character.founderClaimed,
                        inventory: pc.inventory || c.character.inventory,
                        cleared: pc.cleared || c.character.cleared,
                        solved: pc.solved || c.character.solved,
                        questsClaimed: pc.questsClaimed || c.character.questsClaimed,
                        wardrobe: pc.wardrobe && pc.wardrobe.length ? pc.wardrobe : c.character.wardrobe,
                        equipped: { ...c.character.equipped, ...(pc.equipped || {}) },
                    },
                };
            },
        }
    )
);
