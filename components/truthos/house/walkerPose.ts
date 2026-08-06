'use client';

/**
 * Where the walker is, readable from outside the canvas.
 *
 * The controller already computes this every frame; publishing it through a
 * plain module variable lets DOM chrome (the HUD compass) read it without a
 * store subscription — a zustand set at pose rate would re-render the HUD
 * eight times a second for a value it only samples twice.
 */

export type WalkerPose = { x: number; y: number; z: number; yaw: number };

let pose: WalkerPose = { x: 0, y: 0, z: 0, yaw: Math.PI };

export function setWalkerPose(p: WalkerPose): void {
    pose = p;
}

export function getWalkerPose(): WalkerPose {
    return pose;
}
