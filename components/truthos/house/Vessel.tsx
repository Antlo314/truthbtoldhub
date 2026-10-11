'use client';

/**
 * The vessel — a rigged, animated human body every soul wears.
 *
 * Built from Quaternius' CC0 Universal Base Characters, Modular Outfits
 * and Universal Animation Library by scripts/build-vessels.mjs into three
 * files: one skinned body per build carrying EVERY selectable part, and
 * one shared clip library. The runtime downloads a body once per build
 * (drei's loader cache), clones its skeleton per player, toggles the parts
 * the soul chose, tints skin, hair and cloth from the same palettes the
 * creator uses, and drives a small locomotion state machine from two
 * numbers it already has: ground speed and whether the feet are on it.
 *
 * Anything that fails — the fetch, the parse, a bone that moved — drops to
 * the procedural Humanoid, so the room is never empty of people.
 */
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { wearKey, type VesselWear } from './vesselLook';

export const VESSEL_ANIMS_URL = '/models/vessels/vessel_anims.glb';
export const vesselUrl = (build: 'masc' | 'fem') => `/models/vessels/vessel_${build}.glb`;

/** What the body is doing right now — read every frame, never through React. */
export type VesselMotion = {
    speed: number;
    grounded: boolean;
    seated: boolean;
    emote: string | null;
    /** performance.now() when the emote began */
    emoteAt: number;
    talking: boolean;
};

export type EmoteDef = { clip: string; loop: boolean; seconds: number; label: string; key: string };

/** The emotes a soul can perform. Keys 1–4 in the house; `interact` is automatic. */
export const EMOTES: Record<string, EmoteDef> = {
    yes: { clip: 'Yes', loop: false, seconds: 1.7, label: 'Nod', key: '1' },
    no: { clip: 'Idle_No_Loop', loop: true, seconds: 2.6, label: 'Shake head', key: '2' },
    dance: { clip: 'Dance_Loop', loop: true, seconds: 9, label: 'Dance', key: '3' },
    arms: { clip: 'Idle_FoldArms_Loop', loop: true, seconds: 6, label: 'Fold arms', key: '4' },
    interact: { clip: 'Interact', loop: false, seconds: 1.3, label: 'Use', key: '' },
};

/**
 * Pelvis rest heights, measured from the binaries (scratch/vessels/rig-heights).
 * The clip library was authored on the mannequin; the pelvis translation
 * track is rescaled so each build's hips ride at their own height.
 */
const PELVIS_REST = { masc: 0.949, fem: 0.932, anims: 0.917 } as const;
/** Scale that brings each build to a believable height beside 2.5 m doors. */
const BUILD_SCALE = { masc: 0.954, fem: 0.97 } as const;

const clipCache = new Map<string, THREE.AnimationClip[]>();

function clipsFor(build: 'masc' | 'fem', src: THREE.AnimationClip[]): THREE.AnimationClip[] {
    const key = build;
    const hit = clipCache.get(key);
    if (hit) return hit;
    const ratio = PELVIS_REST[build] / PELVIS_REST.anims;
    const out = src.map((clip) => {
        const c = clip.clone();
        for (const t of c.tracks) {
            if (t.name === 'pelvis.position') {
                const v = t.values;
                for (let i = 0; i < v.length; i++) v[i] *= ratio;
            }
        }
        return c;
    });
    clipCache.set(key, out);
    return out;
}

function applyWear(root: THREE.Object3D, wear: VesselWear, shadows: boolean) {
    root.traverse((o) => {
        const mesh = o as THREE.SkinnedMesh;
        if (!mesh.isSkinnedMesh) return;
        const n = mesh.name;
        let show = true;
        if (n.startsWith('outfit_')) {
            if (n.includes('head_hood')) show = wear.hood;
            else show = n.split('_')[1] === wear.outfit;
        } else if (n.startsWith('hair_')) {
            const h = n.slice(5);
            if (h === 'beard') show = wear.beard;
            else show = !wear.hood && h === wear.hairStyle;
        }
        mesh.visible = show;
        // A skinned mesh's bounds do not follow its bones — never let the
        // frustum drop a body whose feet are still in view.
        mesh.frustumCulled = false;
        mesh.castShadow = shadows && show;
        mesh.receiveShadow = false;

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const tinted = mats.map((m) => {
            const mat = (m as THREE.MeshStandardMaterial).clone();
            const name = mat.name || '';
            if (name.startsWith('skin')) {
                mat.color.set(wear.skin);
            } else if (name === 'hair') {
                mat.color.set(wear.hair);
            } else if (name.startsWith('cloth')) {
                // The atlas is painted; a full tint turns leather purple, so
                // the soul's colour is laid over it at half strength.
                const legs = n.includes('legs');
                const feet = n.includes('feet') || n.includes('boots');
                const base = legs ? wear.bottom : feet ? wear.boots : wear.top;
                mat.color.set('#ffffff').lerp(new THREE.Color(base), legs || feet ? 0.5 : 0.58);
            }
            return mat;
        });
        mesh.material = tinted.length === 1 ? tinted[0] : tinted;
    });
}

function RiggedVessel({
    wear,
    motion,
    shadows,
}: {
    wear: VesselWear;
    motion: () => VesselMotion;
    shadows: boolean;
}) {
    const body = useGLTF(vesselUrl(wear.build));
    const anims = useGLTF(VESSEL_ANIMS_URL);
    const group = useRef<THREE.Group>(null);

    const key = wearKey(wear);
    const clone = useMemo(() => {
        const root = SkeletonUtils.clone(body.scene) as THREE.Group;
        applyWear(root, wear, shadows);
        return root;
        // wear is fully described by its key
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [body.scene, key, shadows]);

    const clips = useMemo(() => clipsFor(wear.build, anims.animations), [wear.build, anims.animations]);
    const { actions, mixer } = useAnimations(clips, group);

    // Per-body idle rate so a crowd never breathes in unison
    const idleRate = useMemo(() => 0.92 + Math.random() * 0.16, []);

    const current = useRef<string | null>(null);
    const airT = useRef(0);
    const wasAir = useRef(false);
    const landUntil = useRef(0);
    const lastSeated = useRef(false);

    const play = (name: string, loop: boolean, fadeS = 0.22, timeScale = 1) => {
        const next = actions[name];
        if (!next) return;
        if (current.current === name) {
            next.timeScale = timeScale;
            return;
        }
        const prev = current.current ? actions[current.current] : null;
        next.reset();
        next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        next.clampWhenFinished = !loop;
        next.enabled = true;
        next.timeScale = timeScale;
        next.setEffectiveWeight(1);
        if (prev && prev !== next) next.crossFadeFrom(prev, fadeS, true);
        else next.fadeIn(fadeS);
        next.play();
        current.current = name;
    };

    useEffect(() => {
        // Start standing, not in bind pose
        play('Idle_Loop', true, 0.01, idleRate);
        return () => {
            mixer.stopAllAction();
            current.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions, mixer]);

    useFrame((_, dtRaw) => {
        const dt = Math.min(dtRaw, 0.05);
        const m = motion();
        const now = performance.now();

        if (!m.grounded) {
            airT.current += dt;
            wasAir.current = true;
            play(airT.current < 0.3 ? 'Jump_Start' : 'Jump_Loop', airT.current >= 0.3, 0.12);
            return;
        }
        if (wasAir.current) {
            wasAir.current = false;
            if (airT.current > 0.22 && m.speed < 4) landUntil.current = now + 380;
            airT.current = 0;
        }
        if (now < landUntil.current) {
            play('Jump_Land', false, 0.08);
            return;
        }

        if (m.seated) {
            play(lastSeated.current ? 'Sitting_Idle_Loop' : 'Sitting_Enter', lastSeated.current, 0.25);
            if (!lastSeated.current && (actions.Sitting_Enter?.time ?? 0) > 0.9) lastSeated.current = true;
            return;
        }
        lastSeated.current = false;

        const s = m.speed;
        if (s > 6.4) {
            play('Sprint_Loop', true, 0.2, THREE.MathUtils.clamp(s / 7.2, 0.85, 1.4));
            return;
        }
        if (s > 2.1) {
            play('Jog_Fwd_Loop', true, 0.2, THREE.MathUtils.clamp(s / 4.2, 0.8, 1.55));
            return;
        }
        if (s > 0.35) {
            play('Walk_Loop', true, 0.2, THREE.MathUtils.clamp(s / 1.5, 0.75, 1.5));
            return;
        }

        const e = m.emote ? EMOTES[m.emote] : null;
        if (e && now - m.emoteAt < e.seconds * 1000) {
            play(e.clip, e.loop, 0.2);
            return;
        }
        play(m.talking ? 'Idle_Talking_Loop' : 'Idle_Loop', true, 0.3, m.talking ? 1 : idleRate);
    });

    const scale = BUILD_SCALE[wear.build];
    return (
        <group ref={group} scale={scale}>
            <primitive object={clone} />
        </group>
    );
}

class VesselBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch(err: unknown) {
        if (process.env.NODE_ENV !== 'production') console.warn('[Vessel] rigged body failed, using procedural figure:', err);
    }
    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

/**
 * A soul's body. `motion` is a getter, read inside the frame loop, so a
 * remote peer's speed and the local walker's state cost no re-renders.
 */
export default function Vessel({
    wear,
    motion,
    shadows = true,
    rigged = true,
    fallback,
}: {
    wear: VesselWear;
    motion: () => VesselMotion;
    shadows?: boolean;
    /** false = procedural figure only (phones that opted out, or a soft fallback) */
    rigged?: boolean;
    /** What stands here while the body loads, or if it never does */
    fallback: ReactNode;
}) {
    const aura = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: wear.aura,
                emissive: wear.aura,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                depthWrite: false,
            }),
        [wear.aura],
    );
    return (
        <group>
            {rigged ? (
                <VesselBoundary fallback={fallback}>
                    <Suspense fallback={fallback}>
                        <RiggedVessel wear={wear} motion={motion} shadows={shadows} />
                    </Suspense>
                </VesselBoundary>
            ) : (
                fallback
            )}
            {/* The soul's ring — how you spot someone across a dark room */}
            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.27, 0.38, 20]} />
                <primitive object={aura} attach="material" />
            </mesh>
        </group>
    );
}

/** Warm the loader cache so the first peer does not pop in as a grey figure. */
export function preloadVessels(builds: ('masc' | 'fem')[] = ['masc', 'fem']) {
    useGLTF.preload(VESSEL_ANIMS_URL);
    for (const b of builds) useGLTF.preload(vesselUrl(b));
}
