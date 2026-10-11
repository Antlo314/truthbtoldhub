/**
 * Station vocabulary — the ids every panel, hint and progress record use.
 * The plan itself (where they stand) lives in homeMap.ts.
 */
import type { HousePanelId } from './houseUiStore';

export type HotspotId =
    | 'computer'
    | 'envelope'
    | 'library'
    | 'codex'
    | 'ledger'
    | 'cinema'
    | 'hall'
    | 'soul_mirror'
    | 'wayfinder'
    | 'arcade'
    | 'studio'
    | 'front_door'
    | 'back_door'
    | 'front_bench'
    | 'back_gate'
    | 'fireplace'
    | 'mailbox'
    | 'wall'
    | 'cineworks';

export type Hotspot = {
    id: HotspotId;
    label: string;
    hint: string;
    position: [number, number, number];
    radius: number;
    action:
        | { type: 'os' }
        | { type: 'panel'; panel: HousePanelId }
        | { type: 'sit' }
        | { type: 'soon'; message: string };
};
