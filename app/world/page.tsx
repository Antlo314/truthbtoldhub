'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGameStore } from '@/lib/store/useGameStore';
import { PATH_BY_ID, skillBonuses } from '@/lib/game/paths';
import { ArrowLeft, FileText, Film, Music, Image as ImageIcon, Link2, Pin, Settings, Gem, Swords, ScrollText, Check, X, Shirt } from 'lucide-react';
import { QUESTS, questsAvailable, objectiveMet, objectiveProgress, type Quest } from '@/lib/game/quests';
import { combatRelicBonuses, resonanceTier, shadeCountForTier, resonanceLabel } from '@/lib/game/resonance';
import { pathCombatMods } from '@/lib/game/pathPowers';
import { hiddenPoiById } from '@/lib/game/hiddenPois';
import { SCROLL_BY_ID } from '@/lib/game/scrolls';
import { fetchBulletins, fetchMedia, getArchitectStatus, formatBytes, type Bulletin, type DispatchMedia } from '@/lib/game/hut';
import { FounderBadge } from '@/components/game/FounderBadge';
import { founderBonuses } from '@/lib/game/founders';
import { clothingBonus, CLOTHING_BY_ID } from '@/lib/game/clothing';
import { DEST_BY_POI, RELIC_BY_ID, hasAllRelics, ALL_RELIC_IDS, type Destination } from '@/lib/game/destinations';
import DestinationScene from '@/components/game/DestinationScene';
import CombatScene from '@/components/game/CombatScene';
import SourceScene from '@/components/game/SourceScene';
import WeaponForge from '@/components/game/WeaponForge';
import CutscenePlayer from '@/components/game/CutscenePlayer';
import { cutscene, cutsceneForCombat } from '@/lib/game/cutscenes';
import { WEAPON_BY_ID, weaponForTier } from '@/lib/game/weapons';

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
    const claimRelic = useGameStore((s) => s.claimRelic);
    const saveToCloud = useGameStore((s) => s.saveToCloud);
    const equipWeapon = useGameStore((s) => s.equipWeapon);
    const findClothing = useGameStore((s) => s.findClothing);
    const equipClothing = useGameStore((s) => s.equipClothing);
    const markCleared = useGameStore((s) => s.markCleared);
    const markSolved = useGameStore((s) => s.markSolved);
    const claimQuest = useGameStore((s) => s.claimQuest);
    const grantScroll = useGameStore((s) => s.grantScroll);
    const equipRelic = useGameStore((s) => s.equipRelic);
    const equipScroll = useGameStore((s) => s.equipScroll);
    const markDiscovered = useGameStore((s) => s.markDiscovered);
    const returnToSource = useGameStore((s) => s.returnToSource);

    const [mounted, setMounted] = useState(false);
    const [dialogue, setDialogue] = useState<{ speaker: string; text: string; color?: string } | null>(null);
    const [hutOpen, setHutOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [hint, setHint] = useState(true);
    const [bulletins, setBulletins] = useState<Bulletin[]>([]);
    const [media, setMedia] = useState<DispatchMedia[]>([]);
    const [isArchitect, setIsArchitect] = useState(false);
    const [activeDest, setActiveDest] = useState<Destination | null>(null);
    const [satchelOpen, setSatchelOpen] = useState(false);
    const [forgeOpen, setForgeOpen] = useState(false);
    const [worldIntroDone, setWorldIntroDone] = useState(false);
    const [combatIntroDest, setCombatIntroDest] = useState<Destination | null>(null);
    const [combatDest, setCombatDest] = useState<Destination | null>(null);
    const [questNpc, setQuestNpc] = useState<{ id: string; name: string } | null>(null);
    const [questLogOpen, setQuestLogOpen] = useState(false);
    const [sourceOpen, setSourceOpen] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const finishWorldIntro = useCallback(() => {
        sessionStorage.setItem('tbth-cutscene-world', '1');
        setWorldIntroDone(true);
    }, []);

    const finishCombatIntro = useCallback(() => {
        if (combatIntroDest) {
            setCombatDest(combatIntroDest);
            setCombatIntroDest(null);
        }
    }, [combatIntroDest]);

    useEffect(() => {
        setMounted(true);
        setWorldIntroDone(sessionStorage.getItem('tbth-cutscene-world') === '1');
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
        const dest = DEST_BY_POI[poi.id];
        if (dest) {
            const ch = useGameStore.getState().character;
            const needsFight = !!dest.combat && !ch.cleared.includes(dest.poiId);
            if (needsFight && !ch.equipped.weapon) {
                setDialogue({ speaker: dest.guide.name, text: 'You cannot face what guards this place unarmed. Return to Truth’s Hut and forge your first weapon.', color: dest.accent });
            } else if (needsFight) {
                setCombatIntroDest(dest);
            } else {
                setActiveDest(dest);
            }
            return;
        }
        if (poi.type === 'hut') {
            setHutOpen(true);
        } else if (poi.type === 'npc') {
            const hidden = hiddenPoiById(poi.id);
            if (hidden) {
                const ch = useGameStore.getState().character;
                if (!ch.discovered.includes(hidden.discoverId)) {
                    markDiscovered(hidden.discoverId);
                    if (hidden.rewardSkillPoints) {
                        useGameStore.setState((s) => ({
                            character: { ...s.character, skillPoints: s.character.skillPoints + hidden.rewardSkillPoints },
                        }));
                    }
                    saveToCloud();
                    showToast(`✦ ${hidden.name} revealed · +${hidden.rewardSkillPoints} skill point`);
                }
                setDialogue({ speaker: hidden.name, text: hidden.lore, color: '#22d3ee' });
            } else if (questsAvailable(poi.id, useGameStore.getState().character).length > 0) {
                setQuestNpc({ id: poi.id, name: poi.name });
            } else {
                setDialogue({ speaker: poi.name, text: poi.detail || '…' });
            }
        } else if (poi.type === 'cave') {
            setDialogue({ speaker: poi.name, text: 'The cave is sealed with old wards. You are not yet ready to descend — return when your path has deepened.' });
        } else if (poi.type === 'portal') {
            setDialogue({ speaker: 'Portal to the Past', text: 'The veil between ages shimmers, but holds. Its hour has not yet come.', color: '#a855f7' });
        }
    }, [markDiscovered, saveToCloud, showToast]);

    const onEncounter = useCallback(() => {
        showToast('A shade drifts through you — cold, and searching…');
        setHint(false);
    }, [showToast]);

    const handleClaim = useCallback(async (relicId: string) => {
        const beforeTier = resonanceTier(useGameStore.getState().character.inventory);
        claimRelic(relicId);
        const r = RELIC_BY_ID[relicId];
        let msg = `✦ ${r?.name || 'Relic'} claimed · equipped`;
        const afterTier = resonanceTier(useGameStore.getState().character.inventory);
        if (afterTier > beforeTier) msg += ` · ${resonanceLabel(afterTier)}`;
        // the destination's garment is found alongside its relic
        const cloth = activeDest?.clothing;
        if (cloth && !useGameStore.getState().character.wardrobe.includes(cloth)) {
            findClothing(cloth);
            const garment = CLOTHING_BY_ID[cloth];
            if (garment) msg += ` · ${garment.name} found`;
        }
        await saveToCloud();
        showToast(msg);
    }, [claimRelic, findClothing, saveToCloud, showToast, activeDest]);

    const handleForge = useCallback((id: string) => {
        equipWeapon(id);
        saveToCloud();
        setForgeOpen(false);
        showToast(`✦ ${WEAPON_BY_ID[id]?.name || 'Weapon'} forged — you are armed`);
    }, [equipWeapon, saveToCloud, showToast]);

    const onVictory = useCallback(() => {
        setCombatDest((d) => {
            if (d) {
                const ch = useGameStore.getState().character;
                const freshClear = !ch.cleared.includes(d.poiId);
                const before = ch.cleared.length;
                markCleared(d.poiId);
                saveToCloud();
                showToast(d.combat?.victory || 'The guardian falls.');
                // your weapon tempers up a tier on each new guardian felled
                if (freshClear) {
                    const oldW = weaponForTier(before), newW = weaponForTier(before + 1);
                    if (newW.id !== oldW.id) setTimeout(() => showToast(`✦ Your weapon tempers into the ${newW.name}`), 2800);
                }
                setActiveDest(d);
            }
            return null;
        });
    }, [markCleared, saveToCloud, showToast]);

    const onDefeat = useCallback(() => {
        setCombatDest(null);
        showToast('The shades overwhelm you. Rest, and return stronger.');
    }, [showToast]);

    const handleSolve = useCallback((puzzleId: string) => {
        markSolved(puzzleId);
        saveToCloud();
        showToast('✦ The quest is solved — the relic is yours to claim');
    }, [markSolved, saveToCloud, showToast]);

    const handleClaimQuest = useCallback((q: Quest) => {
        claimQuest(q.id, q.reward.skillPoints);
        if (q.grantsScroll) grantScroll(q.grantsScroll);
        saveToCloud();
        const scrollName = q.grantsScroll ? SCROLL_BY_ID[q.grantsScroll]?.name : null;
        showToast(`✦ Mission complete · ${q.reward.text}${scrollName ? ` · ${scrollName}` : ''}`);
    }, [claimQuest, grantScroll, saveToCloud, showToast]);

    if (!mounted) return <div className="w-full bg-void" style={{ height: '100dvh' }} />;

    const path = character.path ? PATH_BY_ID[character.path] : null;

    const combatPrelude = combatIntroDest ? cutsceneForCombat(combatIntroDest.poiId) : null;
    const resTier = resonanceTier(character.inventory);
    const pathMods = pathCombatMods(character.path, character.skills);
    const combatBlessing = combatRelicBonuses(character.inventory, character.equipped.relic);

    return (
        <div className="relative w-full overflow-hidden bg-void select-none" style={{ height: '100dvh', touchAction: 'none' }}>
            {!worldIntroDone && (
                <CutscenePlayer scene={cutscene('world')} onComplete={finishWorldIntro} onSkip={finishWorldIntro} />
            )}

            {combatIntroDest && combatPrelude && (
                <CutscenePlayer scene={combatPrelude} onComplete={finishCombatIntro} onSkip={finishCombatIntro} />
            )}

            <WorldCanvas character={character} shadeCount={shadeCountForTier(resTier)} onInteract={onInteract} onEncounter={onEncounter} />

            {/* readability scrims so the HUD + controls read against bright grass */}
            <div className="absolute top-0 inset-x-0 h-28 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }} />
            <div className="absolute bottom-0 inset-x-0 h-44 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }} />

            {/* HUD — centred phone-width frame, safe-area aware */}
            <div className="absolute top-0 inset-x-0 mx-auto w-full max-w-[540px] flex items-center justify-between gap-2 px-4 pointer-events-none" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
                <div className="flex items-center gap-2">
                    <Link href="/awakening/path" className="pointer-events-auto p-2 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <button onClick={() => setQuestLogOpen(true)} className="pointer-events-auto p-2 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-300 hover:text-aether-gold" title="Missions">
                        <ScrollText className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/45 border border-aether-gold/20 backdrop-blur-sm min-w-0">
                    <FounderBadge founderNumber={founderNumber} size={18} />
                    <span className="font-ritual text-sm text-white truncate">{character.name || 'Soul'}</span>
                    {path && (
                        <span className="text-[9px] font-black uppercase tracking-widest shrink-0" style={{ color: path.color }}>· {path.name}</span>
                    )}
                </div>
                <button onClick={() => setSatchelOpen(true)} className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/45 border border-aether-gold/20 backdrop-blur-sm hover:border-aether-gold/40">
                    <Gem className="w-3.5 h-3.5 text-aether-gold" />
                    <span className="text-xs font-black text-aether-gold">{character.inventory.length}</span>
                </button>
            </div>

            {hint && (
                <div className="absolute left-1/2 top-[60%] -translate-x-1/2 pointer-events-none">
                    <p className="px-4 py-1.5 rounded-full bg-black/35 border border-white/10 backdrop-blur-sm text-[10px] uppercase tracking-[0.3em] text-white/60 animate-pulse whitespace-nowrap">drag to roam · find Truth's Hut</p>
                </div>
            )}

            {toast && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 border border-aether-gold/30 text-[11px] text-aether-gold font-mono tracking-wide pointer-events-none whitespace-nowrap">
                    {toast}
                </div>
            )}

            {/* the way to the Source — opens once every relic has been gathered */}
            {hasAllRelics(character.inventory) && !character.sourceReturned && (
                <button
                    onClick={() => setSourceOpen(true)}
                    className="absolute left-1/2 top-[14%] -translate-x-1/2 z-20 pointer-events-auto px-5 py-3 rounded-2xl text-center animate-pulse"
                    style={{ background: 'linear-gradient(135deg, rgba(252,211,77,0.96) 0%, rgba(180,83,9,0.96) 100%)', boxShadow: '0 0 44px rgba(251,191,36,0.6)' }}
                >
                    <span className="block text-[8px] font-black uppercase tracking-[0.35em] text-black/70">The five relics burn as one</span>
                    <span className="block text-[12px] font-black uppercase tracking-[0.25em] text-black mt-0.5">Return to the Source →</span>
                </button>
            )}

            {/* the journey, once completed, dwells in the soul */}
            {character.sourceReturned && (
                <div className="absolute left-1/2 top-[14%] -translate-x-1/2 z-10 pointer-events-none px-4 py-1.5 rounded-full bg-black/50 border border-aether-gold/30">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-aether-gold">✦ The Source dwells in you</span>
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

                        {/* first weapon */}
                        {!character.equipped.weapon ? (
                            <button onClick={() => { setHutOpen(false); setForgeOpen(true); }} className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.25em] text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                <Swords className="w-3.5 h-3.5" /> Forge your first weapon
                            </button>
                        ) : (
                            <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-2">
                                <Swords className="w-3 h-3 text-aether-gold" /> Armed · {WEAPON_BY_ID[character.equipped.weapon]?.name}
                            </p>
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

            {/* satchel of relics */}
            {satchelOpen && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setSatchelOpen(false)}>
                    <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-[rgba(251,191,36,0.2)] max-h-[82dvh] overflow-y-auto custom-scrollbar relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSatchelOpen(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">Inventory</p>
                        <h2 className="font-ritual text-2xl gold-shimmer mb-4">Your Satchel</h2>

                        {/* raw materials backpack */}
                        <div className="mb-5 grid grid-cols-3 gap-2 border-b border-white/5 pb-4">
                            <div className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                                <span className="text-[7px] uppercase tracking-widest text-zinc-500">Iron Ore</span>
                                <span className="text-xs font-bold text-slate-300 mt-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    {character.materials?.iron || 0}
                                </span>
                            </div>
                            <div className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                                <span className="text-[7px] uppercase tracking-widest text-zinc-500">Copper</span>
                                <span className="text-xs font-bold text-amber-500 mt-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                    {character.materials?.copper || 0}
                                </span>
                            </div>
                            <div className="flex flex-col items-center p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                                <span className="text-[7px] uppercase tracking-widest text-zinc-500">Cosmic</span>
                                <span className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {character.materials?.cosmic || 0}
                                </span>
                            </div>
                        </div>

                        {/* the goal — gather all five relics to open the way to the Source */}
                        {(() => {
                            const got = ALL_RELIC_IDS.filter((id) => character.inventory.includes(id)).length;
                            const total = ALL_RELIC_IDS.length;
                            const done = got >= total;
                            return (
                                <div className="mb-5 rounded-2xl border p-4" style={{ borderColor: done ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)', background: done ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] uppercase tracking-[0.3em] text-aether-gold/80">Path to the Source</p>
                                        <p className="text-[10px] font-black tracking-widest text-aether-gold">{got} / {total}</p>
                                    </div>
                                    <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${(got / total) * 100}%`, background: 'linear-gradient(90deg,#fcd34d,#b45309)' }} />
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
                                        {done ? 'The five relics burn as one. The way to the Source is open.' : 'Gather all five relics — one from each destination — to open the way back to the Source.'}
                                    </p>
                                </div>
                            );
                        })()}
                        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                            <p className="text-[9px] uppercase tracking-[0.3em] text-aether-gold/80 mb-1">Relic resonance</p>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{resonanceLabel(resTier)} · {resTier}/5 relics humming</p>
                        </div>
                        {(() => {
                            const rb = combatBlessing;
                            const sb = skillBonuses(character.skills);
                            const fb = founderBonuses(founderNumber);
                            const cb = clothingBonus(character.equipped.clothing);
                            const hp = rb.hp + sb.hp + fb.hp + cb.hp;
                            const damage = rb.damage + sb.damage + fb.damage + cb.damage;
                            const reach = rb.reach + sb.reach + fb.reach + cb.reach;
                            const regen = sb.regen + cb.regen + rb.regen;
                            const parts = [
                                hp ? `+${Math.round(hp)} vitality` : '',
                                damage ? `+${Math.round(damage)} might` : '',
                                reach ? `+${Math.round(reach)} reach` : '',
                                regen ? `+${regen}/s renewal` : '',
                            ].filter(Boolean);
                            return parts.length ? (
                                <div className="mb-5">
                                    <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 mb-2">Combat blessing · equipped relic + echo + path</p>
                                    <div className="flex flex-wrap gap-2">
                                        {parts.map((p) => (
                                            <span key={p} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-aether-gold/10 border border-aether-gold/30 text-aether-gold">{p}</span>
                                        ))}
                                    </div>
                                </div>
                            ) : null;
                        })()}
                        {character.inventory.length === 0 ? (
                            <p className="text-zinc-500 text-sm text-center py-10 leading-relaxed">No relics yet.<br />Step through the portals and descend the caverns to find them.</p>
                        ) : (
                            <div className="space-y-3">
                                {character.inventory.map((id) => {
                                    const r = RELIC_BY_ID[id];
                                    if (!r) return null;
                                    const equipped = character.equipped.relic === id;
                                    return (
                                        <div key={id} className="glass bg-white/[0.03] border rounded-2xl p-4 flex items-start gap-3" style={{ borderColor: equipped ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)' }}>
                                            <div className="w-10 h-10 rounded-xl bg-aether-gold/10 border border-aether-gold/20 flex items-center justify-center text-aether-gold shrink-0">
                                                <Gem className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-white">{r.name}</h4>
                                                <p className="text-[9px] font-mono uppercase tracking-widest text-aether-gold/60">{r.from}</p>
                                                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{r.desc}</p>
                                                {r.power && <p className="text-[10px] font-black uppercase tracking-widest mt-1.5 text-aether-gold">⚔ {r.power.label}{equipped ? '' : ' (20% echo)'}</p>}
                                            </div>
                                            {equipped ? (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-aether-gold shrink-0 self-center">Equipped</span>
                                            ) : (
                                                <button onClick={() => { equipRelic(id); saveToCloud(); showToast(`✦ ${r.name} equipped`); }} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-black shrink-0 self-center" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                                    Equip
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* scrolls — puzzle insight */}
                        {character.scrolls.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-white/10">
                                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-3">Scrolls</p>
                                <div className="space-y-3">
                                    {character.scrolls.map((id) => {
                                        const sc = SCROLL_BY_ID[id];
                                        if (!sc) return null;
                                        const equipped = character.equipped.scroll === id;
                                        return (
                                            <div key={id} className="glass bg-white/[0.03] border rounded-2xl p-4 flex items-start gap-3" style={{ borderColor: equipped ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)' }}>
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                                                    <ScrollText className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-sm font-bold text-white">{sc.name}</h4>
                                                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{sc.desc}</p>
                                                </div>
                                                {equipped ? (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 shrink-0 self-center">Readied</span>
                                                ) : (
                                                    <button onClick={() => { equipScroll(id); saveToCloud(); showToast(`✦ ${sc.name} readied`); }} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-black shrink-0 self-center" style={{ background: 'linear-gradient(135deg,#c084fc 0%,#6b21a8 100%)' }}>
                                                        Ready
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* wardrobe — garments you've found (start in the plain garment) */}
                        <div className="mt-6 pt-5 border-t border-white/10">
                            <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-3">Wardrobe</p>
                            <div className="space-y-3">
                                {character.wardrobe.map((id) => {
                                    const g = CLOTHING_BY_ID[id];
                                    if (!g) return null;
                                    const worn = character.equipped.clothing === id;
                                    return (
                                        <div key={id} className="glass bg-white/[0.03] border rounded-2xl p-4 flex items-start gap-3" style={{ borderColor: worn ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)' }}>
                                            <div className="w-10 h-10 rounded-xl bg-aether-gold/10 border border-aether-gold/20 flex items-center justify-center text-aether-gold shrink-0">
                                                <Shirt className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-white">{g.name}</h4>
                                                <p className="text-[9px] font-mono uppercase tracking-widest text-aether-gold/60">{g.from}</p>
                                                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{g.desc}</p>
                                                {g.power && <p className="text-[10px] font-black uppercase tracking-widest mt-1.5 text-aether-gold">⚔ {g.power.label}</p>}
                                            </div>
                                            {worn ? (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-aether-gold shrink-0 self-center">Worn</span>
                                            ) : (
                                                <button onClick={() => { equipClothing(id); saveToCloud(); showToast(`✦ ${g.name} donned`); }} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-black shrink-0 self-center" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                                    Wear
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* destination chamber (cave / portal) */}
            {activeDest && (
                <DestinationScene
                    destination={activeDest}
                    inventory={character.inventory}
                    solved={character.solved}
                    onClaim={handleClaim}
                    onSolve={handleSolve}
                    onExit={() => setActiveDest(null)}
                />
            )}

            {/* NPC mission dialog */}
            {questNpc && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setQuestNpc(null)}>
                    <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-[rgba(251,191,36,0.2)] max-h-[85dvh] overflow-y-auto custom-scrollbar relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setQuestNpc(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">Mission</p>
                        <h2 className="font-ritual text-2xl gold-shimmer mb-5">{questNpc.name}</h2>
                        <div className="space-y-4">
                            {questsAvailable(questNpc.id, character).map((q) => {
                                const claimed = character.questsClaimed.includes(q.id);
                                const met = objectiveMet(q, character);
                                return (
                                    <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                                        <h3 className="font-ritual text-lg text-white mb-2">{q.title}</h3>
                                        <p className="font-ritual italic text-white/85 text-sm leading-relaxed mb-4">“{claimed || met ? q.completeText : q.intro}”</p>
                                        <div className="text-[11px] mb-3">
                                            {claimed ? (
                                                <span className="text-aether-gold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Completed</span>
                                            ) : (
                                                <span className="text-zinc-400"><span className="uppercase tracking-widest text-[9px] text-zinc-500">Objective · </span>{q.objectiveText} <span style={{ color: met ? '#34d399' : '#fbbf24' }}>({objectiveProgress(q, character)})</span></span>
                                            )}
                                        </div>
                                        {!claimed && (met ? (
                                            <button onClick={() => handleClaimQuest(q)} className="px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                                Claim · {q.reward.skillPoints} skill pt{q.reward.skillPoints === 1 ? '' : 's'}
                                            </button>
                                        ) : (
                                            <p className="text-[10px] uppercase tracking-widest text-zinc-600">Reward · {q.reward.skillPoints} skill point{q.reward.skillPoints === 1 ? '' : 's'}</p>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* quest log */}
            {questLogOpen && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setQuestLogOpen(false)}>
                    <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-[rgba(251,191,36,0.2)] max-h-[82dvh] overflow-y-auto custom-scrollbar relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setQuestLogOpen(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">Missions</p>
                        <h2 className="font-ritual text-2xl gold-shimmer mb-5">Quest Log</h2>
                        <div className="space-y-2">
                            {QUESTS.filter((q) => !q.requires?.length || q.requires.every((id) => character.questsClaimed.includes(id))).map((q) => {
                                const claimed = character.questsClaimed.includes(q.id);
                                const met = objectiveMet(q, character);
                                const locked = !claimed && q.requires?.some((id) => !character.questsClaimed.includes(id));
                                const status = claimed ? 'Done' : locked ? 'Locked' : met ? 'Ready' : 'In progress';
                                const color = claimed ? '#10b981' : met ? '#fbbf24' : '#64748b';
                                return (
                                    <div key={q.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-bold text-white">{q.title}</h3>
                                            <span className="text-[9px] font-black uppercase tracking-widest shrink-0" style={{ color }}>{status}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">{q.giverName} · {q.objectiveText} ({objectiveProgress(q, character)})</p>
                                        {met && !claimed && (
                                            <button onClick={() => handleClaimQuest(q)} className="mt-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                                Claim · {q.reward.skillPoints} skill pt{q.reward.skillPoints === 1 ? '' : 's'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* first-weapon forge */}
            {forgeOpen && <WeaponForge onForge={handleForge} onClose={() => setForgeOpen(false)} />}

            {/* combat encounter — relics + your path's attunements + founder blessing stack */}
            {combatDest && combatDest.combat && (() => {
                const rb = combatBlessing;
                const sb = skillBonuses(character.skills);
                const fb = founderBonuses(founderNumber);
                const cb = clothingBonus(character.equipped.clothing);
                const wpn = weaponForTier(character.cleared.length);
                return (
                    <CombatScene
                        destination={combatDest}
                        character={character}
                        weaponDamage={wpn.damage}
                        weaponReach={wpn.reach}
                        bonusHp={rb.hp + sb.hp + fb.hp + cb.hp}
                        bonusDamage={rb.damage + sb.damage + fb.damage + cb.damage}
                        bonusReach={rb.reach + sb.reach + fb.reach + cb.reach}
                        bonusRegen={sb.regen + cb.regen + rb.regen}
                        bonusLifesteal={rb.lifesteal}
                        bonusCrit={rb.crit}
                        bonusKnockback={rb.knockback}
                        enemyHpMult={pathMods.enemyHpMult}
                        enemyDmgMult={pathMods.enemyDmgMult}
                        playerDamageMult={pathMods.playerDamageMult}
                        playerReachBonus={pathMods.playerReachBonus}
                        canChannel={pathMods.canChannel}
                        channelHealPct={pathMods.channelHealPct}
                        channelCooldownSec={pathMods.channelCooldownSec}
                        onVictory={onVictory}
                        onDefeat={onDefeat}
                        onExit={() => setCombatDest(null)}
                    />
                );
            })()}

            {/* the endgame — the Return to the Source */}
            {sourceOpen && (
                <SourceScene
                    character={character}
                    onComplete={() => { returnToSource(); saveToCloud(); setSourceOpen(false); showToast('✦ You have returned to the Source'); }}
                    onExit={() => setSourceOpen(false)}
                />
            )}
        </div>
    );
}
