import type { GameCharacter } from '@/lib/store/useGameStore';
import { DEST_BY_POI } from '@/lib/game/destinations';

// ============================================================
//  DESTINATION PROGRESSION — linear unlock chain.
//  Eden first, fully complete, then Giza → Fair → Kolbrin → Emerald.
// ============================================================

export const DESTINATION_ORDER = [
    'dest_eden',
    'dest_giza',
    'dest_fair',
    'dest_kolbrin',
    'dest_emerald',
] as const;

export type DestinationId = (typeof DESTINATION_ORDER)[number];

/** NPC givers tied to each age — quests stay dormant until that age opens. */
export const NPC_DESTINATION: Record<string, DestinationId> = {
    npc_gardener: 'dest_eden',
    npc_hana: 'dest_giza',
    npc_mabel: 'dest_fair',
    npc_eli: 'dest_kolbrin',
};

export function destinationIndex(poiId: string): number {
    return DESTINATION_ORDER.indexOf(poiId as DestinationId);
}

export function isDestinationPOI(poiId: string): boolean {
    return destinationIndex(poiId) >= 0;
}

/** Guardian beaten + trial passed + puzzle solved + relic claimed. */
export function isDestinationComplete(poiId: string, c: GameCharacter): boolean {
    const dest = DEST_BY_POI[poiId];
    if (!dest) return false;

    const guardianOk = !dest.combat || c.cleared.includes(poiId);
    const trialOk = !dest.minigame || (c.minigamesCleared || []).includes(dest.minigame.id);
    const puzzleOk = !dest.puzzle || c.solved.includes(dest.puzzle.id);
    const relicOk = dest.relics.every((r) => c.inventory.includes(r.id));

    return guardianOk && trialOk && puzzleOk && relicOk;
}

export function isDestinationUnlocked(poiId: string, c: GameCharacter): boolean {
    const idx = destinationIndex(poiId);
    if (idx < 0) return true;
    if (idx === 0) return true;
    return isDestinationComplete(DESTINATION_ORDER[idx - 1], c);
}

export function unlockBlockMessage(poiId: string): string {
    const idx = destinationIndex(poiId);
    if (idx <= 0) return '';
    const prevId = DESTINATION_ORDER[idx - 1];
    const prev = DEST_BY_POI[prevId];
    const next = DEST_BY_POI[poiId];
    return `The way to ${next?.name || 'this place'} is sealed. Walk ${prev?.name || 'the prior road'} to its end — guardian, trial, riddle, and relic — and the veil will part.`;
}

/** First destination the soul should focus on (incomplete + unlocked). */
export function activeDestinationFocus(c: GameCharacter): DestinationId | null {
    for (const id of DESTINATION_ORDER) {
        if (!isDestinationUnlocked(id, c)) return null;
        if (!isDestinationComplete(id, c)) return id;
    }
    return null;
}

export function isNpcQuestActive(npcId: string, c: GameCharacter): boolean {
    if (npcId === 'npc_mara') {
        return c.inventory.length > 0 || isDestinationComplete('dest_eden', c);
    }
    const dest = NPC_DESTINATION[npcId];
    if (!dest) return true;
    return isDestinationUnlocked(dest, c);
}