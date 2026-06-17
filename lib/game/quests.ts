import type { GameCharacter } from '@/lib/store/useGameStore';
import { isNpcQuestActive } from '@/lib/game/progression';

// ============================================================
//  QUESTS / MISSIONS — given by NPCs in the world (NOT the Hut;
//  the Hut is a community info hub). Each objective is checked
//  against the soul's existing progress (cleared / solved /
//  inventory), so quests complete naturally as you play.
//  Chained via `requires` — later missions unlock after turn-in.
// ============================================================

export type QuestObjective =
    | { kind: 'clear'; destId: string }
    | { kind: 'solve'; puzzleId: string }
    | { kind: 'collect'; relicId: string }
    | { kind: 'collectCount'; count: number }
    | { kind: 'materials'; iron?: number; copper?: number; cosmic?: number }
    | { kind: 'anyProgress' };

export interface Quest {
    id: string;
    giver: string;        // overworld NPC poi id
    giverName: string;
    title: string;
    intro: string;        // when first spoken to
    objectiveText: string;
    objective: QuestObjective;
    reward: { skillPoints: number; text: string };
    completeText: string; // on turn-in
    requires?: string[];  // quest ids that must be claimed first
    grantsScroll?: string;
}

export const QUESTS: Quest[] = [
    {
        id: 'q_cipher_welcome',
        giver: 'hut',
        giverName: 'Truth',
        title: 'A Soul Sent You',
        intro: 'Someone spoke your name into the wind before you arrived. The cipher still hums in the air — walk the world once and claim what they set aside for you.',
        objectiveText: 'Roam the cavern and discover one hidden place or clear one guardian.',
        objective: { kind: 'anyProgress' },
        reward: { skillPoints: 1, text: '+1 skill point; the referral seal awakens.' },
        completeText: 'The cipher fades — but its intent remains. You were expected. Walk forward.',
    },
    {
        id: 'q_eden_gate',
        giver: 'npc_gardener',
        giverName: 'The Gardener',
        title: 'Before the Fall',
        intro: 'The deep garden still remembers those who walked beside the Source — before the serpent spoke. Walk its stones, learn to fight the shades, and face the cherub at the inner gate. Only the armed may pass.',
        objectiveText: 'Walk the garden and defeat the cherub at the inner gate.',
        objective: { kind: 'clear', destId: 'dest_eden' },
        reward: { skillPoints: 1, text: '+1 skill point and the Gardener\'s blessing.' },
        completeText: 'The flaming sword lowers. The sanctum opens — attune the four rivers and claim what the Tree of Life keeps.',
    },
    {
        id: 'q_eden_rivers',
        giver: 'npc_gardener',
        giverName: 'The Gardener',
        title: 'The Four Rivers',
        requires: ['q_eden_gate'],
        intro: 'A river went out of Eden and parted into four heads. Attune them in the order the first book gives, and I will entrust you a page of the old tongue.',
        objectiveText: 'Solve the riddle of Eden — attune the four rivers.',
        objective: { kind: 'solve', puzzleId: 'puz_eden' },
        reward: { skillPoints: 1, text: '+1 skill point and the Scroll of the Four Rivers.' },
        completeText: 'Pishon, Gihon, Hiddekel, Euphrates — they run as one again. Take this scroll; other seals will yield to its memory.',
        grantsScroll: 'scroll_rivers',
    },
    {
        id: 'q_fair_city',
        giver: 'npc_mabel',
        giverName: 'Mabel Hart',
        title: 'The Year of the White City',
        intro: 'Twelve hundred palaces of plaster and light — and a turnstile locked to the year they rose. Walk the Fair and set the dials.',
        objectiveText: 'Solve the riddle of St. Louis — set the year of the Fair.',
        objective: { kind: 'solve', puzzleId: 'puz_fair' },
        reward: { skillPoints: 1, text: '+1 skill point and Mabel\'s chronicle.' },
        completeText: 'Nineteen hundred and four. The gates swing wide, and the Erased drift aside. The Caretaker still waits deeper in.',
    },
    {
        id: 'q_fair_guardian',
        giver: 'npc_mabel',
        giverName: 'Mabel Hart',
        title: 'The Erased Ledger',
        requires: ['q_fair_city'],
        intro: 'The Caretaker keeps his ledger of forgotten souls. Break his hold on the Fair, and brass truth is yours.',
        objectiveText: 'Defeat the Caretaker of the Fair.',
        objective: { kind: 'clear', destId: 'dest_fair' },
        reward: { skillPoints: 1, text: '+1 skill point; the ivory city remembers you.' },
        completeText: 'His ledger burns. What was hidden in the white halls is yours to read — and the copper sheets scattered there are yours to gather.',
    },
    {
        id: 'q_smelt',
        giver: 'npc_hana',
        giverName: 'Hana',
        title: 'Ore of the Engine',
        requires: ['q_eden_gate'],
        intro: 'You have seen a portal. Now learn the forge. Descend into Giza and strike the iron nodes in the tomb — three pieces are enough to temper your first upgrade at Truth\'s Hut.',
        objectiveText: 'Gather 3 Iron Ore from Giza.',
        objective: { kind: 'materials', iron: 3 },
        reward: { skillPoints: 1, text: '+1 skill point; carry the ore to Truth\'s Forge.' },
        completeText: 'Good. The ore is hot with memory. Return to Truth\'s Hut, open the forge, and smelt your staff into ironwood.',
    },
    {
        id: 'q_giza',
        giver: 'npc_hana',
        giverName: 'Hana',
        title: 'The Engine of Stone',
        intro: 'You have the look of one who will not be lied to — good. Descend into Giza, face what guards the great machine, and come back to tell me it is no tomb.',
        objectiveText: 'Defeat the guardian within Giza.',
        objective: { kind: 'clear', destId: 'dest_giza' },
        reward: { skillPoints: 1, text: '+1 skill point and Hana’s trust.' },
        completeText: 'No king — only a machine, and a guardian set to keep its secret. You begin to see. Take this; you have earned a measure of power.',
    },
    {
        id: 'q_hana_echo',
        giver: 'npc_hana',
        giverName: 'Hana',
        title: 'The Measure of the Stone',
        requires: ['q_giza'],
        intro: 'You have seen the chamber. Now hear what it measures. Set the order of its faces and shafts — the stone will teach you if you listen.',
        objectiveText: 'Solve the riddle of Giza — set the measure of the stone.',
        objective: { kind: 'solve', puzzleId: 'puz_giza' },
        reward: { skillPoints: 1, text: '+1 skill point and the Scroll of Measure.' },
        completeText: 'The granite slides aside in your memory. Take this page — it will open other seals of number and year.',
        grantsScroll: 'scroll_measure',
    },
    {
        id: 'q_kolbrin',
        giver: 'npc_eli',
        giverName: 'Eli',
        title: 'The Bitter Star',
        intro: 'I am a scribe of buried books. In the Kolbrin Vault sleeps the true name of the Destroyer. Solve the runes, speak it, and the hidden histories will open to you.',
        objectiveText: 'Solve the riddle of the Kolbrin — name the Destroyer.',
        objective: { kind: 'solve', puzzleId: 'puz_kolbrin' },
        reward: { skillPoints: 1, text: '+1 skill point and a page of forbidden history.' },
        completeText: 'WORMWOOD — you spoke it. The same star, in every tongue, in every age. Here. Knowledge is its own kind of power.',
        grantsScroll: 'scroll_wormwood',
    },
    {
        id: 'q_eli_cross',
        giver: 'npc_eli',
        giverName: 'Eli',
        title: 'The Emerald Word',
        requires: ['q_kolbrin'],
        intro: 'The Bronzebook points beyond itself — to halls of green glass where Thoth kept the All. Walk there, and bring me proof the threshold let you pass.',
        objectiveText: 'Defeat the guardian of the Emerald Halls.',
        objective: { kind: 'clear', destId: 'dest_emerald' },
        reward: { skillPoints: 1, text: '+1 skill point and the Scroll of the Seven Wanderers.' },
        completeText: 'Hermes inclined his head to you — I felt it from here. The wanderers are yours to trace.',
        grantsScroll: 'scroll_stars',
    },
    {
        id: 'q_relics',
        giver: 'npc_mara',
        giverName: 'Sister Mara',
        title: 'The Gathering',
        intro: 'Every relic you carry is a lie undone. Bring me three — recovered from the portals and the deep places — and I will show you what they become when gathered.',
        objectiveText: 'Carry three relics at once.',
        objective: { kind: 'collectCount', count: 3 },
        reward: { skillPoints: 2, text: '+2 skill points; the relics begin to hum in answer to one another.' },
        completeText: 'Three. Feel how they answer one another? This is only the beginning of what you may become.',
    },
    {
        id: 'q_mara_fivefold',
        giver: 'npc_mara',
        giverName: 'Sister Mara',
        title: 'The Fivefold Resonance',
        requires: ['q_relics'],
        intro: 'Three was the beginning. Five is the chord. Gather every fragment from every age, and I will show you the scroll that makes them sing as one.',
        objectiveText: 'Gather all five relics.',
        objective: { kind: 'collectCount', count: 5 },
        reward: { skillPoints: 2, text: '+2 skill points and the Scroll of Resonance.' },
        completeText: 'They burn as one in your satchel. The way back is opening — and every seal in the world grows weaker.',
        grantsScroll: 'scroll_resonance',
    },
];

export function questsAvailable(giver: string, c: GameCharacter): Quest[] {
    return QUESTS.filter((q) => {
        if (q.giver !== giver) return false;
        if (q.id === 'q_cipher_welcome') {
            if (typeof window === 'undefined') return false;
            if (!localStorage.getItem('cipher_referral')) return false;
        }
        if (!isNpcQuestActive(q.giver, c)) return false;
        if (!q.requires?.length) return true;
        return q.requires.every((id) => c.questsClaimed.includes(id));
    });
}

/** @deprecated use questsAvailable */
export function questsFor(giver: string): Quest[] {
    return QUESTS.filter((q) => q.giver === giver);
}

export function objectiveMet(q: Quest, c: GameCharacter): boolean {
    const o = q.objective;
    if (o.kind === 'clear') return c.cleared.includes(o.destId);
    if (o.kind === 'solve') return c.solved.includes(o.puzzleId);
    if (o.kind === 'collect') return c.inventory.includes(o.relicId);
    if (o.kind === 'collectCount') return c.inventory.length >= o.count;
    if (o.kind === 'materials') {
        const m = c.materials || { iron: 0, copper: 0, cosmic: 0 };
        if (o.iron && m.iron < o.iron) return false;
        if (o.copper && m.copper < o.copper) return false;
        if (o.cosmic && m.cosmic < o.cosmic) return false;
        return true;
    }
    if (o.kind === 'anyProgress') {
        return c.cleared.length > 0 || c.discovered.length > 0 || c.inventory.length > 0 || c.solved.length > 0;
    }
    return false;
}

export function objectiveProgress(q: Quest, c: GameCharacter): string {
    const o = q.objective;
    if (o.kind === 'collectCount') return `${Math.min(c.inventory.length, o.count)} / ${o.count} relics`;
    if (o.kind === 'materials') {
        const m = c.materials || { iron: 0, copper: 0, cosmic: 0 };
        const parts: string[] = [];
        if (o.iron) parts.push(`iron ${Math.min(m.iron, o.iron)}/${o.iron}`);
        if (o.copper) parts.push(`copper ${Math.min(m.copper, o.copper)}/${o.copper}`);
        if (o.cosmic) parts.push(`cosmic ${Math.min(m.cosmic, o.cosmic)}/${o.cosmic}`);
        return parts.join(' · ') || 'Complete';
    }
    return objectiveMet(q, c) ? 'Complete' : 'Not yet';
}