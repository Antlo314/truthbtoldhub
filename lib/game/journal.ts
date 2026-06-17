import type { GameCharacter } from '@/lib/store/useGameStore';
import { DEST_BY_POI } from '@/lib/game/destinations';
import { EDEN_LORE, EDEN_GARDENER_LINES } from '@/lib/game/edenLevel';
import { truthAccountPages } from '@/lib/game/truthLore';
import { QUESTS } from '@/lib/game/quests';
import { PATH_BY_ID } from '@/lib/game/paths';

export type JournalCategory = 'lore' | 'quest' | 'relic' | 'path' | 'truth';

export type JournalSectionId =
    | 'origin'
    | 'truth_account'
    | 'missions'
    | 'conquests'
    | 'eden'
    | 'relics'
    | 'epilogue';

export interface JournalEntry {
    id: string;
    title: string;
    body: string;
    category: JournalCategory;
    section: JournalSectionId;
    /** Secondary line — giver, era, location, power */
    subtitle?: string;
    /** Tertiary context — reward, witness, excerpt */
    detail?: string;
}

export interface JournalSection {
    id: JournalSectionId;
    title: string;
    subtitle: string;
    entries: JournalEntry[];
}

export const JOURNAL_SECTION_META: Record<JournalSectionId, { title: string; subtitle: string; order: number }> = {
    origin: {
        title: 'Origin & Attunement',
        subtitle: 'The awakening and the road you chose',
        order: 0,
    },
    truth_account: {
        title: "Brother Truth's Account",
        subtitle: 'Pages opened in Ask Truth — Anthony beneath the hood',
        order: 1,
    },
    missions: {
        title: 'Missions Fulfilled',
        subtitle: 'Quests turned in at the crossroads of the world',
        order: 2,
    },
    conquests: {
        title: 'Places Conquered',
        subtitle: 'Guardians fallen and gates opened',
        order: 3,
    },
    eden: {
        title: 'Garden of Eden',
        subtitle: 'Stones, wings, and the hour before the lie',
        order: 4,
    },
    relics: {
        title: 'Relics Claimed',
        subtitle: 'Tokens carried forward from the ages',
        order: 5,
    },
    epilogue: {
        title: 'Return to Source',
        subtitle: 'Season I — the five flames as one',
        order: 6,
    },
};

const WING_TITLES: Record<string, string> = {
    wing_threshold: 'The Threshold',
    wing_outer_grove: 'Outer Grove',
    wing_eastern_garden: 'Eastern Garden',
    wing_river_warren: 'River Warren',
    wing_forbidden_verge: 'The Forbidden Verge',
    wing_cherub_antechamber: 'Cherub Antechamber',
};

const BASE_ENTRIES: JournalEntry[] = [
    {
        id: 'intro',
        title: 'The Awakening',
        category: 'truth',
        section: 'origin',
        subtitle: 'Truth\'s Hut · First breath',
        body: 'Truth walked beside you from the first breath. The Source was never far — only covered by sleep. This chamber is not escape; it is a proving ground for return.',
    },
    {
        id: 'paths',
        title: 'The Four Roads',
        category: 'path',
        section: 'origin',
        subtitle: 'Seer · Sentinel · Scribe · Mystic',
        body: 'Four strengths, four weaknesses. Your path shapes how the world answers you — what you see, what you endure, what you record, what you channel.',
    },
];

export function buildJournal(character: GameCharacter, initiated: boolean): JournalEntry[] {
    if (!initiated) return [];
    const entries: JournalEntry[] = [...BASE_ENTRIES];

    if (character.name) {
        entries.push({
            id: 'name',
            title: character.name,
            category: 'truth',
            section: 'origin',
            subtitle: 'Soul record',
            body: `A soul named ${character.name} stepped into the light. The Codex begins to remember.`,
        });
    }

    if (character.path) {
        const path = PATH_BY_ID[character.path];
        entries.push({
            id: `path_${character.path}`,
            title: path?.name ?? `Path of the ${character.path}`,
            category: 'path',
            section: 'origin',
            subtitle: path?.essence,
            detail: path ? `Power — ${path.power}` : undefined,
            body: path
                ? `${path.weakness} This is the cost of the road you chose. Its blessings and its weight are yours now.`
                : `You embraced the way of the ${character.path}. Its power and its cost are yours now.`,
        });
    }

    for (const qid of character.questsClaimed) {
        const q = QUESTS.find((x) => x.id === qid);
        if (!q) continue;
        entries.push({
            id: `quest_${qid}`,
            title: q.title,
            category: 'quest',
            section: 'missions',
            subtitle: `Given by ${q.giverName}`,
            detail: q.reward.text,
            body: q.completeText,
        });
    }

    if (character.discovered.includes('shade_stood')) {
        entries.push({
            id: 'shade_stood',
            title: 'Stood in the Open',
            category: 'quest',
            section: 'missions',
            subtitle: 'Witnessed by Truth',
            detail: 'The shades know your name.',
            body: 'A shade found you in the open cavern. You met it with iron, not fear. Anthony saw it — the wilderness respects only those who stop hiding.',
        });
    }

    for (const destId of character.cleared) {
        const dest = Object.values(DEST_BY_POI).find((d) => d.poiId === destId);
        if (!dest) continue;
        const victory = dest.combat?.victory || `The guardian of ${dest.name} fell. The way stands open.`;
        entries.push({
            id: `clear_${destId}`,
            title: dest.name,
            category: 'lore',
            section: 'conquests',
            subtitle: dest.era,
            detail: dest.deepLore
                ? `${dest.deepLore.heading} — ${dest.deepLore.body}`
                : `Guide — ${dest.guide.name}, ${dest.guide.role}`,
            body: victory,
        });
    }

    for (const relicId of character.inventory) {
        const dest = Object.values(DEST_BY_POI).find((d) => d.relics.some((r) => r.id === relicId));
        const relic = dest?.relics.find((r) => r.id === relicId);
        if (!relic) continue;
        entries.push({
            id: `relic_${relicId}`,
            title: relic.name,
            category: 'relic',
            section: 'relics',
            subtitle: dest?.name,
            detail: relic.power?.label,
            body: relic.desc,
        });
    }

    const edenLoreOrder = ['lore_threshold', 'lore_ordering', 'lore_serpent', 'lore_exile', 'lore_sanctum', 'lore_secret'];
    for (const loreKey of edenLoreOrder) {
        const discId = `eden_${loreKey}`;
        if (!character.discovered.includes(discId)) continue;
        const lore = EDEN_LORE[loreKey as keyof typeof EDEN_LORE];
        if (!lore) continue;
        entries.push({
            id: discId,
            title: lore.title,
            category: 'lore',
            section: 'eden',
            subtitle: 'Golden stone · Eden',
            body: lore.text,
        });
    }

    const wingOrder = Object.keys(WING_TITLES);
    const wingDiscovered = character.discovered
        .filter((d) => d.startsWith('eden_wing_'))
        .sort((a, b) => wingOrder.indexOf(a.replace('eden_', '')) - wingOrder.indexOf(b.replace('eden_', '')));
    for (const discId of wingDiscovered) {
        const wingKey = discId.replace('eden_', '');
        const line = EDEN_GARDENER_LINES[wingKey];
        if (!line) continue;
        entries.push({
            id: discId,
            title: WING_TITLES[wingKey] ?? wingKey,
            category: 'lore',
            section: 'eden',
            subtitle: 'The Gardener speaks',
            body: line,
        });
    }

    if (character.discovered.includes('eden_temptation_resisted')) {
        entries.push({
            id: 'eden_temptation_resisted',
            title: 'The Road Chosen',
            category: 'lore',
            section: 'eden',
            subtitle: 'Forbidden Verge',
            detail: 'Walk on — do not trade the road for a whisper.',
            body: 'In the Forbidden Verge you heard the serpent\'s whisper — a shortcut promising knowledge without walking. You walked on. That is how man once knew the Source.',
        });
    }

    if (character.discovered.includes('eden_temptation_accepted')) {
        entries.push({
            id: 'eden_temptation_accepted',
            title: 'The False Shortcut',
            category: 'lore',
            section: 'eden',
            subtitle: 'Forbidden Verge',
            detail: 'Knowing without walking was always the lie.',
            body: 'You listened to the whisper and took the serpent\'s path. The ground buckled. A shade rose from the dust of the lie — mercy is still to walk the true road afterward.',
        });
    }

    for (const page of truthAccountPages(character)) {
        entries.push({
            id: `truth_account_${page.questionId}`,
            title: page.title,
            category: 'truth',
            section: 'truth_account',
            subtitle: 'Ask Truth · permanent record',
            body: page.body,
        });
    }

    if (character.questsClaimed.includes('q_truth_last_run')) {
        entries.push({
            id: 'truth_last_run_witness',
            title: 'Witness to the Last Run',
            category: 'truth',
            section: 'truth_account',
            subtitle: 'Anthony · final circuit',
            detail: 'Not follower — witness.',
            body: 'You walked Anthony\'s road with him — pried the hood, took up iron, stood against the shades, and returned. He calls you witness, not follower. Give it back to the Source, and go all the way with him.',
        });
    }

    if (character.sourceReturned) {
        entries.push({
            id: 'source',
            title: 'Return to the Source',
            category: 'truth',
            section: 'epilogue',
            subtitle: 'Season I complete',
            detail: 'Five relics burned as one.',
            body: 'The five relics burned as one. You did not come back to the Source — you woke and found you had never left it. Season II awaits those who carry the light forward.',
        });
    }

    return entries;
}

/** Group journal entries into ordered sections; empty sections are omitted. */
export function buildJournalSections(character: GameCharacter, initiated: boolean): JournalSection[] {
    const entries = buildJournal(character, initiated);
    const bySection = new Map<JournalSectionId, JournalEntry[]>();

    for (const e of entries) {
        const list = bySection.get(e.section) ?? [];
        list.push(e);
        bySection.set(e.section, list);
    }

    return (Object.keys(JOURNAL_SECTION_META) as JournalSectionId[])
        .sort((a, b) => JOURNAL_SECTION_META[a].order - JOURNAL_SECTION_META[b].order)
        .map((id) => ({
            id,
            title: JOURNAL_SECTION_META[id].title,
            subtitle: JOURNAL_SECTION_META[id].subtitle,
            entries: bySection.get(id) ?? [],
        }))
        .filter((s) => s.entries.length > 0);
}