'use client';

/**
 * Truth.OS apps — sensitive / updates / Truth only.
 * House stations are opened by walking to objects (not from this dock).
 */
import { useEffect, useState } from 'react';
import AvatarCanvas from '@/components/game/AvatarCanvas';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import TruthTerminal from './TruthTerminal';
import type { OsAppId } from '../truthOsStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { loadSettings, applyMusicSetting, saveSettings } from '@/lib/game/settings';
import { supabase } from '@/lib/supabase';
import { fetchBulletins, type Bulletin } from '@/lib/game/hut';

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`h-full overflow-y-auto p-4 text-sm text-zinc-200 ${className}`}>
            {children}
        </div>
    );
}

function AppHeader({ title, sub, accent }: { title: string; sub: string; accent: string }) {
    return (
        <div className="mb-4">
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

/** Account — sensitive identity / SP / sign-out (not the vessel forge) */
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
                    <p className="text-[11px] text-zinc-500 uppercase tracking-[0.18em] mt-0.5">
                        {character.path ? `Path · ${character.path}` : 'Path unchosen'}
                    </p>
                    {email && (
                        <p className="text-[11px] text-zinc-500 mt-1 truncate" title={email}>
                            {email}
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
                Shape your vessel at the <span className="text-zinc-300">Soul Mirror</span> in the bedroom. Temper arms
                at the <span className="text-zinc-300">Forge bench</span>. Play at the{' '}
                <span className="text-zinc-300">controller</span> on the living-room table.
            </p>
        </Panel>
    );
}

/** Updates — latest dispatches / bulletins (read-only feed) */
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
                Architect posts and daily signal. Walk to the Ledger lectern in the house for the full Word.
            </p>
            {loading && <p className="text-xs text-zinc-600 font-mono">fetching…</p>}
            {!loading && rows.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">
                    No dispatches yet. When Architects post, they appear here.
                </div>
            )}
            <ul className="space-y-2">
                {rows.map((r) => (
                    <li
                        key={r.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                    >
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-white/90 font-medium">{r.title || 'Dispatch'}</p>
                            {r.pinned && (
                                <span className="text-[9px] uppercase tracking-widest text-aether-gold/80">Pinned</span>
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

export function SettingsApp({ onLogout, onExit }: { onLogout: () => void; onExit: () => void }) {
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
            <AppHeader title="Settings" sub="System · house" accent="text-zinc-500" />
            <button
                type="button"
                onClick={toggleMusic}
                className="w-full py-3 rounded-xl border border-white/10 text-left px-4 text-sm text-zinc-200 hover:bg-white/5 flex justify-between items-center"
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
            <button
                type="button"
                onClick={onExit}
                className="w-full py-3 rounded-xl border border-white/10 text-left px-4 text-sm text-zinc-300 hover:bg-white/5"
            >
                Sleep display · return to room
            </button>
            <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 rounded-xl border border-red-500/30 text-left px-4 text-sm text-red-300/90 hover:bg-red-500/10"
            >
                Sign out of Truth.OS
            </button>
            <p className="text-[10px] text-zinc-600 pt-2 leading-relaxed">
                Multiplayer only shows living sessions with a fresh heartbeat.
            </p>
        </Panel>
    );
}

export function renderOsApp(
    app: OsAppId,
    ctx: { onLogout: () => void; onExit: () => void },
) {
    switch (app) {
        case 'truth':
            return <TruthTerminal />;
        case 'updates':
            return <UpdatesApp />;
        case 'account':
            return <AccountApp />;
        case 'settings':
            return <SettingsApp onLogout={ctx.onLogout} onExit={ctx.onExit} />;
        default:
            return null;
    }
}
