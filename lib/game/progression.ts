import type { GameCharacter } from '@/lib/store/useGameStore';
import { DEST_BY_POI } from '@/lib/game/destinations';

// ============================================================
//  DESTINATION PROGRESSION — linear unlock chain.
//  Eden first, fully complete, then Giza → Fair → Kolbrin → Emerald.
// ============================================================

// Eden is fully built out — the garden portal is open (first age in the chain).
export const EDEN_SEALED = false;

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
    npc_hermes: 'dest_emerald',
};

/** Destinations still being built — every age is veiled for now while focus
 *  stays on Truth's Hut. They still appear on the map but stay locked until
 *  their content lands; their NPC quest chains stay dormant via
 *  isNpcQuestActive below. (Eden is sealed separately via EDEN_SEALED above.) */
export const SEALED_DESTINATIONS = new Set<DestinationId>([
    'dest_giza',
    'dest_fair',
    'dest_kolbrin',
    'dest_emerald',
]);

export function isDestinationSealed(poiId: string): boolean {
    return SEALED_DESTINATIONS.has(poiId as DestinationId);
}

export function isEdenSealed(): boolean {
    return EDEN_SEALED;
}

export function edenSealedMessage(): string {
    return 'The garden portal is veiled for now. I am still weaving the missions of Eden — roam the chamber, speak with the souls here, and return to Truth\'s Hut. When the hour comes, the flaming sword will lower.';
}

/** Playable chain — skips Eden while sealed. */
export function playableDestinationOrder(): DestinationId[] {
    if (!EDEN_SEALED) return [...DESTINATION_ORDER];
    return DESTINATION_ORDER.filter((id) => id !== 'dest_eden');
}

export function destinationIndex(poiId: string): number {
    return playableDestinationOrder().indexOf(poiId as DestinationId);
}

export function isDestinationPOI(poiId: string): boolean {
    if (poiId === 'dest_eden' && EDEN_SEALED) return true;
    return DESTINATION_ORDER.indexOf(poiId as DestinationId) >= 0;
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
    if (poiId === 'dest_eden' && EDEN_SEALED) return false;
    if (isDestinationSealed(poiId)) return false;

    const order = playableDestinationOrder();
    const idx = order.indexOf(poiId as DestinationId);
    if (idx < 0) return true;
    if (idx === 0) return true;
    return isDestinationComplete(order[idx - 1], c);
}

export function unlockBlockMessage(poiId: string): string {
    if (poiId === 'dest_eden' && EDEN_SEALED) return edenSealedMessage();
    if (isDestinationSealed(poiId)) {
        const here = DEST_BY_POI[poiId];
        return `${here?.name || 'This age'} is still being forged. For now, make Truth's Hut your home — temper your arms, study the Library, walk with the work, and ask me what you will. When the hour comes, this veil will part.`;
    }

    const order = playableDestinationOrder();
    const idx = order.indexOf(poiId as DestinationId);
    if (idx <= 0) return '';
    const prevId = order[idx - 1];
    const prev = DEST_BY_POI[prevId];
    const next = DEST_BY_POI[poiId];
    return `The way to ${next?.name || 'this place'} is sealed. Walk ${prev?.name || 'the prior road'} to its end — guardian, trial, riddle, and relic — and the veil will part.`;
}

/** First destination the soul should focus on (incomplete + unlocked). */
export function activeDestinationFocus(c: GameCharacter): DestinationId | null {
    for (const id of playableDestinationOrder()) {
        if (!isDestinationUnlocked(id, c)) return null;
        if (!isDestinationComplete(id, c)) return id;
    }
    return null;
}

export function isNpcQuestActive(npcId: string, c: GameCharacter): boolean {
    if (npcId === 'npc_gardener' && EDEN_SEALED) return false;
    if (npcId === 'npc_mara') {
        return c.inventory.length > 0
            || c.cleared.length > 0
            || c.discovered.length > 0
            || c.solved.length > 0;
    }
    const dest = NPC_DESTINATION[npcId];
    if (!dest) return true;
    return isDestinationUnlocked(dest, c);
}