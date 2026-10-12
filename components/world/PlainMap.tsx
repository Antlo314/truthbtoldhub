'use client';

/**
 * The map of the plain — painted once from the same ground colours the
 * terrain uses, then marked: roads, landmarks you have found, the souls
 * with something for you, live players, and you. A small corner version
 * rides the HUD on desktop; M or the Map button opens the full sheet.
 */
import { useEffect, useRef, useState } from 'react';
import { getWalkerPose } from '@/components/truthos/house/walkerPose';
import { groundColor, ISLAND_C, ISLAND_R, LANDMARKS, ROADS } from '@/lib/world/terrain';
import { CAIRNS, NPCS, type NpcId } from '@/lib/world/plain';
import type { HousePeer } from '@/lib/truthos/housePresence';
import type { WorldProgress } from '@/lib/world/quests';
import { npcPosition, type NpcMarker } from './Npcs';

const SPAN = ISLAND_R * 2 + 20;
const X0 = ISLAND_C.x - SPAN / 2;
const Z0 = ISLAND_C.z - SPAN / 2;

let painted: HTMLCanvasElement | null = null;

/** The island's ground, painted at 4 m a pixel. Built once per page, off the first frame. */
function paintBase(): HTMLCanvasElement {
    if (painted) return painted;
    const n = 210;
    const c = document.createElement('canvas');
    c.width = n;
    c.height = n;
    const g = c.getContext('2d')!;
    const img = g.createImageData(n, n);
    const col: [number, number, number] = [0, 0, 0];
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const x = X0 + (i / n) * SPAN;
            const z = Z0 + (j / n) * SPAN;
            const k = (j * n + i) * 4;
            if (Math.hypot(x - ISLAND_C.x, z - ISLAND_C.z) > ISLAND_R - 6) {
                img.data[k + 3] = 0;
                continue;
            }
            groundColor(x, z, col);
            // linear → display, with a lift so the map reads
            img.data[k] = Math.min(255, Math.pow(col[0], 1 / 2.2) * 255 * 1.05);
            img.data[k + 1] = Math.min(255, Math.pow(col[1], 1 / 2.2) * 255 * 1.05);
            img.data[k + 2] = Math.min(255, Math.pow(col[2], 1 / 2.2) * 255 * 1.05);
            img.data[k + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    painted = c;
    return c;
}

function draw(
    cv: HTMLCanvasElement,
    opts: { world: WorldProgress; markers: Partial<Record<NpcId, NpcMarker>>; peers: HousePeer[]; full: boolean },
) {
    const g = cv.getContext('2d');
    if (!g) return;
    const W = cv.width;
    const H = cv.height;
    const p = getWalkerPose();
    // full: whole island; corner: 220 m around you, north up
    const span = opts.full ? SPAN : 240;
    const cx = opts.full ? ISLAND_C.x : p.x;
    const cz = opts.full ? ISLAND_C.z : p.z;
    const s = W / span;
    const tx = (x: number) => (x - cx) * s + W / 2;
    const tz = (z: number) => (z - cz) * s + H / 2;
    g.clearRect(0, 0, W, H);
    g.save();
    if (!opts.full) {
        g.beginPath();
        g.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2);
        g.clip();
        g.fillStyle = '#1b1624';
        g.fillRect(0, 0, W, H);
    }
    const base = painted;
    if (base) {
        g.imageSmoothingEnabled = true;
        g.drawImage(base, tx(X0), tz(Z0), SPAN * s, SPAN * s);
    }
    // roads
    g.strokeStyle = 'rgba(214,190,150,0.75)';
    g.lineWidth = Math.max(1.2, 3.2 * s * 1.3);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const r of ROADS) {
        g.beginPath();
        r.forEach(([x, z], i) => (i ? g.lineTo(tx(x), tz(z)) : g.moveTo(tx(x), tz(z))));
        g.stroke();
    }
    // the Lair
    g.fillStyle = '#2a2236';
    g.strokeStyle = '#f5d48a';
    g.lineWidth = 1;
    g.fillRect(tx(-17), tz(-17), 34 * s, 34 * s);
    g.fillRect(tx(-6.2), tz(16), 12.4 * s, 47 * s);
    g.fillRect(tx(-27), tz(20), 54 * s, 35 * s);
    // landmarks found
    g.font = `${opts.full ? 11 : 9}px ui-sans-serif, system-ui`;
    g.textAlign = 'center';
    for (const l of LANDMARKS) {
        if (l.id === 'cairns' || l.id === 'rise' || l.id === 'lake' || l.id === 'fields' || l.id === 'hollow') {
            if (!opts.full) continue;
        }
        const found = opts.world.found.includes(l.id);
        const x = tx(l.x);
        const z = tz(l.z);
        g.fillStyle = found ? '#fde68a' : 'rgba(255,255,255,0.35)';
        g.beginPath();
        g.arc(x, z, found ? 3 : 2, 0, Math.PI * 2);
        g.fill();
        if (opts.full) {
            g.fillStyle = found ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.45)';
            g.fillText(found ? l.name : '?', x, z - 7);
        }
    }
    for (const c of CAIRNS) {
        const seen = opts.world.found.includes(c.id);
        g.fillStyle = seen ? '#a7f3d0' : 'rgba(255,255,255,0.3)';
        g.fillRect(tx(c.x) - 2, tz(c.z) - 2, 4, 4);
    }
    // souls with business
    for (const n of NPCS) {
        const m = opts.markers[n.id];
        const pos = npcPosition(n.id);
        const x = tx(pos.x);
        const z = tz(pos.z);
        g.fillStyle = m === 'offer' ? '#fbbf24' : m === 'turnin' ? '#34d399' : 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.arc(x, z, m ? 4 : 2.2, 0, Math.PI * 2);
        g.fill();
        if (m) {
            g.fillStyle = '#000';
            g.font = 'bold 7px ui-sans-serif';
            g.fillText(m === 'offer' ? '!' : '?', x, z + 2.5);
            g.font = `${opts.full ? 11 : 9}px ui-sans-serif, system-ui`;
        }
    }
    // live souls
    for (const peer of opts.peers) {
        g.fillStyle = peer.aura || '#a78bfa';
        g.beginPath();
        g.arc(tx(peer.x), tz(peer.z), 3.2, 0, Math.PI * 2);
        g.fill();
        if (opts.full) {
            g.fillStyle = 'rgba(255,255,255,0.8)';
            g.fillText(peer.name, tx(peer.x), tz(peer.z) - 6);
        }
    }
    // you: an arrow
    const facing = Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw));
    g.save();
    g.translate(tx(p.x), tz(p.z));
    g.rotate(-facing + Math.PI);
    g.fillStyle = '#fff';
    g.strokeStyle = '#000';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 5);
    g.lineTo(0, 2.5);
    g.lineTo(-5, 5);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    g.restore();
    if (!opts.full) {
        g.strokeStyle = 'rgba(255,255,255,0.18)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.font = 'bold 9px ui-sans-serif';
        g.fillText('N', W / 2, 11);
    }
}

export function MiniMap({ world, markers, peers, visible }: { world: WorldProgress; markers: Partial<Record<NpcId, NpcMarker>>; peers: HousePeer[]; visible: boolean }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const optsRef = useRef({ world, markers, peers });
    optsRef.current = { world, markers, peers };
    useEffect(() => {
        if (!visible) return;
        let raf = 0;
        let last = 0;
        const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
        if (idle) idle(() => paintBase(), { timeout: 2500 });
        else window.setTimeout(() => paintBase(), 600);
        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            if (t - last < 140) return;
            last = t;
            if (ref.current) draw(ref.current, { ...optsRef.current, full: false });
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [visible]);
    if (!visible) return null;
    return (
        <canvas
            ref={ref}
            width={150}
            height={150}
            className="pointer-events-none fixed right-3 z-[44] h-[150px] w-[150px] rounded-full shadow-2xl"
            style={{ top: 'calc(9.4rem + env(safe-area-inset-top, 0px))' }}
        />
    );
}

export function FullMap({ open, onClose, world, markers, peers }: { open: boolean; onClose: () => void; world: WorldProgress; markers: Partial<Record<NpcId, NpcMarker>>; peers: HousePeer[] }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState(600);
    useEffect(() => {
        if (!open) return;
        const sync = () => setSize(Math.floor(Math.min(window.innerWidth - 32, window.innerHeight - 120, 820)));
        sync();
        window.addEventListener('resize', sync);
        paintBase();
        let raf = 0;
        let last = 0;
        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            if (t - last < 200) return;
            last = t;
            if (ref.current) draw(ref.current, { world, markers, peers, full: true });
        };
        raf = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', sync);
        };
    }, [open, world, markers, peers]);
    if (!open) return null;
    const found = LANDMARKS.filter((l) => world.found.includes(l.id)).length;
    return (
        <div className="fixed inset-0 z-[74] flex flex-col items-center justify-center gap-3 bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="flex w-full max-w-[820px] items-center justify-between text-white" onClick={(e) => e.stopPropagation()}>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/80">The Aether Plain</p>
                    <p className="text-[13px] text-white/60">
                        {found} of {LANDMARKS.length} places found
                    </p>
                </div>
                <button type="button" onClick={onClose} className="min-h-[40px] rounded-xl border border-white/15 bg-white/[0.06] px-4 text-[13px]">
                    Close · M
                </button>
            </div>
            <canvas ref={ref} width={size * 2} height={size * 2} style={{ width: size, height: size }} className="rounded-3xl border border-white/10 bg-[#120f1a]" onClick={(e) => e.stopPropagation()} />
        </div>
    );
}
