'use client';

/**
 * Soul Mirror — wall-mounted real-time reflector.
 * Virtual camera enables all layers so LocalPlayerBody (layer 1) appears like a true mirror.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import type { HouseMaterials } from './HouseMaterials';
import { LOCAL_BODY_LAYER } from './LocalPlayerBody';

export const MIRROR_WALL = {
    x: 3.15,
    y: 1.48,
    z: 9.32,
    glassW: 0.78,
    glassH: 1.45,
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
    const { x, y, z, glassW, glassH } = MIRROR_WALL;
    const meshRef = useRef<THREE.Mesh>(null);
    const { gl, scene, camera } = useThree();
    const res = low ? 256 : 512;
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
    const target = useMemo(() => new THREE.Vector3(), []);
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
        // Glass faces into room (−Z in local; after no rotation that's world −Z)
        normal.set(0, 0, -1);
        normal.transformDirection(mesh.matrixWorld);
        reflectorPlane.setFromNormalAndCoplanarPoint(normal, mirrorWorldPos);

        // Reflect camera across the mirror plane
        view.copy(camera.position);
        const dist = reflectorPlane.distanceToPoint(view);
        view.sub(normal.clone().multiplyScalar(2 * dist));

        // Reflection look-at
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

        // Clip bias
        const clipBias = 0.003;
        const plane = reflectorPlane.clone();
        plane.applyMatrix4(virtualCam.matrixWorldInverse);
        const clipPlane = new THREE.Vector4(
            plane.normal.x,
            plane.normal.y,
            plane.normal.z,
            plane.constant + clipBias,
        );
        const projectionMatrix = virtualCam.projectionMatrix.clone();
        q.set(
            (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0],
            (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5],
            -1,
            (1 + projectionMatrix.elements[10]) / projectionMatrix.elements[14],
        );
        // Simplified: render without oblique clip for stability
        const prev = gl.getRenderTarget();
        gl.setRenderTarget(fbo);
        gl.clear(true, true, true);
        gl.render(scene, virtualCam);
        gl.setRenderTarget(prev);

        mesh.visible = true;
    });

    return (
        <group>
            {/* Wall backplate */}
            <mesh position={[x, y, z + 0.03]} castShadow receiveShadow>
                <boxGeometry args={[glassW + 0.32, glassH + 0.36, 0.08]} />
                <primitive object={mats.woodDark} attach="material" />
            </mesh>
            {/* Wood frame */}
            <mesh position={[x, y, z - 0.01]} castShadow>
                <boxGeometry args={[glassW + 0.2, glassH + 0.24, 0.1]} />
                <primitive object={mats.wood} attach="material" />
            </mesh>
            {/* Gold trim */}
            <mesh position={[x, y, z - 0.05]}>
                <boxGeometry args={[glassW + 0.1, glassH + 0.12, 0.04]} />
                <primitive object={mats.gold} attach="material" />
            </mesh>

            {/* Real-time mirror surface */}
            <mesh ref={meshRef} position={[x, y, z - 0.09]}>
                <planeGeometry args={[glassW, glassH]} />
                <meshBasicMaterial
                    map={fbo.texture}
                    toneMapped={false}
                    color={rich ? '#e8f0f8' : '#c8d8e8'}
                />
            </mesh>

            {/* Specular sheen edge */}
            {!low && (
                <mesh position={[x, y, z - 0.095]}>
                    <planeGeometry args={[glassW * 0.98, glassH * 0.98]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} />
                </mesh>
            )}
        </group>
    );
}
