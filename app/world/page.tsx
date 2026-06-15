'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGameStore } from '@/lib/store/useGameStore';
import { PATH_BY_ID } from '@/lib/game/paths';
import { ArrowLeft, ScrollText } from 'lucide-react';

const WorldCanvas = dynamic(() => import('@/components/game/WorldCanvas'), { ssr: false });

const TRUTH_LINES = [
    'Walk slowly. The cavern shows itself only to the patient eye.',
    'That shade was once a soul like you — bound here by what it would not release.',
    'Every scroll you recover is a lie the world told you, undone.',
    'The Source is not above you, nor ahead of you. It is beneath the noise. Be still.',
];

export default function WorldPage() {
    const character = useGameStore((s) => s.character);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);

    const [mounted, setMounted] = useState(false);
    const [dialogue, setDialogue] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [hint, setHint] = useState(true);
    const [scrolls, setScrolls] = useState(0);
    const lineIdx = useRef(0);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setMounted(true);
        loadFromCloud();
        const t = setTimeout(() => setHint(false), 4500);
        return () => clearTimeout(t);
    }, [loadFromCloud]);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2600);
    }, []);

    const onTalk = useCallback(() => {
        setDialogue(TRUTH_LINES[lineIdx.current % TRUTH_LINES.length]);
        lineIdx.current += 1;
        setHint(false);
    }, []);

    const onCollect = useCallback(() => {
        setScrolls((n) => n + 1);
        showToast('✦ Scroll of Knowledge recovered');
        setHint(false);
    }, [showToast]);

    const onEncounter = useCallback(() => {
        showToast('A shade drifts through you — cold, and searching…');
        setHint(false);
    }, [showToast]);

    if (!mounted) return <div className="w-full bg-void" style={{ height: '100dvh' }} />;

    const path = character.path ? PATH_BY_ID[character.path] : null;

    return (
        <div
            className="relative w-full overflow-hidden bg-void select-none"
            style={{ height: '100dvh', touchAction: 'none' }}
        >
            <WorldCanvas character={character} onTalk={onTalk} onCollect={onCollect} onEncounter={onEncounter} />

            {/* HUD */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 pointer-events-none">
                <Link
                    href="/awakening/path"
                    className="pointer-events-auto p-2 rounded-full bg-black/40 border border-white/10 text-zinc-300 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm">
                    <span className="font-ritual text-sm text-white">{character.name || 'Soul'}</span>
                    {path && (
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: path.color }}>
                            · {path.name}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm">
                    <ScrollText className="w-3.5 h-3.5 text-aether-gold" />
                    <span className="text-xs font-black text-aether-gold">{scrolls}</span>
                </div>
            </div>

            {/* hint */}
            {hint && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 animate-pulse">drag to move · find Truth</p>
                </div>
            )}

            {/* toast */}
            {toast && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 border border-aether-gold/30 text-[11px] text-aether-gold font-mono tracking-wide animate-fade-in pointer-events-none whitespace-nowrap">
                    {toast}
                </div>
            )}

            {/* dialogue */}
            {dialogue && (
                <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center" onClick={() => setDialogue(null)}>
                    <div className="w-full max-w-xl glass-panel rounded-2xl p-5 border border-[rgba(251,191,36,0.15)] cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-aether-gold">Truth</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-[rgba(251,191,36,0.4)] to-transparent" />
                        </div>
                        <p className="font-ritual text-base md:text-lg text-white/90 leading-relaxed">{dialogue}</p>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mt-3">tap to close</p>
                    </div>
                </div>
            )}
        </div>
    );
}
