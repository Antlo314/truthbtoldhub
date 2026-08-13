'use client';

/**
 * One-storey furnishings. Every prop here has a FURNITURE collider.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import HouseProp from './HouseProp';
import { useHouseMaterials } from './HouseMaterials';
import { DESK, MAIN_Y, SHELL, u } from './homeMap';
import WallMural from './WallMural';

const X0 = SHELL.minX;
const X1 = SHELL.maxX;
const Z0 = SHELL.minZ;
const Z1 = SHELL.maxZ;

function On({
    x,
    z,
    children,
}: {
    x: number;
    z: number;
    children: React.ReactNode;
}) {
    return <group position={[x, MAIN_Y, z]}>{children}</group>;
}

export default function HomeDecor({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;
    const screenGlow = useMemo(
        () => new THREE.MeshBasicMaterial({ color: '#8ff2ff', toneMapped: false }),
        [],
    );

    return (
        <group>
            <WallMural />

            {/* Rec — wake at the desk */}
            <On x={DESK.x} z={DESK.z}>
                <group rotation={[0, Math.PI, 0]}>
                    <HouseProp model="desk" position={[0, 0, 0]} fit={{ w: 1.8 }}>
                        <mesh position={[0, 0.38, 0]} castShadow={sh}>
                            <boxGeometry args={[1.8, 0.76, 0.8]} />
                            <primitive object={m.woodDark} attach="material" />
                        </mesh>
                    </HouseProp>
                    <HouseProp model="monitor" position={[0, 0.78, -0.12]} fit={{ w: 0.62 }}>
                        <mesh position={[0, 0.25, 0]}>
                            <boxGeometry args={[0.62, 0.4, 0.06]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                    </HouseProp>
                    <HouseProp model="keyboard" position={[0, 0.79, 0.22]} fit={{ w: 0.42 }} >{null}</HouseProp>
                    <HouseProp model="mouse" position={[0.32, 0.79, 0.22]} fit={{ w: 0.07 }} >{null}</HouseProp>
                </group>
                <mesh position={[0, DESK.monitorY, 0.28]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[0.56, 0.34]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
                {!low && (
                    <pointLight position={[0, 1.4, -0.6]} intensity={1.5} color="#8ff2ff" distance={5} decay={2} />
                )}
                <HouseProp model="deskChair" position={[0, 0, -1.05]} rotation={[0, Math.PI, 0]}>
                    <mesh position={[0, 0.45, 0]} castShadow={sh}>
                        <boxGeometry args={[0.5, 0.9, 0.5]} />
                        <primitive object={m.leather} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On x={u(-4.1)} z={u(7.15)}>
                <HouseProp model="sofa" rotation={[0, Math.PI, 0]} fit={{ w: 2.2 }}>
                    <mesh position={[0, 0.4, 0]} castShadow={sh}>
                        <boxGeometry args={[2.2, 0.8, 0.95]} />
                        <primitive object={m.fabric} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On x={u(-4.1)} z={u(6.5)}>
                <HouseProp model="coffeeTable" fit={{ w: 1.0 }} >{null}</HouseProp>
            </On>
            <On x={u(-6.35)} z={u(7.25)}>
                <HouseProp model="floorLamp" fit={{ h: 1.5 }} >{null}</HouseProp>
            </On>
            <On x={u(-3.05)} z={u(7.15)}>
                <mesh position={[0, 0.9, 0]} castShadow={sh}>
                    <boxGeometry args={[0.72, 1.8, 0.62]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh position={[0, 1.35, 0.32]}>
                    <planeGeometry args={[0.55, 0.4]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
            </On>
            <On x={u(-6.45)} z={u(3.1)}>
                <HouseProp model="pottedPlant" fit={{ h: 1.0 }} >{null}</HouseProp>
            </On>
            <On x={u(-4.5)} z={u(6.3)}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <planeGeometry args={[3.2, 2.2]} />
                    <primitive object={m.rug} attach="material" />
                </mesh>
            </On>

            {/* Foyer — Daily Word */}
            <On x={u(1.15)} z={u(6.9)}>
                <HouseProp model="sideTable" fit={{ w: 0.8 }}>
                    <mesh position={[0, 0.4, 0]} castShadow={sh}>
                        <boxGeometry args={[0.76, 0.78, 0.38]} />
                        <primitive object={m.wood} attach="material" />
                    </mesh>
                </HouseProp>
                <mesh position={[0, 0.84, 0]} rotation={[0, 0.3, 0]}>
                    <boxGeometry args={[0.3, 0.02, 0.2]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
            </On>

            {/* The Mark — explicit open doorway (no brick in the hole) */}
            <mesh position={[u(-2.55), 1.15, u(-1.9)]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1.65, 2.25]} />
                <meshBasicMaterial color="#0b0a09" />
            </mesh>

            {/* The Mark */}
            <On x={u(-3.05)} z={u(-3.35)}>
                <mesh position={[0, 0.28, 0]} castShadow={sh}>
                    <boxGeometry args={[0.46, 0.56, 1.25]} />
                    <primitive object={m.wood} attach="material" />
                </mesh>
            </On>
            <mesh position={[X0 + 0.08, 1.55, (u(-4.2) + u(0.5)) / 2]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[u(0.5) - u(-4.2) - 0.35, 2.15]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh position={[(X0 + u(-2.55)) / 2, 1.55, u(-4.2) + 0.08]}>
                <planeGeometry args={[u(-2.55) - X0 - 0.35, 2.15]} />
                <primitive object={m.marble} attach="material" />
            </mesh>

            {/* Bath + spare */}
            <On x={u(-6.15)} z={u(1.3)}>
                <mesh position={[0, 0.3, 0]} castShadow={sh}>
                    <boxGeometry args={[1.55, 0.58, 0.72]} />
                    <primitive object={m.marble} attach="material" />
                </mesh>
            </On>
            <On x={u(-5.7)} z={u(-6.15)}>
                <HouseProp model="bed" rotation={[0, Math.PI / 2, 0]} fit={{ w: 2.0 }}>
                    <mesh position={[0, 0.35, 0]} castShadow={sh}>
                        <boxGeometry args={[2.0, 0.68, 1.55]} />
                        <primitive object={m.linen} attach="material" />
                    </mesh>
                </HouseProp>
            </On>

            {/* Living — library + fire */}
            <On x={u(5.4)} z={u(2.4)}>
                <HouseProp model="sofa" rotation={[0, Math.PI, 0]} fit={{ w: 2.8 }}>
                    <mesh position={[0, 0.4, 0]} castShadow={sh}>
                        <boxGeometry args={[2.8, 0.78, 1.05]} />
                        <primitive object={m.fabric} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On x={u(5.4)} z={u(0.85)}>
                <HouseProp model="coffeeTable" fit={{ w: 1.2 }} >{null}</HouseProp>
            </On>
            <On x={u(6.0)} z={u(3.4)}>
                <HouseProp model="accentChair" rotation={[0, -1.1, 0]} fit={{ w: 0.85 }} >{null}</HouseProp>
            </On>
            {[u(0.8), u(2.1), u(3.4)].map((z, i) => (
                <On key={i} x={X1 - 0.52} z={z}>
                    <HouseProp model={i === 1 ? 'bookcaseOpen' : 'bookcaseClosed'} rotation={[0, -Math.PI / 2, 0]} fit={{ h: 2.15 }}>
                        <mesh position={[0, 1.08, 0]} castShadow={sh}>
                            <boxGeometry args={[0.38, 2.15, 1.05]} />
                            <primitive object={m.woodDark} attach="material" />
                        </mesh>
                    </HouseProp>
                </On>
            ))}
            <On x={X1 - 0.5} z={u(-0.2)}>
                <mesh position={[0, 1.25, 0]} castShadow={sh}>
                    <boxGeometry args={[0.62, 2.5, 1.4]} />
                    <primitive object={m.stone} attach="material" />
                </mesh>
                <mesh position={[-0.34, 0.58, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[0.8, 0.55]} />
                    <meshBasicMaterial color="#ff9a3d" toneMapped={false} />
                </mesh>
                {!low && (
                    <pointLight position={[-0.7, 0.75, 0]} intensity={1.6} color="#ff9a3d" distance={6} decay={2} />
                )}
            </On>
            <On x={u(5.4)} z={u(1.6)}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <planeGeometry args={[4.0, 3.0]} />
                    <primitive object={m.rug} attach="material" />
                </mesh>
            </On>

            {/* Kitchen + codex */}
            <On x={u(5.2)} z={u(-3.4)}>
                <mesh position={[0, 0.48, 0]} castShadow={sh}>
                    <boxGeometry args={[2.8, 0.96, 1.2]} />
                    <primitive object={m.counter} attach="material" />
                </mesh>
                {[-0.85, 0, 0.85].map((dx) => (
                    <HouseProp key={dx} model="barStool" position={[dx, 0, 0.48]} fit={{ h: 0.72 }} >{null}</HouseProp>
                ))}
            </On>
            <On x={u(5.0)} z={Z0 + 0.85}>
                <mesh position={[0, 0.46, 0]} castShadow={sh}>
                    <boxGeometry args={[6.2, 0.92, 0.7]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
                <mesh position={[0, 0.94, 0]}>
                    <boxGeometry args={[6.2, 0.05, 0.74]} />
                    <primitive object={m.counter} attach="material" />
                </mesh>
            </On>
            <On x={u(3.4)} z={Z0 + 0.85}>
                <HouseProp model="fridge" fit={{ h: 1.85 }}>
                    <mesh position={[0, 0.92, 0]} castShadow={sh}>
                        <boxGeometry args={[0.82, 1.85, 0.7]} />
                        <primitive object={m.metal} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On x={u(3.5)} z={u(-2.2)}>
                <mesh position={[0, 0.48, 0]} castShadow={sh}>
                    <boxGeometry args={[1.0, 0.96, 0.46]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
                <mesh position={[0, 1.2, 0]} rotation={[-0.1, 0, 0]}>
                    <planeGeometry args={[0.62, 0.4]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
            </On>

            {/* Dining + Ledger */}
            <On x={u(-0.3)} z={u(-5.8)}>
                <HouseProp model="diningTable" fit={{ w: 1.8 }}>
                    <mesh position={[0, 0.38, 0]} castShadow={sh}>
                        <cylinderGeometry args={[0.88, 0.84, 0.74, 12]} />
                        <primitive object={m.wood} attach="material" />
                    </mesh>
                </HouseProp>
                {[0, 1, 2, 3, 4, 5].map((i) => {
                    const a = (i / 6) * Math.PI * 2;
                    return (
                        <HouseProp
                            key={i}
                            model="diningChair"
                            position={[Math.cos(a) * 1.02, 0, Math.sin(a) * 1.02]}
                            rotation={[0, -a + Math.PI / 2, 0]}
                            fit={{ h: 0.88 }}
                        >{null}</HouseProp>
                    );
                })}
            </On>
            <On x={u(-0.3)} z={Z0 + 0.55}>
                <mesh position={[0, 0.44, 0]} castShadow={sh}>
                    <boxGeometry args={[1.85, 0.88, 0.48]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
                <mesh position={[-0.1, 0.93, 0]} rotation={[-0.12, 0.2, 0]} castShadow={sh}>
                    <boxGeometry args={[0.38, 0.05, 0.28]} />
                    <primitive object={m.leather} attach="material" />
                </mesh>
            </On>

            {/* Hall wayfinder */}
            {/* Paths board — living west wall, south of the living door */}
            <mesh position={[u(1.7) - 0.16, 1.55, u(0.15)]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[1.2, 0.95]} />
                <primitive object={m.book} attach="material" />
            </mesh>
        </group>
    );
}
