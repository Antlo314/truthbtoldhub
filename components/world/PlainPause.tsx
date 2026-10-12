'use client';

/**
 * Pause on the plain: back to walking, the map, the camera and quality,
 * the look feel, the road home, the Lair door and the terminal.
 */
import { useHouseUi } from '@/components/truthos/house/houseUiStore';
import { saveSettings } from '@/lib/game/settings';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { QUALITY_LABELS, type QualitySetting } from '@/components/truthos/house/renderQuality';
import { EMOTES } from '@/components/truthos/house/Vessel';
import { levelProgress, QUESTS, titleFor, type WorldProgress } from '@/lib/world/quests';
import { savePlainView } from './plainView';
import { setAllSound, soundOn } from '@/components/sanctum/SoundToggle';
import { useEffect, useState } from 'react';

const QUALITY_CHOICES: QualitySetting[] = ['auto', 'ultra', 'high', 'balanced', 'low'];

export default function PlainPause({
    mobile,
    world,
    onMap,
    onLair,
    onTerminal,
    guest = false,
    onSignIn,
}: {
    mobile: boolean;
    guest?: boolean;
    onSignIn?: () => void;
    world: WorldProgress;
    onMap: () => void;
    onLair: () => void;
    onTerminal: () => void;
}) {
    const paused = useHouseUi((s) => s.paused);
    const setPaused = useHouseUi((s) => s.setPaused);
    const requestRecenter = useHouseUi((s) => s.requestRecenter);
    const lookInvert = useHouseUi((s) => s.lookInvert);
    const lookSens = useHouseUi((s) => s.lookSens);
    const setLookFeel = useHouseUi((s) => s.setLookFeel);
    const view = useHouseUi((s) => s.view);
    const setView = useHouseUi((s) => s.setView);
    const quality = useHouseUi((s) => s.quality);
    const setQuality = useHouseUi((s) => s.setQuality);
    const qualityDrop = useHouseUi((s) => s.qualityDrop);
    const [sound, setSound] = useState(true);
    useEffect(() => {
        if (paused) setSound(soundOn());
    }, [paused]);
    if (!paused) return null;

    const persistLook = (invert: boolean, sens: number) => {
        setLookFeel({ invert, sens });
        saveSettings({ lookInvert: invert, lookSens: sens });
    };
    const lp = levelProgress(world.xp);
    const done = QUESTS.filter((q) => world.quests[q.id]?.done).length;

    return (
        <div className="fixed inset-0 z-[72] flex items-end justify-center p-4 sm:items-center">
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Continue" onClick={() => setPaused(false)} />
            <div className="relative max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/15 bg-[#0c0a14]/95 shadow-2xl">
                <div className="px-5 pb-2 pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber-300/80">The Aether Plain</p>
                    <h2 className="mt-0.5 text-lg font-semibold text-white">
                        Level {lp.level} · {titleFor(lp.level)}
                    </h2>
                    <p className="text-[12px] text-white/45">
                        {world.xp} xp · {done} of {QUESTS.length} quests done · {world.found.length} places found
                    </p>
                </div>
                <div className="flex flex-col gap-1.5 px-4 pb-4">
                    <Btn label="Continue" hint={mobile ? undefined : 'Esc'} onClick={() => setPaused(false)} />
                    {guest && onSignIn && (
                        <Btn
                            label="Sign in to keep your progress"
                            onClick={() => {
                                setPaused(false);
                                onSignIn();
                            }}
                        />
                    )}
                    <Btn
                        label="Map"
                        hint={mobile ? undefined : 'M'}
                        onClick={() => {
                            setPaused(false);
                            onMap();
                        }}
                    />
                    <div className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/80">
                        <div className="flex items-center justify-between gap-3">
                            <span>View</span>
                            {!mobile && <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">V</span>}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {(['third', 'first'] as const).map((v) => (
                                <Chip
                                    key={v}
                                    on={view === v}
                                    onClick={() => {
                                        sacredUi.click();
                                        setView(v);
                                        savePlainView(v);
                                    }}
                                >
                                    {v === 'first' ? 'Behind the eyes' : 'Behind the body'}
                                </Chip>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/80">
                        <div className="flex items-center justify-between gap-3">
                            <span>Quality</span>
                            {qualityDrop > 0 && <span className="text-[10px] text-amber-200/70">stepped down to keep the frame rate</span>}
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
                        <p className="mt-1.5 text-[11px] text-white/40">Higher draws more grass, farther, with clouds and sky light.</p>
                    </div>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/80">
                        <span>Sound</span>
                        <input
                            type="checkbox"
                            checked={sound}
                            onChange={(e) => {
                                setAllSound(e.target.checked);
                                setSound(e.target.checked);
                            }}
                            className="h-4 w-4 accent-emerald-400"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/80">
                        <span>Look invert</span>
                        <input type="checkbox" checked={lookInvert} onChange={(e) => persistLook(e.target.checked, lookSens)} className="h-4 w-4 accent-emerald-400" />
                    </label>
                    <label className="flex flex-col gap-1 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/80">
                        <span className="flex justify-between">
                            Look speed
                            <span className="font-mono text-[11px] text-white/45">{lookSens.toFixed(1)}</span>
                        </span>
                        <input type="range" min={0.6} max={1.6} step={0.1} value={lookSens} onChange={(e) => persistLook(lookInvert, Number(e.target.value))} className="w-full accent-emerald-400" />
                    </label>
                    {!mobile && (
                        <div className="rounded-xl border border-white/10 px-3 py-2.5 text-[12px] text-white/60">
                            <p className="mb-1 text-sm text-white/80">Hands</p>
                            <p>
                                {Object.values(EMOTES)
                                    .filter((e) => e.key)
                                    .map((e) => `${e.key} ${e.label}`)
                                    .join(' · ')}
                            </p>
                            <p className="mt-1 text-white/40">E talks and takes · Shift runs · Space jumps · Enter speaks · M map</p>
                        </div>
                    )}
                    <Btn
                        label="Back to the gate"
                        onClick={() => {
                            sacredUi.click();
                            requestRecenter();
                        }}
                    />
                    <Btn
                        label="Enter the Lair"
                        onClick={() => {
                            sacredUi.access();
                            setPaused(false);
                            onLair();
                        }}
                    />
                    <Btn
                        label="← Truth.OS"
                        onClick={() => {
                            sacredUi.access();
                            setPaused(false);
                            onTerminal();
                        }}
                    />
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
            className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-[11px] uppercase tracking-wider transition-colors ${
                on ? 'border-amber-300/50 bg-amber-400/15 text-amber-100' : 'border-white/12 bg-white/[0.03] text-white/60 hover:border-white/28 hover:text-white'
            }`}
        >
            {children}
        </button>
    );
}

function Btn({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={() => {
                sacredUi.click();
                onClick();
            }}
            className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-white hover:border-white/28 hover:bg-white/[0.06]"
        >
            <span>{label}</span>
            {hint && <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{hint}</span>}
        </button>
    );
}
