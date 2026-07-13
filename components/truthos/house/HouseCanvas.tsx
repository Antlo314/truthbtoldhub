'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import HouseGeometry from './HouseGeometry';
import FirstPersonController from './FirstPersonController';
import RemotePlayers from './RemotePlayers';
import type { Hotspot } from './houseMap';
import type { HousePeer } from '@/lib/truthos/housePresence';

export default function HouseCanvas({
    locked,
    peers,
    onHotspot,
    onPose,
}: {
    locked: boolean;
    peers: HousePeer[];
    onHotspot: (h: Hotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
}) {
    return (
        <Canvas
            className="!absolute !inset-0 !h-full !w-full"
            style={{ width: '100%', height: '100%', display: 'block' }}
            shadows
            dpr={[1, 1.5]}
            gl={{
                antialias: true,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.15,
            }}
            camera={{ fov: 70, near: 0.08, far: 50, position: [0, 1.62, 5.5] }}
            onCreated={({ gl, camera }) => {
                gl.setClearColor('#1a1528');
                camera.lookAt(0, 1.2, 0);
            }}
        >
            <color attach="background" args={['#1a1528']} />
            <fog attach="fog" args={['#1a1528', 12, 32]} />

            <hemisphereLight args={['#9aa8e8', '#2a2030', 0.65]} />
            <ambientLight intensity={0.45} color="#c8c0d8" />
            <directionalLight position={[4, 6, 3]} intensity={0.85} color="#c4d0ff" />
            <pointLight position={[3.2, 1.4, 4.3]} intensity={2.2} color="#4ade80" distance={8} decay={2} />
            <pointLight position={[-1.5, 1.4, -1]} intensity={1.4} color="#fbbf24" distance={7} decay={2} />
            <pointLight position={[0, 2.2, -7]} intensity={1.8} color="#a78bfa" distance={10} decay={2} />
            <pointLight position={[-6, 2.2, -4]} intensity={1.0} color="#e8d5b0" distance={8} decay={2} />
            <pointLight position={[0, 2.5, 5]} intensity={0.8} color="#ffffff" distance={10} decay={2} />

            <HouseGeometry />
            <RemotePlayers peers={peers} />
            <FirstPersonController locked={locked} onHotspot={onHotspot} onPose={onPose} />
            <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={20} blur={2.2} far={8} />
        </Canvas>
    );
}
