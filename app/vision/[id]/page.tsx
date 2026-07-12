'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Swords, Flower2 } from 'lucide-react';
import { visionById, VISIONS } from '@/lib/brand/visions';
import SacredButton from '@/components/sanctum/SacredButton';
import { DURATION, EASE } from '@/lib/design/motion';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { usePageMusic } from '@/lib/game/usePageMusic';
import { gameMusic } from '@/lib/game/music';
import type { BgmId } from '@/lib/game/music';

type Mode = 'peace' | 'trial';

export default function VisionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const vision = visionById(id);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);
    const [ready, setReady] = useState(false);
    const [mode, setMode] = useState<Mode>('peace');

    const bgm: BgmId = mode === 'trial' ? 'combat_skirmish' : (vision?.music ?? 'eden_garden');
    usePageMusic(bgm);

    useEffect(() => {
        sacredUi.threshold();
        setMode('peace');
        setReady(false);
    }, [id]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v || !vision) return;
        setReady(false);
        v.load();
        v.play().catch(() => undefined);
    }, [mode, vision]);

    if (!vision) {
        return (
            <main className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center gap-4 px-6">
                <p className="font-ritual text-xl">This road is not yet named.</p>
                <SacredButton onClick={() => router.push('/world')}>Return to the Hut</SacredButton>
            </main>
        );
    }

    const src = mode === 'trial' ? vision.combatVideo : vision.video;
    const poster = mode === 'trial' ? vision.combatPoster : vision.poster;
    const siblings = VISIONS.filter((v) => v.id !== vision.id);

    const setModeSafe = (m: Mode) => {
        if (m === mode) return;
        sacredUi.click();
        if (m === 'trial') {
            try { gameMusic.playCue('river_attune'); } catch { /* */ }
        }
        setMode(m);
    };

    return (
        <main className="relative min-h-[100dvh] bg-black text-white overflow-hidden flex flex-col">
            <div className="absolute inset-0">
                <video
                    key={src}
                    ref={videoRef}
                    autoPlay
                    loop
                    playsInline
                    muted={muted}
                    poster={poster}
                    onCanPlay={() => setReady(true)}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                    style={{ filter: ready ? 'none' : 'blur(10px)', opacity: ready ? 1 : 0.6 }}
                >
                    <source src={src} type="video/mp4" />
                </video>
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            mode === 'trial'
                                ? 'linear-gradient(180deg, rgba(40,10,10,0.55) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.92) 100%)'
                                : 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.92) 100%)',
                    }}
                />
            </div>

            <header
                className="relative z-10 flex items-center justify-between gap-2 px-4 sm:px-6 py-3"
                style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
            >
                <Link
                    href="/world"
                    onClick={() => sacredUi.click()}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/50 hover:text-aether-gold transition-colors min-h-[44px]"
                >
                    <ArrowLeft className="w-4 h-4" /> Hut
                </Link>

                <div className="flex items-center gap-1 p-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => setModeSafe('peace')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.18em] transition-all min-h-[40px] ${
                            mode === 'peace' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        <Flower2 className="w-3.5 h-3.5" /> Vision
                    </button>
                    <button
                        type="button"
                        onClick={() => setModeSafe('trial')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.18em] transition-all min-h-[40px] ${
                            mode === 'trial' ? 'text-black' : 'text-white/40 hover:text-white/70'
                        }`}
                        style={mode === 'trial' ? { background: vision.accent } : undefined}
                    >
                        <Swords className="w-3.5 h-3.5" /> Trial
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setMuted((m) => !m);
                        sacredUi.click();
                    }}
                    className="p-2.5 rounded-full border border-white/15 bg-black/40 text-white/60 hover:text-aether-gold min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={muted ? 'Unmute' : 'Mute'}
                >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
            </header>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.threshold, ease: EASE.breath }}
                className="relative z-10 mt-auto px-5 sm:px-8 pb-6 max-w-xl"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
                <p className="text-[9px] uppercase tracking-[0.45em] mb-2" style={{ color: vision.accent }}>
                    {mode === 'trial' ? 'Trial vision' : 'Vision portal'} · Unsealed
                </p>
                <div className="h-px w-16 mb-4" style={{ background: `linear-gradient(90deg, ${vision.accent}, transparent)` }} />
                <h1 className="font-ritual text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-2">
                    {vision.name}
                </h1>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-3">
                    Guide · {vision.guide}
                </p>
                <p className="font-ritual text-lg text-white/80 italic mb-3 leading-relaxed">
                    “{mode === 'trial' ? vision.combatLine : vision.quote}”
                </p>
                <p className="text-sm text-white/50 leading-relaxed mb-5 max-w-md">
                    {mode === 'trial'
                        ? 'This is a vision of the trial that waits when the chamber is fully cut. Feel the tension — then return to train in the hut.'
                        : vision.body}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <SacredButton size="md" pulse onClick={() => router.push('/world')}>
                        Return to the Hut →
                    </SacredButton>
                    <SacredButton
                        size="md"
                        variant="ghost"
                        onClick={() => setModeSafe(mode === 'peace' ? 'trial' : 'peace')}
                    >
                        {mode === 'peace' ? 'Witness the trial' : 'Return to peace'}
                    </SacredButton>
                </div>

                {/* Next roads */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                    {siblings.map((v) => (
                        <Link
                            key={v.id}
                            href={`/vision/${v.id}`}
                            onClick={() => sacredUi.threshold()}
                            className="shrink-0 w-36 rounded-xl border border-white/10 overflow-hidden bg-black/50 hover:border-white/25 transition-colors"
                        >
                            <div
                                className="h-16"
                                style={{
                                    backgroundImage: `url(${v.poster})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            />
                            <p className="text-[9px] font-black uppercase tracking-wider px-2 py-1.5 truncate" style={{ color: v.accent }}>
                                {v.name.split('—')[0].trim()}
                            </p>
                        </Link>
                    ))}
                </div>
            </motion.div>
        </main>
    );
}
