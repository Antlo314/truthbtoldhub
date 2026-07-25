'use client';

/**
 * Truth.OS — Vault.exe
 *
 * The soul's satchel rendered as a desktop app. Every id held in the game
 * store is resolved through the REAL catalogs so the player never sees a raw
 * id: relics + destination accents (lib/game/destinations.ts), scrolls
 * (lib/game/scrolls.ts), garments (lib/game/clothing.ts), hut tonics
 * (lib/game/consumables.ts) and the weapon ladder (lib/game/weapons.ts).
 * Combat figures use the same stack the fights use — combatRelicBonuses +
 * skillBonuses + founderBonuses + clothingBonus over maxVitality.
 *
 * READ-ONLY by design. Equipping, drinking and forging happen inside the
 * world itself; the vault only shows what the soul is carrying.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    FlaskConical,
    Gem,
    Hammer,
    Heart,
    ScrollText,
    Search,
    Shirt,
    Sparkles,
    Sword,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useGameStore } from '@/lib/store/useGameStore';
import { ALL_RELIC_IDS, DESTINATIONS, RELIC_BY_ID } from '@/lib/game/destinations';
import { SCROLL_BY_ID } from '@/lib/game/scrolls';
import { CLOTHING_BY_ID, clothingBonus } from '@/lib/game/clothing';
import {
    CONSUMABLE_BY_ID,
    HUT_CONSUMABLES,
    MAX_CONSUMABLE_STACK,
    formatConsumableEffect,
    formatMaterialCost,
} from '@/lib/game/consumables';
import { STARTER_WEAPON, WEAPON_BY_ID, WEAPON_TIERS } from '@/lib/game/weapons';
import { combatRelicBonuses, resonanceLabel, resonanceTier } from '@/lib/game/resonance';
import { skillBonuses } from '@/lib/game/paths';
import { founderBonuses } from '@/lib/game/founders';
import { currentVitality, maxVitality } from '@/lib/game/vitality';
import { sacredUi } from '@/lib/game/sacredUiSfx';

/* ─── model ──────────────────────────────────────────────── */

type TabId = 'items' | 'materials' | 'consumables' | 'wardrobe';
type EntryKind = 'relic' | 'scroll' | 'material' | 'consumable' | 'garment' | 'weapon';
type MaterialKey = 'iron' | 'copper' | 'cosmic';

interface MetaRow {
    label: string;
    value: string;
}

interface VaultEntry {
    key: string;
    kind: EntryKind;
    name: string;
    /** one-line grid caption */
    sub: string;
    desc: string;
    /** hex accent, sourced from the catalogs where one exists */
    accent: string;
    /** short stat line for equipped slots */
    stat?: string;
    qty?: number;
    equipped?: boolean;
    meta: MetaRow[];
}

const KIND_ICON: Record<EntryKind, LucideIcon> = {
    relic: Gem,
    scroll: ScrollText,
    material: Hammer,
    consumable: FlaskConical,
    garment: Shirt,
    weapon: Sword,
};

const KIND_LABEL: Record<EntryKind, string> = {
    relic: 'Relic',
    scroll: 'Scroll',
    material: 'Material',
    consumable: 'Tonic',
    garment: 'Garment',
    weapon: 'Weapon',
};

const HOME_TAB: Record<EntryKind, TabId | null> = {
    relic: 'items',
    scroll: 'items',
    material: 'materials',
    consumable: 'consumables',
    garment: 'wardrobe',
    weapon: null,
};

const SCROLL_ACCENT = '#38bdf8';
const GARMENT_FALLBACK = '#a78bfa';
const WEAPON_ACCENT: Record<string, string> = {
    staff: '#84cc16',
    blade: '#fb923c',
    sword: '#facc15',
};

/* Accents + puzzle titles derived from the destination catalog itself. */
const RELIC_ACCENT: Record<string, string> = {};
const GARMENT_ACCENT: Record<string, string> = {};
const PUZZLE_TITLE: Record<string, string> = {};
for (const dest of DESTINATIONS) {
    for (const r of dest.relics) RELIC_ACCENT[r.id] = dest.accent;
    if (dest.clothing) GARMENT_ACCENT[dest.clothing] = dest.accent;
    if (dest.puzzle) PUZZLE_TITLE[dest.puzzle.id] = dest.puzzle.title;
}

/**
 * Materials have no catalog of their own — the game stores three counters.
 * Names, colours and sources mirror the forge UI (components/game/WeaponForge);
 * everything else (what each one builds) is computed from the real recipes.
 */
interface MaterialDef {
    key: MaterialKey;
    name: string;
    accent: string;
    from: string;
}

const MATERIALS: MaterialDef[] = [
    { key: 'iron', name: 'Iron Ore', accent: '#94a3b8', from: 'Giza tomb' },
    { key: 'copper', name: 'Copper Sheets', accent: '#d97706', from: 'St. Louis Fair' },
    { key: 'cosmic', name: 'Cosmic Shards', accent: '#34d399', from: 'Emerald Halls' },
];

/* ─── helpers ────────────────────────────────────────────── */

function prettyId(id: string): string {
    return id.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function num(n: number): string {
    const r = Math.round(n * 10) / 10;
    return `${r}`;
}

function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
}

const NO_ARCHIVE = 'No archive entry — the vault lists this one by name alone.';
const READ_ONLY_NOTE =
    'The vault is a viewing glass. Equip, drink and forge from inside the world itself.';

function relicEntry(id: string, equippedRelic: string | null): VaultEntry {
    const relic = RELIC_BY_ID[id];
    const worn = id === equippedRelic;
    const meta: MetaRow[] = [];
    if (relic) {
        meta.push({ label: 'Found', value: relic.from });
        if (relic.power) meta.push({ label: 'Power', value: relic.power.label });
    }
    meta.push({
        label: 'Resonance',
        value: worn
            ? 'Held at full power'
            : 'Humming at 20% in the satchel — the equipped relic burns full',
    });
    return {
        key: `relic:${id}`,
        kind: 'relic',
        name: relic?.name ?? prettyId(id),
        sub: relic?.from ?? 'Relic',
        desc: relic?.desc ?? NO_ARCHIVE,
        accent: RELIC_ACCENT[id] ?? '#fbbf24',
        stat: relic?.power?.label,
        equipped: worn,
        meta,
    };
}

function scrollEntry(id: string, equippedScroll: string | null): VaultEntry {
    const scroll = SCROLL_BY_ID[id];
    const attuned = id === equippedScroll;
    const meta: MetaRow[] = [];
    if (scroll && scroll.puzzles.length > 0) {
        meta.push({
            label: 'Unseals',
            value: scroll.puzzles.map((p) => PUZZLE_TITLE[p] ?? prettyId(p)).join(' · '),
        });
    }
    meta.push({ label: 'State', value: attuned ? 'Attuned — read in hand' : 'Rolled in the satchel' });
    return {
        key: `scroll:${id}`,
        kind: 'scroll',
        name: scroll?.name ?? prettyId(id),
        sub: 'Knowledge scroll',
        desc: scroll?.desc ?? NO_ARCHIVE,
        accent: SCROLL_ACCENT,
        stat: scroll ? `Unseals ${scroll.puzzles.length} seal${scroll.puzzles.length === 1 ? '' : 's'}` : undefined,
        equipped: attuned,
        meta,
    };
}

function garmentEntry(id: string, wornId: string | null): VaultEntry {
    const item = CLOTHING_BY_ID[id];
    const worn = id === wornId;
    const meta: MetaRow[] = [];
    if (item) {
        meta.push({ label: 'Found', value: item.from });
        meta.push({ label: 'Power', value: item.power?.label ?? 'No passive bonus' });
        if (item.skillPointsOnFind) {
            meta.push({
                label: 'Threshold',
                value: `Granted +${item.skillPointsOnFind} skill point when first found`,
            });
        }
    }
    meta.push({ label: 'State', value: worn ? 'Worn' : 'Folded in the wardrobe' });
    return {
        key: `garment:${id}`,
        kind: 'garment',
        name: item?.name ?? prettyId(id),
        sub: item?.power?.label ?? item?.from ?? 'Garment',
        desc: item?.desc ?? NO_ARCHIVE,
        accent: GARMENT_ACCENT[id] ?? GARMENT_FALLBACK,
        stat: item?.power?.label,
        equipped: worn,
        meta,
    };
}

function consumableEntry(id: string, qty: number): VaultEntry {
    const def = CONSUMABLE_BY_ID[id];
    const meta: MetaRow[] = [{ label: 'Carried', value: `${qty} of ${MAX_CONSUMABLE_STACK}` }];
    if (def) {
        meta.push({ label: 'Effect', value: formatConsumableEffect(def.effect) || '—' });
        meta.push({ label: 'Recipe', value: formatMaterialCost(def.cost) || '—' });
    }
    return {
        key: `consumable:${id}`,
        kind: 'consumable',
        name: def?.name ?? prettyId(id),
        sub: def ? formatConsumableEffect(def.effect) : 'Tonic',
        desc: def?.desc ?? NO_ARCHIVE,
        accent: def?.accent ?? '#34d399',
        qty,
        meta,
    };
}

function materialEntry(def: MaterialDef, qty: number): VaultEntry {
    const forges = WEAPON_TIERS.filter((w) => (w.cost?.[def.key] ?? 0) > 0).map(
        (w) => `${w.name} (${w.cost?.[def.key] ?? 0})`,
    );
    const brews = HUT_CONSUMABLES.filter((c) => (c.cost[def.key] ?? 0) > 0).map(
        (c) => `${c.name} (${c.cost[def.key] ?? 0})`,
    );
    return {
        key: `material:${def.key}`,
        kind: 'material',
        name: def.name,
        sub: def.from,
        desc: `Gathered in the ${def.from}. Essence is spent at the anvil and the hut cauldron.`,
        accent: def.accent,
        qty,
        meta: [
            { label: 'Held', value: `${qty}` },
            { label: 'Found', value: def.from },
            { label: 'Forges', value: forges.length ? forges.join(' · ') : '—' },
            { label: 'Brews', value: brews.length ? brews.join(' · ') : '—' },
        ],
    };
}

function weaponEntry(id: string | null): VaultEntry {
    // Combat resolves a missing weapon to the starter staff — mirror that here.
    const weapon = (id ? WEAPON_BY_ID[id] : undefined) ?? STARTER_WEAPON;
    const tier = WEAPON_TIERS.findIndex((w) => w.id === weapon.id);
    const cost = weapon.cost ? formatMaterialCost(weapon.cost) : '';
    const meta: MetaRow[] = [
        { label: 'Might', value: `${weapon.damage}` },
        { label: 'Reach', value: `${weapon.reach}` },
        { label: 'Tier', value: `${tier + 1} of ${WEAPON_TIERS.length} · ${weapon.kind}` },
        { label: 'Forge', value: weapon.forge },
    ];
    if (cost) meta.push({ label: 'Cost', value: cost });
    if (!id) meta.push({ label: 'Note', value: 'Nothing equipped — the threshold staff answers by default' });
    return {
        key: `weapon:${weapon.id}`,
        kind: 'weapon',
        name: weapon.name,
        sub: `${weapon.damage} might`,
        desc: weapon.flavor,
        accent: WEAPON_ACCENT[weapon.kind] ?? '#facc15',
        stat: `${weapon.damage} might · ${weapon.reach} reach`,
        equipped: true,
        meta,
    };
}

/* ─── empty states ───────────────────────────────────────── */

const EMPTY_STATE: Record<TabId, { icon: LucideIcon; title: string; body: string }> = {
    items: {
        icon: Gem,
        title: 'The satchel is empty',
        body: 'Relics are claimed from the guardians of each age, and scrolls come from the quests that chain between them. Nothing has been carried back yet.',
    },
    materials: {
        icon: Hammer,
        title: 'No essence gathered',
        body: 'Iron Ore falls in the Giza tomb, Copper Sheets in the St. Louis Fair, Cosmic Shards in the Emerald Halls. Roam a portal world and the motes return with each new day.',
    },
    consumables: {
        icon: FlaskConical,
        title: 'The satchel is dry',
        body: 'Tonics are brewed at the hut cauldron from the essence you carry home. Craft one there and it will be waiting here.',
    },
    wardrobe: {
        icon: Shirt,
        title: 'Nothing woven yet',
        body: 'Every initiate begins in plain garments. Deeper cloth is found at the far end of each age.',
    },
};

/* ─── small pieces ───────────────────────────────────────── */

function StatChip({
    label,
    value,
    note,
    accent,
    icon: Icon,
    bar,
}: {
    label: string;
    value: string;
    note?: string;
    accent: string;
    icon?: LucideIcon;
    bar?: number;
}) {
    return (
        <div
            className="shrink-0 min-w-[98px] rounded-xl border bg-white/[0.03] px-2.5 py-2"
            style={{ borderColor: `${accent}38` }}
        >
            <p
                className="text-[9px] uppercase tracking-widest flex items-center gap-1 whitespace-nowrap"
                style={{ color: accent }}
            >
                {Icon ? <Icon size={10} className="shrink-0" /> : null}
                {label}
            </p>
            <p className="text-[15px] text-white font-semibold tabular-nums leading-tight mt-0.5">{value}</p>
            {typeof bar === 'number' ? (
                <span className="mt-1 block h-1 rounded-full bg-white/10 overflow-hidden">
                    <span
                        className="block h-full rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, bar))}%`, background: accent }}
                    />
                </span>
            ) : null}
            {note ? <p className="text-[9px] text-zinc-500 truncate mt-0.5">{note}</p> : null}
        </div>
    );
}

function DetailBody({ entry, onClose }: { entry: VaultEntry; onClose: () => void }) {
    const Icon = KIND_ICON[entry.kind];
    return (
        <div className="p-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
                <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                        background: `${entry.accent}1f`,
                        borderColor: `${entry.accent}55`,
                        color: entry.accent,
                    }}
                >
                    <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: entry.accent }}>
                        {KIND_LABEL[entry.kind]}
                        {typeof entry.qty === 'number' ? ` · ×${entry.qty}` : ''}
                    </p>
                    <h4 className="text-white font-semibold text-[14px] leading-tight mt-0.5">{entry.name}</h4>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        sacredUi.click();
                        onClose();
                    }}
                    aria-label="Close details"
                    className="shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 touch-manipulation"
                >
                    <X size={14} />
                </button>
            </div>

            {entry.equipped ? (
                <p
                    className="inline-block rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-widest"
                    style={{ borderColor: `${entry.accent}55`, color: entry.accent }}
                >
                    {entry.kind === 'garment' ? 'Worn' : entry.kind === 'scroll' ? 'Attuned' : 'Equipped'}
                </p>
            ) : null}

            {entry.desc ? (
                <p className="text-[12px] leading-relaxed text-zinc-400">{entry.desc}</p>
            ) : null}

            <dl className="space-y-1.5">
                {entry.meta.map((m) => (
                    <div key={m.label} className="flex gap-2">
                        <dt className="w-[64px] shrink-0 text-[9px] uppercase tracking-widest text-zinc-600 pt-[3px]">
                            {m.label}
                        </dt>
                        <dd className="flex-1 min-w-0 text-[11px] text-zinc-300 leading-snug break-words">
                            {m.value}
                        </dd>
                    </div>
                ))}
            </dl>

            <p className="text-[10px] text-zinc-600 leading-relaxed border-t border-white/5 pt-2.5">
                {READ_ONLY_NOTE}
            </p>
        </div>
    );
}

/* ─── app ────────────────────────────────────────────────── */

export function VaultApp() {
    const character = useGameStore((s) => s.character);
    const founderNumber = useGameStore((s) => s.founderNumber);

    const [tab, setTab] = useState<TabId>('items');
    const [query, setQuery] = useState('');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [wide, setWide] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Window-relative layout — the OS window has its own size, so viewport
    // breakpoints would lie. Measure the app itself instead.
    useEffect(() => {
        const el = rootRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            const w = entries[0]?.contentRect.width ?? 0;
            setWide(w >= 560);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const equipped = character.equipped;

    const stats = useMemo(() => {
        const relics = combatRelicBonuses(character.inventory ?? [], equipped.relic);
        const skills = skillBonuses(character.skills ?? []);
        const founder = founderBonuses(founderNumber);
        const cloth = clothingBonus(equipped.clothing);
        const weapon = (equipped.weapon ? WEAPON_BY_ID[equipped.weapon] : undefined) ?? STARTER_WEAPON;
        const max = maxVitality(character, founderNumber);
        const cur = currentVitality(character, founderNumber, max);
        const bonusDamage = relics.damage + skills.damage + founder.damage + cloth.damage;
        const bonusReach = relics.reach + skills.reach + founder.reach + cloth.reach;
        return {
            weapon,
            max,
            cur,
            bonusDamage,
            damage: weapon.damage + bonusDamage,
            reach: weapon.reach + bonusReach,
            regen: relics.regen + skills.regen + cloth.regen,
            crit: relics.crit,
            lifesteal: relics.lifesteal,
        };
    }, [character, equipped.relic, equipped.clothing, equipped.weapon, founderNumber]);

    const groups = useMemo(() => {
        const inventory = character.inventory ?? [];
        const scrolls = character.scrolls ?? [];
        const wardrobe = character.wardrobe ?? [];
        const stock = character.consumables ?? {};
        const mats = character.materials ?? { iron: 0, copper: 0, cosmic: 0 };

        const items: VaultEntry[] = [
            ...inventory.map((id) => relicEntry(id, equipped.relic)),
            ...scrolls.map((id) => scrollEntry(id, equipped.scroll)),
        ];

        const materials: VaultEntry[] = MATERIALS.filter((m) => (mats[m.key] ?? 0) > 0).map((m) =>
            materialEntry(m, mats[m.key] ?? 0),
        );

        const known = HUT_CONSUMABLES.filter((c) => (stock[c.id] ?? 0) > 0).map((c) =>
            consumableEntry(c.id, stock[c.id] ?? 0),
        );
        const extras = Object.keys(stock)
            .filter((id) => !CONSUMABLE_BY_ID[id] && (stock[id] ?? 0) > 0)
            .map((id) => consumableEntry(id, stock[id] ?? 0));
        const consumables: VaultEntry[] = [...known, ...extras];

        const garments: VaultEntry[] = wardrobe.map((id) => garmentEntry(id, equipped.clothing));

        const byTab: Record<TabId, VaultEntry[]> = {
            items,
            materials,
            consumables,
            wardrobe: garments,
        };

        const weapon = weaponEntry(equipped.weapon);
        const byKey: Record<string, VaultEntry> = { [weapon.key]: weapon };
        for (const bucket of [items, materials, consumables, garments]) {
            for (const e of bucket) byKey[e.key] = e;
        }
        // Equipped pieces the collections somehow miss still resolve.
        if (equipped.relic && !byKey[`relic:${equipped.relic}`]) {
            const e = relicEntry(equipped.relic, equipped.relic);
            byKey[e.key] = e;
        }
        if (equipped.scroll && !byKey[`scroll:${equipped.scroll}`]) {
            const e = scrollEntry(equipped.scroll, equipped.scroll);
            byKey[e.key] = e;
        }
        if (equipped.clothing && !byKey[`garment:${equipped.clothing}`]) {
            const e = garmentEntry(equipped.clothing, equipped.clothing);
            byKey[e.key] = e;
        }

        return {
            byTab,
            byKey,
            weapon,
            relic: equipped.relic ? byKey[`relic:${equipped.relic}`] : null,
            scroll: equipped.scroll ? byKey[`scroll:${equipped.scroll}`] : null,
            garment: equipped.clothing ? byKey[`garment:${equipped.clothing}`] : null,
            relicsHeld: inventory.length,
        };
    }, [
        character.inventory,
        character.scrolls,
        character.wardrobe,
        character.consumables,
        character.materials,
        equipped.relic,
        equipped.scroll,
        equipped.clothing,
        equipped.weapon,
    ]);

    const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
        { id: 'items', label: 'Items', icon: Gem },
        { id: 'materials', label: 'Materials', icon: Hammer },
        { id: 'consumables', label: 'Tonics', icon: FlaskConical },
        { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
    ];

    const list = groups.byTab[tab];
    const q = query.trim().toLowerCase();
    const shown = q
        ? list.filter(
              (e) =>
                  e.name.toLowerCase().includes(q) ||
                  e.sub.toLowerCase().includes(q) ||
                  e.desc.toLowerCase().includes(q) ||
                  e.meta.some((m) => m.value.toLowerCase().includes(q)),
          )
        : list;

    const selected = selectedKey ? (groups.byKey[selectedKey] ?? null) : null;

    const openEntry = (entry: VaultEntry) => {
        sacredUi.click();
        if (selectedKey === entry.key) {
            setSelectedKey(null);
            return;
        }
        const home = HOME_TAB[entry.kind];
        if (home && home !== tab) {
            setTab(home);
            setQuery('');
        }
        setSelectedKey(entry.key);
    };

    const slots: { label: string; icon: LucideIcon; entry: VaultEntry | null; empty: string }[] = [
        { label: 'Weapon', icon: Sword, entry: groups.weapon, empty: 'None' },
        { label: 'Garment', icon: Shirt, entry: groups.garment, empty: 'Unclothed' },
        { label: 'Relic', icon: Gem, entry: groups.relic, empty: 'No relic held' },
        { label: 'Scroll', icon: ScrollText, entry: groups.scroll, empty: 'None attuned' },
    ];

    const vitalityPct = stats.max > 0 ? (stats.cur / stats.max) * 100 : 0;
    const aura = character.appearance?.aura ?? '#fbbf24';
    const empty = EMPTY_STATE[tab];
    const EmptyIcon = empty.icon;

    return (
        <div ref={rootRef} className="h-full flex flex-col bg-zinc-950 text-zinc-200 min-h-0">
            {/* tabs */}
            <div className="shrink-0 flex border-b border-white/10 overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => {
                            setTab(id);
                            setSelectedKey(null);
                            sacredUi.click();
                        }}
                        className={`flex-1 shrink-0 min-w-[74px] min-h-[44px] px-2 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors touch-manipulation flex items-center justify-center gap-1.5 ${
                            tab === id
                                ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-500/5'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <Icon size={13} className="shrink-0" />
                        <span className="truncate">{label}</span>
                        <span className="text-[9px] text-zinc-600 tabular-nums shrink-0">
                            {groups.byTab[id].length}
                        </span>
                    </button>
                ))}
            </div>

            {/* search */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/30">
                <Search size={14} className="text-zinc-600 shrink-0" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the vault…"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-zinc-200 placeholder:text-zinc-600 py-1.5"
                />
                {query ? (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            sacredUi.click();
                        }}
                        aria-label="Clear search"
                        className="shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 touch-manipulation"
                    >
                        <X size={13} />
                    </button>
                ) : null}
            </div>

            {/* body */}
            <div className="flex-1 min-h-0 flex relative">
                <div className="flex-1 min-w-0 overflow-y-auto p-3 space-y-3">
                    {/* combat summary */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <StatChip
                            label="Vitality"
                            value={`${stats.cur} / ${stats.max}`}
                            accent="#fb7185"
                            icon={Heart}
                            bar={vitalityPct}
                        />
                        <StatChip
                            label="Might"
                            value={num(stats.damage)}
                            note={`${stats.weapon.damage} weapon · +${num(stats.bonusDamage)}`}
                            accent="#fbbf24"
                            icon={Sword}
                        />
                        <StatChip label="Reach" value={num(stats.reach)} accent="#38bdf8" />
                        {stats.regen > 0 ? (
                            <StatChip label="Renewal" value={`${num(stats.regen)}/s`} accent="#34d399" />
                        ) : null}
                        {stats.crit > 0 ? (
                            <StatChip label="Crit" value={pct(stats.crit)} accent="#f472b6" />
                        ) : null}
                        {stats.lifesteal > 0 ? (
                            <StatChip label="Lifesteal" value={pct(stats.lifesteal)} accent="#c084fc" />
                        ) : null}
                        {character.fightBonusDamage > 0 ? (
                            <StatChip
                                label="Edge"
                                value={`+${num(character.fightBonusDamage)}`}
                                note="next fight only"
                                accent="#f97316"
                            />
                        ) : null}
                        {character.fightBonusHp > 0 ? (
                            <StatChip
                                label="Orb"
                                value={`+${num(character.fightBonusHp)}`}
                                note="spent on entering a fight"
                                accent="#22d3ee"
                            />
                        ) : null}
                        <StatChip
                            label="Resonance"
                            value={`${groups.relicsHeld} / ${ALL_RELIC_IDS.length}`}
                            note={resonanceLabel(resonanceTier(character.inventory ?? []))}
                            accent="#a78bfa"
                            icon={Sparkles}
                        />
                    </div>

                    {/* equipped */}
                    <div>
                        <p className="text-[9px] uppercase tracking-[0.22em] text-zinc-500 mb-1.5">Equipped</p>
                        <div className={`grid gap-2 ${wide ? 'grid-cols-4' : 'grid-cols-2'}`}>
                            {slots.map(({ label, icon: Icon, entry, empty: emptyLabel }) => (
                                <button
                                    key={label}
                                    type="button"
                                    disabled={!entry}
                                    onClick={() => {
                                        if (entry) openEntry(entry);
                                    }}
                                    className={`text-left rounded-xl border bg-white/[0.03] px-2.5 py-2 min-h-[58px] touch-manipulation transition-colors ${
                                        entry ? 'hover:bg-white/[0.07]' : 'border-white/10 opacity-60'
                                    }`}
                                    style={entry ? { borderColor: `${entry.accent}40` } : undefined}
                                >
                                    <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-zinc-500">
                                        <Icon size={10} className="shrink-0" />
                                        <span className="truncate">{label}</span>
                                    </span>
                                    <span
                                        className="block text-[12px] font-medium truncate mt-0.5"
                                        style={{ color: entry ? entry.accent : undefined }}
                                    >
                                        {entry ? entry.name : emptyLabel}
                                    </span>
                                    {entry?.stat ? (
                                        <span className="block text-[10px] text-zinc-500 truncate">{entry.stat}</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 min-h-[40px]">
                            <Sparkles size={12} className="shrink-0" style={{ color: aura }} />
                            <span className="text-[9px] uppercase tracking-widest text-zinc-500">Aura</span>
                            <span
                                className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                                style={{ background: aura }}
                            />
                            <span className="text-[11px] font-mono text-zinc-400 truncate">{aura}</span>
                        </div>
                    </div>

                    {/* grid */}
                    <div>
                        <p className="text-[9px] uppercase tracking-[0.22em] text-zinc-500 mb-1.5">
                            {TABS.find((t) => t.id === tab)?.label}
                            <span className="text-zinc-600 normal-case tracking-normal ml-1.5">
                                {shown.length} of {list.length}
                            </span>
                        </p>

                        {shown.length > 0 ? (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2">
                                {shown.map((e) => {
                                    const Icon = KIND_ICON[e.kind];
                                    const active = selectedKey === e.key;
                                    return (
                                        <button
                                            key={e.key}
                                            type="button"
                                            onClick={() => openEntry(e)}
                                            className="text-left rounded-xl border bg-white/[0.03] p-2.5 min-h-[76px] touch-manipulation transition-colors hover:bg-white/[0.07] flex flex-col gap-1.5"
                                            style={{
                                                borderColor: active ? e.accent : `${e.accent}33`,
                                                boxShadow: active ? `0 0 0 1px ${e.accent}66` : undefined,
                                            }}
                                        >
                                            <span className="flex items-start gap-2">
                                                <span
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-[12px] font-bold"
                                                    style={{
                                                        background: `${e.accent}1f`,
                                                        borderColor: `${e.accent}44`,
                                                        color: e.accent,
                                                    }}
                                                >
                                                    <Icon size={14} />
                                                </span>
                                                <span className="min-w-0 flex-1 block text-[11px] leading-snug text-white/90 font-medium line-clamp-2">
                                                    {e.name}
                                                </span>
                                                {typeof e.qty === 'number' ? (
                                                    <span className="shrink-0 text-[11px] font-mono tabular-nums text-zinc-300">
                                                        ×{e.qty}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="flex items-center gap-1.5 min-w-0">
                                                {e.equipped ? (
                                                    <span
                                                        className="shrink-0 rounded-full px-1.5 py-[1px] text-[8px] uppercase tracking-widest border"
                                                        style={{ borderColor: `${e.accent}55`, color: e.accent }}
                                                    >
                                                        {e.kind === 'garment'
                                                            ? 'Worn'
                                                            : e.kind === 'scroll'
                                                              ? 'Attuned'
                                                              : 'Equipped'}
                                                    </span>
                                                ) : null}
                                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 truncate">
                                                    {e.sub}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : list.length > 0 ? (
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-6 text-center">
                                <Search size={18} className="mx-auto text-zinc-700" />
                                <p className="text-[12px] text-zinc-400 mt-2">Nothing here matches that.</p>
                                <p className="text-[10px] text-zinc-600 mt-1">
                                    Clear the search to see all {list.length}.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-7 text-center">
                                <EmptyIcon size={20} className="mx-auto text-zinc-700" />
                                <p className="text-[13px] text-zinc-300 font-medium mt-2">{empty.title}</p>
                                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed max-w-[38ch] mx-auto">
                                    {empty.body}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* detail — side pane when there is room, full overlay when there is not */}
                {selected && wide ? (
                    <aside className="w-[272px] shrink-0 border-l border-white/10 bg-black/30 overflow-y-auto">
                        <DetailBody entry={selected} onClose={() => setSelectedKey(null)} />
                    </aside>
                ) : null}
                {selected && !wide ? (
                    <div className="absolute inset-0 z-10 bg-zinc-950 overflow-y-auto">
                        <DetailBody entry={selected} onClose={() => setSelectedKey(null)} />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
