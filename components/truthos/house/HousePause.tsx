'use client';

import { useEffect, useState } from 'react';
import { useHouseUi } from './houseUiStore';
import { loadSettings, saveSettings } from '@/lib/game/settings';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { QUALITY_LABELS, type QualitySetting } from './renderQuality';
import { EMOTES } from './Vessel';

const QUALITY_CHOICES: QualitySetting[] = ['auto', 'ultra', 'high', 'balanced', 'low'];

export default function HousePause({
    mobile,
    onTerminal,
    onTour,
}: {
    mobile: boolean;
    onTerminal?: () => void;
    onTour: () => void;
}) {
    const paused = useHouseUi((s) => s.paused);
    const setPaused = useHouseUi((s) => s.setPaused);
    const openPanel = useHouseUi((s) => s.openPanel);
    const requestRecenter = useHouseUi((s) => s.requestRecenter);
    const requestFaceHome = useHouseUi((s) => s.requestFaceHome);
    const lookInvert = useHouseUi((s) => s.lookInvert);
    const lookSens = useHouseUi((s) => s.lookSens);
    const setLookFeel = useHouseUi((s) => s.setLookFeel);
    const view = useHouseUi((s) => s.view);
    const setView = useHouseUi((s) => s.setView);
    const quality = useHouseUi((s) => s.quality);
    const setQuality = useHouseUi((s) => s.setQuality);
    const qualityDrop = useHouseUi((s) => s.qualityDrop);
    const [lostLine, setLostLine] = useState<string | null>(null);

    useEffect(() => {
        if (!paused) setLostLine(null);
    }, [paused]);

    if (!paused) return null;

    const persistLook = (invert: boolean, sens: number) => {
        setLookFeel({ invert, sens });
        saveSettings({ lookInvert: invert, lookSens: sens });
    };

    return (
        <div className="fixed inset-0 z-[72] flex items-end sm:items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                aria-label="Continue"
                onClick={() => {
                    sacredUi.click();
                    setPaused(false);
                }}
            />
            <div className="relative w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0c0a14]/95 shadow-2xl">
                <div className="px-5 pt-4 pb-2">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-emerald-400/80 font-mono">Pause</p>
                    <h2 className="text-white font-semibold text-lg mt-0.5">The house holds.</h2>
                </div>
                <div className="px-4 pb-4 flex flex-col gap-1.5">
                    <PauseBtn
                        label="Continue"
                        hint={mobile ? undefined : 'Esc'}
                        onClick={() => {
                            sacredUi.click();
                            setPaused(false);
                        }}
                    />
                    <PauseBtn
                        label="Map"
                        hint={mobile ? undefined : 'M'}
                        onClick={() => {
                            sacredUi.click();
                            openPanel('wayfinder');
                        }}
                    />
                    <PauseBtn
                        label="Tour"
                        onClick={() => {
                            sacredUi.click();
                            setPaused(false);
                            onTour();
                        }}
                    />

                    {/* ── Camera ── */}
                    <div className="px-3 py-2.5 rounded-xl border border-white/10 text-sm text-white/80">
                        <div className="flex items-center justify-between gap-3">
                            <span>View</span>
                            {!mobile && <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">V</span>}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {(['first', 'third'] as const).map((v) => (
                                <Chip
                                    key={v}
                                    on={view === v}
                                    onClick={() => {
                                        sacredUi.click();
                                        setView(v);
                                        saveSettings({ view: v });
                                    }}
                                >
                                    {v === 'first' ? 'Behind the eyes' : 'Behind the body'}
                                </Chip>
                            ))}
                        </div>
                    </div>

                    {/* ── Quality ── */}
                    <div className="px-3 py-2.5 rounded-xl border border-white/10 text-sm text-white/80">
                        <div className="flex items-center justify-between gap-3">
                            <span>Quality</span>
                            {qualityDrop > 0 && (
                                <span className="text-[10px] text-amber-200/70">stepped down to keep the frame rate</span>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {QUALITY_CHOICES.map((q) => (
                                <Chip
                                    key={q}
                                    on={quality === q}
                                    onClick={() => {
                                        sacredUi.click();
                                        setQuality(q);
                                        saveSettings({ quality: q });
                                    }}
                                >
                                    {QUALITY_LABELS[q]}
                                </Chip>
                            ))}
                        </div>
                        <p className="mt-1.5 text-[11px] text-white/40">
                            Ultra and High: sharper edges, ambient shadow, live reflections and clouds. Low is the phone look.
                        </p>
                    </div>

                    <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-white/10 text-sm text-white/80">
                        <span>Look invert</span>
                        <input
                            type="checkbox"
                            checked={lookInvert}
                            onChange={(e) => persistLook(e.target.checked, lookSens)}
                            className="h-4 w-4 accent-emerald-400"
                        />
                    </label>
                    <label className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-white/10 text-sm text-white/80">
                        <span className="flex justify-between">
                            Look speed
                            <span className="font-mono text-[11px] text-white/45">{lookSens.toFixed(1)}</span>
                        </span>
                        <input
                            type="range"
                            min={0.6}
                            max={1.6}
                            step={0.1}
                            value={lookSens}
                            onChange={(e) => persistLook(lookInvert, Number(e.target.value))}
                            className="w-full accent-emerald-400"
                        />
                    </label>

                    {!mobile && (
                        <div className="px-3 py-2.5 rounded-xl border border-white/10 text-[12px] text-white/60">
                            <p className="text-white/80 text-sm mb-1">Hands</p>
                            <p>
                                {Object.values(EMOTES)
                                    .filter((e) => e.key)
                                    .map((e) => `${e.key} ${e.label}`)
                                    .join(' · ')}
                            </p>
                            <p className="mt-1 text-white/40">Shift runs · Space jumps · Enter speaks · the springs on the terrace throw you.</p>
                        </div>
                    )}

                    <PauseBtn
                        label="I’m lost"
                        onClick={() => {
                            sacredUi.click();
                            requestFaceHome();
                            setLostLine('Hall, then the foyer, then the door.');
                        }}
                    />
                    {lostLine && <p className="px-3 text-[12px] text-emerald-200/80">{lostLine}</p>}
                    <PauseBtn
                        label="Recenter"
                        hint="foyer"
                        onClick={() => {
                            sacredUi.click();
                            requestRecenter();
                        }}
                    />
                    {onTerminal && (
                        <PauseBtn
                            label="← Terminal"
                            onClick={() => {
                                sacredUi.access();
                                setPaused(false);
                                onTerminal();
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] uppercase tracking-wider border transition-colors min-h-[36px] ${
                on
                    ? 'bg-emerald-400/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-white/[0.03] border-white/12 text-white/60 hover:text-white hover:border-white/28'
            }`}
        >
            {children}
        </button>
    );
}

function PauseBtn({
    label,
    hint,
    onClick,
}: {
    label: string;
    hint?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-white/12 bg-white/[0.03] text-left text-sm text-white hover:border-white/28 hover:bg-white/[0.06] min-h-[44px]"
        >
            <span>{label}</span>
            {hint && <span className="text-[10px] uppercase tracking-widest text-white/35 font-mono">{hint}</span>}
        </button>
    );
}

/** Seed look feel, camera and quality from settings once the chamber mounts. */
export function hydrateLookFeel() {
    const s = loadSettings();
    const st = useHouseUi.getState();
    st.setLookFeel({
        invert: !!s.lookInvert,
        sens: Number.isFinite(s.lookSens) ? Math.min(1.6, Math.max(0.6, s.lookSens)) : 1,
    });
    st.setView(s.view === 'third' ? 'third' : 'first');
    st.setQuality(QUALITY_CHOICES.includes(s.quality) ? s.quality : 'auto');
}
