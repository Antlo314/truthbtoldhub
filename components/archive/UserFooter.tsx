'use client';

import { useRouter } from 'next/navigation';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { isArchitect, DEFAULT_AVATAR } from '@/lib/archive/access';
import { Settings, LogOut, Crown, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { visionStats } from '@/lib/brand/visionProgress';

// The current soul's mini-card pinned to the bottom of the channel rail.
export default function UserFooter() {
    const router = useRouter();
    const { profile, user } = useSoulStore();
    const architect = isArchitect(user?.email);
    const [roadHint, setRoadHint] = useState<string | null>(null);

    useEffect(() => {
        try {
            const s = visionStats();
            if (s.complete) setRoadHint('Source');
            else if (s.relics > 0) setRoadHint(`${s.relics}r`);
            else if (s.seen > 0) setRoadHint(`${s.seen}/${s.total}`);
        } catch { /* */ }
    }, []);

    return (
        <div className="h-[56px] bg-black/60 backdrop-blur-md flex items-center justify-between px-3 border-t border-white/5 mt-auto relative z-30">
            <div className="flex items-center min-w-0">
                <div className="w-8 h-8 rounded-full border border-aether-gold/30 overflow-hidden shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                    <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="ml-2 flex flex-col min-w-0">
                    <span className="text-[12px] font-bold text-white truncate max-w-[110px] flex items-center gap-1">
                        {profile?.display_name || profile?.username || 'Initiate'}
                        {architect && <Crown className="w-3 h-3 text-aether-gold shrink-0" />}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="truncate uppercase tracking-tighter">{architect ? 'Architect' : (profile?.tier || 'Soul')}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => router.push(roadHint === 'Source' ? '/epilogue' : '/vision')}
                    title={roadHint === 'Source' ? 'Epilogue — Return to the Source' : 'Vision portals'}
                    className="relative p-1.5 text-zinc-500 hover:text-aether-gold hover:bg-white/5 rounded-md transition-all"
                >
                    <Sparkles className="w-4 h-4" />
                    {roadHint && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-aether-gold/90 text-[7px] font-black text-black flex items-center justify-center tabular-nums">
                            {roadHint === 'Source' ? '✦' : roadHint}
                        </span>
                    )}
                </button>
                <button onClick={() => router.push('/self')} title="Identity Core" className="p-1.5 text-zinc-500 hover:text-aether-gold hover:bg-white/5 rounded-md transition-all">
                    <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => router.push('/')} title="Return to the Sanctuary" className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-md transition-all">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
