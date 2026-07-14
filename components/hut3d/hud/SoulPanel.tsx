'use client';

/**
 * Soul Mirror — live 3D vessel forge (AvatarConfig → VesselModel).
 */
import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { useGameStore } from '@/lib/store/useGameStore';
import { VesselModel } from '@/components/hut3d/VesselModel';
import {
    SKIN_TONES,
    HAIR_COLORS,
    CLOTH_COLORS,
    BOOT_COLORS,
    EYE_COLORS,
    EYE_NAMES,
    type AvatarConfig,
    type Build,
    type HairStyle,
    type FaceStyle,
    type OutfitStyle,
    type Extra,
} from '@/lib/game/avatar';
import type { GamePath } from '@/lib/store/useGameStore';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const HAIR_STYLES: HairStyle[] = [
    'short', 'afro', 'locs', 'twists', 'coils', 'waves', 'highTop',
    'long', 'bun', 'braids', 'buzz', 'ponytail', 'crown', 'curls',
];
const FACES: FaceStyle[] = ['calm', 'keen', 'goatee', 'beard', 'mustache'];
const EXTRAS: Extra[] = ['none', 'circlet', 'hood', 'earrings', 'glasses', 'warpaint', 'belt', 'flower', 'scar'];
const PATHS: { id: GamePath; label: string }[] = [
    { id: 'seer', label: 'Seer' },
    { id: 'sentinel', label: 'Sentinel' },
    { id: 'scribe', label: 'Scribe' },
    { id: 'mystic', label: 'Mystic' },
];

function outfitsFor(build: Build): OutfitStyle[] {
    return build === 'fem'
        ? ['dress', 'gown', 'robe', 'tunic', 'wanderer', 'vestment']
        : ['tunic', 'vest', 'robe', 'cloak', 'wanderer', 'vestment'];
}

function SwatchRow({
    colors,
    value,
    onChange,
}: {
    colors: string[];
    value: number;
    onChange: (i: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {colors.map((c, i) => (
                <button
                    key={`${c}-${i}`}
                    type="button"
                    onClick={() => {
                        sacredUi.click();
                        onChange(i);
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        value === i ? 'border-white scale-110' : 'border-white/15 hover:border-white/40'
                    }`}
                    style={{ background: c }}
                    aria-label={`Color ${i + 1}`}
                />
            ))}
        </div>
    );
}

function ChipRow<T extends string>({
    options,
    value,
    onChange,
    labels,
}: {
    options: T[];
    value: T;
    onChange: (v: T) => void;
    labels?: Record<string, string>;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
                <button
                    key={o}
                    type="button"
                    onClick={() => {
                        sacredUi.click();
                        onChange(o);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider border transition-colors ${
                        value === o
                            ? 'bg-aether-gold/20 border-aether-gold/50 text-aether-gold'
                            : 'bg-white/5 border-white/10 text-white/55 hover:text-white'
                    }`}
                >
                    {labels?.[o] ?? o}
                </button>
            ))}
        </div>
    );
}

function VesselPreview({ avatar }: { avatar: AvatarConfig }) {
    return (
        <div className="w-full h-52 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a1528] to-black overflow-hidden">
            <Canvas
                camera={{ position: [0, 1.1, 2.4], fov: 35 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: true }}
            >
                <color attach="background" args={['#0c0a12']} />
                <ambientLight intensity={0.65} />
                <directionalLight position={[2, 4, 2]} intensity={1.1} color="#e8ecff" />
                <pointLight position={[-1, 1.5, 1]} intensity={0.5} color="#a78bfa" />
                <Suspense fallback={null}>
                    <group position={[0, 0, 0]}>
                        <VesselModel avatar={avatar} scale={1.05} />
                    </group>
                    <ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={4} blur={2.5} />
                </Suspense>
            </Canvas>
        </div>
    );
}

export default function SoulPanel({ onClose }: { onClose: () => void }) {
    const character = useGameStore((s) => s.character);
    const setAvatar = useGameStore((s) => s.setAvatar);
    const setName = useGameStore((s) => s.setName);
    const setPath = useGameStore((s) => s.setPath);
    const saveToCloud = useGameStore((s) => s.saveToCloud);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'body' | 'hair' | 'face' | 'outfit' | 'path'>('body');

    const avatar = character.avatar;
    const outfits = useMemo(() => outfitsFor(avatar.build), [avatar.build]);

    const patch = (u: Partial<AvatarConfig>) => {
        setAvatar(u);
    };

    const handleSave = async () => {
        setSaving(true);
        sacredUi.access();
        try {
            await saveToCloud();
        } catch {
            /* offline / guest ok */
        }
        setSaving(false);
        onClose();
    };

    const tabs = [
        { id: 'body' as const, label: 'Body' },
        { id: 'hair' as const, label: 'Hair' },
        { id: 'face' as const, label: 'Face' },
        { id: 'outfit' as const, label: 'Outfit' },
        { id: 'path' as const, label: 'Path' },
    ];

    return (
        <div className="flex flex-col h-full min-h-0 bg-[#0a0a12]">
            <header className="shrink-0 px-5 pt-4 pb-3 border-b border-white/10">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold">Soul Mirror</p>
                <h2 className="font-ritual text-2xl text-white mt-1">Your Vessel</h2>
                <p className="mt-1.5 text-sm text-white/50 leading-relaxed">
                    Live 3D form — changes update immediately. Save to keep them.
                </p>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
                <VesselPreview avatar={avatar} />

                <input
                    value={character.name || ''}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    placeholder="Name"
                    className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold/50"
                />

                <div className="flex gap-1 p-1 rounded-xl bg-black/40 border border-white/8">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] uppercase tracking-wider ${
                                tab === t.id ? 'bg-white/10 text-white' : 'text-white/40'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'body' && (
                    <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Build</p>
                        <ChipRow
                            options={['masc', 'fem'] as Build[]}
                            value={avatar.build}
                            onChange={(v) => {
                                const next = outfitsFor(v);
                                patch({
                                    build: v,
                                    outfit: next.includes(avatar.outfit) ? avatar.outfit : next[0],
                                });
                            }}
                            labels={{ masc: 'Masc', fem: 'Fem' }}
                        />
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Skin</p>
                        <SwatchRow colors={SKIN_TONES} value={avatar.skin} onChange={(i) => patch({ skin: i })} />
                    </div>
                )}

                {tab === 'hair' && (
                    <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Style</p>
                        <ChipRow options={HAIR_STYLES} value={avatar.hairStyle} onChange={(v) => patch({ hairStyle: v })} />
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Color</p>
                        <SwatchRow
                            colors={HAIR_COLORS}
                            value={avatar.hairColor}
                            onChange={(i) => patch({ hairColor: i })}
                        />
                    </div>
                )}

                {tab === 'face' && (
                    <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Face</p>
                        <ChipRow options={FACES} value={avatar.face} onChange={(v) => patch({ face: v })} />
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Eyes</p>
                        <SwatchRow
                            colors={EYE_COLORS}
                            value={avatar.eyes ?? 0}
                            onChange={(i) => patch({ eyes: i })}
                        />
                        <p className="text-[9px] text-white/30">{EYE_NAMES[avatar.eyes ?? 0]}</p>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Extra</p>
                        <ChipRow
                            options={EXTRAS}
                            value={(avatar.extra ?? 'none') as Extra}
                            onChange={(v) => patch({ extra: v })}
                        />
                    </div>
                )}

                {tab === 'outfit' && (
                    <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Garb</p>
                        <ChipRow options={outfits} value={avatar.outfit} onChange={(v) => patch({ outfit: v })} />
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Top</p>
                        <SwatchRow colors={CLOTH_COLORS} value={avatar.top} onChange={(i) => patch({ top: i })} />
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Legs</p>
                        <SwatchRow colors={CLOTH_COLORS} value={avatar.bottom} onChange={(i) => patch({ bottom: i })} />
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Boots</p>
                        <SwatchRow colors={BOOT_COLORS} value={avatar.boots} onChange={(i) => patch({ boots: i })} />
                    </div>
                )}

                {tab === 'path' && (
                    <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/40">Path</p>
                        <div className="grid grid-cols-2 gap-2">
                            {PATHS.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                        sacredUi.click();
                                        setPath(p.id);
                                    }}
                                    className={`py-3 rounded-xl border text-sm ${
                                        character.path === p.id
                                            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100'
                                            : 'border-white/10 text-white/60 hover:border-white/25'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <footer className="shrink-0 p-4 border-t border-white/10 flex gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/15 text-sm uppercase tracking-[0.15em] text-white/70"
                >
                    Close
                </button>
                <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-aether-gold text-black font-semibold text-sm uppercase tracking-[0.15em] disabled:opacity-60"
                >
                    {saving ? 'Saving…' : 'Save vessel'}
                </button>
            </footer>
        </div>
    );
}
