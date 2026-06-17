import { TILE } from '@/lib/game/overworld';

const FOLLOW_DIST = TILE * 2.2;
const CATCHUP_SPD = 78;
const IDLE_SPD = 52;

export interface TruthCompanionState {
    x: number;
    y: number;
}

export function initTruthCompanion(hutX: number, hutY: number): TruthCompanionState {
    return { x: (hutX + 0.5) * TILE, y: (hutY + 2.2) * TILE };
}

/** Move Truth toward the player, lagging slightly behind. */
export function updateTruthCompanion(
    truth: TruthCompanionState,
    px: number,
    py: number,
    dt: number,
    solidAt: (wx: number, wy: number) => boolean,
): TruthCompanionState {
    const dx = px - truth.x;
    const dy = py - truth.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < FOLLOW_DIST * 0.6) return truth;

    const targetX = px - (dx / dist) * FOLLOW_DIST * 0.85;
    const targetY = py - (dy / dist) * FOLLOW_DIST * 0.85;
    const tdx = targetX - truth.x;
    const tdy = targetY - truth.y;
    const td = Math.hypot(tdx, tdy) || 1;
    const spd = dist > FOLLOW_DIST * 2.5 ? CATCHUP_SPD : IDLE_SPD;

    let nx = truth.x + (tdx / td) * spd * dt;
    let ny = truth.y + (tdy / td) * spd * dt;
    const fy = 5;
    if (solidAt(nx, truth.y + fy)) nx = truth.x;
    if (solidAt(truth.x, ny + fy)) ny = truth.y;

    return { x: nx, y: ny };
}

/** Contextual Truth lines when near POIs */
export const TRUTH_PROXIMITY_LINES: Record<string, string> = {
    hut: 'The Hut is where the living word meets the road. Return when the world stirs.',
    dest_eden: 'Eden remembers before the serpent spoke. Read the stones.',
    dest_fair: 'Twelve hundred palaces of white — raised in a season, torn down the next.',
    dest_giza: 'The stone still hums. Listen before you strike.',
    dest_kolbrin: 'Books the kings tried to burn. The ink outlives the fire.',
    dest_emerald: 'Thrice-great — in life, in death, and in what lies beyond both.',
    npc_gardener: 'The Gardener keeps missions for those who would walk Eden.',
    npc_mabel: 'Mabel chronicled what they erased from the Fair.',
};