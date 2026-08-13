'use client';

/**
 * Shared house material library — full skins + roughness depth maps.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { makeHouseMap, makeRoughnessMap } from './houseSkins';

const materialCache = new Map<boolean, ReturnType<typeof buildHouseMaterials>>();

/**
 * One material set per tier, shared by every scene component.
 *
 * Five components each ran their own useMemo copy of this library, so every
 * texture in the house was decoded and uploaded to the GPU five times. The
 * cache keys on `low` so the desktop and phone tiers stay separate, and the
 * hook keeps its signature so no caller changes.
 */
export function useHouseMaterials(low = false) {
    let m = materialCache.get(low);
    if (!m) {
        m = buildHouseMaterials(low);
        materialCache.set(low, m);
    }
    return m;
}

function buildHouseMaterials(low: boolean) {
    {
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
        const tileKitchenMap = makeHouseMap('tileKitchen', { repeat: [4, 3.5], low });
        const carpetMap = makeHouseMap('carpet', { repeat: [5, 4.5], low });
        const woodFloorDarkMap = makeHouseMap('woodFloorDark', { repeat: [6, 6], low });
        const marbleMap = makeHouseMap('marble', { repeat: [2.5, 3], low });
        const concreteMap = makeHouseMap('concrete', { repeat: [5, 5], low });
        const artDomainMap = makeHouseMap('artDomain', { low });
        const artAsWithinMap = makeHouseMap('artAsWithin', { low });
        const artStillMap = makeHouseMap('artStillPoint', { low });
        const artUnnamedMap = makeHouseMap('artUnnamed', { low });
        const skyMap = makeHouseMap('skyNight', { low });
        const moonMap = makeHouseMap('moon', { low });

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

        /**
         * Progressive photo upgrade — CC0 PBR scans from Poly Haven
         * (public/textures/polyhaven, pulled by scripts/fetch-polyhaven.mjs).
         *
         * The procedural canvas map paints frame one; the photo diffuse,
         * normal and roughness swap in as each file arrives, so realism is
         * an enhancement, never a loading screen. A missing file simply
         * leaves the procedural look — the same graceful path `low` takes,
         * which skips photos entirely (phones keep their small textures).
         *
         * The saturated art-direction tints were designed to colour NEUTRAL
         * procedural maps; a photo already carries its own colour, so the
         * tint eases most of the way to white on arrival — most for floors,
         * least for the branded purple plaster.
         */
        const texLoader = new THREE.TextureLoader();
        const photo = (
            mat: THREE.MeshStandardMaterial,
            key: string,
            repeat: [number, number],
            o: { normalScale?: number; keepTint?: number; aniso?: number } = {},
        ) => {
            // Phones used to get NO photo at all, so every surface stayed a
            // procedural canvas — the whole material pass was invisible on the
            // device most people arrive on. They get the DIFFUSE now (the map
            // that carries the look) and skip normal + roughness (the two that
            // carry the memory). One third of the texture budget, most of the
            // gain.
            const wire = (slot: 'map' | 'normalMap' | 'roughnessMap', file: string, srgb = false) => {
                texLoader.load(
                    file,
                    (t) => {
                        t.wrapS = t.wrapT = THREE.RepeatWrapping;
                        t.repeat.set(repeat[0], repeat[1]);
                        t.anisotropy = low ? 2 : (o.aniso ?? 8);
                        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
                        mat[slot] = t;
                        if (slot === 'map') {
                            mat.color.lerp(new THREE.Color('#ffffff'), 1 - (o.keepTint ?? 0.25));
                        }
                        mat.needsUpdate = true;
                    },
                    undefined,
                    () => {
                        /* keep the procedural look */
                    },
                );
            };
            wire('map', `/textures/polyhaven/${key}_diff.jpg`, true);
            if (!low) {
                wire('normalMap', `/textures/polyhaven/${key}_nor.jpg`);
                wire('roughnessMap', `/textures/polyhaven/${key}_rough.jpg`);
                mat.normalScale.set(o.normalScale ?? 0.8, o.normalScale ?? 0.8);
            }
            return mat;
        };

        // Cove strips and bulb cores dim with daylight when mounted inside a
        // LampGroup — the tag is on the material so every mesh sharing it dims.
        const cove = new THREE.MeshStandardMaterial({
            color: '#2a2440',
            emissive: '#b6a4ff',
            emissiveIntensity: 0.85,
            toneMapped: false,
        });
        cove.userData.lampEmissive = true;
        const bulbWarm = new THREE.MeshStandardMaterial({
            color: '#fff3d6',
            emissive: '#ffcf8a',
            emissiveIntensity: 1.5,
            toneMapped: false,
        });
        bulbWarm.userData.lampEmissive = true;

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
            tile: mk(tileMap, '#cfd4d6', { roughness: 0.42, metalness: 0.1 }, 0.48),
            tileKitchen: mk(tileKitchenMap, '#cbc0b4', { roughness: 0.42, metalness: 0.1 }, 0.5),
            carpet: mk(carpetMap, '#b9a8c8', { roughness: 0.99, metalness: 0 }, 0.9),
            woodFloorDark: mk(woodFloorDarkMap, '#7a5c3c', { roughness: 0.6, metalness: 0.05 }, 0.74),
            marble: mk(marbleMap, '#d8d4d0', { roughness: 0.24, metalness: 0.16 }, 0.3),
            concrete: mk(concreteMap, '#9890a0', { roughness: 0.95 }, 0.72),
            wallPlaster: mk(plasterMap, '#e9e7e2', { roughness: 0.94, metalness: 0.02 }, 0.5),
            woodHerring: mk(woodFloorMap, '#b09068', { roughness: 0.55, metalness: 0.05 }, 0.7),
            counter: mk(marbleMap, '#cfc9c2', { roughness: 0.35, metalness: 0.08 }, 0.4),
            linen: mk(fabricLightMap, '#d8cfc4', { roughness: 0.95 }, 0.75),
            wool: mk(fabricMap, '#b9af9f', { roughness: 0.97 }, 0.8),
            bark: mk(woodDarkMap, '#6e5a48', { roughness: 0.95 }, 0.8),
            forestFloor: mk(dirtMap, '#4e4436', { roughness: 0.98 }, 0.85),
            artDomain: mk(artDomainMap, '#ffffff', {
                roughness: 0.55,
                metalness: 0.12,
                emissive: '#3b2a6e',
                emissiveIntensity: 0.18,
            }, 0.35),
            artAsWithin: mk(artAsWithinMap, '#ffffff', { roughness: 0.7 }, 0.4),
            artStillPoint: mk(artStillMap, '#ffffff', { roughness: 0.7 }, 0.4),
            artUnnamed: mk(artUnnamedMap, '#ffffff', { roughness: 0.7 }, 0.4),
            /**
             * Real window glass — transparent pane, the yard/sky/moon show
             * through the actual wall opening. Faint tint + sheen so the
             * glass itself still reads at grazing angles.
             */
            windowGlass: new THREE.MeshStandardMaterial({
                color: '#cfe2f4',
                transparent: true,
                opacity: 0.16,
                roughness: 0.06,
                metalness: 0.35,
                envMapIntensity: 1.35,
                side: THREE.DoubleSide,
                depthWrite: false,
            }),
            /** Gradient sky dome — BackSide, unfogged so the horizon reads */
            sky: new THREE.MeshBasicMaterial({
                map: skyMap,
                side: THREE.BackSide,
                fog: false,
                depthWrite: false,
            }),
            /** Moon sprite plane — additive-free transparent disc + halo */
            moon: new THREE.MeshBasicMaterial({
                map: moonMap,
                transparent: true,
                fog: false,
                depthWrite: false,
                toneMapped: false,
            }),
            /** Ceiling cove strip — cheap emissive, no light objects */
            cove,
            /** Warm bulb / lamp core */
            bulbWarm,
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
    }
}

export type HouseMaterials = ReturnType<typeof useHouseMaterials>;
