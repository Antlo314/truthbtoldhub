'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileText, Film, Music, Image as ImageIcon, Link2, Pin, ArrowLeft } from 'lucide-react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { truthOffscreen } from '@/lib/game/truth';
import { formatBytes, type Bulletin, type DispatchMedia, type MediaKind } from '@/lib/game/hut';
import type { WorldEvent } from '@/lib/game/worldEvents';
import HutLedger from '@/components/game/HutLedger';
import HutPortalBoard from '@/components/game/HutPortalBoard';
import HutConsumableCraft from '@/components/game/HutConsumableCraft';
import TruthQA from '@/components/game/TruthQA';
import DonationSection from '@/components/DonationSection';

// ============================================================
//  TRUTH'S HUT — a small place you ENTER. Instead of one
//  overloaded panel, the daily Word, the shelf, patronage,
//  the forge and Truth himself each live on a tappable object
//  in the room. Art: Kenney "Roguelike Indoors" (CC0).
// ============================================================

const SHEET = '/assets/kenney/roguelikeIndoor.png';
const KIND_ICON = { pdf: FileText, video: Film, audio: Music, image: ImageIcon, link: Link2 } as const;

type StationId = 'ledger' | 'archive' | 'visions' | 'offering' | 'forge' | 'map' | 'truth';

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

interface Station {
    id: StationId;
    label: string;
    sub: string;
    // object placement (% of stage) + sprite
    x: number; y: number;
    sprite: { col: number; row: number; w?: number; h?: number; vmin: number };
}

const STATIONS: Station[] = [
    // wall row (top)
    { id: 'ledger', label: 'The Ledger', sub: "Truth's daily Word", x: 22, y: 17, sprite: { col: 18, row: 0, vmin: 11 } },
    { id: 'visions', label: 'The Seeing Glass', sub: 'Visions & films', x: 74, y: 14, sprite: { col: 22, row: 14, h: 2, vmin: 11 } },
    // upper floor row
    { id: 'archive', label: 'The Archive', sub: 'Scrolls & frequencies', x: 22, y: 62, sprite: { col: 12, row: 0, h: 2, vmin: 13 } },
    { id: 'forge', label: 'The Forge', sub: 'Temper arms & tonics', x: 78, y: 62, sprite: { col: 10, row: 14, h: 2, vmin: 13 } },
    // lower floor row (well clear of each other)
    { id: 'offering', label: 'The Offering', sub: 'Walk with the work', x: 26, y: 85, sprite: { col: 17, row: 12, vmin: 10 } },
    { id: 'map', label: 'The Wayfinder', sub: 'Ages & the ledger', x: 70, y: 85, sprite: { col: 0, row: 0, w: 2, vmin: 16 } },
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
    const [active, setActive] = useState<StationId | null>(initialStation ?? null);
    const openStation = useCallback((id: StationId) => setActive(id), []);

    const docs = media.filter((m) => m.kind === 'pdf' || m.kind === 'audio' || m.kind === 'link');
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
            <style>{`@keyframes hutFlicker{0%,100%{opacity:.5}45%{opacity:.92}70%{opacity:.36}}@keyframes hutFloat{0%{transform:translateY(0);opacity:0}12%{opacity:.85}88%{opacity:.5}100%{transform:translateY(-42vmin);opacity:0}}`}</style>

            {/* ---- header ---- */}
            <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4" style={{ paddingTop: 'calc(0.7rem + env(safe-area-inset-top))' }}>
                <button onClick={onClose} className="pointer-events-auto p-2.5 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-200 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center" title="Leave the Hut">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-center pointer-events-none">
                    <p className="text-[9px] tracking-[0.4em] uppercase text-aether-gold/70">Truth's Hut</p>
                    <p className="text-[10px] text-orange-300/80 italic mt-0.5 max-w-[60vw] truncate">"{worldEvent.truthLine}"</p>
                </div>
                <div className="w-[44px]" />
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
            <div className="absolute pointer-events-none" style={{ left: '49%', top: '74%' }}><KenneyObject col={16} row={0} vmin={7} /></div>

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
                    <div className="transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0">
                        <KenneyObject col={s.sprite.col} row={s.sprite.row} w={s.sprite.w} h={s.sprite.h} vmin={s.sprite.vmin} />
                    </div>
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-black/55 border border-aether-gold/25 text-[8px] font-black uppercase tracking-[0.18em] text-aether-gold/90 opacity-90 group-hover:opacity-100 whitespace-nowrap">{s.label}</span>
                </button>
            ))}

            {/* drifting embers for warmth */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 6 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="absolute rounded-full" style={{ left: `${12 + i * 14}%`, bottom: '18%', width: '0.7vmin', height: '0.7vmin', background: 'rgba(255,190,95,0.85)', filter: 'blur(0.25vmin)', animation: `hutFloat ${6 + i * 0.8}s linear ${i * 1.1}s infinite` }} />
                ))}
            </div>

            {/* ---- station panel ---- */}
            {active && (
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
                                <MediaList items={active === 'visions' ? visions : docs} />
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
                                <HutPortalBoard character={character} />
                                <div className="mt-4">
                                    <HutLedger characterName={character.name} />
                                </div>
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

function MediaList({ items }: { items: DispatchMedia[] }) {
    if (items.length === 0) {
        return <p className="text-[11px] text-zinc-500 text-center py-8 font-mono uppercase tracking-widest">Nothing here yet — return soon.</p>;
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
