'use client';

/**
 * Soul Mirror — full-body live 3D vessel (rotatable). No Paths.
 */
import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { useGameStore } from '@/lib/store/useGameStore';
import { VesselModel } from '@/components/hut3d/VesselModel';
import {
    SKIN_TONES,
    HAIR_COLORS,
    CLOTH_COLORS,
    BOOT_COLORS,
    EYE_COLORS,
    EYE_NAMES,
    VESSEL_FINISHES,
    VESSEL_FINISH_LABELS,
    type AvatarConfig,
    type Build,
    type HairStyle,
    type FaceStyle,
    type OutfitStyle,
    type Extra,
    type VesselFinish,
} from '@/lib/game/avatar';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const HAIR_STYLES: HairStyle[] = [
    'short', 'afro', 'locs', 'twists', 'coils', 'waves', 'highTop',
    'long', 'bun', 'braids', 'buzz', 'ponytail', 'crown', 'curls',
];
const FACES: FaceStyle[] = ['calm', 'keen', 'goatee', 'beard', 'mustache'];
const EXTRAS: Extra[] = ['none', 'circlet', 'hood', 'earrings', 'glasses', 'warpaint', 'belt', 'flower', 'scar'];

function outfitsFor(build: Build): OutfitStyle[] {
    return build === 'fem'
        ? ['dress', 'gown', 'robe', 'tunic', 'wanderer', 'vestment']
        : ['tunic', 'vest', 'robe', 'cloak', 'wanderer', 'vestment'];
}

/** Bruno-style color picker: large touch targets, ring selection, live 3D tint */
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
        <div className="flex flex-wrap gap-2">
            {colors.map((c, i) => {
                const on = value === i;
                return (
                    <button
                        key={`${c}-${i}`}
                        type="button"
                        onClick={() => {
                            sacredUi.click();
                            onChange(i);
                        }}
                        className={`relative w-8 h-8 sm:w-7 sm:h-7 rounded-full border-2 transition-transform touch-manipulation ${
                            on
                                ? 'border-white scale-110 shadow-[0_0_0_2px_rgba(251,191,36,0.45)]'
                                : 'border-white/15 hover:border-white/40 active:scale-95'
                        }`}
                        style={{ background: c }}
                        aria-label={`Color ${i + 1}`}
                        aria-pressed={on}
                    >
                        {on && (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                                ✓
                            </span>
                        )}
                    </button>
                );
            })}
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

/** Orbit + gentle idle spin when not dragging */
function VesselOrbit({ spinning }: { spinning: boolean }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controls = useRef<any>(null);
    useFrame((_, dt) => {
        const c = controls.current;
        if (!spinning || !c) return;
        c.setAzimuthalAngle(c.getAzimuthalAngle() + dt * 0.35);
        c.update();
    });
    return (
        <OrbitControls
            ref={controls}
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={1.6}
            maxDistance={4.2}
            minPolarAngle={0.35}
            maxPolarAngle={Math.PI / 2 + 0.15}
            target={[0, 0.95, 0]}
            rotateSpeed={0.7}
        />
    );
}

function VesselPreview({ avatar }: { avatar: AvatarConfig }) {
    const [dragging, setDragging] = useState(false);
    const mobile =
        typeof window !== 'undefined' &&
        (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768);

    return (
        <div
            className="relative w-full h-full min-h-[280px] rounded-none sm:rounded-2xl border-0 sm:border border-white/10 bg-gradient-to-b from-[#1a1528] via-[#0c0a14] to-black overflow-hidden touch-none"
            onPointerDown={() => setDragging(true)}
            onPointerUp={() => setDragging(false)}
            onPointerLeave={() => setDragging(false)}
        >
            <Canvas
                camera={{ position: [0, 1.05, 2.85], fov: 32, near: 0.1, far: 20 }}
                dpr={mobile ? [1, 1.25] : [1, 1.75]}
                performance={{ min: mobile ? 0.4 : 0.7 }}
                gl={{
                    antialias: !mobile,
                    alpha: true,
                    powerPreference: mobile ? 'low-power' : 'high-performance',
                }}
                onCreated={({ camera, gl }) => {
                    camera.lookAt(0, 0.95, 0);
                    if (mobile) gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
                }}
            >
                <color attach="background" args={['#0c0a12']} />
                {/* Bruno-style readable key + fill + rim for material color read */}
                <ambientLight intensity={0.55} />
                <hemisphereLight args={['#c8d4ff', '#2a2038', 0.45]} />
                <directionalLight position={[2.2, 4.2, 2.5]} intensity={1.35} color="#e8ecff" />
                <directionalLight position={[-2.4, 1.8, -1.2]} intensity={0.45} color="#a78bfa" />
                <pointLight position={[0, 1.6, 1.4]} intensity={0.5} color="#f5e6c8" distance={6} />
                <Suspense fallback={null}>
                    <VesselModel avatar={avatar} scale={1} position={[0, 0, 0]} />
                    {!mobile && (
                        <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={3.5} blur={2.2} far={3} />
                    )}
                    <VesselOrbit spinning={!dragging} />
                </Suspense>
            </Canvas>
            <p className="absolute bottom-3 inset-x-0 text-center text-[9px] uppercase tracking-[0.28em] text-white/35 pointer-events-none">
                Drag to rotate · pinch / scroll zoom
            </p>
        </div>
    );
}

export default function SoulPanel({ onClose }: { onClose: () => void }) {
    const character = useGameStore((s) => s.character);
    const setAvatar = useGameStore((s) => s.setAvatar);
    const setName = useGameStore((s) => s.setName);
    const saveToCloud = useGameStore((s) => s.saveToCloud);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'body' | 'hair' | 'face' | 'outfit'>('body');

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
    ];

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-0 bg-[#0a0a12]">
            {/* Full-body vessel — majority of viewport on large screens */}
            <div className="relative shrink-0 h-[42dvh] min-h-[260px] lg:h-full lg:flex-1 lg:min-w-0 border-b lg:border-b-0 lg:border-r border-white/10">
                <VesselPreview avatar={avatar} />
            </div>

            <div className="flex flex-col flex-1 min-h-0 lg:max-w-md xl:max-w-lg">
                <header className="shrink-0 px-5 pt-4 pb-3 border-b border-white/10">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-bold">Soul Mirror</p>
                    <h2 className="font-ritual text-2xl text-white mt-1">Your Vessel</h2>
                    <p className="mt-1.5 text-sm text-white/50 leading-relaxed">
                        Full 3D form — drag to spin. Save when it feels like you.
                    </p>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
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
                            <p className="text-[10px] uppercase tracking-widest text-white/40">
                                Finish · material look
                            </p>
                            <ChipRow
                                options={VESSEL_FINISHES}
                                value={(avatar.finish ?? 'silk') as VesselFinish}
                                onChange={(v) => patch({ finish: v })}
                                labels={VESSEL_FINISH_LABELS}
                            />
                            <p className="text-[9px] text-white/30 leading-relaxed">
                                Matte · soft cloth · Silk · sheen · Luminous · aether glow · Abyssal · dark depth
                            </p>
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
                            <p className="text-[10px] uppercase tracking-widest text-white/40">Look</p>
                            <ChipRow options={outfits} value={avatar.outfit} onChange={(v) => patch({ outfit: v })} />
                            <p className="text-[10px] uppercase tracking-widest text-white/40">Top</p>
                            <SwatchRow colors={CLOTH_COLORS} value={avatar.top} onChange={(i) => patch({ top: i })} />
                            <p className="text-[10px] uppercase tracking-widest text-white/40">Legs</p>
                            <SwatchRow colors={CLOTH_COLORS} value={avatar.bottom} onChange={(i) => patch({ bottom: i })} />
                            <p className="text-[10px] uppercase tracking-widest text-white/40">Boots</p>
                            <SwatchRow colors={BOOT_COLORS} value={avatar.boots} onChange={(i) => patch({ boots: i })} />
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
        </div>
    );
}
