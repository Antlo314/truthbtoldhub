'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store/useGameStore';
import AvatarCanvas from '@/components/game/AvatarCanvas';
import { SceneGuide } from '@/components/game/SceneGuide';
import { AURA_OPTIONS } from '@/components/game/KenneySprite';
import {
    SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, BOOT_COLORS,
    HAIR_STYLES, OUTFIT_STYLES, FACE_STYLES,
    randomAvatar, presetFor,
    type Build, type HairStyle, type OutfitStyle, type FaceStyle,
} from '@/lib/game/avatar';
import { Loader2, Shuffle } from 'lucide-react';

// ============================================================
//  CHAPTER II — THE FORGING OF SELF (layered character creator)
//  A full-body, layered avatar: build, skin, hair, face, outfit,
//  aura. Live preview; saved to Supabase (game_state) + local.
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

    useEffect(() => { setMounted(true); loadFromCloud(); }, [loadFromCloud]);

    const av = character.avatar;
    const aura = character.appearance.aura;

    const confirm = () => {
        if (!character.name.trim()) return;
        setSaving(true);
        // keep the legacy gender flag in step with the build
        setAppearance({ gender: av.build === 'fem' ? 'female' : 'male' });
        completeAwakening();
        saveToCloud();
        router.push('/awakening/path');
    };

    if (!mounted) return <div className="min-h-screen bg-void" />;

    return (
        <main className="relative min-h-screen bg-void text-white overflow-x-hidden">
            <div className="grain-overlay" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.08), transparent 55%)' }} />

            <div className="relative z-10 max-w-5xl mx-auto px-5 py-8 md:py-12">
                <div className="text-center mb-5">
                    <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70">Chapter II · The Forging of Self</p>
                </div>
                <div className="mb-7">
                    <SceneGuide line="Now forge the vessel you will carry into the world — your build, your skin, your hair and dress. Make it your own; the world will know you by it." />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                    {/* ===== live preview ===== */}
                    <div className="rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[360px] border border-[rgba(251,191,36,0.12)]"
                        style={{ background: 'radial-gradient(circle at 50% 30%, #15110a 0%, #0a0805 60%, #050403 100%)' }}>
                        <div className="absolute left-0 right-0 bottom-0 pointer-events-none" style={{ height: 130, background: `linear-gradient(to top, ${aura}22, transparent)` }} />
                        <div className="absolute rounded-full pointer-events-none" style={{ width: 280, height: 280, background: `radial-gradient(circle, ${aura}33 0%, ${aura}0d 45%, transparent 70%)`, filter: 'blur(10px)' }} />
                        <AvatarCanvas config={av} scale={9} className="relative truth-float" style={{ filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.5))' }} />
                        <div className="absolute pointer-events-none" style={{ bottom: 44, width: 150, height: 24, borderRadius: '50%', background: `radial-gradient(ellipse at center, ${aura}55 0%, ${aura}1a 45%, transparent 72%)`, filter: 'blur(1px)' }} />
                        <p className="relative font-ritual text-2xl text-white mt-5 tracking-wide">
                            {character.name || <span className="text-zinc-600 italic">Unnamed Soul</span>}
                        </p>
                    </div>

                    {/* ===== controls ===== */}
                    <div className="space-y-5">
                        {/* name */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2 block">Your Name</label>
                            <input
                                value={character.name}
                                onChange={(e) => setName(e.target.value.slice(0, 24))}
                                placeholder="speak your name"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-base text-white font-ritual tracking-wide focus:outline-none focus:border-aether-gold transition-colors"
                            />
                        </div>

                        {/* presets + random */}
                        <div className="flex gap-2">
                            <button onClick={() => setAvatar(presetFor('masc'))} className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] border bg-white/5 border-white/10 text-zinc-300 hover:border-white/25">♂ Preset</button>
                            <button onClick={() => setAvatar(presetFor('fem'))} className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] border bg-white/5 border-white/10 text-zinc-300 hover:border-white/25">♀ Preset</button>
                            <button onClick={() => setAvatar(randomAvatar(av.build))} className="px-4 py-2.5 rounded-xl border bg-aether-gold/10 border-aether-gold/30 text-aether-gold flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em]"><Shuffle className="w-3.5 h-3.5" /> Random</button>
                        </div>

                        {/* tabs */}
                        <div className="flex gap-1.5 flex-wrap">
                            {TABS.map((t) => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`px-3.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-aether-gold/15 border border-aether-gold/50 text-aether-gold' : 'bg-white/5 border border-white/10 text-zinc-400 hover:border-white/20'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* tab content */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 min-h-[180px]">
                            {tab === 'Body' && (
                                <>
                                    <Section label="Build">
                                        <div className="flex gap-2">
                                            {(['masc', 'fem'] as Build[]).map((b) => (
                                                <OptBtn key={b} active={av.build === b} onClick={() => setAvatar({ build: b })}>{b === 'masc' ? 'Masculine' : 'Feminine'}</OptBtn>
                                            ))}
                                        </div>
                                    </Section>
                                    <Section label="Skin tone">
                                        <Swatches colors={SKIN_TONES} active={av.skin} onPick={(i) => setAvatar({ skin: i })} />
                                    </Section>
                                </>
                            )}
                            {tab === 'Hair' && (
                                <>
                                    <Section label="Style">
                                        <div className="flex flex-wrap gap-2">
                                            {HAIR_STYLES.map((h: HairStyle) => (
                                                <OptBtn key={h} active={av.hairStyle === h} onClick={() => setAvatar({ hairStyle: h })}>{cap(h)}</OptBtn>
                                            ))}
                                        </div>
                                    </Section>
                                    <Section label="Colour">
                                        <Swatches colors={HAIR_COLORS} active={av.hairColor} onPick={(i) => setAvatar({ hairColor: i })} />
                                    </Section>
                                </>
                            )}
                            {tab === 'Face' && (
                                <Section label="Expression & hair">
                                    <div className="flex flex-wrap gap-2">
                                        {FACE_STYLES.map((f: FaceStyle) => (
                                            <OptBtn key={f} active={av.face === f} onClick={() => setAvatar({ face: f })}>{cap(f)}</OptBtn>
                                        ))}
                                    </div>
                                </Section>
                            )}
                            {tab === 'Outfit' && (
                                <>
                                    <Section label="Garb">
                                        <div className="flex flex-wrap gap-2">
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
                                    <div className="flex flex-wrap gap-3">
                                        {AURA_OPTIONS.map((a) => (
                                            <button key={a.color} onClick={() => setAppearance({ aura: a.color })} title={a.name}
                                                className={`w-9 h-9 rounded-full border-2 transition-transform ${a.color === aura ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                                                style={{ background: a.color, borderColor: a.color === aura ? '#fff' : 'transparent', boxShadow: a.color === aura ? `0 0 16px ${a.color}` : 'none' }} />
                                        ))}
                                    </div>
                                </Section>
                            )}
                        </div>

                        {/* confirm */}
                        <button onClick={confirm} disabled={saving || !character.name.trim()}
                            className="w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {saving ? 'Forging…' : 'Begin your journey →'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-4 last:mb-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">{label}</p>
            {children}
        </div>
    );
}

function OptBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick}
            className={`px-3 py-2 rounded-lg text-[11px] font-bold tracking-wide transition-all ${active ? 'bg-aether-gold/15 border border-aether-gold/50 text-aether-gold' : 'bg-white/5 border border-white/10 text-zinc-300 hover:border-white/25'}`}>
            {children}
        </button>
    );
}

function Swatches({ colors, active, onPick }: { colors: string[]; active: number; onPick: (i: number) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {colors.map((c, i) => (
                <button key={c + i} onClick={() => onPick(i)} title={c}
                    className={`w-7 h-7 rounded-md border-2 transition-transform ${i === active ? 'scale-110' : 'opacity-80 hover:opacity-100'}`}
                    style={{ background: c, borderColor: i === active ? '#fff' : 'rgba(255,255,255,0.12)' }} />
            ))}
        </div>
    );
}
