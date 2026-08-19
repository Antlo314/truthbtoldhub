'use client';

/**
 * One-storey furnishings. Every volume here is a FURNITURE solid —
 * one mesh (or one HouseProp) per row, sized to that row's hx/hz/h.
 * Nothing is nested inside another solid's box. Surface kit (books, a
 * lamp, pillows, the coffee machine, the range hood) has no collider and
 * sits inside its parent's XZ at y = parent.h (or above it).
 *
 * Kenney props face local +z; a yaw of θ points the front at (sin θ, cos θ).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import HouseProp from './HouseProp';
import { useHouseMaterials } from './HouseMaterials';
import { DESK, FRONT_DOOR, MAIN_Y, SHELL, furn, u, type Furnishing } from './homeMap';
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
    const coatRack = furn('coat rack');
    const bench = furn('mark bench');
    const vanity = furn('bath vanity');
    const bed = furn('spare bed');
    const nightstand = furn('spare nightstand');
    const dresser = furn('spare dresser');
    const livSofa = furn('living sofa');
    const livTable = furn('living coffee table');
    const accent = furn('accent chair');
    const shelves = furn('bookshelf wall');
    const media = furn('media wall');
    const island = furn('island');
    const stoolL = furn('island stool L');
    const stoolC = furn('island stool C');
    const stoolR = furn('island stool R');
    const cabW = furn('counter cabinet W');
    const sink = furn('kitchen sink');
    const drawers = furn('counter drawers');
    const stove = furn('kitchen stove');
    const cabE = furn('counter cabinet E');
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
                {/* h is pinned so the desktop lands at desk.h, where the kit sits */}
                <HouseProp model="desk" rotation={[0, desk.yaw ?? 0, 0]} fit={{ w: desk.hx * 2, h: desk.h, d: desk.hz * 2 }}>
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
                {/* A stack of books at the desk's west end — reading kept close */}
                <group position={[-0.68, desk.h, -0.06]} rotation={[0, 0.25, 0]}>
                    <HouseProp model="booksStack" fit={{ w: 0.28 }}>
                        <mesh position={[0, 0.09, 0]} castShadow={sh}>
                            <boxGeometry args={[0.28, 0.18, 0.18]} />
                            <primitive object={m.book} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
                {/* A small plant on the east corner — something alive at the terminal */}
                <group position={[0.7, desk.h, -0.12]}>
                    <HouseProp model="plantSmall" fit={{ h: 0.4 }}>
                        <mesh position={[0, 0.2, 0]} castShadow={sh}>
                            <cylinderGeometry args={[0.1, 0.08, 0.4, 8]} />
                            <primitive object={m.wood} attach="material" />
                        </mesh>
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
                {/* Two throw pillows on the seat, leaning into the backrest (sofa faces +z,
                    seat top sits at ~0.54 once the sofa is fitted to its width) */}
                {[
                    { x: -0.72, ry: 0.18 },
                    { x: 0.72, ry: -0.12 },
                ].map((p) => (
                    <group key={p.x} position={[p.x, 0.54, -0.16]} rotation={[-0.22, p.ry, 0]}>
                        <HouseProp model="throwPillow" fit={{ w: 0.44 }}>
                            <mesh position={[0, 0.2, 0]} castShadow={sh}>
                                <boxGeometry args={[0.44, 0.4, 0.14]} />
                                <primitive object={m.fabricLight} attach="material" />
                            </mesh>
                        </HouseProp>
                    </group>
                ))}
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
            {/* Coat rack inside the front door — somewhere to hang what you carried in */}
            <Solid f={coatRack}>
                <HouseProp model="coatRack" fit={{ h: coatRack.h }}>
                    <Box f={coatRack} mat={m.woodDark} shadow={sh} />
                </HouseProp>
            </Solid>
            {/* Entry rug just inside the door — flat, walk-over, no collider */}
            <group position={[FRONT_DOOR.x, MAIN_Y + 0.004, 14.6]}>
                <HouseProp model="rugRect" fit={{ w: 2.4 }} shadows={false}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={sh}>
                        <planeGeometry args={[2.4, 1.4]} />
                        <primitive object={m.rug} attach="material" />
                    </mesh>
                </HouseProp>
            </group>

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
                {/* Bed's long axis is z (headboard at local −z → north wall), so w↔x, d↔z */}
                <HouseProp model="bed" rotation={[0, bed.yaw ?? 0, 0]} fit={{ w: bed.hx * 2, d: bed.hz * 2 }}>
                    <Box f={bed} mat={m.linen} shadow={sh} />
                </HouseProp>
            </Solid>
            {/* Nightstand at the head of the bed with a small lamp on it */}
            <Solid f={nightstand}>
                <HouseProp model="nightstand" fit={{ w: nightstand.hx * 2, h: nightstand.h, d: nightstand.hz * 2 }}>
                    <Box f={nightstand} mat={m.wood} shadow={sh} />
                </HouseProp>
                <group position={[0, nightstand.h, -0.02]}>
                    <HouseProp model="tableLamp" fit={{ h: 0.5 }}>
                        <mesh position={[0, 0.25, 0]} castShadow={sh}>
                            <cylinderGeometry args={[0.12, 0.05, 0.5, 8]} />
                            <primitive object={m.linen} attach="material" />
                        </mesh>
                    </HouseProp>
                    {!low && (
                        <pointLight position={[0, 0.42, 0]} intensity={0.7} color="#ffd9a8" distance={4} decay={2} />
                    )}
                </group>
            </Solid>
            {/* Dresser on the north wall, facing the room */}
            <Solid f={dresser}>
                <HouseProp model="dresser" fit={{ w: dresser.hx * 2, h: dresser.h, d: dresser.hz * 2 }}>
                    <Box f={dresser} mat={m.woodDark} shadow={sh} />
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
                {/* Turned −π/2 to face west, so the model's width runs along world z.
                    Four narrow bays tile the 3.7 m run instead of one unit stretched 9× wide. */}
                {[-1.5, -0.5, 0.5, 1.5].map((k, i) => (
                    <group key={k} position={[0, 0, k * (shelves.hz / 2)]}>
                        <HouseProp
                            model="bookcase"
                            rotation={[0, shelves.yaw ?? 0, 0]}
                            fit={{ w: shelves.hz / 2, h: shelves.h, d: shelves.hx * 2 }}
                        >
                            {i === 0 ? (
                                <group position={[0, 0, -k * (shelves.hz / 2)]}>
                                    <Box f={shelves} mat={m.woodDark} shadow={sh} />
                                </group>
                            ) : null}
                        </HouseProp>
                    </group>
                ))}
            </Solid>
            {/* Media console on the east wall (faces west); the row's h is the console height */}
            <Solid f={media}>
                <HouseProp model="mediaConsole" rotation={[0, media.yaw ?? 0, 0]} fit={{ w: media.hz * 2, h: media.h, d: media.hx * 2 }}>
                    <Box f={media} mat={m.woodDark} shadow={sh} />
                </HouseProp>
                {/* Television standing on the console, screen toward the room */}
                <group position={[0.04, media.h, 0]}>
                    <HouseProp model="television" rotation={[0, media.yaw ?? 0, 0]} fit={{ w: 1.1 }}>
                        <mesh position={[0, 0.36, 0]} castShadow={sh}>
                            <boxGeometry args={[0.12, 0.66, 1.1]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
                {/* A lamp at the console's south end keeps the corner warm now the fire is gone */}
                <group position={[0, media.h, 0.74]}>
                    <HouseProp model="tableLamp" fit={{ h: 0.5 }}>
                        <mesh position={[0, 0.25, 0]} castShadow={sh}>
                            <cylinderGeometry args={[0.12, 0.05, 0.5, 8]} />
                            <primitive object={m.linen} attach="material" />
                        </mesh>
                    </HouseProp>
                    {!low && (
                        <pointLight position={[-0.2, 0.45, 0]} intensity={1.1} color="#ffc98a" distance={5} decay={2} />
                    )}
                </group>
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
            {/* Counter run on the north wall — five kitchen modules, each filling its own
                collider box, all facing +z into the room */}
            <Solid f={cabW}>
                <HouseProp model="kitchenCabinet" fit={{ w: cabW.hx * 2, h: cabW.h, d: cabW.hz * 2 }}>
                    <Box f={cabW} mat={m.woodDark} shadow={sh} />
                </HouseProp>
                {/* Coffee machine on the counter beside the fridge, back to the wall */}
                <group position={[0.06, cabW.h, -0.12]}>
                    <HouseProp model="coffeeMachine" fit={{ h: 0.34 }}>
                        <mesh position={[0, 0.17, 0]} castShadow={sh}>
                            <boxGeometry args={[0.36, 0.34, 0.44]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
            </Solid>
            <Solid f={sink}>
                <HouseProp model="kitchenSink" fit={{ w: sink.hx * 2, h: sink.h, d: sink.hz * 2 }}>
                    <Box f={sink} mat={m.woodDark} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={drawers}>
                <HouseProp model="kitchenDrawers" fit={{ w: drawers.hx * 2, h: drawers.h, d: drawers.hz * 2 }}>
                    <Box f={drawers} mat={m.woodDark} shadow={sh} />
                </HouseProp>
            </Solid>
            <Solid f={stove}>
                <HouseProp model="kitchenStove" fit={{ w: stove.hx * 2, h: stove.h, d: stove.hz * 2 }}>
                    <Box f={stove} mat={m.woodDark} shadow={sh} />
                </HouseProp>
                {/* Slim range hood over the stove, tucked under the upper cabinets (their bottom is 1.87) */}
                <group position={[0, 1.52, -0.22]}>
                    <HouseProp model="rangeHood" fit={{ w: 0.9, h: 0.34, d: 0.56 }}>
                        <mesh position={[0, 0.17, 0]} castShadow={sh}>
                            <boxGeometry args={[0.9, 0.34, 0.56]} />
                            <primitive object={m.metal} attach="material" />
                        </mesh>
                    </HouseProp>
                </group>
            </Solid>
            <Solid f={cabE}>
                <HouseProp model="kitchenCabinet" fit={{ w: cabE.hx * 2, h: cabE.h, d: cabE.hz * 2 }}>
                    <Box f={cabE} mat={m.woodDark} shadow={sh} />
                </HouseProp>
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
