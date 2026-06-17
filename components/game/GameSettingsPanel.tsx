'use client';

import { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { loadSettings, saveSettings, applyMusicSetting, type GameSettings } from '@/lib/game/settings';
import RestartJourneyButton from '@/components/game/RestartJourneyButton';

interface Props {
    onClose: () => void;
    onChange?: (s: GameSettings) => void;
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-start justify-between gap-3 py-2 cursor-pointer">
            <div>
                <p className="text-sm text-white">{label}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{desc}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onChange(!on)}
                className={`shrink-0 w-10 h-6 rounded-full transition-colors ${on ? 'bg-aether-gold' : 'bg-zinc-700'}`}
            >
                <span className={`block w-4 h-4 rounded-full bg-white m-1 transition-transform ${on ? 'translate-x-4' : ''}`} />
            </button>
        </label>
    );
}

export default function GameSettingsPanel({ onClose, onChange }: Props) {
    const [s, setS] = useState<GameSettings>(loadSettings);
    const update = (patch: Partial<GameSettings>) => {
        const next = saveSettings(patch);
        setS(next);
        onChange?.(next);
    };

    return (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/90 p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-aether-gold" />
                        <h2 className="font-ritual text-lg">Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
                <Toggle label="Game music" desc="Ambient loops, combat themes, and story stings" on={s.music} onChange={(v) => { update({ music: v }); applyMusicSetting(v); }} />
                <Toggle label="Reduced motion" desc="Disable floating animations and Ken Burns effects" on={s.reducedMotion} onChange={(v) => update({ reducedMotion: v })} />
                <Toggle label="Haptic feedback" desc="Vibration on relic claims and combat hits" on={s.haptics} onChange={(v) => update({ haptics: v })} />
                <Toggle label="Minimap" desc="Show corner world map" on={s.showMinimap} onChange={(v) => update({ showMinimap: v })} />
                <Toggle label="Quest trail" desc="Golden waypoint toward active mission" on={s.showQuestTrail} onChange={(v) => update({ showQuestTrail: v })} />
                <Toggle label="Subtitles" desc="Show captions on cinematic videos" on={s.subtitles} onChange={(v) => update({ subtitles: v })} />
                <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-600">Controls</p>
                    <label className="block">
                        <span className="text-sm text-white">Control scheme</span>
                        <p className="text-[10px] text-zinc-500 mt-0.5 mb-1.5">Auto detects phone vs PC. Touch keeps on-screen joystick.</p>
                        <select
                            value={s.controlScheme}
                            onChange={(e) => update({ controlScheme: e.target.value as GameSettings['controlScheme'] })}
                            className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white"
                        >
                            <option value="auto">Auto (recommended)</option>
                            <option value="touch">Touch — joystick + buttons</option>
                            <option value="keyboard">Keyboard — WASD + keys</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-sm text-white">Touch control size</span>
                        <p className="text-[10px] text-zinc-500 mt-0.5 mb-1.5">Larger joystick and action buttons on mobile.</p>
                        <select
                            value={s.controlSize}
                            onChange={(e) => update({ controlSize: e.target.value as GameSettings['controlSize'] })}
                            className="w-full rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white"
                        >
                            <option value="normal">Normal</option>
                            <option value="large">Large (easier thumbs)</option>
                        </select>
                    </label>
                </div>
                <div className="mt-5 pt-4 border-t border-white/10">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-600 mb-2">Journey</p>
                    <RestartJourneyButton variant="danger" label="Start a New Soul" onRestart={onClose} />
                </div>
            </div>
        </div>
    );
}