/**
 * Client-side vision progress — which roads you've looked through,
 * which trials you've witnessed, relics claimed.
 */

import type { VisionId } from '@/lib/brand/visions';
import { VISIONS } from '@/lib/brand/visions';

const KEY = 'tbth-vision-progress-v1';

export interface VisionProgress {
    seen: VisionId[];
    trials: VisionId[];
    relics: string[];
    completedAt?: string;
}

function empty(): VisionProgress {
    return { seen: [], trials: [], relics: [] };
}

export function loadVisionProgress(): VisionProgress {
    if (typeof window === 'undefined') return empty();
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return empty();
        const p = JSON.parse(raw) as VisionProgress;
        return {
            seen: Array.isArray(p.seen) ? p.seen : [],
            trials: Array.isArray(p.trials) ? p.trials : [],
            relics: Array.isArray(p.relics) ? p.relics : [],
            completedAt: p.completedAt,
        };
    } catch {
        return empty();
    }
}

function save(p: VisionProgress) {
    try {
        localStorage.setItem(KEY, JSON.stringify(p));
    } catch { /* */ }
}

export function markVisionSeen(id: VisionId): VisionProgress {
    const p = loadVisionProgress();
    if (!p.seen.includes(id)) p.seen.push(id);
    if (p.seen.length >= VISIONS.length && !p.completedAt) {
        p.completedAt = new Date().toISOString();
    }
    save(p);
    return p;
}

export function markTrialSeen(id: VisionId): VisionProgress {
    const p = loadVisionProgress();
    if (!p.seen.includes(id)) p.seen.push(id);
    if (!p.trials.includes(id)) p.trials.push(id);
    save(p);
    return p;
}

export function claimRelic(relicId: string): VisionProgress {
    const p = loadVisionProgress();
    if (!p.relics.includes(relicId)) p.relics.push(relicId);
    save(p);
    return p;
}

export function hasRelic(relicId: string): boolean {
    return loadVisionProgress().relics.includes(relicId);
}

export function visionStats() {
    const p = loadVisionProgress();
    return {
        seen: p.seen.length,
        trials: p.trials.length,
        total: VISIONS.length,
        relics: p.relics.length,
        complete: p.seen.length >= VISIONS.length,
        completedAt: p.completedAt,
    };
}

export const RELIC_BY_VISION: Record<VisionId, { id: string; name: string; desc: string }> = {
    eden: {
        id: 'relic_seed',
        name: 'Seed of First Light',
        desc: 'A warm seed that remembers the garden before the fall.',
    },
    fair: {
        id: 'relic_ticket',
        name: 'Ivory Ticket Stub',
        desc: 'A scrap from the fair — proof you looked twice.',
    },
    giza: {
        id: 'relic_iron',
        name: 'Giza Iron Sliver',
        desc: 'Stone-dust iron. Heavy for its size.',
    },
    kolbrin: {
        id: 'relic_page',
        name: 'Ashen Page',
        desc: 'What was buried was not destroyed.',
    },
    emerald: {
        id: 'relic_shard',
        name: 'Emerald Law-Shard',
        desc: 'As within, so without — a fragment of green fire.',
    },
};
