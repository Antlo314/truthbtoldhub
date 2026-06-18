'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store/useGameStore';
import AvatarCanvas from '@/components/game/AvatarCanvas';
import CinematicVideo from '@/components/game/CinematicVideo';
import { AURA_OPTIONS } from '@/components/game/KenneySprite';
import {
    SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, BOOT_COLORS,
    HAIR_STYLES, OUTFIT_STYLES, FACE_STYLES,
    randomAvatar,
    type Build, type HairStyle, type OutfitStyle, type FaceStyle,
} from '@/lib/game/avatar';
import { Loader2, Shuffle, Pencil, Check } from 'lucide-react';
import { CINEMA } from '@/lib/game/cutscenes';
import RestartJourneyButton from '@/components/game/RestartJourneyButton';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { SceneGuide } from '@/components/game/SceneGuide';
import { truthAwakeningLine } from '@/lib/game/truthVoice';

// ============================================================
//  CHAPTER II — THE FORGING OF SELF (layered character creator)
//  Enterprise, responsive layout: a reverent header + Truth's
//  guidance, a hero "vessel" panel (large breathing avatar, name,
//  build) beside the customization tabs, and a persistent action
//  bar. Single column on phones, two columns from lg up.
// ============================================================

const TABS = ['Body', 'Hair', 'Face', 'Outfit', 'Aura'] as const;
type Tab = typeof TABS[number];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function CreatePage() {
    const router = useRouter();
    const character = useGameStore((s) => s.character);
    const setName = useGameStore((s) => s.setName);
    const setAvatar = useGameStore((s) => s.setAvatar);
    const setAppearance = useGameStore((s) => s.setAppearance);
    const completeAwakening = useGameStore((s) => s.completeAwakening);
    const saveToCloud = useGameStore((s) => s.saveToCloud);

    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<Tab>('Body');
    const [editingName, setEditingName] = useState(false);

    usePageMusic('forging_self');

    // No loadFromCloud here: the player arrives from the intro with their name
    // already set locally, and a cloud SELECT racing the intro's save could
    // clobber the freshly-typed name. (Cross-device resume happens on /world.)
    useEffect(() => {
        setMounted(true);
    }, []);

    const av = character.avatar;
    const aura = character.appearance.aura;
    const named = character.name.trim().length > 0;

    const confirm = () => {
        if (!named) return;
        setSaving(true);
        setAppearance({ gender: av.build === 'fem' ? 'female' : 'male' });
        completeAwakening();
        saveToCloud();
        router.push('/awakening/path');
    };

    if (!mounted) return <div className="bg-void" style={{ height: '100dvh' }} />;

    return (
        <main className="relative min-h-[100dvh] bg-black text-white overflow-x-hidden overflow-y-auto"
            style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
            <CinematicVideo src={CINEMA.forging} overlay="heavy" showMuteControl />
            <div className="grain-overlay pointer-events-none" />
            <div className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(120% 55% at 50% -5%, rgba(251,191,36,0.10), transparent 60%)' }} />

            <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6"
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>

                {/* ── Header ── */}
                <header className="text-center mb-5">
                    <p className="text-[9px] sm:text-[10px] tracking-[0.45em] uppercase text-[#fbbf24]/70">Chapter II</p>
                    <h1 className="font-ritual text-2xl sm:text-4xl font-black uppercase tracking-tight gold-shimmer mt-1 leading-tight">
                        The Forging of Self
                    </h1>
                    <p className="text-[11px] sm:text-xs text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                        Shape the vessel you will carry into the world — name it, form it, and let your aura declare it.
                    </p>
                </header>

                {/* ── Truth speaks ── */}
                <div className="mb-6">
                    <SceneGuide line={truthAwakeningLine('create', character)} accent="#fbbf24" />
                </div>

                {/* ── Vessel | Customization ── */}
                <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-5 lg:gap-7 items-start">

                    {/* LEFT — the vessel */}
                    <aside className="space-y-4 lg:sticky lg:top-6">
                        <div
                            className="relative rounded-3xl border border-[#fbbf24]/20 overflow-hidden shadow-[0_0_48px_rgba(251,191,36,0.06)]"
                            style={{ background: 'radial-gradient(circle at 50% 26%, #1a140b 0%, #0a0805 62%, #050403 100%)' }}
                        >
                            {/* aura bloom */}
                            <div
                                aria-hidden
                                className="pointer-events-none absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                                style={{ width: 250, height: 250, background: `radial-gradient(circle, ${aura}38 0%, ${aura}12 45%, transparent 70%)`, filter: 'blur(10px)' }}
                            />
                            <div className="relative flex flex-col items-center px-6 pt-10 pb-7">
                                <div className="relative">
                                    <AvatarCanvas config={av} scale={8} className="truth-float" style={{ filter: 'drop-shadow(0 12px 14px rgba(0,0,0,0.55))' }} />
                                    <div
                                        aria-hidden
                                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                                        style={{ bottom: -2, width: 132, height: 18, borderRadius: '50%', background: `radial-gradient(ellipse at center, ${aura}66 0%, transparent 72%)` }}
                                    />
                                </div>

                                {/* name */}
                                <div className="mt-7 w-full">
                                    {editingName || !named ? (
                                        <input
                                            value={character.name}
                                            onChange={(e) => setName(e.target.value.slice(0, 24))}
                                            onBlur={() => setEditingName(false)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); }}
                                            placeholder="speak your name"
                                            autoFocus
                                            aria-label="Your soul's name"
                                            className="w-full text-center bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-lg text-white font-ritual tracking-wide focus:outline-none focus:border-[#fbbf24]/60 focus-visible:ring-1 focus-visible:ring-[#fbbf24]/40 transition-colors"
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setEditingName(true)}
                                            className="group w-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/60 rounded-lg"
                                            title="Rename"
                                        >
                                            <span className="font-ritual text-2xl text-white truncate max-w-[14ch]">{character.name}</span>
                                            <Pencil className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#fbbf24] shrink-0 transition-colors" />
                                        </button>
                                    )}
                                    <p className="text-center text-[8px] uppercase tracking-[0.35em] text-zinc-500 mt-2">Your soul&apos;s name</p>
                                </div>
                            </div>
                        </div>

                        {/* build (gender) — a real, visible choice */}
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1.5 px-0.5">Form</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(['masc', 'fem'] as Build[]).map((b) => {
                                    const active = av.build === b;
                                    return (
                                        <button
                                            key={b}
                                            onClick={() => setAvatar({ build: b })}
                                            aria-pressed={active}
                                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.12em] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/60 ${
                                                active
                                                    ? 'border-[#fbbf24]/60 bg-[#fbbf24]/15 text-[#fbbf24]'
                                                    : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                                            }`}
                                        >
                                            <span className="text-sm leading-none">{b === 'masc' ? '♂' : '♀'}</span>
                                            {b === 'masc' ? 'Masculine' : 'Feminine'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={() => setAvatar(randomAvatar(av.build))}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#fbbf24]/25 bg-[#fbbf24]/[0.06] text-[11px] font-bold uppercase tracking-[0.2em] text-[#fbbf24] hover:bg-[#fbbf24]/12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/60"
                        >
                            <Shuffle className="w-3.5 h-3.5" /> Surprise me
                        </button>
                    </aside>

                    {/* RIGHT — customization */}
                    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                        <div role="tablist" aria-label="Customization" className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-4">
                            {TABS.map((t) => {
                                const active = tab === t;
                                return (
                                    <button
                                        key={t}
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setTab(t)}
                                        className={`shrink-0 px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/60 ${
                                            active
                                                ? 'bg-[#fbbf24]/15 border-[#fbbf24]/50 text-[#fbbf24]'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="min-h-[230px]">
                            {tab === 'Body' && (
                                <Section label="Skin tone">
                                    <Swatches colors={SKIN_TONES} active={av.skin} onPick={(i) => setAvatar({ skin: i })} />
                                </Section>
                            )}
                            {tab === 'Hair' && (
                                <>
                                    <Section label="Style">
                                        <div className="flex flex-wrap gap-1.5">
                                            {HAIR_STYLES.map((h: HairStyle) => (
                                                <OptBtn key={h} active={av.hairStyle === h} onClick={() => setAvatar({ hairStyle: h })}>{cap(h)}</OptBtn>
                                            ))}
                                        </div>
                                    </Section>
                                    <Section label="Colour"><Swatches colors={HAIR_COLORS} active={av.hairColor} onPick={(i) => setAvatar({ hairColor: i })} /></Section>
                                </>
                            )}
                            {tab === 'Face' && (
                                <Section label="Expression">
                                    <div className="flex flex-wrap gap-1.5">
                                        {FACE_STYLES.map((f: FaceStyle) => (
                                            <OptBtn key={f} active={av.face === f} onClick={() => setAvatar({ face: f })}>{cap(f)}</OptBtn>
                                        ))}
                                    </div>
                                </Section>
                            )}
                            {tab === 'Outfit' && (
                                <>
                                    <Section label="Garb">
                                        <div className="flex flex-wrap gap-1.5">
                                            {OUTFIT_STYLES.map((o: OutfitStyle) => (
                                                <OptBtn key={o} active={av.outfit === o} onClick={() => setAvatar({ outfit: o })}>{cap(o)}</OptBtn>
                                            ))}
                                        </div>
                                    </Section>
                                    <Section label="Top"><Swatches colors={CLOTH_COLORS} active={av.top} onPick={(i) => setAvatar({ top: i })} /></Section>
                                    <Section label="Lower"><Swatches colors={CLOTH_COLORS} active={av.bottom} onPick={(i) => setAvatar({ bottom: i })} /></Section>
                                    <Section label="Boots"><Swatches colors={BOOT_COLORS} active={av.boots} onPick={(i) => setAvatar({ boots: i })} /></Section>
                                </>
                            )}
                            {tab === 'Aura' && (
                                <Section label="Aura glow">
                                    <div className="flex flex-wrap gap-3">
                                        {AURA_OPTIONS.map((a) => {
                                            const active = a.color === aura;
                                            return (
                                                <button
                                                    key={a.color}
                                                    onClick={() => setAppearance({ aura: a.color })}
                                                    title={a.name}
                                                    aria-label={a.name}
                                                    aria-pressed={active}
                                                    className={`relative w-9 h-9 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${active ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                                                    style={{ background: a.color, borderColor: active ? '#fff' : 'transparent', boxShadow: active ? `0 0 16px ${a.color}` : 'none' }}
                                                >
                                                    {active && <Check className="absolute inset-0 m-auto w-4 h-4 text-black/70" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Section>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* ── Persistent action bar ── */}
            <footer
                className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-black/80 backdrop-blur-md"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center gap-3">
                    <RestartJourneyButton label="Start over" variant="link" />
                    <div className="flex-1" />
                    {!named && <span className="text-[10px] text-zinc-500 hidden sm:block">Name your soul to continue</span>}
                    <button
                        onClick={confirm}
                        disabled={saving || !named}
                        className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform active:scale-[0.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {saving ? 'Forging…' : 'Begin your journey →'}
                    </button>
                </div>
            </footer>
        </main>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-4 last:mb-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">{label}</p>
            {children}
        </div>
    );
}

function OptBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/60 ${active ? 'bg-[#fbbf24]/15 border border-[#fbbf24]/50 text-[#fbbf24]' : 'bg-white/5 border border-white/10 text-zinc-300 hover:border-white/25'}`}>
            {children}
        </button>
    );
}

function Swatches({ colors, active, onPick }: { colors: string[]; active: number; onPick: (i: number) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {colors.map((c, i) => {
                const on = i === active;
                return (
                    <button key={c + i} onClick={() => onPick(i)} title={c} aria-label={`Colour ${i + 1}`} aria-pressed={on}
                        className={`relative w-7 h-7 rounded-lg border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${on ? 'scale-110' : 'opacity-80 hover:opacity-100'}`}
                        style={{ background: c, borderColor: on ? '#fff' : 'rgba(255,255,255,0.12)' }}>
                        {on && <Check className="absolute inset-0 m-auto w-3.5 h-3.5 text-black/70" />}
                    </button>
                );
            })}
        </div>
    );
}
