'use client';

import { ScrollText, Heart, Shield, EyeOff, ShieldAlert, Crown, Sparkles } from 'lucide-react';

interface SanctumWelcomeProps {
    onClose: () => void;
}

// Generic community rules & regulations, shown the first time a soul enters
// The Sanctum (and re-openable). Keep it short, themed, and unambiguous.
const RULES: { icon: any; title: string; body: string }[] = [
    { icon: Heart, title: 'Honor every soul', body: 'No harassment, hate, slurs, threats, or personal attacks. We are all on the journey.' },
    { icon: ShieldAlert, title: 'Keep it genuine', body: 'No spam, scams, raids, or relentless self-promotion. Quality over noise.' },
    { icon: ScrollText, title: 'Stay on the path', body: 'Read each hall’s topic and keep conversations where they belong.' },
    { icon: Shield, title: 'Keep it safe', body: 'No NSFW, illegal, or harmful content. This is a sanctuary for all ages of soul.' },
    { icon: EyeOff, title: 'Guard privacy', body: 'Never share others’ personal information, and never impersonate another soul.' },
    { icon: Crown, title: 'The Architects keep the peace', body: 'Moderation guidance stands. Disagree? Raise it calmly in a Whisper, not a brawl.' },
];

export default function SanctumWelcome({ onClose }: SanctumWelcomeProps) {
    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md glass-panel rounded-3xl border border-aether-gold/25 overflow-hidden shadow-2xl max-h-[88dvh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-7 pb-5 text-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.12)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-aether-gold/10 border border-aether-gold/30 flex items-center justify-center mb-3">
                            <Sparkles className="w-7 h-7 text-aether-gold" />
                        </div>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70">Truth B Told Hub</p>
                        <h2 className="font-ritual text-2xl gold-shimmer mt-1">Welcome to The Sanctum</h2>
                        <p className="text-sm text-zinc-400 leading-relaxed mt-3 max-w-sm mx-auto">
                            A gathering place for every soul on the journey — live halls, whispers, and voice.
                            Speak freely, and walk in good faith.
                        </p>
                    </div>
                </div>

                {/* Rules */}
                <div className="px-6 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3">The Sanctum Code</p>
                    <ul className="space-y-3">
                        {RULES.map((r, i) => {
                            const Icon = r.icon;
                            return (
                                <li key={i} className="flex gap-3">
                                    <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-aether-gold">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-white leading-tight">{i + 1}. {r.title}</p>
                                        <p className="text-[12px] text-zinc-400 leading-snug mt-0.5">{r.body}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Footer */}
                <div className="px-6 pt-4 pb-6">
                    <p className="text-[11px] text-zinc-500 italic text-center mb-4">
                        By entering, you agree to walk these halls in good faith. ✦
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black hover:brightness-110 transition"
                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                    >
                        Enter the Sanctum
                    </button>
                </div>
            </div>
        </div>
    );
}
