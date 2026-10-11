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
import { DESTINATIONS, mapOutline } from './homeMap';
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
    // Drawn LIVE from homeMap — the same tables the walls are built from
    // and the walker collides with. Move a chamber in the plan and it
    // moves here without anyone remembering to update a picture.
    // Map space is world space: x east, z south (down the page).
    const [, tick] = useState(0);
    useEffect(() => {
        const t = window.setInterval(() => tick((n) => n + 1), 250);
        return () => window.clearInterval(t);
    }, []);
    const pose = getWalkerPose();
    const visited = loadVisited();
    const map = mapOutline();
    const pts = (p: [number, number][]) => p.map(([x, z]) => `${x},${z}`).join(' ');
    const apseLabel: Record<string, string> = {
        terminal: 'TERMINAL', library: 'LIBRARY', codex: 'CODEX', arcade: 'ARCADE', ledger: 'LEDGER', mark: 'THE MARK', paths: 'PATHS',
    };
    return (
        <Shell title="Wall map · The Paths" accent="text-emerald-300" onClose={onClose}>
            <div className="p-4 h-full flex flex-col gap-3 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-emerald-300/80 text-center shrink-0">
                    One lair · every station
                </p>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                    <svg viewBox="-23 -17 46 58" className="max-h-full w-auto rounded-xl border border-white/10 bg-[#0b0d14]">
                        <rect x="-23" y="-17" width="46" height="58" fill="#0e1018" />
                        {/* the chambers and the gallery */}
                        {map.rooms.map((r) => {
                            const chamber = DESTINATIONS.find((d) => d.id === r.id);
                            const seen = chamber ? visited.has(chamber.id) : false;
                            return (
                                <g key={r.id}>
                                    <rect x={r.x0} y={r.z0} width={r.x1 - r.x0} height={r.z1 - r.z0} fill={chamber ? '#1a1a2c' : '#17172a'} stroke={seen ? '#34d399' : chamber ? '#fbbf24' : '#5a5878'} strokeWidth={0.5} />
                                    <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 - (chamber ? 0.6 : 0)} textAnchor="middle" fontSize={chamber ? 1.7 : 1.3} fill="#fde68a" fontFamily="monospace" fontWeight="bold">
                                        {r.name.replace(/^The /, '').toUpperCase()}
                                    </text>
                                    {chamber && (
                                        <text x={(r.x0 + r.x1) / 2} y={(r.z0 + r.z1) / 2 + 1.8} textAnchor="middle" fontSize={1.2} fill="#d6d3c4" fontFamily="monospace">
                                            {r.blurb}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        {map.doors.map((d) => (
                            <rect key={d.id} x={d.rect.x0} y={d.rect.z0} width={d.rect.x1 - d.rect.x0} height={d.rect.z1 - d.rect.z0} fill="#fbbf24" opacity={0.85} />
                        ))}
                        {/* the Sanctum and its apses */}
                        <polygon points={pts(map.octagon)} fill="#1c1a2e" stroke="#8a6f4d" strokeWidth={0.6} />
                        {map.apses.map((a) => {
                            const cx = a.pts.reduce((s, p) => s + p[0], 0) / 4;
                            const cz = a.pts.reduce((s, p) => s + p[1], 0) / 4;
                            return (
                                <g key={a.id}>
                                    <polygon points={pts(a.pts)} fill="#1c1a2e" stroke="#8a6f4d" strokeWidth={0.5} />
                                    <text x={cx} y={cz + 0.4} textAnchor="middle" fontSize={1.0} fill="#c9c2e6" fontFamily="monospace">
                                        {apseLabel[a.id]}
                                    </text>
                                </g>
                            );
                        })}
                        <polygon points={pts(map.arch)} fill="#fbbf24" opacity={0.85} />
                        <circle cx={0} cy={0} r={2.4} fill="#5b3fe6" opacity={0.8} />
                        <text x={0} y={0.5} textAnchor="middle" fontSize={1.2} fill="#ffffff" fontFamily="monospace">
                            SOURCE
                        </text>
                        {/* you */}
                        <polygon
                            points={`${pose.x},${pose.z - 1.4} ${pose.x - 0.9},${pose.z + 1.0} ${pose.x + 0.9},${pose.z + 1.0}`}
                            fill="#fbbf24"
                            transform={`rotate(${180 - (pose.yaw * 180) / Math.PI} ${pose.x} ${pose.z})`}
                        />
                        <circle cx={pose.x} cy={pose.z} r="0.5" fill="#111" />
                    </svg>
                </div>
                <p className="text-[10px] text-white/45 text-center leading-relaxed shrink-0">
                    Seven apses around the Source. Through the arch, the Processional: the
                    Cinema and the Hall Circle, then the Mirror Well and the Signal Studio,
                    and the Overlook at its end.
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
