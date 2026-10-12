'use client';

/**
 * The plain's animals and oddities — Quaternius' CC0 creatures, each a
 * skeleton clone with its own mixer and a tiny mind: stand, wander, run
 * from you. Deer in the meadow, foxes and wolves in the hollow, bulls on
 * the Rise, frogs by the water, slimes and blobs where it is damp, ghosts
 * in the dark trees after dusk, glubs drifting over the summit.
 *
 * Far creatures stop animating and hide; the budget goes to what you can
 * see.
 */
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { heightAt, isWater, LAKE, RISE, WATER_Y } from '@/lib/world/terrain';
import { moveOnPlain, rng, walkableAt } from '@/lib/world/plain';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';
import { getSky } from '@/components/truthos/house/DayNightCycle';

export type CreatureKind = 'deer' | 'fox' | 'wolf' | 'bull' | 'frog' | 'ghost' | 'mushnub' | 'slime' | 'blob' | 'glub';

type Def = {
    url: string;
    scale: number;
    /** metres per second */
    walk: number;
    run: number;
    /** run when the walker comes this close (0 = never) */
    flee: number;
    /** how far from home it wanders */
    roam: number;
    /** hover height for the floaters */
    hover: number;
    /** clip name suffixes */
    idle: string[];
    walkClip: string;
    runClip: string;
    radius: number;
    /** ghosts only show in the dark */
    nocturnal?: boolean;
};

const C = '/models/creatures';
export const CREATURE_DEFS: Record<CreatureKind, Def> = {
    deer: { url: `${C}/Deer.glb`, scale: 0.4, walk: 1.1, run: 6.5, flee: 9, roam: 30, hover: 0, idle: ['Idle', 'Idle_2'], walkClip: 'Walk', runClip: 'Gallop', radius: 0.6 },
    fox: { url: `${C}/Fox.glb`, scale: 0.26, walk: 1.0, run: 6, flee: 7, roam: 26, hover: 0, idle: ['Idle', 'Idle_2'], walkClip: 'Walk', runClip: 'Gallop', radius: 0.4 },
    wolf: { url: `${C}/Wolf.glb`, scale: 0.35, walk: 1.2, run: 6.5, flee: 0, roam: 34, hover: 0, idle: ['Idle', 'Idle_2'], walkClip: 'Walk', runClip: 'Gallop', radius: 0.5 },
    bull: { url: `${C}/Bull.glb`, scale: 0.39, walk: 0.9, run: 5, flee: 0, roam: 28, hover: 0, idle: ['Idle', 'Idle_2'], walkClip: 'Walk', runClip: 'Gallop', radius: 0.9 },
    frog: { url: `${C}/Frog.glb`, scale: 0.13, walk: 0.7, run: 3.2, flee: 3.5, roam: 10, hover: 0, idle: ['Idle'], walkClip: 'Walk', runClip: 'Run', radius: 0.2 },
    ghost: { url: `${C}/Ghost.glb`, scale: 0.52, walk: 0.9, run: 3.5, flee: 0, roam: 30, hover: 0.9, idle: ['Flying_Idle'], walkClip: 'Flying_Idle', runClip: 'Fast_Flying', radius: 0.5, nocturnal: true },
    mushnub: { url: `${C}/Mushnub.glb`, scale: 0.3, walk: 0.6, run: 2.2, flee: 4, roam: 14, hover: 0, idle: ['Idle'], walkClip: 'Walk', runClip: 'Walk', radius: 0.4 },
    slime: { url: `${C}/Pink_Slime.glb`, scale: 0.35, walk: 0.6, run: 2.4, flee: 4, roam: 14, hover: 0, idle: ['Idle'], walkClip: 'Walk', runClip: 'Walk', radius: 0.35 },
    blob: { url: `${C}/Green_Blob.glb`, scale: 0.32, walk: 0.6, run: 2.4, flee: 4, roam: 14, hover: 0, idle: ['Idle'], walkClip: 'Walk', runClip: 'Walk', radius: 0.35 },
    glub: { url: `${C}/Glub.glb`, scale: 0.42, walk: 0.8, run: 3, flee: 6, roam: 24, hover: 1.6, idle: ['Flying_Idle'], walkClip: 'Flying_Idle', runClip: 'Fast_Flying', radius: 0.5 },
};

export type Spawn = { id: string; kind: CreatureKind; x: number; z: number; seed: number };

/** Herds and posts, placed once. Walkable spots only. */
function spawnList(): Spawn[] {
    const r = rng(0xc0ffee);
    const out: Spawn[] = [];
    const place = (kind: CreatureKind, cx: number, cz: number, spread: number, n: number, water = false) => {
        let i = 0;
        let guard = 0;
        while (i < n && guard++ < 60) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * spread;
            const x = cx + Math.cos(a) * d;
            const z = cz + Math.sin(a) * d;
            if (!walkableAt(x, z, CREATURE_DEFS[kind].radius)) continue;
            if (!water && isWater(x, z, -0.2)) continue;
            out.push({ id: `${kind}_${out.length}`, kind, x, z, seed: Math.floor(r() * 1e9) });
            i++;
        }
    };
    // deer: three herds on the meadow and the fields
    place('deer', 40, 200, 18, 4);
    place('deer', -40, 120, 16, 3);
    place('deer', -20, 290, 20, 4);
    // bulls on the Rise's lower slopes
    place('bull', RISE.x - 40, RISE.z + 50, 22, 3);
    // the hollow: foxes at its edge, a wolf pack deeper in
    place('fox', 40, -70, 24, 3);
    place('fox', -40, -90, 20, 2);
    place('wolf', 10, -170, 24, 3);
    // the lake: frogs on the shore, slimes in the damp
    place('frog', LAKE.x + 60, LAKE.z + 30, 14, 4);
    place('frog', LAKE.x - 10, LAKE.z + 70, 14, 3);
    place('slime', LAKE.x + 80, LAKE.z - 30, 20, 3);
    place('slime', -60, 60, 16, 2);
    // blobs and mushnubs
    place('blob', 60, 300, 20, 3);
    place('blob', -90, 260, 18, 2);
    place('mushnub', 0, -110, 26, 4);
    place('mushnub', -160, 90, 14, 2);
    // ghosts drift in the dark trees; glubs over the summit
    place('ghost', 20, -140, 36, 3);
    place('glub', RISE.x, RISE.z, 30, 3);
    return out;
}

let spawnCache: Spawn[] | null = null;
export function creatureSpawns(): Spawn[] {
    if (!spawnCache) spawnCache = spawnList();
    return spawnCache;
}

/** Beyond this the creature sleeps: no mixer, no draw */
const SLEEP_R = 150;

function findClip(clips: THREE.AnimationClip[], suffix: string): THREE.AnimationClip | null {
    return clips.find((c) => c.name === suffix || c.name.endsWith('|' + suffix) || c.name.endsWith(suffix)) ?? null;
}

type Mind = { mode: 'idle' | 'wander' | 'flee'; t: number; tx: number; tz: number; dirX: number; dirZ: number; yaw: number; speed: number };

function Creature({ spawn, shadows }: { spawn: Spawn; shadows: boolean }) {
    const def = CREATURE_DEFS[spawn.kind];
    const gltf = useGLTF(def.url);
    const group = useRef<THREE.Group>(null);
    const clone = useMemo(() => {
        const root = SkeletonUtils.clone(gltf.scene) as THREE.Group;
        root.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            m.frustumCulled = false;
            m.castShadow = shadows;
            m.receiveShadow = false;
            if (def.nocturnal) {
                const mats = Array.isArray(m.material) ? m.material : [m.material];
                m.material = mats.map((mm) => {
                    const c = (mm as THREE.MeshStandardMaterial).clone();
                    c.transparent = true;
                    c.opacity = 0.8;
                    c.depthWrite = false;
                    return c;
                });
                if (m.material.length === 1) m.material = m.material[0];
            }
        });
        return root;
    }, [gltf.scene, shadows, def.nocturnal]);

    const mixer = useMemo(() => new THREE.AnimationMixer(clone), [clone]);
    const actions = useMemo(() => {
        const get = (s: string) => {
            const c = findClip(gltf.animations, s);
            return c ? mixer.clipAction(c) : null;
        };
        return {
            idle: def.idle.map(get).filter(Boolean) as THREE.AnimationAction[],
            walk: get(def.walkClip),
            run: get(def.runClip),
        };
    }, [gltf.animations, mixer, def]);
    const current = useRef<THREE.AnimationAction | null>(null);
    const mind = useRef<Mind>({ mode: 'idle', t: 1 + (spawn.seed % 1000) / 400, tx: spawn.x, tz: spawn.z, dirX: 0, dirZ: 1, yaw: (spawn.seed % 628) / 100, speed: 0 });
    const pos = useRef({ x: spawn.x, z: spawn.z });
    const r = useMemo(() => rng(spawn.seed), [spawn.seed]);
    const bobT = useRef((spawn.seed % 100) / 10);

    const play = (a: THREE.AnimationAction | null, fade = 0.25, scale = 1) => {
        if (!a) return;
        if (current.current === a) {
            a.timeScale = scale;
            return;
        }
        a.reset();
        a.setLoop(THREE.LoopRepeat, Infinity);
        a.enabled = true;
        a.timeScale = scale;
        a.setEffectiveWeight(1);
        if (current.current) a.crossFadeFrom(current.current, fade, true);
        else a.fadeIn(fade);
        a.play();
        current.current = a;
    };

    useEffect(() => {
        const idle = actions.idle[0] ?? actions.walk;
        play(idle, 0.01, 0.9 + (spawn.seed % 20) / 100);
        return () => {
            mixer.stopAllAction();
            current.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions, mixer]);

    useFrame((_, dtRaw) => {
        const g = group.current;
        if (!g) return;
        const dt = Math.min(dtRaw, 0.05);
        const p = getWalkerPose();
        const dxp = pos.current.x - p.x;
        const dzp = pos.current.z - p.z;
        const dist = Math.hypot(dxp, dzp);
        if (dist > SLEEP_R) {
            g.visible = false;
            return;
        }
        const sky = getSky();
        if (def.nocturnal) {
            const dark = THREE.MathUtils.clamp((0.55 - sky.daylight) / 0.4, 0, 1);
            g.visible = dark > 0.02;
            clone.traverse((o) => {
                const m = o as THREE.Mesh;
                if (!m.isMesh) return;
                const mats = Array.isArray(m.material) ? m.material : [m.material];
                for (const mm of mats) (mm as THREE.MeshStandardMaterial).opacity = 0.25 + dark * 0.6;
            });
            if (!g.visible) return;
        } else g.visible = true;

        const m = mind.current;
        m.t -= dt;
        // fear
        if (def.flee > 0 && dist < def.flee && m.mode !== 'flee') {
            m.mode = 'flee';
            m.t = 2.4 + r() * 1.5;
            const l = dist || 1;
            m.dirX = dxp / l;
            m.dirZ = dzp / l;
        }
        if (m.mode === 'idle' && m.t <= 0) {
            // pick a spot near home
            const a = r() * Math.PI * 2;
            const d = 4 + r() * def.roam;
            const tx = spawn.x + Math.cos(a) * d;
            const tz = spawn.z + Math.sin(a) * d;
            if (walkableAt(tx, tz, def.radius) && (spawn.kind === 'frog' || !isWater(tx, tz, -0.2))) {
                m.mode = 'wander';
                m.tx = tx;
                m.tz = tz;
                m.t = 14;
            } else m.t = 0.5;
        }
        let want = 0;
        let moveX = 0;
        let moveZ = 0;
        if (m.mode === 'wander') {
            const dx = m.tx - pos.current.x;
            const dz = m.tz - pos.current.z;
            const l = Math.hypot(dx, dz);
            if (l < 0.6 || m.t <= 0) {
                m.mode = 'idle';
                m.t = 2 + r() * 6;
            } else {
                want = def.walk;
                moveX = dx / l;
                moveZ = dz / l;
            }
        } else if (m.mode === 'flee') {
            if (m.t <= 0) {
                m.mode = 'idle';
                m.t = 1 + r() * 3;
            } else {
                want = def.run;
                // keep running from where the walker is now, with a little drift
                const l = dist || 1;
                m.dirX = m.dirX * 0.9 + (dxp / l) * 0.1;
                m.dirZ = m.dirZ * 0.9 + (dzp / l) * 0.1;
                const ll = Math.hypot(m.dirX, m.dirZ) || 1;
                moveX = m.dirX / ll;
                moveZ = m.dirZ / ll;
            }
        }
        m.speed += (want - m.speed) * Math.min(1, dt * 6);
        if (m.speed > 0.05) {
            const nx = pos.current.x + moveX * m.speed * dt;
            const nz = pos.current.z + moveZ * m.speed * dt;
            const next = moveOnPlain(pos.current.x, pos.current.z, nx, nz, def.radius);
            if (Math.abs(next.x - pos.current.x) < 1e-4 && Math.abs(next.z - pos.current.z) < 1e-4) {
                // stuck: give up on this spot
                if (m.mode === 'wander') {
                    m.mode = 'idle';
                    m.t = 1;
                }
            }
            pos.current.x = next.x;
            pos.current.z = next.z;
            const target = Math.atan2(moveX, moveZ);
            let dy = target - m.yaw;
            while (dy > Math.PI) dy -= Math.PI * 2;
            while (dy < -Math.PI) dy += Math.PI * 2;
            m.yaw += dy * Math.min(1, dt * (m.mode === 'flee' ? 9 : 4));
        }
        // the body
        const ground = Math.max(heightAt(pos.current.x, pos.current.z), spawn.kind === 'frog' ? WATER_Y - 0.1 : -Infinity);
        bobT.current += dt;
        const hover = def.hover > 0 ? def.hover + Math.sin(bobT.current * 1.6 + spawn.seed) * 0.18 : 0;
        g.position.set(pos.current.x, ground + hover, pos.current.z);
        g.rotation.y = m.yaw;
        // the clip
        if (m.speed > def.walk * 1.6 && actions.run) play(actions.run, 0.2, THREE.MathUtils.clamp(m.speed / def.run, 0.8, 1.4));
        else if (m.speed > 0.12 && actions.walk) play(actions.walk, 0.25, THREE.MathUtils.clamp(m.speed / def.walk, 0.7, 1.4));
        else {
            const idle = actions.idle.length > 1 && (Math.floor(bobT.current / 9) + spawn.seed) % 3 === 0 ? actions.idle[1] : actions.idle[0];
            play(idle ?? actions.walk, 0.35, 1);
        }
        mixer.update(dt);
    });

    return (
        <group ref={group} position={[spawn.x, heightAt(spawn.x, spawn.z), spawn.z]} scale={def.scale}>
            <primitive object={clone} />
        </group>
    );
}

export default function Creatures({ low = false, shadows = true }: { low?: boolean; shadows?: boolean }) {
    const list = useMemo(() => {
        const all = creatureSpawns();
        return low ? all.filter((_, i) => i % 2 === 0) : all;
    }, [low]);
    return (
        <group>
            {list.map((s) => (
                <Suspense key={s.id} fallback={null}>
                    <Creature spawn={s} shadows={shadows && !low} />
                </Suspense>
            ))}
        </group>
    );
}

export function preloadCreatures() {
    for (const k of Object.keys(CREATURE_DEFS) as CreatureKind[]) useGLTF.preload(CREATURE_DEFS[k].url);
}
