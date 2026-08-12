'use client';

/**
 * Furnishing the Safe House — every room lived-in.
 *
 * Kenney CC0 furniture through the existing HouseProp pipeline (each
 * prop keeps a primitive fallback, so a missing model never leaves a
 * hole). Positions ride the same u() scale as the plan.
 *
 * The rec-room desk matters most: it is where every session BEGINS —
 * the player wakes sitting in front of this monitor, and the monitor's
 * glow is the first light they see. The bookshelf wall in the living
 * room is the Library; the sideboard against the dining wall carries
 * the Ledger — the Daily Word, off the floor, onto furniture.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import HouseProp from './HouseProp';
import { useHouseMaterials } from './HouseMaterials';
import { DESK, MAIN_Y, SHELL, UPPER_Y, u } from './homeMap';

const Z1 = SHELL.maxZ;
const X1 = SHELL.maxX;
const X0 = SHELL.minX;

/** A prop standing on a storey's floor */
function On({
    level,
    x,
    z,
    children,
}: {
    level: 'main' | 'upper';
    x: number;
    z: number;
    children: React.ReactNode;
}) {
    return <group position={[x, level === 'upper' ? UPPER_Y : MAIN_Y, z]}>{children}</group>;
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
            {/* ═══ REC ROOM — where you wake up ═══════════════ */}
            <On level="main" x={DESK.x} z={DESK.z}>
                {/* The desk, facing the seat (player sits at z < desk) */}
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
                {/* The live screen — the room's light source */}
                <mesh position={[0, DESK.monitorY, 0.28]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[0.56, 0.34]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
                {!low && (
                    <pointLight position={[0, 1.4, -0.6]} intensity={1.7} color="#8ff2ff" distance={5} decay={2} />
                )}
                {/* The chair you rise from */}
                <HouseProp model="deskChair" position={[0, 0, -1.05]} rotation={[0, Math.PI, 0]}>
                    <mesh position={[0, 0.45, 0]} castShadow={sh}>
                        <boxGeometry args={[0.5, 0.9, 0.5]} />
                        <primitive object={m.leather} attach="material" />
                    </mesh>
                </HouseProp>
            </On>

            <On level="main" x={u(-4.2)} z={u(7.2)}>
                <HouseProp model="sofa" rotation={[0, Math.PI, 0]} fit={{ w: 2.4 }}>
                    <mesh position={[0, 0.4, 0]} castShadow={sh}>
                        <boxGeometry args={[2.4, 0.8, 1.0]} />
                        <primitive object={m.fabric} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On level="main" x={u(-4.2)} z={u(5.4)}>
                <HouseProp model="coffeeTable" fit={{ w: 1.1 }} >{null}</HouseProp>
            </On>
            <On level="main" x={u(-6.4)} z={u(7.3)}>
                <HouseProp model="floorLamp" fit={{ h: 1.5 }} >{null}</HouseProp>
            </On>
            <On level="main" x={u(-2.95)} z={u(7.2)}>
                {/* Arcade cabinet — a tall dark box with a glowing marquee */}
                <mesh position={[0, 0.9, 0]} castShadow={sh}>
                    <boxGeometry args={[0.8, 1.8, 0.7]} />
                    <primitive object={m.metalDark} attach="material" />
                </mesh>
                <mesh position={[0, 1.35, 0.36]}>
                    <planeGeometry args={[0.6, 0.45]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
            </On>
            {/* Mail tray by the front door */}
            <On level="main" x={u(-1.6)} z={u(6.9)}>
                <HouseProp model="sideTable" fit={{ w: 0.9 }}>
                    <mesh position={[0, 0.4, 0]} castShadow={sh}>
                        <boxGeometry args={[0.9, 0.8, 0.4]} />
                        <primitive object={m.wood} attach="material" />
                    </mesh>
                </HouseProp>
                <mesh position={[0, 0.84, 0]} rotation={[0, 0.4, 0]}>
                    <boxGeometry args={[0.32, 0.02, 0.22]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
            </On>
            <On level="main" x={u(-6.6)} z={u(3.0)}>
                <HouseProp model="pottedPlant" fit={{ h: 1.0 }} >{null}</HouseProp>
            </On>

            {/* Rugs ground the rooms */}
            <On level="main" x={u(-4.6)} z={u(6.2)}>
                <HouseProp model="rugRect" fit={{ w: 3.6 }}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                        <planeGeometry args={[3.6, 2.6]} />
                        <primitive object={m.rug} attach="material" />
                    </mesh>
                </HouseProp>
            </On>

            {/* ═══ MAIN BEDROOMS ══════════════════════════════ */}
            <On level="main" x={u(-5.9)} z={u(-2.4)}>
                <HouseProp model="bed" rotation={[0, Math.PI / 2, 0]} fit={{ w: 2.1 }}>
                    <mesh position={[0, 0.35, 0]} castShadow={sh}>
                        <boxGeometry args={[2.1, 0.7, 1.7]} />
                        <primitive object={m.linen} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On level="main" x={u(-6.4)} z={u(-3.9)}>
                <HouseProp model="nightstand" fit={{ w: 0.55 }} >{null}</HouseProp>
            </On>
            <On level="main" x={u(-1.0)} z={u(-6.2)}>
                <HouseProp model="bed" fit={{ w: 2.1 }}>
                    <mesh position={[0, 0.35, 0]} castShadow={sh}>
                        <boxGeometry args={[1.7, 0.7, 2.1]} />
                        <primitive object={m.linen} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On level="main" x={u(0.6)} z={u(-6.9)}>
                <HouseProp model="dresser" fit={{ w: 1.1 }} >{null}</HouseProp>
            </On>

            {/* Bath fixtures — simple volumes read as a bath at a glance */}
            <On level="main" x={u(-6.2)} z={u(1.4)}>
                <mesh position={[0, 0.3, 0]} castShadow={sh}>
                    <boxGeometry args={[1.7, 0.6, 0.8]} />
                    <primitive object={m.marble} attach="material" />
                </mesh>
            </On>

            {/* ═══ UPPER — KITCHEN ════════════════════════════ */}
            <On level="upper" x={u(3.4)} z={u(-2.6)}>
                {/* Island with stools */}
                <mesh position={[0, 0.5, 0]} castShadow={sh}>
                    <boxGeometry args={[4.4, 1.0, 1.4]} />
                    {/* Terrazzo worktop - the entry marble read as one stone
                        for the whole house */}
                    <primitive object={m.counter} attach="material" />
                </mesh>
                {[-1.4, 0, 1.4].map((dx) => (
                    <HouseProp key={dx} model="barStool" position={[dx, 0, 1.05]} fit={{ h: 0.75 }} >{null}</HouseProp>
                ))}
            </On>
            {/* Counter run along the north wall */}
            <On level="upper" x={u(3.2)} z={Z1 * 0 - SHELL.maxZ + 0.9}>
                <mesh position={[0, 0.48, 0]} castShadow={sh}>
                    <boxGeometry args={[7.6, 0.96, 0.75]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
                <mesh position={[0, 0.98, 0]}>
                    <boxGeometry args={[7.6, 0.05, 0.8]} />
                    <primitive object={m.counter} attach="material" />
                </mesh>
            </On>
            <On level="upper" x={u(1.6)} z={u(-6.9)}>
                <HouseProp model="fridge" fit={{ h: 1.9 }}>
                    <mesh position={[0, 0.95, 0]} castShadow={sh}>
                        <boxGeometry args={[0.9, 1.9, 0.8]} />
                        <primitive object={m.metal} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On level="upper" x={u(4.4)} z={u(-6.9)}>
                <HouseProp model="kitchenStove" fit={{ w: 0.9 }} >{null}</HouseProp>
            </On>
            <On level="upper" x={u(5.6)} z={u(-6.9)}>
                <HouseProp model="coffeeMachine" position={[0, 1.0, 0]} fit={{ w: 0.35 }} >{null}</HouseProp>
            </On>

            {/* ═══ UPPER — DINING + THE LEDGER ════════════════ */}
            <On level="upper" x={u(1.1)} z={u(2.0)}>
                <HouseProp model="diningTable" fit={{ w: 1.9 }}>
                    <mesh position={[0, 0.38, 0]} castShadow={sh}>
                        <cylinderGeometry args={[0.95, 0.9, 0.76, 12]} />
                        <primitive object={m.wood} attach="material" />
                    </mesh>
                </HouseProp>
                {[0, 1, 2, 3, 4, 5].map((i) => {
                    const a = (i / 6) * Math.PI * 2;
                    return (
                        <HouseProp
                            key={i}
                            model="diningChair"
                            position={[Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5]}
                            rotation={[0, -a + Math.PI / 2, 0]}
                            fit={{ h: 0.9 }}
                        >{null}</HouseProp>
                    );
                })}
            </On>
            {/* The sideboard — the Daily Word lives HERE now, against the
                wall, not in the middle of the floor */}
            <On level="upper" x={u(0.2)} z={u(3.3)}>
                <mesh position={[0, 0.45, 0]} castShadow={sh}>
                    <boxGeometry args={[1.9, 0.9, 0.5]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
                <mesh position={[-0.1, 0.95, 0]} rotation={[-0.14, 0.25, 0]} castShadow={sh}>
                    <boxGeometry args={[0.4, 0.06, 0.3]} />
                    <primitive object={m.leather} attach="material" />
                </mesh>
                <mesh position={[-0.08, 0.99, 0.01]} rotation={[-0.14, 0.25, 0]}>
                    <boxGeometry args={[0.32, 0.012, 0.23]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
                <HouseProp model="tableLamp" position={[0.65, 0.9, 0]} fit={{ h: 0.45 }} >{null}</HouseProp>
            </On>

            {/* ═══ UPPER — LIVING: THE BOOKSHELF WALL ═════════ */}
            {/* The Library — a full wall of shelves on the east side */}
            {[u(0.1), u(1.3), u(2.5)].map((z, i) => (
                <On key={i} level="upper" x={X1 - 0.55} z={z}>
                    <HouseProp
                        model={i === 1 ? 'bookcaseOpen' : 'bookcaseClosed'}
                        rotation={[0, -Math.PI / 2, 0]}
                        fit={{ h: 2.2 }}
                    >
                        <mesh position={[0, 1.1, 0]} castShadow={sh}>
                            <boxGeometry args={[0.4, 2.2, 1.1]} />
                            <primitive object={m.woodDark} attach="material" />
                        </mesh>
                    </HouseProp>
                    <HouseProp model="booksStack" position={[-0.35, 1.15, 0]} fit={{ w: 0.3 }} >{null}</HouseProp>
                </On>
            ))}

            <On level="upper" x={u(4.6)} z={u(1.6)}>
                <HouseProp model="sofa" rotation={[0, Math.PI, 0]} fit={{ w: 3.0 }}>
                    <mesh position={[0, 0.4, 0]} castShadow={sh}>
                        <boxGeometry args={[3.0, 0.8, 1.1]} />
                        <primitive object={m.fabric} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            <On level="upper" x={u(4.6)} z={u(-0.1)}>
                <HouseProp model="coffeeTable" fit={{ w: 1.3 }} >{null}</HouseProp>
            </On>
            <On level="upper" x={u(6.2)} z={u(3.2)}>
                <HouseProp model="accentChair" rotation={[0, -Math.PI / 1.6, 0]} fit={{ w: 0.9 }} >{null}</HouseProp>
            </On>
            {/* Fireplace mass on the east wall, south of the shelves */}
            <On level="upper" x={X1 - 0.45} z={u(-0.9)}>
                <mesh position={[0, 1.3, 0]} castShadow={sh}>
                    <boxGeometry args={[0.7, 2.6, 1.6]} />
                    <primitive object={m.stone} attach="material" />
                </mesh>
                <mesh position={[-0.36, 0.62, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[0.9, 0.6]} />
                    <meshBasicMaterial color="#ff9a3d" toneMapped={false} />
                </mesh>
                {!low && (
                    <pointLight position={[-0.8, 0.8, 0]} intensity={1.9} color="#ff9a3d" distance={7} decay={2} />
                )}
            </On>
            {/* Living rug */}
            <On level="upper" x={u(4.6)} z={u(0.8)}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <planeGeometry args={[4.6, 3.4]} />
                    <primitive object={m.rug} attach="material" />
                </mesh>
            </On>

            {/* ═══ UPPER — CODEX niche in the kitchen's east end ═ */}
            <On level="upper" x={u(2.6)} z={u(-4.0)}>
                <mesh position={[0, 0.5, 0]} castShadow={sh}>
                    <boxGeometry args={[1.1, 1.0, 0.5]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
                <mesh position={[0, 1.25, 0]} rotation={[-0.1, 0, 0]}>
                    <planeGeometry args={[0.7, 0.45]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
            </On>

            {/* ═══ UPPER — WALL MAP on the landing ════════════ */}
            <On level="upper" x={u(-2.55)} z={u(2.2)}>
                <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 1.5, 0]}>
                    <planeGeometry args={[1.6, 1.1]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
                <mesh rotation={[0, Math.PI / 2, 0]} position={[0.02, 1.5, 0]}>
                    <planeGeometry args={[1.7, 1.2]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            </On>

            {/* ═══ UPPER — MASTER ═════════════════════════════ */}
            <On level="upper" x={u(-5.2)} z={u(5.6)}>
                <HouseProp model="bed" rotation={[0, Math.PI, 0]} fit={{ w: 2.4 }}>
                    <mesh position={[0, 0.35, 0]} castShadow={sh}>
                        <boxGeometry args={[2.4, 0.7, 2.2]} />
                        <primitive object={m.linen} attach="material" />
                    </mesh>
                </HouseProp>
            </On>
            {[u(-6.7), u(-3.7)].map((x, i) => (
                <On key={i} level="upper" x={x} z={u(6.8)}>
                    <HouseProp model="bedsideTable" fit={{ w: 0.55 }} >{null}</HouseProp>
                    <HouseProp model="tableLamp" position={[0, 0.55, 0]} fit={{ h: 0.4 }} >{null}</HouseProp>
                </On>
            ))}
            <On level="upper" x={u(-3.6)} z={u(-2.8)}>
                <HouseProp model="bed" rotation={[0, Math.PI / 2, 0]} fit={{ w: 2.0 }}>
                    <mesh position={[0, 0.35, 0]} castShadow={sh}>
                        <boxGeometry args={[2.0, 0.7, 1.6]} />
                        <primitive object={m.linen} attach="material" />
                    </mesh>
                </HouseProp>
            </On>

            {/* Plants soften the corners */}
            {[
                { level: 'upper' as const, x: u(6.6), z: u(3.5) },
                { level: 'upper' as const, x: u(1.2), z: u(-4.0) },
                { level: 'main' as const, x: u(-0.4), z: u(7.2) },
            ].map((p, i) => (
                <On key={i} level={p.level} x={p.x} z={p.z}>
                    <HouseProp model="pottedPlant" fit={{ h: 0.9 }} >{null}</HouseProp>
                </On>
            ))}

            {/* Balcony furniture — the render's outdoor room */}
            <On level="upper" x={u(4.6)} z={u(5.6)}>
                <HouseProp model="accentChair" rotation={[0, Math.PI, 0]} fit={{ w: 0.9 }} >{null}</HouseProp>
            </On>
            <On level="upper" x={u(5.9)} z={u(5.6)}>
                <HouseProp model="coffeeTable" fit={{ w: 0.8 }} >{null}</HouseProp>
            </On>
        </group>
    );
}
