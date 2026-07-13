/**
 * Silent preload while user is on Auth / Character UI.
 * Extend paths as you export GLBs into public/models/truthos/
 */

import * as THREE from 'three';

export type PreloadProgress = {
    loaded: number;
    total: number;
    ratio: number;
    item: string;
};

const ASSET_URLS: string[] = [
    // Optional — add when ready; empty list still resolves
    // '/models/truthos/bedroom_shell.glb',
    // '/models/truthos/desk_pc.glb',
    // '/models/truthos/phone.glb',
    // '/textures/truthos/lightmap_bedroom.webp',
    // '/textures/truthos/screen_noise.webp',
];

/**
 * Uses THREE.LoadingManager so progress can drive a quiet progress ring
 * without blocking character creation.
 */
export function preloadTruthOsAssets(
    onProgress?: (p: PreloadProgress) => void,
): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (ASSET_URLS.length === 0) {
        onProgress?.({ loaded: 1, total: 1, ratio: 1, item: 'procedural' });
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const manager = new THREE.LoadingManager();
        manager.onProgress = (url, loaded, total) => {
            onProgress?.({
                loaded,
                total,
                ratio: total > 0 ? loaded / total : 0,
                item: url,
            });
        };
        manager.onLoad = () => resolve();
        manager.onError = (url) => {
            console.warn('[Truth.OS] preload miss', url);
            // Don't hard-fail the UX — room can run procedural fallbacks
            resolve();
        };

        const loader = new THREE.FileLoader(manager);
        ASSET_URLS.forEach((url) => {
            loader.load(url, () => {}, undefined, () => {});
        });
    });
}
