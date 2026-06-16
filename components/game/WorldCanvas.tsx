'use client';

import { useRef, useEffect, useState } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import {
    buildOverworld,
    TILE,
    MAP_W,
    MAP_H,
    GROUND,
    DECOR,
    type POI,
    type POIType,
} from '@/lib/game/overworld';

// ============================================================
//  THE OVERWORLD ENGINE — mobile-first 2D, scrolling camera.
//  One continuous map: Truth's Hut centerpiece, caves, a portal,
//  NPCs, wandering spiritual shades. Touch joystick + WASD.
// ============================================================

const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const SHADE_TILE = { col: 0, row: 3 };

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
    onInteract: (poi: NearPOI) => void;
    onEncounter: () => void;
}

export default function WorldCanvas({ character, onInteract, onEncounter }: WorldCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const nearRef = useRef<NearPOI | null>(null);
    const [near, setNear] = useState<NearPOI | null>(null);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const JOY_R = 46;

    const cbRef = useRef({ onInteract, onEncounter });
    cbRef.current = { onInteract, onEncounter };

    useEffect(() => {
        const canvas = canvasRef.current!;
        let ctx = canvas.getContext('2d')!;
        const ow = buildOverworld();

        const envImg = new Image();
        envImg.src = '/assets/kenney/roguelikeSheet.png';
        const charImg = new Image();
        charImg.src = CHAR_SHEET;
        const truthImg = new Image();
        truthImg.src = '/assets/truth.png';

        // the player's layered avatar, pre-rendered to an offscreen canvas and
        // rebuilt only when the config changes.
        let avatarCanvas = avatarOffscreen(charRef.current.avatar);
        let avatarKey = JSON.stringify(charRef.current.avatar);

        const st = {
            px: (ow.spawn.x + 0.5) * TILE,
            py: (ow.spawn.y + 0.5) * TILE,
            shades: [
                { x: (MAP_W - 9) * TILE, y: (MAP_H - 12) * TILE, vx: 11, vy: 8 },
                { x: 24 * TILE, y: 26 * TILE, vx: -9, vy: 12 },
            ],
            encountered: false,
            t: 0,
        };

        let Z = 2;
        function computeZoom() {
            const vw = canvas.clientWidth;
            const vh = canvas.clientHeight;
            Z = clamp(Math.round(Math.min(vw, vh) / (12 * TILE)), 2, 4);
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
        const SX = (wx: number) => Math.round(wx * Z + ox);
        const SY = (wy: number) => Math.round(wy * Z + oy);

        function envTile(t: { col: number; row: number }, sx: number, sy: number, size: number) {
            ctx.drawImage(envImg, t.col * 17, t.row * 17, 16, 16, sx, sy, size, size);
        }
        function sprite(img: HTMLImageElement, col: number, row: number, wx: number, wy: number, alpha = 1, scale = 1.15) {
            const s = 16 * Z * scale;
            ctx.globalAlpha = alpha;
            ctx.drawImage(img, col * 17, row * 17, 16, 16, SX(wx) - s / 2, SY(wy) - s * 0.74, s, s);
            ctx.globalAlpha = 1;
        }
        // Truth uses his own standalone sprite (not a sheet crop), drawn a touch larger.
        function truthSprite(wx: number, wy: number, alpha = 1, scale = 1.3) {
            const s = 16 * Z * scale;
            ctx.globalAlpha = alpha;
            ctx.drawImage(truthImg, 0, 0, 16, 16, SX(wx) - s / 2, SY(wy) - s * 0.74, s, s);
            ctx.globalAlpha = 1;
        }
        // The player's full-body avatar (16x24), feet anchored near (wx,wy).
        function drawAvatar(wx: number, wy: number, scale = 1.05) {
            const w = 16 * Z * scale;
            const h = 24 * Z * scale;
            ctx.drawImage(avatarCanvas, SX(wx) - w / 2, SY(wy) - h + 5 * Z * scale, w, h);
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

        function drawCave(p: POI) {
            const wx = (p.x + 0.5) * TILE;
            const wy = (p.y + 0.5) * TILE;
            const u = Z;
            const x = SX(wx);
            const y = SY(wy);
            ctx.fillStyle = '#3b3b46';
            ctx.beginPath();
            ctx.ellipse(x, y, 17 * u, 12 * u, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2a2a33';
            ctx.beginPath();
            ctx.ellipse(x, y - 2 * u, 12 * u, 8 * u, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#050509';
            ctx.beginPath();
            ctx.ellipse(x, y + 2 * u, 7 * u, 8 * u, 0, Math.PI, Math.PI * 2);
            ctx.fillRect(x - 7 * u, y + 2 * u, 14 * u, 7 * u);
            ctx.fill();
        }

        function drawPortal(p: POI) {
            const wx = (p.x + 0.5) * TILE;
            const wy = (p.y + 0.5) * TILE;
            const u = Z;
            const x = SX(wx);
            const y = SY(wy);
            const pulse = 0.7 + Math.sin(st.t / 360) * 0.3;
            // stone ring
            ctx.fillStyle = '#2c2c38';
            ctx.beginPath();
            ctx.ellipse(x, y, 14 * u, 16 * u, 0, 0, Math.PI * 2);
            ctx.fill();
            // swirling glow
            const g = ctx.createRadialGradient(x, y - 2 * u, 0, x, y - 2 * u, 12 * u * pulse);
            g.addColorStop(0, 'rgba(168,85,247,0.95)');
            g.addColorStop(0.6, 'rgba(34,211,238,0.5)');
            g.addColorStop(1, 'rgba(34,211,238,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(x, y - 2 * u, 10 * u, 12 * u, 0, 0, Math.PI * 2);
            ctx.fill();
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

        function loop(now: number) {
            if (!running) return;
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
            const mag = Math.hypot(ix, iy);
            if (mag > 1) { ix /= mag; iy /= mag; }

            // move with per-axis collision (feet point)
            const spd = 92;
            const fy = 5; // feet offset
            const nx = st.px + ix * spd * dt;
            if (!solidAt(nx, st.py + fy) && !solidAt(nx, st.py)) st.px = nx;
            const ny = st.py + iy * spd * dt;
            if (!solidAt(st.px, ny + fy) && !solidAt(st.px, ny)) st.py = ny;

            // shades drift + bounce off solids
            for (const sh of st.shades) {
                let sxn = sh.x + sh.vx * dt;
                let syn = sh.y + sh.vy * dt;
                if (solidAt(sxn, sh.y)) sh.vx *= -1; else sh.x = sxn;
                if (solidAt(sh.x, syn)) sh.vy *= -1; else sh.y = syn;
                if (!st.encountered && Math.hypot(sh.x - st.px, sh.y - st.py) < TILE * 0.8) {
                    st.encountered = true;
                    cbRef.current.onEncounter();
                    setTimeout(() => { st.encountered = false; }, 4000);
                }
            }

            // nearest POI
            let found: NearPOI | null = null;
            let bestD = Infinity;
            for (const p of ow.pois) {
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

            // ---- camera ----
            const vw = canvas.clientWidth;
            const vh = canvas.clientHeight;
            const halfW = vw / (2 * Z);
            const halfH = vh / (2 * Z);
            const camX = clamp(st.px, halfW, MAP_W * TILE - halfW);
            const camY = clamp(st.py, halfH, MAP_H * TILE - halfH);
            ox = Math.round(vw / 2 - camX * Z);
            oy = Math.round(vh / 2 - camY * Z);

            // ---- render ----
            ctx.fillStyle = '#0a1410';
            ctx.fillRect(0, 0, vw, vh);

            const size = 16 * Z;
            const c0 = clamp(Math.floor(-ox / size) - 1, 0, MAP_W - 1);
            const c1 = clamp(Math.ceil((vw - ox) / size) + 1, 0, MAP_W - 1);
            const r0 = clamp(Math.floor(-oy / size) - 1, 0, MAP_H - 1);
            const r1 = clamp(Math.ceil((vh - oy) / size) + 1, 0, MAP_H - 1);

            // ground
            for (let r = r0; r <= r1; r++) {
                for (let c = c0; c <= c1; c++) {
                    const g = ow.ground[r][c];
                    const t = g === 1 ? GROUND.dirt : g === 2 ? GROUND.water : GROUND.grass;
                    envTile(t, c * size + ox, r * size + oy, size);
                }
            }
            // decor
            for (let r = r0; r <= r1; r++) {
                for (let c = c0; c <= c1; c++) {
                    const d = ow.decor[r][c];
                    if (!d) continue;
                    envTile(d === 1 ? DECOR.tree : DECOR.bush, c * size + ox, r * size + oy, size);
                }
            }

            // POIs
            for (const p of ow.pois) {
                if (p.type === 'hut') drawHut(p);
                else if (p.type === 'cave') drawCave(p);
                else if (p.type === 'portal') drawPortal(p);
                else if (p.type === 'npc' && p.npcTile) {
                    const wx = (p.x + 0.5) * TILE;
                    const wy = (p.y + 0.9) * TILE;
                    shadow(wx, wy);
                    sprite(charImg, p.npcTile.col, p.npcTile.row, wx, wy);
                    if (p.detail) {
                        ctx.fillStyle = '#fbbf24';
                        ctx.font = `bold ${7 * Z}px serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText('!', SX(wx), SY(wy) - 16 * Z + Math.sin(st.t / 300) * 1.5 * Z);
                    }
                }
            }

            // Truth at the hut door
            const hut = ow.pois.find((p) => p.type === 'hut')!;
            const twx = (hut.x + 0.5) * TILE;
            const twy = (hut.y + 1.7) * TILE + Math.sin(st.t / 600) * 1.2;
            aura(twx, twy, '#fbbf24', 12);
            shadow(twx, twy);
            truthSprite(twx, twy);

            // shades
            for (const sh of st.shades) {
                const fl = 0.4 + Math.sin(st.t / 240 + sh.x) * 0.12;
                aura(sh.x, sh.y, '#22d3ee', 11);
                sprite(charImg, SHADE_TILE.col, SHADE_TILE.row, sh.x, sh.y, fl);
            }

            // player — rebuild the avatar canvas if the look changed, then draw it
            const ap = charRef.current.appearance;
            const curKey = JSON.stringify(charRef.current.avatar);
            if (curKey !== avatarKey) { avatarKey = curKey; avatarCanvas = avatarOffscreen(charRef.current.avatar); }
            shadow(st.px, st.py);
            aura(st.px, st.py, ap.aura, 11);
            drawAvatar(st.px, st.py);

            raf = requestAnimationFrame(loop);
        }

        const tryStart = () => {
            ready += 1;
            if (ready >= 3) {
                last = performance.now();
                raf = requestAnimationFrame(loop);
            }
        };
        if (envImg.complete) tryStart(); else envImg.onload = tryStart;
        if (charImg.complete) tryStart(); else charImg.onload = tryStart;
        if (truthImg.complete) tryStart(); else { truthImg.onload = tryStart; truthImg.onerror = tryStart; }

        const kd = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
        };
    }, []);

    // joystick
    const joyMove = (cx: number, cy: number) => {
        const rect = baseRef.current!.getBoundingClientRect();
        const dx = cx - (rect.left + rect.width / 2);
        const dy = cy - (rect.top + rect.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const m = Math.min(d, JOY_R);
        const a = Math.atan2(dy, dx);
        const kx = Math.cos(a) * m;
        const ky = Math.sin(a) * m;
        setKnob({ x: kx, y: ky });
        joyRef.current = { x: kx / JOY_R, y: ky / JOY_R };
    };
    const joyEnd = () => {
        joyActive.current = false;
        setKnob({ x: 0, y: 0 });
        joyRef.current = { x: 0, y: 0 };
    };
    // Fire interact straight from the tap using the POI the loop keeps current
    // in nearRef — no waiting for the rAF loop to read a flag, so the very
    // first tap after entering the world lands (no more "tap twice").
    const doInteract = () => {
        const n = nearRef.current;
        if (n) cbRef.current.onInteract(n);
    };

    return (
        <>
            <canvas ref={canvasRef} className="world-canvas" />

            {/* on-screen controls — held in a centred phone-width frame so they
                stay thumb-reachable on mobile and don't fly to the far corners
                on wide screens. Both sit at the same height (safe-area aware). */}
            <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[540px] pointer-events-none" style={{ height: 220 }}>
                <div
                    ref={baseRef}
                    onTouchStart={(e) => { joyActive.current = true; const t = e.touches[0]; joyMove(t.clientX, t.clientY); }}
                    onTouchMove={(e) => { e.preventDefault(); if (joyActive.current) { const t = e.touches[0]; joyMove(t.clientX, t.clientY); } }}
                    onTouchEnd={joyEnd}
                    onMouseDown={(e) => { joyActive.current = true; joyMove(e.clientX, e.clientY); }}
                    onMouseMove={(e) => { if (joyActive.current) joyMove(e.clientX, e.clientY); }}
                    onMouseUp={joyEnd}
                    onMouseLeave={joyEnd}
                    className="absolute left-6 rounded-full border border-white/15 bg-black/30 backdrop-blur-md pointer-events-auto"
                    style={{ width: JOY_R * 2, height: JOY_R * 2, bottom: 'calc(1.75rem + env(safe-area-inset-bottom))', boxShadow: 'inset 0 0 18px rgba(0,0,0,0.4)', touchAction: 'none' }}
                >
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: '44%', height: '44%', left: '28%', top: '28%',
                            background: 'rgba(251,191,36,0.6)', border: '1px solid rgba(251,191,36,0.85)',
                            boxShadow: '0 0 12px rgba(251,191,36,0.5)',
                            transform: `translate(${knob.x}px, ${knob.y}px)`,
                        }}
                    />
                </div>

                {near && (
                    <button
                        onClick={doInteract}
                        onTouchStart={(e) => { e.preventDefault(); doInteract(); }}
                        className="absolute right-6 w-[5.5rem] h-[5.5rem] rounded-full text-[10px] font-black uppercase tracking-widest text-black flex flex-col items-center justify-center text-center animate-pulse pointer-events-auto active:scale-95 transition-transform"
                        style={{ bottom: 'calc(1.75rem + env(safe-area-inset-bottom))', background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 28px rgba(251,191,36,0.45)', touchAction: 'none' }}
                    >
                        <span className="text-[8px] opacity-70 leading-none mb-0.5">
                            {near.type === 'hut' ? 'Enter' : near.type === 'cave' ? 'Descend' : near.type === 'portal' ? 'Step through' : 'Speak'}
                        </span>
                        <span className="leading-tight">{near.name}</span>
                    </button>
                )}
            </div>
        </>
    );
}
