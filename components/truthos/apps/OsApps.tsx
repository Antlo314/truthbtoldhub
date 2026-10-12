'use client';

/**
 * Truth.OS apps — one file that maps each app id to its window body.
 *
 * Every native screen here uses the shared kit (ui/kit.tsx). Apps that are
 * whole features elsewhere in the hub (the Hall, the Library, the Arcade,
 * the Soul mirror, the Mark) are mounted as-is rather than re-drawn.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    Bell,
    Image as ImageIcon,
    Info,
    LogIn,
    LogOut,
    Monitor,
    Newspaper,
    Pin,
    Plus,
    User,
    Volume2,
} from 'lucide-react';
import { useGameStore } from '@/lib/store/useGameStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import TruthGuideApp from './TruthGuideApp';
import { useTruthOs, type OsAppId, type OsAppPayload, APP_META } from '../truthOsStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { setAllSound, soundOn } from '@/components/sanctum/SoundToggle';
import { fetchBulletins, type Bulletin } from '@/lib/game/hut';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { isMuted as voiceMuted, setMuted as setVoiceMuted } from '@/lib/truthVoice';
import AdminConsole from './AdminConsole';
import { isAdminEmail } from '@/lib/adminEmails';
import DonationSection from '@/components/DonationSection';
import { CalculatorApp, FileExplorerApp, NotepadApp, PaintApp } from './SystemApps';
import { MediaPlayerApp, PhotosApp } from './MediaApps';
import { ClockApp, TaskManagerApp, TerminalApp } from './UtilityApps';
import { BrowserApp } from './BrowserApp';
import { MusicApp } from './MusicApp';
import { TasksApp } from './TasksApp';
import {
    useOsSystem,
    OS_WALLPAPERS,
    WALLPAPER_FAMILIES,
    isUnlocked,
    resolveWallpaper,
    ACCENT_HEX,
} from '../osSystemStore';
import type { OsAccentId } from '../OsIcon';
import {
    AppSurface,
    Btn,
    Empty,
    Group,
    IconChip,
    Loading,
    PageHeader,
    Row,
    Segmented,
    SidebarLayout,
    Stat,
    Toggle,
    cx,
} from '../ui/kit';
import { Lock } from 'lucide-react';

const ArcadeLobby = dynamic(() => import('@/components/game/arcade/ArcadeLobby'), {
    ssr: false,
    loading: () => <Loading label="Opening the arcade…" />,
});
const SoulPanel = dynamic(() => import('@/components/hut3d/hud/SoulPanel'), {
    ssr: false,
    loading: () => <Loading label="Opening the mirror…" />,
});
const HutLedger = dynamic(() => import('@/components/game/HutLedger'), {
    ssr: false,
    loading: () => <Loading label="Counting the souls…" />,
});
const NewspaperPanel = dynamic(() => import('@/components/truthos/house/NewspaperPanel'), {
    ssr: false,
    loading: () => <Loading label="Fetching the paper…" />,
});
const WallPanel = dynamic(() => import('@/components/truthos/house/WallPanel'), {
    ssr: false,
    loading: () => <Loading label="Opening the wall…" />,
});
const ArchiveClient = dynamic(() => import('@/components/archive/ArchiveClient'), {
    ssr: false,
    loading: () => <Loading label="Opening the Hall…" />,
});
const LibraryClient = dynamic(() => import('@/components/library/LibraryClient'), {
    ssr: false,
    loading: () => <Loading label="Opening the Library…" />,
});

/* ─── Ledger: dispatches · the Daily Word · the souls ─────── */

type LedgerTab = 'dispatches' | 'word' | 'souls';

function Dispatches() {
    const [rows, setRows] = useState<Bulletin[] | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    const email = useTruthOs((s) => s.sessionEmail);
    const openApp = useTruthOs((s) => s.openApp);

    useEffect(() => {
        let alive = true;
        fetchBulletins(24)
            .then((r) => alive && setRows(r))
            .catch(() => alive && setRows([]));
        return () => {
            alive = false;
        };
    }, []);

    if (!rows) return <Loading label="Fetching dispatches…" />;
    return (
        <div className="mx-auto max-w-2xl px-5 py-5">
            <PageHeader
                title="Dispatches"
                subtitle="Posts from the Architects, newest first."
                actions={
                    isAdminEmail(email) ? (
                        <Btn size="sm" variant="primary" onClick={() => openApp('admin')}>
                            <Plus size={14} /> New
                        </Btn>
                    ) : undefined
                }
            />
            {rows.length === 0 ? (
                <Empty icon={<Newspaper size={34} />} title="No dispatches yet" body="When an Architect posts, it lands here first." />
            ) : (
                <div className="space-y-2.5">
                    {rows.map((r) => {
                        const expanded = open === r.id;
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                    sacredUi.click();
                                    setOpen(expanded ? null : r.id);
                                }}
                                className="block w-full rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.06]"
                            >
                                <div className="flex items-center gap-2">
                                    {r.pinned && <Pin size={13} className="shrink-0 text-amber-300" />}
                                    <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white">{r.title || 'Dispatch'}</p>
                                    {r.published_at && (
                                        <span className="shrink-0 text-[11.5px] tabular-nums text-white/40">
                                            {new Date(r.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                                <p className={cx('mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-white/65', !expanded && 'line-clamp-3')}>
                                    {r.body || '—'}
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function LedgerApp({ section }: { section?: string }) {
    const [tab, setTab] = useState<LedgerTab>(
        section === 'word' || section === 'souls' ? section : 'dispatches',
    );
    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);
    const name = character.name?.trim() || profile?.display_name || undefined;
    return (
        <div className="flex h-full min-h-0 flex-col bg-[#101219]">
            <div className="flex shrink-0 justify-center border-b border-white/[0.06] px-3 py-2">
                <Segmented
                    value={tab}
                    onChange={setTab}
                    options={[
                        { id: 'dispatches', label: 'Dispatches' },
                        { id: 'word', label: 'Daily Word' },
                        { id: 'souls', label: 'The Souls' },
                    ]}
                />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {tab === 'dispatches' && <Dispatches />}
                {tab === 'word' && <NewspaperPanel />}
                {tab === 'souls' && (
                    <div className="mx-auto max-w-2xl px-5 py-5">
                        <HutLedger characterName={name} />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Settings ────────────────────────────────────────────── */

type Pane = 'account' | 'appearance' | 'sound' | 'display' | 'notifications' | 'about';

function AccountPane({ onLogout }: { onLogout: () => void }) {
    const character = useGameStore((s) => s.character);
    const profile = useSoulStore((s) => s.profile);
    const fetchIdentity = useSoulStore((s) => s.fetchIdentity);
    const email = useTruthOs((s) => s.sessionEmail);
    const setAuthPrompt = useTruthOs((s) => s.setAuthPrompt);
    const openApp = useTruthOs((s) => s.openApp);

    useEffect(() => {
        void fetchIdentity?.();
    }, [fetchIdentity]);

    const name = character.name?.trim() || profile?.display_name || (email ? 'Soul' : 'Guest');
    return (
        <div className="px-6 py-6">
            <div className="mb-6 flex items-center gap-4">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-white/15 to-white/[0.03] ring-1 ring-white/15">
                    <span className="bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-[30px] font-bold text-transparent">{(name.trim()[0] || '✦').toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                    <p className="truncate text-[20px] font-semibold text-white">{name}</p>
                    <p className="truncate text-[12.5px] text-white/50">{email ?? 'Not signed in'}</p>
                    {email && isAdminEmail(email) && (
                        <span className="mt-1 inline-block rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-medium text-rose-200">Architect</span>
                    )}
                </div>
            </div>
            {email ? (
                <>
                    <div className="mb-5 grid grid-cols-2 gap-2.5">
                        <Stat label="Soul power" value={profile?.soul_power ?? '—'} />
                        <Stat label="Standing" value={profile?.is_supporter ? 'Supporter' : profile?.tier || 'Seeker'} />
                    </div>
                    <Group>
                        <Row label="Shape your vessel" detail="Body, face, hair, garments" onClick={() => openApp('soul')} />
                        <Row label="Your public page" detail="Profile, history, soul power" onClick={() => openApp('browser', { payload: { content: '/self', name: 'Your Page' } })} />
                    </Group>
                    <Group>
                        <Row label="Sign out" danger icon={<LogOut size={16} className="text-rose-300" />} onClick={onLogout} chevron={false} />
                    </Group>
                </>
            ) : (
                <Group footer="Signing in keeps your soul power, your mark and your arcade scores.">
                    <Row label="Sign in" icon={<LogIn size={16} className="text-white/70" />} onClick={() => setAuthPrompt(true)} />
                </Group>
            )}
        </div>
    );
}

function AppearancePane() {
    const wallpaper = useOsSystem((s) => s.wallpaper);
    const accent = useOsSystem((s) => s.accent);
    const setWallpaper = useOsSystem((s) => s.setWallpaper);
    const setAccent = useOsSystem((s) => s.setAccent);
    const snapshot = useOsSystem((s) => s.snapshot);
    const unlocked = OS_WALLPAPERS.filter((w) => isUnlocked(w, snapshot)).length;
    return (
        <div className="px-6 py-6">
            <PageHeader title="Appearance" subtitle={`${unlocked} of ${OS_WALLPAPERS.length} wallpapers open. The rest are earned.`} />
            <p className="mb-2 px-1 text-[12px] font-medium text-white/45">Accent</p>
            <div className="mb-6 flex flex-wrap gap-2.5">
                {(Object.keys(ACCENT_HEX) as OsAccentId[]).map((a) => (
                    <button
                        key={a}
                        type="button"
                        title={a}
                        onClick={() => {
                            setAccent(a);
                            sacredUi.click();
                        }}
                        className={cx(
                            'h-8 w-8 rounded-full ring-offset-2 ring-offset-[#101219] transition-transform active:scale-90',
                            accent === a ? 'ring-2 ring-white' : 'hover:scale-110',
                        )}
                        style={{ background: ACCENT_HEX[a] }}
                    />
                ))}
            </div>
            {WALLPAPER_FAMILIES.map((fam) => {
                const inFam = OS_WALLPAPERS.filter((w) => w.family === fam);
                if (!inFam.length) return null;
                return (
                    <div key={fam} className="mb-5">
                        <p className="mb-2 px-1 text-[12px] font-medium text-white/45">{fam}</p>
                        <div className="grid grid-cols-2 gap-2.5 @[640px]:grid-cols-3">
                            {inFam.map((wp) => {
                                const open = isUnlocked(wp, snapshot);
                                return (
                                    <button
                                        key={wp.id}
                                        type="button"
                                        disabled={!open}
                                        title={open ? wp.name : `Locked — ${wp.unlock?.label ?? ''}`}
                                        onClick={() => {
                                            setWallpaper(wp.id);
                                            setAccent(wp.accent);
                                            sacredUi.click();
                                        }}
                                        className={cx(
                                            'group relative aspect-[16/10] overflow-hidden rounded-xl ring-offset-2 ring-offset-[#101219] transition-shadow',
                                            wallpaper === wp.id ? 'ring-2 ring-[var(--os-accent,#34d399)]' : 'ring-1 ring-white/10 hover:ring-white/30',
                                            !open && 'cursor-not-allowed',
                                        )}
                                    >
                                        <span
                                            className={cx('absolute inset-0', !open && 'opacity-30 blur-[3px] saturate-50')}
                                            style={{ background: resolveWallpaper(wp.id).css }}
                                        />
                                        {!open ? (
                                            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
                                                <Lock size={14} className="text-white/80" />
                                                <span className="text-[11px] leading-tight text-white/80">{wp.unlock?.label}</span>
                                            </span>
                                        ) : (
                                            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-left text-[11.5px] text-white">
                                                {wp.name}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function SoundPane() {
    const volume = useOsSystem((s) => s.volume);
    const setVolume = useOsSystem((s) => s.setVolume);
    const [music, setMusic] = useState(() => soundOn());
    const [voiceOff, setVoiceOff] = useState(() => voiceMuted());
    return (
        <div className="px-6 py-6">
            <PageHeader title="Sound" />
            <Group title="Output">
                <div className="px-3.5 py-3">
                    <div className="mb-2 flex items-center justify-between text-[13px]">
                        <span>Volume</span>
                        <span className="tabular-nums text-white/45">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(volume * 100)}
                        onChange={(e) => {
                            const v = Number(e.target.value) / 100;
                            setVolume(v);
                            hubAudio.setMaster(v);
                        }}
                        className="w-full"
                        style={{ accentColor: 'var(--os-accent, #34d399)' }}
                    />
                </div>
            </Group>
            <Group footer="Truth speaks the recorded lines when you arrive somewhere new.">
                <Row
                    label="Sound"
                    detail="Music and effects, everywhere in the hub"
                    right={
                        <Toggle
                            checked={music}
                            onChange={(v) => {
                                setMusic(v);
                                setAllSound(v);
                            }}
                        />
                    }
                />
                <Row
                    label="Truth’s voice"
                    right={
                        <Toggle
                            checked={!voiceOff}
                            onChange={(v) => {
                                setVoiceOff(!v);
                                setVoiceMuted(!v);
                            }}
                        />
                    }
                />
            </Group>
        </div>
    );
}

function DisplayPane() {
    const brightness = useOsSystem((s) => s.brightness);
    const setBrightness = useOsSystem((s) => s.setBrightness);
    const nightLight = useOsSystem((s) => s.nightLight);
    const setNightLight = useOsSystem((s) => s.setNightLight);
    return (
        <div className="px-6 py-6">
            <PageHeader title="Display" />
            <Group>
                <div className="px-3.5 py-3">
                    <div className="mb-2 flex items-center justify-between text-[13px]">
                        <span>Brightness</span>
                        <span className="tabular-nums text-white/45">{Math.round(brightness * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min={55}
                        max={100}
                        value={Math.round(brightness * 100)}
                        onChange={(e) => setBrightness(Number(e.target.value) / 100)}
                        className="w-full"
                        style={{ accentColor: 'var(--os-accent, #34d399)' }}
                    />
                </div>
                <Row label="Night light" detail="Warmer screen after dark" right={<Toggle checked={nightLight} onChange={setNightLight} />} />
            </Group>
        </div>
    );
}

function NotificationsPane() {
    const dnd = useOsSystem((s) => s.doNotDisturb);
    const setDnd = useOsSystem((s) => s.setDoNotDisturb);
    const wallNeighbor = useOsSystem((s) => s.wallNeighbor);
    const setWallNeighbor = useOsSystem((s) => s.setWallNeighbor);
    return (
        <div className="px-6 py-6">
            <PageHeader title="Notifications" />
            <Group footer="Do Not Disturb keeps notifications in the Today panel without popping them up.">
                <Row label="Do Not Disturb" right={<Toggle checked={dnd} onChange={setDnd} />} />
                <Row label="Marks on the wall" detail="When a neighbour leaves their mark" right={<Toggle checked={wallNeighbor} onChange={setWallNeighbor} />} />
            </Group>
        </div>
    );
}

function AboutPane() {
    return (
        <div className="px-6 py-6">
            <div className="mb-6 flex flex-col items-center py-4 text-center">
                <span className="bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-6xl font-black text-transparent">✦</span>
                <p className="mt-3 text-[22px] font-semibold text-white">Truth.OS</p>
                <p className="text-[13px] text-white/50">Version 4 · 2026</p>
            </div>
            <Group>
                <Row label="Programs" right={<span>{Object.keys(APP_META).length}</span>} />
                <Row label="Search everything" right={<kbd className="rounded bg-white/10 px-1.5 text-[11px]">Ctrl K</kbd>} />
                <Row label="App Library" right={<kbd className="rounded bg-white/10 px-1.5 text-[11px]">Ctrl E</kbd>} />
                <Row label="All shortcuts" right={<kbd className="rounded bg-white/10 px-1.5 text-[11px]">Ctrl /</kbd>} />
            </Group>
            <p className="px-1 text-[12px] leading-relaxed text-white/40">
                Truth B Told Hub. Every app is one click from the dock — and the gold door at its end opens the world: the Aether Plain and the Lair.
            </p>
        </div>
    );
}

export function SettingsApp({ onLogout, section }: { onLogout: () => void; section?: string }) {
    const panes: Pane[] = ['account', 'appearance', 'sound', 'display', 'notifications', 'about'];
    const [pane, setPane] = useState<Pane>(panes.includes(section as Pane) ? (section as Pane) : 'account');
    const profile = useSoulStore((s) => s.profile);
    const email = useTruthOs((s) => s.sessionEmail);
    return (
        <SidebarLayout<Pane>
            active={pane}
            onSelect={setPane}
            header={
                <p className="truncate px-1 text-[12px] text-white/45">
                    {email ? profile?.display_name || email : 'Guest'}
                </p>
            }
            items={[
                { id: 'account', label: 'Account', icon: <IconChip color="#6366f1"><User size={13} /></IconChip> },
                { id: 'appearance', label: 'Appearance', icon: <IconChip color="#0ea5e9"><ImageIcon size={13} /></IconChip> },
                { id: 'sound', label: 'Sound', icon: <IconChip color="#ec4899"><Volume2 size={13} /></IconChip> },
                { id: 'display', label: 'Display', icon: <IconChip color="#3b82f6"><Monitor size={13} /></IconChip> },
                { id: 'notifications', label: 'Notifications', icon: <IconChip color="#ef4444"><Bell size={13} /></IconChip> },
                { id: 'about', label: 'About', icon: <IconChip color="#71717a"><Info size={13} /></IconChip> },
            ]}
        >
            {pane === 'account' && <AccountPane onLogout={onLogout} />}
            {pane === 'appearance' && <AppearancePane />}
            {pane === 'sound' && <SoundPane />}
            {pane === 'display' && <DisplayPane />}
            {pane === 'notifications' && <NotificationsPane />}
            {pane === 'about' && <AboutPane />}
        </SidebarLayout>
    );
}

/* ─── Thin hosts for whole features ───────────────────────── */

function Host({ children, className = 'bg-[#0b0d13]' }: { children: React.ReactNode; className?: string }) {
    // `relative` + `overflow-hidden`: several features position their own
    // chrome absolutely and must be contained by the window, not the page.
    return <div className={cx('relative h-full min-h-0 overflow-hidden', className)}>{children}</div>;
}

export function OfferingApp() {
    return (
        <AppSurface>
            <div className="mx-auto max-w-lg px-6 py-6">
                <DonationSection variant="hut" />
            </div>
        </AppSurface>
    );
}

export type OsAppContext = {
    onLogout: () => void;
    onExit: () => void;
    payload?: OsAppPayload;
};

export function renderOsApp(app: OsAppId, ctx: OsAppContext) {
    switch (app) {
        case 'truth':
            // Spotlight can open the guide WITH a question
            return <TruthGuideApp initialPrompt={ctx.payload?.content} />;
        case 'ledger':
            return <LedgerApp section={ctx.payload?.section} />;
        case 'library':
            return (
                <Host>
                    <LibraryClient embedded />
                </Host>
            );
        case 'archive':
            return (
                <Host>
                    <ArchiveClient />
                </Host>
            );
        case 'wall':
            return (
                <Host>
                    <WallPanel embedded onClose={ctx.onExit} />
                </Host>
            );
        case 'offering':
            return <OfferingApp />;
        case 'arcade':
            return (
                <Host className="bg-[#07080d]">
                    <ArcadeLobby character={useGameStore.getState().character} onClose={() => { sacredUi.click(); ctx.onExit(); }} />
                </Host>
            );
        case 'soul':
            return (
                <Host>
                    <SoulPanel onClose={() => { sacredUi.click(); ctx.onExit(); }} />
                </Host>
            );
        case 'media':
            return <MediaPlayerApp />;
        case 'paint':
            return <PaintApp />;
        case 'photos':
            return <PhotosApp />;
        case 'music':
            return <MusicApp />;
        case 'browser':
            return <BrowserApp initialPath={ctx.payload?.content} />;
        case 'files':
            return <FileExplorerApp />;
        case 'notepad':
            return <NotepadApp nodeId={ctx.payload?.nodeId} name={ctx.payload?.name} />;
        case 'tasks':
            return <TasksApp />;
        case 'calculator':
            return <CalculatorApp />;
        case 'clock':
            return <ClockApp />;
        case 'terminal':
            return <TerminalApp />;
        case 'settings':
            return <SettingsApp onLogout={ctx.onLogout} section={ctx.payload?.section} />;
        case 'taskmgr':
            return <TaskManagerApp />;
        case 'admin':
            return <AdminConsole />;
        default:
            return <Empty title="This program is not installed." />;
    }
}
