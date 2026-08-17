'use client';

/**
 * One-storey furnishings. Every volume here is a FURNITURE solid —
 * one mesh (or one HouseProp) per row, sized to that row's hx/hz/h.
 * Nothing is nested inside another solid's box.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import HouseProp from './HouseProp';
import { useHouseMaterials } from './HouseMaterials';
import { DESK, MAIN_Y, SHELL, furn, u, type Furnishing } from './homeMap';
import WallMural from './WallMural';

const X0 = SHELL.minX;

function Solid({
    f,
    children,
}: {
    f: Furnishing;
    children: React.ReactNode;
}) {
    // Position only — the box stays axis-aligned with the collider.
    // HouseProp gets f.yaw so the GLB can face the room.
    return <group position={[f.x, MAIN_Y, f.z]}>{children}</group>;
}

function Box({
    f,
    mat,
    shadow,
}: {
    f: Furnishing;
    mat: THREE.Material;
    shadow: boolean;
}) {
    return (
        <mesh position={[0, f.h / 2, 0]} castShadow={shadow} receiveShadow={shadow}>
            <boxGeometry args={[f.hx * 2, f.h, f.hz * 2]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

export default function HomeDecor({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;
    const screenGlow = useMemo(
        () => new THREE.MeshBasicMaterial({ color: '#8ff2ff', toneMapped: false }),
        [],
    );

    const desk = furn('desk');
    const chair = furn('desk chair');
    const recSofa = furn('rec sofa');
    const recTable = furn('rec coffee table');
    const lamp = furn('floor lamp');
    const arcade = furn('arcade cabinet');
    const plant = furn('rec plant');
    const tray = furn('daily word tray');
    const bench = furn('mark bench');
    const vanity = furn('bath vanity');
    const bed = furn('spare bed');
    const livSofa = furn('living sofa');
    const livTable = furn('living coffee table');
    const accent = furn('accent chair');
    const shelves = furn('bookshelf wall');
    const hearth = furn('media wall');
    const island = furn('island');
    const stoolL = furn('island stool L');
    const stoolC = furn('island stool C');
    const stoolR = furn('island stool R');
    const counter = furn('counter run');
    const fridge = furn('fridge');
    const codex = furn('codex desk');
    const table = furn('dining table');
    const chN = furn('dining chair N');
    const chS = furn('dining chair S');
    const chE = furn('dining chair E');
    const chW = furn('dining chair W');
    const ledger = furn('sideboard (Ledger)');

    return (
        <group>
            <WallMural />

            {/* Rec */}
            <Solid f={desk}>
                <HouseProp model="desk" rotation={[0, desk.yaw ?? 0, 0]} fit={{ w: desk.hx * 2, d: desk.hz * 2 }}>
                    <Box f={desk} mat={m.woodDark} shadow={sh} />
                </HouseProp>
                <group position={[0, desk.h, -0.08]}>
                    <HouseProp model="monitor" fit={{ w: 0.56 }}>
                        <mesh position={[0, 0.2, 0]}>
                            <boxGeometry args={[0.56, 0.36, 0.05]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
                <group position={[0, desk.h, 0.16]}>
                    <HouseProp model="keyboard" fit={{ w: 0.36 }}>
                        {null}
                    </HouseProp>
                </group>
                <mesh position={[0, DESK.monitorY - MAIN_Y, 0.18]}>
                    <planeGeometry args={[0.5, 0.3]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
                {!low && (
                    <pointLight position={[0, 1.35, -0.2]} intensity={1.5} color="#8ff2ff" distance={5} decay={2} />
                )}
            </Solid>
            <Solid f={chair}>
                <HouseProp model="deskChair" rotation={[0, chair.yaw ?? 0, 0]} fit={{ w: chair.hx * 2, d: chair.hz * 2 }}>
                    <Box f={chair} mat={m.leather} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={recSofa}>
                <HouseProp model="sofa" rotation={[0, recSofa.yaw ?? 0, 0]} fit={{ w: recSofa.hx * 2, d: recSofa.hz * 2 }}>
                    <Box f={recSofa} mat={m.fabric} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={recTable}>
                <HouseProp model="coffeeTable" fit={{ w: recTable.hx * 2, d: recTable.hz * 2 }}>
                    <Box f={recTable} mat={m.wood} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={lamp}>
                <HouseProp model="floorLamp" fit={{ h: lamp.h }}>
                    <Box f={lamp} mat={m.metalDark} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={arcade}>
                <Box f={arcade} mat={m.metalDark} shadow={sh} />
                <mesh position={[0, 1.25, arcade.hz + 0.005]}>
                    <planeGeometry args={[0.5, 0.36]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
            </Solid>
            <Solid f={plant}>
                <HouseProp model="pottedPlant" fit={{ h: plant.h }}>
                    <Box f={plant} mat={m.wood} shadow={sh} />
                </HouseProp>
            </Solid>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12.4, 0.015, 13.0]} receiveShadow={sh}>
                <planeGeometry args={[3.0, 3.4]} />
                <primitive object={m.rug} attach="material" />
            </mesh>

            {/* Foyer */}
            <Solid f={tray}>
                <HouseProp model="bedsideTable" fit={{ w: tray.hx * 2, d: tray.hz * 2 }}>
                    <Box f={tray} mat={m.wood} shadow={sh} />
                </HouseProp>
                <mesh position={[0, tray.h + 0.015, 0]} rotation={[0, 0.3, 0]}>
                    <boxGeometry args={[0.22, 0.02, 0.16]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
            </Solid>

            {/* The Mark — plaster on the walls, not in the doorway */}
            <Solid f={bench}>
                <Box f={bench} mat={m.wood} shadow={sh} />
            </Solid>
            <mesh position={[X0 + 0.08, 1.55, (u(-4.2) + u(0.5)) / 2]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[u(0.5) - u(-4.2) - 0.35, 2.15]} />
                <primitive object={m.marble} attach="material" />
            </mesh>
            <mesh position={[(X0 + u(-2.55)) / 2, 1.55, u(-4.2) + 0.08]}>
                <planeGeometry args={[u(-2.55) - X0 - 0.35, 2.15]} />
                <primitive object={m.marble} attach="material" />
            </mesh>

            {/* Bath + spare */}
            <Solid f={vanity}>
                <Box f={vanity} mat={m.marble} shadow={sh} />
            </Solid>
            <Solid f={bed}>
                <HouseProp model="bed" rotation={[0, bed.yaw ?? 0, 0]} fit={{ w: bed.hz * 2, d: bed.hx * 2 }}>
                    <Box f={bed} mat={m.linen} shadow={sh} />
                </HouseProp>
            </Solid>

            {/* Living */}
            <Solid f={livSofa}>
                <HouseProp model="sofa" rotation={[0, livSofa.yaw ?? 0, 0]} fit={{ w: livSofa.hz * 2, d: livSofa.hx * 2 }}>
                    <Box f={livSofa} mat={m.fabric} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={livTable}>
                <HouseProp model="coffeeTable" fit={{ w: livTable.hx * 2, d: livTable.hz * 2 }}>
                    <Box f={livTable} mat={m.wood} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={accent}>
                <HouseProp model="accentChair" rotation={[0, accent.yaw ?? 0, 0]} fit={{ w: accent.hx * 2 }}>
                    <Box f={accent} mat={m.leather} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={shelves}>
                <HouseProp model="bookcase" rotation={[0, shelves.yaw ?? 0, 0]} fit={{ h: shelves.h, d: shelves.hz * 2 }}>
                    <Box f={shelves} mat={m.woodDark} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={hearth}>
                <Box f={hearth} mat={m.stone} shadow={sh} />
                <mesh position={[-hearth.hx - 0.005, 0.58, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[0.7, 0.5]} />
                    <meshBasicMaterial color="#ff9a3d" toneMapped={false} />
                </mesh>
                {!low && (
                    <pointLight position={[-0.55, 0.7, 0]} intensity={1.6} color="#ff9a3d" distance={6} decay={2} />
                )}
            </Solid>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[9.4, 0.015, 4.5]} receiveShadow={sh}>
                <planeGeometry args={[3.6, 3.2]} />
                <primitive object={m.rug} attach="material" />
            </mesh>

            {/* Kitchen */}
            <Solid f={island}>
                <Box f={island} mat={m.counter} shadow={sh} />
            </Solid>
            {[stoolL, stoolC, stoolR].map((s) => (
                <Solid key={s.name} f={s}>
                    <HouseProp model="barStool" fit={{ h: s.h }}>
                        <Box f={s} mat={m.woodDark} shadow={sh} />
                    </HouseProp>
                </Solid>
            ))}
            <Solid f={counter}>
                <Box f={counter} mat={m.woodDark} shadow={sh} />
                <mesh position={[0, counter.h + 0.025, 0]}>
                    <boxGeometry args={[counter.hx * 2, 0.05, counter.hz * 2 + 0.04]} />
                    <primitive object={m.counter} attach="material" />
                </mesh>
            </Solid>
            <Solid f={fridge}>
                <HouseProp model="fridge" fit={{ h: fridge.h, w: fridge.hx * 2, d: fridge.hz * 2 }}>
                    <Box f={fridge} mat={m.metal} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={codex}>
                <Box f={codex} mat={m.woodDark} shadow={sh} />
                <mesh position={[0, codex.h + 0.22, 0]} rotation={[-0.1, 0, 0]}>
                    <planeGeometry args={[0.56, 0.34]} />
                    <primitive object={screenGlow} attach="material" />
                </mesh>
            </Solid>

            {/* Dining */}
            <Solid f={table}>
                <HouseProp model="diningTable" fit={{ w: table.hx * 2, d: table.hz * 2 }}>
                    <Box f={table} mat={m.wood} shadow={sh} />
                </HouseProp>
            </Solid>
            {[chN, chS, chE, chW].map((c) => (
                <Solid key={c.name} f={c}>
                    <HouseProp model="diningChair" rotation={[0, c.yaw ?? 0, 0]} fit={{ h: c.h }}>
                        <Box f={c} mat={m.woodDark} shadow={sh} />
                    </HouseProp>
                </Solid>
            ))}
            <Solid f={ledger}>
                <Box f={ledger} mat={m.woodDark} shadow={sh} />
                <mesh position={[-0.08, ledger.h + 0.03, 0]} rotation={[-0.12, 0.2, 0]} castShadow={sh}>
                    <boxGeometry args={[0.32, 0.04, 0.22]} />
                    <primitive object={m.leather} attach="material" />
                </mesh>
            </Solid>

            {/* Paths board — hall west wall, not a floor solid */}
            <mesh position={[u(1.7) - 0.16, 1.55, u(0.15)]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[1.2, 0.95]} />
                <primitive object={m.book} attach="material" />
            </mesh>
        </group>
    );
}
