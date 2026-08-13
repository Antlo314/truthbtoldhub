'use client';

import { useEffect, useState } from 'react';
import { useHouseUi } from './houseUiStore';
import { loadSettings, saveSettings } from '@/lib/game/settings';
import { sacredUi } from '@/lib/game/sacredUiSfx';

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
            <div className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-[#0c0a14]/95 shadow-2xl overflow-hidden">
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

/** Seed look feel from settings once the chamber mounts. */
export function hydrateLookFeel() {
    const s = loadSettings();
    useHouseUi.getState().setLookFeel({
        invert: !!s.lookInvert,
        sens: Number.isFinite(s.lookSens) ? Math.min(1.6, Math.max(0.6, s.lookSens)) : 1,
    });
}
