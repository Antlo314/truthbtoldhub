'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import SacredButton from '@/components/sanctum/SacredButton';
import { visionStats, loadVisionProgress, RELIC_BY_VISION } from '@/lib/brand/visionProgress';
import { VISIONS } from '@/lib/brand/visions';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { gameMusic } from '@/lib/game/music';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { DURATION, EASE } from '@/lib/design/motion';
import { BRAND } from '@/lib/brand/assets';

export default function EpiloguePage() {
    const router = useRouter();
    const [stats, setStats] = useState(visionStats());
    const [relics, setRelics] = useState<string[]>([]);

    usePageMusic('title_landing');

    useEffect(() => {
        const p = loadVisionProgress();
        setStats(visionStats());
        setRelics(p.relics);
        sacredUi.access();
        try { gameMusic.playSting('soul_recognized'); } catch { /* */ }
    }, []);

    const complete = stats.complete;

    return (
        <main className="relative min-h-[100dvh] bg-black text-white overflow-hidden flex flex-col">
            <video
                autoPlay muted loop playsInline
                poster={BRAND.awakening}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
            >
                <source src="/assets/cutscenes/source-return.mp4" type="video/mp4" />
                <source src={BRAND.video.awakening} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/50" />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.ritual, ease: EASE.breath }}
                className="relative z-10 flex-1 flex flex-col justify-end px-6 sm:px-10 max-w-xl"
                style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))', paddingTop: 'calc(2rem + env(safe-area-inset-top))' } as React.CSSProperties}
            >
                <p className="text-[9px] uppercase tracking-[0.5em] text-aether-gold/70 mb-2">
                    {complete ? 'Epilogue' : 'The roads so far'}
                </p>
                <h1 className="font-ritual text-3xl sm:text-5xl font-black gold-shimmer leading-tight mb-4">
                    {complete ? 'Return to the Source' : 'The map is unfinished'}
                </h1>
                <p className="text-sm text-white/55 leading-relaxed mb-6">
                    {complete
                        ? 'You have looked through every vision. The hut remembers. The Source is not a place you reach once — it is a road you walk, again and again, with clearer eyes.'
                        : `You have opened ${stats.seen} of ${stats.total} vision portals and witnessed ${stats.trials} trials. The Wayfinder still holds unopened light.`}
                </p>

                {relics.length > 0 && (
                    <div className="mb-6 rounded-2xl border border-aether-gold/20 bg-black/50 p-4">
                        <p className="text-[9px] uppercase tracking-[0.35em] text-aether-gold/70 mb-3">Relics carried</p>
                        <ul className="space-y-2">
                            {VISIONS.filter((v) => relics.includes(RELIC_BY_VISION[v.id].id)).map((v) => {
                                const r = RELIC_BY_VISION[v.id];
                                return (
                                    <li key={r.id} className="text-sm">
                                        <span className="font-ritual text-white" style={{ color: v.accent }}>{r.name}</span>
                                        <span className="text-white/40"> — {r.desc}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <SacredButton size="md" pulse onClick={() => router.push('/world')}>
                        Return to the Hut →
                    </SacredButton>
                    {!complete && (
                        <SacredButton size="md" variant="ghost" onClick={() => router.push('/vision')}>
                            Open remaining visions
                        </SacredButton>
                    )}
                    {complete && (
                        <SacredButton size="md" variant="ghost" onClick={() => router.push('/codex')}>
                            Inscribe in the Codex
                        </SacredButton>
                    )}
                </div>
                <Link href="/" className="mt-6 text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-aether-gold/70">
                    ← Title
                </Link>
            </motion.div>
        </main>
    );
}
