'use client';

/**
 * Truth.OS — Journey.exe
 *
 * The soul's progress record, read live from real game state. Every count
 * comes from `useGameStore().character` / `useSoulStore().profile`, and every
 * denominator comes from a real world catalog (destinations, quests, scrolls,
 * minigames, clothing, hidden places, roam milestones, Truth's threads).
 * Nothing here is mocked — where no catalog exists for a set, the raw count
 * is shown with no invented total.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    Award,
    Check,
    ChevronRight,
    Compass,
    Crown,
    Eye,
    Flag,
    Footprints,
    Gamepad2,
    Gem,
    Hammer,
    Heart,
    Layers,
    Lock,
    MapPin,
    MessageCircle,
    Puzzle,
    ScrollText,
    Shield,
    Shirt,
    Sparkles,
    Star,
    Swords,
    Target,
} from 'lucide-react';

import { useGameStore, type GameCharacter } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

import { PATHS, PATH_BY_ID, type PathDef, type PathIcon, type SkillNode } from '@/lib/game/paths';
import {
    DESTINATIONS,
    DEST_BY_POI,
    ALL_RELIC_IDS,
    RELIC_BY_ID,
    type Destination,
} from '@/lib/game/destinations';
import {
    DESTINATION_ORDER,
    activeDestinationFocus,
    isDestinationComplete,
    isDestinationSealed,
    isDestinationUnlocked,
} from '@/lib/game/progression';
import { QUESTS, objectiveMet, objectiveProgress, questsAvailable, type Quest } from '@/lib/game/quests';
import { SCROLLS, SCROLL_BY_ID } from '@/lib/game/scrolls';
import { MINIGAME_BY_ID } from '@/lib/game/minigames';
import { CLOTHING, CLOTHING_BY_ID } from '@/lib/game/clothing';
import { HIDDEN_POIS, PATH_HIDDEN_POIS } from '@/lib/game/hiddenPois';
import { ROAM_MILESTONES, nextRoamMilestoneHint, visitedDestinations, wildShadeWinCount } from '@/lib/game/roamMilestones';
import { TRUTH_QUESTIONS, truthDepth, truthTrustLabel } from '@/lib/game/truthLore';
import { WEAPON_BY_ID } from '@/lib/game/weapons';
import { currentVitality, maxVitality } from '@/lib/game/vitality';

/* ─── Catalogs (computed once from the real definition modules) ─── */

const HIDDEN_PLACES = [...HIDDEN_POIS, ...PATH_HIDDEN_POIS];
const TRIAL_IDS = Object.keys(MINIGAME_BY_ID);
const PUZZLE_IDS: string[] = DESTINATIONS.flatMap((d) => (d.puzzle ? [d.puzzle.id] : []));
const GUARDIAN_IDS: string[] = DESTINATIONS.flatMap((d) => (d.combat ? [d.poiId] : []));
const QUEST_GIVERS: string[] = Array.from(new Set(QUESTS.map((q) => q.giver)));

const ACCENT = {
    amber: '#fbbf24',
    emerald: '#34d399',
    sky: '#38bdf8',
    violet: '#a78bfa',
    rose: '#fb7185',
    cyan: '#22d3ee',
} as const;

type TabId = 'record' | 'path' | 'next';

const TABS: { id: TabId; label: string }[] = [
    { id: 'record', label: 'Record' },
    { id: 'path', label: 'Path' },
    { id: 'next', label: 'Next' },
];

/* ─── Small pieces ───────────────────────────────────────── */

function pathGlyph(icon: PathIcon, className: string): ReactNode {
    if (icon === 'eye') return <Eye className={className} />;
    if (icon === 'shield') return <Shield className={className} />;
    if (icon === 'scroll') return <ScrollText className={className} />;
    return <Sparkles className={className} />;
}

function Ring({
    value,
    total,
    label,
    accent,
    icon,
}: {
    value: number;
    total: number;
    label: string;
    accent: string;
    icon: ReactNode;
}) {
    const pct = total > 0 ? Math.min(1, value / total) : 0;
    const circumference = 2 * Math.PI * 18;
    const done = total > 0 && value >= total;
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2.5 flex flex-col items-center gap-1">
            <div className="relative w-[54px] h-[54px] shrink-0">
                <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90" aria-hidden="true">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
                    <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke={accent}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - pct)}
                        opacity={pct === 0 ? 0.25 : 1}
                    />
                </svg>
                <span
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ color: pct === 0 ? 'rgba(255,255,255,0.22)' : accent }}
                >
                    {icon}
                </span>
            </div>
            <p className="text-[12px] tabular-nums font-semibold leading-none" style={{ color: done ? accent : '#e4e4e7' }}>
                {value}
                <span className="text-white/30 font-normal"> / {total}</span>
            </p>
            <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-500 text-center leading-tight">{label}</p>
        </div>
    );
}

function Bar({
    label,
    value,
    total,
    accent,
    icon,
    hint,
}: {
    label: string;
    value: number;
    total: number | null;
    accent: string;
    icon: ReactNode;
    hint?: string;
}) {
    const pct = total && total > 0 ? Math.min(1, value / total) : 0;
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <div className="flex items-center gap-2">
                <span className="shrink-0" style={{ color: accent }}>
                    {icon}
                </span>
                <p className="flex-1 min-w-0 text-[12px] text-white/85 truncate">{label}</p>
                <p className="shrink-0 text-[12px] tabular-nums text-white/90 font-semibold">
                    {value}
                    {total === null ? (
                        <span className="text-white/30 font-normal text-[10px]"> found</span>
                    ) : (
                        <span className="text-white/30 font-normal"> / {total}</span>
                    )}
                </p>
            </div>
            {total !== null && (
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${Math.round(pct * 100)}%`, background: accent }}
                    />
                </div>
            )}
            {hint && <p className="mt-1.5 text-[10px] text-zinc-500 leading-snug">{hint}</p>}
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <section className="space-y-2">
            <h4 className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-zinc-500 font-mono">
                <span className="text-zinc-600">{icon}</span>
                {title}
            </h4>
            {children}
        </section>
    );
}

function CheckPill({ label, done, accent }: { label: string; done: boolean; accent: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[9px] uppercase tracking-wider ${
                done ? 'border-transparent' : 'border-white/10 text-zinc-600'
            }`}
            style={done ? { color: accent, background: `${accent}1f`, borderColor: `${accent}55` } : undefined}
        >
            {done ? <Check className="w-2.5 h-2.5" /> : <span className="w-2.5 h-2.5 rounded-full border border-current" />}
            {label}
        </span>
    );
}

function Badge({ children, accent }: { children: ReactNode; accent: string }) {
    return (
        <span
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] uppercase tracking-[0.14em] font-semibold"
            style={{ color: accent, background: `${accent}1a`, border: `1px solid ${accent}44` }}
        >
            {children}
        </span>
    );
}

function EmptyLine({ children }: { children: ReactNode }) {
    return <p className="text-[11px] text-zinc-600 italic px-1 py-2">{children}</p>;
}

/* ─── Derived progress ───────────────────────────────────── */

interface AgeRow {
    id: string;
    name: string;
    era: string;
    accent: string;
    sealed: boolean;
    unlocked: boolean;
    complete: boolean;
    guardian: boolean;
    trial: boolean;
    riddle: boolean;
    relic: boolean;
}

function countOwned(catalog: string[], held: string[]): number {
    return catalog.filter((id) => held.includes(id)).length;
}

/** What is still outstanding at a destination — derived from its real sub-checks. */
function remainingText(age: AgeRow): string {
    const remaining: string[] = [];
    if (!age.guardian) remaining.push('fell the guardian');
    if (!age.trial) remaining.push('pass the trial');
    if (!age.riddle) remaining.push('answer the riddle');
    if (!age.relic) remaining.push('claim the relic');
    if (remaining.length === 0) return 'Everything here is done — the next gate is opening.';
    return `Still to do here — ${remaining.join(', ')}.`;
}

function buildAges(c: GameCharacter): AgeRow[] {
    return DESTINATION_ORDER.map((id) => {
        const d: Destination | undefined = DEST_BY_POI[id];
        const trials = c.minigamesCleared ?? [];
        return {
            id,
            name: d?.name ?? id,
            era: d?.era ?? '',
            accent: d?.accent ?? '#a1a1aa',
            sealed: isDestinationSealed(id),
            unlocked: isDestinationUnlocked(id, c),
            complete: isDestinationComplete(id, c),
            guardian: !d?.combat || c.cleared.includes(id),
            trial: !d?.minigame || trials.includes(d.minigame.id),
            riddle: !d?.puzzle || c.solved.includes(d.puzzle.id),
            relic: (d?.relics ?? []).every((r) => c.inventory.includes(r.id)),
        };
    });
}

/* ─── The app ────────────────────────────────────────────── */

export function JourneyApp() {
    const character = useGameStore((s) => s.character);
    const initiated = useGameStore((s) => s.initiated);
    const founderNumber = useGameStore((s) => s.founderNumber);
    const profile = useSoulStore((s) => s.profile);
    const fetchIdentity = useSoulStore((s) => s.fetchIdentity);

    const [tab, setTab] = useState<TabId>('record');
    const [openQuest, setOpenQuest] = useState<string | null>(null);

    useEffect(() => {
        void fetchIdentity();
    }, [fetchIdentity]);

    const stats = useMemo(() => {
        const c = character;
        const trials = c.minigamesCleared ?? [];
        const path: PathDef | null = c.path ? PATH_BY_ID[c.path] : null;

        const activeQuests: Quest[] = QUEST_GIVERS.flatMap((g) => questsAvailable(g, c));
        const readyToClaim = activeQuests.filter((q) => !c.questsClaimed.includes(q.id) && objectiveMet(q, c));
        const inFlight = activeQuests.filter((q) => !c.questsClaimed.includes(q.id) && !objectiveMet(q, c));

        const nextSkills: SkillNode[] = path
            ? path.skills.filter(
                  (s) => !c.skills.includes(s.id) && (s.requires ?? []).every((r) => c.skills.includes(r)),
              )
            : [];

        const max = maxVitality(c, founderNumber);
        const materials = c.materials ?? { iron: 0, copper: 0, cosmic: 0 };
        const stock: Record<string, number> = c.consumables ?? {};
        const tonics = Object.values(stock).reduce((a, b) => a + b, 0);

        const claimed = countOwned(
            QUESTS.map((q) => q.id),
            c.questsClaimed,
        );

        const ages = buildAges(c);
        const focusId: string | null = activeDestinationFocus(c);
        const focusAge = ages.find((a) => a.id === focusId) ?? null;

        const done =
            c.inventory.length +
            c.cleared.length +
            c.solved.length +
            c.scrolls.length +
            trials.length +
            claimed +
            c.skills.length;

        return {
            path,
            ages,
            relics: countOwned(ALL_RELIC_IDS, c.inventory),
            scrolls: countOwned(
                SCROLLS.map((s) => s.id),
                c.scrolls,
            ),
            guardians: countOwned(GUARDIAN_IDS, c.cleared),
            riddles: countOwned(PUZZLE_IDS, c.solved),
            trialsPassed: countOwned(TRIAL_IDS, trials),
            missions: claimed,
            threads: truthDepth(c),
            trust: truthTrustLabel(c),
            milestones: ROAM_MILESTONES.filter((m) => m.met(c)).length,
            hidden: HIDDEN_PLACES.filter((p) => c.discovered.includes(p.discoverId)).length,
            garments: countOwned(
                CLOTHING.map((g) => g.id),
                c.wardrobe,
            ),
            gatesWalked: visitedDestinations(c).length,
            shadeWins: wildShadeWinCount(c),
            hp: currentVitality(c, founderNumber, max),
            maxHp: max,
            materials,
            tonics,
            focusAge,
            readyToClaim,
            inFlight,
            nextSkills,
            nextMilestone: nextRoamMilestoneHint(c),
            missingRelics: ALL_RELIC_IDS.filter((id) => !c.inventory.includes(id)),
            missingScrolls: SCROLLS.filter((s) => !c.scrolls.includes(s.id)),
            hasProgress: done > 0,
        };
    }, [character, founderNumber]);

    const soulName = character.name?.trim() || profile?.display_name || 'Unnamed Soul';
    const pathAccent = stats.path?.color ?? ACCENT.amber;
    const hpPct = stats.maxHp > 0 ? Math.min(1, stats.hp / stats.maxHp) : 0;

    const pick = (id: TabId) => {
        setTab(id);
        sacredUi.click();
    };

    return (
        <div className="h-full min-h-0 flex flex-col bg-zinc-950 text-zinc-200">
            {/* Header */}
            <header className="shrink-0 px-3 pt-3 pb-2.5 border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
                <div className="flex items-start gap-2.5">
                    <div
                        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{
                            color: pathAccent,
                            background: `${pathAccent}1a`,
                            border: `1px solid ${pathAccent}44`,
                        }}
                    >
                        {stats.path ? pathGlyph(stats.path.icon, 'w-5 h-5') : <Compass className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-white font-semibold text-[15px] leading-tight truncate">
                            {soulName}
                            {profile?.pronouns && (
                                <span className="ml-1.5 text-[10px] font-normal text-zinc-600">{profile.pronouns}</span>
                            )}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-mono mt-0.5 truncate" style={{ color: pathAccent }}>
                            {stats.path ? stats.path.name : 'Path unchosen'}
                        </p>
                        {profile?.custom_title && (
                            <p className="text-[11px] italic text-amber-200/70 mt-1 truncate">{profile.custom_title}</p>
                        )}
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-600">Soul Power</p>
                        <p className="text-xl leading-none font-semibold text-white tabular-nums mt-1">
                            {profile ? profile.soul_power : '—'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {profile?.tier && <Badge accent={ACCENT.cyan}>{profile.tier}</Badge>}
                    {profile?.is_supporter && <Badge accent={ACCENT.amber}>Supporter</Badge>}
                    {founderNumber !== null && (
                        <Badge accent={ACCENT.amber}>
                            <Crown className="w-2.5 h-2.5" /> Founder #{founderNumber}
                        </Badge>
                    )}
                    {character.sourceReturned && (
                        <Badge accent={ACCENT.emerald}>
                            <Award className="w-2.5 h-2.5" /> Returned to the Source
                        </Badge>
                    )}
                    {!initiated && <Badge accent={ACCENT.rose}>Awakening unfinished</Badge>}
                </div>

                {/* Vitality */}
                <div className="mt-2.5">
                    <div className="flex items-center gap-2">
                        <Heart className="w-3 h-3 text-rose-400 shrink-0" />
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 flex-1">Vitality</p>
                        <p className="text-[11px] tabular-nums text-white/80">
                            {stats.hp}
                            <span className="text-white/30"> / {stats.maxHp}</span>
                        </p>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300 transition-[width] duration-500"
                            style={{ width: `${Math.round(hpPct * 100)}%` }}
                        />
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <nav className="shrink-0 flex border-b border-white/10">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => pick(t.id)}
                        className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors min-h-[42px] touch-manipulation ${
                            tab === t.id
                                ? 'text-amber-200 border-b-2 border-amber-400 bg-amber-500/5'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-4">
                {tab === 'record' && (
                    <>
                        {!stats.hasProgress && (
                            <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3.5 py-3">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300/80 font-mono">
                                    The record is blank
                                </p>
                                <p className="text-[12px] text-zinc-300 mt-1.5 leading-relaxed">
                                    Nothing has been written here yet — no relic, no guardian, no riddle. That is not a
                                    failure; it is a beginning. Walk the chamber once and this page starts filling itself.
                                </p>
                            </div>
                        )}

                        <Section title="The Ages" icon={<Layers className="w-3 h-3" />}>
                            <ul className="space-y-1.5">
                                {stats.ages.map((a) => (
                                    <li
                                        key={a.id}
                                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                                        style={a.complete ? { borderColor: `${a.accent}55`, background: `${a.accent}0f` } : undefined}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span
                                                className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{ background: a.complete ? a.accent : 'rgba(255,255,255,0.18)' }}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12px] text-white/90 font-medium truncate">{a.name}</p>
                                                {a.era && <p className="text-[10px] text-zinc-600 truncate">{a.era}</p>}
                                            </div>
                                            <span className="shrink-0 text-[9px] uppercase tracking-wider">
                                                {a.complete ? (
                                                    <span style={{ color: a.accent }}>Complete</span>
                                                ) : a.sealed ? (
                                                    <span className="text-zinc-600 inline-flex items-center gap-1">
                                                        <Lock className="w-2.5 h-2.5" /> Veiled
                                                    </span>
                                                ) : a.unlocked ? (
                                                    <span className="text-amber-300/80">Open</span>
                                                ) : (
                                                    <span className="text-zinc-600 inline-flex items-center gap-1">
                                                        <Lock className="w-2.5 h-2.5" /> Sealed
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <CheckPill label="Guardian" done={a.guardian} accent={a.accent} />
                                            <CheckPill label="Trial" done={a.trial} accent={a.accent} />
                                            <CheckPill label="Riddle" done={a.riddle} accent={a.accent} />
                                            <CheckPill label="Relic" done={a.relic} accent={a.accent} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Section>

                        <Section title="Gathered" icon={<Gem className="w-3 h-3" />}>
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-1.5">
                                <Ring
                                    value={stats.relics}
                                    total={ALL_RELIC_IDS.length}
                                    label="Relics"
                                    accent={ACCENT.amber}
                                    icon={<Gem className="w-4 h-4" />}
                                />
                                <Ring
                                    value={stats.scrolls}
                                    total={SCROLLS.length}
                                    label="Scrolls"
                                    accent={ACCENT.violet}
                                    icon={<ScrollText className="w-4 h-4" />}
                                />
                                <Ring
                                    value={stats.guardians}
                                    total={GUARDIAN_IDS.length}
                                    label="Guardians"
                                    accent={ACCENT.rose}
                                    icon={<Swords className="w-4 h-4" />}
                                />
                                <Ring
                                    value={stats.riddles}
                                    total={PUZZLE_IDS.length}
                                    label="Riddles"
                                    accent={ACCENT.sky}
                                    icon={<Puzzle className="w-4 h-4" />}
                                />
                                <Ring
                                    value={stats.trialsPassed}
                                    total={TRIAL_IDS.length}
                                    label="Trials"
                                    accent={ACCENT.cyan}
                                    icon={<Gamepad2 className="w-4 h-4" />}
                                />
                                <Ring
                                    value={stats.missions}
                                    total={QUESTS.length}
                                    label="Missions"
                                    accent={ACCENT.emerald}
                                    icon={<Flag className="w-4 h-4" />}
                                />
                            </div>
                        </Section>

                        <Section title="The Road Walked" icon={<Footprints className="w-3 h-3" />}>
                            <div className="space-y-1.5">
                                <Bar
                                    label="Threads opened with Truth"
                                    value={stats.threads}
                                    total={TRUTH_QUESTIONS.length}
                                    accent={ACCENT.emerald}
                                    icon={<MessageCircle className="w-3.5 h-3.5" />}
                                    hint={`He knows you as: ${stats.trust}`}
                                />
                                <Bar
                                    label="Roads remembered"
                                    value={stats.milestones}
                                    total={ROAM_MILESTONES.length}
                                    accent={ACCENT.amber}
                                    icon={<Award className="w-3.5 h-3.5" />}
                                />
                                <Bar
                                    label="Hidden places found"
                                    value={stats.hidden}
                                    total={HIDDEN_PLACES.length}
                                    accent={ACCENT.cyan}
                                    icon={<MapPin className="w-3.5 h-3.5" />}
                                    hint="Grove, pool, wall, archive, stone — most stay unseen until a path opens them."
                                />
                                <Bar
                                    label="Wardrobe"
                                    value={stats.garments}
                                    total={CLOTHING.length}
                                    accent={ACCENT.violet}
                                    icon={<Shirt className="w-3.5 h-3.5" />}
                                />
                                <Bar
                                    label="Gates walked"
                                    value={stats.gatesWalked}
                                    total={DESTINATION_ORDER.length}
                                    accent={ACCENT.sky}
                                    icon={<Compass className="w-3.5 h-3.5" />}
                                />
                                <Bar
                                    label="Wild shades broken"
                                    value={stats.shadeWins}
                                    total={null}
                                    accent={ACCENT.rose}
                                    icon={<Swords className="w-3.5 h-3.5" />}
                                    hint="No ceiling on this one — the cavern always sends more."
                                />
                            </div>
                        </Section>

                        <Section title="Satchel" icon={<Hammer className="w-3 h-3" />}>
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(70px,1fr))] gap-1.5">
                                {[
                                    { label: 'Iron', value: stats.materials.iron ?? 0 },
                                    { label: 'Copper', value: stats.materials.copper ?? 0 },
                                    { label: 'Cosmic', value: stats.materials.cosmic ?? 0 },
                                    { label: 'Tonics', value: stats.tonics },
                                ].map((m) => (
                                    <div key={m.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                                        <p className="text-[8px] uppercase tracking-widest text-zinc-600">{m.label}</p>
                                        <p className="text-base text-white/90 font-semibold tabular-nums mt-0.5">{m.value}</p>
                                    </div>
                                ))}
                            </div>
                            <ul className="space-y-1">
                                {[
                                    { slot: 'Weapon', name: character.equipped.weapon ? WEAPON_BY_ID[character.equipped.weapon]?.name : null },
                                    { slot: 'Garment', name: character.equipped.clothing ? CLOTHING_BY_ID[character.equipped.clothing]?.name : null },
                                    { slot: 'Relic', name: character.equipped.relic ? RELIC_BY_ID[character.equipped.relic]?.name : null },
                                    { slot: 'Scroll', name: character.equipped.scroll ? SCROLL_BY_ID[character.equipped.scroll]?.name : null },
                                ].map((e) => (
                                    <li
                                        key={e.slot}
                                        className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2"
                                    >
                                        <span className="text-[9px] uppercase tracking-widest text-zinc-600 w-14 shrink-0">
                                            {e.slot}
                                        </span>
                                        <span className={`text-[11px] truncate ${e.name ? 'text-white/85' : 'text-zinc-600 italic'}`}>
                                            {e.name ?? 'empty'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    </>
                )}

                {tab === 'path' && (
                    <>
                        {stats.path ? (
                            <>
                                <div
                                    className="rounded-xl px-3.5 py-3"
                                    style={{ background: `${pathAccent}12`, border: `1px solid ${pathAccent}44` }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span style={{ color: pathAccent }}>{pathGlyph(stats.path.icon, 'w-4 h-4')}</span>
                                        <p className="text-[13px] font-semibold text-white">{stats.path.name}</p>
                                    </div>
                                    <p className="text-[12px] text-zinc-300 mt-1.5 leading-relaxed">{stats.path.essence}</p>
                                    <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                        <span className="text-emerald-300/80">Strength · </span>
                                        {stats.path.power}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                        <span className="text-rose-300/80">Cost · </span>
                                        {stats.path.weakness}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                                        <p className="text-[8px] uppercase tracking-widest text-zinc-600">Attuned</p>
                                        <p className="text-lg text-white font-semibold tabular-nums mt-0.5">
                                            {character.skills.length}
                                            <span className="text-white/30 text-sm font-normal"> / {stats.path.skills.length}</span>
                                        </p>
                                    </div>
                                    <div
                                        className="rounded-xl px-3 py-2.5"
                                        style={
                                            character.skillPoints > 0
                                                ? { background: `${ACCENT.amber}14`, border: `1px solid ${ACCENT.amber}55` }
                                                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }
                                        }
                                    >
                                        <p className="text-[8px] uppercase tracking-widest text-zinc-600">Points to spend</p>
                                        <p
                                            className="text-lg font-semibold tabular-nums mt-0.5 flex items-center gap-1.5"
                                            style={{ color: character.skillPoints > 0 ? ACCENT.amber : '#fff' }}
                                        >
                                            {character.skillPoints > 0 && <Sparkles className="w-3.5 h-3.5" />}
                                            {character.skillPoints}
                                        </p>
                                    </div>
                                </div>

                                <Section title="The Ladder" icon={<Star className="w-3 h-3" />}>
                                    <ul className="space-y-1.5">
                                        {stats.path.skills.map((s) => {
                                            const learned = character.skills.includes(s.id);
                                            const open = !learned && (s.requires ?? []).every((r) => character.skills.includes(r));
                                            return (
                                                <li
                                                    key={s.id}
                                                    className="rounded-xl border px-3 py-2.5"
                                                    style={
                                                        learned
                                                            ? { borderColor: `${pathAccent}55`, background: `${pathAccent}12` }
                                                            : open
                                                              ? { borderColor: `${ACCENT.amber}44`, background: `${ACCENT.amber}0d` }
                                                              : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }
                                                    }
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="shrink-0" style={{ color: learned ? pathAccent : '#52525b' }}>
                                                            {learned ? (
                                                                <Check className="w-3.5 h-3.5" />
                                                            ) : open ? (
                                                                <ChevronRight className="w-3.5 h-3.5 text-amber-300" />
                                                            ) : (
                                                                <Lock className="w-3 h-3" />
                                                            )}
                                                        </span>
                                                        <p
                                                            className={`text-[12px] flex-1 min-w-0 truncate ${
                                                                learned ? 'text-white/90 font-medium' : open ? 'text-amber-100/90' : 'text-zinc-600'
                                                            }`}
                                                        >
                                                            {s.name}
                                                        </p>
                                                        <span className="shrink-0 text-[8px] uppercase tracking-widest text-zinc-600">
                                                            {s.kind}
                                                        </span>
                                                    </div>
                                                    <p
                                                        className={`text-[11px] mt-1 leading-snug ${
                                                            learned || open ? 'text-zinc-400' : 'text-zinc-700'
                                                        }`}
                                                    >
                                                        {s.desc}
                                                    </p>
                                                    {s.combat && (
                                                        <p className="text-[10px] mt-1 font-mono" style={{ color: learned ? pathAccent : '#52525b' }}>
                                                            {s.combat.label}
                                                        </p>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </Section>
                            </>
                        ) : (
                            <>
                                <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3.5 py-3">
                                    <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300/80 font-mono">
                                        No road chosen
                                    </p>
                                    <p className="text-[12px] text-zinc-300 mt-1.5 leading-relaxed">
                                        Four roads lead back to the Source. Until one is walked, no skill can be attuned —
                                        you hold {character.skillPoints} point{character.skillPoints === 1 ? '' : 's'} with
                                        nowhere to spend {character.skillPoints === 1 ? 'it' : 'them'}.
                                    </p>
                                </div>
                                <Section title="The Four Paths" icon={<Star className="w-3 h-3" />}>
                                    <ul className="space-y-1.5">
                                        {PATHS.map((p) => (
                                            <li
                                                key={p.id}
                                                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span style={{ color: p.color }}>{pathGlyph(p.icon, 'w-3.5 h-3.5')}</span>
                                                    <p className="text-[12px] text-white/90 font-medium flex-1 min-w-0 truncate">
                                                        {p.name}
                                                    </p>
                                                    <span className="text-[9px] uppercase tracking-widest text-zinc-600 shrink-0">
                                                        {p.skills.length} skills
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{p.essence}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </Section>
                            </>
                        )}
                    </>
                )}

                {tab === 'next' && (
                    <>
                        {!initiated && (
                            <div className="rounded-xl border border-rose-400/25 bg-rose-500/[0.07] px-3.5 py-3">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-rose-300/80 font-mono">First of all</p>
                                <p className="text-[12px] text-zinc-300 mt-1.5 leading-relaxed">
                                    The Awakening is unfinished. Nothing in the world will move until the soul is named and
                                    the threshold crossed.
                                </p>
                            </div>
                        )}

                        {stats.focusAge && (
                            <Section title="Focus" icon={<Target className="w-3 h-3" />}>
                                <div
                                    className="rounded-xl px-3.5 py-3"
                                    style={{
                                        background: `${stats.focusAge.accent}12`,
                                        border: `1px solid ${stats.focusAge.accent}44`,
                                    }}
                                >
                                    <p className="text-[12px] font-semibold text-white">{stats.focusAge.name}</p>
                                    {stats.focusAge.era && (
                                        <p className="text-[10px] text-zinc-500 mt-0.5">{stats.focusAge.era}</p>
                                    )}
                                    <p className="text-[11px] text-zinc-300 mt-2 leading-relaxed">
                                        {remainingText(stats.focusAge)}
                                    </p>
                                </div>
                            </Section>
                        )}

                        {stats.readyToClaim.length > 0 && (
                            <Section title="Ready to claim" icon={<Flag className="w-3 h-3" />}>
                                <ul className="space-y-1.5">
                                    {stats.readyToClaim.map((q) => (
                                        <li key={q.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOpenQuest(openQuest === q.id ? null : q.id);
                                                    sacredUi.click();
                                                }}
                                                className="w-full text-left rounded-xl border border-emerald-400/35 bg-emerald-500/[0.09] px-3 py-2.5 min-h-[46px] touch-manipulation hover:bg-emerald-500/[0.14] transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                                    <p className="text-[12px] text-white/90 font-medium flex-1 min-w-0 truncate">
                                                        {q.title}
                                                    </p>
                                                    <span className="text-[9px] uppercase tracking-wider text-emerald-300/80 shrink-0">
                                                        +{q.reward.skillPoints} pt
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-emerald-200/60 mt-0.5">
                                                    Speak to {q.giverName} to take the reward
                                                </p>
                                                {openQuest === q.id && (
                                                    <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                                        {q.objectiveText}
                                                    </p>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {stats.inFlight.length > 0 && (
                            <Section title="Open missions" icon={<ChevronRight className="w-3 h-3" />}>
                                <ul className="space-y-1.5">
                                    {stats.inFlight.map((q) => (
                                        <li key={q.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOpenQuest(openQuest === q.id ? null : q.id);
                                                    sacredUi.click();
                                                }}
                                                className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 min-h-[46px] touch-manipulation hover:bg-white/[0.06] transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[12px] text-white/85 flex-1 min-w-0 truncate">{q.title}</p>
                                                    <span className="text-[10px] tabular-nums text-amber-200/80 shrink-0">
                                                        {objectiveProgress(q, character)}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{q.giverName}</p>
                                                {openQuest === q.id && (
                                                    <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                                        {q.objectiveText}
                                                    </p>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {stats.nextSkills.length > 0 && character.skillPoints > 0 && (
                            <Section title="Attunements within reach" icon={<Sparkles className="w-3 h-3" />}>
                                <ul className="space-y-1.5">
                                    {stats.nextSkills.map((s) => (
                                        <li
                                            key={s.id}
                                            className="rounded-xl border px-3 py-2.5"
                                            style={{ borderColor: `${pathAccent}44`, background: `${pathAccent}0f` }}
                                        >
                                            <p className="text-[12px] text-white/90 font-medium">{s.name}</p>
                                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{s.desc}</p>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {stats.nextMilestone && (
                            <Section title="Next road to remember" icon={<Footprints className="w-3 h-3" />}>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                                    <p className="text-[12px] text-white/90 font-medium">{stats.nextMilestone.title}</p>
                                    <p className="text-[10px] text-zinc-600 mt-0.5">{stats.nextMilestone.subtitle}</p>
                                    <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">{stats.nextMilestone.body}</p>
                                </div>
                            </Section>
                        )}

                        {stats.missingRelics.length > 0 && (
                            <Section title="Relics still out there" icon={<Gem className="w-3 h-3" />}>
                                <ul className="space-y-1">
                                    {stats.missingRelics.map((id) => {
                                        const r = RELIC_BY_ID[id];
                                        return (
                                            <li
                                                key={id}
                                                className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2"
                                            >
                                                <Gem className="w-3 h-3 text-zinc-600 shrink-0" />
                                                <span className="text-[11px] text-zinc-400 flex-1 min-w-0 truncate">
                                                    {r?.name ?? id}
                                                </span>
                                                <span className="text-[9px] text-zinc-600 shrink-0 truncate max-w-[40%]">
                                                    {r?.from ?? ''}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Section>
                        )}

                        {stats.missingScrolls.length > 0 && (
                            <Section title="Scrolls unwritten" icon={<ScrollText className="w-3 h-3" />}>
                                <ul className="space-y-1">
                                    {stats.missingScrolls.map((s) => (
                                        <li
                                            key={s.id}
                                            className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2"
                                        >
                                            <ScrollText className="w-3 h-3 text-zinc-600 shrink-0" />
                                            <span className="text-[11px] text-zinc-400 flex-1 min-w-0 truncate">{s.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {initiated &&
                            !stats.focusAge &&
                            stats.readyToClaim.length === 0 &&
                            stats.inFlight.length === 0 &&
                            !stats.nextMilestone &&
                            stats.missingRelics.length === 0 &&
                            stats.missingScrolls.length === 0 && (
                                <EmptyLine>
                                    Nothing is left undone that this record can see. The way back to the Source is open.
                                </EmptyLine>
                            )}
                    </>
                )}
            </div>
        </div>
    );
}

export default JourneyApp;
