'use client';

/**
 * Shared house material library — full skins + roughness depth maps.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { makeHouseMap, makeRoughnessMap } from './houseSkins';

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
        const grassMap = makeHouseMap('grass', { repeat: [14, 14], low });
        const pathMap = makeHouseMap('pathStone', { repeat: [6, 10], low });
        const dirtMap = makeHouseMap('dirt', { repeat: [4, 4], low });
        const screenMap = makeHouseMap('screen', { repeat: [1, 1], low });
        const tileMap = makeHouseMap('tile', { repeat: [8, 8], low });
        const concreteMap = makeHouseMap('concrete', { repeat: [5, 5], low });
        const artDomainMap = makeHouseMap('artDomain', { low });
        const artAsWithinMap = makeHouseMap('artAsWithin', { low });
        const artStillMap = makeHouseMap('artStillPoint', { low });
        const artUnnamedMap = makeHouseMap('artUnnamed', { low });

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
            wood: mk(woodMap, '#c8ac88', { roughness: 0.68, metalness: 0.08 }, 0.62),
            woodDark: mk(woodDarkMap, '#9a7858', { roughness: 0.78, metalness: 0.06 }, 0.68),
            woodFloor: mk(woodFloorMap, '#a08058', { roughness: 0.62, metalness: 0.05 }, 0.72),
            stone: mk(stoneMap, '#b4bcc8', { roughness: 0.92, metalness: 0.08 }, 0.78),
            plaster: mk(plasterMap, '#bcb2c8', { roughness: 0.94 }, 0.52),
            rug: mk(rugMap, '#e8c4a0', { roughness: 0.98, metalness: 0 }, 0.85),
            fabric: mk(fabricMap, '#9a88b8', { roughness: 0.92 }, 0.72),
            fabricLight: mk(fabricLightMap, '#bca8d4', { roughness: 0.9 }, 0.68),
            leather: mk(leatherMap, '#c89c72', { roughness: 0.66, metalness: 0.1 }, 0.58),
            metal: mk(metalMap, '#ccd0d8', { roughness: 0.24, metalness: 0.82 }, 0.38),
            metalDark: mk(metalDarkMap, '#8a8a98', { roughness: 0.34, metalness: 0.74 }, 0.42),
            gold: mk(goldMap, '#ffe08a', {
                roughness: 0.2,
                metalness: 0.9,
                emissive: '#f59e0b',
                emissiveIntensity: 0.28,
            }, 0.32),
            book: mk(bookMap, '#d0b0c0', { roughness: 0.8 }, 0.55),
            leaf: mk(leafMap, '#88c898', { roughness: 0.88 }, 0.6),
            grass: mk(grassMap, '#5a9a62', { roughness: 0.96, metalness: 0 }, 0.82),
            path: mk(pathMap, '#9a9490', { roughness: 0.9, metalness: 0.06 }, 0.75),
            dirt: mk(dirtMap, '#6a5040', { roughness: 0.98, metalness: 0 }, 0.88),
            screen: mk(screenMap, '#88e8f8', {
                roughness: 0.16,
                metalness: 0.28,
                emissive: '#0e7490',
                emissiveIntensity: 0.55,
                toneMapped: false,
            }, 0.22),
            tile: mk(tileMap, '#a898b8', { roughness: 0.5, metalness: 0.14 }, 0.48),
            concrete: mk(concreteMap, '#9890a0', { roughness: 0.95 }, 0.72),
            artDomain: mk(artDomainMap, '#ffffff', {
                roughness: 0.55,
                metalness: 0.12,
                emissive: '#3b2a6e',
                emissiveIntensity: 0.18,
            }, 0.35),
            artAsWithin: mk(artAsWithinMap, '#ffffff', { roughness: 0.7 }, 0.4),
            artStillPoint: mk(artStillMap, '#ffffff', { roughness: 0.7 }, 0.4),
            artUnnamed: mk(artUnnamedMap, '#ffffff', { roughness: 0.7 }, 0.4),
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
                roughness: 0.42,
                metalness: 0.48,
                envMapIntensity: 1.0,
            }),
        };
    }, [low]);
}

export type HouseMaterials = ReturnType<typeof useHouseMaterials>;
