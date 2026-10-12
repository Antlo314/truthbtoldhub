'use client';

/**
 * Everything that grows or lies on the plain, drawn as instances. Each
 * Kenney GLB is loaded once; every primitive inside it becomes one
 * InstancedMesh carrying every placement of that kind, so three thousand
 * props are a few dozen draws. Placement comes from plainData(), the same
 * table the walker collides with.
 */
import { Suspense, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { plainData, PROP_DEFS, type PropKind } from '@/lib/world/plain';

/** Kinds that throw a shadow — the big ones; flowers never */
const SHADOW_KINDS = new Set<PropKind>(['oak', 'tree', 'treeFat', 'treeDetailed', 'pineTall', 'pineRound', 'pineSmall', 'treeDark', 'rockLarge', 'rockTall', 'stoneTall', 'stump', 'log']);
/** Small kinds the phone tier thins out by half */
const THIN_KINDS = new Set<PropKind>(['flowerRed', 'flowerYellow', 'flowerPurple', 'flowersTall', 'mushroomRed', 'mushroomTan', 'bush', 'bushLarge', 'reed', 'rockSmall']);

type Prim = { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; local: THREE.Matrix4 };

function primitivesOf(scene: THREE.Object3D): Prim[] {
    scene.updateMatrixWorld(true);
    const out: Prim[] = [];
    scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        out.push({ geometry: m.geometry, material: m.material, local: m.matrixWorld.clone() });
    });
    return out;
}

function KindInstances({ kind, low, shadows }: { kind: PropKind; low: boolean; shadows: boolean }) {
    const def = PROP_DEFS[kind];
    const gltf = useGLTF(def.url);
    const meshes = useMemo(() => {
        const all = plainData().byKind.get(kind) ?? [];
        const list = low && THIN_KINDS.has(kind) ? all.filter((_, i) => i % 2 === 0) : all;
        if (list.length === 0) return [];
        const prims = primitivesOf(gltf.scene);
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const pos = new THREE.Vector3();
        const scl = new THREE.Vector3();
        const cast = shadows && SHADOW_KINDS.has(kind);
        return prims.map((p) => {
            const im = new THREE.InstancedMesh(p.geometry, p.material, list.length);
            for (let i = 0; i < list.length; i++) {
                const it = list[i];
                pos.set(it.x, it.y, it.z);
                q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.yaw);
                scl.setScalar(it.s);
                m.compose(pos, q, scl).multiply(p.local);
                im.setMatrixAt(i, m);
            }
            im.instanceMatrix.needsUpdate = true;
            // one mesh spans the island; the GPU is faster than culling 3000 boxes
            im.frustumCulled = false;
            im.castShadow = cast;
            im.receiveShadow = shadows;
            return im;
        });
    }, [gltf.scene, kind, low, shadows]);

    useEffect(
        () => () => {
            for (const im of meshes) im.dispose();
        },
        [meshes],
    );

    return (
        <>
            {meshes.map((im, i) => (
                <primitive key={`${kind}-${i}`} object={im} />
            ))}
        </>
    );
}

export default function Props({ low = false, shadows = true }: { low?: boolean; shadows?: boolean }) {
    const kinds = useMemo(() => Array.from(plainData().byKind.keys()), []);
    return (
        <group>
            {kinds.map((k) => (
                <Suspense key={k} fallback={null}>
                    <KindInstances kind={k} low={low} shadows={shadows} />
                </Suspense>
            ))}
        </group>
    );
}

export function preloadProps() {
    for (const k of Object.keys(PROP_DEFS) as PropKind[]) useGLTF.preload(PROP_DEFS[k].url);
}
