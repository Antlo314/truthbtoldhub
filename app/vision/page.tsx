'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { VISIONS } from '@/lib/brand/visions';
import { DURATION, EASE, staggerContainer, staggerItem } from '@/lib/design/motion';
import { BRAND } from '@/lib/brand/assets';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { usePageMusic } from '@/lib/game/usePageMusic';

export default function VisionsIndexPage() {
    usePageMusic('paths_crossroads');

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
                    Look through. Return home.
                </p>

                <motion.ul
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="mt-8 grid gap-3 sm:grid-cols-2"
                >
                    {VISIONS.map((v) => (
                        <motion.li key={v.id} variants={staggerItem}>
                            <Link
                                href={`/vision/${v.id}`}
                                onClick={() => sacredUi.threshold()}
                                className="block rounded-2xl border border-white/10 overflow-hidden bg-black/50 hover:border-aether-gold/35 transition-all group"
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
                                    <span
                                        className="absolute bottom-3 left-3 text-[9px] font-black uppercase tracking-[0.25em]"
                                        style={{ color: v.accent }}
                                    >
                                        Unsealed
                                    </span>
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
                    ))}
                </motion.ul>
            </div>
        </main>
    );
}
