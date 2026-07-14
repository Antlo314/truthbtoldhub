'use client';

/**
 * Shared house material library — full skins, reused across all meshes.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { makeHouseMap, loadBrandMap } from './houseSkins';

export function useHouseMaterials(low = false) {
    return useMemo(() => {
        const woodMap = makeHouseMap('wood', { repeat: [2, 2], low });
        const woodDarkMap = makeHouseMap('woodDark', { repeat: [2, 2], low });
        const woodFloorMap = makeHouseMap('woodFloor', { repeat: [8, 8], low });
        const stoneMap = makeHouseMap('stone', { repeat: [5, 3], low });
        const plasterMap = makeHouseMap('plasterPurple', { repeat: [4, 3], low });
        const rugMap = makeHouseMap('rug', { repeat: [2, 2], low });
        const fabricMap = makeHouseMap('fabric', { repeat: [2, 2], low });
        const fabricLightMap = makeHouseMap('fabricLight', { repeat: [2, 2], low });
        const leatherMap = makeHouseMap('leather', { repeat: [2, 2], low });
        const metalMap = makeHouseMap('metal', { repeat: [2, 2], low });
        const metalDarkMap = makeHouseMap('metalDark', { repeat: [2, 2], low });
        const goldMap = makeHouseMap('gold', { repeat: [1, 1], low });
        const bookMap = makeHouseMap('book', { repeat: [1, 1], low });
        const leafMap = makeHouseMap('leaf', { repeat: [2, 2], low });
        const screenMap = makeHouseMap('screen', { repeat: [1, 1], low });
        const tileMap = makeHouseMap('tile', { repeat: [6, 6], low });
        const concreteMap = makeHouseMap('concrete', { repeat: [4, 4], low });
        const tapestryMap = loadBrandMap('/brand/hut-interior-cinematic.jpg', [1, 1]);
        const hallMap = loadBrandMap('/brand/bg-hall.jpg', [1, 1]);
        const sanctumMap = loadBrandMap('/brand/bg-hut-sanctuary.jpg', [1, 1]);

        const mk = (
            map: THREE.Texture,
            color: string,
            opts: Partial<THREE.MeshStandardMaterialParameters> = {},
        ) =>
            new THREE.MeshStandardMaterial({
                map,
                color,
                roughness: 0.85,
                metalness: 0.04,
                ...opts,
            });

        return {
            wood: mk(woodMap, '#c4a882', { roughness: 0.8, metalness: 0.05 }),
            woodDark: mk(woodDarkMap, '#a08060', { roughness: 0.88 }),
            woodFloor: mk(woodFloorMap, '#9a7a55', { roughness: 0.78, metalness: 0.03 }),
            stone: mk(stoneMap, '#b0b8c8', { roughness: 0.92, metalness: 0.08 }),
            plaster: mk(plasterMap, '#b8aec8', { roughness: 0.94 }),
            rug: mk(rugMap, '#e8c4a0', { roughness: 0.96, metalness: 0 }),
            fabric: mk(fabricMap, '#9a88b8', { roughness: 0.92 }),
            fabricLight: mk(fabricLightMap, '#b8a8d0', { roughness: 0.9 }),
            leather: mk(leatherMap, '#c49a70', { roughness: 0.78, metalness: 0.06 }),
            metal: mk(metalMap, '#c8c8d4', { roughness: 0.35, metalness: 0.72 }),
            metalDark: mk(metalDarkMap, '#888898', { roughness: 0.42, metalness: 0.65 }),
            gold: mk(goldMap, '#ffe08a', {
                roughness: 0.28,
                metalness: 0.82,
                emissive: '#f59e0b',
                emissiveIntensity: 0.28,
            }),
            book: mk(bookMap, '#d0b0c0', { roughness: 0.88 }),
            leaf: mk(leafMap, '#88c898', { roughness: 0.9 }),
            screen: mk(screenMap, '#88e8f8', {
                roughness: 0.25,
                metalness: 0.2,
                emissive: '#0e7490',
                emissiveIntensity: 0.45,
                toneMapped: false,
            }),
            tile: mk(tileMap, '#a898b8', { roughness: 0.7, metalness: 0.1 }),
            concrete: mk(concreteMap, '#9890a0', { roughness: 0.95 }),
            tapestry: mk(tapestryMap, '#ddd5c8', { roughness: 0.85 }),
            hallArt: mk(hallMap, '#d0d8e8', { roughness: 0.8, emissive: '#1e3a5f', emissiveIntensity: 0.12 }),
            sanctum: mk(sanctumMap, '#ddd0ff', {
                roughness: 0.5,
                metalness: 0.2,
                emissive: '#4c1d95',
                emissiveIntensity: 0.2,
            }),
            // emissive heroes (no map needed)
            ember: new THREE.MeshStandardMaterial({
                color: '#ff6b2c',
                emissive: '#ff6b2c',
                emissiveIntensity: 1.5,
                toneMapped: false,
            }),
            glassTint: new THREE.MeshStandardMaterial({
                color: '#a8c4e0',
                metalness: 0.95,
                roughness: 0.05,
                transparent: true,
                opacity: 0.35,
            }),
            black: new THREE.MeshStandardMaterial({
                color: '#0a0a0c',
                roughness: 0.55,
                metalness: 0.35,
            }),
        };
    }, [low]);
}

export type HouseMaterials = ReturnType<typeof useHouseMaterials>;
