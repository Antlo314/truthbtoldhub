'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGameStore } from '@/lib/store/useGameStore';
import { PATH_BY_ID } from '@/lib/game/paths';
import { ArrowLeft, FileText, Film, Music, Image as ImageIcon, Link2, Pin, Settings, X } from 'lucide-react';
import { fetchBulletins, fetchMedia, getArchitectStatus, formatBytes, type Bulletin, type DispatchMedia } from '@/lib/game/hut';
import { FounderBadge } from '@/components/game/FounderBadge';

const WorldCanvas = dynamic(() => import('@/components/game/WorldCanvas'), { ssr: false });

const KIND_ICON = { pdf: FileText, video: Film, audio: Music, image: ImageIcon, link: Link2 } as const;

interface InteractPOI {
    id: string;
    type: string;
    name: string;
    detail?: string;
}

export default function WorldPage() {
    const character = useGameStore((s) => s.character);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const loadFounder = useGameStore((s) => s.loadFounder);
    const founderNumber = useGameStore((s) => s.founderNumber);

    const [mounted, setMounted] = useState(false);
    const [dialogue, setDialogue] = useState<{ speaker: string; text: string; color?: string } | null>(null);
    const [hutOpen, setHutOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [hint, setHint] = useState(true);
    const [bulletins, setBulletins] = useState<Bulletin[]>([]);
    const [media, setMedia] = useState<DispatchMedia[]>([]);
    const [isArchitect, setIsArchitect] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setMounted(true);
        loadFromCloud();
        fetchBulletins(8).then(setBulletins);
        fetchMedia(16).then(setMedia);
        getArchitectStatus().then((a) => setIsArchitect(a.isArchitect));
        loadFounder().then((tier) => {
            if (tier) {
                setToast(`✦ ${tier.name} — founding seal claimed · +${tier.bonusSkillPoints} skill ${tier.bonusSkillPoints === 1 ? 'point' : 'points'}`);
                if (toastTimer.current) clearTimeout(toastTimer.current);
                toastTimer.current = setTimeout(() => setToast(null), 5000);
            }
        });
        const t = setTimeout(() => setHint(false), 5000);
        return () => clearTimeout(t);
    }, [loadFromCloud]);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2600);
    }, []);

    const onInteract = useCallback((poi: InteractPOI) => {
        setHint(false);
        if (poi.type === 'hut') {
            setHutOpen(true);
        } else if (poi.type === 'npc') {
            setDialogue({ speaker: poi.name, text: poi.detail || '…' });
        } else if (poi.type === 'cave') {
            setDialogue({ speaker: poi.name, text: 'The cave is sealed with old wards. You are not yet ready to descend — return when your path has deepened.' });
        } else if (poi.type === 'portal') {
            setDialogue({ speaker: 'Portal to the Past', text: 'The veil between ages shimmers, but holds. Its hour has not yet come.', color: '#a855f7' });
        }
    }, []);

    const onEncounter = useCallback(() => {
        showToast('A shade drifts through you — cold, and searching…');
        setHint(false);
    }, [showToast]);

    if (!mounted) return <div className="w-full bg-void" style={{ height: '100dvh' }} />;

    const path = character.path ? PATH_BY_ID[character.path] : null;

    return (
        <div className="relative w-full overflow-hidden bg-void select-none" style={{ height: '100dvh', touchAction: 'none' }}>
            <WorldCanvas character={character} onInteract={onInteract} onEncounter={onEncounter} />

            {/* HUD */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 pointer-events-none">
                <Link href="/awakening/path" className="pointer-events-auto p-2 rounded-full bg-black/40 border border-white/10 text-zinc-300 hover:text-white">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-sm">
                    <FounderBadge founderNumber={founderNumber} size={18} />
                    <span className="font-ritual text-sm text-white">{character.name || 'Soul'}</span>
                    {path && (
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: path.color }}>· {path.name}</span>
                    )}
                </div>
                <div className="w-8" />
            </div>

            {hint && (
                <div className="absolute left-1/2 top-[58%] -translate-x-1/2 text-center pointer-events-none">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/45 animate-pulse">drag to roam · find Truth's Hut</p>
                </div>
            )}

            {toast && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 border border-aether-gold/30 text-[11px] text-aether-gold font-mono tracking-wide pointer-events-none whitespace-nowrap">
                    {toast}
                </div>
            )}

            {/* NPC / cave / portal dialogue */}
            {dialogue && (
                <div className="absolute inset-x-0 bottom-0 p-4 flex justify-center z-20" onClick={() => setDialogue(null)}>
                    <div className="w-full max-w-xl glass-panel rounded-2xl p-5 border cursor-pointer" style={{ borderColor: (dialogue.color || '#fbbf24') + '40' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: dialogue.color || '#fbbf24' }}>{dialogue.speaker}</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-[rgba(251,191,36,0.4)] to-transparent" />
                        </div>
                        <p className="font-ritual text-base md:text-lg text-white/90 leading-relaxed">{dialogue.text}</p>
                        <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 mt-3">tap to close</p>
                    </div>
                </div>
            )}

            {/* Truth's Hut — live daily dispatch */}
            {hutOpen && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setHutOpen(false)}>
                    <div className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 border border-[rgba(251,191,36,0.2)] relative max-h-[88dvh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setHutOpen(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white z-10">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">Truth's Hut</p>
                        <h2 className="font-ritual text-2xl md:text-3xl gold-shimmer mb-5">The Daily Dispatch</h2>

                        {/* latest bulletin */}
                        <div className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-4">
                            {bulletins.length > 0 ? (
                                <>
                                    <p className="text-[9px] font-mono uppercase tracking-widest text-aether-gold/60 mb-2 flex items-center gap-2">
                                        {bulletins[0].pinned && <Pin className="w-3 h-3" />} {bulletins[0].published_at} · From Truth
                                    </p>
                                    <p className="font-ritual text-white/90 leading-relaxed whitespace-pre-wrap">
                                        <span className="block text-aether-gold font-bold mb-1">{bulletins[0].title}</span>
                                        {bulletins[0].body}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[9px] font-mono uppercase tracking-widest text-aether-gold/60 mb-2">Today · From Truth</p>
                                    <p className="font-ritual text-white/90 leading-relaxed">
                                        Welcome home, {character.name || 'initiate'}. You stand at the center of all things. Each day I will leave word here —
                                        a truth unearthed, a scroll to study, a mission to walk. Return often. The world is waking with you.
                                    </p>
                                </>
                            )}
                        </div>

                        {/* earlier dispatches */}
                        {bulletins.length > 1 && (
                            <details className="mb-5 group">
                                <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-zinc-500 hover:text-aether-gold list-none">▸ Earlier words ({bulletins.length - 1})</summary>
                                <div className="mt-3 space-y-2">
                                    {bulletins.slice(1).map((b) => (
                                        <div key={b.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                                            <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">{b.published_at}</p>
                                            <p className="text-aether-gold/90 text-sm font-bold">{b.title}</p>
                                            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-3 whitespace-pre-wrap">{b.body}</p>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}

                        {/* dispatch shelf */}
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Dispatch Shelf</p>
                        {media.length > 0 ? (
                            <div className="space-y-2">
                                {media.map((m) => {
                                    const Icon = KIND_ICON[m.kind] || Link2;
                                    return (
                                        <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-aether-gold/30 transition-colors">
                                            <div className="w-9 h-9 rounded-lg bg-aether-gold/10 border border-aether-gold/20 flex items-center justify-center text-aether-gold shrink-0">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{m.title}</p>
                                                <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">{m.kind} · {m.category} · {formatBytes(m.size_bytes)}</p>
                                            </div>
                                            <span className="text-[10px] uppercase tracking-widest text-aether-gold shrink-0">Open ↗</span>
                                        </a>
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-3">
                                    {[{ icon: FileText, label: 'Scrolls' }, { icon: Film, label: 'Visions' }, { icon: Music, label: 'Frequencies' }].map(({ icon: Icon, label }) => (
                                        <div key={label} className="flex flex-col items-center gap-2 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-zinc-500">
                                            <Icon className="w-5 h-5 text-aether-gold/70" />
                                            <span className="text-[9px] uppercase tracking-widest">{label}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-600 text-center mt-4 font-mono uppercase tracking-widest">No dispatches yet — return soon.</p>
                            </>
                        )}

                        {/* architect access */}
                        {isArchitect && (
                            <Link href="/hut-admin" className="mt-6 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                <Settings className="w-3.5 h-3.5" /> Tend the Hut
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
