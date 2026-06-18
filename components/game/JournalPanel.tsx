'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    X,
    BookOpen,
    Library,
    Sparkles,
    Compass,
    Flame,
    ScrollText,
    Swords,
    Sprout,
    Gem,
    Sun,
    Target,
    type LucideIcon,
} from 'lucide-react';
import {
    buildJournalSections,
    type JournalEntry,
    type JournalSection,
    type JournalSectionId,
} from '@/lib/game/journal';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { sfx } from '@/lib/game/sfx';

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

const CAT_ICON: Record<JournalEntry['category'], LucideIcon> = {
    lore: ScrollText,
    quest: Target,
    relic: Gem,
    path: Compass,
    truth: Flame,
};

/** Per-section tab chrome — short label, glyph, and accent. Lives here (not
 *  in journal.ts) so the data layer stays free of React/icon imports. */
const SECTION_UI: Record<JournalSectionId, { tab: string; icon: LucideIcon; accent: string }> = {
    origin: { tab: 'Origin', icon: Sparkles, accent: '#fbbf24' },
    roam: { tab: 'Roads', icon: Compass, accent: '#22d3ee' },
    truth_account: { tab: 'Truth', icon: Flame, accent: '#f97316' },
    missions: { tab: 'Missions', icon: ScrollText, accent: '#a855f7' },
    conquests: { tab: 'Conquests', icon: Swords, accent: '#f43f5e' },
    eden: { tab: 'Eden', icon: Sprout, accent: '#10b981' },
    relics: { tab: 'Relics', icon: Gem, accent: '#fbbf24' },
    epilogue: { tab: 'Return', icon: Sun, accent: '#c4b5fd' },
};

const ALL_TAB = 'all';
const ALL_ACCENT = '#fbbf24';
const TAB_FOCUS_RING =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#fbbf24]/70';

interface Props {
    character: GameCharacter;
    initiated: boolean;
    onClose: () => void;
}

function SectionDivider() {
    return (
        <div className="flex items-center gap-3 py-1" aria-hidden>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#fbbf24]/35 to-transparent" />
            <div className="w-1.5 h-1.5 rotate-45 border border-[#fbbf24]/50 bg-[#fbbf24]/10 shrink-0" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#fbbf24]/35 to-transparent" />
        </div>
    );
}

function SectionCrest({ id, size = 'sm' }: { id: JournalSectionId; size?: 'sm' | 'md' }) {
    const ui = SECTION_UI[id];
    const Icon = ui.icon;
    const box = size === 'md' ? 'w-8 h-8' : 'w-7 h-7';
    const glyph = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
    return (
        <div
            className={`grid place-items-center ${box} rounded-lg border shrink-0`}
            style={{ borderColor: `${ui.accent}40`, background: `${ui.accent}14` }}
        >
            <Icon className={glyph} style={{ color: ui.accent }} aria-hidden />
        </div>
    );
}

/** Header for the "All" overview — divider above every section but the first. */
function SectionHeader({ section, index }: { section: JournalSection; index: number }) {
    return (
        <header className={index > 0 ? 'pt-2' : ''}>
            {index > 0 && <SectionDivider />}
            <div className="flex items-start gap-2.5 mb-3 mt-3">
                <div className="pt-0.5">
                    <SectionCrest id={section.id} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-ritual text-base sm:text-lg text-white leading-tight text-balance break-words">
                        {section.title}
                    </h3>
                    <p className="text-[10px] text-zinc-500 leading-snug mt-0.5 text-balance break-words">
                        {section.subtitle}
                    </p>
                </div>
                <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest text-[#fbbf24]/80 tabular-nums pt-1">
                    {section.entries.length} {section.entries.length === 1 ? 'record' : 'records'}
                </span>
            </div>
        </header>
    );
}

/** Compact header shown when a single section is isolated by its tab. */
function SoloSectionHeader({ section }: { section: JournalSection }) {
    const ui = SECTION_UI[section.id];
    return (
        <header className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.06]">
            <SectionCrest id={section.id} size="md" />
            <div className="min-w-0 flex-1">
                <h3 className="font-ritual text-base sm:text-lg text-white leading-tight break-words">
                    {section.title}
                </h3>
                <p className="text-[10px] text-zinc-500 leading-snug mt-0.5 break-words">{section.subtitle}</p>
            </div>
            <span
                className="shrink-0 text-[9px] font-mono uppercase tracking-widest tabular-nums"
                style={{ color: `${ui.accent}cc` }}
            >
                {section.entries.length} {section.entries.length === 1 ? 'record' : 'records'}
            </span>
        </header>
    );
}

function TabButton({
    id,
    label,
    count,
    accent,
    Icon,
    active,
    onSelect,
}: {
    id: string;
    label: string;
    count: number;
    accent: string;
    Icon: LucideIcon;
    active: boolean;
    onSelect: (id: string) => void;
}) {
    return (
        <button
            role="tab"
            id={`codex-tab-${id}`}
            data-tab-id={id}
            aria-selected={active}
            aria-controls="codex-tabpanel"
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(id)}
            className={`group relative shrink-0 flex items-center gap-1.5 px-2.5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${TAB_FOCUS_RING} ${
                active ? '' : 'text-zinc-400 hover:text-zinc-100'
            }`}
            style={active ? { color: accent } : undefined}
        >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            <span>{label}</span>
            <span
                className="text-[9px] font-mono tabular-nums leading-none px-1 py-0.5 rounded-full border"
                style={
                    active
                        ? { color: accent, borderColor: `${accent}59`, background: `${accent}1f` }
                        : { color: '#a1a1aa', borderColor: 'rgba(255,255,255,0.20)' }
                }
            >
                {count}
            </span>
            {active && (
                <span
                    className="absolute bottom-0 left-1.5 right-1.5 h-0.5 rounded-full"
                    style={{ background: accent, boxShadow: `0 0 10px ${accent}aa` }}
                    aria-hidden
                />
            )}
        </button>
    );
}

function JournalEntryCard({ entry, index }: { entry: JournalEntry; index: number }) {
    const accent = CAT_COLOR[entry.category];
    const Icon = CAT_ICON[entry.category];

    return (
        <article
            className="journal-card-in group relative overflow-hidden rounded-xl border border-white/[0.08] p-3.5 sm:p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-px"
            style={{
                borderLeftWidth: 2,
                borderLeftColor: `${accent}66`,
                animationDelay: `${Math.min(index, 9) * 45}ms`,
            }}
        >
            {/* Accent bloom that warms on hover */}
            <div
                className="pointer-events-none absolute -left-10 -top-10 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `${accent}24` }}
                aria-hidden
            />

            <div className="relative">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                    <span
                        className="inline-flex items-center gap-1 shrink-0 text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded border"
                        style={{ color: accent, borderColor: `${accent}33`, background: `${accent}0d` }}
                    >
                        <Icon className="w-2.5 h-2.5" aria-hidden />
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
            </div>
        </article>
    );
}

export default function JournalPanel({ character, initiated, onClose }: Props) {
    const sections = useMemo(() => buildJournalSections(character, initiated), [character, initiated]);
    const totalRecords = sections.reduce((n, s) => n + s.entries.length, 0);
    const showTabs = sections.length > 1;
    const tabOrder = useMemo(() => [ALL_TAB, ...sections.map((s) => s.id)], [sections]);

    const [active, setActive] = useState<string>(ALL_TAB);
    // Guard against an active tab whose section no longer exists.
    const activeId = active !== ALL_TAB && sections.some((s) => s.id === active) ? active : ALL_TAB;
    const visibleSections = activeId === ALL_TAB ? sections : sections.filter((s) => s.id === activeId);

    const dialogRef = useRef<HTMLDivElement>(null);
    const tablistRef = useRef<HTMLDivElement>(null);

    // Escape closes; focus moves into the dialog on open and is restored on close.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    useEffect(() => {
        const opener = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
        dialogRef.current?.focus();
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onCloseRef.current();
        }
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, []);

    // Keep the active tab scrolled into view within the horizontal strip.
    useEffect(() => {
        const el = tablistRef.current?.querySelector<HTMLElement>(`[data-tab-id="${activeId}"]`);
        el?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    }, [activeId]);

    function selectTab(id: string) {
        if (id === activeId) return;
        setActive(id);
        sfx.pickup();
    }

    function focusTab(id: string) {
        tablistRef.current?.querySelector<HTMLButtonElement>(`[data-tab-id="${id}"]`)?.focus();
    }

    // Arrow / Home / End traversal across the tablist (roving tabindex).
    function onTablistKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        const i = tabOrder.indexOf(activeId);
        let next: string | null = null;
        if (e.key === 'ArrowRight') next = tabOrder[(i + 1) % tabOrder.length];
        else if (e.key === 'ArrowLeft') next = tabOrder[(i - 1 + tabOrder.length) % tabOrder.length];
        else if (e.key === 'Home') next = tabOrder[0];
        else if (e.key === 'End') next = tabOrder[tabOrder.length - 1];
        if (next && next !== activeId) {
            e.preventDefault();
            selectTab(next);
            focusTab(next);
        }
    }

    return (
        <div
            className="absolute inset-0 z-[35] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className="relative w-full max-w-lg max-h-[85dvh] overflow-hidden rounded-2xl border border-[#fbbf24]/25 bg-black/92 flex flex-col shadow-[0_0_48px_rgba(251,191,36,0.08)] focus:outline-none"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="The Codex Journal"
            >
                {/* Parchment-warm wash behind the whole codex */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.5]"
                    style={{
                        background:
                            'radial-gradient(120% 60% at 50% -10%, rgba(251,191,36,0.10), transparent 60%)',
                    }}
                    aria-hidden
                />

                {/* ── Header crest ── */}
                <header className="relative px-4 sm:px-5 py-4 border-b border-white/10 bg-gradient-to-b from-[#fbbf24]/[0.06] to-transparent">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#fbbf24]/50 to-transparent" />
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative grid place-items-center w-9 h-9 rounded-xl border border-[#fbbf24]/30 bg-[#fbbf24]/10 shrink-0">
                                <div className="codex-crest-glow absolute inset-0 rounded-xl shadow-[0_0_18px_rgba(251,191,36,0.35)]" />
                                <BookOpen className="relative w-4 h-4 text-[#fbbf24]" aria-hidden />
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-ritual text-lg sm:text-xl text-white leading-tight gold-shimmer">
                                    The Codex Journal
                                </h2>
                                <p className="text-[9px] text-zinc-500 uppercase tracking-[0.25em] mt-0.5">
                                    {totalRecords > 0
                                        ? `${sections.length} ${sections.length === 1 ? 'chapter' : 'chapters'} · ${totalRecords} ${totalRecords === 1 ? 'record' : 'records'}`
                                        : 'Awaiting your first page'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            aria-label="Close journal"
                        >
                            <X className="w-4 h-4" aria-hidden />
                        </button>
                    </div>
                </header>

                {/* ── Tab strip ── */}
                {showTabs && (
                    <div
                        ref={tablistRef}
                        role="tablist"
                        aria-label="Codex chapters"
                        aria-orientation="horizontal"
                        onKeyDown={onTablistKeyDown}
                        className="relative flex items-stretch gap-1 px-3 sm:px-4 border-b border-white/10 bg-black/40 overflow-x-auto scrollbar-hide"
                        style={{
                            maskImage: 'linear-gradient(to right, #000 calc(100% - 26px), transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 26px), transparent)',
                        }}
                    >
                        <TabButton
                            id={ALL_TAB}
                            label="All"
                            count={totalRecords}
                            accent={ALL_ACCENT}
                            Icon={Library}
                            active={activeId === ALL_TAB}
                            onSelect={selectTab}
                        />
                        {sections.map((s) => (
                            <TabButton
                                key={s.id}
                                id={s.id}
                                label={SECTION_UI[s.id].tab}
                                count={s.entries.length}
                                accent={SECTION_UI[s.id].accent}
                                Icon={SECTION_UI[s.id].icon}
                                active={activeId === s.id}
                                onSelect={selectTab}
                            />
                        ))}
                    </div>
                )}

                {/* ── Pages ── */}
                <div
                    className="relative flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-5 py-4"
                    id={showTabs ? 'codex-tabpanel' : undefined}
                    role={showTabs ? 'tabpanel' : undefined}
                    aria-labelledby={showTabs ? `codex-tab-${activeId}` : undefined}
                >
                    {sections.length === 0 ? (
                        <div className="flex flex-col items-center text-center py-10 px-4">
                            <div className="grid place-items-center w-12 h-12 rounded-2xl border border-[#fbbf24]/20 bg-[#fbbf24]/[0.06] mb-4">
                                <BookOpen className="w-5 h-5 text-[#fbbf24]/70" aria-hidden />
                            </div>
                            <p className="text-sm text-zinc-400 italic leading-relaxed max-w-xs">
                                Your journey has not yet been written. Walk, ask, and return — the Codex remembers.
                            </p>
                        </div>
                    ) : (
                        <div key={activeId} className="journal-tab-panel space-y-1">
                            {visibleSections.map((section, index) => (
                                <section key={section.id}>
                                    {activeId === ALL_TAB ? (
                                        <SectionHeader section={section} index={index} />
                                    ) : (
                                        <SoloSectionHeader section={section} />
                                    )}
                                    <div className="space-y-2.5 pb-2">
                                        {section.entries.map((entry, i) => (
                                            <JournalEntryCard key={entry.id} entry={entry} index={i} />
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
