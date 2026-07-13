'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import HouseGeometry from './HouseGeometry';
import HouseDecor from './HouseDecor';
import FirstPersonController from './FirstPersonController';
import RemotePlayers from './RemotePlayers';
import type { Hotspot } from './houseMap';
import type { HousePeer } from '@/lib/truthos/housePresence';

export default function HouseCanvas({
    locked,
    mobile,
    peers,
    onHotspot,
    onPose,
    onInteractRequest,
    onMoveActivity,
}: {
    locked: boolean;
    mobile: boolean;
    peers: HousePeer[];
    onHotspot: (h: Hotspot | null) => void;
    onPose: (p: { x: number; y: number; z: number; yaw: number }) => void;
    onInteractRequest?: () => void;
    onMoveActivity?: (kind: 'move' | 'look' | 'jump' | 'idle') => void;
}) {
    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                minHeight: '100dvh',
                background: '#1a1528',
            }}
        >
            <Canvas
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    touchAction: 'none',
                }}
                shadows
                dpr={[1, 1.75]}
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.35,
                }}
                camera={{ fov: 72, near: 0.08, far: 60, position: [0, 1.62, 5.5] }}
                onCreated={({ gl, camera, size }) => {
                    gl.setClearColor('#2a2440', 1);
                    gl.setSize(size.width, size.height);
                    camera.position.set(0, 1.62, 5.5);
                    camera.lookAt(0, 1.35, 0);
                }}
            >
                <color attach="background" args={['#2a2440']} />
                <fog attach="fog" args={['#2a2440', 14, 36]} />

                <hemisphereLight args={['#c8d4ff', '#3a3048', 0.85]} />
                <ambientLight intensity={0.7} color="#ddd5f0" />
                <directionalLight position={[5, 8, 4]} intensity={1.15} color="#e8ecff" castShadow />
                <directionalLight position={[-3, 4, -2]} intensity={0.45} color="#b8a0ff" />
                <pointLight position={[3.2, 1.4, 4.3]} intensity={2.8} color="#4ade80" distance={10} decay={2} />
                <pointLight position={[-1.5, 1.4, -1]} intensity={1.8} color="#fbbf24" distance={9} decay={2} />
                <pointLight position={[0, 2.2, -7]} intensity={2.2} color="#a78bfa" distance={12} decay={2} />
                <pointLight position={[-6, 2.2, -4]} intensity={1.3} color="#f0e0c0" distance={10} decay={2} />
                <pointLight position={[0, 2.5, 5]} intensity={1.2} color="#ffffff" distance={12} decay={2} />
                <pointLight position={[0, 2.0, 0]} intensity={0.9} color="#e0d4ff" distance={14} decay={2} />

                <HouseGeometry />
                <HouseDecor />
                <RemotePlayers peers={peers} />
                <FirstPersonController
                    locked={locked}
                    mobile={mobile}
                    onHotspot={onHotspot}
                    onPose={onPose}
                    onInteractRequest={onInteractRequest}
                    onMoveActivity={onMoveActivity}
                />
                <ContactShadows position={[0, 0.02, 0]} opacity={0.28} scale={20} blur={2.2} far={8} />
            </Canvas>
        </div>
    );
}
