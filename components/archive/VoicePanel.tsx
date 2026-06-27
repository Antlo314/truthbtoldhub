'use client';

import { useVoice } from './VoiceProvider';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { DEFAULT_AVATAR } from '@/lib/archive/access';
import { Mic, MicOff, Headphones, PhoneOff, Volume2, Signal } from 'lucide-react';

// The persistent "you are connected" voice bar, shown above the user footer.
export default function VoicePanel() {
    const { activeVoiceId, muted, deafened, participantsByChannel, speakingIds, toggleMute, toggleDeafen, leave, connecting, error } = useVoice();
    const { channels } = useArchiveStore();
    const { user } = useSoulStore();

    if (error && !activeVoiceId) {
        return (
            <div className="px-3 py-2 bg-red-950/40 border-t border-red-500/20">
                <p className="text-[9px] font-mono uppercase tracking-widest text-red-400">{error}</p>
            </div>
        );
    }

    if (!activeVoiceId) return null;

    // Find the Hall's name across any loaded workspace.
    let hallName = 'Voice Hall';
    for (const wsId in channels) {
        const hit = channels[wsId].find((c) => c.id === activeVoiceId);
        if (hit) { hallName = hit.name; break; }
    }

    const participants = participantsByChannel[activeVoiceId] || [];

    return (
        <div className="bg-black/60 backdrop-blur-md border-t border-aether-gold/20">
            {/* Status row */}
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                    <Signal className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                    <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 leading-none">
                            {connecting ? 'Connecting…' : 'Voice Connected'}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-mono text-zinc-500 truncate">
                            <Volume2 className="w-3 h-3 shrink-0" /> {hallName}
                        </div>
                    </div>
                </div>
                <button
                    onClick={leave}
                    title="Disconnect"
                    className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                >
                    <PhoneOff className="w-4 h-4" />
                </button>
            </div>

            {/* Participants */}
            {participants.length > 0 && (
                <div className="px-3 pb-1.5 flex flex-wrap gap-1.5">
                    {participants.map((p) => {
                        const speaking = speakingIds.has(p.id);
                        return (
                            <div key={p.id} title={p.name} className="relative">
                                <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-colors ${speaking ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'border-white/10'}`}>
                                    <img src={p.avatar || DEFAULT_AVATAR} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                {p.muted && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-zinc-950 flex items-center justify-center">
                                        <MicOff className="w-2 h-2 text-red-400" />
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-1.5 px-3 pb-2.5">
                <button
                    onClick={toggleMute}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-colors ${muted ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'}`}
                >
                    {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {muted ? 'Muted' : 'Mute'}
                </button>
                <button
                    onClick={toggleDeafen}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-colors ${deafened ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'}`}
                >
                    <Headphones className="w-3.5 h-3.5" />
                    {deafened ? 'Deafened' : 'Deafen'}
                </button>
            </div>
        </div>
    );
}
