'use client';

/**
 * Shared house material library — full skins + roughness depth maps.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { makeHouseMap, makeRoughnessMap, loadBrandMap } from './houseSkins';

export function useHouseMaterials(low = false) {
    return useMemo(() => {
        const woodMap = makeHouseMap('wood', { repeat: [2.5, 2.5], low });
        const woodDarkMap = makeHouseMap('woodDark', { repeat: [2.5, 2.5], low });
        const woodFloorMap = makeHouseMap('woodFloor', { repeat: [10, 10], low });
        const stoneMap = makeHouseMap('stone', { repeat: [6, 3.5], low });
        const plasterMap = makeHouseMap('plasterPurple', { repeat: [5, 3.5], low });
        const rugMap = makeHouseMap('rug', { repeat: [2.5, 2.5], low });
        const fabricMap = makeHouseMap('fabric', { repeat: [3, 3], low });
        const fabricLightMap = makeHouseMap('fabricLight', { repeat: [3, 3], low });
        const leatherMap = makeHouseMap('leather', { repeat: [2.5, 2.5], low });
        const metalMap = makeHouseMap('metal', { repeat: [2.5, 2.5], low });
        const metalDarkMap = makeHouseMap('metalDark', { repeat: [2.5, 2.5], low });
        const goldMap = makeHouseMap('gold', { repeat: [1.5, 1.5], low });
        const bookMap = makeHouseMap('book', { repeat: [1, 1], low });
        const leafMap = makeHouseMap('leaf', { repeat: [2.5, 2.5], low });
        const screenMap = makeHouseMap('screen', { repeat: [1, 1], low });
        const tileMap = makeHouseMap('tile', { repeat: [8, 8], low });
        const concreteMap = makeHouseMap('concrete', { repeat: [5, 5], low });
        const tapestryMap = loadBrandMap('/brand/hut-interior-cinematic.jpg', [1, 1]);
        const hallMap = loadBrandMap('/brand/bg-hall.jpg', [1, 1]);
        const sanctumMap = loadBrandMap('/brand/bg-hut-sanctuary.jpg', [1, 1]);

        const mk = (
            map: THREE.Texture,
            color: string,
            opts: Partial<THREE.MeshStandardMaterialParameters> = {},
            roughStrength = 0.55,
        ) => {
            const roughnessMap = makeRoughnessMap(map, roughStrength);
            return new THREE.MeshStandardMaterial({
                map,
                roughnessMap,
                color,
                roughness: 0.82,
                metalness: 0.04,
                envMapIntensity: low ? 0.45 : 0.85,
                ...opts,
            });
        };

        return {
            wood: mk(woodMap, '#c4a882', { roughness: 0.72, metalness: 0.06 }, 0.6),
            woodDark: mk(woodDarkMap, '#a08060', { roughness: 0.8 }, 0.65),
            woodFloor: mk(woodFloorMap, '#9a7a55', { roughness: 0.68, metalness: 0.04 }, 0.7),
            stone: mk(stoneMap, '#b0b8c8', { roughness: 0.9, metalness: 0.1 }, 0.75),
            plaster: mk(plasterMap, '#b8aec8', { roughness: 0.92 }, 0.5),
            rug: mk(rugMap, '#e8c4a0', { roughness: 0.95, metalness: 0 }, 0.8),
            fabric: mk(fabricMap, '#9a88b8', { roughness: 0.9 }, 0.7),
            fabricLight: mk(fabricLightMap, '#b8a8d0', { roughness: 0.88 }, 0.65),
            leather: mk(leatherMap, '#c49a70', { roughness: 0.7, metalness: 0.08 }, 0.55),
            metal: mk(metalMap, '#c8c8d4', { roughness: 0.28, metalness: 0.78 }, 0.4),
            metalDark: mk(metalDarkMap, '#888898', { roughness: 0.36, metalness: 0.7 }, 0.45),
            gold: mk(goldMap, '#ffe08a', {
                roughness: 0.22,
                metalness: 0.88,
                emissive: '#f59e0b',
                emissiveIntensity: 0.3,
            }, 0.35),
            book: mk(bookMap, '#d0b0c0', { roughness: 0.82 }, 0.55),
            leaf: mk(leafMap, '#88c898', { roughness: 0.88 }, 0.6),
            screen: mk(screenMap, '#88e8f8', {
                roughness: 0.2,
                metalness: 0.25,
                emissive: '#0e7490',
                emissiveIntensity: 0.5,
                toneMapped: false,
            }, 0.25),
            tile: mk(tileMap, '#a898b8', { roughness: 0.55, metalness: 0.12 }, 0.5),
            concrete: mk(concreteMap, '#9890a0', { roughness: 0.94 }, 0.7),
            tapestry: mk(tapestryMap, '#ddd5c8', { roughness: 0.82 }, 0.5),
            hallArt: mk(hallMap, '#d0d8e8', {
                roughness: 0.75,
                emissive: '#1e3a5f',
                emissiveIntensity: 0.14,
            }, 0.4),
            sanctum: mk(sanctumMap, '#ddd0ff', {
                roughness: 0.45,
                metalness: 0.22,
                emissive: '#4c1d95',
                emissiveIntensity: 0.22,
            }, 0.4),
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
                roughness: 0.5,
                metalness: 0.4,
                envMapIntensity: 0.9,
            }),
        };
    }, [low]);
}

export type HouseMaterials = ReturnType<typeof useHouseMaterials>;
