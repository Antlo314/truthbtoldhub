'use client';

import AvatarCanvas from '@/components/game/AvatarCanvas';
import { useGameStore } from '@/lib/store/useGameStore';
import { visionStats } from '@/lib/brand/visionProgress';
import { suggestNextRoad } from '@/lib/brand/nextRoad';
import TruthTerminal from './TruthTerminal';
import type { OsAppId } from '../truthOsStore';
import { useHouseUi, type HousePanelId } from '../house/houseUiStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { loadSettings, applyMusicSetting, saveSettings } from '@/lib/game/settings';
import { useState } from 'react';

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`h-full overflow-y-auto p-4 text-sm text-zinc-200 ${className}`}>
            {children}
        </div>
    );
}

function openHouse(panel: HousePanelId) {
    sacredUi.click();
    useHouseUi.getState().openPanel(panel);
}

function AppHeader({ title, sub, accent }: { title: string; sub: string; accent: string }) {
    return (
        <div className="mb-4">
            <p className={`text-[10px] uppercase tracking-[0.32em] font-mono ${accent}`}>{title}</p>
            <h3 className="text-white font-semibold text-lg mt-1 leading-tight">{sub}</h3>
        </div>
    );
}

function PrimaryBtn({
    children,
    onClick,
    tone = 'emerald',
}: {
    children: React.ReactNode;
    onClick: () => void;
    tone?: 'emerald' | 'violet' | 'amber' | 'cyan' | 'rose' | 'sky';
}) {
    const tones: Record<string, string> = {
        emerald: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/25',
        violet: 'bg-violet-500/15 border-violet-400/40 text-violet-100 hover:bg-violet-500/25',
        amber: 'bg-amber-500/15 border-amber-400/40 text-amber-100 hover:bg-amber-500/25',
        cyan: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/25',
        rose: 'bg-rose-500/15 border-rose-400/40 text-rose-100 hover:bg-rose-500/25',
        sky: 'bg-sky-500/15 border-sky-400/40 text-sky-100 hover:bg-sky-500/25',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-center py-3.5 rounded-xl border text-xs uppercase tracking-[0.18em] font-semibold transition-colors ${tones[tone]}`}
        >
            {children}
        </button>
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

export function SoulApp() {
    const character = useGameStore((s) => s.character);
    return (
        <Panel className="flex flex-col items-center gap-4 bg-zinc-950">
            <AppHeader title="Vessel.exe" sub="Your body in the house" accent="text-cyan-400/80" />
            <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-cyan-500/10 to-black/50 p-4 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
                <AvatarCanvas config={character.avatar} scale={7} />
            </div>
            <div className="text-center w-full">
                <p className="font-semibold text-xl text-white">{character.name?.trim() || 'Unnamed process'}</p>
                <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-[0.2em]">
                    {character.path ? `Path · ${character.path}` : 'Path unchosen'}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
                <StatChip label="Aura" value={character.appearance?.aura ? 'Set' : 'Default'} />
                <StatChip label="Build" value={character.avatar?.build === 'fem' ? 'Fem' : 'Masc'} />
            </div>
            <PrimaryBtn onClick={() => openHouse('forge')} tone="cyan">
                Open vessel forge
            </PrimaryBtn>
            <PrimaryBtn onClick={() => openHouse('soul')} tone="cyan">
                Soul mirror · house
            </PrimaryBtn>
        </Panel>
    );
}

export function WayfinderApp() {
    const stats = visionStats();
    const next = suggestNextRoad();
    return (
        <Panel className="bg-zinc-950 space-y-4">
            <AppHeader title="Wayfinder.exe" sub="Roads from the house" accent="text-emerald-400/80" />
            <p className="text-zinc-400 text-sm leading-relaxed">
                Eden is the open road. Other ages stay sealed until the garden is complete. Navigate without leaving
                Truth.OS House.
            </p>
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-emerald-300 font-semibold">Eden · first road</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                        OPEN
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <StatChip label="Visions" value={`${stats.seen}/${stats.total}`} />
                    <StatChip label="Relics" value={String(stats.relics)} />
                </div>
                <p className="text-xs text-zinc-500">
                    Next signal: <span className="text-zinc-300">{next.label}</span>
                </p>
            </div>
            <PrimaryBtn onClick={() => openHouse('cinema')} tone="emerald">
                Eden vision · cinema
            </PrimaryBtn>
            <PrimaryBtn onClick={() => openHouse('chamber')} tone="violet">
                Enter 3D chamber
            </PrimaryBtn>
        </Panel>
    );
}

export function ChamberApp() {
    return (
        <Panel className="bg-zinc-950 flex flex-col gap-4">
            <AppHeader title="Chamber.exe" sub="Truth’s Hut · walkable sanctum" accent="text-violet-400/80" />
            <div className="rounded-2xl border border-violet-400/25 bg-violet-500/5 p-4 space-y-2">
                <p className="text-sm text-zinc-300 leading-relaxed">
                    Full hut runtime on this build: stations, Truth, vessel, free look. Exit returns you to the
                    first-person house — no legacy shell.
                </p>
                <ul className="text-xs text-zinc-500 space-y-1.5 pt-1">
                    <li className="flex gap-2"><span className="text-violet-400">⬡</span> Ask Truth on the dais</li>
                    <li className="flex gap-2"><span className="text-violet-400">⬡</span> Soul mirror · forge appearance</li>
                    <li className="flex gap-2"><span className="text-violet-400">⬡</span> Wayfinder & ledger stations</li>
                </ul>
            </div>
            <PrimaryBtn onClick={() => openHouse('chamber')} tone="violet">
                Enter chamber →
            </PrimaryBtn>
        </Panel>
    );
}

export function StationApp({
    title,
    sub,
    body,
    panel,
    accent,
    tone,
    bullets,
}: {
    title: string;
    sub: string;
    body: string;
    panel: HousePanelId;
    accent: string;
    tone: 'emerald' | 'violet' | 'amber' | 'cyan' | 'rose' | 'sky';
    bullets?: string[];
}) {
    return (
        <Panel className="bg-zinc-950 flex flex-col gap-4">
            <AppHeader title={title} sub={sub} accent={accent} />
            <p className="text-zinc-400 text-sm leading-relaxed">{body}</p>
            {bullets && bullets.length > 0 && (
                <ul className="space-y-1.5 text-xs text-zinc-500">
                    {bullets.map((b) => (
                        <li key={b} className="flex gap-2">
                            <span className="text-white/30">·</span>
                            {b}
                        </li>
                    ))}
                </ul>
            )}
            <PrimaryBtn onClick={() => openHouse(panel)} tone={tone}>
                Open in house →
            </PrimaryBtn>
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
                <span className={music ? 'text-emerald-400 text-xs uppercase tracking-widest' : 'text-zinc-600 text-xs uppercase tracking-widest'}>
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
                Multiplayer only shows living sessions with a fresh heartbeat. Ghosts are filtered server-side and
                client-side.
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
        case 'soul':
            return <SoulApp />;
        case 'wayfinder':
            return <WayfinderApp />;
        case 'chamber':
            return <ChamberApp />;
        case 'ledger':
            return (
                <StationApp
                    title="Ledger.exe"
                    sub="Daily word & dispatches"
                    body="The hut ledger lives on the house spine — same build, no detour."
                    panel="ledger"
                    accent="text-amber-400/80"
                    tone="amber"
                    bullets={['Community word', 'Sanctum dispatches', 'Keep the fire lit']}
                />
            );
        case 'hall':
            return (
                <StationApp
                    title="Hall.exe"
                    sub="Voices gather"
                    body="The living community — chat, presence, and shared roads — opens in-house."
                    panel="hall"
                    accent="text-sky-400/80"
                    tone="sky"
                    bullets={['Archive channels', 'Soul profiles', 'Shared signal']}
                />
            );
        case 'codex':
            return (
                <StationApp
                    title="Codex.exe"
                    sub="Memory & whispers"
                    body="Threads you open with Truth and the algorithm are kept here."
                    panel="codex"
                    accent="text-fuchsia-400/80"
                    tone="violet"
                    bullets={['Whispers', 'Discoveries', 'Path memory']}
                />
            );
        case 'cinema':
            return (
                <StationApp
                    title="Cinema.exe"
                    sub="Transmissions & film"
                    body="The 400 Series and vision roads — play without leaving the house OS."
                    panel="cinema"
                    accent="text-rose-400/80"
                    tone="rose"
                    bullets={['Films', 'Eden vision', 'Prophetic cinema']}
                />
            );
        case 'offering':
            return (
                <StationApp
                    title="Offering.exe"
                    sub="Sustain the work"
                    body="Fuel the vision that keeps Truth.OS House online for every soul."
                    panel="offering"
                    accent="text-yellow-400/80"
                    tone="amber"
                    bullets={['Tiers of support', 'Envelope on the table', 'Keep the lights on']}
                />
            );
        case 'settings':
            return <SettingsApp onLogout={ctx.onLogout} onExit={ctx.onExit} />;
        default:
            return null;
    }
}
