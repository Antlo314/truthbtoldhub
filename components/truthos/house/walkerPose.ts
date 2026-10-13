'use client';

/**
 * Where the walker is — and what the body is doing — readable from outside
 * the canvas and from other scene components without a store subscription.
 *
 * The controller already computes this every frame; publishing it through a
 * plain module variable lets DOM chrome (the HUD compass) and the local
 * vessel read it without re-rendering anything. A zustand set at pose rate
 * would re-render the HUD eight times a second for a value it only samples
 * twice.
 */

export type WalkerPose = { x: number; y: number; z: number; yaw: number };

export type WalkerState = {
    /** metres per second over the ground */
    speed: number;
    grounded: boolean;
    sprinting: boolean;
    seated: boolean;
    /** active emote clip id, or null */
    emote: string | null;
    /** performance.now() the emote started */
    emoteAt: number;
    /** composing or just spoke — the body talks with its hands */
    talking: boolean;
    /** the plain's fight and prayer (lib/world/combat.ts) */
    action?: string | null;
    actionAt?: number;
    actionDur?: number;
    combat?: boolean;
};

let pose: WalkerPose = { x: 0, y: 0, z: 0, yaw: Math.PI };
/** False until the controller has placed the walker at least once this page load */
let live = false;

/**
 * Has the controller actually placed the walker? The default above is the
 * centre of the Source facing south — saving it on an early unmount (React
 * dev mounts twice; a visitor can back out while the house is loading)
 * overwrote the real saved spot and skipped the desk intro.
 */
export function walkerPoseLive(): boolean {
    return live;
}
let state: WalkerState = {
    speed: 0,
    grounded: true,
    sprinting: false,
    seated: false,
    emote: null,
    emoteAt: 0,
    talking: false,
};

export function setWalkerPose(p: WalkerPose): void {
    pose = p;
    live = true;
}

export function getWalkerPose(): WalkerPose {
    return pose;
}

export function setWalkerState(patch: Partial<WalkerState>): void {
    state = { ...state, ...patch };
}

export function getWalkerState(): WalkerState {
    return state;
}
