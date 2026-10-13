'use client';

/**
 * The plain's enemies, alive. Each is a skeleton clone with its own mixer
 * and a small mind: idle at camp, notice you, close in, wind up (a red
 * ring spreads under it — that is your moment to roll), strike, recover.
 * Struck hard enough it staggers; struck to nothing it falls, leaves its
 * loot and comes back to its camp later. Shades only walk at night or in
 * fog; bulls never start it.
 */
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { heightAt } from '@/lib/world/terrain';
import { moveOnPlain, rng } from '@/lib/world/plain';
import { ENEMIES, enemySpawns, RESPAWN_S, type EnemyDef, type EnemySpawn } from '@/lib/world/enemies';
import { emit, enemies, hurtPlayer, player, type EnemyHandle } from '@/lib/world/combat';
import { sfx } from '@/lib/world/sfx';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';
import { getSky } from '@/components/truthos/house/DayNightCycle';
import { useWorldTime } from '@/components/truthos/house/worldTime';

const SLEEP_R = 130;

type Mode = 'idle' | 'wander' | 'chase' | 'windup' | 'recover' | 'stagger' | 'return' | 'dead' | 'gone';

/** Name and level on a little canvas, made once per kind */
const plates = new Map<string, THREE.CanvasTexture>();
function plate(def: EnemyDef): THREE.CanvasTexture {
    const key = def.kind;
    const hit = plates.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 48;
    const g = c.getContext('2d')!;
    g.font = '600 22px ui-sans-serif, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(0,0,0,0.8)';
    const label = `${def.name}  ·  Lv ${def.level}`;
    g.strokeText(label, 128, 24);
    g.fillStyle = def.neutral ? '#e7e5e4' : '#fca5a5';
    g.fillText(label, 128, 24);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    plates.set(key, t);
    return t;
}

function findClip(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip | null {
    return clips.find((c) => c.name === name) ?? null;
}

function Enemy({ spawn, shadows }: { spawn: EnemySpawn; shadows: boolean }) {
    const def = ENEMIES[spawn.kind];
    const gltf = useGLTF(def.url);
    const { camera } = useThree();
    const group = useRef<THREE.Group>(null);
    const body = useRef<THREE.Group>(null);
    const bar = useRef<THREE.Group>(null);
    const barFill = useRef<THREE.Mesh>(null);
    const ring = useRef<THREE.Mesh>(null);

    const { clone, mats } = useMemo(() => {
        const root = SkeletonUtils.clone(gltf.scene) as THREE.Group;
        const mats: THREE.MeshStandardMaterial[] = [];
        root.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            m.frustumCulled = false;
            m.castShadow = shadows;
            const list = (Array.isArray(m.material) ? m.material : [m.material]).map((mm) => {
                const c = (mm as THREE.MeshStandardMaterial).clone();
                if (def.night) {
                    c.transparent = true;
                    c.opacity = 0.8;
                    c.depthWrite = false;
                }
                mats.push(c);
                return c;
            });
            m.material = list.length === 1 ? list[0] : list;
        });
        return { clone: root, mats };
    }, [gltf.scene, shadows, def.night]);

    const mixer = useMemo(() => new THREE.AnimationMixer(clone), [clone]);
    const acts = useMemo(() => {
        const get = (n: string) => {
            const c = findClip(gltf.animations, n);
            return c ? mixer.clipAction(c) : null;
        };
        return { idle: get(def.clips.idle), walk: get(def.clips.walk), run: get(def.clips.run), attack: get(def.clips.attack), hit: get(def.clips.hit), death: get(def.clips.death) };
    }, [gltf.animations, mixer, def]);
    const current = useRef<THREE.AnimationAction | null>(null);
    const play = (a: THREE.AnimationAction | null, fade = 0.2, scale = 1, once = false) => {
        if (!a) return;
        if (current.current === a && !once) {
            a.timeScale = scale;
            return;
        }
        a.reset();
        a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        a.clampWhenFinished = once;
        a.timeScale = scale;
        a.enabled = true;
        a.setEffectiveWeight(1);
        if (current.current && current.current !== a) a.crossFadeFrom(current.current, fade, true);
        else a.fadeIn(fade);
        a.play();
        current.current = a;
    };

    const s = useRef({
        mode: 'idle' as Mode,
        t: 1 + (spawn.seed % 1000) / 300,
        x: spawn.x,
        z: spawn.z,
        yaw: (spawn.seed % 628) / 100,
        hp: def.hp,
        speed: 0,
        tx: spawn.x,
        tz: spawn.z,
        provoked: false,
        flash: 0,
        knockX: 0,
        knockZ: 0,
        deadAt: 0,
        engaged: 0,
    });
    const r = useMemo(() => rng(spawn.seed), [spawn.seed]);

    // register with the fight
    useEffect(() => {
        const st = s.current;
        const handle: EnemyHandle = {
            id: spawn.id,
            kind: spawn.kind,
            x: st.x,
            y: 0,
            z: st.z,
            radius: def.radius,
            alive: () => st.mode !== 'dead' && st.mode !== 'gone' && !!group.current?.visible,
            receive: (amount, fromX, fromZ, opts) => {
                if (st.mode === 'dead' || st.mode === 'gone') return false;
                st.hp -= amount;
                st.flash = 1;
                st.provoked = true;
                st.engaged = performance.now();
                const dx = st.x - fromX;
                const dz = st.z - fromZ;
                const d = Math.hypot(dx, dz) || 1;
                st.knockX = (dx / d) * opts.knock;
                st.knockZ = (dz / d) * opts.knock;
                if (st.hp <= 0) {
                    st.mode = 'dead';
                    st.deadAt = performance.now();
                    play(acts.death, 0.1, 1, true);
                    sfx('enemyDie', { at: st });
                    emit({ type: 'kill', kind: def.kind, x: st.x, z: st.z, level: def.level });
                    return true;
                }
                if (opts.stagger || amount > def.hp * def.poise) {
                    st.mode = 'stagger';
                    st.t = 0.45;
                    play(acts.hit, 0.06, 1.2, true);
                } else if (st.mode === 'idle' || st.mode === 'wander' || st.mode === 'return') {
                    st.mode = 'chase';
                }
                return false;
            },
        };
        enemies.set(spawn.id, handle);
        play(acts.idle, 0.01, 0.9 + (spawn.seed % 20) / 100);
        return () => {
            enemies.delete(spawn.id);
            mixer.stopAllAction();
            current.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acts, mixer, spawn.id]);

    useFrame((_, dtRaw) => {
        const g = group.current;
        if (!g) return;
        const dt = Math.min(dtRaw, 0.05);
        const st = s.current;
        const h = enemies.get(spawn.id);
        const p = getWalkerPose();
        const now = performance.now();

        // the dead come back to camp, out of sight
        if (st.mode === 'dead') {
            const age = (now - st.deadAt) / 1000;
            mixer.update(dt);
            if (age > 2.4) {
                const fade = Math.max(0, 1 - (age - 2.4) / 0.8);
                for (const m of mats) {
                    m.transparent = true;
                    m.opacity = fade * (def.night ? 0.8 : 1);
                }
                if (fade <= 0) {
                    st.mode = 'gone';
                    g.visible = false;
                }
            }
            if (bar.current) bar.current.visible = false;
            if (ring.current) ring.current.visible = false;
            return;
        }
        if (st.mode === 'gone') {
            if ((now - st.deadAt) / 1000 > RESPAWN_S && Math.hypot(p.x - spawn.x, p.z - spawn.z) > 35) {
                st.mode = 'idle';
                st.hp = def.hp;
                st.x = spawn.x;
                st.z = spawn.z;
                st.provoked = false;
                for (const m of mats) {
                    m.opacity = def.night ? 0.8 : 1;
                    m.transparent = !!def.night;
                }
                play(acts.idle, 0.01);
                g.visible = true;
            }
            return;
        }

        const dist = Math.hypot(p.x - st.x, p.z - st.z);
        if (dist > SLEEP_R) {
            g.visible = false;
            return;
        }
        // shades walk only in the dark or the fog
        const sky = getSky();
        const weather = useWorldTime.getState().weather;
        if (def.night) {
            const dark = Math.max(THREE.MathUtils.clamp((0.55 - sky.daylight) / 0.4, 0, 1), weather === 'fog' ? 0.9 : 0);
            const vis = dark > 0.05;
            if (g.visible !== vis) g.visible = vis;
            if (!vis) {
                if (st.mode === 'chase' || st.mode === 'windup') st.mode = 'idle';
                return;
            }
            for (const m of mats) m.opacity = 0.25 + dark * 0.6;
        } else if (!g.visible) g.visible = true;

        // ── mind ──
        const night = sky.daylight < 0.3;
        const wet = weather === 'rain';
        let aggro = def.neutral && !st.provoked ? 0 : def.aggro;
        if (def.kind === 'wolf' && night) aggro *= 1.4;
        if ((def.kind === 'slime' || def.kind === 'blob') && wet) aggro *= 1.3;
        if (now < player.deliverUntil) aggro *= 0.5;
        const rage = (wet && (def.kind === 'slime' || def.kind === 'blob')) || (night && def.kind === 'wolf') ? 1.2 : 1;
        const homeD = Math.hypot(st.x - spawn.x, st.z - spawn.z);
        const playerGone = player.dead;

        st.t -= dt;
        let want = 0;
        let mx = 0;
        let mz = 0;
        const toP = { x: (p.x - st.x) / (dist || 1), z: (p.z - st.z) / (dist || 1) };

        switch (st.mode) {
            case 'idle':
            case 'wander': {
                if (!playerGone && dist < aggro) {
                    st.mode = 'chase';
                    sfx(def.voice, { at: st, range: 30 });
                    emit({ type: 'aggro', kind: def.kind });
                    break;
                }
                if (st.mode === 'idle' && st.t <= 0) {
                    const a = r() * Math.PI * 2;
                    const d = 3 + r() * 10;
                    st.tx = spawn.x + Math.cos(a) * d;
                    st.tz = spawn.z + Math.sin(a) * d;
                    st.mode = 'wander';
                    st.t = 10;
                }
                if (st.mode === 'wander') {
                    const dx = st.tx - st.x;
                    const dz = st.tz - st.z;
                    const l = Math.hypot(dx, dz);
                    if (l < 0.5 || st.t <= 0) {
                        st.mode = 'idle';
                        st.t = 2 + r() * 5;
                    } else {
                        want = def.walk;
                        mx = dx / l;
                        mz = dz / l;
                    }
                }
                break;
            }
            case 'chase': {
                if (playerGone || homeD > spawn.leash || (dist > aggro * 1.8 && now - st.engaged > 4000)) {
                    st.mode = 'return';
                    break;
                }
                if (dist <= def.reach + 0.35) {
                    st.mode = 'windup';
                    st.t = def.windup / rage;
                    play(acts.attack, 0.12, 0.8 / (def.windup + 0.25) * rage, true);
                    sfx('windup', { at: st, volume: 0.6 });
                    break;
                }
                want = def.run * rage;
                mx = toP.x;
                mz = toP.z;
                break;
            }
            case 'windup': {
                // face the walker while gathering
                mx = toP.x * 0.001;
                mz = toP.z * 0.001;
                if (st.t <= 0) {
                    if (dist <= def.reach + 0.6) hurtPlayer(Math.round(def.damage * rage), st.x, st.z, def.kind === 'bull');
                    st.mode = 'recover';
                    st.t = def.cooldown * (0.85 + r() * 0.3);
                }
                break;
            }
            case 'recover': {
                if (st.t <= 0) st.mode = 'chase';
                // a little shuffle so they are not statues between blows
                want = def.walk * 0.4;
                mx = -toP.z * (spawn.seed % 2 ? 1 : -1);
                mz = toP.x * (spawn.seed % 2 ? 1 : -1);
                break;
            }
            case 'stagger': {
                if (st.t <= 0) st.mode = 'chase';
                break;
            }
            case 'return': {
                const dx = spawn.x - st.x;
                const dz = spawn.z - st.z;
                const l = Math.hypot(dx, dz);
                if (l < 1.5) {
                    st.mode = 'idle';
                    st.t = 2;
                    st.hp = Math.min(def.hp, st.hp + def.hp * 0.5);
                    st.provoked = false;
                } else {
                    want = def.run * 0.7;
                    mx = dx / l;
                    mz = dz / l;
                }
                if (!playerGone && dist < aggro * 0.6 && homeD < spawn.leash * 0.6) st.mode = 'chase';
                break;
            }
        }

        // ── body ──
        st.speed += (want - st.speed) * Math.min(1, dt * 7);
        let nx = st.x + mx * st.speed * dt + st.knockX * dt * 6;
        let nz = st.z + mz * st.speed * dt + st.knockZ * dt * 6;
        st.knockX *= Math.exp(-dt * 6);
        st.knockZ *= Math.exp(-dt * 6);
        // never stand inside the walker
        const pd = Math.hypot(p.x - nx, p.z - nz);
        const minD = def.radius + 0.4;
        if (pd < minD) {
            nx = p.x - ((p.x - nx) / (pd || 1)) * minD;
            nz = p.z - ((p.z - nz) / (pd || 1)) * minD;
        }
        const next = moveOnPlain(st.x, st.z, nx, nz, def.radius);
        st.x = next.x;
        st.z = next.z;
        if (Math.abs(mx) + Math.abs(mz) > 0) {
            const target = Math.atan2(mx, mz);
            let dy = target - st.yaw;
            while (dy > Math.PI) dy -= Math.PI * 2;
            while (dy < -Math.PI) dy += Math.PI * 2;
            st.yaw += dy * Math.min(1, dt * (st.mode === 'windup' ? 10 : 6));
        }
        const ground = heightAt(st.x, st.z);
        const hover = def.hover ? def.hover + Math.sin(now * 0.002 + spawn.seed) * 0.15 : 0;
        g.position.set(st.x, ground + hover, st.z);
        if (body.current) body.current.rotation.y = st.yaw;
        if (h) {
            h.x = st.x;
            h.z = st.z;
            h.y = ground + hover;
        }

        // ── clip ──
        if (st.mode === 'chase' || st.mode === 'return') play(acts.run ?? acts.walk, 0.2, Math.max(0.7, Math.min(1.5, st.speed / (def.run * 0.8))));
        else if (st.mode === 'wander' || st.mode === 'recover') play(acts.walk, 0.25, 1);
        else if (st.mode === 'idle') play(acts.idle, 0.3, 1);
        mixer.update(dt);

        // ── hit flash, health bar, the warning ring ──
        if (st.flash > 0) {
            st.flash = Math.max(0, st.flash - dt * 5);
            for (const m of mats) {
                m.emissive.setRGB(st.flash, st.flash * 0.9, st.flash * 0.8);
            }
        }
        if (bar.current && barFill.current) {
            const show = dist < 26 && (st.hp < def.hp || st.mode === 'chase' || st.mode === 'windup' || st.mode === 'recover');
            bar.current.visible = show;
            if (show) {
                bar.current.quaternion.copy(camera.quaternion);
                const k = Math.max(0, st.hp / def.hp);
                barFill.current.scale.x = Math.max(0.001, k);
                barFill.current.position.x = -(1 - k) * 0.5;
            }
        }
        if (ring.current) {
            const on = st.mode === 'windup';
            ring.current.visible = on;
            if (on) {
                const k = 1 - Math.max(0, st.t) / (def.windup / rage);
                ring.current.scale.setScalar(0.4 + k * (def.reach + 0.4));
                (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + k * 0.5;
                ring.current.position.set(0, -hover + 0.06, 0);
            }
        }
    });

    const barY = def.height + 0.42;

    return (
        <group ref={group} position={[spawn.x, heightAt(spawn.x, spawn.z), spawn.z]}>
            <group ref={body} scale={def.scale}>
                <primitive object={clone} />
            </group>
            <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
                <ringGeometry args={[0.82, 1, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
            </mesh>
            <group ref={bar} position={[0, barY, 0]} visible={false}>
                <sprite position={[0, 0.2, 0]} scale={[1.3, 0.24, 1]}>
                    <spriteMaterial map={plate(def)} transparent depthWrite={false} toneMapped={false} />
                </sprite>
                <mesh>
                    <planeGeometry args={[1.04, 0.11]} />
                    <meshBasicMaterial color="#000000" transparent opacity={0.65} depthWrite={false} toneMapped={false} />
                </mesh>
                <mesh ref={barFill} position={[0, 0, 0.001]}>
                    <planeGeometry args={[1, 0.07]} />
                    <meshBasicMaterial color={def.neutral ? '#fbbf24' : '#ef4444'} depthWrite={false} toneMapped={false} />
                </mesh>
            </group>
        </group>
    );
}

export default function Enemies({ low = false, shadows = true }: { low?: boolean; shadows?: boolean }) {
    const list = useMemo(() => {
        const all = enemySpawns();
        // phones keep every camp but fewer bodies in each
        return low ? all.filter((_, i) => i % 3 !== 2) : all;
    }, [low]);
    return (
        <group>
            {list.map((sp) => (
                <Suspense key={sp.id} fallback={null}>
                    <Enemy spawn={sp} shadows={shadows && !low} />
                </Suspense>
            ))}
        </group>
    );
}

export function preloadEnemies() {
    for (const d of Object.values(ENEMIES)) useGLTF.preload(d.url);
}
