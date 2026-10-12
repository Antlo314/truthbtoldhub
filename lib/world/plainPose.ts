/**
 * Where you last stood on the plain — survives a trip into the Lair, the
 * terminal and a reload. Its own key: the house's pose must not land you
 * in a tree, and the plain's must not land you in a wall.
 */
import { walkableAt } from './plain';

const KEY = 'tbth-plain-pose-v1';

export type PlainPose = { x: number; z: number; yaw: number; pitch: number };

/** Just outside the Overlook door, facing down the road to the Crossroads */
export const PLAIN_SPAWN: PlainPose = { x: 0, z: 68.5, yaw: Math.PI, pitch: 0 };

export function loadPlainPose(): PlainPose | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as PlainPose;
        if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.yaw)) return null;
        if (!walkableAt(p.x, p.z)) return null;
        return { x: p.x, z: p.z, yaw: p.yaw, pitch: Number.isFinite(p.pitch) ? p.pitch : 0 };
    } catch {
        return null;
    }
}

export function savePlainPose(p: PlainPose): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
        /* */
    }
}

export function clearPlainPose(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* */
    }
}
