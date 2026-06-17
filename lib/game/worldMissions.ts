import type { Quest, QuestObjective } from '@/lib/game/quests';
import { DEST_BY_POI } from '@/lib/game/destinations';

// ============================================================
//  WORLD MISSION CHAINS — each age guide assigns a linear
//  sequence: unique obstacles → boss fight → relic retrieval.
//  Difficulty rises along Eden → Giza → Fair → Kolbrin → Emerald.
// ============================================================

export type MissionPhase = 'obstacle' | 'boss' | 'relic';

export interface WorldMissionTemplate {
    title: string;
    intro: string;
    objectiveText: string;
    objective: QuestObjective;
    completeText: string;
    rewardText: string;
    skillPoints: number;
    phase: MissionPhase;
    grantsScroll?: string;
}

export interface WorldMissionChain {
    destId: string;
    giver: string;
    giverName: string;
    tier: number;
    missions: WorldMissionTemplate[];
}

function sp(tier: number, phase: MissionPhase): number {
    if (phase === 'relic') return 1 + Math.ceil(tier / 2);
    if (phase === 'boss') return tier >= 4 ? 2 : 1;
    return 1;
}

export const WORLD_MISSION_CHAINS: WorldMissionChain[] = [
    {
        destId: 'dest_eden',
        giver: 'npc_gardener',
        giverName: 'The Gardener',
        tier: 1,
        missions: [
            {
                phase: 'obstacle',
                title: 'Read the Threshold',
                intro: 'Before you hunt shades, listen to the ground. The first golden stone beside the threshold road holds the hour before shame — read it, and the garden will know you are not a tourist.',
                objectiveText: 'Read the threshold inscription in Eden.',
                objective: { kind: 'discovered', id: 'eden_lore_threshold' },
                completeText: 'The stone remembers. Now the shades will rise to test whether you can walk as man once walked.',
                rewardText: '+1 skill point; the threshold knows your name.',
                skillPoints: sp(1, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Shade Lessons',
                intro: 'Three shades roam the open roads — memories of the lie. Clear each trial circle before you go north. Arm yourself at Truth\'s Hut if you have not.',
                objectiveText: 'Clear all three shade trials in the garden.',
                objective: { kind: 'discoveredAll', ids: ['eden_fight_1', 'eden_fight_2', 'eden_fight_3'] },
                completeText: 'The grove grows quiet. Keys and vaults lie open on the roads you have earned.',
                rewardText: '+1 skill point; the garden trusts your stride.',
                skillPoints: sp(1, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Trial of Memory',
                intro: 'The garden tests pattern before it tests courage. Match the sacred signs in the trial — only then may the four rivers be attuned.',
                objectiveText: 'Pass the Trial of Memory in Eden.',
                objective: { kind: 'minigame', minigameId: 'mg_eden_match' },
                completeText: 'The signs burn true. The rivers may be walked in their ancient order.',
                rewardText: '+1 skill point; the trial of memory is passed.',
                skillPoints: sp(1, 'obstacle'),
            },
            {
                phase: 'boss',
                title: 'The Flaming Sword',
                intro: 'The Cherub does not chase the exile — it keeps the way back. When your vitality is high, enter the red circle on the north terrace and endure the flaming sword.',
                objectiveText: 'Defeat the Cherub of the Flaming Sword.',
                objective: { kind: 'clear', destId: 'dest_eden' },
                completeText: 'The flaming sword lowers. The sanctum pool opens — attune the four rivers at the corner fountains.',
                rewardText: '+1 skill point and the Gardener\'s blessing.',
                skillPoints: sp(1, 'boss'),
            },
            {
                phase: 'relic',
                title: 'Leaf of the Tree of Life',
                intro: 'Pishon, Gihon, Hiddekel, Euphrates — walk the corner fountains in order, then stand beneath the Tree. The Leaf does not wither because it remembers when death was not yet custom.',
                objectiveText: 'Attune the four rivers and claim the Leaf of Life.',
                objective: { kind: 'collect', relicId: 'relic_eden_leaf' },
                completeText: 'The Leaf is yours. Carry it forward — the garden remembers those who walked beside the Source.',
                rewardText: '+2 skill points and the Scroll of the Four Rivers.',
                skillPoints: sp(1, 'relic'),
                grantsScroll: 'scroll_rivers',
            },
        ],
    },
    {
        destId: 'dest_giza',
        giver: 'npc_hana',
        giverName: 'Hana',
        tier: 2,
        missions: [
            {
                phase: 'obstacle',
                title: 'Ore of the Engine',
                intro: 'They call these tombs. Strike the iron nodes in the descent — three pieces are enough to temper your will for what hums below.',
                objectiveText: 'Gather 3 Iron Ore from Giza.',
                objective: { kind: 'materials', iron: 3 },
                completeText: 'Good. The ore is hot with memory. The serpent path awaits.',
                rewardText: '+1 skill point; carry the ore to Truth\'s Forge when you are ready.',
                skillPoints: sp(2, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Serpent of the Shaft',
                intro: 'The tomb winds like a living serpent. Gather the luminous orbs without striking stone — the machine tests reflex before it tests faith.',
                objectiveText: 'Pass the Trial of the Serpent Path.',
                objective: { kind: 'minigame', minigameId: 'mg_giza_snake' },
                completeText: 'The serpent path is walked. Now set the measure of the stone.',
                rewardText: '+1 skill point; the shaft answers your footfall.',
                skillPoints: sp(2, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Measure of the Stone',
                intro: 'Four faces, two shafts, three chambers — the pyramid is a machine of measure, not a grave. Set the dials and the granite will yield its secret.',
                objectiveText: 'Solve the riddle of Giza — set the measure of the stone.',
                objective: { kind: 'solve', puzzleId: 'puz_giza' },
                completeText: 'The granite slides aside in your memory. The Sentinel still waits — but you have heard the hum.',
                rewardText: '+1 skill point and the Scroll of Measure.',
                skillPoints: sp(2, 'obstacle'),
                grantsScroll: 'scroll_measure',
            },
            {
                phase: 'boss',
                title: 'Sentinel of Stone',
                intro: 'No king sleeps here — only a guardian set to keep the engine\'s secret. Face the Sentinel when your weapon is true.',
                objectiveText: 'Defeat the Sentinel of Stone.',
                objective: { kind: 'clear', destId: 'dest_giza' },
                completeText: 'The guardian dissolves into dust. The hum steadies — the chamber accepts you.',
                rewardText: '+1 skill point; Hana\'s trust is earned.',
                skillPoints: sp(2, 'boss'),
            },
            {
                phase: 'relic',
                title: 'Shard of Casing Stone',
                intro: 'A sliver of the white limestone skin remains — the casing that once made the pyramid blaze like a mirror. Claim it from the King\'s Chamber.',
                objectiveText: 'Claim the Shard of Casing Stone.',
                objective: { kind: 'collect', relicId: 'relic_giza_shard' },
                completeText: 'The shard burns cold in your satchel. What was buried breathes again.',
                rewardText: '+2 skill points; the Black Land records you.',
                skillPoints: sp(2, 'relic'),
            },
        ],
    },
    {
        destId: 'dest_fair',
        giver: 'npc_mabel',
        giverName: 'Mabel Hart',
        tier: 3,
        missions: [
            {
                phase: 'obstacle',
                title: 'Blocks of the White City',
                intro: 'Twelve hundred palaces raised in a season — block upon block. Stack the plaster shapes and clear the rows; the Fair tests whether you can build what they claimed was temporary.',
                objectiveText: 'Pass the Trial of the White Blocks.',
                objective: { kind: 'minigame', minigameId: 'mg_fair_stack' },
                completeText: 'The white city stacks true. The turnstile year may be set.',
                rewardText: '+1 skill point; Mabel notes your patience.',
                skillPoints: sp(3, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Year of the Ivory City',
                intro: 'The turnstile is locked to a year — the year the ivory city rose and vanished within a single season. Set the four dials and the Erased will drift aside.',
                objectiveText: 'Solve the riddle of St. Louis — set the year of the Fair.',
                objective: { kind: 'solve', puzzleId: 'puz_fair' },
                completeText: 'Nineteen hundred and four. The gates swing wide — but the Caretaker still keeps his ledger.',
                rewardText: '+1 skill point and Mabel\'s chronicle.',
                skillPoints: sp(3, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Copper Sheets of the Dynamo',
                intro: 'The light that powered this city left copper sheets scattered through the halls — dodge the spotlights, gather three, and prove you read what the dynamos still whisper.',
                objectiveText: 'Gather 3 Copper Sheets from the Fair.',
                objective: { kind: 'materials', copper: 3 },
                completeText: 'Brass truth in hand. The Caretaker\'s circle lies ahead.',
                rewardText: '+1 skill point; the dynamos remember you.',
                skillPoints: sp(3, 'obstacle'),
            },
            {
                phase: 'boss',
                title: 'The Erased Ledger',
                intro: 'The Caretaker keeps his ledger of forgotten souls. Break his hold on the Fair — the Erased will not let you pass without a fight.',
                objectiveText: 'Defeat the Caretaker of the Fair.',
                objective: { kind: 'clear', destId: 'dest_fair' },
                completeText: 'His ledger burns. What was hidden in the white halls is yours to read.',
                rewardText: '+2 skill points; the ivory city remembers you.',
                skillPoints: sp(3, 'boss'),
            },
            {
                phase: 'relic',
                title: 'Fairgrounds Token',
                intro: 'Brass stamped with a building no record admits ever stood. Claim the token — proof the Fair was never merely plaster.',
                objectiveText: 'Claim the Fairgrounds Token.',
                objective: { kind: 'collect', relicId: 'relic_fair_token' },
                completeText: 'The token is yours. Carry it — the Erased no longer reach for your name.',
                rewardText: '+2 skill points; the vanished city admits you.',
                skillPoints: sp(3, 'relic'),
            },
        ],
    },
    {
        destId: 'dest_kolbrin',
        giver: 'npc_eli',
        giverName: 'Eli',
        tier: 4,
        missions: [
            {
                phase: 'obstacle',
                title: 'Drowned Maze',
                intro: 'The vault floods with winding paths. Thread the drowned maze — faster and hungrier than the garden serpent — before the Bronzebook will open its cipher.',
                objectiveText: 'Pass the Trial of the Drowned Maze.',
                objective: { kind: 'minigame', minigameId: 'mg_kolbrin_snake' },
                completeText: 'The maze yields. The encrypted letters wait among the shelves.',
                rewardText: '+1 skill point; the flood remembers your step.',
                skillPoints: sp(4, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Letters of the Destroyer',
                intro: 'Eight floating letters sleep in the ink — Z, R, U, P, and the rest. Gather every glyph among the shades, then bring them to the central wheel.',
                objectiveText: 'Collect all eight encrypted letters in the Vault.',
                objective: { kind: 'discovered', id: 'kolbrin_runes_gathered' },
                completeText: 'The letters are whole. The wheel may turn — if you know the name of the bitter star.',
                rewardText: '+1 skill point; the Culdee scribes mark your passage.',
                skillPoints: sp(4, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Name of the Destroyer',
                intro: 'Scripture sealed the burning star behind a turning of letters. Set the wheel to WORMWOOD and the Bronzebook turns its own page.',
                objectiveText: 'Solve the riddle of the Kolbrin — name the Destroyer.',
                objective: { kind: 'solve', puzzleId: 'puz_kolbrin' },
                completeText: 'WORMWOOD — you spoke it. The herald rises from the black water to test whether you will keep it.',
                rewardText: '+1 skill point and the Scroll of Wormwood.',
                skillPoints: sp(4, 'obstacle'),
                grantsScroll: 'scroll_wormwood',
            },
            {
                phase: 'boss',
                title: 'Herald of the Destroyer',
                intro: 'The vault remembers the flood. The herald guards the Bronzebook from unworthy hands — strike it down.',
                objectiveText: 'Defeat the Destroyer\'s Herald.',
                objective: { kind: 'clear', destId: 'dest_kolbrin' },
                completeText: 'The herald sinks beneath the still black water. The folio lies open.',
                rewardText: '+2 skill points; forbidden history trusts you.',
                skillPoints: sp(4, 'boss'),
            },
            {
                phase: 'relic',
                title: 'Folio of the Bronzebook',
                intro: 'A single page, bronze-leafed, warm as if recently read. Claim it — the Destroyer\'s cycle is not only a name, it is a warning.',
                objectiveText: 'Claim the Folio of the Bronzebook.',
                objective: { kind: 'collect', relicId: 'relic_kolbrin_folio' },
                completeText: 'The folio is yours. Knowledge is its own kind of power — and its own kind of burden.',
                rewardText: '+3 skill points; the vault seals behind you in respect.',
                skillPoints: sp(4, 'relic'),
            },
        ],
    },
    {
        destId: 'dest_emerald',
        giver: 'npc_hermes',
        giverName: 'Hermes Trismegistus',
        tier: 5,
        missions: [
            {
                phase: 'obstacle',
                title: 'Seven Spheres Falling',
                intro: 'As above, so below — the spheres fall in seven-fold rhythm. Clear the celestial rows before you trace the wanderers across the painted sky.',
                objectiveText: 'Pass the Trial of the Seven Spheres.',
                objective: { kind: 'minigame', minigameId: 'mg_emerald_stack' },
                completeText: 'The spheres align. The wanderers hang in their ancient order.',
                rewardText: '+1 skill point; the Threshold listens.',
                skillPoints: sp(5, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'As Above, So Below',
                intro: 'Trace the seven wanderers from the highest, slowest sphere down to the nearest and swiftest — Saturn to Moon — and you draw the pattern of all things.',
                objectiveText: 'Solve the riddle of the Emerald Halls — trace the seven wanderers.',
                objective: { kind: 'solve', puzzleId: 'puz_emerald' },
                completeText: 'The line runs true. Cosmic shards still sleep in the halls — gather them before the Guardian wakes.',
                rewardText: '+1 skill point; the Tablets stir.',
                skillPoints: sp(5, 'obstacle'),
            },
            {
                phase: 'obstacle',
                title: 'Shards of the Sunken Gateway',
                intro: 'Green glass sleeps in the corridors — cosmic residue of a science older than the flood. Gather three shards; the telescope will not lie to an empty hand.',
                objectiveText: 'Gather 3 Cosmic Shards from the Emerald Halls.',
                objective: { kind: 'materials', cosmic: 3 },
                completeText: 'The shards hum in your satchel. The Guardian of the Threshold awaits.',
                rewardText: '+1 skill point; the sunken gateway knows your frequency.',
                skillPoints: sp(5, 'obstacle'),
            },
            {
                phase: 'boss',
                title: 'Guardian of the Threshold',
                intro: 'No one reads the Tablets unchallenged. The thought-forms of every age rise — and the Guardian rises with them.',
                objectiveText: 'Defeat the Guardian of the Threshold.',
                objective: { kind: 'clear', destId: 'dest_emerald' },
                completeText: 'The Guardian inclines its head. "Pass," says Hermes. "You have earned the All."',
                rewardText: '+2 skill points and the Scroll of the Seven Wanderers.',
                skillPoints: sp(5, 'boss'),
                grantsScroll: 'scroll_stars',
            },
            {
                phase: 'relic',
                title: 'Fragment of the Emerald Tablet',
                intro: 'Green glass that holds light long after the room goes dark. Claim the fragment — the thirteenth tablet remembers you.',
                objectiveText: 'Claim the Fragment of the Emerald Tablet.',
                objective: { kind: 'collect', relicId: 'relic_emerald_fragment' },
                completeText: 'The fragment is yours. Man, know thyself — and thou shalt know the All.',
                rewardText: '+3 skill points; the Halls seal in gold behind you.',
                skillPoints: sp(5, 'relic'),
            },
        ],
    },
];

/** Build chained Quest entries from world mission templates. */
export function buildWorldQuests(): Quest[] {
    const out: Quest[] = [];
    for (const chain of WORLD_MISSION_CHAINS) {
        const total = chain.missions.length;
        const destName = DEST_BY_POI[chain.destId]?.name ?? chain.destId;
        chain.missions.forEach((m, i) => {
            const step = i + 1;
            const prevId = i > 0 ? `q_${chain.destId.replace('dest_', '')}_m${i}` : undefined;
            out.push({
                id: `q_${chain.destId.replace('dest_', '')}_m${step}`,
                giver: chain.giver,
                giverName: chain.giverName,
                title: m.title,
                intro: m.intro,
                objectiveText: m.objectiveText,
                objective: m.objective,
                reward: { skillPoints: m.skillPoints, text: m.rewardText },
                completeText: m.completeText,
                requires: prevId ? [prevId] : undefined,
                grantsScroll: m.grantsScroll,
                missionStep: step,
                missionTotal: total,
                destId: chain.destId,
                missionPhase: m.phase,
                tier: chain.tier,
            });
        });
    }
    return out;
}

export function worldMissionChainFor(destId: string): WorldMissionChain | undefined {
    return WORLD_MISSION_CHAINS.find((c) => c.destId === destId);
}