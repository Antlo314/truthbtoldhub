/**
 * Soft "what next?" guidance from local vision progress.
 */

import { VISIONS, type VisionId } from '@/lib/brand/visions';
import {
    loadVisionProgress,
    RELIC_BY_VISION,
    visionStats,
} from '@/lib/brand/visionProgress';

export type NextRoad =
    | { kind: 'vision'; id: VisionId; href: string; label: string; whisper: string }
    | { kind: 'relic'; id: VisionId; href: string; label: string; whisper: string }
    | { kind: 'trial'; id: VisionId; href: string; label: string; whisper: string }
    | { kind: 'epilogue'; href: string; label: string; whisper: string }
    | { kind: 'start'; href: string; label: string; whisper: string };

export function suggestNextRoad(): NextRoad {
    const p = loadVisionProgress();
    const stats = visionStats();

    // First unopened portal
    for (const v of VISIONS) {
        if (!p.seen.includes(v.id)) {
            return {
                kind: 'vision',
                id: v.id,
                href: `/vision/${v.id}`,
                label: v.name.split('—')[0].trim(),
                whisper: 'An unsealed portal still holds first light.',
            };
        }
    }

    // Opened but no trial yet
    for (const v of VISIONS) {
        if (p.seen.includes(v.id) && !p.trials.includes(v.id)) {
            return {
                kind: 'trial',
                id: v.id,
                href: `/vision/${v.id}`,
                label: `Trial · ${v.name.split('—')[0].trim()}`,
                whisper: 'You looked through peace — witness the trial.',
            };
        }
    }

    // Missing relic claim
    for (const v of VISIONS) {
        if (!p.relics.includes(RELIC_BY_VISION[v.id].id)) {
            return {
                kind: 'relic',
                id: v.id,
                href: `/vision/${v.id}`,
                label: `Claim · ${v.name.split('—')[0].trim()}`,
                whisper: `${RELIC_BY_VISION[v.id].name} still rests on that road.`,
            };
        }
    }

    if (stats.complete) {
        return {
            kind: 'epilogue',
            href: '/epilogue',
            label: 'Return to the Source',
            whisper: 'Every road and relic is yours. The epilogue waits.',
        };
    }

    return {
        kind: 'start',
        href: '/vision',
        label: 'Wayfinder',
        whisper: 'Five vision portals wait beyond the hut.',
    };
}
