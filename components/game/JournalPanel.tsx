'use client';

import { X, BookOpen } from 'lucide-react';
import { buildJournalSections, type JournalEntry, type JournalSection } from '@/lib/game/journal';
import type { GameCharacter } from '@/lib/store/useGameStore';

const CAT_COLOR: Record<JournalEntry['category'], string> = {
    lore: '#22d3ee',
    quest: '#a855f7',
    relic: '#fbbf24',
    path: '#10b981',
    truth: '#f97316',
};

const CAT_LABEL: Record<JournalEntry['category'], string> = {
    lore: 'Lore',
    quest: 'Mission',
    relic: 'Relic',
    path: 'Path',
    truth: 'Truth',
};

interface Props {
    character: GameCharacter;
    initiated: boolean;
    onClose: () => void;
}

function SectionDivider() {
    return (
        <div className="flex items-center gap-3 py-1" aria-hidden>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-aether-gold/35 to-transparent" />
            <div className="w-1.5 h-1.5 rotate-45 border border-aether-gold/50 bg-aether-gold/10 shrink-0" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-aether-gold/35 to-transparent" />
        </div>
    );
}

function SectionHeader({ section, index }: { section: JournalSection; index: number }) {
    return (
        <header className={index > 0 ? 'pt-2' : ''}>
            {index > 0 && <SectionDivider />}
            <div className="flex items-start justify-between gap-3 mb-3 mt-3">
                <div className="min-w-0 flex-1">
                    <h3 className="font-ritual text-base sm:text-lg text-white leading-tight text-balance break-words">
                        {section.title}
                    </h3>
                    <p className="text-[10px] text-zinc-500 leading-snug mt-1 text-balance break-words">
                        {section.subtitle}
                    </p>
                </div>
                <span className="shrink-0 text-[8px] font-mono uppercase tracking-widest text-aether-gold/70 tabular-nums pt-0.5">
                    {section.entries.length} {section.entries.length === 1 ? 'record' : 'records'}
                </span>
            </div>
        </header>
    );
}

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
    const accent = CAT_COLOR[entry.category];

    return (
        <article
            className="rounded-xl border border-white/[0.08] p-3.5 sm:p-4 bg-white/[0.02] hover:bg-white/[0.035] transition-colors"
            style={{ borderLeftWidth: 2, borderLeftColor: `${accent}55` }}
        >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                <span
                    className="shrink-0 text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded border"
                    style={{ color: accent, borderColor: `${accent}33`, background: `${accent}0d` }}
                >
                    {CAT_LABEL[entry.category]}
                </span>
                {entry.subtitle && (
                    <span className="text-[9px] text-zinc-500 leading-snug break-words text-pretty min-w-0">
                        {entry.subtitle}
                    </span>
                )}
            </div>

            <h4 className="font-ritual text-sm sm:text-[15px] text-white leading-snug break-words text-balance mb-1.5">
                {entry.title}
            </h4>

            {entry.detail && (
                <p
                    className="text-[10px] leading-snug mb-2 break-words text-pretty italic"
                    style={{ color: `${accent}bb` }}
                >
                    {entry.detail}
                </p>
            )}

            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed break-words text-pretty">
                {entry.body}
            </p>
        </article>
    );
}

export default function JournalPanel({ character, initiated, onClose }: Props) {
    const sections = buildJournalSections(character, initiated);
    const totalRecords = sections.reduce((n, s) => n + s.entries.length, 0);

    return (
        <div
            className="absolute inset-0 z-35 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[85dvh] overflow-hidden rounded-2xl border border-aether-gold/25 bg-black/92 flex flex-col shadow-[0_0_48px_rgba(251,191,36,0.08)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-white/10 bg-gradient-to-b from-aether-gold/[0.04] to-transparent">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="w-4 h-4 text-aether-gold shrink-0" />
                        <div className="min-w-0">
                            <h2 className="font-ritual text-lg text-white leading-tight">The Codex Journal</h2>
                            {totalRecords > 0 && (
                                <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] mt-0.5">
                                    {sections.length} {sections.length === 1 ? 'section' : 'sections'} · {totalRecords} records
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 shrink-0" aria-label="Close journal">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-5 py-4">
                    {sections.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic py-6 text-center">
                            Your journey has not yet been written. Walk, ask, and return — the Codex remembers.
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {sections.map((section, index) => (
                                <section key={section.id}>
                                    <SectionHeader section={section} index={index} />
                                    <div className="space-y-2.5 pb-2">
                                        {section.entries.map((entry) => (
                                            <JournalEntryCard key={entry.id} entry={entry} />
                                        ))}
                                    </div>
                                </section>
                            ))}
                            <SectionDivider />
                            <p className="text-center text-[8px] uppercase tracking-[0.35em] text-zinc-600 pt-2 pb-1">
                                End of recorded pages
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}