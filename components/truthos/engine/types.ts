/**
 * Truth.OS immersive engine — shared types
 * Industry staging: room (3rd person) → device zoom → OS (HTML overlay)
 */

export type ClientDevice = 'desktop' | 'mobile';

export type ImmersivePhase =
    | 'auth'           // HTML overlay: Google / email
    | 'create'         // HTML: character forge (assets preload in BG)
    | 'room'           // 3D bedroom, free framing
    | 'zooming'        // GSAP camera into device
    | 'os';            // Fullscreen Truth.OS (Win / Android chrome)

export type DeviceTarget = 'monitor' | 'phone';

export interface ScreenAnchor {
    /** World position of screen center (zoom look-at) */
    position: [number, number, number];
    /** World position camera ends at (just outside glass, looking in) */
    cameraEnd: [number, number, number];
    /** Initial camera framing for this device */
    cameraStart: [number, number, number];
    lookAtStart: [number, number, number];
}

/** Desktop: desk-focused · Mobile: bed-focused */
export const ANCHORS: Record<DeviceTarget, ScreenAnchor> = {
    monitor: {
        position: [1.15, 1.12, -0.85],
        cameraEnd: [1.15, 1.12, -0.05],
        cameraStart: [0.2, 1.45, 2.4],
        lookAtStart: [0.9, 1.0, -0.6],
    },
    phone: {
        position: [-0.55, 0.52, 0.35],
        cameraEnd: [-0.55, 0.72, 0.95],
        cameraStart: [0.1, 1.35, 2.1],
        lookAtStart: [-0.4, 0.55, 0.2],
    },
};
