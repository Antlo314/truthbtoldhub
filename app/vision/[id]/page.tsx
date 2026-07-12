'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { visionById } from '@/lib/brand/visions';
import SacredButton from '@/components/sanctum/SacredButton';
import { DURATION, EASE } from '@/lib/design/motion';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { usePageMusic } from '@/lib/game/usePageMusic';

export default function VisionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const vision = visionById(id);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);
    const [ready, setReady] = useState(false);

    usePageMusic('eden_garden');

    useEffect(() => {
        sacredUi.threshold();
    }, [id]);

    if (!vision) {
        return (
            <main className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center gap-4 px-6">
                <p className="font-ritual text-xl">This road is not yet named.</p>
                <SacredButton onClick={() => router.push('/world')}>Return to the Hut</SacredButton>
            </main>
        );
    }

    return (
        <main className="relative min-h-[100dvh] bg-black text-white overflow-hidden flex flex-col">
            {/* Full-bleed vision cinema */}
            <div className="absolute inset-0">
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    playsInline
                    muted={muted}
                    poster={vision.poster}
                    onCanPlay={() => setReady(true)}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: ready ? 'none' : 'blur(8px)', transition: 'filter 0.8s ease' }}
                >
                    <source src={vision.video} type="video/mp4" />
                </video>
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.92) 100%)',
                    }}
                />
            </div>

            <header
                className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3"
                style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
            >
                <Link
                    href="/world"
                    onClick={() => sacredUi.click()}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/50 hover:text-aether-gold transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Hut
                </Link>
                <button
                    type="button"
                    onClick={() => {
                        setMuted((m) => !m);
                        sacredUi.click();
                    }}
                    className="p-2.5 rounded-full border border-white/15 bg-black/40 text-white/60 hover:text-aether-gold"
                    aria-label={muted ? 'Unmute' : 'Mute'}
                >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.threshold, ease: EASE.breath }}
                className="relative z-10 mt-auto px-5 sm:px-8 pb-8 max-w-xl"
                style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
            >
                <p className="text-[9px] uppercase tracking-[0.45em] mb-2" style={{ color: vision.accent }}>
                    Vision portal · {vision.status === 'open' ? 'Unsealed' : 'Sealed'}
                </p>
                <div className="h-px w-16 mb-4 gold-edge" style={{ background: `linear-gradient(90deg, ${vision.accent}, transparent)` }} />
                <h1 className="font-ritual text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-2">
                    {vision.name}
                </h1>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-3">
                    Guide · {vision.guide}
                </p>
                <p className="font-ritual text-lg text-white/80 italic mb-3 leading-relaxed">
                    “{vision.quote}”
                </p>
                <p className="text-sm text-white/50 leading-relaxed mb-6 max-w-md">
                    {vision.body}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <SacredButton size="md" pulse onClick={() => router.push('/world')}>
                        Return to the Hut →
                    </SacredButton>
                    <SacredButton size="md" variant="ghost" onClick={() => router.push('/codex')}>
                        Open the Codex
                    </SacredButton>
                </div>
            </motion.div>
        </main>
    );
}
