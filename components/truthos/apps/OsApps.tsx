'use client';

import Link from 'next/link';
import AvatarCanvas from '@/components/game/AvatarCanvas';
import { useGameStore } from '@/lib/store/useGameStore';
import { visionStats } from '@/lib/brand/visionProgress';
import { suggestNextRoad } from '@/lib/brand/nextRoad';
import TruthTerminal from './TruthTerminal';
import type { OsAppId } from '../truthOsStore';

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`h-full overflow-y-auto p-4 text-sm text-zinc-200 ${className}`}>
            {children}
        </div>
    );
}

export function SoulApp() {
    const character = useGameStore((s) => s.character);
    return (
        <Panel className="flex flex-col items-center gap-4 bg-zinc-950">
            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 w-full">Vessel.exe</p>
            <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                <AvatarCanvas config={character.avatar} scale={7} />
            </div>
            <p className="font-semibold text-lg text-white">{character.name?.trim() || 'Unnamed process'}</p>
            <p className="text-xs text-zinc-500 text-center">
                Shape identity in the forging chamber. Changes sync to your soul record.
            </p>
            <Link
                href="/awakening/create"
                className="w-full text-center py-3 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs uppercase tracking-[0.2em] hover:bg-cyan-500/30"
            >
                Open character forge
            </Link>
        </Panel>
    );
}

export function WayfinderApp() {
    const stats = visionStats();
    const next = suggestNextRoad();
    return (
        <Panel className="bg-zinc-950 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400/80">Wayfinder.exe</p>
            <h3 className="text-white font-semibold text-lg">Roads beyond the room</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
                Only Eden is open while the garden is completed. Other ages remain sealed in the filesystem.
            </p>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-2">
                <p className="text-emerald-300 font-medium">Eden · first road</p>
                <p className="text-xs text-zinc-500">
                    Visions {stats.seen}/{stats.total} · relics {stats.relics}
                </p>
                <Link href="/vision/eden" className="inline-block text-xs text-emerald-400 underline underline-offset-2">
                    Open Eden vision
                </Link>
            </div>
            <div className="rounded-xl border border-white/10 p-3 text-xs text-zinc-500">
                Next signal: <span className="text-zinc-300">{next.label}</span>
            </div>
            <Link
                href="/world"
                className="block text-center py-3 rounded-lg border border-white/15 text-xs uppercase tracking-[0.2em] text-zinc-300 hover:border-emerald-400/40"
            >
                Enter 3D Chamber (legacy sanctum)
            </Link>
        </Panel>
    );
}

export function ChamberApp() {
    return (
        <Panel className="bg-zinc-950 flex flex-col gap-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-violet-400/80">Chamber.exe</p>
            <p className="text-white font-semibold">3D Sanctum runtime</p>
            <p className="text-zinc-400 text-sm leading-relaxed">
                The old chamber still runs — walkable Truth&apos;s Hut assets, stations, vessel, free look.
                Load when you need presence beyond glass.
            </p>
            <Link
                href="/world"
                className="text-center py-3.5 rounded-lg bg-violet-500/20 border border-violet-400/40 text-violet-100 text-xs uppercase tracking-[0.2em] hover:bg-violet-500/30"
            >
                Boot chamber →
            </Link>
            <p className="text-[11px] text-zinc-600">
                Tip: leave the OS running; chamber opens in the same journey save.
            </p>
        </Panel>
    );
}

export function LinkApp({
    title,
    body,
    href,
    accent,
}: {
    title: string;
    body: string;
    href: string;
    accent: string;
}) {
    return (
        <Panel className="bg-zinc-950 flex flex-col gap-4">
            <p className={`text-[10px] uppercase tracking-[0.3em] ${accent}`}>{title}</p>
            <p className="text-zinc-400 text-sm leading-relaxed">{body}</p>
            <Link
                href={href}
                className="text-center py-3 rounded-lg border border-white/15 text-xs uppercase tracking-[0.2em] text-zinc-200 hover:border-white/30"
            >
                Open →
            </Link>
        </Panel>
    );
}

export function SettingsApp({ onLogout, onExit }: { onLogout: () => void; onExit: () => void }) {
    return (
        <Panel className="bg-zinc-950 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Settings</p>
            <button
                type="button"
                onClick={onExit}
                className="w-full py-2.5 rounded-lg border border-white/10 text-left px-3 text-sm text-zinc-300 hover:bg-white/5"
            >
                Sleep display · return to room
            </button>
            <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 rounded-lg border border-red-500/30 text-left px-3 text-sm text-red-300/90 hover:bg-red-500/10"
            >
                Sign out of Truth.OS
            </button>
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
                <LinkApp
                    title="Ledger.exe"
                    body="Daily word and hut dispatches live on the network ledger."
                    href="/hut-admin"
                    accent="text-amber-400/80"
                />
            );
        case 'hall':
            return (
                <LinkApp
                    title="Hall.exe"
                    body="Voices gather. Enter the living community beyond the glass."
                    href="/archive"
                    accent="text-sky-400/80"
                />
            );
        case 'codex':
            return (
                <LinkApp
                    title="Codex.exe"
                    body="Memory, whispers, and threads you have opened with the algorithm."
                    href="/codex"
                    accent="text-fuchsia-400/80"
                />
            );
        case 'cinema':
            return (
                <LinkApp
                    title="Cinema.exe"
                    body="Transmissions and film. The 400 Series waits for signal strength."
                    href="/cinema"
                    accent="text-rose-400/80"
                />
            );
        case 'offering':
            return (
                <LinkApp
                    title="Offering.exe"
                    body="Fuel the work. Sustain the vision that keeps this OS online."
                    href="/support"
                    accent="text-yellow-400/80"
                />
            );
        case 'settings':
            return <SettingsApp onLogout={ctx.onLogout} onExit={ctx.onExit} />;
        default:
            return null;
    }
}
