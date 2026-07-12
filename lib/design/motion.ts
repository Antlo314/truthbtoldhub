/**
 * Design System 3.0 — Motion tokens
 * One breath family for every threshold, entrance, and settle.
 */

export const EASE = {
    /** Primary sacred ease — soft landings, never bouncy */
    breath: [0.22, 1, 0.36, 1] as const,
    /** Slightly snappier for UI chrome (menus, toggles) */
    veil: [0.32, 0.72, 0.28, 1] as const,
    /** Exit into the void */
    dissolve: [0.4, 0, 0.2, 1] as const,
};

export const DURATION = {
    instant: 0.15,
    quick: 0.28,
    settle: 0.55,
    threshold: 0.85,
    ritual: 1.2,
    long: 1.6,
} as const;

/** Page / chapter enter — used by template + Threshold */
export const thresholdEnter = {
    initial: { opacity: 0, y: 12, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: DURATION.threshold, ease: EASE.breath },
};

/** Soft fade for overlays, dialogue boxes, CTAs */
export const softFade = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 4 },
    transition: { duration: DURATION.settle, ease: EASE.breath },
};

/** Stagger children (lists, path cards) */
export const staggerContainer = {
    animate: {
        transition: { staggerChildren: 0.06, delayChildren: 0.08 },
    },
};

export const staggerItem = {
    initial: { opacity: 0, y: 10 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: DURATION.settle, ease: EASE.breath },
    },
};
