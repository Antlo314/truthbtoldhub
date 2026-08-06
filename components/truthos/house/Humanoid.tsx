'use client';

/**
 * The vessel — one articulated body, shared by you and everyone else.
 *
 * Peers used to be a capsule with a ball on top. That reads as a token,
 * not a person: no shoulders to tell you which way someone faces, no
 * limbs to tell you whether they are moving, no silhouette at distance.
 * This is a real figure — head, neck, tapered torso, jointed arms and
 * legs, hands and feet — built to human proportion (7.5 heads tall) so
 * it holds up beside 3 m ceilings and 2.5 m doors.
 *
 * It is procedural on purpose. A rigged GLB would be more photoreal, but
 * it costs a download per body, a skeleton to retarget and a licence to
 * honour; this is ~30 primitives in a hierarchy, animates from two
 * numbers (speed, time), and every player already carries the colours it
 * needs. If we later want scanned humans, the joint hierarchy here is
 * the same one a GLB rig would expose, so the swap is local.
 *
 * Animation is derived, never authored: a walk cycle counter-swings
 * limbs, the torso counter-rotates against the legs, the head settles a
 * beat behind the turn, and idle gets a breath. Speed comes from how far
 * the body actually moved last frame, so remote peers animate correctly
 * from pose sync alone — no extra network traffic.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SKIN_TONES, HAIR_COLORS, CLOTH_COLORS } from '@/lib/game/avatar';

export type VesselLook = {
    /** index into SKIN_TONES */
    skin: number;
    /** index into HAIR_COLORS */
    hair?: number;
    /** index into CLOTH_COLORS */
    cloth?: number;
    /** the soul's glow — hex string */
    aura: string;
    build: 'masc' | 'fem';
};

const pick = (arr: readonly string[], i: number | undefined, fallback: number) =>
    arr[((i ?? fallback) % arr.length + arr.length) % arr.length];

/** Limb: a tapered segment that pivots from its TOP, like a real joint. */
function Bone({
    len,
    top,
    bottom,
    mat,
    shadow,
    seg,
}: {
    len: number;
    top: number;
    bottom: number;
    mat: THREE.Material;
    shadow: boolean;
    seg: number;
}) {
    return (
        <mesh position={[0, -len / 2, 0]} castShadow={shadow}>
            <cylinderGeometry args={[top, bottom, len, seg]} />
            <primitive object={mat} attach="material" />
        </mesh>
    );
}

export default function Humanoid({
    look,
    low = false,
    /** metres/second, for the walk cycle. Omit to derive from movement. */
    speed,
    /** world position — when given, the body derives its own speed */
    trackPosition,
}: {
    look: VesselLook;
    low?: boolean;
    speed?: number;
    trackPosition?: { x: number; z: number };
}) {
    const sh = !low;
    const seg = low ? 5 : 8;

    const mats = useMemo(() => {
        const skin = pick(SKIN_TONES, look.skin, 2);
        const hair = pick(HAIR_COLORS, look.hair, 0);
        const cloth = pick(CLOTH_COLORS, look.cloth, 1);
        const mk = (color: string, rough: number, metal = 0.02) =>
            new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
        return {
            skin: mk(skin, 0.72),
            hair: mk(hair, 0.88),
            cloth: mk(cloth, 0.86),
            // Trousers read a shade deeper than the top
            legs: mk(new THREE.Color(cloth).multiplyScalar(0.55).getStyle(), 0.9),
            boot: mk('#2b2b30', 0.7, 0.1),
            aura: new THREE.MeshStandardMaterial({
                color: look.aura,
                emissive: look.aura,
                emissiveIntensity: 0.55,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                depthWrite: false,
            }),
        };
    }, [look.skin, look.hair, look.cloth, look.aura]);

    // Proportions. Total height 1.75 m at 7.5 heads — the figure has to
    // stand right next to real doors and counters.
    const fem = look.build === 'fem';
    const P = useMemo(
        () => ({
            head: 0.115,
            neck: 0.06,
            torso: 0.52,
            shoulder: fem ? 0.17 : 0.20,
            hip: fem ? 0.155 : 0.145,
            upperArm: 0.28,
            foreArm: 0.26,
            thigh: 0.42,
            shin: 0.40,
            armR: fem ? 0.043 : 0.05,
            legR: fem ? 0.062 : 0.066,
        }),
        [fem],
    );

    const hipY = P.thigh + P.shin + 0.08; // 0.90 — where the pelvis sits

    const root = useRef<THREE.Group>(null);
    const torso = useRef<THREE.Group>(null);
    const head = useRef<THREE.Group>(null);
    const armL = useRef<THREE.Group>(null);
    const armR = useRef<THREE.Group>(null);
    const elbowL = useRef<THREE.Group>(null);
    const elbowR = useRef<THREE.Group>(null);
    const legL = useRef<THREE.Group>(null);
    const legR = useRef<THREE.Group>(null);
    const kneeL = useRef<THREE.Group>(null);
    const kneeR = useRef<THREE.Group>(null);

    const cycle = useRef(0);
    const spd = useRef(0);
    const last = useRef<{ x: number; z: number } | null>(null);

    useFrame((_, dtRaw) => {
        const dt = Math.min(dtRaw, 0.05);

        // Speed: given, or measured from how far we actually travelled
        let v = speed ?? 0;
        if (speed === undefined && trackPosition) {
            const p = last.current;
            if (p) {
                v = Math.hypot(trackPosition.x - p.x, trackPosition.z - p.z) / Math.max(dt, 1e-4);
            }
            last.current = { x: trackPosition.x, z: trackPosition.z };
        }
        // Ease so a dropped network packet doesn't make a peer stutter
        spd.current += (Math.min(v, 6) - spd.current) * Math.min(1, dt * 8);
        const s = spd.current;
        const moving = s > 0.25;

        // Stride frequency rises with speed, the way a real gait does
        cycle.current += dt * (moving ? 2.2 + s * 1.35 : 1.1);
        const t = cycle.current;
        const swing = Math.sin(t) * Math.min(1, s / 1.8);
        const swingB = Math.sin(t + Math.PI) * Math.min(1, s / 1.8);
        const amp = moving ? 0.85 : 0;

        // Legs — thigh swings, knee only bends on the forward half
        if (legL.current) legL.current.rotation.x = swing * amp * 0.62;
        if (legR.current) legR.current.rotation.x = swingB * amp * 0.62;
        if (kneeL.current) kneeL.current.rotation.x = Math.max(0, -swing) * amp * 1.15;
        if (kneeR.current) kneeR.current.rotation.x = Math.max(0, -swingB) * amp * 1.15;

        // Arms counter-swing the legs; elbows keep a soft carry angle
        if (armL.current) armL.current.rotation.x = swingB * amp * 0.5 - (moving ? 0 : 0.06);
        if (armR.current) armR.current.rotation.x = swing * amp * 0.5 - (moving ? 0 : 0.06);
        if (elbowL.current) elbowL.current.rotation.x = -0.22 - Math.max(0, swingB) * amp * 0.5;
        if (elbowR.current) elbowR.current.rotation.x = -0.22 - Math.max(0, swing) * amp * 0.5;

        // Torso: counter-rotate against the stride, and rise on each step
        if (torso.current) {
            torso.current.rotation.y = -swing * amp * 0.13;
            torso.current.rotation.x = moving ? 0.05 + s * 0.012 : 0.01;
            torso.current.position.y = Math.abs(Math.sin(t)) * amp * 0.028;
        }
        // Head: steadier than the body, plus a breath at rest
        if (head.current) {
            head.current.rotation.y = swing * amp * 0.07;
            head.current.position.y = moving ? 0 : Math.sin(t * 0.9) * 0.006;
        }
    });

    return (
        <group ref={root}>
            {/* Legs pivot from the pelvis */}
            {([['L', -1, legL, kneeL], ['R', 1, legR, kneeR]] as const).map(
                ([id, side, thighRef, kneeRef]) => (
                    <group key={id} position={[side * P.hip * 0.55, hipY, 0]} ref={thighRef}>
                        <Bone len={P.thigh} top={P.legR} bottom={P.legR * 0.82} mat={mats.legs} shadow={sh} seg={seg} />
                        <group position={[0, -P.thigh, 0]} ref={kneeRef}>
                            <Bone len={P.shin} top={P.legR * 0.8} bottom={P.legR * 0.6} mat={mats.legs} shadow={sh} seg={seg} />
                            {/* foot */}
                            <mesh position={[0, -P.shin - 0.03, 0.055]} castShadow={sh}>
                                <boxGeometry args={[P.legR * 1.7, 0.07, 0.23]} />
                                <primitive object={mats.boot} attach="material" />
                            </mesh>
                        </group>
                    </group>
                ),
            )}

            {/* Torso and everything it carries */}
            <group ref={torso} position={[0, hipY, 0]}>
                {/* pelvis → chest, tapered the right way up */}
                <mesh position={[0, P.torso * 0.5, 0]} castShadow={sh}>
                    <cylinderGeometry args={[P.shoulder, P.hip, P.torso, seg + 2]} />
                    <primitive object={mats.cloth} attach="material" />
                </mesh>
                {/* shoulder yoke — what actually tells you which way someone faces */}
                <mesh
                    position={[0, P.torso - 0.03, 0]}
                    rotation={[0, 0, Math.PI / 2]}
                    castShadow={sh}
                >
                    <capsuleGeometry args={[P.shoulder * 0.52, P.shoulder * 1.15, 3, seg]} />
                    <primitive object={mats.cloth} attach="material" />
                </mesh>

                {/* Arms hang from the yoke */}
                {([['L', -1, armL, elbowL], ['R', 1, armR, elbowR]] as const).map(
                    ([id, side, shoulderRef, elbowRef]) => (
                        <group key={id} position={[side * (P.shoulder + 0.02), P.torso - 0.06, 0]} ref={shoulderRef}>
                            <Bone len={P.upperArm} top={P.armR} bottom={P.armR * 0.85} mat={mats.cloth} shadow={sh} seg={seg} />
                            <group position={[0, -P.upperArm, 0]} ref={elbowRef}>
                                <Bone len={P.foreArm} top={P.armR * 0.82} bottom={P.armR * 0.68} mat={mats.skin} shadow={sh} seg={seg} />
                                <mesh position={[0, -P.foreArm - 0.045, 0]} castShadow={sh}>
                                    <sphereGeometry args={[P.armR * 0.95, seg, seg - 2]} />
                                    <primitive object={mats.skin} attach="material" />
                                </mesh>
                            </group>
                        </group>
                    ),
                )}

                {/* Neck + head */}
                <group ref={head} position={[0, P.torso + 0.02, 0]}>
                    <mesh position={[0, P.neck / 2, 0]} castShadow={sh}>
                        <cylinderGeometry args={[0.045, 0.052, P.neck, seg]} />
                        <primitive object={mats.skin} attach="material" />
                    </mesh>
                    <mesh position={[0, P.neck + P.head * 0.92, 0]} scale={[0.92, 1.08, 0.96]} castShadow={sh}>
                        <sphereGeometry args={[P.head, low ? 10 : 16, low ? 8 : 14]} />
                        <primitive object={mats.skin} attach="material" />
                    </mesh>
                    {/* hair cap — sits back off the brow so there's a face */}
                    {!low && (
                        <mesh
                            position={[0, P.neck + P.head * 1.02, -0.012]}
                            scale={[1.02, 0.86, 1.04]}
                            castShadow={sh}
                        >
                            <sphereGeometry args={[P.head * 1.02, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                            <primitive object={mats.hair} attach="material" />
                        </mesh>
                    )}
                </group>
            </group>

            {/* The soul's ring — how you spot someone across a dark room */}
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.27, 0.38, low ? 12 : 20]} />
                <primitive object={mats.aura} attach="material" />
            </mesh>
        </group>
    );
}
