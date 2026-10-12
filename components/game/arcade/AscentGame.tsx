'use client';

/**
 * ASCENT — the arcade's 3D game. Run the sky-road over the cloud sea.
 *
 * Three lanes of stone floating above the clouds, your own vessel running
 * them. Kenney's coins, crates, bombs, springs, hearts and jewels (CC0) on
 * the road; the house's obsidian shards stand as pillars you can only go
 * around. Swipe or A/D to change lane, tap / Space to jump, swipe down / S
 * to slam back to the road.
 *
 * Same contract as the 2D games: one run-once input effect, a ref-held
 * world mutated inside useFrame (no React render per frame), HUD numbers
 * pushed to state only when they change, blur/visibility auto-pause,
 * reduced-motion honoured. The leaderboard's three ints are
 * score / coins / stage.
 *
 * Every beat is generated to be passable: pillars never fill all three
 * lanes, everything low can be jumped, and a gap is one row long — shorter
 * than a jump at the slowest speed.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { asfx, unlockArcadeAudio, isArcadeMuted, setArcadeMuted } from '@/lib/game/arcadeSfx';
import Vessel, { type VesselMotion } from '@/components/truthos/house/Vessel';
import { wearFromAvatar } from '@/components/truthos/house/vesselLook';
import { useGameStore } from '@/lib/store/useGameStore';
import { useArcadeInputProfile } from './useArcadeInputProfile';
import KeyboardHintBar from '@/components/game/controls/KeyboardHintBar';
import { SPRITE_URL } from '@/lib/game/arcadeSprites';

/* ── tuning ─────────────────────────────────────────────── */

const LANES = [-2.1, 0, 2.1];
const ROW = 4; // metres per road row
const VIEW = 150; // the road is built this far ahead
const BEHIND = 9; // rows are recycled once this far behind the runner
const MAX_ROWS = Math.ceil((VIEW + BEHIND) / ROW) + 2;
const TILE_W = 1.96;
const START_SPEED = 10;
const MAX_SPEED = 27;
const GRAV = 28;
const JUMP_V = 10;
const SPRING_V = 16.5;
const SLAM_V = -20;
const LANE_RATE = 15;
const COYOTE = 0.09;
const BUFFER = 0.14;

const STAGES: { at: number; name: string }[] = [
    { at: 0, name: 'The Steps' },
    { at: 400, name: 'The Bridges' },
    { at: 1000, name: 'The High Road' },
    { at: 1800, name: 'The Veil Road' },
    { at: 2800, name: 'The Storm' },
    { at: 4000, name: 'The Summit' },
    { at: 5500, name: 'Beyond' },
];
const stageFor = (dist: number) => {
    let i = 0;
    while (i + 1 < STAGES.length && dist >= STAGES[i + 1].at) i++;
    return i + 1;
};

const MODELS = {
    crate: '/models/kenney/platformer-kit/crate-strong.glb',
    bomb: '/models/kenney/platformer-kit/bomb.glb',
    coin: '/models/kenney/platformer-kit/coin-gold.glb',
    jewel: '/models/kenney/platformer-kit/jewel.glb',
    heart: '/models/kenney/platformer-kit/heart.glb',
    spring: '/models/kenney/platformer-kit/spring.glb',
    pillar: '/models/aether/obsidian_shard.glb',
    lantern: '/models/aether/lantern_pillar.glb',
    isle: '/models/aether/isle_base.glb',
} as const;

/** Uniform scale per model (measured natively — scripts/measure-models.mjs) */
const SCALE = { crate: 1.05, bomb: 1.2, coin: 1.45, jewel: 2.0, heart: 1.8, spring: 1.35, pillar: 2.2, lantern: 1.15, isle: 1 };
/** How tall each obstacle is once scaled — the jump has to clear it */
const HEIGHT = { crate: 0.63, bomb: 0.62, pillar: 2.4 };

type Kind = 'crate' | 'bomb' | 'pillar' | 'coin' | 'jewel' | 'heart' | 'spring';
type Item = { kind: Kind; lane: number; y: number; taken: boolean };
type Row = { z: number; gap: boolean; items: Item[]; lantern: boolean };
type RowSpec = { gap?: boolean; items?: Omit<Item, 'taken'>[] };
type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; color: string; size: number };
type Status = 'ready' | 'playing' | 'paused' | 'over';

type World = {
    rng: () => number;
    rows: Row[];
    queue: RowSpec[];
    rowCount: number;
    speed: number;
    dist: number;
    coins: number;
    jewels: number;
    lane: number;
    x: number;
    y: number;
    vy: number;
    grounded: boolean;
    coyote: number;
    jumpBuf: number;
    shield: boolean;
    invuln: number;
    dead: boolean;
    deadT: number;
    reported: boolean;
    stage: number;
    time: number;
    shake: number;
    particles: Particle[];
};

function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function newWorld(seed: number): World {
    const w: World = {
        rng: mulberry32(seed),
        rows: [],
        queue: [],
        rowCount: 0,
        speed: START_SPEED,
        dist: 0,
        coins: 0,
        jewels: 0,
        lane: 1,
        x: 0,
        y: 0,
        vy: 0,
        grounded: true,
        coyote: 0,
        jumpBuf: 0,
        shield: false,
        invuln: 0,
        dead: false,
        deadT: 0,
        reported: false,
        stage: 1,
        time: 0,
        shake: 0,
        particles: [],
    };
    // A clean runway first
    for (let i = 0; i < 6; i++) w.queue.push({});
    fill(w, BEHIND);
    return w;
}

const scoreOf = (w: World) => Math.floor(w.dist) + w.coins * 10 + w.jewels * 120;

/* ── the road generator ─────────────────────────────────── */

function pick<T>(rng: () => number, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length) % arr.length];
}

function planBeat(w: World) {
    const r = w.rng;
    const far = w.dist; // difficulty grows with distance run
    const hard = Math.min(1, far / 3500);
    const spacer = w.speed > 21 ? 2 : 3;
    const drift = Math.floor(r() * 3);
    for (let i = 0; i < spacer; i++) {
        // a loose trail of coins through the quiet rows
        w.queue.push(r() < 0.45 ? { items: [{ kind: 'coin', lane: drift, y: 0.8 }] } : {});
    }
    const options: [string, number][] = [
        ['coins', 2.5],
        ['single', 4],
        ['double', 1 + 3 * hard],
        ['wall', far > 120 ? 2 : 0],
        ['gap', far > 200 ? 2 : 0],
        ['spring', far > 320 ? 1.6 : 0],
        ['slalom', far > 700 ? 2.2 * hard + 0.6 : 0],
        ['heart', !w.shield && far > 500 ? 0.45 : 0],
    ];
    const total = options.reduce((s, [, wt]) => s + wt, 0);
    let roll = r() * total;
    let kind = 'coins';
    for (const [k, wt] of options) {
        roll -= wt;
        if (roll <= 0) {
            kind = k;
            break;
        }
    }
    const L = Math.floor(r() * 3);
    const other = (n: number) => [0, 1, 2].filter((x) => x !== n);
    const low = (): Kind => (far > 400 && r() < 0.35 ? 'bomb' : 'crate');
    switch (kind) {
        case 'coins':
            for (let i = 0; i < 5; i++) w.queue.push({ items: [{ kind: 'coin', lane: L, y: 0.8 }] });
            break;
        case 'single': {
            const k: Kind = r() < 0.4 ? 'pillar' : low();
            const M = pick(r, other(L));
            w.queue.push({ items: [{ kind: k, lane: L, y: 0 }, { kind: 'coin', lane: M, y: 0.8 }] });
            w.queue.push({ items: [{ kind: 'coin', lane: M, y: 0.8 }] });
            w.queue.push({ items: [{ kind: 'coin', lane: M, y: 0.8 }] });
            break;
        }
        case 'double': {
            // two lanes closed, one open — and at most one of the two is a pillar
            const [a, b] = other(L);
            const pa: Kind = r() < 0.5 ? 'pillar' : low();
            const pb: Kind = pa === 'pillar' ? low() : r() < 0.5 ? 'pillar' : low();
            w.queue.push({ items: [{ kind: pa, lane: a, y: 0 }, { kind: pb, lane: b, y: 0 }, { kind: 'coin', lane: L, y: 0.8 }] });
            w.queue.push({ items: [{ kind: 'coin', lane: L, y: 0.8 }] });
            break;
        }
        case 'wall':
            // all low — jump it; the coin over the middle pays for the timing
            w.queue.push({
                items: [
                    { kind: low(), lane: 0, y: 0 },
                    { kind: 'crate', lane: 1, y: 0 },
                    { kind: low(), lane: 2, y: 0 },
                    { kind: 'coin', lane: 1, y: 1.6 },
                ],
            });
            break;
        case 'gap':
            w.queue.push({ items: [{ kind: 'coin', lane: L, y: 1.1 }] });
            w.queue.push({ gap: true, items: [{ kind: 'coin', lane: L, y: 1.75 }] });
            w.queue.push({ items: [{ kind: 'coin', lane: L, y: 1.1 }] });
            break;
        case 'spring': {
            // the spring throws you high over a one-row gap; the coins and the
            // jewel are only up there. Everyone else can still jump the gap.
            w.queue.push({ items: [{ kind: 'spring', lane: L, y: 0 }] });
            const top: RowSpec['items'] = [
                { kind: 'coin', lane: L, y: 3.6 },
                ...(r() < 0.45 ? [{ kind: 'jewel' as Kind, lane: L, y: 4.6 }] : []),
            ];
            w.queue.push({ gap: true, items: top });
            w.queue.push({ items: [{ kind: 'coin', lane: L, y: 3.2 }] });
            w.queue.push({ items: [{ kind: 'coin', lane: L, y: 1.6 }] });
            break;
        }
        case 'slalom': {
            const side = r() < 0.5 ? 0 : 2;
            const seq = [side, 1, 2 - side, 1];
            seq.forEach((lane, i) => {
                const free = lane === 1 ? (i % 2 ? side : 2 - side) : 1;
                w.queue.push({ items: [{ kind: 'pillar', lane, y: 0 }, { kind: 'coin', lane: free, y: 0.8 }] });
                if (i < seq.length - 1) w.queue.push({ items: [{ kind: 'coin', lane: free, y: 0.8 }] });
            });
            break;
        }
        case 'heart': {
            const M = pick(r, other(L));
            w.queue.push({ items: [{ kind: 'heart', lane: L, y: 0.9 }, { kind: low(), lane: M, y: 0 }] });
            break;
        }
    }
}

/** Build rows until the road reaches VIEW ahead */
function fill(w: World, startZ?: number) {
    let farZ = w.rows.length ? w.rows[w.rows.length - 1].z : (startZ ?? 0) + ROW;
    while (farZ > -VIEW) {
        if (!w.queue.length) planBeat(w);
        const spec = w.queue.shift()!;
        farZ -= ROW;
        w.rowCount += 1;
        w.rows.push({
            z: farZ,
            gap: !!spec.gap,
            lantern: w.rowCount % 3 === 0,
            items: (spec.items ?? []).map((it) => ({ ...it, taken: false })),
        });
    }
}

/* ── procedural textures ────────────────────────────────── */

function stoneTexture(accent: string) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#2a2340';
    g.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
        g.fillRect(Math.random() * 128, Math.random() * 256, 2 + Math.random() * 6, 2 + Math.random() * 6);
    }
    g.fillStyle = '#342b52';
    g.fillRect(10, 10, 108, 236);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    g.strokeRect(10, 10, 108, 236);
    g.fillStyle = '#d6a64e';
    g.fillRect(0, 0, 5, 256);
    g.fillRect(123, 0, 5, 256);
    g.fillStyle = accent;
    g.globalAlpha = 0.5;
    g.beginPath();
    g.moveTo(64, 112);
    g.lineTo(76, 128);
    g.lineTo(64, 144);
    g.lineTo(52, 128);
    g.closePath();
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

function cloudTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    for (let i = 0; i < 70; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 18 + Math.random() * 46;
        for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
            const grd = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
            grd.addColorStop(0, 'rgba(255,255,255,0.22)');
            grd.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = grd;
            g.beginPath();
            g.arc(x + ox, y + oy, r, 0, Math.PI * 2);
            g.fill();
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10);
    return t;
}

/* ── the 3D world ───────────────────────────────────────── */

function usePool(url: string, n: number, scale: number) {
    const { scene } = useGLTF(url);
    return useMemo(() => {
        return Array.from({ length: n }, () => {
            const o = scene.clone(true);
            o.scale.setScalar(scale);
            o.visible = false;
            o.traverse((m) => {
                const mesh = m as THREE.Mesh;
                if (mesh.isMesh) {
                    mesh.castShadow = false;
                    mesh.receiveShadow = false;
                    mesh.frustumCulled = true;
                }
            });
            return o;
        });
    }, [scene, n, scale]);
}

function Road({
    world,
    statusRef,
    accent,
    reduce,
    onTick,
}: {
    world: React.MutableRefObject<World>;
    statusRef: React.MutableRefObject<Status>;
    accent: string;
    reduce: boolean;
    onTick: (w: World, dt: number) => void;
}) {
    const { camera } = useThree();
    const crates = usePool(MODELS.crate, 16, SCALE.crate);
    const bombs = usePool(MODELS.bomb, 10, SCALE.bomb);
    const coins = usePool(MODELS.coin, 44, SCALE.coin);
    const jewels = usePool(MODELS.jewel, 6, SCALE.jewel);
    const hearts = usePool(MODELS.heart, 4, SCALE.heart);
    const springs = usePool(MODELS.spring, 6, SCALE.spring);
    const pillars = usePool(MODELS.pillar, 14, SCALE.pillar);
    const lanterns = usePool(MODELS.lantern, 30, SCALE.lantern);
    const isles = usePool(MODELS.isle, 7, SCALE.isle);
    const pools: Record<Kind, THREE.Object3D[]> = { crate: crates, bomb: bombs, coin: coins, jewel: jewels, heart: hearts, spring: springs, pillar: pillars };

    const tiles = useRef<THREE.InstancedMesh>(null);
    const tileMat = useMemo(() => new THREE.MeshStandardMaterial({ map: stoneTexture(accent), roughness: 0.78, metalness: 0.08 }), [accent]);
    const tileGeo = useMemo(() => new THREE.BoxGeometry(TILE_W, 0.45, ROW - 0.14), []);
    const clouds = useMemo(() => cloudTexture(), []);
    const clouds2 = useMemo(() => {
        const t = cloudTexture();
        t.repeat.set(6, 6);
        return t;
    }, []);
    const sparkleTex = useMemo(() => new THREE.TextureLoader().load(SPRITE_URL.sparkle), []);
    const glowTex = useMemo(() => new THREE.TextureLoader().load(SPRITE_URL.glow), []);
    const sprites = useMemo(
        () =>
            Array.from({ length: 48 }, () => {
                const s = new THREE.Sprite(
                    new THREE.SpriteMaterial({ map: sparkleTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }),
                );
                s.visible = false;
                return s;
            }),
        [sparkleTex],
    );
    const sky = useMemo(
        () =>
            new THREE.ShaderMaterial({
                side: THREE.BackSide,
                depthWrite: false,
                fog: false,
                uniforms: {
                    top: { value: new THREE.Color('#0b0820') },
                    mid: { value: new THREE.Color('#3a2a6e') },
                    horizon: { value: new THREE.Color('#f0b06a') },
                },
                vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; varying vec3 vP;
                    void main(){ float h = vP.y; vec3 c = mix(horizon, mid, smoothstep(-0.04, 0.16, h)); c = mix(c, top, smoothstep(0.16, 0.75, h)); gl_FragColor = vec4(c, 1.0);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                    }`,
            }),
        [],
    );
    const skyRef = useRef<THREE.Mesh>(null);
    const sunRef = useRef<THREE.Sprite>(null);
    const playerRef = useRef<THREE.Group>(null);
    const blobRef = useRef<THREE.Mesh>(null);
    const shieldRef = useRef<THREE.Mesh>(null);
    const cloudRef = useRef<THREE.MeshBasicMaterial>(null);
    const cloud2Ref = useRef<THREE.MeshBasicMaterial>(null);
    const lightRef = useRef<THREE.PointLight>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const camTarget = useMemo(() => new THREE.Vector3(), []);
    const lookAt = useMemo(() => new THREE.Vector3(), []);
    const isleState = useMemo(
        () =>
            isles.map((_, i) => ({
                x: (i % 2 ? 1 : -1) * (16 + Math.random() * 18),
                y: -5 - Math.random() * 6,
                z: -20 - i * 40,
                r: Math.random() * Math.PI,
                s: 0.6 + Math.random() * 0.8,
            })),
        [isles],
    );

    const character = useGameStore((s) => s.character);
    const wear = useMemo(() => wearFromAvatar(character.avatar, accent), [character.avatar, accent]);
    const motion = useRef<VesselMotion>({ speed: 7.2, grounded: true, seated: false, emote: null, emoteAt: 0, talking: false });
    const getMotion = useMemo(() => () => motion.current, []);

    useFrame((_, dtRaw) => {
        const w = world.current;
        const dt = Math.min(0.05, dtRaw);
        if (statusRef.current === 'playing') onTick(w, dt);

        // the vessel's gait follows the road
        const m = motion.current;
        m.grounded = w.grounded || w.dead;
        m.speed = statusRef.current === 'ready' ? 0 : w.dead ? 0 : 7.2 + (w.speed - START_SPEED) * 0.12;

        // road tiles
        const tm = tiles.current;
        if (tm) {
            let n = 0;
            for (const row of w.rows) {
                for (let l = 0; l < 3; l++) {
                    if (row.gap) dummy.scale.setScalar(0);
                    else dummy.scale.setScalar(1);
                    dummy.position.set(LANES[l], -0.225, row.z);
                    dummy.updateMatrix();
                    tm.setMatrixAt(n++, dummy.matrix);
                }
            }
            for (; n < MAX_ROWS * 3; n++) {
                dummy.scale.setScalar(0);
                dummy.updateMatrix();
                tm.setMatrixAt(n, dummy.matrix);
            }
            tm.instanceMatrix.needsUpdate = true;
        }

        // items from the pools
        const used: Record<Kind, number> = { crate: 0, bomb: 0, coin: 0, jewel: 0, heart: 0, spring: 0, pillar: 0 };
        let lan = 0;
        const t = w.time;
        for (const row of w.rows) {
            if (row.lantern && !row.gap && lan + 1 < lanterns.length) {
                for (const side of [-1, 1]) {
                    const o = lanterns[lan++];
                    o.visible = true;
                    o.position.set(side * 3.55, 0, row.z);
                    o.rotation.y = side > 0 ? Math.PI : 0;
                }
            }
            for (const it of row.items) {
                if (it.taken) continue;
                const pool = pools[it.kind];
                const o = pool[used[it.kind]++];
                if (!o) continue;
                o.visible = true;
                o.position.set(LANES[it.lane], it.y, row.z);
                if (it.kind === 'coin') {
                    o.rotation.y = t * 3.2 + row.z * 0.15;
                    o.position.y = it.y - 0.28 + (reduce ? 0 : Math.sin(t * 4 + row.z) * 0.05);
                } else if (it.kind === 'jewel' || it.kind === 'heart') {
                    o.rotation.y = t * 2;
                    o.position.y = it.y - 0.3 + (reduce ? 0 : Math.sin(t * 3) * 0.12);
                } else if (it.kind === 'pillar') {
                    o.rotation.y = row.z * 0.7;
                } else if (it.kind === 'bomb') {
                    o.rotation.y = t * 0.8;
                }
            }
        }
        (Object.keys(pools) as Kind[]).forEach((k) => {
            const pool = pools[k];
            for (let i = used[k]; i < pool.length; i++) pool[i].visible = false;
        });
        for (let i = lan; i < lanterns.length; i++) lanterns[i].visible = false;

        // distant isles drift past slower than the road (parallax)
        const drift = statusRef.current === 'playing' ? w.speed * dt * 0.45 : 0;
        isles.forEach((o, i) => {
            const s = isleState[i];
            s.z += drift;
            if (s.z > 30) {
                s.z -= 280;
                s.x = (i % 2 ? 1 : -1) * (16 + Math.random() * 18);
                s.y = -5 - Math.random() * 6;
            }
            o.visible = true;
            o.position.set(s.x, s.y, s.z);
            o.rotation.y = s.r;
            o.scale.setScalar(s.s);
        });

        // clouds scroll under the road
        if (cloudRef.current?.map && statusRef.current === 'playing') cloudRef.current.map.offset.y += (w.speed * dt) / 80;
        if (cloud2Ref.current?.map && statusRef.current === 'playing') cloud2Ref.current.map.offset.y += (w.speed * dt) / 140;

        // the runner
        const p = playerRef.current;
        if (p) {
            p.position.set(w.x, w.y, 0);
            const lean = (LANES[w.lane] - w.x) * -0.16;
            p.rotation.z = lean;
            p.rotation.x = w.dead ? Math.min(1.2, w.deadT * 3) * -0.6 : 0;
        }
        const over = w.rows.find((r) => Math.abs(r.z) <= ROW / 2);
        if (blobRef.current) {
            const floorUnder = over ? !over.gap : true;
            blobRef.current.visible = floorUnder && w.y > -0.3;
            blobRef.current.position.set(w.x, 0.02, 0);
            const k = Math.max(0.25, 1 - w.y * 0.22);
            blobRef.current.scale.set(k, k, k);
            (blobRef.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * k;
        }
        if (shieldRef.current) {
            shieldRef.current.visible = w.shield || w.invuln > 0;
            shieldRef.current.position.set(w.x, w.y + 0.95, 0);
            const mat = shieldRef.current.material as THREE.MeshStandardMaterial;
            mat.opacity = w.shield ? 0.16 + Math.sin(t * 6) * 0.04 : (Math.sin(t * 30) > 0 ? 0.12 : 0);
        }
        if (lightRef.current) lightRef.current.position.set(w.x, w.y + 2.2, 1.2);

        // particles
        let si = 0;
        for (const pt of w.particles) {
            pt.life += dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.z += pt.vz * dt + (statusRef.current === 'playing' ? w.speed * dt : 0);
            pt.vy -= 9 * dt;
            const s = sprites[si++];
            if (!s) break;
            const a = Math.max(0, 1 - pt.life / pt.max);
            s.visible = a > 0;
            s.position.set(pt.x, pt.y, pt.z);
            s.scale.setScalar(pt.size * (0.6 + a * 0.6));
            const mat = s.material as THREE.SpriteMaterial;
            mat.color.set(pt.color);
            mat.opacity = a;
        }
        for (; si < sprites.length; si++) sprites[si].visible = false;
        w.particles = w.particles.filter((pt) => pt.life < pt.max);

        // camera rides behind and above, wider as the road speeds up
        const shake = reduce ? 0 : w.shake;
        camTarget.set(w.x * 0.55 + (Math.random() - 0.5) * shake, 3.1 + w.y * 0.35 + (Math.random() - 0.5) * shake, 6.4);
        camera.position.lerp(camTarget, 1 - Math.exp(-7 * dt));
        lookAt.set(w.x * 0.35, 1.0 + w.y * 0.25, -8);
        camera.lookAt(lookAt);
        const cam = camera as THREE.PerspectiveCamera;
        const fov = 58 + (w.speed - START_SPEED) * 0.42;
        if (Math.abs(cam.fov - fov) > 0.05) {
            cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
            cam.updateProjectionMatrix();
        }
        w.shake = Math.max(0, w.shake - dt * 1.6);
        if (skyRef.current) skyRef.current.position.copy(camera.position);
        if (sunRef.current) sunRef.current.position.set(camera.position.x * 0.9, 16, -230);
    });

    return (
        <>
            <mesh ref={skyRef} material={sky} renderOrder={-1}>
                <sphereGeometry args={[320, 32, 16]} />
            </mesh>
            <sprite ref={sunRef} scale={[84, 84, 1]}>
                <spriteMaterial map={glowTex} color="#e8a868" opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} transparent />
            </sprite>
            <hemisphereLight args={['#cdbcff', '#2b1d40', 0.95]} />
            <directionalLight position={[-6, 12, 6]} intensity={1.7} color="#ffe0b5" />
            <ambientLight intensity={0.22} />
            <pointLight ref={lightRef} color={accent} intensity={6} distance={7} decay={2} />

            {/* the cloud sea */}
            <mesh position={[0, -13, -80]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[900, 900]} />
                <meshBasicMaterial color="#3b2c66" />
            </mesh>
            <mesh position={[0, -9.5, -80]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[900, 900]} />
                <meshBasicMaterial ref={cloud2Ref} map={clouds2} color="#c7b6ff" transparent opacity={0.5} depthWrite={false} />
            </mesh>
            <mesh position={[0, -6.5, -80]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[900, 900]} />
                <meshBasicMaterial ref={cloudRef} map={clouds} color="#e7dcff" transparent opacity={0.45} depthWrite={false} />
            </mesh>

            <instancedMesh ref={tiles} args={[tileGeo, tileMat, MAX_ROWS * 3]} frustumCulled={false} />
            {[...crates, ...bombs, ...coins, ...jewels, ...hearts, ...springs, ...pillars, ...lanterns, ...isles].map((o) => (
                <primitive key={o.uuid} object={o} />
            ))}
            {sprites.map((s) => (
                <primitive key={s.uuid} object={s} />
            ))}

            <group ref={playerRef}>
                <Vessel
                    wear={wear}
                    motion={getMotion}
                    shadows={false}
                    fallback={
                        <mesh position={[0, 0.9, 0]}>
                            <capsuleGeometry args={[0.32, 1.0, 6, 12]} />
                            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
                        </mesh>
                    }
                />
            </group>
            <mesh ref={blobRef} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.55, 24]} />
                <meshBasicMaterial color="#000" transparent opacity={0.45} depthWrite={false} />
            </mesh>
            <mesh ref={shieldRef} visible={false}>
                <sphereGeometry args={[1.15, 24, 16]} />
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} transparent opacity={0.16} depthWrite={false} />
            </mesh>
        </>
    );
}

if (typeof window !== 'undefined') Object.values(MODELS).forEach((u) => useGLTF.preload(u));

/* ── the game ───────────────────────────────────────────── */

export type AscentResult = { score: number; lines: number; level: number };

const HINTS = [
    { keys: ['A', 'D'], label: 'Lane' },
    { keys: ['Space', 'W'], label: 'Jump' },
    { keys: ['S'], label: 'Slam' },
    { keys: ['P'], label: 'Pause' },
];

export default function AscentGame({
    accent,
    onExit,
    onGameOver,
    onReset,
    submitState = 'idle',
    submitMessage,
    isNewBest,
}: {
    accent: string;
    onExit: () => void;
    onGameOver: (r: AscentResult) => void;
    onReset?: () => void;
    submitState?: 'idle' | 'saving' | 'saved' | 'error';
    submitMessage?: string;
    isNewBest?: boolean;
}) {
    const isKeyboard = useArcadeInputProfile() === 'keyboard';
    const world = useRef<World>(newWorld(Date.now() & 0xffffffff));
    const statusRef = useRef<Status>('ready');
    const propsRef = useRef({ onGameOver, onReset });
    const shown = useRef({ score: -1, coins: -1, stage: -1, shield: false });
    const [status, setStatusState] = useState<Status>('ready');
    const [score, setScore] = useState(0);
    const [coins, setCoins] = useState(0);
    const [stage, setStage] = useState(1);
    const [shield, setShield] = useState(false);
    const [banner, setBanner] = useState<{ text: string; key: number } | null>(null);
    const [muted, setMuted] = useState(false);
    const [reduce, setReduce] = useState(false);
    const [phone, setPhone] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        propsRef.current = { onGameOver, onReset };
    }, [onGameOver, onReset]);
    useEffect(() => {
        setMuted(isArcadeMuted());
        setReduce(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
        setPhone(window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
    }, []);
    useEffect(() => {
        if (!banner) return;
        const t = setTimeout(() => setBanner(null), 1600);
        return () => clearTimeout(t);
    }, [banner]);

    const setStatus = (s: Status) => {
        statusRef.current = s;
        setStatusState(s);
    };

    const burst = (w: World, x: number, y: number, color: string, n: number, spread = 3, size = 0.9) => {
        const count = reduce ? Math.ceil(n / 3) : n;
        for (let i = 0; i < count && w.particles.length < 48; i++) {
            w.particles.push({
                x,
                y,
                z: 0,
                vx: (Math.random() - 0.5) * spread,
                vy: 1.5 + Math.random() * spread,
                vz: (Math.random() - 0.5) * spread,
                life: 0,
                max: 0.45 + Math.random() * 0.35,
                color,
                size,
            });
        }
    };

    /** One simulation step — called from the render loop while playing */
    const tick = (w: World, dt: number) => {
        w.time += dt;
        if (w.dead) {
            w.deadT += dt;
            if (w.y < 0) {
                // went over the edge: keep falling into the clouds
                w.vy -= GRAV * dt;
                w.y += w.vy * dt;
            } else if (w.y > 0) {
                // struck mid-air: drop back onto the road and stay there
                w.vy -= GRAV * dt;
                w.y = Math.max(0, w.y + w.vy * dt);
            }
            if (w.deadT > 0.9 && !w.reported) {
                w.reported = true;
                setStatus('over');
                propsRef.current.onGameOver({ score: scoreOf(w), lines: w.coins, level: w.stage });
            }
            return;
        }

        w.speed = START_SPEED + (MAX_SPEED - START_SPEED) * (1 - Math.exp(-w.dist / 2600));
        const dz = w.speed * dt;
        w.dist += dz;
        for (const r of w.rows) r.z += dz;
        while (w.rows.length && w.rows[0].z > BEHIND) w.rows.shift();
        fill(w);

        // lane glide
        w.x += (LANES[w.lane] - w.x) * (1 - Math.exp(-LANE_RATE * dt));

        // floor under the runner
        const under = w.rows.find((r) => Math.abs(r.z) <= ROW / 2);
        const floor = under ? !under.gap : true;

        w.jumpBuf = Math.max(0, w.jumpBuf - dt);
        if (w.grounded && !floor) {
            w.grounded = false;
            w.coyote = COYOTE;
        }
        w.coyote = Math.max(0, w.coyote - dt);
        if (w.jumpBuf > 0 && (w.grounded || w.coyote > 0)) {
            w.jumpBuf = 0;
            w.coyote = 0;
            w.grounded = false;
            w.vy = JUMP_V;
            asfx.jump();
        }
        if (!w.grounded) {
            w.vy -= GRAV * dt;
            w.y += w.vy * dt;
            if (w.y <= 0 && w.vy <= 0) {
                if (floor) {
                    w.y = 0;
                    w.vy = 0;
                    w.grounded = true;
                } else if (w.y < -0.7) {
                    // over the edge
                    w.dead = true;
                    asfx.crash();
                    w.shake = 0.6;
                    return;
                }
            }
        }

        // what the runner meets this frame
        w.invuln = Math.max(0, w.invuln - dt);
        for (const row of w.rows) {
            const prev = row.z - dz;
            if (row.z < -0.45 || prev > 0.45) continue;
            for (const it of row.items) {
                if (it.taken) continue;
                if (Math.abs(w.x - LANES[it.lane]) > 0.85) continue;
                const body0 = w.y;
                const body1 = w.y + 1.8;
                switch (it.kind) {
                    case 'coin':
                        if (it.y > body0 - 0.3 && it.y < body1 + 0.2) {
                            it.taken = true;
                            w.coins += 1;
                            asfx.coin();
                            burst(w, LANES[it.lane], it.y, '#fcd34d', 5, 2.5, 0.7);
                        }
                        break;
                    case 'jewel':
                        if (it.y > body0 - 0.3 && it.y < body1 + 0.4) {
                            it.taken = true;
                            w.jewels += 1;
                            asfx.shardPickup();
                            burst(w, LANES[it.lane], it.y, '#c084fc', 14, 4, 1.2);
                            setBanner({ text: 'JEWEL  +120', key: Date.now() });
                        }
                        break;
                    case 'heart':
                        if (it.y > body0 - 0.3 && it.y < body1 + 0.3) {
                            it.taken = true;
                            w.shield = true;
                            asfx.shardPickup();
                            burst(w, LANES[it.lane], it.y, '#fb7185', 10, 3, 1);
                            setBanner({ text: 'AEGIS', key: Date.now() });
                        }
                        break;
                    case 'spring':
                        if (body0 < 0.35) {
                            w.vy = SPRING_V;
                            w.grounded = false;
                            w.y = Math.max(w.y, 0.05);
                            asfx.pad();
                            burst(w, LANES[it.lane], 0.3, accent, 8, 3, 1);
                        }
                        break;
                    case 'crate':
                    case 'bomb':
                    case 'pillar': {
                        if (body0 >= HEIGHT[it.kind] - 0.04) break; // cleared it
                        if (w.invuln > 0) break;
                        it.taken = true;
                        if (w.shield) {
                            w.shield = false;
                            w.invuln = 1.2;
                            asfx.shieldBreak();
                            w.shake = 0.35;
                            burst(w, LANES[it.lane], 0.8, '#fb7185', 14, 4, 1.1);
                        } else {
                            w.dead = true;
                            w.vy = Math.max(0, w.vy) * 0.3;
                            asfx.crash();
                            w.shake = 0.7;
                            burst(w, LANES[it.lane], 0.8, it.kind === 'bomb' ? '#f97316' : '#a78bfa', 18, 5, 1.3);
                            return;
                        }
                        break;
                    }
                }
            }
        }

        // stage
        const st = stageFor(w.dist);
        if (st !== w.stage) {
            w.stage = st;
            asfx.tierUp();
            setBanner({ text: STAGES[st - 1].name.toUpperCase(), key: Date.now() });
        }

        // HUD — only on change
        const sc = scoreOf(w);
        if (sc !== shown.current.score) {
            shown.current.score = sc;
            setScore(sc);
        }
        if (w.coins !== shown.current.coins) {
            shown.current.coins = w.coins;
            setCoins(w.coins);
        }
        if (w.stage !== shown.current.stage) {
            shown.current.stage = w.stage;
            setStage(w.stage);
        }
        if (w.shield !== shown.current.shield) {
            shown.current.shield = w.shield;
            setShield(w.shield);
        }
    };

    const start = () => {
        unlockArcadeAudio();
        if (statusRef.current === 'ready') {
            setStatus('playing');
            setBanner({ text: STAGES[0].name.toUpperCase(), key: Date.now() });
        }
    };

    const restart = () => {
        world.current = newWorld((Date.now() ^ (Math.random() * 1e9)) >>> 0);
        shown.current = { score: -1, coins: -1, stage: -1, shield: false };
        setScore(0);
        setCoins(0);
        setStage(1);
        setShield(false);
        setStatus('playing');
        setBanner({ text: STAGES[0].name.toUpperCase(), key: Date.now() });
        propsRef.current.onReset?.();
    };

    const togglePause = () => {
        if (statusRef.current === 'playing') setStatus('paused');
        else if (statusRef.current === 'paused') setStatus('playing');
    };

    // Input — keyboard, swipes, taps. Set up once; reads refs only.
    const actions = useRef({ start, restart, togglePause });
    actions.current = { start, restart, togglePause };
    useEffect(() => {
        const lane = (d: number) => {
            const w = world.current;
            if (statusRef.current !== 'playing' || w.dead) return;
            const next = Math.max(0, Math.min(2, w.lane + d));
            if (next !== w.lane) {
                w.lane = next;
                asfx.move();
            }
        };
        const jump = () => {
            if (statusRef.current === 'ready') return actions.current.start();
            if (statusRef.current !== 'playing') return;
            world.current.jumpBuf = BUFFER;
        };
        const slam = () => {
            const w = world.current;
            if (statusRef.current === 'playing' && !w.grounded && !w.dead) w.vy = Math.min(w.vy, SLAM_V);
        };
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
            switch (e.key) {
                case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); lane(-1); break;
                case 'ArrowRight': case 'd': case 'D': e.preventDefault(); lane(1); break;
                case 'ArrowUp': case 'w': case 'W': case ' ': e.preventDefault(); jump(); break;
                case 'ArrowDown': case 's': case 'S': e.preventDefault(); slam(); break;
                case 'p': case 'P': case 'Escape': e.preventDefault(); actions.current.togglePause(); break;
                case 'Enter':
                    if (statusRef.current === 'ready') actions.current.start();
                    break;
            }
        };
        const el = wrapRef.current;
        let sx = 0, sy = 0, st = 0, tracking = false;
        const onDown = (e: PointerEvent) => {
            if ((e.target as HTMLElement).closest('[data-noboard]')) return;
            tracking = true;
            sx = e.clientX;
            sy = e.clientY;
            st = performance.now();
            unlockArcadeAudio();
        };
        const onUp = (e: PointerEvent) => {
            if (!tracking) return;
            tracking = false;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            const fast = performance.now() - st < 600;
            if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) && fast) lane(dx > 0 ? 1 : -1);
            else if (dy < -28 && fast) jump();
            else if (dy > 28 && fast) slam();
            else if (Math.hypot(dx, dy) < 12) jump();
        };
        const onBlur = () => {
            if (statusRef.current === 'playing') {
                statusRef.current = 'paused';
                setStatusState('paused');
            }
        };
        window.addEventListener('keydown', onKey);
        el?.addEventListener('pointerdown', onDown);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('blur', onBlur);
        document.addEventListener('visibilitychange', onBlur);
        return () => {
            window.removeEventListener('keydown', onKey);
            el?.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('visibilitychange', onBlur);
        };
    }, []);

    const toggleMute = () => {
        const m = !muted;
        setArcadeMuted(m);
        setMuted(m);
    };

    const btn = 'flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/85 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white';

    return (
        <div ref={wrapRef} className="absolute inset-0 z-[60] select-none overflow-hidden bg-[#0b0820]" style={{ touchAction: 'none' }}>
            <Canvas
                dpr={phone ? [1, 1.3] : [1, 1.75]}
                camera={{ fov: 58, near: 0.1, far: 420, position: [0, 3.1, 6.4] }}
                gl={{ antialias: !phone, powerPreference: 'high-performance' }}
                onCreated={({ camera }) => camera.lookAt(0, 1, -8)}
            >
                <fog attach="fog" args={['#4a3576', 40, 175]} />
                <Suspense fallback={null}>
                    <Road world={world} statusRef={statusRef} accent={accent} reduce={reduce} onTick={tick} />
                </Suspense>
            </Canvas>

            {/* HUD */}
            <div
                className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3"
                style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
            >
                <div className="pointer-events-auto flex items-center gap-2" data-noboard>
                    <button type="button" onClick={onExit} className={btn} aria-label="Leave Ascent">
                        <ArrowLeft size={17} />
                    </button>
                </div>
                <div className="text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                    <p className="text-[34px] font-semibold leading-none tracking-tight text-white tabular-nums">{score.toLocaleString()}</p>
                    <div className="mt-1.5 flex items-center justify-center gap-2.5 text-[13px] font-medium text-white/85">
                        <span className="flex items-center gap-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={SPRITE_URL.coin} alt="" className="h-4 w-4" />
                            <span className="tabular-nums">{coins}</span>
                        </span>
                        <span className="text-white/40">·</span>
                        <span>Stage {stage}</span>
                        {shield && (
                            <span className="rounded-full bg-rose-500/30 px-2 py-0.5 text-[11px] text-rose-100">Aegis</span>
                        )}
                    </div>
                </div>
                <div className="pointer-events-auto flex items-center gap-2" data-noboard>
                    <button type="button" onClick={toggleMute} className={btn} aria-label="Mute">
                        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <button type="button" onClick={togglePause} className={btn} aria-label="Pause" disabled={status === 'over' || status === 'ready'}>
                        {status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                </div>
            </div>

            {banner && status === 'playing' && (
                <div key={banner.key} className="pointer-events-none absolute inset-x-0 top-[22%] flex justify-center" style={{ animation: 'ascentBanner 1.6s ease-out forwards' }}>
                    <span className="text-[22px] font-black tracking-[0.3em] text-white" style={{ textShadow: `0 0 18px ${accent}, 0 2px 10px rgba(0,0,0,0.7)` }}>
                        {banner.text}
                    </span>
                </div>
            )}
            <style>{`@keyframes ascentBanner{0%{opacity:0;transform:translateY(8px) scale(.96)}15%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}`}</style>

            {status === 'ready' && (
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/10 to-transparent p-6 pb-[12%]" onClick={() => actions.current.start()}>
                    <div className="text-center">
                        <p className="text-[13px] font-medium text-white/70">Arcade</p>
                        <h2 className="text-[44px] font-black leading-none tracking-tight text-white" style={{ textShadow: `0 0 30px ${accent}` }}>
                            ASCENT
                        </h2>
                        <p className="mx-auto mt-2 max-w-xs text-[14px] leading-snug text-white/75">
                            Run the sky-road. Gather the gold. Go around the shards, over everything else.
                        </p>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                actions.current.start();
                            }}
                            className="mt-5 h-12 rounded-full px-10 text-[15px] font-semibold text-black"
                            style={{ background: accent }}
                        >
                            {isKeyboard ? 'Run  ·  Space' : 'Tap to run'}
                        </button>
                        {isKeyboard ? (
                            <div className="mt-4 flex justify-center">
                                <KeyboardHintBar hints={HINTS} className="py-2 px-3 gap-x-3" />
                            </div>
                        ) : (
                            <p className="mt-4 text-[12.5px] text-white/60">Swipe ← → to change lane · tap or swipe ↑ to jump · swipe ↓ to slam</p>
                        )}
                    </div>
                </div>
            )}

            {status === 'paused' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-noboard>
                    <div className="text-center">
                        <p className="mb-4 text-[28px] font-semibold text-white">Paused</p>
                        <button type="button" onClick={togglePause} className="h-11 rounded-full px-8 text-[14px] font-semibold text-black" style={{ background: accent }}>
                            Resume
                        </button>
                    </div>
                </div>
            )}

            {status === 'over' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" data-noboard>
                    <div className="w-full max-w-xs text-center">
                        <p className="text-[13px] text-white/60">The road ends here</p>
                        <h2 className="mt-1 text-[32px] font-semibold text-white">Run over</h2>
                        {isNewBest && (
                            <p className="mt-1 text-[13px] font-semibold" style={{ color: accent }}>
                                ✦ New personal best
                            </p>
                        )}
                        <div className="my-4 grid grid-cols-3 gap-2">
                            {[
                                ['Score', score.toLocaleString()],
                                ['Coins', String(coins)],
                                ['Stage', String(stage)],
                            ].map(([l, v]) => (
                                <div key={l} className="rounded-xl bg-white/[0.07] py-2">
                                    <p className="text-[11px] text-white/45">{l}</p>
                                    <p className="text-[19px] font-semibold tabular-nums text-white">{v}</p>
                                </div>
                            ))}
                        </div>
                        <p className="mb-4 min-h-[1.2em] text-[12.5px]" style={{ color: submitState === 'error' ? '#f87171' : 'rgba(255,255,255,0.6)' }}>
                            {submitState === 'saving' && 'Recording your run…'}
                            {submitState === 'saved' && (submitMessage || '✦ Recorded on the leaderboard')}
                            {submitState === 'error' && (submitMessage || 'Could not record the run.')}
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={restart} className="h-11 flex-1 rounded-full text-[14px] font-semibold text-black" style={{ background: accent }}>
                                Run again
                            </button>
                            <button type="button" onClick={onExit} className="h-11 flex-1 rounded-full bg-white/[0.1] text-[14px] font-semibold text-white">
                                Leaderboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
