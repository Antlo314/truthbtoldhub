'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { X, FileText, Film, Music, Image as ImageIcon, Link2, Pin, ArrowLeft, HelpCircle, ScrollText, Radio, Lock } from 'lucide-react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { truthOffscreen } from '@/lib/game/truth';
import { formatBytes, type Bulletin, type DispatchMedia, type MediaKind } from '@/lib/game/hut';
import type { WorldEvent } from '@/lib/game/worldEvents';
import { currentSeason } from '@/lib/game/arcade';
import HutLedger from '@/components/game/HutLedger';
import HutPortalBoard from '@/components/game/HutPortalBoard';
import HutFrequencies from '@/components/game/HutFrequencies';
import HutConsumableCraft from '@/components/game/HutConsumableCraft';
import TruthQA from '@/components/game/TruthQA';
import DonationSection from '@/components/DonationSection';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { fetchTestimonies, postTestimony, deleteTestimony, TESTIMONY_MAX, type Testimony } from '@/lib/game/testimony';
import { supabase } from '@/lib/supabase';

// The arcade (with the Tetris engine) is heavy — load it only when a
// soul opens it, so the Hut itself stays light.
const ArcadeLobby = dynamic(() => import('@/components/game/arcade/ArcadeLobby'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 z-[55] flex items-center justify-center bg-[#06080e]">
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-aether-gold/70">Opening the Arcade…</p>
        </div>
    ),
});

// ============================================================
//  TRUTH'S HUT — a small place you ENTER. Instead of one
//  overloaded panel, the daily Word, the shelf, patronage,
//  the forge and Truth himself each live on a tappable object
//  in the room. Art: Kenney "Roguelike Indoors" (CC0).
// ============================================================

const SHEET = '/assets/kenney/roguelikeIndoor.png';
const KIND_ICON = { pdf: FileText, video: Film, audio: Music, image: ImageIcon, link: Link2 } as const;

type StationId = 'ledger' | 'archive' | 'visions' | 'offering' | 'forge' | 'map' | 'truth' | 'profile' | 'arcade' | 'sanctum';

// Draw w×h tiles of the indoor sheet onto a crisp, pixel-perfect canvas.
function KenneyObject({ col, row, w = 1, h = 1, vmin }: { col: number; row: number; w?: number; h?: number; vmin: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const SCALE = 6; // hi-res intrinsic; CSS scales it down crisply
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.src = SHEET;
        const draw = () => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, cv.width, cv.height);
            for (let cx = 0; cx < w; cx++) {
                for (let cy = 0; cy < h; cy++) {
                    ctx.drawImage(img, (col + cx) * 17, (row + cy) * 17, 16, 16, cx * 16 * SCALE, cy * 16 * SCALE, 16 * SCALE, 16 * SCALE);
                }
            }
        };
        if (img.complete && img.naturalWidth) draw();
        else { img.onload = draw; img.onerror = draw; }
    }, [col, row, w, h]);
    return (
        <canvas
            ref={ref}
            width={w * 16 * SCALE}
            height={h * 16 * SCALE}
            style={{ width: `${vmin}vmin`, height: `${(vmin * h) / w}vmin`, imageRendering: 'pixelated', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))' }}
        />
    );
}

function TruthFigure({ vmin }: { vmin: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const SCALE = 7;
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        const frame = truthOffscreen(0, 'down');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(frame, 0, 0, 16, 24, 0, 0, 16 * SCALE, 24 * SCALE);
    }, []);
    return (
        <canvas
            ref={ref}
            width={16 * SCALE}
            height={24 * SCALE}
            style={{ width: `${vmin}vmin`, height: `${(vmin * 24) / 16}vmin`, imageRendering: 'pixelated', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' }}
        />
    );
}

// A bespoke pixel arcade cabinet (drawn, not from the Kenney sheet) so the
// Arcade station reads unmistakably as "play here" — a colorful Tetris screen.
function ArcadeIcon({ vmin }: { vmin: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const W = 16, H = 20, SCALE = 7;
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cv.width, cv.height);
        const px = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE); };
        px(2, 1, 12, 18, '#241a30');   // cabinet body
        px(2, 1, 12, 1, '#3a2a4d');    // top bevel
        px(3, 2, 10, 2, '#fcd34d');    // gold marquee
        px(3, 5, 10, 8, '#0a1018');    // screen
        // tetromino blocks on the screen
        px(4, 9, 2, 2, '#22d3ee'); px(6, 9, 2, 2, '#22d3ee');
        px(8, 7, 2, 2, '#a855f7'); px(8, 9, 2, 2, '#a855f7'); px(10, 9, 2, 2, '#a855f7');
        px(4, 11, 2, 2, '#ef4444');
        px(10, 7, 2, 2, '#22c55e');
        px(3, 14, 10, 3, '#3a2a4d');   // control panel
        px(5, 15, 1, 1, '#ef4444'); px(7, 15, 1, 1, '#22d3ee'); // buttons
        px(3, 19, 2, 1, '#1a1322'); px(11, 19, 2, 1, '#1a1322'); // legs
    }, []);
    return (
        <canvas
            ref={ref}
            width={W * SCALE}
            height={H * SCALE}
            style={{ width: `${vmin}vmin`, height: `${(vmin * H) / W}vmin`, imageRendering: 'pixelated', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,0.5))' }}
        />
    );
}

// A drawn doorway to The Sanctum — a warm-lit gathering hall with two souls
// in the glow, so the station reads unmistakably as "go in and meet people".
function SanctumIcon({ vmin }: { vmin: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const W = 16, H = 20, SCALE = 7;
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cv.width, cv.height);
        const px = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE); };
        px(1, 18, 14, 2, '#2c1f14');   // ground shadow
        px(4, 1, 8, 1, '#6b4a28');     // arch crown
        px(2, 2, 12, 2, '#5a3d22');    // lintel
        px(2, 4, 2, 14, '#4a3119');    // left pillar
        px(12, 4, 2, 14, '#4a3119');   // right pillar
        px(3, 4, 1, 14, '#6b4a28');    // left pillar highlight
        px(12, 4, 1, 14, '#3a2a1c');   // right pillar shade
        // glowing interior
        px(4, 4, 8, 14, '#160f06');
        px(5, 6, 6, 11, '#7a3d12');
        px(6, 8, 4, 8, '#b45309');
        px(7, 10, 2, 6, '#fcd34d');
        // two souls in the doorway
        px(5, 12, 2, 5, '#1a1322'); px(5, 11, 2, 1, '#1a1322');
        px(9, 13, 2, 4, '#1a1322'); px(9, 12, 2, 1, '#1a1322');
        px(7, 2, 2, 1, '#fde68a');     // gold gleam
    }, []);
    return (
        <canvas
            ref={ref}
            width={W * SCALE}
            height={H * SCALE}
            style={{ width: `${vmin}vmin`, height: `${(vmin * H) / W}vmin`, imageRendering: 'pixelated', filter: 'drop-shadow(0 5px 8px rgba(0,0,0,0.5))' }}
        />
    );
}

interface Station {
    id: StationId;
    label: string;
    sub: string;
    // object placement (% of stage) + sprite
    x: number; y: number;
    sprite: { col: number; row: number; w?: number; h?: number; vmin: number };
}

const STATIONS: Station[] = [
    // the gathering hall door — upper-centre back wall, a way OUT of the room into the community
    { id: 'sanctum', label: 'The Sanctum', sub: 'Gather & speak with souls', x: 50, y: 16, sprite: { col: 0, row: 0, vmin: 10 } },
    // wall row (top)
    { id: 'ledger', label: 'The Ledger', sub: "Truth's daily Word", x: 20, y: 17, sprite: { col: 18, row: 0, vmin: 11 } },
    { id: 'visions', label: 'The Seeing Glass', sub: 'Visions & films', x: 78, y: 15, sprite: { col: 22, row: 14, h: 2, vmin: 11 } },
    // your reflection — the centerpiece, beneath Truth
    { id: 'profile', label: 'Your Soul', sub: 'Name · title · testament', x: 50, y: 60, sprite: { col: 22, row: 14, h: 2, vmin: 12 } },
    // floor sides
    { id: 'archive', label: 'The Archive', sub: 'Scrolls & frequencies', x: 16, y: 63, sprite: { col: 12, row: 0, h: 2, vmin: 13 } },
    { id: 'forge', label: 'The Forge', sub: 'Temper arms & tonics', x: 84, y: 63, sprite: { col: 10, row: 14, h: 2, vmin: 13 } },
    // lower floor row (well clear of each other)
    { id: 'offering', label: 'The Offering', sub: 'Walk with the work', x: 24, y: 86, sprite: { col: 17, row: 12, vmin: 10 } },
    { id: 'arcade', label: 'The Arcade', sub: 'Play for the high score', x: 50, y: 85, sprite: { col: 0, row: 0, vmin: 12 } },
    { id: 'map', label: 'The Wayfinder', sub: 'Ages & the ledger', x: 76, y: 86, sprite: { col: 0, row: 0, w: 2, vmin: 16 } },
];

const TOUR: [string, string][] = [
    ['The Sanctum', 'gather with fellow souls — live halls, whispers & voice'],
    ['The Ledger', 'my daily Word — and the testimonies of souls'],
    ['Your Soul', 'shape your name, title & testament in the glass'],
    ['The Seeing Glass', 'visions & films I leave for you'],
    ['The Archive', 'scrolls & frequencies to study'],
    ['The Forge', 'temper your arms & brew tonics'],
    ['The Offering', 'walk with the work'],
    ['The Arcade', 'play for the high score — a prize each season'],
    ['The Wayfinder', 'the open ages & the ledger of souls'],
    ['Ask Truth', 'pry the hood — ask me anything'],
];

interface HutInteriorProps {
    character: GameCharacter;
    bulletins: Bulletin[];
    media: DispatchMedia[];
    isArchitect: boolean;
    worldEvent: WorldEvent;
    onClose: () => void;
    onOpenForge: () => void;
    onToast: (msg: string) => void;
    /** Open straight to a station (e.g. ?hut=patron deep-link). */
    initialStation?: StationId;
}

export default function HutInterior({ character, bulletins, media, isArchitect, worldEvent, onClose, onOpenForge, onToast, initialStation }: HutInteriorProps) {
    const router = useRouter();
    const [active, setActive] = useState<StationId | null>(initialStation ?? null);

    // ---- "something new dwells here" markers ------------------------------
    // Each content station remembers the newest thing you SAW there
    // (localStorage); a gold pulse marks stations that grew since.
    const [seenTick, setSeenTick] = useState(0);
    const latestFor = useMemo<Partial<Record<StationId, string>>>(() => {
        const newest = (items: { created_at: string }[]) =>
            items.reduce<string>((m, i) => (i.created_at > m ? i.created_at : m), '');
        return {
            ledger: newest(bulletins) || undefined,
            visions: newest(media.filter((m) => m.kind === 'video' || m.kind === 'image')) || undefined,
            archive: newest(media.filter((m) => m.kind === 'pdf' || m.kind === 'link' || m.kind === 'audio')) || undefined,
            arcade: currentSeason(), // a fresh season = a fresh ladder
        };
    }, [bulletins, media]);
    const hasNew = useCallback((id: StationId) => {
        const latest = latestFor[id];
        if (!latest || typeof window === 'undefined') return false;
        void seenTick;
        try { return (localStorage.getItem(`tbth-hut-seen-${id}`) ?? '') < latest; } catch { return false; }
    }, [latestFor, seenTick]);
    const markSeen = useCallback((id: StationId) => {
        const latest = latestFor[id];
        if (!latest) return;
        try { localStorage.setItem(`tbth-hut-seen-${id}`, latest); } catch { /* ignore */ }
        setSeenTick((t) => t + 1);
    }, [latestFor]);

    const openStation = useCallback((id: StationId) => {
        markSeen(id);
        // The Sanctum isn't a panel — it's the community space at /archive (gated
        // to signed-in souls). Walk out the gathering-hall door into it.
        if (id === 'sanctum') { router.push('/archive'); return; }
        setActive(id);
    }, [router, markSeen]);

    // first-visit walkthrough — a one-time legend of the room
    const [showTour, setShowTour] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!initialStation && !localStorage.getItem('tbth-hut-toured')) setShowTour(true);
    }, [initialStation]);
    const dismissTour = useCallback(() => {
        try { localStorage.setItem('tbth-hut-toured', '1'); } catch { /* ignore */ }
        setShowTour(false);
    }, []);

    const scrolls = media.filter((m) => m.kind === 'pdf' || m.kind === 'link');
    const frequencies = media.filter((m) => m.kind === 'audio');
    const visions = media.filter((m) => m.kind === 'video' || m.kind === 'image');

    return (
        <div className="absolute inset-0 z-30 overflow-hidden select-none" style={{ background: '#1a120b' }}>
            {/* ---- room: wall + wood floor (procedural, scales to any screen) ---- */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'linear-gradient(180deg, #3a2a1c 0%, #3a2a1c 44%, #2c1f14 44%, #2c1f14 45%, #5a3d22 45%, #4a3119 100%)',
                }}
            />
            {/* wall warmth + plank texture */}
            <div className="absolute inset-x-0 top-0" style={{ height: '45%', background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 64px)' }} />
            <div className="absolute inset-x-0 bottom-0" style={{ height: '55%', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 2px, transparent 2px 46px)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(120% 80% at 50% 30%, rgba(251,191,36,0.10), transparent 60%)' }} />
            {/* wall/floor seam: shadow + a carved wood baseboard for a finished edge */}
            <div className="absolute inset-x-0 pointer-events-none" style={{ top: '41%', height: '5%', background: 'linear-gradient(180deg, rgba(0,0,0,0.45), transparent)' }} />
            <div className="absolute inset-x-0 pointer-events-none" style={{ top: '44.4%', height: '1%', background: 'linear-gradient(180deg,#7a5126 0%,#5a3a1d 60%,#3a2412 100%)', boxShadow: '0 3px 6px rgba(0,0,0,0.45)' }} />
            {/* cozy vignette */}
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 18vmin 5vmin rgba(0,0,0,0.5)' }} />
            <style>{`@keyframes hutFlicker{0%,100%{opacity:.5}45%{opacity:.92}70%{opacity:.36}}@keyframes hutFloat{0%{transform:translateY(0);opacity:0}12%{opacity:.85}88%{opacity:.5}100%{transform:translateY(-42vmin);opacity:0}}@keyframes hutNewPulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.35);opacity:1}}`}</style>

            {/* ---- header ---- */}
            <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4" style={{ paddingTop: 'calc(0.7rem + env(safe-area-inset-top))' }}>
                <button onClick={onClose} className="pointer-events-auto p-2.5 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" title="Leave the Hut">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-center pointer-events-none">
                    <p className="text-[9px] tracking-[0.4em] uppercase text-aether-gold/70">Truth's Hut</p>
                    <p className="text-[10px] text-orange-300/80 italic mt-0.5 max-w-[60vw] truncate">"{worldEvent.truthLine}"</p>
                </div>
                <button onClick={() => setShowTour(true)} className="pointer-events-auto p-2.5 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-200 hover:text-aether-gold min-w-[44px] min-h-[44px] flex items-center justify-center" title="Guide to the Hut" aria-label="Guide">
                    <HelpCircle className="w-4 h-4" />
                </button>
            </div>

            {/* ---- decor (non-interactive) — candelabras cast a flickering glow ---- */}
            <div className="absolute pointer-events-none" style={{ left: '4%', top: '20%' }}>
                <div className="absolute" style={{ left: '50%', top: '35%', transform: 'translate(-50%,-50%)', width: '15vmin', height: '15vmin', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,178,80,0.42), transparent 62%)', animation: 'hutFlicker 2.6s ease-in-out infinite' }} />
                <KenneyObject col={19} row={0} vmin={7} />
            </div>
            <div className="absolute pointer-events-none" style={{ left: '90%', top: '20%' }}>
                <div className="absolute" style={{ left: '50%', top: '35%', transform: 'translate(-50%,-50%)', width: '15vmin', height: '15vmin', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,178,80,0.42), transparent 62%)', animation: 'hutFlicker 3.1s ease-in-out infinite' }} />
                <KenneyObject col={19} row={0} vmin={7} />
            </div>
            <div className="absolute pointer-events-none" style={{ left: '8%', top: '83%' }}><KenneyObject col={16} row={0} vmin={7} /></div>

            {/* a woven rug anchors the center under Truth */}
            <div className="absolute pointer-events-none" style={{ left: '50%', top: '47%', transform: 'translate(-50%,-50%)', width: '48vmin', height: '19vmin', borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(178,68,40,0.55), rgba(120,42,28,0.4) 52%, transparent 72%)', border: '0.4vmin solid rgba(251,191,36,0.16)' }} />

            {/* ---- Truth, center ---- */}
            <button
                onClick={() => openStation('truth')}
                className="absolute z-10 pointer-events-auto flex flex-col items-center group"
                style={{ left: '50%', top: '34%', transform: 'translate(-50%,-50%)' }}
            >
                <TruthFigure vmin={15} />
                <span className="mt-1 px-2 py-0.5 rounded-full bg-black/55 border border-orange-400/30 text-[8px] font-black uppercase tracking-[0.18em] text-orange-300 opacity-90 group-hover:opacity-100 whitespace-nowrap">Ask Truth</span>
            </button>

            {/* ---- stations ---- */}
            {STATIONS.map((s) => (
                <button
                    key={s.id}
                    onClick={() => openStation(s.id)}
                    className="absolute z-10 pointer-events-auto flex flex-col items-center group"
                    style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)' }}
                >
                    <div className="relative transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0">
                        {s.id === 'arcade'
                            ? <ArcadeIcon vmin={s.sprite.vmin} />
                            : s.id === 'sanctum'
                                ? <SanctumIcon vmin={s.sprite.vmin} />
                                : <KenneyObject col={s.sprite.col} row={s.sprite.row} w={s.sprite.w} h={s.sprite.h} vmin={s.sprite.vmin} />}
                        {hasNew(s.id) && (
                            <span
                                aria-hidden
                                className="absolute rounded-full"
                                style={{ top: '-0.9vmin', right: '-0.9vmin', width: '2vmin', height: '2vmin', background: 'radial-gradient(circle, #fde68a 0%, #fbbf24 55%, #b45309 100%)', boxShadow: '0 0 1.6vmin rgba(251,191,36,0.9)', animation: 'hutNewPulse 1.8s ease-in-out infinite' }}
                            />
                        )}
                    </div>
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-black/55 border border-aether-gold/25 text-[8px] font-black uppercase tracking-[0.18em] text-aether-gold/90 opacity-90 group-hover:opacity-100 whitespace-nowrap">
                        {s.label}{hasNew(s.id) ? ' ✦' : ''}
                    </span>
                </button>
            ))}

            {/* drifting embers for warmth */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 6 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="absolute rounded-full" style={{ left: `${12 + i * 14}%`, bottom: '18%', width: '0.7vmin', height: '0.7vmin', background: 'rgba(255,190,95,0.85)', filter: 'blur(0.25vmin)', animation: `hutFloat ${6 + i * 0.8}s linear ${i * 1.1}s infinite` }} />
                ))}
            </div>

            {/* ---- first-visit walkthrough ---- */}
            {showTour && (
                <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-5" onClick={dismissTour}>
                    <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-aether-gold/25 max-h-[88dvh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">Truth's Hut</p>
                        <h2 className="font-ritual text-2xl gold-shimmer mb-3">Welcome Home{character.name ? `, ${character.name}` : ''}</h2>
                        <p className="text-sm text-zinc-300 leading-relaxed mb-4">This is the heart of the world. Tap anything in the room to draw near — here is what dwells here:</p>
                        <ul className="space-y-2.5 mb-5">
                            {TOUR.map(([label, desc]) => (
                                <li key={label} className="flex gap-2.5">
                                    <span className="text-aether-gold mt-0.5 shrink-0">✦</span>
                                    <span className="text-sm text-zinc-300 leading-snug"><span className="text-white font-bold">{label}</span> — {desc}</span>
                                </li>
                            ))}
                        </ul>
                        <button onClick={dismissTour} className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>Enter the Hut</button>
                    </div>
                </div>
            )}

            {/* ---- the Arcade — a full-screen scene, not the small panel ---- */}
            {active === 'arcade' && (
                <ArcadeLobby character={character} onClose={() => setActive(null)} />
            )}

            {/* ---- station panel ---- */}
            {active && active !== 'arcade' && (
                <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setActive(null)}>
                    <div className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 border border-[rgba(251,191,36,0.2)] relative max-h-[86dvh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActive(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white z-10">
                            <X className="w-4 h-4" />
                        </button>

                        {active === 'ledger' && (
                            <>
                                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">The Ledger</p>
                                <h2 className="font-ritual text-2xl gold-shimmer mb-4">The Living Word</h2>
                                <div className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-4">
                                    {bulletins.length > 0 ? (
                                        <>
                                            <p className="text-[9px] font-mono uppercase tracking-widest text-aether-gold/60 mb-2 flex items-center gap-2">
                                                {bulletins[0].pinned && <Pin className="w-3 h-3" />} {bulletins[0].published_at} · From Truth
                                            </p>
                                            <p className="font-ritual text-white/90 leading-relaxed whitespace-pre-wrap">
                                                <span className="block text-aether-gold font-bold mb-1">{bulletins[0].title}</span>
                                                {bulletins[0].body}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="font-ritual text-white/90 leading-relaxed">
                                            Welcome home, {character.name || 'initiate'}. Each day I leave word here — a truth unearthed, a scroll to study. Return often.
                                        </p>
                                    )}
                                </div>
                                {bulletins.length > 1 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Earlier words</p>
                                        {bulletins.slice(1).map((b) => (
                                            <div key={b.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                                                <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">{b.published_at}</p>
                                                <p className="text-aether-gold/90 text-sm font-bold">{b.title}</p>
                                                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-3 whitespace-pre-wrap">{b.body}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <TestimonyWall authorName={character.name} isArchitect={isArchitect} />
                                {isArchitect && (
                                    <a href="/hut-admin" className="mt-5 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                        Tend the Hut
                                    </a>
                                )}
                            </>
                        )}

                        {(active === 'archive' || active === 'visions') && (
                            <>
                                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">{active === 'visions' ? 'The Seeing Glass' : 'The Archive'}</p>
                                <h2 className="font-ritual text-2xl gold-shimmer mb-4">{active === 'visions' ? 'Visions & Films' : 'Scrolls & Frequencies'}</h2>
                                {active === 'visions' ? (
                                    <>
                                        <a
                                            href="/vision"
                                            className="mb-4 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] text-black"
                                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                                        >
                                            Open vision portals →
                                        </a>
                                        <MediaList items={visions} emptyLabel="No hut films yet — the portals still hold the unsealed roads." />
                                        <a
                                            href="/cinema"
                                            className="mt-3 block text-center text-[10px] uppercase tracking-[0.25em] text-white/40 hover:text-aether-gold/80"
                                        >
                                            Cinema transmissions →
                                        </a>
                                    </>
                                ) : (
                                    <div className="space-y-6">
                                        <section>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <ScrollText className="w-3.5 h-3.5 text-aether-gold/80 shrink-0" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-aether-gold/80">Scrolls</p>
                                                <span className="text-[9px] text-zinc-500 truncate">· writings &amp; teachings</span>
                                            </div>
                                            <MediaList items={scrolls} emptyLabel="No scrolls posted yet — the Library holds the full collection." />
                                            <a
                                                href="/library"
                                                className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] text-black"
                                                style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                                            >
                                                Enter the Library →
                                            </a>
                                        </section>
                                        <section>
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <Radio className="w-3.5 h-3.5 text-aether-gold/80 shrink-0" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-aether-gold/80">Frequencies</p>
                                                <span className="text-[9px] text-zinc-500 truncate">· transmissions &amp; the 400 soundtrack</span>
                                            </div>
                                            <HutFrequencies tracks={frequencies} />
                                        </section>
                                    </div>
                                )}
                            </>
                        )}

                        {active === 'offering' && (
                            <>
                                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">The Offering</p>
                                <h2 className="font-ritual text-2xl gold-shimmer mb-4">Walk With the Work</h2>
                                <DonationSection variant="hut" showFundingBar />
                            </>
                        )}

                        {active === 'forge' && (
                            <>
                                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">The Forge</p>
                                <h2 className="font-ritual text-2xl gold-shimmer mb-4">Temper Arms & Tonics</h2>
                                <HutConsumableCraft
                                    onOpenForge={() => { setActive(null); onOpenForge(); }}
                                    onCrafted={(name, effect) => onToast(`✦ ${name} brewed · ${effect}`)}
                                />
                            </>
                        )}

                        {active === 'map' && (
                            <>
                                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">The Wayfinder</p>
                                <h2 className="font-ritual text-2xl gold-shimmer mb-4">Ages & the Ledger</h2>
                                <div
                                    className="rounded-2xl border p-4 mb-4"
                                    style={{ borderColor: `${worldEvent.accent}33`, background: `linear-gradient(135deg, ${worldEvent.accent}14, rgba(0,0,0,0.35))` }}
                                >
                                    <p className="text-[9px] font-mono uppercase tracking-widest mb-1.5" style={{ color: worldEvent.accent }}>World rhythm · today</p>
                                    <p className="font-ritual text-base text-white mb-1">{worldEvent.hutHeadline}</p>
                                    <p className="text-sm text-zinc-300 leading-relaxed">{worldEvent.hutBody}</p>
                                </div>
                                <a
                                    href="/vision"
                                    className="mb-4 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] text-black"
                                    style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                                >
                                    Open vision portals →
                                </a>
                                <HutPortalBoard character={character} />
                                <div className="mt-4">
                                    <HutLedger characterName={character.name} />
                                </div>
                            </>
                        )}

                        {active === 'profile' && (
                            <>
                                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">Your Soul</p>
                                <h2 className="font-ritual text-2xl gold-shimmer mb-4">Behold Yourself</h2>
                                <ProfileStation />
                            </>
                        )}

                        {active === 'truth' && (
                            <>
                                <p className="text-[10px] tracking-[0.4em] uppercase text-orange-400/70 mb-1">Ask Truth</p>
                                <h2 className="font-ritual text-2xl gold-shimmer mb-4">The Brother Behind the Hood</h2>
                                <TruthQA character={character} onJournalUnlock={(title) => onToast(`✦ Recorded in Codex Journal · ${title}`)} />
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// The Testimony Wall — souls leave short words beneath Truth's daily
// Word. Async + moderatable (delete own, or any as Architect). Not chat.
function TestimonyWall({ authorName, isArchitect }: { authorName: string; isArchitect: boolean }) {
    const [items, setItems] = useState<Testimony[]>([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [uid, setUid] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setItems(await fetchTestimonies(40));
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { supabase.auth.getSession().then(({ data }) => setUid(data.session?.user?.id ?? null)); }, []);

    const submit = async () => {
        if (!draft.trim()) return;
        setPosting(true);
        setErr(null);
        try {
            await postTestimony(draft, authorName);
            setDraft('');
            await load();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Could not post.');
        } finally {
            setPosting(false);
        }
    };
    const remove = async (id: string) => {
        try { await deleteTestimony(id); await load(); } catch { /* ignore */ }
    };

    return (
        <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Testimonies · souls who answered</p>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 mb-4">
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, TESTIMONY_MAX))}
                    rows={2}
                    placeholder="Leave a word for the souls who walk after you…"
                    className="w-full bg-transparent text-sm text-white leading-relaxed focus:outline-none resize-none placeholder:text-zinc-600"
                />
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-zinc-600">{draft.length}/{TESTIMONY_MAX}</span>
                    <button onClick={submit} disabled={posting || !draft.trim()} className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-black disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                        {posting ? 'Speaking…' : 'Speak'}
                    </button>
                </div>
                {err && <p className="text-[10px] text-red-400 mt-1">{err}</p>}
            </div>
            {loading ? (
                <p className="text-[11px] text-zinc-600 text-center py-4 font-mono uppercase tracking-widest">Listening…</p>
            ) : items.length === 0 ? (
                <p className="text-[11px] text-zinc-600 text-center py-4 font-mono uppercase tracking-widest">No testimonies yet — be the first to answer.</p>
            ) : (
                <div className="space-y-2">
                    {items.map((t) => (
                        <div key={t.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-aether-gold/80 truncate">{t.author_name}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[8px] font-mono text-zinc-600">{t.created_at?.slice(0, 10)}</span>
                                    {(isArchitect || (uid && t.author_id === uid)) && (
                                        <button onClick={() => remove(t.id)} className="text-zinc-600 hover:text-red-500 text-[9px] uppercase tracking-widest">remove</button>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-white/85 leading-snug mt-1 whitespace-pre-wrap break-words">{t.body}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// The Profile station — a soul fleshes out their community identity
// (name / title / testament) against the existing `profiles` table.
function ProfileStation() {
    const profile = useSoulStore((s) => s.profile);
    const fetchIdentity = useSoulStore((s) => s.fetchIdentity);
    const updateProfile = useSoulStore((s) => s.updateProfile);
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [bio, setBio] = useState('');
    const [seeded, setSeeded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    // change-password (Supabase auth — updates the logged-in account)
    const [pw, setPw] = useState('');
    const [pw2, setPw2] = useState('');
    const [pwMsg, setPwMsg] = useState<string | null>(null);
    const [pwSaving, setPwSaving] = useState(false);

    useEffect(() => { if (!profile) fetchIdentity(); }, [profile, fetchIdentity]);
    useEffect(() => {
        if (profile && !seeded) {
            setName(profile.display_name || '');
            setTitle(profile.custom_title || '');
            setBio(profile.bio || '');
            setSeeded(true);
        }
    }, [profile, seeded]);

    if (!profile) {
        return <p className="text-zinc-500 text-sm py-10 text-center font-mono uppercase tracking-widest">Gazing into the glass…</p>;
    }

    const save = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await updateProfile({ display_name: name.trim(), custom_title: title.trim(), bio: bio.trim() });
            setMsg('✦ Your soul is inscribed.');
        } catch {
            setMsg('Could not save — try again.');
        } finally {
            setSaving(false);
        }
    };

    const changePassword = async () => {
        setPwMsg(null);
        if (pw.length < 8) { setPwMsg('Password must be at least 8 characters.'); return; }
        if (pw !== pw2) { setPwMsg('Passwords do not match.'); return; }
        setPwSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: pw });
            if (error) throw error;
            setPw('');
            setPw2('');
            setPwMsg('✦ Password changed.');
        } catch (err) {
            setPwMsg(err instanceof Error ? err.message : 'Could not change password — try again.');
        } finally {
            setPwSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
                <div className="text-center shrink-0">
                    <p className="text-[8px] uppercase tracking-widest text-zinc-500">Soul Power</p>
                    <p className="font-ritual text-2xl text-aether-gold leading-none mt-0.5">{profile.soul_power ?? 0}</p>
                </div>
                <div className="flex-1 min-w-0 border-l border-white/10 pl-4">
                    <p className="text-[8px] uppercase tracking-widest text-zinc-500">Standing</p>
                    <p className="text-sm text-white font-bold truncate">{profile.tier || 'Initiate'}</p>
                </div>
            </div>
            <div>
                <label className="text-[9px] uppercase tracking-widest text-zinc-500">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="The name souls will know you by" className="mt-1 w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold" />
            </div>
            <div>
                <label className="text-[9px] uppercase tracking-widest text-zinc-500">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={48} placeholder="A title beneath your name — e.g. Seeker of the First Light" className="mt-1 w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold" />
            </div>
            <div>
                <label className="text-[9px] uppercase tracking-widest text-zinc-500">Testament</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} placeholder="A few words on who you are and why you walk…" className="mt-1 w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white leading-relaxed focus:outline-none focus:border-aether-gold resize-none" />
                <p className="text-[8px] text-zinc-600 text-right mt-1">{bio.length}/500</p>
            </div>
            {msg && <p className="text-[11px] text-aether-gold font-mono tracking-wide">{msg}</p>}
            <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                {saving ? 'Inscribing…' : 'Inscribe Your Soul'}
            </button>

            {/* Security — change the password for your logged-in account */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 mt-1">
                <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-3.5 h-3.5 text-aether-gold/80 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-aether-gold/80">Security</p>
                    <span className="text-[9px] text-zinc-500 truncate">· change your password</span>
                </div>
                <label className="text-[9px] uppercase tracking-widest text-zinc-500">New password</label>
                <input
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    autoComplete="new-password"
                    placeholder="at least 8 characters"
                    className="mt-1 w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold"
                />
                <label className="text-[9px] uppercase tracking-widest text-zinc-500 mt-3 block">Confirm</label>
                <input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    autoComplete="new-password"
                    placeholder="re-enter the new password"
                    onKeyDown={(e) => { if (e.key === 'Enter') changePassword(); }}
                    className="mt-1 w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold"
                />
                {pwMsg && (
                    <p className={`text-[11px] font-mono tracking-wide mt-2 break-words ${pwMsg.startsWith('✦') ? 'text-aether-gold' : 'text-red-400'}`}>{pwMsg}</p>
                )}
                <button
                    onClick={changePassword}
                    disabled={pwSaving || !pw || !pw2}
                    className="mt-3 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] border border-aether-gold/30 bg-aether-gold/10 text-aether-gold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    {pwSaving ? 'Changing…' : 'Change Password'}
                </button>
            </div>
        </div>
    );
}

function MediaList({ items, emptyLabel }: { items: DispatchMedia[]; emptyLabel?: string }) {
    if (items.length === 0) {
        return <p className="text-[11px] text-zinc-500 text-center py-8 font-mono uppercase tracking-widest">{emptyLabel || 'Nothing here yet — return soon.'}</p>;
    }
    return (
        <div className="space-y-2">
            {items.map((m) => {
                const Icon = KIND_ICON[m.kind as MediaKind] || Link2;
                return (
                    <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-aether-gold/30 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-aether-gold/10 border border-aether-gold/20 flex items-center justify-center text-aether-gold shrink-0">
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{m.title}</p>
                            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">{m.kind} · {m.category} · {formatBytes(m.size_bytes)}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-aether-gold shrink-0">Open ↗</span>
                    </a>
                );
            })}
        </div>
    );
}
