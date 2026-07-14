'use client';

/**
 * Signal Studio — modern brand station (replaces fantasy forge).
 * Support pulse, media, and identity tools for Truth B Told.
 */
import { SUPPORT_TIERS } from '@/lib/supportTiers';
import { sacredUi } from '@/lib/game/sacredUiSfx';

export default function StudioPanel({ onClose }: { onClose: () => void }) {
    return (
        <div className="flex flex-col h-full min-h-0 bg-[#0a0a12] text-white">
            <header className="shrink-0 px-5 pt-4 pb-3 border-b border-white/10">
                <p className="text-[10px] uppercase tracking-[0.35em] text-orange-300/80 font-bold font-mono">
                    Signal Studio
                </p>
                <h2 className="font-ritual text-2xl mt-1">Craft the pulse</h2>
                <p className="mt-1.5 text-sm text-white/50 leading-relaxed max-w-xl">
                    Modern tools for the work — sustain the hub, ship media, and keep your signal clear.
                    No fantasy weapons. Real support. Real transmission.
                </p>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6">
                <section className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Brand lanes</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <a
                            href="/support"
                            onClick={() => sacredUi.click()}
                            className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4 hover:bg-amber-500/10 transition-colors"
                        >
                            <p className="text-amber-200 font-medium">Sustain</p>
                            <p className="text-xs text-white/45 mt-1 leading-relaxed">
                                Fuel production, studio time, and the public roll.
                            </p>
                        </a>
                        <a
                            href="/cinema"
                            onClick={() => sacredUi.click()}
                            className="rounded-2xl border border-violet-400/30 bg-violet-500/5 p-4 hover:bg-violet-500/10 transition-colors"
                        >
                            <p className="text-violet-200 font-medium">Cinema</p>
                            <p className="text-xs text-white/45 mt-1 leading-relaxed">
                                Film, dispatches, and living transmissions.
                            </p>
                        </a>
                        <a
                            href="/archive"
                            onClick={() => sacredUi.click()}
                            className="rounded-2xl border border-sky-400/30 bg-sky-500/5 p-4 hover:bg-sky-500/10 transition-colors"
                        >
                            <p className="text-sky-200 font-medium">The Hall</p>
                            <p className="text-xs text-white/45 mt-1 leading-relaxed">
                                Community voice — rooms where people gather.
                            </p>
                        </a>
                        <a
                            href="/library"
                            onClick={() => sacredUi.click()}
                            className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/5 p-4 hover:bg-fuchsia-500/10 transition-colors"
                        >
                            <p className="text-fuchsia-200 font-medium">Library</p>
                            <p className="text-xs text-white/45 mt-1 leading-relaxed">
                                Texts and sealed work for the modern road.
                            </p>
                        </a>
                    </div>
                </section>

                <section className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Support tiers</p>
                    <div className="space-y-2">
                        {SUPPORT_TIERS.slice(0, 4).map((t) => {
                            const Icon = t.icon;
                            return (
                                <div
                                    key={t.tier}
                                    className={`rounded-xl border px-4 py-3 flex gap-3 items-start ${
                                        t.best
                                            ? 'border-amber-400/40 bg-amber-500/10'
                                            : 'border-white/10 bg-white/[0.03]'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white">
                                            {t.title}{' '}
                                            <span className="text-white/40 font-mono text-xs">{t.tier}</span>
                                        </p>
                                        <p className="text-xs text-white/45 mt-0.5">{t.tagline}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <a
                        href="/support"
                        onClick={() => sacredUi.click()}
                        className="block w-full text-center py-3 rounded-xl bg-aether-gold text-black text-sm font-semibold uppercase tracking-[0.18em]"
                    >
                        Open support
                    </a>
                </section>
            </div>

            <footer className="shrink-0 p-4 border-t border-white/10">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/15 text-sm uppercase tracking-[0.15em] text-white/70"
                >
                    Close
                </button>
            </footer>
        </div>
    );
}
