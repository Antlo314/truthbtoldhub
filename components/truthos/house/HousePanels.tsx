'use client';

/**
 * House station panels — hub sections only.
 * Truth is never opened here — only via Truth.OS on the computer.
 */
import { useHouseUi, type HousePanelId } from './houseUiStore';
import SoulPanel from '@/components/hut3d/hud/SoulPanel';
import { visionStats } from '@/lib/brand/visionProgress';
import { suggestNextRoad } from '@/lib/brand/nextRoad';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const PANEL_META: Record<
    Exclude<HousePanelId, 'soul' | 'forge' | 'wayfinder'>,
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
    cinema: {
        title: 'Cinema',
        accent: 'text-rose-300',
        src: '/cinema',
        blurb: 'Transmissions and film.',
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
}: {
    title: string;
    accent: string;
    onClose: () => void;
    children: React.ReactNode;
    full?: boolean;
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
    const stats = visionStats();
    const next = suggestNextRoad();
    const openPanel = useHouseUi((s) => s.openPanel);
    return (
        <Shell title="Wayfinder" accent="text-emerald-300" onClose={onClose}>
            <div className="p-5 space-y-4 overflow-y-auto h-full">
                <p className="text-sm text-white/70 leading-relaxed">
                    Only Eden is open while the garden is completed. Other ages remain sealed.
                </p>
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-2">
                    <p className="text-emerald-300 font-medium">Eden · first road</p>
                    <p className="text-xs text-zinc-500">
                        Visions {stats.seen}/{stats.total} · relics {stats.relics}
                    </p>
                    <p className="text-xs text-zinc-500">
                        Next signal: <span className="text-zinc-300">{next.label}</span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        sacredUi.click();
                        openPanel('cinema');
                    }}
                    className="w-full py-3 rounded-xl border border-emerald-400/35 text-emerald-100 text-sm uppercase tracking-[0.18em] hover:bg-emerald-500/10"
                >
                    Eden vision · cinema
                </button>
            </div>
        </Shell>
    );
}

function SoulNative({ onClose }: { onClose: () => void }) {
    return (
        <Shell title="Soul Mirror" accent="text-slate-300" onClose={onClose}>
            <SoulPanel onClose={onClose} />
        </Shell>
    );
}

function ForgePanel({ onClose }: { onClose: () => void }) {
    return (
        <Shell title="Vessel Forge" accent="text-cyan-300" onClose={onClose} full>
            <iframe
                title="Vessel Forge"
                src="/awakening/create"
                className="absolute inset-0 w-full h-full border-0 bg-black"
            />
        </Shell>
    );
}

export default function HousePanels() {
    const panel = useHouseUi((s) => s.panel);
    const closePanel = useHouseUi((s) => s.closePanel);

    if (!panel) return null;

    const onClose = () => {
        sacredUi.veilClose();
        closePanel();
    };

    if (panel === 'soul') return <SoulNative onClose={onClose} />;
    if (panel === 'forge') return <ForgePanel onClose={onClose} />;
    if (panel === 'wayfinder') return <WayfinderNative onClose={onClose} />;
    if (panel in PANEL_META) {
        return <FramePanel id={panel as keyof typeof PANEL_META} onClose={onClose} />;
    }
    return null;
}
