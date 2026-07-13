'use client';

import { useEffect, useState } from 'react';
import { ContactShadows } from '@react-three/drei';
import type { DeviceTarget } from './types';
import { ANCHORS } from './types';
import { EveningLights } from './EveningLights';
import { FlickerScreen } from './FlickerScreen';
import { useCameraZoom } from './useCameraZoom';

/**
 * Procedural evening bedroom (placeholder for baked GLB + lightmaps).
 * Keep draw calls low; swap meshes for glTF when art lands.
 */
export function BedroomMeshes({ target }: { target: DeviceTarget }) {
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color="#1a1520" roughness={0.92} />
            </mesh>

            <mesh position={[0, 1.6, -2.4]} receiveShadow>
                <boxGeometry args={[10, 3.2, 0.15]} />
                <meshStandardMaterial color="#2a2438" roughness={0.9} />
            </mesh>
            <mesh position={[-3.2, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <boxGeometry args={[8, 3.2, 0.15]} />
                <meshStandardMaterial color="#252033" roughness={0.9} />
            </mesh>

            <mesh position={[1.8, 1.85, -2.3]}>
                <planeGeometry args={[1.6, 1.3]} />
                <meshStandardMaterial
                    color="#1e1b4b"
                    emissive="#6366f1"
                    emissiveIntensity={0.35}
                    roughness={0.2}
                    metalness={0.1}
                    transparent
                    opacity={0.85}
                />
            </mesh>
            <mesh position={[1.8, 1.85, -2.32]}>
                <boxGeometry args={[1.75, 1.45, 0.06]} />
                <meshStandardMaterial color="#1a1525" roughness={0.8} />
            </mesh>

            <group position={[-1.1, 0, 0.6]}>
                <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2.0, 0.35, 1.5]} />
                    <meshStandardMaterial color="#1e1830" roughness={0.88} />
                </mesh>
                <mesh position={[0, 0.5, 0]} castShadow>
                    <boxGeometry args={[1.9, 0.12, 1.35]} />
                    <meshStandardMaterial color="#2a2240" roughness={0.95} />
                </mesh>
                <mesh position={[0, 0.55, -0.55]} castShadow>
                    <boxGeometry args={[0.7, 0.18, 0.35]} />
                    <meshStandardMaterial color="#252038" roughness={0.9} />
                </mesh>
            </group>

            <mesh position={[-2.4, 0.55, -1.6]} castShadow receiveShadow>
                <boxGeometry args={[1.1, 1.1, 0.45]} />
                <meshStandardMaterial color="#2c241c" roughness={0.75} />
            </mesh>

            <group position={[1.2, 0, -0.9]}>
                <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.4, 0.06, 0.7]} />
                    <meshStandardMaterial color="#2a2218" roughness={0.7} />
                </mesh>
                <mesh position={[-0.55, 0.36, 0]} castShadow>
                    <boxGeometry args={[0.08, 0.72, 0.55]} />
                    <meshStandardMaterial color="#221c16" roughness={0.8} />
                </mesh>
                <mesh position={[0.55, 0.36, 0]} castShadow>
                    <boxGeometry args={[0.08, 0.72, 0.55]} />
                    <meshStandardMaterial color="#221c16" roughness={0.8} />
                </mesh>
            </group>

            {target === 'phone' && (
                <mesh position={ANCHORS.phone.position} castShadow>
                    <boxGeometry args={[0.16, 0.01, 0.32]} />
                    <meshStandardMaterial color="#111" roughness={0.4} metalness={0.5} />
                </mesh>
            )}
        </group>
    );
}

export function BedroomSceneRoot({
    target,
    interactive,
    onEnterDevice,
}: {
    target: DeviceTarget;
    interactive: boolean;
    onEnterDevice: () => void;
}) {
    const [flicker, setFlicker] = useState(0.7);
    const { frameRoom, zoomIntoDevice, isTweening } = useCameraZoom();

    useEffect(() => {
        frameRoom(target, true);
    }, [target, frameRoom]);

    const handleSelect = () => {
        if (!interactive || isTweening()) return;
        zoomIntoDevice(target, onEnterDevice);
    };

    return (
        <>
            <EveningLights target={target} flicker={flicker} />
            <BedroomMeshes target={target} />
            <FlickerScreen
                target={target}
                active={interactive}
                onFlicker={setFlicker}
                onSelect={handleSelect}
            />
            <ContactShadows
                position={[0, 0.01, 0]}
                opacity={0.45}
                scale={12}
                blur={2.5}
                far={6}
            />
        </>
    );
}
