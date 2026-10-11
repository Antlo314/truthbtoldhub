'use client';

/**
 * The bespoke pieces of the Sanctum — what LairProps cannot draw because
 * it is procedural, or because it sits ON a prop: the terminal's kit,
 * the codex desk, the arcade cabinets, the ledger and its candles, the
 * Source seats and orb, the Mark's plaster and the Paths board. Every
 * piece stands in its solid's frame (SolidGroup), so it is exactly where
 * the walker collides with it.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import HouseProp from './HouseProp';
import { useHouseMaterials, type HouseMaterials } from './HouseMaterials';
import WallMural from './WallMural';
import { ALCOVE, DAIS, HALL, alcove, facetToWorld, facetYaw, solid, SOLIDS, type AlcoveId } from './homeMap';
import { SolidGroup } from './LairProps';

type Mats = HouseMaterials;

/** Something in an apse's frame that is not a solid (art, a sign, plaster). */
function InApse({ id, x, y, z, yaw = 0, children }: { id: AlcoveId; x: number; y: number; z: number; yaw?: number; children: React.ReactNode }) {
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

function Framed({ mat, w, h, frame }: { mat: THREE.Material; w: number; h: number; frame: THREE.Material }) {
    return (
        <group>
            <mesh>
                <planeGeometry args={[w, h]} />
                <primitive object={mat} attach="material" />
            </mesh>
            <mesh position={[0, 0, -0.03]}>
                <boxGeometry args={[w + 0.14, h + 0.14, 0.05]} />
                <primitive object={frame} attach="material" />
            </mesh>
        </group>
    );
}

/** Kit on a desk: a monitor at the back, keyboard and mouse at the front (desk local +z faces the chair). */
function DeskKit({ name, m, glow, coffee = true }: { name: string; m: Mats; glow: THREE.Material; coffee?: boolean }) {
    const s = solid(name);
    return (
        <SolidGroup s={s}>
            <group position={[0, s.h, 0]}>
                <HouseProp model="monitor" position={[0, 0, -0.2]} fit={{ w: 0.62 }} shadows={false}>
                    <mesh position={[0, 0.22, 0]}>
                        <boxGeometry args={[0.62, 0.4, 0.05]} />
                        <primitive object={m.metalDark} attach="material" />
                    </mesh>
                </HouseProp>
                <mesh position={[0, 0.33, -0.15]}>
                    <planeGeometry args={[0.54, 0.32]} />
                    <primitive object={glow} attach="material" />
                </mesh>
                <HouseProp model="keyboard" position={[0, 0, 0.18]} fit={{ w: 0.4 }} shadows={false}>
                    {null}
                </HouseProp>
                <HouseProp model="mouse" position={[0.36, 0, 0.18]} fit={{ w: 0.1 }} shadows={false}>
                    {null}
                </HouseProp>
                {coffee && (
                    <HouseProp model="fkCupCoffee" position={[0.72, 0, 0.1]} rotation={[0, -0.6, 0]} fit={{ w: 0.09 }} shadows={false}>
                        {null}
                    </HouseProp>
                )}
                <HouseProp model="booksStack" position={[-0.72, 0, -0.08]} rotation={[0, 0.25, 0]} fit={{ w: 0.28 }} shadows={false}>
                    <mesh position={[0, 0.09, 0]}>
                        <boxGeometry args={[0.28, 0.18, 0.18]} />
                        <primitive object={m.book} attach="material" />
                    </mesh>
                </HouseProp>
            </group>
        </SolidGroup>
    );
}

function ArcadeCabinet({ name, m, shadow, glow, hue }: { name: string; m: Mats; shadow: boolean; glow: THREE.Material; hue: string }) {
    const s = solid(name);
    return (
        <SolidGroup s={s}>
            <mesh position={[0, s.h / 2, 0]} castShadow={shadow} receiveShadow={shadow}>
                <boxGeometry args={[s.w, s.h, s.d]} />
                <primitive object={m.metalDark} attach="material" />
            </mesh>
            {/* the screen, tilted toward the hall (apse local −z) */}
            <mesh position={[0, 1.24, -s.d / 2 - 0.005]} rotation={[0.18, Math.PI, 0]}>
                <planeGeometry args={[0.58, 0.44]} />
                <primitive object={glow} attach="material" />
            </mesh>
            <mesh position={[0, 0.98, -s.d / 2 - 0.08]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.74, 0.05, 0.28]} />
                <primitive object={m.wood} attach="material" />
            </mesh>
            {[-0.18, 0.12, 0.24].map((x, i) => (
                <mesh key={x} position={[x, 1.02, -s.d / 2 - 0.12]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.04, 8]} />
                    <meshBasicMaterial color={i === 0 ? '#ff3b6b' : '#22d3ee'} toneMapped={false} />
                </mesh>
            ))}
            <mesh position={[0, s.h - 0.12, -s.d / 2 - 0.005]}>
                <boxGeometry args={[0.78, 0.2, 0.02]} />
                <meshStandardMaterial color="#1b1030" emissive={hue} emissiveIntensity={1.1} toneMapped={false} />
            </mesh>
        </SolidGroup>
    );
}

export default function SanctumStations({ low = false }: { low?: boolean }) {
    const m = useHouseMaterials(low);
    const sh = !low;
    const screenGlow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8ff2ff', toneMapped: false }), []);
    const codexGlow = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c7b4ff', toneMapped: false }), []);
    const W = ALCOVE.width;
    const D = ALCOVE.depth;
    const T = HALL.wallT;
    const AH = ALCOVE.height;
    const lanterns = useMemo(() => SOLIDS.filter((s) => s.name.startsWith('sanctum lantern')), []);
    const seats = useMemo(() => SOLIDS.filter((s) => s.name.startsWith('source seat')), []);

    return (
        <group>
            {/* ── Terminal ── */}
            <DeskKit name="desk" m={m} glow={screenGlow} />
            {/* ── Codex ── */}
            <SolidGroup s="codex desk">
                <group position={[0, solid('codex desk').h, 0]}>
                    <mesh position={[0, 0.02, 0.12]} rotation={[-0.06, 0.1, 0]}>
                        <boxGeometry args={[0.46, 0.04, 0.34]} />
                        <primitive object={m.leather} attach="material" />
                    </mesh>
                    <mesh position={[0, 0.32, -0.2]} rotation={[-0.14, 0, 0]}>
                        <planeGeometry args={[0.6, 0.36]} />
                        <primitive object={codexGlow} attach="material" />
                    </mesh>
                    <HouseProp model="fkMug" position={[0.6, 0, 0.14]} fit={{ w: 0.1 }} shadows={false}>
                        {null}
                    </HouseProp>
                    <HouseProp model="booksStack" position={[-0.62, 0, -0.1]} rotation={[0, -0.3, 0]} fit={{ w: 0.28 }} shadows={false}>
                        {null}
                    </HouseProp>
                </group>
            </SolidGroup>
            {/* ── Library — books open on the reading table ── */}
            <SolidGroup s="library table">
                <HouseProp model="booksStack" position={[-0.3, solid('library table').h, 0]} fit={{ w: 0.3 }} shadows={false}>
                    {null}
                </HouseProp>
                <mesh position={[0.25, solid('library table').h + 0.02, 0.05]} rotation={[0, 0.4, 0]}>
                    <boxGeometry args={[0.4, 0.03, 0.28]} />
                    <primitive object={m.book} attach="material" />
                </mesh>
            </SolidGroup>

            {/* ── Arcade — four cabinets and a neon line on the back wall ── */}
            {['#22d3ee', '#f472b6', '#facc15', '#a78bfa'].map((hue, i) => (
                <ArcadeCabinet key={i} name={`arcade cabinet ${i}`} m={m} shadow={sh} glow={screenGlow} hue={hue} />
            ))}
            <InApse id="arcade" x={0} y={3.6} z={D - 0.06}>
                <mesh>
                    <boxGeometry args={[W - 0.8, 0.06, 0.04]} />
                    <meshStandardMaterial color="#0a1a22" emissive="#22d3ee" emissiveIntensity={1.4} toneMapped={false} />
                </mesh>
            </InApse>

            {/* ── Ledger — the record on a sideboard, two candle stands ── */}
            {(() => {
                const sb = solid('ledger sideboard');
                return (
                    <SolidGroup s={sb}>
                        <mesh position={[0, sb.h / 2, 0]} castShadow={sh} receiveShadow={sh}>
                            <boxGeometry args={[sb.w, sb.h, sb.d]} />
                            <primitive object={m.woodDark} attach="material" />
                        </mesh>
                        <mesh position={[0, sb.h + 0.015, 0]}>
                            <boxGeometry args={[sb.w + 0.06, 0.03, sb.d + 0.06]} />
                            <primitive object={m.gold} attach="material" />
                        </mesh>
                        <mesh position={[0, sb.h + 0.06, 0.02]} rotation={[-0.12, 0.15, 0]} castShadow={sh}>
                            <boxGeometry args={[0.5, 0.05, 0.34]} />
                            <primitive object={m.leather} attach="material" />
                        </mesh>
                    </SolidGroup>
                );
            })()}
            {['ledger candle stand 0', 'ledger candle stand 1'].map((n) => {
                const s = solid(n);
                return (
                    <SolidGroup key={n} s={s}>
                        <mesh position={[0, s.h / 2, 0]}>
                            <cylinderGeometry args={[0.04, 0.12, s.h, 8]} />
                            <primitive object={m.metalDark} attach="material" />
                        </mesh>
                        <mesh position={[0, s.h + 0.12, 0]}>
                            <cylinderGeometry args={[0.04, 0.045, 0.24, 8]} />
                            <primitive object={m.linen} attach="material" />
                        </mesh>
                        <mesh position={[0, s.h + 0.3, 0]}>
                            <sphereGeometry args={[0.045, 8, 6]} />
                            <primitive object={m.bulbWarm} attach="material" />
                        </mesh>
                    </SolidGroup>
                );
            })}

            {/* ── The Mark — three plaster faces and the committed marks ── */}
            <WallMural />
            <InApse id="mark" x={0} y={AH / 2 - 0.1} z={D - 0.035} yaw={Math.PI}>
                <mesh>
                    <planeGeometry args={[W - 0.1, AH - 0.4]} />
                    <primitive object={m.marble} attach="material" />
                </mesh>
            </InApse>
            {[-1, 1].map((s) => (
                <InApse key={s} id="mark" x={s * (W / 2 - 0.035)} y={AH / 2 - 0.1} z={(T + D) / 2} yaw={-s * (Math.PI / 2)}>
                    <mesh>
                        <planeGeometry args={[D - T - 0.1, AH - 0.4]} />
                        <primitive object={m.marble} attach="material" />
                    </mesh>
                </InApse>
            ))}

            {/* ── Paths — the map board flanked by the two artworks ── */}
            <InApse id="paths" x={0} y={1.85} z={D - 0.05} yaw={Math.PI}>
                <Framed mat={m.book} w={1.9} h={1.35} frame={m.woodDark} />
            </InApse>
            {(['artDomain', 'artStillPoint'] as const).map((art, i) => (
                <InApse key={art} id="paths" x={i === 0 ? -2.5 : 2.5} y={1.95} z={D - 0.05} yaw={Math.PI}>
                    <Framed mat={m[art]} w={1.3} h={1.05} frame={m.woodDark} />
                </InApse>
            ))}

            {/* ── The Source — the orb, a plinth that holds nothing up, four stone seats ── */}
            <group position={[0, DAIS.h, 0]}>
                <mesh position={[0, 1.15, 0]}>
                    <sphereGeometry args={[0.56, 28, 20]} />
                    <meshBasicMaterial color="#8b7cff" toneMapped={false} />
                </mesh>
                <mesh position={[0, 1.15, 0]} scale={1.8}>
                    <sphereGeometry args={[0.56, 18, 14]} />
                    <meshBasicMaterial color="#b4a6ff" transparent opacity={0.15} depthWrite={false} toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.26, 0]} castShadow={sh}>
                    <cylinderGeometry args={[0.4, 0.6, 0.52, 8]} />
                    <primitive object={m.basalt} attach="material" />
                </mesh>
            </group>
            {seats.map((s) => (
                <SolidGroup key={s.name} s={s}>
                    <mesh position={[0, s.h / 2, 0]} castShadow={sh} receiveShadow={sh}>
                        <boxGeometry args={[s.w, s.h, s.d]} />
                        <primitive object={m.basalt} attach="material" />
                    </mesh>
                    <mesh position={[0, s.h + 0.04, 0]}>
                        <boxGeometry args={[s.w - 0.1, 0.08, s.d - 0.06]} />
                        <primitive object={m.wool} attach="material" />
                    </mesh>
                </SolidGroup>
            ))}
            {/* lantern flames on the generic lanterns */}
            {lanterns.map((s) => (
                <SolidGroup key={s.name} s={s}>
                    <mesh position={[0, s.h - 0.42, 0]}>
                        <sphereGeometry args={[0.1, 8, 6]} />
                        <primitive object={m.bulbWarm} attach="material" />
                    </mesh>
                </SolidGroup>
            ))}

        </group>
    );
}
