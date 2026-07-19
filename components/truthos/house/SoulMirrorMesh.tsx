'use client';

/**
 * Soul Mirror — wall-mounted real-time reflector on bedroom east wall.
 * Faces into the room (−X). Virtual camera includes LocalPlayerBody (layer 1).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import type { HouseMaterials } from './HouseMaterials';
import { LOCAL_BODY_LAYER } from './LocalPlayerBody';

/** Bedroom east wall — north of cinema doorway (opening z 5.45–8.25) */
export const MIRROR_WALL = {
    x: 5.88,
    y: 1.48,
    z: 9.35,
    glassW: 0.82,
    glassH: 1.5,
    /** Glass faces west into bedroom */
    yaw: Math.PI / 2,
};

export default function SoulMirrorMesh({
    low = false,
    rich = true,
    mats,
}: {
    low?: boolean;
    rich?: boolean;
    mats: HouseMaterials;
}) {
    const { x, y, z, glassW, glassH, yaw } = MIRROR_WALL;
    const meshRef = useRef<THREE.Mesh>(null);
    const { gl, scene, camera } = useThree();
    const res = low ? 192 : 512;
    const fbo = useFBO(res, res);
    const virtualCam = useMemo(() => {
        const c = new THREE.PerspectiveCamera();
        c.layers.enable(0);
        c.layers.enable(LOCAL_BODY_LAYER);
        return c;
    }, []);

    const reflectorPlane = useMemo(() => new THREE.Plane(), []);
    const normal = useMemo(() => new THREE.Vector3(), []);
    const mirrorWorldPos = useMemo(() => new THREE.Vector3(), []);
    const lookAtPos = useMemo(() => new THREE.Vector3(), []);
    const rotationMatrix = useMemo(() => new THREE.Matrix4(), []);
    const view = useMemo(() => new THREE.Vector3(), []);
    const q = useMemo(() => new THREE.Quaternion(), []);

    useLayoutEffect(() => {
        camera.layers.disable(LOCAL_BODY_LAYER);
    }, [camera]);

    useFrame(() => {
        const mesh = meshRef.current;
        if (!mesh) return;

        mesh.visible = false;

        mesh.updateWorldMatrix(true, false);
        mesh.getWorldPosition(mirrorWorldPos);
        // Local plane faces −Z; group yaw rotates that into world −X
        normal.set(0, 0, -1);
        normal.transformDirection(mesh.matrixWorld);
        reflectorPlane.setFromNormalAndCoplanarPoint(normal, mirrorWorldPos);

        view.copy(camera.position);
        const dist = reflectorPlane.distanceToPoint(view);
        view.sub(normal.clone().multiplyScalar(2 * dist));

        lookAtPos.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()));
        const distLook = reflectorPlane.distanceToPoint(lookAtPos);
        lookAtPos.sub(normal.clone().multiplyScalar(2 * distLook));

        virtualCam.position.copy(view);
        virtualCam.up.set(0, 1, 0);
        rotationMatrix.lookAt(view, lookAtPos, virtualCam.up);
        virtualCam.quaternion.setFromRotationMatrix(rotationMatrix);
        virtualCam.far = camera.far;
        virtualCam.fov = (camera as THREE.PerspectiveCamera).fov;
        virtualCam.aspect = (camera as THREE.PerspectiveCamera).aspect;
        virtualCam.updateProjectionMatrix();
        virtualCam.updateMatrixWorld();
        virtualCam.layers.enable(0);
        virtualCam.layers.enable(LOCAL_BODY_LAYER);

        const prev = gl.getRenderTarget();
        gl.setRenderTarget(fbo);
        gl.clear(true, true, true);
        gl.render(scene, virtualCam);
        gl.setRenderTarget(prev);

        mesh.visible = true;
        void q;
    });

    return (
        <group position={[x, y, z]} rotation={[0, yaw, 0]}>
            <mesh position={[0, 0, 0.03]} castShadow={!low} receiveShadow={!low}>
                <boxGeometry args={[glassW + 0.32, glassH + 0.36, 0.08]} />
                <primitive object={mats.woodDark} attach="material" />
            </mesh>
            <mesh position={[0, 0, -0.01]} castShadow={!low}>
                <boxGeometry args={[glassW + 0.2, glassH + 0.24, 0.1]} />
                <primitive object={mats.wood} attach="material" />
            </mesh>
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[glassW + 0.1, glassH + 0.12, 0.04]} />
                <primitive object={mats.gold} attach="material" />
            </mesh>

            <mesh ref={meshRef} position={[0, 0, -0.09]}>
                <planeGeometry args={[glassW, glassH]} />
                <meshBasicMaterial
                    map={fbo.texture}
                    toneMapped={false}
                    color={rich ? '#e8f0f8' : '#c8d8e8'}
                />
            </mesh>

            {!low && (
                <mesh position={[0, 0, -0.095]}>
                    <planeGeometry args={[glassW * 0.98, glassH * 0.98]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} />
                </mesh>
            )}
        </group>
    );
}
