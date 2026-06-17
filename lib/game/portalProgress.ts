import type { GameCharacter } from '@/lib/store/useGameStore';
import { DEST_BY_POI, type Destination } from '@/lib/game/destinations';
import {
    activeDestinationFocus,
    EDEN_SEALED,
    isDestinationComplete,
    isDestinationUnlocked,
    playableDestinationOrder,
    unlockBlockMessage,
    type DestinationId,
} from '@/lib/game/progression';
import { destinationVisitId } from '@/lib/game/roamMilestones';

// ============================================================
//  PORTAL PROGRESSION BOARD — hut view of the five roads.
//  Guardian · Trial · Riddle · Relic per age.
// ============================================================

export type PortalStepId = 'guardian' | 'trial' | 'riddle' | 'relic';

export type PortalRowState = 'sealed' | 'locked' | 'open' | 'complete';

export interface PortalStep {
    id: PortalStepId;
    label: string;
    done: boolean;
}

export interface PortalBoardRow {
    poiId: DestinationId;
    name: string;
    era: string;
    accent: string;
    kind: Destination['kind'];
    order: number;
    state: PortalRowState;
    steps: PortalStep[];
    relicsClaimed: number;
    relicsTotal: number;
    visited: boolean;
    focus: boolean;
    sealNote?: string;
}

export interface PortalBoard {
    rows: PortalBoardRow[];
    completedCount: number;
    totalCount: number;
    focusId: DestinationId | null;
    allComplete: boolean;
}

function portalSteps(dest: Destination, c: GameCharacter): PortalStep[] {
    const steps: PortalStep[] = [];

    if (dest.combat) {
        steps.push({
            id: 'guardian',
            label: 'Guardian',
            done: c.cleared.includes(dest.poiId),
        });
    }
    if (dest.minigame) {
        steps.push({
            id: 'trial',
            label: 'Trial',
            done: (c.minigamesCleared || []).includes(dest.minigame.id),
        });
    }
    if (dest.puzzle) {
        steps.push({
            id: 'riddle',
            label: 'Riddle',
            done: c.solved.includes(dest.puzzle.id),
        });
    }
    if (dest.relics.length > 0) {
        const claimed = dest.relics.filter((r) => c.inventory.includes(r.id)).length;
        steps.push({
            id: 'relic',
            label: 'Relic',
            done: claimed >= dest.relics.length,
        });
    }

    return steps;
}

function rowState(poiId: DestinationId, c: GameCharacter): PortalRowState {
    if (poiId === 'dest_eden' && EDEN_SEALED) return 'sealed';
    if (!isDestinationUnlocked(poiId, c)) return 'locked';
    if (isDestinationComplete(poiId, c)) return 'complete';
    return 'open';
}

export function buildPortalBoard(c: GameCharacter): PortalBoard {
    const order = playableDestinationOrder();
    const focusId = activeDestinationFocus(c);
    const rows: PortalBoardRow[] = [];

    for (let i = 0; i < order.length; i++) {
        const poiId = order[i];
        const dest = DEST_BY_POI[poiId];
        if (!dest) continue;

        const state = rowState(poiId, c);
        const relicsClaimed = dest.relics.filter((r) => c.inventory.includes(r.id)).length;

        rows.push({
            poiId,
            name: dest.name,
            era: dest.era,
            accent: dest.accent,
            kind: dest.kind,
            order: i + 1,
            state,
            steps: portalSteps(dest, c),
            relicsClaimed,
            relicsTotal: dest.relics.length,
            visited: c.discovered.includes(destinationVisitId(poiId)),
            focus: focusId === poiId,
            sealNote: state === 'locked' ? unlockBlockMessage(poiId) : undefined,
        });
    }

    const completedCount = rows.filter((r) => r.state === 'complete').length;

    return {
        rows,
        completedCount,
        totalCount: rows.length,
        focusId,
        allComplete: completedCount === rows.length && rows.length > 0,
    };
}

export function nextPortalStepHint(row: PortalBoardRow): string | null {
    if (row.state === 'sealed') return 'The garden veil has not yet lifted.';
    if (row.state === 'locked') return row.sealNote || 'Complete the prior road first.';
    if (row.state === 'complete') return 'This gate stands fully open.';
    const pending = row.steps.find((s) => !s.done);
    if (!pending) return 'Walk the chamber and claim what remains.';
    switch (pending.id) {
        case 'guardian': return `Face the guardian of ${row.name.split('—')[0].trim()}.`;
        case 'trial': return 'Pass the trial gate before the riddle.';
        case 'riddle': return 'Solve the seal-riddle to unlock the relic.';
        case 'relic': return 'Claim the relic and carry it in your satchel.';
        default: return null;
    }
}