'use client';

import { useMemo } from 'react';
import { Check, Lock, MapPin, Sparkles } from 'lucide-react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { DEST_BY_POI } from '@/lib/game/destinations';
import { buildPortalBoard, nextPortalStepHint, type PortalBoardRow } from '@/lib/game/portalProgress';

interface Props {
    character: GameCharacter;
}

function StepPill({ label, done, accent, dimmed }: { label: string; done: boolean; accent: string; dimmed: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                dimmed ? 'opacity-40' : ''
            }`}
            style={{
                color: done ? accent : 'rgba(255,255,255,0.45)',
                borderColor: done ? `${accent}55` : 'rgba(255,255,255,0.1)',
                background: done ? `${accent}18` : 'rgba(255,255,255,0.03)',
            }}
        >
            {done ? <Check className="w-2.5 h-2.5 shrink-0" /> : <span className="w-2 h-2 rounded-full border border-white/20 shrink-0" />}
            {label}
        </span>
    );
}

function PortalRow({ row }: { row: PortalBoardRow }) {
    const hint = nextPortalStepHint(row);
    const dimmed = row.state === 'locked' || row.state === 'sealed';

    return (
        <article
            className={`rounded-xl border p-3.5 transition-colors ${
                row.focus ? 'border-aether-gold/35 bg-aether-gold/[0.05]' : 'border-white/[0.08] bg-white/[0.02]'
            }`}
            style={row.state === 'complete' ? { borderLeftWidth: 2, borderLeftColor: `${row.accent}88` } : undefined}
        >
            <div className="flex items-start gap-3">
                <div
                    className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 text-[10px] font-black tabular-nums"
                    style={{
                        color: row.state === 'complete' ? row.accent : row.focus ? '#fbbf24' : '#71717a',
                        borderColor: row.state === 'complete' ? `${row.accent}44` : 'rgba(255,255,255,0.1)',
                        background: `${row.accent}12`,
                    }}
                >
                    {row.state === 'locked' || row.state === 'sealed' ? (
                        <Lock className="w-3.5 h-3.5" />
                    ) : row.state === 'complete' ? (
                        <Check className="w-3.5 h-3.5" />
                    ) : (
                        row.order
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
                        <h4 className="text-sm text-white leading-tight truncate">{row.name}</h4>
                        <span
                            className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0"
                            style={{ color: row.accent, borderColor: `${row.accent}33`, background: `${row.accent}10` }}
                        >
                            {row.kind === 'portal' ? 'Portal' : 'Vault'}
                        </span>
                        {row.focus && (
                            <span className="text-[7px] font-black uppercase tracking-widest text-aether-gold shrink-0">
                                · Current road
                            </span>
                        )}
                    </div>
                    <p className="text-[9px] text-zinc-500 leading-snug mb-2">{row.era}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {row.steps.map((step) => (
                            <StepPill key={step.id} label={step.label} done={step.done} accent={row.accent} dimmed={dimmed} />
                        ))}
                    </div>
                    {hint && (
                        <p className={`text-[10px] mt-2 leading-relaxed ${row.focus ? 'text-aether-gold/80' : 'text-zinc-500'}`}>
                            {hint}
                        </p>
                    )}
                    {row.visited && row.state !== 'complete' && (
                        <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-1.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> Gate entered
                        </p>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function HutPortalBoard({ character }: Props) {
    const board = useMemo(() => buildPortalBoard(character), [character]);

    return (
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.07] via-black/35 to-black/50 p-4 mb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300/80" />
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-300/75">Portal Progression</p>
                    </div>
                    <p className="font-ritual text-base text-white leading-tight">The Five Roads</p>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                        Guardian, trial, riddle, relic — each age opens the next veil.
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className="font-ritual text-2xl text-cyan-100/90 tabular-nums">
                        {board.completedCount}<span className="text-zinc-600 text-lg">/{board.totalCount}</span>
                    </p>
                    <p className="text-[8px] uppercase tracking-widest text-zinc-600">gates cleared</p>
                </div>
            </div>

            {board.allComplete ? (
                <p className="text-sm text-emerald-300/90 leading-relaxed mb-3 italic">
                    Every gate stands open. The Source chamber awaits — return when you are ready to give it all back.
                </p>
            ) : board.focusId ? (
                <p className="text-[10px] text-aether-gold/75 mb-3 leading-relaxed">
                    Truth marks <strong className="text-aether-gold">{DEST_BY_POI[board.focusId]?.name.split('—')[0].trim() || 'the next gate'}</strong> as your current road.
                </p>
            ) : (
                <div className="rounded-xl border border-aether-gold/25 bg-aether-gold/[0.06] p-3 mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-aether-gold mb-1">The ages are being forged</p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                        Every road is veiled while we build it out — realms, guardians, trials, and relics are on the way.
                        For now, make this Hut your home: temper your arms at the Forge, study the Library, walk with the Offering,
                        and ask Truth what you will. Watch this space — the veils will part soon.
                    </p>
                </div>
            )}

            <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
                {board.rows.map((row) => (
                    <PortalRow key={row.poiId} row={row} />
                ))}
            </div>
        </div>
    );
}