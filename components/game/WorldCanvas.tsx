'use client';

import { useRef, useEffect, useState } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { wornAvatar } from '@/lib/game/avatar';
import { truthOffscreen } from '@/lib/game/truth';
import { npcOffscreen, NPC_AVATARS } from '@/lib/game/npcs';
import {
    buildOverworld,
    buildPickups,
    TILE,
    MAP_W,
    MAP_H,
    type POI,
    type POIType,
    type Pickup,
} from '@/lib/game/overworld';
import { allVisiblePois, applyHiddenClears } from '@/lib/game/hiddenPois';
import { unlockAudio } from '@/lib/game/sfx';
import { isHarvested, markHarvested } from '@/lib/game/harvest';
import { initTruthCompanion, updateTruthCompanion, getTruthProximityLine, getTruthWanderLine } from '@/lib/game/truthCompanion';
import { drawWeaponOverlay } from '@/lib/game/weaponVisual';
import { WEAPON_BY_ID } from '@/lib/game/weapons';
import type { QuestWaypoint } from '@/lib/game/questWaypoint';
import { isDestinationPOI, isDestinationUnlocked, isEdenSealed } from '@/lib/game/progression';
import { useInputProfile } from '@/components/game/controls/useInputProfile';
import { useJoystick } from '@/components/game/controls/useJoystick';
import WorldControlPad from '@/components/game/controls/WorldControlPad';
import { joyRadius, MOBILE_JOY_R } from '@/lib/game/controls';
import { loadSettings } from '@/lib/game/settings';
import type { FellowSoul } from '@/lib/game/worldPresence';
import { overworldSkinForShade } from '@/lib/game/wildShades';

const RESONANCE_TINTS = [
    '',
    'rgba(34,211,238,0.06)',
    'rgba(34,211,238,0.10)',
    'rgba(251,191,36,0.08)',
    'rgba(251,191,36,0.12)',
    'rgba(252,211,77,0.18)',
] as const;

// ============================================================
//  THE OVERWORLD ENGINE — mobile-first 2D, scrolling camera.
//  One continuous map: Truth's Hut centerpiece, caves, a portal,
//  NPCs, wandering spiritual shades. Touch joystick + WASD.
// ============================================================

const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const DEFAULT_SHADE_TILE = { col: 0, row: 3 };
const ORE_COLOR = { iron: '#cbd5e1', copper: '#f59e0b', cosmic: '#34d399', health: '#f87171' } as const;

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v;
}

interface NearPOI {
    id: string;
    type: POIType;
    name: string;
    detail?: string;
}

interface WorldCanvasProps {
    character: GameCharacter;
    shadeCount?: number;
    /** Shade aggro radius multiplier (world events). */
    shadeAggroMult?: number;
    paused?: boolean;
    resonanceTier?: number;
    showQuestTrail?: boolean;
    questWaypoint?: QuestWaypoint | null;
    onInteract: (poi: NearPOI) => void;
    onEncounter: () => void;
    onPickup: (p: Pickup) => void;
    onPositionUpdate?: (x: number, y: number) => void;
    onTruthLine?: (line: string) => void;
    /** Other souls who walked today — faint ghosts on the road. */
    fellowSouls?: FellowSoul[];
    /** Hide thumb controls while speech is on screen (mobile) */
    hideControls?: boolean;
}

export default function WorldCanvas({
    character,
    shadeCount = 2,
    shadeAggroMult = 1,
    paused = false,
    resonanceTier = 0,
    showQuestTrail = false,
    questWaypoint = null,
    onInteract,
    onEncounter,
    onPickup,
    onPositionUpdate,
    onTruthLine,
    fellowSouls = [],
    hideControls = false,
}: WorldCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;
    const pausedRef = useRef(paused);
    pausedRef.current = paused;
    // when the loop parks itself under an overlay, this restarts it on unpause
    const resumeRef = useRef<() => void>(() => {});
    useEffect(() => {
        if (!paused) resumeRef.current();
    }, [paused]);

    const profile = useInputProfile();
    const joyR = joyRadius(profile, loadSettings().controlSize === 'large') || MOBILE_JOY_R;
    const joy = useJoystick(joyR);
    const joyRef = joy.joyRef;
    const keysRef = useRef<Set<string>>(new Set());
    const nearRef = useRef<NearPOI | null>(null);
    const [near, setNear] = useState<NearPOI | null>(null);

    const questTrailRef = useRef(showQuestTrail);
    questTrailRef.current = showQuestTrail;
    const waypointRef = useRef(questWaypoint);
    waypointRef.current = questWaypoint;
    const resTierRef = useRef(resonanceTier);
    resTierRef.current = resonanceTier;
    const shadeCountRef = useRef(shadeCount);
    shadeCountRef.current = shadeCount;
    const shadeAggroRef = useRef(shadeAggroMult);
    shadeAggroRef.current = shadeAggroMult;
    const fellowSoulsRef = useRef(fellowSouls);
    fellowSoulsRef.current = fellowSouls;

    const cbRef = useRef({ onInteract, onEncounter, onPickup, onPositionUpdate, onTruthLine });
    cbRef.current = { onInteract, onEncounter, onPickup, onPositionUpdate, onTruthLine };

    useEffect(() => {
        const canvas = canvasRef.current!;
        let ctx = canvas.getContext('2d')!;
        const ow = buildOverworld();
        applyHiddenClears(ow);
        const pickups = buildPickups();
        const justCollected = new Set<string>();
        // honor the OS "reduce motion" preference — ambient bobs, flickers and
        // drifts go still; motion the player initiates (walking) stays.
        const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        // fellows glide toward their latest reported spot instead of teleporting
        const fellowDisplay = new Map<string, { x: number; y: number; step: number }>();

        const charImg = new Image();
        charImg.src = CHAR_SHEET;
        const truthFrame = truthOffscreen(0, 'down');

        // the player's layered avatar — 4 facings × 3 walk frames (idle/L/R
        // step), pre-rendered and rebuilt only when the look changes.
        const DIRS = ['down', 'up', 'left', 'right'] as const;
        type Dir = typeof DIRS[number];
        const buildFrames = (cfg: GameCharacter['avatar']) => {
            const m = {} as Record<Dir, HTMLCanvasElement[]>;
            for (const d of DIRS) m[d] = [avatarOffscreen(cfg, 0, d), avatarOffscreen(cfg, 1, d), avatarOffscreen(cfg, 2, d)];
            return m;
        };
        let avatarFrames = buildFrames(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
        let avatarKey = JSON.stringify(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
        let walkT = 0;
        let facing: Dir = 'down';

        const hutPoi = ow.pois.find((p) => p.type === 'hut')!;
        let truth = initTruthCompanion(hutPoi.x, hutPoi.y);
        let posTick = 0;
        let proxTick = 0;
        let wanderTick = 0;
        // Truth speaks sparingly: a JITTERED global cooldown stops him chattering
        // (and keeps the cadence organic, not metronomic), and each landmark is
        // greeted at most once per session.
        let truthSpeakCd = 14;
        const spokenProx = new Set<string>();
        const TRUTH_FOLLOW_MIN = TILE * 2.2 * 0.6;

        const st = {
            px: (ow.spawn.x + 0.5) * TILE,
            py: (ow.spawn.y + 0.5) * TILE,
            vx: 0,
            vy: 0,
            shades: Array.from({ length: shadeCountRef.current }, (_, i) => {
                const skin = overworldSkinForShade(i);
                return {
                    x: (20 + i * 17) * TILE,
                    y: (24 + i * 11) * TILE,
                    vx: i % 2 === 0 ? 11 : -9,
                    vy: i % 2 === 0 ? 8 : 12,
                    col: skin.col,
                    row: skin.row,
                    aura: skin.aura,
                };
            }),
            encCd: 8,
            t: 0,
        };

        let Z = 2;
        function computeZoom() {
            const vw = canvas.clientWidth;
            const vh = canvas.clientHeight;
            const desktop = vw >= 1024;
            const viewTiles = desktop ? 10 : 12;
            Z = clamp(Math.round(Math.min(vw, vh) / (viewTiles * TILE)), 2, desktop ? 5 : 4);
        }
        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            ctx = canvas.getContext('2d')!;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;
            computeZoom();
        }
        resize();
        window.addEventListener('resize', resize);

        let ox = 0;
        let oy = 0;
        // camera center, persisted across frames for soft follow + deadzone
        let camX = (ow.spawn.x + 0.5) * TILE;
        let camY = (ow.spawn.y + 0.5) * TILE;
        const SX = (wx: number) => Math.round(wx * Z + ox);
        const SY = (wy: number) => Math.round(wy * Z + oy);

        // deterministic per-tile hash (0..1) for terrain texture
        function th(c: number, r: number, s = 0) {
            let x = (c * 374761393 + r * 668265263 + s * 2246822519) | 0;
            x = Math.imul(x ^ (x >>> 13), 1274126177);
            return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
        }
        const GRASS = ['#5d9e41', '#6bb04c', '#549238'];
        const FLOWERS = ['#e85d6a', '#f2c14e', '#7aa6e8', '#e89bd0'];

        // procedural ground: grass with shade variation + speckles + tufts +
        // flowers, dirt with grain, water with a (baked) shimmer highlight.
        function drawGround(g: CanvasRenderingContext2D, c: number, r: number, gv: number, sx: number, sy: number, size: number, t: number) {
            const u = size / 16;
            if (gv === 2) {
                g.fillStyle = '#3f86c9'; g.fillRect(sx, sy, size, size);
                g.fillStyle = '#5ba0db';
                const w = Math.sin(t / 700 + (c + r) * 0.6) * 0.5 + 0.5;
                if (th(c, r, 3) > 0.5) g.fillRect(sx + 3 * u, sy + (3 + w * 2) * u, 5 * u, u);
                if (th(c, r, 5) > 0.6) g.fillRect(sx + 8 * u, sy + (9 - w * 2) * u, 4 * u, u);
                return;
            }
            if (gv === 1) {
                g.fillStyle = '#b58a52'; g.fillRect(sx, sy, size, size);
                for (let k = 0; k < 3; k++) {
                    g.fillStyle = th(c, r, k) > 0.5 ? '#9c7440' : '#c79a5e';
                    g.fillRect(sx + Math.floor(th(c, r, k + 10) * 14) * u, sy + Math.floor(th(c, r, k + 20) * 14) * u, 2 * u, 2 * u);
                }
                return;
            }
            g.fillStyle = GRASS[Math.floor(th(c >> 2, r >> 2, 1) * 3) % 3];
            g.fillRect(sx, sy, size, size);
            for (let k = 0; k < 3; k++) {
                g.fillStyle = th(c, r, k + 7) > 0.5 ? '#46802f' : '#74b855';
                g.fillRect(sx + Math.floor(th(c, r, k + 30) * 15) * u, sy + Math.floor(th(c, r, k + 40) * 15) * u, u, u);
            }
            if (th(c, r, 9) > 0.82) {
                const bx = sx + Math.floor(th(c, r, 11) * 10 + 3) * u, by = sy + Math.floor(th(c, r, 12) * 8 + 5) * u;
                g.fillStyle = '#3f7a2b';
                g.fillRect(bx, by - 2 * u, u, 3 * u); g.fillRect(bx - u, by - u, u, 2 * u); g.fillRect(bx + u, by - u, u, 2 * u);
            }
            if (th(c, r, 13) > 0.93) {
                const fx = sx + Math.floor(th(c, r, 14) * 9 + 4) * u, fy = sy + Math.floor(th(c, r, 15) * 8 + 4) * u;
                g.fillStyle = '#3f7a2b'; g.fillRect(fx, fy, u, 2 * u);
                g.fillStyle = FLOWERS[Math.floor(th(c, r, 16) * FLOWERS.length) % FLOWERS.length];
                g.fillRect(fx - u, fy - u, u, u); g.fillRect(fx + u, fy - u, u, u); g.fillRect(fx, fy - 2 * u, u, u); g.fillRect(fx, fy, u, u);
            }
        }

        function drawTreeAt(g: CanvasRenderingContext2D, sx: number, sy: number, size: number) {
            const u = size / 16, mx = sx + size / 2;
            g.fillStyle = 'rgba(0,0,0,0.16)';
            g.beginPath(); g.ellipse(mx, sy + size - 2 * u, size * 0.4, size * 0.16, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#6e4a28'; g.fillRect(mx - 1.5 * u, sy + size - 6 * u, 3 * u, 5 * u);
            g.fillStyle = '#2e6a30'; g.beginPath(); g.ellipse(mx, sy + 4 * u, size * 0.46, size * 0.44, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#3c8a40'; g.beginPath(); g.ellipse(mx - 1.5 * u, sy + 2 * u, size * 0.34, size * 0.32, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#56a85a'; g.beginPath(); g.ellipse(mx - 2.5 * u, sy + 0.5 * u, size * 0.18, size * 0.16, 0, 0, Math.PI * 2); g.fill();
        }

        function drawBushAt(g: CanvasRenderingContext2D, sx: number, sy: number, size: number) {
            const u = size / 16, mx = sx + size / 2, my = sy + size * 0.62;
            g.fillStyle = 'rgba(0,0,0,0.14)';
            g.beginPath(); g.ellipse(mx, sy + size - 2 * u, size * 0.34, size * 0.13, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#357a39'; g.beginPath(); g.ellipse(mx, my, size * 0.36, size * 0.28, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#479a4d'; g.beginPath(); g.ellipse(mx - 1.5 * u, my - 1.5 * u, size * 0.24, size * 0.18, 0, 0, Math.PI * 2); g.fill();
        }

        // Bake the static world (ground + trees/bushes) ONCE to an offscreen
        // canvas at native tile resolution, then blit it in a single draw call
        // each frame instead of re-painting thousands of tiles. Big mobile win.
        const NATIVE = 16;
        const groundLayer = document.createElement('canvas');
        groundLayer.width = MAP_W * NATIVE;
        groundLayer.height = MAP_H * NATIVE;
        const gctx = groundLayer.getContext('2d')!;
        gctx.imageSmoothingEnabled = false;
        for (let r = 0; r < MAP_H; r++) {
            for (let c = 0; c < MAP_W; c++) {
                drawGround(gctx, c, r, ow.ground[r][c], c * NATIVE, r * NATIVE, NATIVE, 0);
            }
        }
        for (let r = 0; r < MAP_H; r++) {
            for (let c = 0; c < MAP_W; c++) {
                const d = ow.decor[r][c];
                if (!d) continue;
                if (d === 1) drawTreeAt(gctx, c * NATIVE, r * NATIVE, NATIVE);
                else drawBushAt(gctx, c * NATIVE, r * NATIVE, NATIVE);
            }
        }
        function sprite(img: HTMLImageElement, col: number, row: number, wx: number, wy: number, alpha = 1, scale = 1.15) {
            const s = 16 * Z * scale;
            ctx.globalAlpha = alpha;
            ctx.drawImage(img, col * 17, row * 17, 16, 16, SX(wx) - s / 2, SY(wy) - s * 0.74, s, s);
            ctx.globalAlpha = 1;
        }
        // Truth — full-body sage, same anchor as the player avatar.
        function truthSprite(wx: number, wy: number, bob = 0, scale = 1.05) {
            drawAvatar(wx, wy, truthFrame, bob, scale);
        }
        // The player's full-body avatar (16x24), feet anchored near (wx,wy).
        // `bob` lifts the body a pixel on the step beat.
        function drawAvatar(wx: number, wy: number, img: CanvasImageSource, bob = 0, scale = 1.05) {
            const w = 16 * Z * scale;
            const h = 24 * Z * scale;
            ctx.drawImage(img, SX(wx) - w / 2, SY(wy) - h + (5 - bob) * Z * scale, w, h);
        }
        function aura(wx: number, wy: number, color: string, rWorld: number) {
            const x = SX(wx);
            const y = SY(wy) - 6 * Z;
            const r = rWorld * Z;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, color + '66');
            g.addColorStop(1, color + '00');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        function shadow(wx: number, wy: number) {
            ctx.fillStyle = 'rgba(0,0,0,0.32)';
            ctx.beginPath();
            ctx.ellipse(SX(wx), SY(wy) + 3 * Z, 6 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        function drawQuestTrail(wx: number, wy: number, tx: number, ty: number) {
            const dx = tx - wx;
            const dy = ty - wy;
            const dist = Math.hypot(dx, dy) || 1;
            const steps = Math.min(14, Math.floor(dist / (TILE * 1.8)));
            for (let i = 0; i < steps; i++) {
                const t = (i + 0.5) / steps + (reduceMotion ? 0 : Math.sin(st.t / 400 + i) * 0.04);
                const px = wx + dx * t;
                const py = wy + dy * t;
                const alpha = reduceMotion ? 0.45 : 0.35 + Math.sin(st.t / 300 + i * 0.8) * 0.25;
                ctx.fillStyle = `rgba(251,191,36,${alpha})`;
                ctx.beginPath();
                ctx.arc(SX(px), SY(py) - 8 * Z, 2.2 * Z, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // a floating essence mote (loot) — gem that bobs over a soft glow
        function drawPickup(wx: number, wy: number, color: string) {
            const bob = reduceMotion ? 0 : Math.sin(st.t / 380 + wx * 0.05) * 2;
            aura(wx, wy, color, 7);
            const x = SX(wx);
            const y = SY(wy) + bob;
            const s = 2.4 * Z;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.8, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.8, y); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(x - 0.5 * Z, y - 1.1 * Z, Z, Z);
        }

        function drawHut(p: POI) {
            const wx = (p.x + 0.5) * TILE;
            const wy = (p.y + 0.5) * TILE;
            const u = Z;
            const hx = SX(wx);
            const hy = SY(wy);
            aura(wx, wy, '#fbbf24', 30);
            // walls
            ctx.fillStyle = '#5d4427';
            ctx.fillRect(hx - 22 * u, hy - 6 * u, 44 * u, 26 * u);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(hx - 22 * u, hy + 14 * u, 44 * u, 6 * u);
            // roof
            ctx.fillStyle = '#33240f';
            ctx.beginPath();
            ctx.moveTo(hx - 28 * u, hy - 5 * u);
            ctx.lineTo(hx + 28 * u, hy - 5 * u);
            ctx.lineTo(hx, hy - 30 * u);
            ctx.closePath();
            ctx.fill();
            // golden eye on the roof
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.ellipse(hx, hy - 13 * u, 3 * u, 2 * u, 0, 0, Math.PI * 2);
            ctx.fill();
            // glowing doorway
            const dg = ctx.createLinearGradient(hx, hy - 2 * u, hx, hy + 20 * u);
            dg.addColorStop(0, '#fcd34d');
            dg.addColorStop(1, '#b45309');
            ctx.fillStyle = dg;
            ctx.fillRect(hx - 7 * u, hy + 2 * u, 14 * u, 18 * u);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(hx - 7 * u, hy + 2 * u, 14 * u, 2 * u);
        }

        function drawCave(p: POI, locked = false) {
            const wx = (p.x + 0.5) * TILE;
            const wy = (p.y + 0.5) * TILE;
            const u = Z;
            const x = SX(wx);
            const y = SY(wy);
            ctx.fillStyle = locked ? '#2a2a30' : '#3b3b46';
            ctx.beginPath();
            ctx.ellipse(x, y, 17 * u, 12 * u, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = locked ? '#1f1f26' : '#2a2a33';
            ctx.beginPath();
            ctx.ellipse(x, y - 2 * u, 12 * u, 8 * u, 0, 0, Math.PI * 2);
            ctx.fill();
            if (locked) {
                ctx.strokeStyle = 'rgba(251,191,36,0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - 8 * u, y - 6 * u);
                ctx.lineTo(x + 8 * u, y + 6 * u);
                ctx.moveTo(x + 8 * u, y - 6 * u);
                ctx.lineTo(x - 8 * u, y + 6 * u);
                ctx.stroke();
            } else {
                ctx.fillStyle = '#050509';
                ctx.beginPath();
                ctx.ellipse(x, y + 2 * u, 7 * u, 8 * u, 0, Math.PI, Math.PI * 2);
                ctx.fillRect(x - 7 * u, y + 2 * u, 14 * u, 7 * u);
                ctx.fill();
            }
        }

        function drawPortal(p: POI, locked = false) {
            const wx = (p.x + 0.5) * TILE;
            const wy = (p.y + 0.5) * TILE;
            const u = Z;
            const x = SX(wx);
            const y = SY(wy);
            const pulse = locked ? 0.35 : 0.7 + Math.sin(st.t / 360) * 0.3;
            ctx.fillStyle = locked ? '#1a1a22' : '#2c2c38';
            ctx.beginPath();
            ctx.ellipse(x, y, 14 * u, 16 * u, 0, 0, Math.PI * 2);
            ctx.fill();
            if (locked) {
                ctx.strokeStyle = 'rgba(251,191,36,0.45)';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.ellipse(x, y - 2 * u, 11 * u, 13 * u, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#fbbf24';
                ctx.font = `bold ${8 * u}px serif`;
                ctx.textAlign = 'center';
                ctx.fillText('✦', x, y - 4 * u);
            } else {
                const g = ctx.createRadialGradient(x, y - 2 * u, 0, x, y - 2 * u, 12 * u * pulse);
                g.addColorStop(0, 'rgba(168,85,247,0.95)');
                g.addColorStop(0.6, 'rgba(34,211,238,0.5)');
                g.addColorStop(1, 'rgba(34,211,238,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(x, y - 2 * u, 10 * u, 12 * u, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function solidAt(wx: number, wy: number) {
            const c = Math.floor(wx / TILE);
            const r = Math.floor(wy / TILE);
            if (c < 0 || r < 0 || c >= MAP_W || r >= MAP_H) return true;
            return ow.solid[r][c];
        }

        let raf = 0;
        let last = performance.now();
        let running = true;
        let ready = 0;
        let parked = false;
        resumeRef.current = () => {
            if (!running || !parked) return;
            parked = false;
            last = performance.now();
            raf = requestAnimationFrame(loop);
        };

        function loop(now: number) {
            if (!running) return;
            // an overlay (Hut, satchel, combat, dialogue…) is open — PARK the
            // loop entirely (no idle rAF churn, saves battery); the paused-prop
            // effect calls resumeRef to restart it the moment the world resumes.
            if (pausedRef.current) { parked = true; return; }
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            st.t = now;

            // input
            let ix = joyRef.current.x;
            let iy = joyRef.current.y;
            const k = keysRef.current;
            if (k.has('arrowleft') || k.has('a')) ix = -1;
            if (k.has('arrowright') || k.has('d')) ix = 1;
            if (k.has('arrowup') || k.has('w')) iy = -1;
            if (k.has('arrowdown') || k.has('s')) iy = 1;
            const inputMag = Math.hypot(ix, iy);
            if (inputMag > 1) { ix /= inputMag; iy /= inputMag; }
            const hasInput = Math.hypot(ix, iy) > 0.12;
            if (hasInput) facing = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');

            // smoothed velocity — ramp toward the target so starts/stops glide
            // instead of snapping (frame-rate-independent, ~80ms to full speed).
            const spd = 92;
            const accelK = Math.min(1, dt * 12);
            st.vx += (ix * spd - st.vx) * accelK;
            st.vy += (iy * spd - st.vy) * accelK;
            const speedMag = Math.hypot(st.vx, st.vy);
            const moving = speedMag > 6;
            // couple leg cadence to actual speed so a half-push doesn't moonwalk
            walkT += moving ? (speedMag / spd) * dt : 0;

            // move with per-axis collision (feet point); zero the blocked axis'
            // velocity so it doesn't keep building up against a wall.
            const fy = 5; // feet offset
            const nx = st.px + st.vx * dt;
            if (!solidAt(nx, st.py + fy) && !solidAt(nx, st.py)) st.px = nx; else st.vx = 0;
            const ny = st.py + st.vy * dt;
            if (!solidAt(st.px, ny + fy) && !solidAt(st.px, ny)) st.py = ny; else st.vy = 0;

            // shades — drift idly, but HOME IN when you stray near (slower than
            // you, so you can still flee). Brushing one drags you into a fight;
            // it then scatters far so you aren't re-caught the instant you return.
            st.encCd = Math.max(0, st.encCd - dt);

            const targetShades = shadeCountRef.current;
            while (st.shades.length < targetShades) {
                const i = st.shades.length;
                const skin = overworldSkinForShade(i);
                st.shades.push({
                    x: (12 + i * 19) * TILE,
                    y: (18 + i * 13) * TILE,
                    vx: i % 2 === 0 ? 11 : -9,
                    vy: i % 2 === 0 ? 8 : 12,
                    col: skin.col,
                    row: skin.row,
                    aura: skin.aura,
                });
            }
            while (st.shades.length > targetShades) st.shades.pop();

            const aggroTiles = TILE * 3.5 * shadeAggroRef.current;
            for (const sh of st.shades) {
                const dxp = st.px - sh.x, dyp = st.py - sh.y;
                const dp = Math.hypot(dxp, dyp) || 1;
                const aggro = dp < aggroTiles;
                const mvx = aggro ? (dxp / dp) * 30 : sh.vx;
                const mvy = aggro ? (dyp / dp) * 30 : sh.vy;
                const sxn = sh.x + mvx * dt;
                const syn = sh.y + mvy * dt;
                if (!solidAt(sxn, sh.y)) sh.x = sxn; else if (!aggro) sh.vx *= -1;
                if (!solidAt(sh.x, syn)) sh.y = syn; else if (!aggro) sh.vy *= -1;
                if (st.encCd <= 0 && dp < TILE * 0.75) {
                    st.encCd = 35;
                    cbRef.current.onEncounter();
                    sh.x = (8 + Math.floor(Math.random() * (MAP_W - 16))) * TILE;
                    sh.y = (8 + Math.floor(Math.random() * (MAP_H - 16))) * TILE;
                }
            }

            // gather essence motes you walk over (daily-scoped: harvested motes
            // refill on the next UTC day so roaming keeps paying out)
            for (const pk of pickups) {
                if (justCollected.has(pk.id) || isHarvested(pk.id)) continue;
                const pwx = (pk.x + 0.5) * TILE, pwy = (pk.y + 0.5) * TILE;
                if (Math.hypot(pwx - st.px, pwy - st.py) < TILE * 0.7) {
                    justCollected.add(pk.id);
                    markHarvested(pk.id);
                    cbRef.current.onPickup(pk);
                }
            }

            // nearest POI
            let found: NearPOI | null = null;
            let bestD = Infinity;
            const pois = allVisiblePois(ow.pois, charRef.current);
            for (const p of pois) {
                const pwx = (p.x + 0.5) * TILE;
                const pwy = (p.y + (p.type === 'hut' ? 1.2 : 0.5)) * TILE;
                const d = Math.hypot(pwx - st.px, pwy - st.py);
                const rad = p.type === 'hut' ? TILE * 2.6 : TILE * 1.7;
                if (d < rad && d < bestD) {
                    bestD = d;
                    found = { id: p.id, type: p.type, name: p.name, detail: p.detail };
                }
            }
            if (found?.id !== nearRef.current?.id) {
                nearRef.current = found;
                setNear(found);
            }

            truth = updateTruthCompanion(truth, st.px, st.py, dt, solidAt);

            posTick += dt;
            if (posTick >= 0.1) {
                posTick = 0;
                cbRef.current.onPositionUpdate?.(st.px, st.py);
            }

            truthSpeakCd = Math.max(0, truthSpeakCd - dt);

            proxTick += dt;
            if (proxTick >= 4 && truthSpeakCd <= 0 && cbRef.current.onTruthLine) {
                proxTick = 0;
                let proxPoi: POI | null = null;
                let proxD = Infinity;
                for (const p of allVisiblePois(ow.pois, charRef.current)) {
                    if (spokenProx.has(p.id)) continue;
                    const pwx = (p.x + 0.5) * TILE;
                    const pwy = (p.y + 0.5) * TILE;
                    const d = Math.hypot(pwx - st.px, pwy - st.py);
                    if (d < TILE * 3 && d < proxD && getTruthProximityLine(p.id, charRef.current)) {
                        proxD = d;
                        proxPoi = p;
                    }
                }
                if (proxPoi) {
                    spokenProx.add(proxPoi.id);
                    const line = getTruthProximityLine(proxPoi.id, charRef.current);
                    if (line) { cbRef.current.onTruthLine(line); truthSpeakCd = 55 + Math.random() * 50; }
                }
            }

            wanderTick += dt;
            if (wanderTick >= 90 && truthSpeakCd <= 0 && cbRef.current.onTruthLine) {
                wanderTick = 0;
                const trailDist = Math.hypot(st.px - truth.x, st.py - truth.y);
                // Stay silent some of the time so the wandering voice feels organic
                // rather than firing like clockwork the instant the timer is up.
                if (trailDist >= TRUTH_FOLLOW_MIN && Math.random() < 0.6) {
                    cbRef.current.onTruthLine(getTruthWanderLine(charRef.current));
                    truthSpeakCd = 55 + Math.random() * 50;
                } else {
                    truthSpeakCd = 12 + Math.random() * 12; // brief quiet, then reconsider
                }
            }

            // ---- camera ---- soft follow with a small deadzone so micro-steps
            // and direction changes don't drag the whole world (cuts the jolt on
            // the tight mobile view)
            const vw = canvas.clientWidth;
            const vh = canvas.clientHeight;
            const halfW = vw / (2 * Z);
            const halfH = vh / (2 * Z);
            const dz = TILE * 1.4;
            let tcx = camX;
            let tcy = camY;
            if (st.px > camX + dz) tcx = st.px - dz; else if (st.px < camX - dz) tcx = st.px + dz;
            if (st.py > camY + dz) tcy = st.py - dz; else if (st.py < camY - dz) tcy = st.py + dz;
            const camK = Math.min(1, dt * 6);
            camX += (tcx - camX) * camK;
            camY += (tcy - camY) * camK;
            camX = clamp(camX, halfW, MAP_W * TILE - halfW);
            camY = clamp(camY, halfH, MAP_H * TILE - halfH);
            ox = Math.round(vw / 2 - camX * Z);
            oy = Math.round(vh / 2 - camY * Z);

            // ---- render ----
            ctx.fillStyle = '#0a1410';
            ctx.fillRect(0, 0, vw, vh);

            // static world (ground + trees/bushes) — baked once, blitted in a
            // single scaled draw call (the GPU clips the off-screen remainder).
            ctx.drawImage(groundLayer, 0, 0, groundLayer.width, groundLayer.height, ox, oy, groundLayer.width * Z, groundLayer.height * Z);

            // essence motes (loot) — drawn over the ground, under the actors
            for (const pk of pickups) {
                if (justCollected.has(pk.id) || isHarvested(pk.id)) continue;
                drawPickup((pk.x + 0.5) * TILE, (pk.y + 0.5) * TILE, ORE_COLOR[pk.kind]);
            }

            // POIs (includes Seer-hidden places when attuned)
            const drawPois = allVisiblePois(ow.pois, charRef.current);
            for (const p of drawPois) {
                const locked = (p.id === 'dest_eden' && isEdenSealed())
                    || (isDestinationPOI(p.id) && !isDestinationUnlocked(p.id, charRef.current));
                if (p.type === 'hut') drawHut(p);
                else if (p.type === 'cave') drawCave(p, locked);
                else if (p.type === 'portal') drawPortal(p, locked);
                else if (p.type === 'npc' && (NPC_AVATARS[p.id] || p.npcTile)) {
                    const wx = (p.x + 0.5) * TILE;
                    const wy = (p.y + 0.9) * TILE;
                    shadow(wx, wy);
                    if (NPC_AVATARS[p.id]) drawAvatar(wx, wy, npcOffscreen(p.id), 0, 1.05);
                    else sprite(charImg, p.npcTile!.col, p.npcTile!.row, wx, wy);
                    if (p.detail) {
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = `bold ${7 * Z}px serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('!', SX(wx), SY(wy) - 16 * Z + Math.sin(st.t / 300) * 1.5 * Z);
                    }
                }
            }

            // quest trail — golden motes toward active mission
            const wp = waypointRef.current;
            if (questTrailRef.current && wp) {
                drawQuestTrail(st.px, st.py, wp.worldX, wp.worldY);
            }

            // Truth companion — follows the player from the Hut
            const truthBob = reduceMotion ? 0 : Math.sin(st.t / 600) * 0.6;
            aura(truth.x, truth.y, '#fbbf24', 12);
            shadow(truth.x, truth.y);
            truthSprite(truth.x, truth.y, truthBob);

            // shades — varied skins drift the cavern
            for (const sh of st.shades) {
                const fl = reduceMotion ? 0.46 : 0.4 + Math.sin(st.t / 240 + sh.x) * 0.12;
                aura(sh.x, sh.y, sh.aura ?? '#22d3ee', 11);
                sprite(charImg, sh.col ?? DEFAULT_SHADE_TILE.col, sh.row ?? DEFAULT_SHADE_TILE.row, sh.x, sh.y, fl);
            }

            // fellow souls — faint walkers who roamed today. Presence only
            // refreshes every ~90s, so each soul GLIDES toward its latest spot
            // with a step cadence instead of teleporting like a pinned statue.
            for (const f of fellowSoulsRef.current) {
                let dp = fellowDisplay.get(f.id);
                if (!dp) { dp = { x: f.x, y: f.y, step: 0 }; fellowDisplay.set(f.id, dp); }
                const ddx = f.x - dp.x;
                const ddy = f.y - dp.y;
                const dd = Math.hypot(ddx, ddy);
                const walking = dd > 1.5;
                if (dd > TILE * 14) { dp.x = f.x; dp.y = f.y; }
                else if (walking) {
                    const wSpd = Math.min(46, 12 + dd * 0.35);
                    dp.x += (ddx / dd) * wSpd * dt;
                    dp.y += (ddy / dd) * wSpd * dt;
                    dp.step += dt * 7;
                }
                const bob = reduceMotion ? 0 : walking ? (Math.floor(dp.step) % 2) : Math.sin(st.t / 520 + f.x * 0.02) * 0.8;
                const ghostX = dp.x + (reduceMotion || walking ? 0 : Math.sin(st.t / 900 + f.y * 0.01) * 2);
                const ghostY = dp.y + bob;
                aura(ghostX, ghostY, f.pathColor || f.aura, 10);
                shadow(ghostX, ghostY);
                sprite(charImg, f.bodyCol, f.bodyRow, ghostX, ghostY, 0.38);
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.font = `bold ${6 * Z}px serif`;
                ctx.textAlign = 'center';
                ctx.fillText(f.name, SX(ghostX), SY(ghostY) - 18 * Z);
            }
            if (fellowDisplay.size > fellowSoulsRef.current.length + 4) {
                const live = new Set(fellowSoulsRef.current.map((f) => f.id));
                for (const key of Array.from(fellowDisplay.keys())) if (!live.has(key)) fellowDisplay.delete(key);
            }

            // player — rebuild the avatar frames if the look changed, then draw
            // the right walk frame (idle when still)
            const ap = charRef.current.appearance;
            const curKey = JSON.stringify(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
            if (curKey !== avatarKey) { avatarKey = curKey; avatarFrames = buildFrames(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing)); }
            shadow(st.px, st.py);
            aura(st.px, st.py, ap.aura, 11);
            const wphase = Math.floor(walkT * 7) % 2;
            const dirFrames = avatarFrames[facing];
            const bob = moving && wphase === 0 ? 1 : 0;
            const pScale = 1.05;
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            drawAvatar(st.px, st.py, wframe, bob, pScale);

            const eqId = charRef.current.equipped.weapon;
            const wKind = eqId ? WEAPON_BY_ID[eqId]?.kind : null;
            if (wKind) {
                const pw = 16 * Z * pScale;
                const ph = 24 * Z * pScale;
                drawWeaponOverlay(ctx, wKind, facing, SX(st.px) - pw / 2, SY(st.py) - ph + (5 - bob) * Z * pScale, Z * pScale);
            }

            const tier = Math.min(5, Math.max(0, resTierRef.current));
            const tint = RESONANCE_TINTS[tier];
            if (tint) {
                ctx.fillStyle = tint;
                ctx.fillRect(0, 0, vw, vh);
            }

            raf = requestAnimationFrame(loop);
        }

        const tryStart = () => {
            ready += 1;
            if (ready >= 2) {
                last = performance.now();
                raf = requestAnimationFrame(loop);
            }
        };
        tryStart(); // Truth is procedurally drawn — no image load needed
        if (charImg.complete) tryStart(); else { charImg.onload = tryStart; charImg.onerror = tryStart; }

        const kd = (e: KeyboardEvent) => {
            keysRef.current.add(e.key.toLowerCase());
            if ((e.key === 'e' || e.key === 'Enter') && nearRef.current) {
                cbRef.current.onInteract(nearRef.current);
            }
        };
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        // drop all held keys when focus is lost / tab hidden, else a missed
        // keyup leaves the avatar walking on its own after alt-tab
        const clearKeys = () => keysRef.current.clear();
        const onVisibility = () => { if (document.hidden) keysRef.current.clear(); };
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        window.addEventListener('blur', clearKeys);
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
            window.removeEventListener('blur', clearKeys);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    // Fire interact straight from the tap using the POI the loop keeps current
    // in nearRef — no waiting for the rAF loop to read a flag, so the very
    // first tap after entering the world lands (no more "tap twice").
    const doInteract = () => {
        const n = nearRef.current;
        if (n) cbRef.current.onInteract(n);
    };

    return (
        <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full world-canvas" />
            {!hideControls && (
                <WorldControlPad profile={profile} joy={joy} joyRadius={joyR} near={near} onInteract={doInteract} />
            )}
        </>
    );
}
