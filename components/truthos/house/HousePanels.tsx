'use client';

/**
 * House station panels — one object → one feature.
 * Truth never opens here — only via Truth.OS on the computer.
 */
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useHouseUi } from './houseUiStore';
import SoulPanel from '@/components/hut3d/hud/SoulPanel';
import StudioPanel from './StudioPanel';
import { CLEARING_R, CORRIDORS, DESTINATIONS, destCenter } from './jungleMap';
import CinemaPanel from './CinemaPanel';
import NewspaperPanel from './NewspaperPanel';
import WallPanel from './WallPanel';
import { useGameStore } from '@/lib/store/useGameStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { getWalkerPose } from './walkerPose';
import { loadVisited } from './stationProgress';
import DonationSection from '@/components/DonationSection';

const ArcadeLobby = dynamic(() => import('@/components/game/arcade/ArcadeLobby'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-cyan-400/60 font-mono text-xs tracking-widest">
            loading arcade…
        </div>
    ),
});

const ArchiveClient = dynamic(() => import('@/components/archive/ArchiveClient'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-sky-300/60 font-mono text-xs tracking-widest">
            opening the hall…
        </div>
    ),
});

const LibraryClient = dynamic(() => import('@/components/library/LibraryClient'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-violet-300/60 font-mono text-xs tracking-widest">
            opening the library…
        </div>
    ),
});

const HutLedger = dynamic(() => import('@/components/game/HutLedger'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-amber-200/60 font-mono text-xs tracking-widest">
            opening the ledger…
        </div>
    ),
});

const CineworksClient = dynamic(() => import('@/app/cineworks/components/CineworksClient'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-violet-200/60 font-mono text-xs tracking-widest">
            opening cineworks…
        </div>
    ),
});

function Shell({
    title,
    accent,
    onClose,
    children,
    full = false,
    bare = false,
}: {
    title: string;
    accent: string;
    onClose: () => void;
    children: React.ReactNode;
    full?: boolean;
    bare?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                aria-label="Close panel"
                onClick={onClose}
            />
            <div
                className={[
                    'relative w-full bg-[#0a0a12] border border-white/12 shadow-2xl overflow-hidden flex flex-col',
                    full
                        ? 'h-[100dvh] sm:h-[min(100dvh-1rem,920px)] sm:max-w-6xl sm:rounded-2xl'
                        : 'h-[min(92dvh,780px)] sm:max-w-lg sm:rounded-2xl border-t sm:border rounded-t-2xl',
                ].join(' ')}
            >
                {!bare && (
                    <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/50">
                        <div>
                            <p className={`text-[10px] uppercase tracking-[0.3em] font-mono ${accent}`}>House</p>
                            <h2 className="text-white font-semibold text-lg leading-tight">{title}</h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-lg border border-white/15 text-[10px] uppercase tracking-widest text-white/60 hover:text-white hover:border-white/30"
                        >
                            Close
                        </button>
                    </header>
                )}
                <div className="flex-1 min-h-0 relative">{children}</div>
            </div>
        </div>
    );
}

function FramePanel({
    title,
    accent,
    src,
    blurb,
    onClose,
}: {
    title: string;
    accent: string;
    src: string;
    blurb: string;
    onClose: () => void;
}) {
    return (
        <Shell title={title} accent={accent} onClose={onClose} full>
            <p className="absolute top-0 inset-x-0 z-10 px-4 py-2 text-[11px] text-white/50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                {blurb}
            </p>
            <iframe
                title={title}
                src={src}
                className="absolute inset-0 w-full h-full border-0 bg-black"
                allow="autoplay; fullscreen"
            />
        </Shell>
    );
}

function WayfinderNative({ onClose }: { onClose: () => void }) {
    // Drawn LIVE from jungleMap — the same tables that grow the walls and
    // lay the colliders. Open a corridor in the worldplan and it appears
    // here without anyone remembering to update a picture.
    const toMap = (x: number, z: number) => ({ mx: x, my: -z }); // north up
    const [, tick] = useState(0);
    useEffect(() => {
        const t = window.setInterval(() => tick((n) => n + 1), 250);
        return () => window.clearInterval(t);
    }, []);
    const pose = getWalkerPose();
    const here = toMap(pose.x, pose.z);
    const visited = loadVisited();
    return (
        <Shell title="Wall map · The Paths" accent="text-emerald-300" onClose={onClose}>
            <div className="p-4 h-full flex flex-col gap-3 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-emerald-300/80 text-center shrink-0">
                    The paths are open
                </p>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                    <svg viewBox="-100 -100 200 200" className="max-h-full w-auto aspect-square rounded-xl border border-white/10 bg-[#0b1410]">
                        {/* The jungle */}
                        <rect x="-100" y="-100" width="200" height="200" fill="#12241a" />
                        {/* Corridors */}
                        {CORRIDORS.map((c, i) => {
                            const a = toMap(c.ax, c.az);
                            const b = toMap(c.bx, c.bz);
                            return (
                                <line
                                    key={i}
                                    x1={a.mx} y1={a.my} x2={b.mx} y2={b.my}
                                    stroke="#8a6f4d" strokeWidth={c.halfWidth * 2}
                                    strokeLinecap="round" opacity={0.9}
                                />
                            );
                        })}
                        {/* Home clearing + the safe house */}
                        <circle cx={0} cy={0} r={CLEARING_R} fill="#1d3a28" stroke="#3f7d46" strokeWidth="1.4" />
                        <rect x={-5} y={-6} width={10} height={12} rx={1.5} fill="#c8ac88" stroke="#7a5c3c" strokeWidth="1" />
                        <text x={0} y={CLEARING_R - 5} textAnchor="middle" fontSize="6.2" fill="#e8e4d8" fontFamily="monospace">
                            THE SAFE HOUSE
                        </text>
                        {/* Destinations */}
                        {DESTINATIONS.map((d) => {
                            const c = destCenter(d);
                            const m = toMap(c.x, c.z);
                            return (
                                <g key={d.id}>
                                    <circle
                                        cx={m.mx}
                                        cy={m.my}
                                        r={d.r}
                                        fill="#1d3a28"
                                        stroke={visited.has(d.id) ? '#34d399' : '#fbbf24'}
                                        strokeWidth="1.2"
                                    />
                                    <circle cx={m.mx} cy={m.my} r={2.4} fill={visited.has(d.id) ? '#34d399' : '#fbbf24'} />
                                    <text x={m.mx} y={m.my - d.r - 3} textAnchor="middle" fontSize="6.4" fill="#fde68a" fontFamily="monospace" fontWeight="bold">
                                        {d.name.toUpperCase()}
                                    </text>
                                    <text x={m.mx} y={m.my + d.r + 8} textAnchor="middle" fontSize="4.8" fill="#d6d3c4" fontFamily="monospace">
                                        {d.blurb}
                                    </text>
                                </g>
                            );
                        })}
                        <text x={0} y={-48} textAnchor="middle" fontSize="4.4" fill="#8f9a8a" fontFamily="monospace">
                            scenic walk · turns back
                        </text>
                        <text x={0} y={52} textAnchor="middle" fontSize="4.8" fill="#8f9a8a" fontFamily="monospace">
                            one floor · four paths
                        </text>
                        <polygon
                            points={`${here.mx},${here.my - 3.2} ${here.mx - 2.1},${here.my + 2.4} ${here.mx + 2.1},${here.my + 2.4}`}
                            fill="#fbbf24"
                            transform={`rotate(${(-pose.yaw * 180) / Math.PI} ${here.mx} ${here.my})`}
                        />
                        <circle cx={here.mx} cy={here.my} r="1.4" fill="#111" />
                        {/* Compass */}
                        <g transform="translate(84,-84)">
                            <circle r="9" fill="#0b1410" stroke="#3f7d46" strokeWidth="0.8" />
                            <path d="M0,-6 L2,2 L0,0.6 L-2,2 Z" fill="#fbbf24" />
                            <text y={-11} textAnchor="middle" fontSize="5" fill="#fde68a" fontFamily="monospace">N</text>
                        </g>
                    </svg>
                </div>
                <p className="text-[10px] text-white/45 text-center leading-relaxed shrink-0">
                    Rec, hall, living, kitchen, The Mark — one floor. Four groves
                    wait at the ends of the paths.
                </p>
            </div>
        </Shell>
    );
}

function SoulNative({ onClose }: { onClose: () => void }) {
    return (
        <Shell title="Soul Mirror" accent="text-slate-300" onClose={onClose} full bare>
            <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg border border-white/20 bg-black/60 text-[10px] uppercase tracking-widest text-white/80 hover:text-white backdrop-blur-md"
            >
                Close
            </button>
            <SoulPanel onClose={onClose} />
        </Shell>
    );
}

function StudioNative({ onClose }: { onClose: () => void }) {
    return (
        <Shell title="Signal Studio" accent="text-orange-300" onClose={onClose} full bare>
            <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg border border-white/20 bg-black/60 text-[10px] uppercase tracking-widest text-white/80 hover:text-white backdrop-blur-md"
            >
                Close
            </button>
            <StudioPanel onClose={onClose} />
        </Shell>
    );
}

function ArcadePanel({ onClose }: { onClose: () => void }) {
    const character = useGameStore((s) => s.character);
    return (
        <div className="fixed inset-0 z-[55] bg-black">
            <ArcadeLobby character={character} onClose={onClose} />
            {/* The lobby's own back button sits top-left — directly underneath
                the chamber's "← Return to terminal" button at z-[80], which
                swallowed every click aimed at it. This one lives on the other
                side of the frame, above the lobby, and can actually be hit. */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-[60] px-3 py-2 rounded-xl bg-black/80 border border-white/25 text-[11px] uppercase tracking-widest text-white/80 hover:bg-black hover:text-white backdrop-blur-md min-h-[44px]"
            >
                Close · Esc
            </button>
        </div>
    );
}

export default function HousePanels() {
    const panel = useHouseUi((s) => s.panel);
    const closePanel = useHouseUi((s) => s.closePanel);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const characterName = useGameStore((s) => s.character?.name);

    if (!panel) return null;

    const onClose = () => {
        sacredUi.veilClose();
        closePanel();
        // Restore house bed after panel music
        if (panel === 'soul' || panel === 'studio' || panel === 'arcade' || panel === 'offering') {
            hubAudio.playMusic('house_ambient_main');
            void loadFromCloud?.();
        }
    };

    if (panel === 'soul') return <SoulNative onClose={onClose} />;
    if (panel === 'studio') return <StudioNative onClose={onClose} />;
    if (panel === 'wayfinder') return <WayfinderNative onClose={onClose} />;
    if (panel === 'arcade') return <ArcadePanel onClose={onClose} />;
    if (panel === 'cinema') return <CinemaPanel onClose={onClose} />;
    if (panel === 'news') return <NewspaperPanel onClose={onClose} />;
    if (panel === 'wall') return <WallPanel onClose={onClose} />;
    if (panel === 'hall') {
        return (
            <Shell title="The Hall" accent="text-sky-300" onClose={onClose} full>
                <ArchiveClient />
            </Shell>
        );
    }
    if (panel === 'library') {
        return (
            <Shell title="Library" accent="text-violet-300" onClose={onClose} full>
                <LibraryClient />
            </Shell>
        );
    }
    if (panel === 'ledger') {
        return (
            <Shell title="The Ledger" accent="text-amber-200" onClose={onClose} full>
                <div className="h-full overflow-y-auto p-4">
                    <HutLedger characterName={characterName} />
                </div>
            </Shell>
        );
    }
    if (panel === 'offering') {
        return (
            <Shell title="The Offering" accent="text-amber-300" onClose={onClose} full>
                <div className="h-full overflow-y-auto p-4">
                    <DonationSection variant="hut" />
                </div>
            </Shell>
        );
    }
    if (panel === 'cineworks') {
        return (
            <Shell title="Cineworks" accent="text-violet-200" onClose={onClose} full>
                <CineworksClient />
            </Shell>
        );
    }
    if (panel === 'codex') {
        return (
            <FramePanel
                title="Codex"
                accent="text-fuchsia-300"
                src="/codex?embed=1"
                blurb="Memory and whispers."
                onClose={onClose}
            />
        );
    }
    return null;
}
