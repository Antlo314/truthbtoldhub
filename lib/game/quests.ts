import type { GameCharacter } from '@/lib/store/useGameStore';
import { isNpcQuestActive, EDEN_SEALED } from '@/lib/game/progression';
import { truthDepth } from '@/lib/game/truthLore';

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
    | { kind: 'anyProgress' }
    | { kind: 'truthThreads'; count: number }
    | { kind: 'armed' }
    | { kind: 'discovered'; id: string };

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
        id: 'q_hut_begin',
        giver: 'hut',
        giverName: 'Truth',
        title: 'Walk the Chamber',
        intro: 'The cavern is wide and the souls within have words for you. Roam once, forge your first weapon here at the Hut, and return when the road stirs.',
        objectiveText: 'Discover a hidden place, defeat a shade, or forge your first weapon.',
        objective: { kind: 'anyProgress' },
        reward: { skillPoints: 1, text: '+1 skill point; the chamber knows your name.' },
        completeText: 'Good. You have begun to move. Speak with the souls at the edges of this world — their missions will sharpen you.',
    },
    {
        id: 'q_truth_pry',
        giver: 'hut',
        giverName: 'Truth',
        title: 'Pry the Hood',
        requires: ['q_hut_begin'],
        intro: 'You have walked — now sit with me. I do not give my whole account to passersby. Ask three threads in Ask Truth, and I will know you are not merely touring the chamber.',
        objectiveText: 'Open three threads in Ask Truth.',
        objective: { kind: 'truthThreads', count: 3 },
        reward: { skillPoints: 1, text: '+1 skill point; Brother Truth remembers you.' },
        completeText: 'You pried, and I answered. What you heard is written in your Codex Journal. The hood is lighter when someone listens.',
    },
    {
        id: 'q_truth_arm',
        giver: 'hut',
        giverName: 'Truth',
        title: 'Take Up Iron',
        requires: ['q_truth_pry'],
        intro: 'Shades roam the open cavern. I walked unarmed in my wilderness — do not imitate that folly. Forge your first weapon here, and carry it into the road.',
        objectiveText: 'Forge and equip a weapon at Truth\'s Hut.',
        objective: { kind: 'armed' },
        reward: { skillPoints: 1, text: '+1 skill point; you are armed for the last run.' },
        completeText: 'Iron in hand. Now stand in the open where the shades hunt — and do not run.',
    },
    {
        id: 'q_truth_stand',
        giver: 'hut',
        giverName: 'Truth',
        title: 'Stand in the Open',
        requires: ['q_truth_arm'],
        intro: 'A shade will find you if you roam long enough. Meet it with your weapon — not with fear. I will know you stood when the journal records it.',
        objectiveText: 'Defeat a shade in the overworld.',
        objective: { kind: 'discovered', id: 'shade_stood' },
        reward: { skillPoints: 1, text: '+1 skill point; the shades know your name.' },
        completeText: 'You stood. I saw it. The wilderness respects only those who stop hiding.',
    },
    {
        id: 'q_truth_last_run',
        giver: 'hut',
        giverName: 'Truth',
        title: 'Witness the Last Run',
        requires: ['q_truth_stand'],
        intro: 'This is my final circuit. Walk it with me — open five threads of my account, and claim your place as witness. What we build here must outlive my weakness.',
        objectiveText: 'Open five threads in Ask Truth.',
        objective: { kind: 'truthThreads', count: 5 },
        reward: { skillPoints: 2, text: '+2 skill points; Witness to the Last Run — recorded in your Codex Journal.' },
        completeText: 'Witness. Not follower — witness. Anthony\'s last run has your name beside it now. Give it back to the Source, and go all the way with me.',
    },
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
        requires: ['q_hut_begin'],
        intro: 'You have walked the chamber. Now learn the forge. Descend into Giza and strike the iron nodes in the tomb — three pieces are enough to temper your first upgrade at Truth\'s Hut.',
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

const EDEN_QUEST_IDS = new Set(['q_eden_gate', 'q_eden_rivers']);

export function questsAvailable(giver: string, c: GameCharacter): Quest[] {
    return QUESTS.filter((q) => {
        if (q.giver !== giver) return false;
        if (EDEN_SEALED && EDEN_QUEST_IDS.has(q.id)) return false;
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
    if (o.kind === 'truthThreads') return truthDepth(c) >= o.count;
    if (o.kind === 'armed') return !!c.equipped.weapon;
    if (o.kind === 'discovered') return c.discovered.includes(o.id);
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
    if (o.kind === 'truthThreads') {
        return `${Math.min(truthDepth(c), o.count)} / ${o.count} threads`;
    }
    if (o.kind === 'armed') return c.equipped.weapon ? 'Armed' : 'Forge at the Hut';
    if (o.kind === 'discovered') return c.discovered.includes(o.id) ? 'Complete' : 'Not yet';
    return objectiveMet(q, c) ? 'Complete' : 'Not yet';
}