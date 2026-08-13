/**
 * Last walk pose — survive leave-terminal and reload.
 */
import { poseClear } from './homeMap';

const KEY = 'tbth-house-pose-v1';

export type SavedPose = { x: number; z: number; yaw: number; pitch: number };

export function loadPose(): SavedPose | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as SavedPose;
        if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(p.yaw)) return null;
        if (!poseClear(p.x, p.z)) return null;
        return {
            x: p.x,
            z: p.z,
            yaw: p.yaw,
            pitch: Number.isFinite(p.pitch) ? p.pitch : 0,
        };
    } catch {
        return null;
    }
}

export function savePose(p: SavedPose): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
        /* */
    }
}

export function clearPose(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* */
    }
}
