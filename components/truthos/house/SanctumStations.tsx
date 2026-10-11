'use client';

/**
 * The stations — what stands in each apse, at the threshold and at the
 * Source. Every volume here is a SOLID from homeMap, drawn in that
 * solid's frame at that solid's size, so the renderer and the walker
 * agree. Surface kit (a mug, books, a paper) sits on top of its parent
 * and takes no floor.
 *
 * Kenney props face local +z; the apse frame points +z OUT of the hall,
 * so a thing against the back wall that should face the room has yaw π.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import HouseProp from './HouseProp';
import { useHouseMaterials } from './HouseMaterials';
import WallMural from './WallMural';
import { ALCOVE, DAIS, alcove, facetToWorld, facetYaw, frameOf, solid, type Solid } from './homeMap';

type Mats = ReturnType<typeof useHouseMaterials>;

/** A group in the solid's frame, at the solid's position, turned its way. */
function At({ s, children }: { s: Solid; children: React.ReactNode }) {
    const f = frameOf(s.at);
    if (f === null) {
        return (
            <group position={[s.x, 0, s.z]} rotation={[0, s.yaw ?? 0, 0]}>
                {children}
            </group>
        );
    }
    const o = facetToWorld(f, 0, 0);
    return (
        <group position={[o.x, 0, o.z]} rotation={[0, facetYaw(f), 0]}>
            <group position={[s.x, 0, s.z]} rotation={[0, s.yaw ?? 0, 0]}>
                {children}
            </group>
        </group>
    );
}

/** A fallback block the size of the solid. */
function Block({ s, mat, shadow, w, d }: { s: Solid; mat: THREE.Material; shadow: boolean; w?: number; d?: number }) {
    return (
        <mesh position={[0, s.h / 2, 0]} castShadow={shadow} receiveShadow={shadow}>
            <boxGeometry args={[w ?? s.r * 1.6, s.h, d ?? s.r * 1.2]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

/** Something in an apse's frame that is not a solid (art, a screen, a sign). */
function InApse({ id, x, y, z, yaw = 0, children }: { id: Parameters<typeof alcove>[0]; x: number; y: number; z: number; yaw?: number; children: React.ReactNode }) {
    const f = alcove(id).facet;
    const o = facetToWorld(f, 0, 0);
    return (
        <group position={[o.x, 0, o.z]} rotation={[0, facetYaw(f), 0]}>
            <group position={[x, y, z]} rotation={[0, yaw, 0]}>
                {children}
            </group>
        </group>
    );
}

function ArcadeCabinet({ s, m, shadow, glow }: { s: Solid; m: Mats; shadow: boolean; glow: THREE.Material }) {
    return (
        <At s={s}>
            <mesh position={[0, s.h / 2, 0]} castShadow={shadow} receiveShadow={shadow}>
                <boxGeometry args={[0.8, s.h, 0.7]} />
                <primitive object={m.metalDark} attach="material" />
            </mesh>
            {/* the screen, tilted toward the hall (local −z) */}
            <mesh position={[0, 1.22, -0.36]} rotation={[0.18, Math.PI, 0]}>
                <planeGeometry args={[0.56, 0.42]} />
                <primitive object={glow} attach="material" />
            </mesh>
            {/* control deck */}
            <mesh position={[0, 0.98, -0.42]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.72, 0.05, 0.28]} />
                <primitive object={m.wood} attach="material" />
            </mesh>
            {/* marquee */}
            <mesh position={[0, s.h - 0.12, -0.36]}>
                <boxGeometry args={[0.78, 0.2, 0.02]} />
                <meshStandardMaterial color="#1b1030" emissive="#22d3ee" emissiveIntensity={0.9} toneMapped={false} />
            </mesh>
        </At>
    );
}

export default function SanctumStations({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;
    const screenGlow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8ff2ff', toneMapped: false }), []);
    const codexGlow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c7b4ff', toneMapped: false }), []);
    const plaster = m.marble;

    return (
        <group>
            {/* ── The Mark — three plaster faces and the committed marks ── */}
            <WallMural />
            <InApse id="mark" x={0} y={ALCOVE.height / 2 - 0.1} z={ALCOVE.depth - 0.03} yaw={Math.PI}>
                <mesh>
                    <planeGeometry args={[ALCOVE.width - 0.1, ALCOVE.height - 0.3]} />
                    <primitive object={plaster} attach="material" />
                </mesh>
            </InApse>
            <InApse id="mark" x={-(ALCOVE.width / 2 - 0.03)} y={ALCOVE.height / 2 - 0.1} z={ALCOVE.depth / 2} yaw={Math.PI / 2}>
                <mesh>
                    <planeGeometry args={[ALCOVE.depth - 0.1, ALCOVE.height - 0.3]} />
                    <primitive object={plaster} attach="material" />
                </mesh>
            </InApse>
            <InApse id="mark" x={ALCOVE.width / 2 - 0.03} y={ALCOVE.height / 2 - 0.1} z={ALCOVE.depth / 2} yaw={-Math.PI / 2}>
                <mesh>
                    <planeGeometry args={[ALCOVE.depth - 0.1, ALCOVE.height - 0.3]} />
                    <primitive object={plaster} attach="material" />
                </mesh>
            </InApse>
            <At s={solid('mark bench')}>
                <HouseProp model="ftStallBench" fit={{ w: 1.3 }} shadows={sh}>
                    <Block s={solid('mark bench')} mat={m.wood} shadow={sh} w={1.3} d={0.45} />
                </HouseProp>
            </At>

            {/* ── Terminal ── */}
            {(() => {
                const desk = solid('desk');
                return (
                    <At s={desk}>
                        <HouseProp model="desk" fit={{ w: 1.8, h: desk.h, d: 0.8 }} shadows={sh}>
                            <Block s={desk} mat={m.woodDark} shadow={sh} w={1.8} d={0.8} />
                        </HouseProp>
                        {/* the kit on the desktop faces the chair (local +z of the desk = toward the hall) */}
                        <group position={[0, desk.h, 0]}>
                            <HouseProp model="monitor" position={[0, 0, -0.12]} fit={{ w: 0.56 }} shadows={false}>
                                <mesh position={[0, 0.2, 0]}>
                                    <boxGeometry args={[0.56, 0.36, 0.05]} />
                                    <primitive object={m.metalDark} attach="material" />
                                </mesh>
                            </HouseProp>
                            <mesh position={[0, 0.3, -0.07]}>
                                <planeGeometry args={[0.5, 0.3]} />
                                <primitive object={screenGlow} attach="material" />
                            </mesh>
                            <HouseProp model="keyboard" position={[0, 0, 0.18]} fit={{ w: 0.36 }} shadows={false}>
                                {null}
                            </HouseProp>
                            <HouseProp model="mouse" position={[0.32, 0, 0.18]} fit={{ w: 0.1 }} shadows={false}>
                                {null}
                            </HouseProp>
                            <HouseProp model="fkCupCoffee" position={[0.5, 0, 0.1]} rotation={[0, -0.6, 0]} fit={{ w: 0.09 }} shadows={false}>
                                {null}
                            </HouseProp>
                            <HouseProp model="booksStack" position={[-0.66, 0, -0.08]} rotation={[0, 0.25, 0]} fit={{ w: 0.28 }} shadows={false}>
                                <mesh position={[0, 0.09, 0]}>
                                    <boxGeometry args={[0.28, 0.18, 0.18]} />
                                    <primitive object={m.book} attach="material" />
                                </mesh>
                            </HouseProp>
                        </group>
                        {!low && <pointLight position={[0, 1.3, 0.3]} intensity={0.9} color="#8ff2ff" distance={4.5} decay={2} />}
                    </At>
                );
            })()}
            <At s={solid('desk chair')}>
                <HouseProp model="deskChair" fit={{ w: 0.6 }} shadows={sh}>
                    <Block s={solid('desk chair')} mat={m.leather} shadow={sh} w={0.55} d={0.55} />
                </HouseProp>
            </At>
            <At s={solid('terminal lamp')}>
                <HouseProp model="floorLamp" fit={{ h: solid('terminal lamp').h }} shadows={sh}>
                    <Block s={solid('terminal lamp')} mat={m.metalDark} shadow={sh} w={0.3} d={0.3} />
                </HouseProp>
                <mesh position={[0, solid('terminal lamp').h - 0.2, 0]}>
                    <sphereGeometry args={[0.1, 8, 6]} />
                    <primitive object={m.bulbWarm} attach="material" />
                </mesh>
            </At>
            <At s={solid('terminal plant')}>
                <HouseProp model="pottedPlant" fit={{ h: solid('terminal plant').h }} shadows={sh}>
                    <Block s={solid('terminal plant')} mat={m.leaf} shadow={sh} w={0.4} d={0.4} />
                </HouseProp>
            </At>

            {/* ── Library ── */}
            {(['library bay W', 'library bay C', 'library bay E'] as const).map((n) => (
                <At key={n} s={solid(n)}>
                    <HouseProp model="bookcase" fit={{ w: 1.0, h: solid(n).h, d: 0.5 }} shadows={sh}>
                        <Block s={solid(n)} mat={m.woodDark} shadow={sh} w={1.0} d={0.5} />
                    </HouseProp>
                </At>
            ))}
            <At s={solid('reading chair')}>
                <HouseProp model="accentChair" fit={{ w: 0.84 }} shadows={sh}>
                    <Block s={solid('reading chair')} mat={m.leather} shadow={sh} w={0.8} d={0.8} />
                </HouseProp>
            </At>
            <At s={solid('library lamp')}>
                <HouseProp model="floorLamp" fit={{ h: solid('library lamp').h }} shadows={sh}>
                    <Block s={solid('library lamp')} mat={m.metalDark} shadow={sh} w={0.3} d={0.3} />
                </HouseProp>
                <mesh position={[0, solid('library lamp').h - 0.2, 0]}>
                    <sphereGeometry args={[0.1, 8, 6]} />
                    <primitive object={m.bulbWarm} attach="material" />
                </mesh>
            </At>

            {/* ── Codex ── */}
            {(() => {
                const desk = solid('codex desk');
                return (
                    <At s={desk}>
                        <HouseProp model="desk" fit={{ w: 1.5, h: desk.h, d: 0.75 }} shadows={sh}>
                            <Block s={desk} mat={m.woodDark} shadow={sh} w={1.5} d={0.75} />
                        </HouseProp>
                        <group position={[0, desk.h, 0]}>
                            {/* an open codex and a screen of whispers */}
                            <mesh position={[0, 0.02, 0.1]} rotation={[-0.08, 0.1, 0]}>
                                <boxGeometry args={[0.44, 0.04, 0.32]} />
                                <primitive object={m.leather} attach="material" />
                            </mesh>
                            <mesh position={[0, 0.3, -0.18]} rotation={[-0.14, 0, 0]}>
                                <planeGeometry args={[0.56, 0.34]} />
                                <primitive object={codexGlow} attach="material" />
                            </mesh>
                            <HouseProp model="fkMug" position={[0.5, 0, 0.12]} fit={{ w: 0.1 }} shadows={false}>
                                {null}
                            </HouseProp>
                            <HouseProp model="booksStack" position={[-0.55, 0, -0.1]} rotation={[0, -0.3, 0]} fit={{ w: 0.28 }} shadows={false}>
                                {null}
                            </HouseProp>
                        </group>
                        {!low && <pointLight position={[0, 1.2, 0.2]} intensity={0.7} color="#c7b4ff" distance={4} decay={2} />}
                    </At>
                );
            })()}
            <At s={solid('codex chair')}>
                <HouseProp model="deskChair" fit={{ w: 0.6 }} shadows={sh}>
                    <Block s={solid('codex chair')} mat={m.leather} shadow={sh} w={0.55} d={0.55} />
                </HouseProp>
            </At>
            <At s={solid('codex plant')}>
                <HouseProp model="pottedPlant" fit={{ h: solid('codex plant').h }} shadows={sh}>
                    <Block s={solid('codex plant')} mat={m.leaf} shadow={sh} w={0.4} d={0.4} />
                </HouseProp>
            </At>

            {/* ── Arcade ── */}
            <ArcadeCabinet s={solid('arcade cabinet L')} m={m} shadow={sh} glow={screenGlow} />
            <ArcadeCabinet s={solid('arcade cabinet R')} m={m} shadow={sh} glow={screenGlow} />
            <At s={solid('arcade stool')}>
                <HouseProp model="barStool" fit={{ h: solid('arcade stool').h }} shadows={sh}>
                    <Block s={solid('arcade stool')} mat={m.woodDark} shadow={sh} w={0.36} d={0.36} />
                </HouseProp>
            </At>
            {/* a strip of neon along the arcade's back wall */}
            <InApse id="arcade" x={0} y={2.9} z={ALCOVE.depth - 0.06}>
                <mesh>
                    <boxGeometry args={[ALCOVE.width - 0.6, 0.06, 0.04]} />
                    <meshStandardMaterial color="#0a1a22" emissive="#22d3ee" emissiveIntensity={1.4} toneMapped={false} />
                </mesh>
            </InApse>

            {/* ── Ledger ── */}
            {(() => {
                const sb = solid('ledger sideboard');
                return (
                    <At s={sb}>
                        <mesh position={[0, sb.h / 2, 0]} castShadow={sh} receiveShadow={sh}>
                            <boxGeometry args={[1.9, sb.h, 0.56]} />
                            <primitive object={m.woodDark} attach="material" />
                        </mesh>
                        <mesh position={[0, sb.h + 0.01, 0]}>
                            <boxGeometry args={[1.96, 0.03, 0.62]} />
                            <primitive object={m.gold} attach="material" />
                        </mesh>
                        {/* the record, open, and two candles */}
                        <mesh position={[0, sb.h + 0.05, -0.02]} rotation={[-0.12, 0.15, 0]} castShadow={sh}>
                            <boxGeometry args={[0.46, 0.05, 0.32]} />
                            <primitive object={m.leather} attach="material" />
                        </mesh>
                        {[-0.7, 0.7].map((x) => (
                            <group key={x} position={[x, sb.h + 0.02, -0.08]}>
                                <mesh position={[0, 0.12, 0]}>
                                    <cylinderGeometry args={[0.03, 0.035, 0.24, 8]} />
                                    <primitive object={m.linen} attach="material" />
                                </mesh>
                                <mesh position={[0, 0.3, 0]}>
                                    <sphereGeometry args={[0.035, 8, 6]} />
                                    <primitive object={m.bulbWarm} attach="material" />
                                </mesh>
                            </group>
                        ))}
                        {!low && <pointLight position={[0, 1.4, 0.4]} intensity={0.8} color="#ffd9a0" distance={4.5} decay={2} />}
                    </At>
                );
            })()}

            {/* ── Paths — the map board flanked by the two artworks ── */}
            <InApse id="paths" x={0} y={1.65} z={ALCOVE.depth - 0.04} yaw={Math.PI}>
                <mesh>
                    <planeGeometry args={[1.5, 1.15]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
                <mesh position={[0, 0, -0.025]}>
                    <boxGeometry args={[1.62, 1.27, 0.05]} />
                    <primitive object={m.woodDark} attach="material" />
                </mesh>
            </InApse>
            {(['artDomain', 'artStillPoint'] as const).map((art, i) => (
                <InApse key={art} id="paths" x={i === 0 ? -1.4 : 1.4} y={1.7} z={ALCOVE.depth - 0.04} yaw={Math.PI}>
                    <mesh>
                        <planeGeometry args={[1.0, 0.85]} />
                        <primitive object={m[art]} attach="material" />
                    </mesh>
                    <mesh position={[0, 0, -0.025]}>
                        <boxGeometry args={[1.12, 0.97, 0.05]} />
                        <primitive object={m.woodDark} attach="material" />
                    </mesh>
                </InApse>
            ))}
            <At s={solid('paths bench')}>
                <HouseProp model="ftStallBench" fit={{ w: 1.3 }} shadows={sh}>
                    <Block s={solid('paths bench')} mat={m.wood} shadow={sh} w={1.3} d={0.45} />
                </HouseProp>
            </At>
            <At s={solid('paths plant')}>
                <HouseProp model="pottedPlant" fit={{ h: solid('paths plant').h }} shadows={sh}>
                    <Block s={solid('paths plant')} mat={m.leaf} shadow={sh} w={0.4} d={0.4} />
                </HouseProp>
            </At>

            {/* ── The Source — the orb and four stone seats ── */}
            <group position={[0, DAIS.h, 0]}>
                <mesh position={[0, 0.95, 0]}>
                    <sphereGeometry args={[0.46, 24, 18]} />
                    <meshBasicMaterial color="#8b7cff" toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.95, 0]} scale={1.7}>
                    <sphereGeometry args={[0.46, 16, 12]} />
                    <meshBasicMaterial color="#b4a6ff" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
                </mesh>
                {/* a plinth that holds nothing up — the orb floats */}
                <mesh position={[0, 0.22, 0]} castShadow={sh}>
                    <cylinderGeometry args={[0.34, 0.5, 0.44, 8]} />
                    <primitive object={m.basalt} attach="material" />
                </mesh>
            </group>
            {(['source seat S', 'source seat N', 'source seat E', 'source seat W'] as const).map((n) => {
                const s = solid(n);
                return (
                    <At key={n} s={s}>
                        <mesh position={[0, s.h / 2, 0]} castShadow={sh} receiveShadow={sh}>
                            <boxGeometry args={[1.2, s.h, 0.5]} />
                            <primitive object={m.basalt} attach="material" />
                        </mesh>
                        <mesh position={[0, s.h + 0.04, 0]}>
                            <boxGeometry args={[1.1, 0.08, 0.44]} />
                            <primitive object={m.wool} attach="material" />
                        </mesh>
                    </At>
                );
            })}
        </group>
    );
}
