import type { GameCharacter } from '@/lib/store/useGameStore';
import { DEST_BY_POI } from '@/lib/game/destinations';
import { EDEN_LORE } from '@/lib/game/edenLevel';

export interface JournalEntry {
    id: string;
    title: string;
    body: string;
    category: 'lore' | 'quest' | 'relic' | 'path' | 'truth';
    unlockedAt?: string;
}

const BASE_ENTRIES: JournalEntry[] = [
    { id: 'intro', title: 'The Awakening', category: 'truth', body: 'Truth walked beside you from the first breath. The Source was never far — only covered by sleep.' },
    { id: 'paths', title: 'The Four Roads', category: 'path', body: 'Seer, Sentinel, Scribe, Mystic — four strengths, four weaknesses. Your path shapes how the world answers you.' },
];

export function buildJournal(character: GameCharacter, initiated: boolean): JournalEntry[] {
    if (!initiated) return [];
    const entries: JournalEntry[] = [...BASE_ENTRIES];

    if (character.name) {
        entries.push({ id: 'name', title: character.name, category: 'truth', body: `A soul named ${character.name} stepped into the light.` });
    }
    if (character.path) {
        entries.push({ id: `path_${character.path}`, title: `Path of the ${character.path}`, category: 'path', body: `You embraced the way of the ${character.path}. Its power and its cost are yours now.` });
    }

    for (const destId of character.cleared) {
        const dest = Object.values(DEST_BY_POI).find((d) => d.poiId === destId);
        if (dest) {
            entries.push({
                id: `clear_${destId}`,
                title: dest.name,
                category: 'lore',
                body: dest.combat?.victory || `The guardian of ${dest.name} fell. The way stands open.`,
            });
        }
    }

    for (const relicId of character.inventory) {
        const dest = Object.values(DEST_BY_POI).find((d) => d.relics.some((r) => r.id === relicId));
        const relic = dest?.relics.find((r) => r.id === relicId);
        if (relic) {
            entries.push({ id: `relic_${relicId}`, title: relic.name, category: 'relic', body: relic.desc });
        }
    }

    for (const qid of character.questsClaimed) {
        entries.push({ id: `quest_${qid}`, title: 'Mission fulfilled', category: 'quest', body: `Quest ${qid} — turned in at the crossroads of the world.` });
    }

    for (const discId of character.discovered) {
        if (!discId.startsWith('eden_lore_')) continue;
        const loreKey = discId.replace('eden_', '');
        const lore = EDEN_LORE[loreKey as keyof typeof EDEN_LORE];
        if (lore) {
            entries.push({ id: discId, title: lore.title, category: 'lore', body: lore.text });
        }
    }

    if (character.discovered.includes('eden_temptation_resisted')) {
        entries.push({
            id: 'eden_temptation_resisted',
            title: 'The Road Chosen',
            category: 'lore',
            body: 'In the Forbidden Verge you heard the serpent\'s whisper — a shortcut promising knowledge without walking. You walked on. That is how man once knew the Source.',
        });
    }

    if (character.sourceReturned) {
        entries.push({ id: 'source', title: 'Return to the Source', category: 'truth', body: 'The five relics burned as one. You did not come back to the Source — you woke and found you had never left it. Season II awaits those who carry the light forward.' });
    }

    return entries;
}