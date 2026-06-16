import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { getFounderStatus, type FounderTier } from '@/lib/game/founders';
import { CLOTHING_BY_ID } from '@/lib/game/clothing';
import { defaultAvatar, type AvatarConfig } from '@/lib/game/avatar';

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
    avatar: AvatarConfig;    // layered full-body character (skin/hair/face/outfit)
    path: GamePath | null;
    skills: string[];        // learned skill ids
    skillPoints: number;     // unspent points
    founderClaimed: boolean; // one-time founder reward granted?
    inventory: string[];     // claimed relic ids
    scrolls: string[];       // knowledge scrolls from quests
    cleared: string[];       // destination ids whose guardians are defeated
    solved: string[];        // puzzle ids solved
    questsClaimed: string[]; // quest ids whose reward was taken
    discovered: string[];    // hidden POIs found, etc.
    wardrobe: string[];      // clothing ids the soul has found
    sourceReturned: boolean; // has the soul completed the Return to the Source?
    equipped: EquippedItems;
    materials: {
        iron: number;
        copper: number;
        cosmic: number;
    };
}

const DEFAULT_CHARACTER: GameCharacter = {
    name: '',
    appearance: {
        gender: 'male',
        bodyTile: { col: 1, row: 6 },
        aura: '#fbbf24',
    },
    avatar: defaultAvatar(),
    path: null,
    skills: [],
    skillPoints: 1,
    founderClaimed: false,
    inventory: [],
    scrolls: [],
    cleared: [],
    solved: [],
    questsClaimed: [],
    discovered: [],
    wardrobe: ['plain'],
    sourceReturned: false,
    equipped: { weapon: null, clothing: 'plain', relic: null, scroll: null },
    materials: { iron: 0, copper: 0, cosmic: 0 },
};

function freshCharacter(): GameCharacter {
    return {
        ...DEFAULT_CHARACTER,
        appearance: { ...DEFAULT_CHARACTER.appearance, bodyTile: { ...DEFAULT_CHARACTER.appearance.bodyTile } },
        avatar: { ...DEFAULT_CHARACTER.avatar },
        skills: [...DEFAULT_CHARACTER.skills],
        inventory: [...DEFAULT_CHARACTER.inventory],
        scrolls: [...DEFAULT_CHARACTER.scrolls],
        cleared: [...DEFAULT_CHARACTER.cleared],
        solved: [...DEFAULT_CHARACTER.solved],
        questsClaimed: [...DEFAULT_CHARACTER.questsClaimed],
        discovered: [...DEFAULT_CHARACTER.discovered],
        wardrobe: [...DEFAULT_CHARACTER.wardrobe],
        equipped: { ...DEFAULT_CHARACTER.equipped },
        materials: { ...DEFAULT_CHARACTER.materials },
    };
}

interface GameState {
    initiated: boolean;          // has the Awakening been completed?
    character: GameCharacter;
    cloudLoaded: boolean;        // have we pulled this soul's row from Supabase?
    founderNumber: number | null;

    setName: (name: string) => void;
    setAppearance: (updates: Partial<CharacterAppearance>) => void;
    setAvatar: (updates: Partial<AvatarConfig>) => void;
    setPath: (path: GamePath) => void;
    learnSkill: (id: string) => void;
    claimRelic: (id: string) => void;
    equipRelic: (id: string | null) => void;
    grantScroll: (id: string) => void;
    equipScroll: (id: string | null) => void;
    markDiscovered: (id: string) => void;
    equipWeapon: (id: string) => void;
    findClothing: (id: string) => void;
    equipClothing: (id: string) => void;
    markCleared: (destId: string) => void;
    markSolved: (puzzleId: string) => void;
    claimQuest: (questId: string, skillPointsReward: number) => void;
    returnToSource: () => void;
    completeAwakening: () => void;
    reset: () => void;
    addMaterial: (type: 'iron' | 'copper' | 'cosmic', qty: number) => void;
    spendMaterials: (costs: { iron?: number; copper?: number; cosmic?: number }) => void;

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

            setAvatar: (updates) =>
                set((s) => ({ character: { ...s.character, avatar: { ...s.character.avatar, ...updates } } })),

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
                    const equipped = c.equipped.relic ? c.equipped : { ...c.equipped, relic: id };
                    return { character: { ...c, inventory: [...c.inventory, id], equipped } };
                }),

            equipRelic: (id) =>
                set((s) => {
                    const c = s.character;
                    if (id && !c.inventory.includes(id)) return {};
                    return { character: { ...c, equipped: { ...c.equipped, relic: id } } };
                }),

            grantScroll: (id) =>
                set((s) => {
                    const c = s.character;
                    if (c.scrolls.includes(id)) return {};
                    const equipped = c.equipped.scroll ? c.equipped : { ...c.equipped, scroll: id };
                    return { character: { ...c, scrolls: [...c.scrolls, id], equipped } };
                }),

            equipScroll: (id) =>
                set((s) => {
                    const c = s.character;
                    if (id && !c.scrolls.includes(id)) return {};
                    return { character: { ...c, equipped: { ...c.equipped, scroll: id } } };
                }),

            markDiscovered: (id) =>
                set((s) => {
                    const c = s.character;
                    if (c.discovered.includes(id)) return {};
                    return { character: { ...c, discovered: [...c.discovered, id] } };
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

            returnToSource: () =>
                set((s) => (s.character.sourceReturned ? {} : { character: { ...s.character, sourceReturned: true } })),

            completeAwakening: () => set({ initiated: true }),

            reset: () => set({ initiated: false, character: freshCharacter(), cloudLoaded: false }),

            addMaterial: (type, qty) =>
                set((s) => {
                    const mats = s.character.materials || { iron: 0, copper: 0, cosmic: 0 };
                    return {
                        character: {
                            ...s.character,
                            materials: {
                                ...mats,
                                [type]: (mats[type] || 0) + qty
                            }
                        }
                    };
                }),

            spendMaterials: (costs) =>
                set((s) => {
                    const mats = s.character.materials || { iron: 0, copper: 0, cosmic: 0 };
                    return {
                        character: {
                            ...s.character,
                            materials: {
                                iron: Math.max(0, (mats.iron || 0) - (costs.iron || 0)),
                                copper: Math.max(0, (mats.copper || 0) - (costs.copper || 0)),
                                cosmic: Math.max(0, (mats.cosmic || 0) - (costs.cosmic || 0))
                            }
                        }
                    };
                }),

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
                                avatar: { ...DEFAULT_CHARACTER.avatar, ...(c.avatar || {}) },
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
                        avatar: { ...c.character.avatar, ...(pc.avatar || {}) },
                        skills: pc.skills || c.character.skills,
                        skillPoints: typeof pc.skillPoints === 'number' ? pc.skillPoints : c.character.skillPoints,
                        founderClaimed: typeof pc.founderClaimed === 'boolean' ? pc.founderClaimed : c.character.founderClaimed,
                        inventory: pc.inventory || c.character.inventory,
                        scrolls: pc.scrolls || c.character.scrolls,
                        cleared: pc.cleared || c.character.cleared,
                        solved: pc.solved || c.character.solved,
                        questsClaimed: pc.questsClaimed || c.character.questsClaimed,
                        discovered: pc.discovered || c.character.discovered,
                        wardrobe: pc.wardrobe && pc.wardrobe.length ? pc.wardrobe : c.character.wardrobe,
                        sourceReturned: typeof pc.sourceReturned === 'boolean' ? pc.sourceReturned : c.character.sourceReturned,
                        equipped: { ...c.character.equipped, ...(pc.equipped || {}) },
                        materials: pc.materials || c.character.materials,
                    },
                };
            },
        }
    )
);
