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
            className="absolute inset-0"
            shadows
            dpr={[1, 1.5]}
            gl={{
                antialias: true,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.05,
            }}
            camera={{ fov: 70, near: 0.08, far: 50, position: [0, 1.6, 5.5] }}
            onCreated={({ gl }) => gl.setClearColor('#0a0a12')}
        >
            <color attach="background" args={['#0a0a12']} />
            <fog attach="fog" args={['#0a0a12', 6, 22]} />

            <hemisphereLight args={['#6b7fd7', '#1a1218', 0.4]} />
            <ambientLight intensity={0.18} color="#a8b4e0" />
            <directionalLight position={[4, 5, 2]} intensity={0.45} color="#8b9cff" />
            <pointLight position={[3.2, 1.2, 4.3]} intensity={1.2} color="#22c55e" distance={5} decay={2} />
            <pointLight position={[-1.5, 1.2, -1]} intensity={0.6} color="#fbbf24" distance={4} decay={2} />
            <pointLight position={[0, 2, -7]} intensity={1.0} color="#7c5cff" distance={6} decay={2} />
            <pointLight position={[-6, 2, -4]} intensity={0.5} color="#c4a574" distance={5} decay={2} />

            <HouseGeometry />
            <RemotePlayers peers={peers} />
            <FirstPersonController locked={locked} onHotspot={onHotspot} onPose={onPose} />
            <ContactShadows position={[0, 0.02, 0]} opacity={0.35} scale={20} blur={2.2} far={8} />
        </Canvas>
    );
}
