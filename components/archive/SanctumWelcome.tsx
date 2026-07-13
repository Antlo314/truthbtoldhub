'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ScrollText, Heart, Shield, EyeOff, ShieldAlert, Crown, Sparkles, Gem, Map } from 'lucide-react';
import SacredButton from '@/components/sanctum/SacredButton';
import { motion } from 'framer-motion';
import { DURATION, EASE } from '@/lib/design/motion';
import { visionStats, loadVisionProgress, RELIC_BY_VISION } from '@/lib/brand/visionProgress';
import { VISIONS } from '@/lib/brand/visions';
import { sacredUi } from '@/lib/game/sacredUiSfx';

interface SanctumWelcomeProps {
    onClose: () => void;
}

const RULES: { icon: typeof Heart; title: string; body: string }[] = [
    { icon: Heart, title: 'Honor every soul', body: 'No harassment, hate, slurs, threats, or personal attacks. We are all on the journey.' },
    { icon: ShieldAlert, title: 'Keep it genuine', body: 'No spam, scams, raids, or relentless self-promotion. Quality over noise.' },
    { icon: ScrollText, title: 'Stay on the path', body: 'Read each chamber’s topic and keep conversations where they belong.' },
    { icon: Shield, title: 'Keep it safe', body: 'No NSFW, illegal, or harmful content. This is a sanctuary for all ages of soul.' },
    { icon: EyeOff, title: 'Guard privacy', body: 'Never share others’ personal information, and never impersonate another soul.' },
    { icon: Crown, title: 'The Architects keep the peace', body: 'Moderation guidance stands. Disagree? Raise it calmly in a Whisper, not a brawl.' },
];

function roadWhisper(stats: ReturnType<typeof visionStats>, relics: string[]): string {
    if (stats.complete) {
        return 'Every vision portal stands open. When the Hall stills, walk the Epilogue — the Source remembers.';
    }
    if (stats.relics > 0) {
        const names = VISIONS
            .filter((v) => relics.includes(RELIC_BY_VISION[v.id].id))
            .map((v) => RELIC_BY_VISION[v.id].name);
        const sample = names.slice(0, 2).join(' · ');
        return `You carry ${stats.relics} vision relic${stats.relics === 1 ? '' : 's'}${sample ? ` — ${sample}` : ''}. The Wayfinder still holds light.`;
    }
    if (stats.seen > 0) {
        return `${stats.seen} of ${stats.total} vision portals opened. Claim their relics on the road beyond the hut.`;
    }
    return 'Beyond the hut, five vision portals wait — peace, trial, and a relic on each road.';
}

export default function SanctumWelcome({ onClose }: SanctumWelcomeProps) {
    const [whisper, setWhisper] = useState<string | null>(null);
    const [stats, setStats] = useState({ seen: 0, total: 5, relics: 0, complete: false });

    useEffect(() => {
        try {
            const s = visionStats();
            const p = loadVisionProgress();
            setStats(s);
            setWhisper(roadWhisper(s, p.relics));
        } catch {
            setWhisper(roadWhisper({ seen: 0, trials: 0, total: 5, relics: 0, complete: false, completedAt: undefined }, []));
        }
    }, []);

    return (
        <div
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: DURATION.settle, ease: EASE.breath }}
                className="w-full max-w-md rounded-3xl border border-aether-gold/25 bg-black/85 backdrop-blur-xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.7)] max-h-[88dvh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 pt-7 pb-5 text-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.14)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-aether-gold/10 border border-aether-gold/30 flex items-center justify-center mb-3">
                            <Sparkles className="w-7 h-7 text-aether-gold" />
                        </div>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70">You have entered</p>
                        <h2 className="font-ritual text-2xl gold-shimmer mt-1">The Hall</h2>
                        <p className="text-sm text-zinc-400 leading-relaxed mt-3 max-w-sm mx-auto">
                            Chambers of live conversation, whispers between souls, and voice in the air.
                            Speak freely. Walk in good faith.
                        </p>
                    </div>
                </div>

                {whisper && (
                    <div className="px-6 pb-4">
                        <div className="rounded-2xl border border-aether-gold/20 bg-aether-gold/[0.06] p-3.5 text-left">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Gem className="w-3.5 h-3.5 text-aether-gold/80" />
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-aether-gold/75">
                                    Road whisper
                                </p>
                            </div>
                            <p className="text-[12px] text-zinc-300 leading-relaxed">{whisper}</p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.22em]">
                                <Link
                                    href="/vision"
                                    onClick={() => sacredUi.threshold()}
                                    className="inline-flex items-center gap-1.5 text-aether-gold/85 hover:text-aether-gold"
                                >
                                    <Map className="w-3 h-3" /> Wayfinder
                                </Link>
                                {stats.complete ? (
                                    <Link
                                        href="/epilogue"
                                        onClick={() => sacredUi.access()}
                                        className="text-white/50 hover:text-aether-gold/80"
                                    >
                                        Epilogue →
                                    </Link>
                                ) : stats.seen > 0 ? (
                                    <Link
                                        href="/world"
                                        onClick={() => sacredUi.click()}
                                        className="text-white/40 hover:text-aether-gold/70"
                                    >
                                        Return to hut
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-6 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3">
                        The Hall Code
                    </p>
                    <ul className="space-y-3">
                        {RULES.map((r, i) => {
                            const Icon = r.icon;
                            return (
                                <li key={i} className="flex gap-3">
                                    <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-aether-gold">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-white leading-tight">
                                            {i + 1}. {r.title}
                                        </p>
                                        <p className="text-[12px] text-zinc-400 leading-snug mt-0.5">{r.body}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="px-6 pt-4 pb-6">
                    <p className="text-[11px] text-zinc-500 italic text-center mb-4">
                        By entering, you agree to walk these chambers in good faith. ✦
                    </p>
                    <SacredButton className="w-full" size="md" pulse onClick={onClose}>
                        Enter the Hall
                    </SacredButton>
                </div>
            </motion.div>
        </div>
    );
}
