import type { GameCharacter } from '@/lib/store/useGameStore';
import { DEST_BY_POI } from '@/lib/game/destinations';
import { EDEN_LORE, EDEN_GARDENER_LINES } from '@/lib/game/edenLevel';
import { knowledgeOutcomeFrom, wasUntempted } from '@/lib/game/eden/serpent';
import { truthAccountPages } from '@/lib/game/truthLore';
import { QUESTS } from '@/lib/game/quests';
import { ROAM_MILESTONES } from '@/lib/game/roamMilestones';
import { PATH_BY_ID } from '@/lib/game/paths';

export type JournalCategory = 'lore' | 'quest' | 'relic' | 'path' | 'truth';

export type JournalSectionId =
    | 'origin'
    | 'roam'
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
    roam: {
        title: 'Roads Walked',
        subtitle: 'Milestones of the open cavern — no quest-giver required',
        order: 1,
    },
    truth_account: {
        title: "Brother Truth's Account",
        subtitle: 'Pages opened in Ask Truth — Anthony beneath the hood',
        order: 2,
    },
    missions: {
        title: 'Missions Fulfilled',
        subtitle: 'Quests turned in at the crossroads of the world',
        order: 3,
    },
    conquests: {
        title: 'Places Conquered',
        subtitle: 'Guardians fallen and gates opened',
        order: 4,
    },
    eden: {
        title: 'Garden of Eden',
        subtitle: 'Stones, wings, and the hour before the lie',
        order: 5,
    },
    relics: {
        title: 'Relics Claimed',
        subtitle: 'Tokens carried forward from the ages',
        order: 6,
    },
    epilogue: {
        title: 'Return to Source',
        subtitle: 'Season I — the five flames as one',
        order: 7,
    },
};

const WING_TITLES: Record<string, string> = {
    wing_threshold: 'The Threshold',
    wing_outer_grove: 'The Outer Grove',
    wing_eastern_garden: 'The Eastern Garden',
    wing_pishon: 'The Land of Havilah',
    wing_verge: 'The Forbidden Verge',
    wing_gihon: 'The Springs of Cush',
    wing_hiddekel: 'The Swift Water',
    wing_antechamber: 'The Cherub Antechamber',
    wing_euphrates: 'The Great River',
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

    for (const m of ROAM_MILESTONES) {
        if (!character.discovered.includes(m.id)) continue;
        entries.push({
            id: m.id,
            title: m.title,
            category: 'truth',
            section: 'roam',
            subtitle: m.subtitle,
            body: m.body,
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

    const edenLoreOrder = ['lore_threshold', 'lore_naming', 'lore_havilah', 'lore_cush', 'lore_ordering', 'lore_serpent', 'lore_assyria', 'lore_euphrates', 'lore_exile', 'lore_sanctum'];
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

    // The Serpent's long arc — climax outcome + the undivided road.
    const knowledge = knowledgeOutcomeFrom(character.discovered);
    if (knowledge === 'refused') {
        entries.push({
            id: 'eden_knowledge_refused',
            title: 'The Road Chosen',
            category: 'lore',
            section: 'eden',
            subtitle: 'The Tree of Knowledge',
            detail: 'You turned from the tree and kept the road whole.',
            body: 'At the Tree of Knowledge the serpent offered the knowing-without-walking. You refused — not from fear of the knowing, but from trust in the walking. You arrive at the Source undivided.',
        });
    } else if (knowledge === 'tasted') {
        entries.push({
            id: 'eden_knowledge_tasted',
            title: 'The Long Way Home',
            category: 'lore',
            section: 'eden',
            subtitle: 'The Tree of Knowledge',
            detail: 'You know good and evil now — wholly, heavily, all at once.',
            body: 'You tasted, and the knowing flooded in unwalked. The shortcut was real; so is its weight. The road back to the Source did not close — it only grew honest. Walk it eyes open.',
        });
    }
    if (wasUntempted(character.discovered)) {
        entries.push({
            id: 'eden_untempted',
            title: 'The Untempted',
            category: 'lore',
            section: 'eden',
            subtitle: 'The Four Rivers',
            detail: 'Every whisper at every river — refused.',
            body: 'At each of the four rivers the serpent found you again with the same trade in new clothes. Four times you walked on. The Source was never at the end of a shortcut; it was in every mile you refused to skip.',
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