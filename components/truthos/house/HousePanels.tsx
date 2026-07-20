'use client';

/**
 * House station panels — one object → one feature.
 * Truth never opens here — only via Truth.OS on the computer.
 */
import dynamic from 'next/dynamic';
import { useHouseUi, type HousePanelId } from './houseUiStore';
import SoulPanel from '@/components/hut3d/hud/SoulPanel';
import StudioPanel from './StudioPanel';
import CinemaPanel from './CinemaPanel';
import { useGameStore } from '@/lib/store/useGameStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { hubAudio } from '@/lib/truthos/hubAudio';

const ArcadeLobby = dynamic(() => import('@/components/game/arcade/ArcadeLobby'), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-cyan-400/60 font-mono text-xs tracking-widest">
            loading arcade…
        </div>
    ),
});

const PANEL_META: Record<
    Exclude<HousePanelId, 'soul' | 'studio' | 'wayfinder' | 'arcade' | 'cinema'>,
    { title: string; accent: string; src: string; blurb: string }
> = {
    library: {
        title: 'Library',
        accent: 'text-violet-300',
        src: '/library',
        blurb: 'Scrolls and sealed texts.',
    },
    codex: {
        title: 'Codex',
        accent: 'text-fuchsia-300',
        src: '/codex',
        blurb: 'Memory and whispers.',
    },
    hall: {
        title: 'The Hall',
        accent: 'text-sky-300',
        src: '/archive',
        blurb: 'Voices gather.',
    },
    offering: {
        title: 'The Offering',
        accent: 'text-amber-300',
        src: '/support',
        blurb: 'Sustain the work.',
    },
    ledger: {
        title: 'The Ledger',
        accent: 'text-amber-200',
        src: '/archive',
        blurb: 'Daily word and dispatches.',
    },
};

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
    id,
    onClose,
}: {
    id: keyof typeof PANEL_META;
    onClose: () => void;
}) {
    const meta = PANEL_META[id];
    return (
        <Shell title={meta.title} accent={meta.accent} onClose={onClose} full>
            <p className="absolute top-0 inset-x-0 z-10 px-4 py-2 text-[11px] text-white/50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                {meta.blurb}
            </p>
            <iframe
                title={meta.title}
                src={meta.src}
                className="absolute inset-0 w-full h-full border-0 bg-black"
                allow="autoplay; fullscreen"
            />
        </Shell>
    );
}

function WayfinderNative({ onClose }: { onClose: () => void }) {
    return (
        <Shell title="Wall map · Roads" accent="text-emerald-300" onClose={onClose}>
            <div className="p-6 space-y-5 overflow-y-auto h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl border border-amber-400/30 bg-amber-500/10 flex items-center justify-center text-2xl">
                    🛤
                </div>
                <div className="space-y-2 max-w-sm">
                    <p className="text-[10px] uppercase tracking-[0.35em] font-mono text-amber-300/80">
                        Temporarily down
                    </p>
                    <h3 className="text-xl font-semibold text-white">Roads offline</h3>
                    <p className="text-sm text-white/55 leading-relaxed">
                        The wall map is under maintenance. Destinations and wayfinding will return soon.
                        Walk the house, boot Truth.OS, or open the Library while we re-route.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 px-6 py-2.5 rounded-xl border border-white/15 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:text-white hover:border-white/30"
                >
                    Back to house
                </button>
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
        </div>
    );
}

export default function HousePanels() {
    const panel = useHouseUi((s) => s.panel);
    const closePanel = useHouseUi((s) => s.closePanel);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);

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
    if (panel in PANEL_META) {
        return <FramePanel id={panel as keyof typeof PANEL_META} onClose={onClose} />;
    }
    return null;
}
