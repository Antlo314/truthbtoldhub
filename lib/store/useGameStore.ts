import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { getFounderStatus, type FounderTier } from '@/lib/game/founders';
import { CLOTHING_BY_ID } from '@/lib/game/clothing';
import { defaultAvatar, type AvatarConfig } from '@/lib/game/avatar';
import { PATH_BY_ID } from '@/lib/game/paths';
import { migrateSkillIds } from '@/lib/game/abilities';
import {
    canCraftConsumable,
    CONSUMABLE_BY_ID,
    consumableStock,
    MAX_CONSUMABLE_STACK,
    MAX_FIGHT_BONUS_DAMAGE,
    MAX_FIGHT_BONUS_HP,
} from '@/lib/game/consumables';
import { maxVitality, BASE_VITALITY } from '@/lib/game/vitality';

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
    minigamesCleared: string[]; // score-gated trials passed
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
    /** Current vitality — persists between the overworld and every fight. */
    hp: number;
    /** @deprecated transient orb bonus — vitality is now the persistent `hp`. */
    fightBonusHp: number;
    /** Damage bonus from consumables — next fight only. */
    fightBonusDamage: number;
    /** Crafted hut tonics carried in the satchel. */
    consumables: Record<string, number>;
    /** Last overworld position ping — co-op presence (UTC day). */
    lastWalk?: {
        day: string;
        x: number;
        y: number;
        at: string;
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
    minigamesCleared: [],
    questsClaimed: [],
    discovered: [],
    wardrobe: ['plain'],
    sourceReturned: false,
    equipped: { weapon: null, clothing: 'plain', relic: null, scroll: null },
    materials: { iron: 0, copper: 0, cosmic: 0 },
    hp: BASE_VITALITY,
    fightBonusHp: 0,
    fightBonusDamage: 0,
    consumables: {},
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
        minigamesCleared: [...DEFAULT_CHARACTER.minigamesCleared],
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
    /** ISO of the last local save — used to decide cloud-vs-local recency. */
    savedAt: string | null;

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
    markMinigameCleared: (minigameId: string) => void;
    claimQuest: (questId: string, skillPointsReward: number) => void;
    grantSkillPoints: (n: number) => void;
    returnToSource: () => void;
    completeAwakening: () => void;
    /** @deprecated use restartJourney */
    reset: () => void;
    restartJourney: () => Promise<void>;
    addMaterial: (type: 'iron' | 'copper' | 'cosmic', qty: number) => void;
    spendMaterials: (costs: { iron?: number; copper?: number; cosmic?: number }) => void;
    addFightBonusHp: (amount: number) => void;
    consumeFightBonusHp: () => number;
    /** Persistent vitality: set / heal / fully restore (rest at the Hut). */
    setHp: (hp: number) => void;
    healHp: (amount: number) => void;
    restVitality: () => void;
    craftConsumable: (id: string) => boolean;
    useConsumable: (id: string) => boolean;

    loadFromCloud: () => Promise<void>;
    saveToCloud: () => Promise<void>;
    loadFounder: () => Promise<FounderTier | null>;
}

// ---------------------------------------------------------------------------
//  CLOUD-SAVE COORDINATOR
//  A single action (claim a relic, win a fight) fires saveToCloud() many
//  times. Left alone, those independent upserts race — a slow earlier write
//  can land last and clobber newer progress. This serializes them: only one
//  write is ever in flight, and a request made mid-write coalesces into a
//  single trailing write that reflects the latest state. Awaiting saveToCloud
//  resolves once a write covering the caller's state has completed.
// ---------------------------------------------------------------------------
let _saveActive: Promise<void> | null = null;
let _savePending = false;
let _saveWaiters: Array<() => void> = [];

async function _writeOnce() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { character, initiated } = useGameStore.getState();
        await supabase.from('game_state').upsert(
            {
                user_id: session.user.id,
                character,
                initiated,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
        );
    } catch {
        /* offline / table missing — localStorage retains it */
    }
}

function scheduleCloudSave(): Promise<void> {
    _savePending = true;
    if (!_saveActive) {
        _saveActive = (async () => {
            while (_savePending) {
                _savePending = false;
                await _writeOnce();
            }
            _saveActive = null;
            const waiters = _saveWaiters;
            _saveWaiters = [];
            for (const w of waiters) w();
        })();
    }
    return new Promise((resolve) => { _saveWaiters.push(resolve); });
}

const u = (a?: string[], b?: string[]) => Array.from(new Set([...(a || []), ...(b || [])]));

// Combine a cloud row with the local soul WITHOUT losing progress. `primary`
// is whichever side is fresher (by timestamp) — its scalar fields (name, path,
// skills, points, equipped, materials…) win. Monotonic collections (relics,
// clears, puzzles, discoveries, garments) are UNIONED from both sides, so a
// stale-but-ahead device can never roll back a relic or a cleared guardian.
function mergeCloudCharacter(
    local: GameCharacter,
    cloud: Partial<GameCharacter>,
    primary: Partial<GameCharacter>,
): GameCharacter {
    return {
        ...freshCharacter(),
        ...local,
        ...primary,
        appearance: { ...DEFAULT_CHARACTER.appearance, ...(primary.appearance || local.appearance || {}) },
        avatar: { ...DEFAULT_CHARACTER.avatar, ...(primary.avatar || local.avatar || {}) },
        equipped: { ...DEFAULT_CHARACTER.equipped, ...(primary.equipped || local.equipped || {}) },
        materials: { ...DEFAULT_CHARACTER.materials, ...(primary.materials || local.materials || {}) },
        skills: migrateSkillIds(primary.skills || local.skills || []),
        // never-lose monotonic progress (union both sides regardless of recency)
        inventory: u(local.inventory, cloud.inventory),
        scrolls: u(local.scrolls, cloud.scrolls),
        cleared: u(local.cleared, cloud.cleared),
        solved: u(local.solved, cloud.solved),
        minigamesCleared: u(local.minigamesCleared, cloud.minigamesCleared),
        questsClaimed: u(local.questsClaimed, cloud.questsClaimed),
        discovered: u(local.discovered, cloud.discovered),
        wardrobe: u(['plain', ...(local.wardrobe || [])], cloud.wardrobe),
        // one-time / one-way flags stay set once earned on either side
        founderClaimed: !!local.founderClaimed || !!cloud.founderClaimed,
        sourceReturned: !!local.sourceReturned || !!cloud.sourceReturned,
    };
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            initiated: false,
            character: freshCharacter(),
            cloudLoaded: false,
            founderNumber: null,
            savedAt: null,

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
                    if (!c.path || c.skills.includes(id) || c.skillPoints <= 0) return {};
                    const node = PATH_BY_ID[c.path].skills.find((sk) => sk.id === id);
                    if (!node) return {};
                    const prereqs = node.requires || [];
                    if (!prereqs.every((r) => c.skills.includes(r))) return {};
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

            markMinigameCleared: (minigameId) =>
                set((s) => {
                    const c = s.character;
                    const cleared = c.minigamesCleared || [];
                    if (cleared.includes(minigameId)) return {};
                    return { character: { ...c, minigamesCleared: [...cleared, minigameId] } };
                }),

            claimQuest: (questId, skillPointsReward) =>
                set((s) => {
                    const c = s.character;
                    if (c.questsClaimed.includes(questId)) return {};
                    return { character: { ...c, questsClaimed: [...c.questsClaimed, questId], skillPoints: c.skillPoints + skillPointsReward } };
                }),

            grantSkillPoints: (n) =>
                set((s) => (n ? { character: { ...s.character, skillPoints: s.character.skillPoints + n } } : {})),

            returnToSource: () =>
                set((s) => (s.character.sourceReturned ? {} : { character: { ...s.character, sourceReturned: true } })),

            completeAwakening: () => set({ initiated: true }),

            reset: () => set({ initiated: false, character: freshCharacter(), cloudLoaded: false }),

            restartJourney: async () => {
                const founderClaimed = get().character.founderClaimed;
                const founderNumber = get().founderNumber;
                if (typeof window !== 'undefined') {
                    try {
                        sessionStorage.removeItem('tbth-cutscene-world');
                        localStorage.removeItem('tbth-tutorials-seen');
                        localStorage.removeItem('tbth-hut-seen');
                    } catch { /* ignore */ }
                }
                set({
                    initiated: false,
                    character: { ...freshCharacter(), founderClaimed },
                    cloudLoaded: true,
                    founderNumber,
                });
                await get().saveToCloud();
            },

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

            addFightBonusHp: (amount) =>
                set((s) => ({
                    character: {
                        ...s.character,
                        fightBonusHp: Math.min(MAX_FIGHT_BONUS_HP, s.character.fightBonusHp + amount),
                    },
                })),

            consumeFightBonusHp: () => {
                const bonus = get().character.fightBonusHp;
                if (bonus > 0 || get().character.fightBonusDamage > 0) {
                    set((s) => ({
                        character: { ...s.character, fightBonusHp: 0, fightBonusDamage: 0 },
                    }));
                }
                return bonus;
            },

            setHp: (hp) =>
                set((s) => ({
                    character: { ...s.character, hp: Math.max(0, Math.min(maxVitality(s.character, s.founderNumber), Math.round(hp))) },
                })),

            healHp: (amount) =>
                set((s) => {
                    const max = maxVitality(s.character, s.founderNumber);
                    const cur = typeof s.character.hp === 'number' ? s.character.hp : max;
                    return { character: { ...s.character, hp: Math.min(max, Math.round(cur + amount)) } };
                }),

            restVitality: () =>
                set((s) => ({ character: { ...s.character, hp: maxVitality(s.character, s.founderNumber) } })),

            craftConsumable: (id) => {
                const ch = get().character;
                if (!canCraftConsumable(ch, id)) return false;
                const def = CONSUMABLE_BY_ID[id];
                if (!def) return false;
                get().spendMaterials(def.cost);
                set((s) => {
                    const stock = { ...s.character.consumables };
                    stock[id] = Math.min(MAX_CONSUMABLE_STACK, (stock[id] ?? 0) + 1);
                    return { character: { ...s.character, consumables: stock } };
                });
                return true;
            },

            useConsumable: (id) => {
                const ch = get().character;
                if (consumableStock(ch, id) <= 0) return false;
                const def = CONSUMABLE_BY_ID[id];
                if (!def) return false;
                set((s) => {
                    const stock = { ...s.character.consumables };
                    stock[id] = Math.max(0, (stock[id] ?? 0) - 1);
                    if (stock[id] === 0) delete stock[id];
                    // health tonics now restore persistent vitality (not a per-fight buffer)
                    const max = maxVitality(s.character, s.founderNumber);
                    const cur = typeof s.character.hp === 'number' ? s.character.hp : max;
                    const newHp = def.effect.hp ? Math.min(max, cur + def.effect.hp) : cur;
                    const damage = def.effect.damage
                        ? Math.min(MAX_FIGHT_BONUS_DAMAGE, s.character.fightBonusDamage + def.effect.damage)
                        : s.character.fightBonusDamage;
                    return {
                        character: {
                            ...s.character,
                            consumables: stock,
                            hp: newHp,
                            fightBonusDamage: damage,
                        },
                    };
                });
                return true;
            },

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
                        .select('character, initiated, updated_at')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    // table missing / RLS / offline -> keep the local copy
                    if (error) {
                        set({ cloudLoaded: true });
                        return;
                    }

                    if (data && data.character && Object.keys(data.character).length > 0) {
                        const cloud = data.character as Partial<GameCharacter>;
                        const local = get().character;
                        const localSavedAt = get().savedAt;
                        const cloudUpdatedAt = (data.updated_at as string | null) || null;
                        // cloud wins the scalar fields only if it's genuinely newer
                        // (e.g. progressed on another device); otherwise local leads.
                        // Either way, monotonic progress is unioned below.
                        const cloudFresher = !localSavedAt || (!!cloudUpdatedAt && cloudUpdatedAt >= localSavedAt);
                        const merged = mergeCloudCharacter(local, cloud, cloudFresher ? cloud : local);
                        set({
                            character: merged,
                            initiated: get().initiated || !!data.initiated,
                            cloudLoaded: true,
                        });
                        // push the unioned superset back so the cloud catches up
                        void get().saveToCloud();
                    } else {
                        // first cloud record for this soul — seed it from local
                        set({ cloudLoaded: true });
                        void get().saveToCloud();
                    }
                } catch {
                    /* offline — local copy stands */
                }
            },

            // Coalesced + serialized — see scheduleCloudSave. Stamps savedAt so a
            // later loadFromCloud can tell whether the cloud is actually newer.
            saveToCloud: async () => {
                if (typeof window === 'undefined') return;
                set({ savedAt: new Date().toISOString() });
                await scheduleCloudSave();
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
            partialize: (s) => ({ initiated: s.initiated, character: s.character, savedAt: s.savedAt }),
            // Heal any older persisted shape (e.g. pre-Kenney appearance) into the
            // current one so required fields like bodyTile/aura always exist.
            merge: (persisted, current) => {
                const c = current as GameState;
                const p = (persisted as Partial<GameState>) || {};
                const pc = (p.character || {}) as Partial<GameCharacter>;
                return {
                    ...c,
                    initiated: typeof p.initiated === 'boolean' ? p.initiated : c.initiated,
                    savedAt: typeof p.savedAt === 'string' ? p.savedAt : c.savedAt,
                    character: {
                        ...c.character,
                        ...pc,
                        appearance: {
                            ...c.character.appearance,
                            ...(pc.appearance || {}),
                            bodyTile: pc.appearance?.bodyTile || c.character.appearance.bodyTile,
                        },
                        avatar: { ...c.character.avatar, ...(pc.avatar || {}) },
                        skills: migrateSkillIds(pc.skills || c.character.skills),
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
                        fightBonusHp: typeof pc.fightBonusHp === 'number' ? pc.fightBonusHp : c.character.fightBonusHp,
                        fightBonusDamage: typeof pc.fightBonusDamage === 'number' ? pc.fightBonusDamage : c.character.fightBonusDamage,
                        consumables: pc.consumables && typeof pc.consumables === 'object' ? pc.consumables : c.character.consumables,
                    },
                };
            },
        }
    )
);
