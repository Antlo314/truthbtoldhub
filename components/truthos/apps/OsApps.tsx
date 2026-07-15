'use client';

/**
 * Truth.OS apps — full Hut surface as desktop modules.
 */
import { useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import AvatarCanvas from '@/components/game/AvatarCanvas';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import TruthTerminal from './TruthTerminal';
import type { OsAppId } from '../truthOsStore';
import { APP_META } from '../truthOsStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { loadSettings, applyMusicSetting, saveSettings } from '@/lib/game/settings';
import { supabase } from '@/lib/supabase';
import { fetchBulletins, type Bulletin } from '@/lib/game/hut';
import AdminConsole from './AdminConsole';
import { isAdminEmail } from '@/lib/adminEmails';
import DonationSection from '@/components/DonationSection';

const ArcadeLobby = dynamic(() => import('@/components/game/arcade/ArcadeLobby'), {
    ssr: false,
    loading: () => <OsLoading label="Arcade" />,
});

const SoulPanel = dynamic(() => import('@/components/hut3d/hud/SoulPanel'), {
    ssr: false,
    loading: () => <OsLoading label="Soul forge" />,
});

const HutConsumableCraft = dynamic(() => import('@/components/game/HutConsumableCraft'), {
    ssr: false,
    loading: () => <OsLoading label="Forge" />,
});

const HutPortalBoard = dynamic(() => import('@/components/game/HutPortalBoard'), {
    ssr: false,
    loading: () => <OsLoading label="Wayfinder" />,
});

const HutLedger = dynamic(() => import('@/components/game/HutLedger'), {
    ssr: false,
    loading: () => <OsLoading label="Ledger" />,
});

function OsLoading({ label }: { label: string }) {
    return (
        <div className="h-full min-h-[200px] flex items-center justify-center font-mono text-[11px] text-emerald-500/50 tracking-[0.25em]">
            loading {label}…
        </div>
    );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`h-full overflow-y-auto p-4 text-sm text-zinc-200 ${className}`}>
            {children}
        </div>
    );
}

function AppHeader({ title, sub, accent }: { title: string; sub: string; accent: string }) {
    return (
        <div className="mb-4 pb-3 border-b border-white/8">
            <p className={`text-[10px] uppercase tracking-[0.32em] font-mono ${accent}`}>{title}</p>
            <h3 className="text-white font-semibold text-lg mt-1 leading-tight">{sub}</h3>
        </div>
    );
}

function StatChip({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-white/35">{label}</p>
            <p className="text-sm text-white/90 mt-0.5 font-medium">{value}</p>
        </div>
    );
}

function RouteFrame({ href, title }: { href: string; title: string }) {
    return (
        <div className="h-full min-h-[280px] flex flex-col bg-black">
            <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2 bg-black/60">
                <p className="text-[10px] font-mono text-white/40 truncate">{title}</p>
                <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => sacredUi.click()}
                    className="text-[10px] uppercase tracking-widest text-emerald-400/80 hover:text-emerald-300"
                >
                    Open full →
                </a>
            </div>
            <iframe title={title} src={href} className="flex-1 w-full border-0 bg-black min-h-[240px]" />
        </div>
    );
}

function LinkGrid({
    links,
}: {
    links: { href: string; label: string; tag: string }[];
}) {
    return (
        <ul className="space-y-2">
            {links.map((l) => (
                <li key={l.href}>
                    <a
                        href={l.href}
                        onClick={() => sacredUi.click()}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] hover:border-emerald-400/25 transition-colors"
                    >
                        <span className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-300 text-sm shrink-0">
                            ▣
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm text-white/90">{l.label}</span>
                            <span className="block text-[10px] text-white/30 font-mono mt-0.5">
                                {l.tag} · {l.href}
                            </span>
                        </span>
                    </a>
                </li>
            ))}
        </ul>
    );
}

export function AccountApp() {
    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);
    const fetchIdentity = useSoulStore((s) => s.fetchIdentity);
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        void fetchIdentity?.();
        supabase.auth.getUser().then(({ data }) => {
            setEmail(data.user?.email ?? null);
        });
    }, [fetchIdentity]);

    return (
        <Panel className="flex flex-col gap-4 bg-zinc-950">
            <AppHeader title="Account.exe" sub="Signed-in identity" accent="text-cyan-400/80" />
            <div className="flex items-center gap-4">
                <div className="rounded-xl border border-cyan-400/20 bg-black/40 p-2">
                    <AvatarCanvas config={character.avatar} scale={4} />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-lg text-white truncate">
                        {character.name?.trim() || profile?.display_name || 'Soul'}
                    </p>
                    {email && (
                        <p className="text-[11px] text-zinc-500 mt-1 truncate" title={email}>
                            {email}
                            {isAdminEmail(email) && (
                                <span className="ml-2 text-rose-400 uppercase tracking-wider text-[9px]">
                                    Admin
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <StatChip label="Soul Power" value={String(profile?.soul_power ?? '—')} />
                <StatChip
                    label="Support"
                    value={profile?.is_supporter ? 'Supporter' : profile?.tier || 'Guest'}
                />
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
                Shape your vessel in the <span className="text-zinc-300">Soul</span> app. Play Arcade, tend the Ledger,
                and enter the Chamber only if you want the 3D house.
            </p>
        </Panel>
    );
}

export function FilesApp() {
    return (
        <Panel className="bg-zinc-950 space-y-3">
            <AppHeader title="Files" sub="Sanctum shortcuts" accent="text-sky-400/80" />
            <p className="text-xs text-zinc-500 leading-relaxed">
                Jump into full routes. Core Hut tools also live as desktop apps in Start.
            </p>
            <LinkGrid
                links={[
                    { href: '/library', label: 'Library', tag: 'scrolls' },
                    { href: '/cinema', label: 'Cinema', tag: 'films' },
                    { href: '/archive', label: 'The Hall', tag: 'community' },
                    { href: '/support', label: 'Support', tag: 'offering' },
                    { href: '/codex', label: 'Codex', tag: 'study' },
                    { href: '/vision', label: 'Visions', tag: 'roads' },
                    { href: '/self', label: 'Soul page', tag: 'profile' },
                ]}
            />
        </Panel>
    );
}

export function UpdatesApp() {
    const [rows, setRows] = useState<Bulletin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const list = await fetchBulletins(12);
                if (alive) setRows(list);
            } catch {
                if (alive) setRows([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    return (
        <Panel className="bg-zinc-950 space-y-3">
            <AppHeader title="Updates.exe" sub="House dispatches" accent="text-amber-400/80" />
            <p className="text-xs text-zinc-500 leading-relaxed">
                Architect posts and daily signal. The Ledger holds the fuller Word.
            </p>
            {loading && <p className="text-xs text-zinc-600 font-mono">fetching…</p>}
            {!loading && rows.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                    No dispatches yet. When Architects post, they appear here.
                </div>
            )}
            <ul className="space-y-2">
                {rows.map((r) => (
                    <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-white/90 font-medium">{r.title || 'Dispatch'}</p>
                            {r.pinned && (
                                <span className="text-[9px] uppercase tracking-widest text-aether-gold/80">
                                    Pinned
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-3 leading-relaxed">
                            {r.body || '—'}
                        </p>
                        {r.published_at && (
                            <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">
                                {new Date(r.published_at).toLocaleDateString()}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

export function LedgerApp() {
    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);
    const name = character.name?.trim() || profile?.display_name || 'Soul';
    return (
        <Panel className="bg-zinc-950 space-y-3">
            <AppHeader title="Ledger.exe" sub="Daily Word · records" accent="text-amber-300/80" />
            <HutLedger characterName={name} />
            <div className="border-t border-white/10 pt-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-mono">Dispatches</p>
                <UpdatesApp />
            </div>
        </Panel>
    );
}

export function SoulApp() {
    return (
        <div className="h-full min-h-[320px] bg-zinc-950 overflow-auto">
            <SoulPanel onClose={() => sacredUi.click()} />
        </div>
    );
}

export function ArcadeApp() {
    const character = useGameStore((s) => s.character);
    return (
        <div className="h-full min-h-[320px] bg-zinc-950 overflow-auto">
            <ArcadeLobby character={character} onClose={() => sacredUi.click()} />
        </div>
    );
}

export function OfferingApp() {
    return (
        <Panel className="bg-zinc-950">
            <AppHeader title="Offering.exe" sub="Sustain the work" accent="text-rose-300/80" />
            <DonationSection />
        </Panel>
    );
}

export function ForgeApp() {
    return (
        <Panel className="bg-zinc-950 p-2">
            <AppHeader title="Forge.exe" sub="Craft & weapons" accent="text-orange-300/80" />
            <HutConsumableCraft />
        </Panel>
    );
}

export function VisionsApp() {
    return (
        <Panel className="bg-zinc-950 space-y-3">
            <AppHeader title="Visions.exe" sub="Seeing glass" accent="text-sky-300/80" />
            <p className="text-xs text-zinc-500 leading-relaxed">
                Unseal roads, prophetic cinema, and the vision map.
            </p>
            <LinkGrid
                links={[
                    { href: '/vision', label: 'Vision roads', tag: 'map' },
                    { href: '/cinema', label: 'Cinema', tag: 'films' },
                    { href: '/cineworks', label: 'Cineworks', tag: 'catalog' },
                    { href: '/epilogue', label: 'Return / Source', tag: 'epilogue' },
                ]}
            />
        </Panel>
    );
}

export function LibraryApp() {
    return <RouteFrame href="/library" title="Library" />;
}

export function ArchiveApp() {
    return <RouteFrame href="/archive" title="The Hall" />;
}

export function WayfinderApp() {
    const character = useGameStore((s) => s.character);
    return (
        <Panel className="bg-zinc-950 space-y-3">
            <AppHeader title="Wayfinder.exe" sub="Ages & portals" accent="text-teal-300/80" />
            <p className="text-xs text-zinc-500 leading-relaxed">
                Portal board and journey ages. The 3D Chamber remains optional for those who want to walk.
            </p>
            <HutPortalBoard character={character} />
        </Panel>
    );
}

export function ChamberApp({ onEnterChamber }: { onEnterChamber: () => void }) {
    return (
        <Panel className="bg-zinc-950 space-y-4">
            <AppHeader title="Chamber.exe" sub="Optional 3D house" accent="text-emerald-300/80" />
            <p className="text-sm text-zinc-300 leading-relaxed">
                The first-person house is for souls who enjoy walking rooms. Every Hut feature also lives on this
                desktop — you never need 3D to use Truth.OS.
            </p>
            <ul className="text-xs text-zinc-500 space-y-1.5 list-disc pl-4">
                <li>WASD / look controls on desktop</li>
                <li>Touch controls on phone</li>
                <li>Exit anytime to return here</li>
            </ul>
            <button
                type="button"
                onClick={() => {
                    sacredUi.access();
                    onEnterChamber();
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold text-sm hover:brightness-110 transition"
            >
                Enter the Chamber
            </button>
            <a
                href="/world"
                onClick={() => sacredUi.click()}
                className="block text-center text-[11px] text-white/40 hover:text-white/70"
            >
                Open /world instead
            </a>
        </Panel>
    );
}

export function SettingsApp({
    onLogout,
    onEnterChamber,
}: {
    onLogout: () => void;
    onExit?: () => void;
    onEnterChamber?: () => void;
}) {
    const [music, setMusic] = useState(() => loadSettings().music);

    const toggleMusic = () => {
        const next = !music;
        setMusic(next);
        saveSettings({ music: next });
        applyMusicSetting(next);
        sacredUi.click();
    };

    return (
        <Panel className="bg-zinc-950 space-y-3">
            <AppHeader title="Settings" sub="System · desktop" accent="text-zinc-500" />
            <button
                type="button"
                onClick={toggleMusic}
                className="w-full py-3 rounded-xl border border-white/10 text-left px-4 text-sm text-zinc-200 hover:bg-white/5 flex justify-between items-center min-h-[44px]"
            >
                <span>Music</span>
                <span
                    className={
                        music
                            ? 'text-emerald-400 text-xs uppercase tracking-widest'
                            : 'text-zinc-600 text-xs uppercase tracking-widest'
                    }
                >
                    {music ? 'On' : 'Off'}
                </span>
            </button>
            {onEnterChamber && (
                <button
                    type="button"
                    onClick={onEnterChamber}
                    className="w-full py-3 rounded-xl border border-emerald-500/25 text-left px-4 text-sm text-emerald-200/90 hover:bg-emerald-500/10 min-h-[44px]"
                >
                    Enter 3D Chamber (optional)
                </button>
            )}
            <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 rounded-xl border border-red-500/30 text-left px-4 text-sm text-red-300/90 hover:bg-red-500/10 min-h-[44px]"
            >
                Sign out of Truth.OS
            </button>
            <p className="text-[10px] text-zinc-600 pt-2 leading-relaxed">
                Layout: Windows-style taskbar + modern Bento windows. Protected apps require Google or email sign-in.
            </p>
        </Panel>
    );
}

export type OsAppContext = {
    onLogout: () => void;
    onExit?: () => void;
    onEnterChamber: () => void;
};

export function renderOsApp(app: OsAppId, ctx: OsAppContext) {
    switch (app) {
        case 'truth':
            return <TruthTerminal />;
        case 'updates':
            return <UpdatesApp />;
        case 'ledger':
            return <LedgerApp />;
        case 'soul':
            return <SoulApp />;
        case 'arcade':
            return <ArcadeApp />;
        case 'offering':
            return <OfferingApp />;
        case 'forge':
            return <ForgeApp />;
        case 'visions':
            return <VisionsApp />;
        case 'library':
            return <LibraryApp />;
        case 'archive':
            return <ArchiveApp />;
        case 'wayfinder':
            return <WayfinderApp />;
        case 'account':
            return <AccountApp />;
        case 'settings':
            return (
                <SettingsApp
                    onLogout={ctx.onLogout}
                    onExit={ctx.onExit}
                    onEnterChamber={ctx.onEnterChamber}
                />
            );
        case 'admin':
            return <AdminConsole />;
        case 'files':
            return <FilesApp />;
        case 'chamber':
            return <ChamberApp onEnterChamber={ctx.onEnterChamber} />;
        default:
            return (
                <Panel>
                    <p className="text-zinc-500 text-sm">{APP_META[app as OsAppId]?.title ?? app} unavailable.</p>
                </Panel>
            );
    }
}
