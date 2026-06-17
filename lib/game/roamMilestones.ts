import type { GameCharacter } from '@/lib/store/useGameStore';
import { HIDDEN_POIS, PATH_HIDDEN_POIS } from '@/lib/game/hiddenPois';

// ============================================================
//  ROAM MILESTONES — open-world goals without quest chains.
//  Stored in character.discovered as roam_ms_* (award) and
//  roam_visit_* / roam_shade_win_* (progress ticks).
// ============================================================

export const ROAM_VISIT_PREFIX = 'roam_visit_';
export const ROAM_MILESTONE_PREFIX = 'roam_ms_';

export const ROAM_DESTINATION_IDS = [
    'dest_eden',
    'dest_emerald',
    'dest_fair',
    'dest_giza',
    'dest_kolbrin',
] as const;

const HIDDEN_DISCOVER_IDS = [
    ...HIDDEN_POIS.map((p) => p.discoverId),
    ...PATH_HIDDEN_POIS.map((p) => p.discoverId),
];

export interface RoamMilestone {
    id: string;
    title: string;
    toast: string;
    subtitle: string;
    body: string;
    order: number;
    met: (c: GameCharacter) => boolean;
}

export const ROAM_MILESTONES: RoamMilestone[] = [
    {
        id: 'roam_ms_armed',
        title: 'First Iron Drawn',
        toast: '✦ Road remembered · First Iron Drawn',
        subtitle: 'Truth\'s Hut · The forge',
        body: 'You shaped wood and will into a weapon. The cavern no longer receives you unarmed — the shades will learn your name.',
        order: 10,
        met: (c) => !!c.equipped.weapon,
    },
    {
        id: 'roam_ms_first_mote',
        title: 'Essence Gathered',
        toast: '✦ Road remembered · Essence Gathered',
        subtitle: 'The wide grass',
        body: 'Iron, copper, or cosmic motes answered your steps. The world scatters abundance for those who roam farther than the Hut.',
        order: 20,
        met: (c) => (c.materials?.iron ?? 0) + (c.materials?.copper ?? 0) + (c.materials?.cosmic ?? 0) >= 1,
    },
    {
        id: 'roam_ms_shade_stood',
        title: 'Stood in the Open',
        toast: '✦ Road remembered · Stood in the Open',
        subtitle: 'Wild cavern',
        body: 'A wandering shade found you between destinations. You met it with iron, not fear. The wilderness respects only those who stop hiding.',
        order: 30,
        met: (c) => c.discovered.includes('shade_stood'),
    },
    {
        id: 'roam_ms_shades_five',
        title: 'Five Shades Broken',
        toast: '✦ Road remembered · Five Shades Broken',
        subtitle: 'Wild cavern · five victories',
        body: 'Five packs of wandering shades scattered before you. The cavern grows quieter when a soul learns to stand without a quest-giver cheering them on.',
        order: 40,
        met: (c) => wildShadeWinCount(c) >= 5,
    },
    {
        id: 'roam_ms_first_relic',
        title: 'First Relic Claimed',
        toast: '✦ Road remembered · First Relic Claimed',
        subtitle: 'An age answered',
        body: 'A relic from a fallen age now hums in your satchel. Each fragment is a lie undone — and a door still open.',
        order: 50,
        met: (c) => c.inventory.length >= 1,
    },
    {
        id: 'roam_ms_first_gate',
        title: 'First Gate Entered',
        toast: '✦ Road remembered · First Gate Entered',
        subtitle: 'Portal or vault',
        body: 'You stepped through the first gate — portal or cave — and walked an age on its own terms. The main chamber is hub, not home.',
        order: 60,
        met: (c) => visitedDestinations(c).length >= 1,
    },
    {
        id: 'roam_ms_first_guardian',
        title: 'First Guardian Felled',
        toast: '✦ Road remembered · First Guardian Felled',
        subtitle: 'A seal broken',
        body: 'A guardian fell and a road opened. You did not need a mission scroll to know it mattered — the world simply let you through.',
        order: 70,
        met: (c) => c.cleared.length >= 1,
    },
    {
        id: 'roam_ms_three_relics',
        title: 'Threefold Gathering',
        toast: '✦ Road remembered · Threefold Gathering',
        subtitle: 'Satchel resonance',
        body: 'Three relics burn near one another in your satchel. They begin to answer each other — the chord of return is not fantasy; it is inventory.',
        order: 80,
        met: (c) => c.inventory.length >= 3,
    },
    {
        id: 'roam_ms_hidden_way',
        title: 'Hidden Way Found',
        toast: '✦ Road remembered · Hidden Way Found',
        subtitle: 'Off the mapped road',
        body: 'You found a place the common map forgot — grove, wall, archive, or pool. The Seer and the paths remember what empires pave over.',
        order: 90,
        met: (c) => HIDDEN_DISCOVER_IDS.some((id) => c.discovered.includes(id)),
    },
    {
        id: 'roam_ms_all_gates',
        title: 'Every Gate Touched',
        toast: '✦ Road remembered · Every Gate Touched',
        subtitle: 'Five roads from the Hut',
        body: 'Eden, Emerald, the Fair, Giza, and Kolbrin — you walked them all from the central chamber. The cavern is fully open to your feet.',
        order: 100,
        met: (c) => ROAM_DESTINATION_IDS.every((id) => visitedDestinations(c).includes(id)),
    },
];

export function wildShadeWinCount(c: GameCharacter): number {
    return c.discovered.filter((d) => d.startsWith('roam_shade_win_')).length;
}

export function visitedDestinations(c: GameCharacter): string[] {
    return c.discovered
        .filter((d) => d.startsWith(ROAM_VISIT_PREFIX))
        .map((d) => d.slice(ROAM_VISIT_PREFIX.length));
}

export function destinationVisitId(poiId: string): string {
    return `${ROAM_VISIT_PREFIX}${poiId}`;
}

export function nextWildShadeWinId(c: GameCharacter): string {
    return `roam_shade_win_${wildShadeWinCount(c) + 1}`;
}

export function newlyMetRoamMilestones(c: GameCharacter): RoamMilestone[] {
    return ROAM_MILESTONES
        .filter((m) => m.met(c) && !c.discovered.includes(m.id))
        .sort((a, b) => a.order - b.order);
}

export function nextRoamMilestoneHint(c: GameCharacter): RoamMilestone | null {
    return ROAM_MILESTONES
        .filter((m) => !c.discovered.includes(m.id) && !m.met(c))
        .sort((a, b) => a.order - b.order)[0] ?? null;
}

export function roamMilestoneById(id: string): RoamMilestone | undefined {
    return ROAM_MILESTONES.find((m) => m.id === id);
}