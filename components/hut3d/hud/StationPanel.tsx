'use client';

import TruthPanel from './TruthPanel';
import SoulPanel from './SoulPanel';
import type { HutStationId } from '../hutUiStore';
import { useHouseUi, type HousePanelId } from '@/components/truthos/house/houseUiStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

function goHouse(panel: HousePanelId) {
    sacredUi.click();
    useHouseUi.getState().openPanel(panel);
}

export default function StationPanel({
    station,
    onClose,
}: {
    station: Exclude<HutStationId, null>;
    onClose: () => void;
}) {
    if (station === 'truth') return <TruthPanel onClose={onClose} />;
    if (station === 'soul') return <SoulPanel onClose={onClose} />;

    if (station === 'wayfinder') {
        return (
            <SimplePanel
                eyebrow="The Wayfinder"
                title="Eden — first road"
                accent="text-emerald-400"
                onClose={onClose}
            >
                <p className="text-sm text-white/70 leading-relaxed">
                    Other ages stay sealed until Eden is complete. Garden journeys stay on this Three.js build —
                    walk with Truth and shape your vessel.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-white/55">
                    <li className="flex gap-2"><span className="text-emerald-400">◈</span> Speak with Truth at the north dais</li>
                    <li className="flex gap-2"><span className="text-emerald-400">◈</span> Visit the Soul Mirror to forge appearance</li>
                    <li className="flex gap-2"><span className="text-emerald-400">◈</span> Eden expedition returns next</li>
                </ul>
                <button
                    type="button"
                    onClick={() => goHouse('cinema')}
                    className="mt-6 inline-flex w-full justify-center py-3 rounded-xl border border-emerald-400/30 text-emerald-200 text-sm uppercase tracking-[0.18em] hover:bg-emerald-500/10"
                >
                    Eden vision · in-house
                </button>
            </SimplePanel>
        );
    }

    if (station === 'ledger') {
        return (
            <SimplePanel
                eyebrow="The Ledger"
                title="Daily Word"
                accent="text-aether-gold"
                onClose={onClose}
            >
                <p className="text-sm text-white/70 leading-relaxed">
                    The hut ledger and community word live on the house spine of the sanctum.
                </p>
                <button
                    type="button"
                    onClick={() => goHouse('ledger')}
                    className="mt-6 inline-flex w-full justify-center py-3 rounded-xl bg-aether-gold/15 border border-aether-gold/35 text-aether-gold text-sm uppercase tracking-[0.18em] hover:bg-aether-gold/25"
                >
                    Open ledger · house
                </button>
            </SimplePanel>
        );
    }

    // sanctum
    return (
        <SimplePanel
            eyebrow="The Sanctum"
            title="Living community"
            accent="text-violet-300"
            onClose={onClose}
        >
            <p className="text-sm text-white/70 leading-relaxed">
                Beyond this door: the Hall, the Codex, and souls who walk the same road — all staged in-house.
            </p>
            <div className="mt-5 grid gap-2">
                {(
                    [
                        { panel: 'hall' as const, label: 'The Hall' },
                        { panel: 'codex' as const, label: 'The Codex' },
                        { panel: 'offering' as const, label: 'The Offering' },
                    ] as const
                ).map((l) => (
                    <button
                        key={l.panel}
                        type="button"
                        onClick={() => goHouse(l.panel)}
                        className="block w-full text-center py-3 px-4 rounded-xl border border-white/12 bg-white/[0.04] text-[0.8rem] uppercase tracking-[0.18em] text-white/75 hover:border-violet-400/45 hover:text-violet-200"
                    >
                        {l.label}
                    </button>
                ))}
            </div>
        </SimplePanel>
    );
}

function SimplePanel({
    eyebrow,
    title,
    accent,
    children,
    onClose,
}: {
    eyebrow: string;
    title: string;
    accent: string;
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="flex flex-col h-full min-h-0">
            <header className="shrink-0 px-5 pt-5 pb-3 border-b border-white/10">
                <p className={`text-[10px] uppercase tracking-[0.35em] font-bold ${accent}`}>{eyebrow}</p>
                <h2 className="font-ritual text-2xl text-white mt-1">{title}</h2>
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">{children}</div>
            <footer className="shrink-0 p-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/15 text-sm uppercase tracking-[0.2em] text-white/70 hover:text-white"
                >
                    Close
                </button>
            </footer>
        </div>
    );
}
