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
    randomAvatar, presetFor,
    type Build, type HairStyle, type OutfitStyle, type FaceStyle,
} from '@/lib/game/avatar';
import { Loader2, Shuffle } from 'lucide-react';
import { CINEMA } from '@/lib/game/cutscenes';
import RestartJourneyButton from '@/components/game/RestartJourneyButton';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { SceneGuide } from '@/components/game/SceneGuide';
import { truthAwakeningLine } from '@/lib/game/truthVoice';

// ============================================================
//  CHAPTER II — THE FORGING OF SELF (layered character creator)
//  Compact, single-screen mobile layout (no scrolling): a small
//  preview + name up top, then dense customization tabs.
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
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const saveToCloud = useGameStore((s) => s.saveToCloud);

    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<Tab>('Body');

    usePageMusic('forging_self');

    useEffect(() => {
        setMounted(true);
        loadFromCloud();
    }, [loadFromCloud]);

    const av = character.avatar;
    const aura = character.appearance.aura;

    const confirm = () => {
        if (!character.name.trim()) return;
        setSaving(true);
        setAppearance({ gender: av.build === 'fem' ? 'female' : 'male' });
        completeAwakening();
        saveToCloud();
        router.push('/awakening/path');
    };

    if (!mounted) return <div className="bg-void" style={{ height: '100dvh' }} />;

    return (
        <main className="relative bg-black text-white overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
            <CinematicVideo src={CINEMA.forging} overlay="heavy" showMuteControl />
            <div className="grain-overlay pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.08), transparent 55%)' }} />

            <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto px-4"
                style={{ paddingTop: 'calc(0.6rem + env(safe-area-inset-top))', paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom))' }}>

                <div className="shrink-0">
                    <p className="text-[8px] tracking-[0.35em] uppercase text-aether-gold/70 text-center mb-2">Chapter II · Forging of Self</p>
                    <SceneGuide line={truthAwakeningLine('create', character)} accent="#fbbf24" />
                </div>

                {/* preview + name / presets */}
                <div className="flex gap-3 mt-3 shrink-0">
                    <div className="relative rounded-2xl overflow-hidden border border-[rgba(251,191,36,0.12)] flex items-center justify-center shrink-0"
                        style={{ width: 108, height: 150, background: 'radial-gradient(circle at 50% 30%, #15110a 0%, #0a0805 60%, #050403 100%)' }}>
                        <div className="absolute rounded-full pointer-events-none" style={{ width: 150, height: 150, background: `radial-gradient(circle, ${aura}33 0%, transparent 70%)`, filter: 'blur(8px)' }} />
                        <AvatarCanvas config={av} scale={6} className="relative truth-float" style={{ filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.5))' }} />
                        <div className="absolute pointer-events-none" style={{ bottom: 14, width: 88, height: 16, borderRadius: '50%', background: `radial-gradient(ellipse at center, ${aura}55 0%, transparent 72%)` }} />
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
                        <p className="font-ritual text-lg text-white truncate">{character.name || <span className="text-zinc-600 italic">Unnamed Soul</span>}</p>
                        <input
                            value={character.name}
                            onChange={(e) => setName(e.target.value.slice(0, 24))}
                            placeholder="speak your name"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-ritual tracking-wide focus:outline-none focus:border-aether-gold transition-colors"
                        />
                        <div className="flex gap-1.5">
                            <button onClick={() => setAvatar(presetFor('masc'))} className="flex-1 py-2 rounded-lg text-sm font-black border bg-white/5 border-white/10 text-zinc-300 hover:border-white/25">♂</button>
                            <button onClick={() => setAvatar(presetFor('fem'))} className="flex-1 py-2 rounded-lg text-sm font-black border bg-white/5 border-white/10 text-zinc-300 hover:border-white/25">♀</button>
                            <button onClick={() => setAvatar(randomAvatar(av.build))} aria-label="Random" className="flex-1 py-2 rounded-lg border bg-aether-gold/10 border-aether-gold/30 text-aether-gold flex items-center justify-center"><Shuffle className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                {/* tabs */}
                <div className="flex gap-1 mt-3 shrink-0">
                    {TABS.map((t) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${tab === t ? 'bg-aether-gold/15 border border-aether-gold/50 text-aether-gold' : 'bg-white/5 border border-white/10 text-zinc-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* tab content — fills the rest */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mt-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    {tab === 'Body' && (
                        <>
                            <Section label="Build">
                                <div className="flex gap-2">
                                    {(['masc', 'fem'] as Build[]).map((b) => (
                                        <OptBtn key={b} active={av.build === b} onClick={() => setAvatar({ build: b })}>{b === 'masc' ? 'Masculine' : 'Feminine'}</OptBtn>
                                    ))}
                                </div>
                            </Section>
                            <Section label="Skin tone"><Swatches colors={SKIN_TONES} active={av.skin} onPick={(i) => setAvatar({ skin: i })} /></Section>
                        </>
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
                        <Section label="Expression & hair">
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
                            <Section label="Legs"><Swatches colors={CLOTH_COLORS} active={av.bottom} onPick={(i) => setAvatar({ bottom: i })} /></Section>
                            <Section label="Boots"><Swatches colors={BOOT_COLORS} active={av.boots} onPick={(i) => setAvatar({ boots: i })} /></Section>
                        </>
                    )}
                    {tab === 'Aura' && (
                        <Section label="Aura glow">
                            <div className="flex flex-wrap gap-2.5">
                                {AURA_OPTIONS.map((a) => (
                                    <button key={a.color} onClick={() => setAppearance({ aura: a.color })} title={a.name}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform ${a.color === aura ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                                        style={{ background: a.color, borderColor: a.color === aura ? '#fff' : 'transparent', boxShadow: a.color === aura ? `0 0 16px ${a.color}` : 'none' }} />
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                {/* confirm */}
                <button onClick={confirm} disabled={saving || !character.name.trim()}
                    className="shrink-0 mt-2 w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {saving ? 'Forging…' : 'Begin your journey →'}
                </button>
                <div className="shrink-0 mt-2 flex justify-center">
                    <RestartJourneyButton label="Erase progress & start over" variant="link" />
                </div>
            </div>
        </main>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-3 last:mb-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1.5">{label}</p>
            {children}
        </div>
    );
}

function OptBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${active ? 'bg-aether-gold/15 border border-aether-gold/50 text-aether-gold' : 'bg-white/5 border border-white/10 text-zinc-300 hover:border-white/25'}`}>
            {children}
        </button>
    );
}

function Swatches({ colors, active, onPick }: { colors: string[]; active: number; onPick: (i: number) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {colors.map((c, i) => (
                <button key={c + i} onClick={() => onPick(i)} title={c}
                    className={`w-6 h-6 rounded-md border-2 transition-transform ${i === active ? 'scale-110' : 'opacity-80 hover:opacity-100'}`}
                    style={{ background: c, borderColor: i === active ? '#fff' : 'rgba(255,255,255,0.12)' }} />
            ))}
        </div>
    );
}
