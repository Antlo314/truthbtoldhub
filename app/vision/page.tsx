'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { VISIONS, type VisionId } from '@/lib/brand/visions';
import {
    loadVisionProgress,
    visionStats,
    RELIC_BY_VISION,
    type VisionProgress,
} from '@/lib/brand/visionProgress';
import { DURATION, EASE, staggerContainer, staggerItem } from '@/lib/design/motion';
import { BRAND } from '@/lib/brand/assets';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { usePageMusic } from '@/lib/game/usePageMusic';
import SacredButton from '@/components/sanctum/SacredButton';

export default function VisionsIndexPage() {
    usePageMusic('paths_crossroads');
    const [progress, setProgress] = useState<VisionProgress | null>(null);
    const [stats, setStats] = useState({ seen: 0, trials: 0, total: VISIONS.length, relics: 0, complete: false });

    useEffect(() => {
        setProgress(loadVisionProgress());
        setStats(visionStats());
    }, []);

    const isSeen = (id: VisionId) => progress?.seen.includes(id) ?? false;
    const isTrial = (id: VisionId) => progress?.trials.includes(id) ?? false;
    const hasRelicFor = (id: VisionId) => progress?.relics.includes(RELIC_BY_VISION[id].id) ?? false;

    return (
        <main className="relative min-h-[100dvh] bg-black text-white overflow-x-hidden">
            <div
                className="fixed inset-0 opacity-30 pointer-events-none"
                style={{
                    backgroundImage: `url(${BRAND.portal})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'saturate(0.8) brightness(0.4)',
                }}
            />
            <div className="fixed inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black pointer-events-none" />

            <div
                className="relative z-10 mx-auto max-w-3xl px-5 pb-24"
                style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}
            >
                <Link
                    href="/world"
                    onClick={() => sacredUi.click()}
                    className="text-[10px] uppercase tracking-[0.3em] text-aether-gold/80 hover:text-aether-gold"
                >
                    ← Truth&apos;s Hut
                </Link>

                <p className="mt-8 text-[9px] uppercase tracking-[0.5em] text-aether-gold/70">Wayfinder</p>
                <h1 className="font-ritual text-3xl sm:text-4xl font-black gold-shimmer mt-2 uppercase tracking-tight">
                    Vision Portals
                </h1>
                <p className="mt-3 text-sm text-white/45 max-w-lg leading-relaxed">
                    Roads beyond the hut — open as cinematic visions until the full 3D chambers are cut.
                    Look through. Claim the relic. Return home.
                </p>

                {/* Progress strip */}
                <div className="mt-6 rounded-2xl border border-aether-gold/20 bg-black/50 backdrop-blur-md p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-[9px] uppercase tracking-[0.35em] text-aether-gold/70">Journey map</p>
                        <p className="text-[11px] text-white/50 tabular-nums">
                            {stats.seen}/{stats.total} seen · {stats.trials} trials · {stats.relics} relics
                        </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-aether-gold/80 to-aether-gold"
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.total ? (stats.seen / stats.total) * 100 : 0}%` }}
                            transition={{ duration: DURATION.ritual, ease: EASE.breath }}
                        />
                    </div>
                    {stats.complete && (
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <p className="text-[12px] text-aether-gold/80 flex-1">
                                Every road opened. The Source waits.
                            </p>
                            <SacredButton
                                size="sm"
                                pulse
                                onClick={() => {
                                    sacredUi.access();
                                    window.location.href = '/epilogue';
                                }}
                            >
                                Epilogue →
                            </SacredButton>
                        </div>
                    )}
                    {!stats.complete && stats.seen > 0 && (
                        <Link
                            href="/epilogue"
                            onClick={() => sacredUi.click()}
                            className="mt-3 inline-block text-[10px] uppercase tracking-[0.25em] text-white/35 hover:text-aether-gold/70"
                        >
                            Roads so far →
                        </Link>
                    )}
                </div>

                <motion.ul
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="mt-8 grid gap-3 sm:grid-cols-2"
                >
                    {VISIONS.map((v) => {
                        const seen = isSeen(v.id);
                        const trial = isTrial(v.id);
                        const relic = hasRelicFor(v.id);
                        return (
                            <motion.li key={v.id} variants={staggerItem}>
                                <Link
                                    href={`/vision/${v.id}`}
                                    onClick={() => sacredUi.threshold()}
                                    className="block rounded-2xl border overflow-hidden bg-black/50 hover:border-aether-gold/35 transition-all group"
                                    style={{
                                        borderColor: seen ? `${v.accent}44` : 'rgba(255,255,255,0.1)',
                                    }}
                                >
                                    <div
                                        className="aspect-video relative"
                                        style={{
                                            backgroundImage: `url(${v.poster})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                                            <span
                                                className="text-[9px] font-black uppercase tracking-[0.25em]"
                                                style={{ color: v.accent }}
                                            >
                                                {seen ? (trial ? 'Vision + trial' : 'Opened') : 'Unsealed'}
                                            </span>
                                            {relic && (
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-aether-gold bg-black/60 px-1.5 py-0.5 rounded">
                                                    Relic
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h2 className="font-ritual text-lg text-white group-hover:text-aether-gold transition-colors">
                                            {v.name}
                                        </h2>
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 mt-1">
                                            {v.guide} · vision + trial
                                        </p>
                                        <p className="text-[12px] text-white/45 italic mt-2 line-clamp-2">
                                            “{v.quote}”
                                        </p>
                                    </div>
                                </Link>
                            </motion.li>
                        );
                    })}
                </motion.ul>
            </div>
        </main>
    );
}
