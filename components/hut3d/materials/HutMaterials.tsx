'use client';

/**
 * Shared Hut material library — skins applied once, reused across meshes.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { makeHutMap, loadBrandMap } from './hutSkins';

export function useHutMaterials(low = false) {
    return useMemo(() => {
        const woodMap = makeHutMap('wood', { repeat: [3, 3], low });
        const woodDarkMap = makeHutMap('woodDark', { repeat: [2, 2], low });
        const stoneMap = makeHutMap('stone', { repeat: [4, 2], low });
        const plasterMap = makeHutMap('plaster', { repeat: [3, 2], low });
        const rugMap = makeHutMap('rug', { repeat: [1, 4], low });
        // Local brand photo as atmosphere panel (free, already in repo)
        const sanctumMap = loadBrandMap('/brand/bg-hut-sanctuary.jpg', [1, 1]);
        const interiorMap = loadBrandMap('/brand/hut-interior-cinematic.jpg', [1, 1]);

        const wood = new THREE.MeshStandardMaterial({
            map: woodMap,
            color: '#c4a882',
            roughness: 0.82,
            metalness: 0.05,
        });
        const woodDark = new THREE.MeshStandardMaterial({
            map: woodDarkMap,
            color: '#a08060',
            roughness: 0.88,
            metalness: 0.04,
        });
        const stone = new THREE.MeshStandardMaterial({
            map: stoneMap,
            color: '#b0b8c8',
            roughness: 0.92,
            metalness: 0.08,
        });
        const plaster = new THREE.MeshStandardMaterial({
            map: plasterMap,
            color: '#c8c0b0',
            roughness: 0.95,
            metalness: 0.02,
        });
        const floor = new THREE.MeshStandardMaterial({
            map: woodDarkMap,
            color: '#8a6a4a',
            roughness: 0.9,
            metalness: 0.03,
        });
        const rug = new THREE.MeshStandardMaterial({
            map: rugMap,
            color: '#e8c4a0',
            roughness: 0.96,
            metalness: 0,
        });
        const gold = new THREE.MeshStandardMaterial({
            color: '#fbbf24',
            emissive: '#f59e0b',
            emissiveIntensity: 0.35,
            metalness: 0.75,
            roughness: 0.28,
        });
        const ember = new THREE.MeshStandardMaterial({
            color: '#ff6b2c',
            emissive: '#ff6b2c',
            emissiveIntensity: 1.6,
            toneMapped: false,
        });
        const mirror = new THREE.MeshStandardMaterial({
            color: '#6a8aaa',
            metalness: 0.9,
            roughness: 0.12,
            emissive: '#1a3048',
            emissiveIntensity: 0.35,
        });
        const sanctumDoor = new THREE.MeshStandardMaterial({
            map: sanctumMap,
            color: '#ddd0ff',
            emissive: '#4c1d95',
            emissiveIntensity: 0.25,
            metalness: 0.25,
            roughness: 0.45,
        });
        const tapestry = new THREE.MeshStandardMaterial({
            map: interiorMap,
            color: '#ddd5c8',
            roughness: 0.85,
            metalness: 0.05,
        });

        return {
            wood,
            woodDark,
            stone,
            plaster,
            floor,
            rug,
            gold,
            ember,
            mirror,
            sanctumDoor,
            tapestry,
        };
    }, [low]);
}

export type HutMaterials = ReturnType<typeof useHutMaterials>;
