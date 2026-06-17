'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGameStore } from '@/lib/store/useGameStore';
import { PATH_BY_ID, skillBonuses } from '@/lib/game/paths';
import { ArrowLeft, FileText, Film, Music, Image as ImageIcon, Link2, Pin, Settings, Gem, Swords, ScrollText, Check, X, Shirt, BookOpen, SlidersHorizontal, Sparkles } from 'lucide-react';
import AttunementPanel from '@/components/game/AttunementPanel';
import { QUESTS, questsAvailable, objectiveMet, objectiveProgress, type Quest } from '@/lib/game/quests';
import { combatRelicBonuses, resonanceTier, shadeCountForTier, resonanceLabel } from '@/lib/game/resonance';
import { pathCombatMods } from '@/lib/game/pathPowers';
import { hiddenPoiById } from '@/lib/game/hiddenPois';
import { SCROLL_BY_ID } from '@/lib/game/scrolls';
import { fetchBulletins, fetchMedia, getArchitectStatus, formatBytes, type Bulletin, type DispatchMedia } from '@/lib/game/hut';
import { FounderBadge } from '@/components/game/FounderBadge';
import { founderBonuses } from '@/lib/game/founders';
import { clothingBonus, CLOTHING_BY_ID } from '@/lib/game/clothing';
import { DEST_BY_POI, RELIC_BY_ID, hasAllRelics, ALL_RELIC_IDS, wildEncounter, type Destination } from '@/lib/game/destinations';
import { type Pickup } from '@/lib/game/overworld';
import { sfx } from '@/lib/game/sfx';
import DestinationScene from '@/components/game/DestinationScene';
import CombatScene from '@/components/game/CombatScene';
import SourceScene from '@/components/game/SourceScene';
import WeaponForge from '@/components/game/WeaponForge';
import CutscenePlayer from '@/components/game/CutscenePlayer';
import { cutscene, cutsceneForCombat } from '@/lib/game/cutscenes';
import { WEAPON_BY_ID } from '@/lib/game/weapons';
import { activeQuestWaypoint } from '@/lib/game/questWaypoint';
import { isDestinationUnlocked, unlockBlockMessage, activeDestinationFocus } from '@/lib/game/progression';
import { loadSettings, type GameSettings } from '@/lib/game/settings';
import { hapticTap } from '@/lib/game/haptics';
import Minimap from '@/components/game/Minimap';
import JournalPanel from '@/components/game/JournalPanel';
import GameSettingsPanel from '@/components/game/GameSettingsPanel';
import TutorialOverlay from '@/components/game/TutorialOverlay';
import SourceEpilogue from '@/components/game/SourceEpilogue';

const WorldCanvas = dynamic(() => import('@/components/game/WorldCanvas'), { ssr: false });

const TUTORIAL_KEY = 'tbth-tutorials-seen';
type TutorialId = 'roam' | 'interact' | 'satchel' | 'forge' | 'combat';

function tutorialsSeen(): string[] {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(TUTORIAL_KEY) || '[]'); } catch { return []; }
}

function markTutorialSeen(id: TutorialId) {
    const seen = tutorialsSeen();
    if (!seen.includes(id)) localStorage.setItem(TUTORIAL_KEY, JSON.stringify([...seen, id]));
}

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
    const learnSkill = useGameStore((s) => s.learnSkill);
    const addFightBonusHp = useGameStore((s) => s.addFightBonusHp);
    const consumeFightBonusHp = useGameStore((s) => s.consumeFightBonusHp);
    const grantScroll = useGameStore((s) => s.grantScroll);
    const equipRelic = useGameStore((s) => s.equipRelic);
    const equipScroll = useGameStore((s) => s.equipScroll);
    const markDiscovered = useGameStore((s) => s.markDiscovered);
    const addMaterial = useGameStore((s) => s.addMaterial);
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
    const [encounter, setEncounter] = useState<Destination | null>(null);
    const [questNpc, setQuestNpc] = useState<{ id: string; name: string } | null>(null);
    const [questLogOpen, setQuestLogOpen] = useState(false);
    const [sourceOpen, setSourceOpen] = useState(false);
    const [journalOpen, setJournalOpen] = useState(false);
    const [attunementOpen, setAttunementOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [epilogueOpen, setEpilogueOpen] = useState(false);
    const [settings, setSettings] = useState<GameSettings>(loadSettings);
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [hutAlert, setHutAlert] = useState(false);
    const [tutorial, setTutorial] = useState<TutorialId | null>(null);
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
        setSettings(loadSettings());
        setWorldIntroDone(sessionStorage.getItem('tbth-cutscene-world') === '1');
        loadFromCloud();
        fetchBulletins(8).then((bs) => {
            setBulletins(bs);
            if (bs.length > 0) {
                const lastSeen = localStorage.getItem('tbth-hut-seen');
                if (!lastSeen || lastSeen !== bs[0].id) setHutAlert(true);
            }
        });
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

    useEffect(() => {
        if (!worldIntroDone) return;
        if (!tutorialsSeen().includes('roam')) setTutorial('roam');
    }, [worldIntroDone]);

    useEffect(() => {
        if (hutOpen && bulletins[0]) {
            localStorage.setItem('tbth-hut-seen', bulletins[0].id);
            setHutAlert(false);
        }
    }, [hutOpen, bulletins]);

    const dismissTutorial = useCallback((id: TutorialId) => {
        markTutorialSeen(id);
        setTutorial(null);
    }, []);

    const onPositionUpdate = useCallback((x: number, y: number) => {
        setPlayerPos({ x, y });
    }, []);

    const onTruthLine = useCallback((line: string) => {
        setDialogue({ speaker: 'Truth', text: line, color: '#f97316' });
    }, []);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2600);
    }, []);

    const onInteract = useCallback((poi: InteractPOI) => {
        setHint(false);
        hapticTap('light');
        if (!tutorialsSeen().includes('interact')) setTutorial('interact');
        const dest = DEST_BY_POI[poi.id];
        if (dest) {
            const ch = useGameStore.getState().character;
            if (!isDestinationUnlocked(poi.id, ch)) {
                setDialogue({ speaker: 'Truth', text: unlockBlockMessage(poi.id), color: '#f97316' });
                return;
            }
            const needsFight = !!dest.combat && !ch.cleared.includes(dest.poiId);
            if (needsFight && !ch.equipped.weapon) {
                setDialogue({ speaker: dest.guide.name, text: 'You cannot face what guards this place unarmed. Return to Truth’s Hut and forge your first weapon.', color: dest.accent });
            } else if (needsFight && dest.poiId !== 'dest_eden') {
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
            } else if (poi.detail) {
                setDialogue({ speaker: poi.name, text: poi.detail });
            } else {
                setDialogue({ speaker: poi.name, text: 'The road to their missions is not yet open. Walk the prior age to its end.' });
            }
        } else if (poi.type === 'cave') {
            setDialogue({ speaker: poi.name, text: 'The cave is sealed with old wards. You are not yet ready to descend — return when your path has deepened.' });
        } else if (poi.type === 'portal') {
            setDialogue({ speaker: 'Portal to the Past', text: 'The veil between ages shimmers, but holds. Its hour has not yet come.', color: '#a855f7' });
        }
    }, [markDiscovered, saveToCloud, showToast]);

    // a shade catches you in the open — if you're armed, it's a real skirmish;
    // unarmed, it's only a cold warning to go forge a weapon.
    const onEncounter = useCallback(() => {
        setHint(false);
        hapticTap('medium');
        if (!tutorialsSeen().includes('combat')) setTutorial('combat');
        const ch = useGameStore.getState().character;
        if (!ch.equipped.weapon) {
            showToast('A shade drifts through you — cold, and searching. Arm yourself at Truth’s Hut.');
            return;
        }
        setEncounter(wildEncounter(ch.cleared.length));
    }, [showToast]);

    // walked over an essence mote in the world — bank the material for the forge
    const onPickup = useCallback((pk: Pickup) => {
        markDiscovered(pk.id);
        saveToCloud();
        sfx.pickup();
        hapticTap('light');
        if (pk.kind === 'health') {
            addFightBonusHp(pk.qty);
            showToast(`✦ +${pk.qty} vitality · bonus HP for your next fight`);
            return;
        }
        addMaterial(pk.kind, pk.qty);
        const label = pk.kind === 'iron' ? 'Iron Ore' : pk.kind === 'copper' ? 'Copper' : 'Cosmic Essence';
        showToast(`✦ +${pk.qty} ${label}`);
    }, [addMaterial, addFightBonusHp, markDiscovered, saveToCloud, showToast]);

    const onEncounterVictory = useCallback(() => {
        consumeFightBonusHp();
        setEncounter(null);
        // the scattered shades leave a little ore behind for the forge
        const roll = Math.random();
        if (roll < 0.12) { addMaterial('cosmic', 1); showToast('✦ A mote of Cosmic Essence drifts free'); }
        else if (roll < 0.5) { addMaterial('copper', 1); showToast('✦ The shades scatter — +1 Copper'); }
        else { addMaterial('iron', 2); showToast('✦ The shades scatter — +2 Iron Ore'); }
        saveToCloud();
    }, [addMaterial, consumeFightBonusHp, saveToCloud, showToast]);

    const onEncounterDefeat = useCallback(() => {
        consumeFightBonusHp();
        setEncounter(null);
        showToast('The shades overwhelm you. Rest, and return stronger.');
    }, [showToast, consumeFightBonusHp]);

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
        hapticTap('heavy');
        showToast(msg);
    }, [claimRelic, findClothing, saveToCloud, showToast, activeDest]);

    const handleForge = useCallback((id: string) => {
        equipWeapon(id);
        saveToCloud();
        setForgeOpen(false);
        hapticTap('medium');
        if (!tutorialsSeen().includes('forge')) setTutorial('forge');
        showToast(`✦ ${WEAPON_BY_ID[id]?.name || 'Weapon'} forged — you are armed`);
    }, [equipWeapon, saveToCloud, showToast]);

    const onVictory = useCallback(() => {
        consumeFightBonusHp();
        setCombatDest((d) => {
            if (d) {
                const ch = useGameStore.getState().character;
                const freshClear = !ch.cleared.includes(d.poiId);
                markCleared(d.poiId);
                saveToCloud();
                showToast(d.combat?.victory || 'The guardian falls.');
                if (freshClear) {
                    setTimeout(() => showToast(`✦ Guardian defeated! Visit Truth's Forge to upgrade your weapon using gathered resources.`), 2800);
                }
                setActiveDest(d);
            }
            return null;
        });
    }, [markCleared, saveToCloud, showToast, consumeFightBonusHp]);

    const onDefeat = useCallback(() => {
        consumeFightBonusHp();
        setCombatDest(null);
        showToast('The shades overwhelm you. Rest, and return stronger.');
    }, [showToast, consumeFightBonusHp]);

    const handleSolve = useCallback((puzzleId: string) => {
        markSolved(puzzleId);
        saveToCloud();
        showToast('✦ The quest is solved — the relic is yours to claim');
    }, [markSolved, saveToCloud, showToast]);

    const handleClaimQuest = useCallback((q: Quest) => {
        claimQuest(q.id, q.reward.skillPoints);
        if (q.grantsScroll) grantScroll(q.grantsScroll);
        saveToCloud();
        hapticTap('medium');
        const scrollName = q.grantsScroll ? SCROLL_BY_ID[q.grantsScroll]?.name : null;
        showToast(`✦ Mission complete · ${q.reward.text}${scrollName ? ` · ${scrollName}` : ''}`);
    }, [claimQuest, grantScroll, saveToCloud, showToast]);

    if (!mounted) return <div className="w-full bg-void" style={{ height: '100dvh' }} />;

    const path = character.path ? PATH_BY_ID[character.path] : null;

    const combatPrelude = combatIntroDest ? cutsceneForCombat(combatIntroDest.poiId) : null;
    const resTier = resonanceTier(character.inventory);
    const pathMods = pathCombatMods(character.path, character.skills);
    const combatBlessing = combatRelicBonuses(character.inventory, character.equipped.relic);

    // every combat stacks relics + path + founder seal + worn garment — computed
    // once here and shared by both real-destination fights and wild skirmishes.
    const cSkill = skillBonuses(character.skills);
    const cFounder = founderBonuses(founderNumber);
    const cCloth = clothingBonus(character.equipped.clothing);
    const combatStatProps = {
        bonusHp: combatBlessing.hp + cSkill.hp + cFounder.hp + cCloth.hp + character.fightBonusHp,
        bonusDamage: combatBlessing.damage + cSkill.damage + cFounder.damage + cCloth.damage,
        bonusReach: combatBlessing.reach + cSkill.reach + cFounder.reach + cCloth.reach,
        bonusRegen: cSkill.regen + cCloth.regen + combatBlessing.regen,
        bonusLifesteal: combatBlessing.lifesteal,
        bonusCrit: combatBlessing.crit,
        bonusKnockback: combatBlessing.knockback,
        enemyHpMult: pathMods.enemyHpMult,
        enemyDmgMult: pathMods.enemyDmgMult,
        playerDamageMult: pathMods.playerDamageMult,
        playerReachBonus: pathMods.playerReachBonus,
    };
    const wpn = WEAPON_BY_ID[character.equipped.weapon || 'wood_staff'] || WEAPON_BY_ID['wood_staff'];
    const questWaypoint = activeQuestWaypoint(character);
    const hutQuests = questsAvailable('hut', character);

    // freeze the roaming world whenever any overlay/scene is on top of it
    const worldPaused = !worldIntroDone || !!combatIntroDest || hutOpen || satchelOpen || !!activeDest ||
        !!combatDest || !!encounter || !!questNpc || questLogOpen || forgeOpen || sourceOpen || !!dialogue ||
        journalOpen || settingsOpen || epilogueOpen || attunementOpen;

    return (
        <div className="relative w-full overflow-hidden bg-void select-none" style={{ height: '100dvh', touchAction: 'none' }}>
            {!worldIntroDone && (
                <CutscenePlayer scene={cutscene('world')} onComplete={finishWorldIntro} onSkip={finishWorldIntro} />
            )}

            {combatIntroDest && combatPrelude && (
                <CutscenePlayer scene={combatPrelude} onComplete={finishCombatIntro} onSkip={finishCombatIntro} />
            )}

            <WorldCanvas
                character={character}
                shadeCount={shadeCountForTier(resTier)}
                paused={worldPaused}
                resonanceTier={resTier}
                showQuestTrail={settings.showQuestTrail}
                questWaypoint={questWaypoint}
                onInteract={onInteract}
                onEncounter={onEncounter}
                onPickup={onPickup}
                onPositionUpdate={onPositionUpdate}
                onTruthLine={onTruthLine}
            />

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
                    <button onClick={() => setJournalOpen(true)} className="pointer-events-auto p-2 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-300 hover:text-aether-gold" title="Codex Journal">
                        <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setAttunementOpen(true)}
                        className="pointer-events-auto p-2 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-300 hover:text-aether-gold relative"
                        title="Attunement Tree"
                        style={path ? { color: path.color } : undefined}
                    >
                        <Sparkles className="w-4 h-4" />
                        {character.skillPoints > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-aether-gold text-[8px] font-black text-black flex items-center justify-center">{character.skillPoints}</span>
                        )}
                    </button>
                    <button onClick={() => setSettingsOpen(true)} className="pointer-events-auto p-2 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-300 hover:text-aether-gold" title="Settings">
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/45 border border-aether-gold/20 backdrop-blur-sm min-w-0">
                    <FounderBadge founderNumber={founderNumber} size={18} />
                    <span className="font-ritual text-sm text-white truncate">{character.name || 'Soul'}</span>
                    {path && (
                        <span className="text-[9px] font-black uppercase tracking-widest shrink-0" style={{ color: path.color }}>· {path.name}</span>
                    )}
                </div>
                <button
                    onClick={() => { setSatchelOpen(true); if (!tutorialsSeen().includes('satchel')) setTutorial('satchel'); }}
                    className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/45 border border-aether-gold/20 backdrop-blur-sm hover:border-aether-gold/40"
                >
                    <Gem className="w-3.5 h-3.5 text-aether-gold" />
                    <span className="text-xs font-black text-aether-gold">{character.inventory.length}</span>
                </button>
            </div>

            {settings.showMinimap && worldIntroDone && !worldPaused && (
                <div className="absolute right-4 z-10 pointer-events-none" style={{ top: 'calc(4.5rem + env(safe-area-inset-top))' }}>
                    <Minimap
                        playerX={playerPos.x}
                        playerY={playerPos.y}
                        character={character}
                        questWaypoint={settings.showQuestTrail ? questWaypoint : null}
                        hutAlert={hutAlert}
                    />
                </div>
            )}

            {tutorial && worldIntroDone && !worldPaused && (
                <TutorialOverlay id={tutorial} onDismiss={() => dismissTutorial(tutorial)} />
            )}

            {hint && (
                <div className="absolute left-1/2 top-[60%] -translate-x-1/2 pointer-events-none text-center">
                    <p className="px-4 py-1.5 rounded-full bg-black/35 border border-white/10 backdrop-blur-sm text-[10px] uppercase tracking-[0.3em] text-white/60 animate-pulse whitespace-nowrap">drag to roam · Eden opens first</p>
                    {activeDestinationFocus(character) && (
                        <p className="mt-2 text-[9px] uppercase tracking-[0.25em] text-aether-gold/70">Current road · {DEST_BY_POI[activeDestinationFocus(character)!]?.name}</p>
                    )}
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

                        {/* cipher referral mission from Truth */}
                        {hutQuests.length > 0 && (
                            <div className="mb-5 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">A word for you</p>
                                {hutQuests.map((q) => {
                                    const claimed = character.questsClaimed.includes(q.id);
                                    const met = objectiveMet(q, character);
                                    return (
                                        <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                            <h3 className="font-ritual text-base text-white mb-1">{q.title}</h3>
                                            <p className="text-sm text-white/80 italic leading-relaxed mb-3">"{claimed || met ? q.completeText : q.intro}"</p>
                                            {claimed ? (
                                                <span className="text-[10px] text-aether-gold flex items-center gap-1"><Check className="w-3 h-3" /> Completed</span>
                                            ) : met ? (
                                                <button onClick={() => handleClaimQuest(q)} className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-black" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                                    Claim · {q.reward.skillPoints} skill pt{q.reward.skillPoints === 1 ? '' : 's'}
                                                </button>
                                            ) : (
                                                <p className="text-[10px] text-zinc-500">{q.objectiveText} ({objectiveProgress(q, character)})</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex gap-2 mb-4">
                            <Link href="/codex" className="flex-1 text-center py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 text-zinc-400 hover:border-aether-gold/30 hover:text-aether-gold transition-colors">
                                Codex ↗
                            </Link>
                            <Link href="/cinema" className="flex-1 text-center py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 text-zinc-400 hover:border-aether-gold/30 hover:text-aether-gold transition-colors">
                                Cinema ↗
                            </Link>
                        </div>

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
                    onGuardianCleared={(poiId) => {
                        markCleared(poiId);
                        saveToCloud();
                        showToast('✦ The guardian falls — the inner garden opens.');
                    }}
                    onDiscover={(ids) => {
                        const ch = useGameStore.getState().character;
                        const fresh = ids.filter((id) => !ch.discovered.includes(id));
                        if (fresh.length) {
                            fresh.forEach((id) => markDiscovered(id));
                            saveToCloud();
                        }
                    }}
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
            {combatDest && combatDest.combat && (
                <CombatScene
                    destination={combatDest}
                    character={character}
                    weaponDamage={wpn.damage}
                    weaponReach={wpn.reach}
                    {...combatStatProps}
                    onVictory={onVictory}
                    onDefeat={onDefeat}
                    onExit={() => { consumeFightBonusHp(); setCombatDest(null); }}
                />
            )}

            {/* wandering-shade skirmish — a shade caught you out in the open */}
            {encounter && encounter.combat && (
                <CombatScene
                    destination={encounter}
                    character={character}
                    weaponDamage={wpn.damage}
                    weaponReach={wpn.reach}
                    {...combatStatProps}
                    onVictory={onEncounterVictory}
                    onDefeat={onEncounterDefeat}
                    onExit={() => { consumeFightBonusHp(); setEncounter(null); }}
                />
            )}

            {/* the endgame — the Return to the Source */}
            {sourceOpen && (
                <SourceScene
                    character={character}
                    onComplete={() => {
                        returnToSource();
                        saveToCloud();
                        setSourceOpen(false);
                        setEpilogueOpen(true);
                        hapticTap('heavy');
                    }}
                    onExit={() => setSourceOpen(false)}
                />
            )}

            {journalOpen && (
                <JournalPanel character={character} initiated={!!character.name} onClose={() => setJournalOpen(false)} />
            )}

            {attunementOpen && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setAttunementOpen(false)}>
                    <div className="w-full max-w-md glass-panel rounded-3xl border border-white/10 overflow-hidden max-h-[88dvh]" onClick={(e) => e.stopPropagation()}>
                        <AttunementPanel
                            character={character}
                            onLearn={(id) => { learnSkill(id); saveToCloud(); hapticTap('light'); }}
                            onClose={() => setAttunementOpen(false)}
                        />
                    </div>
                </div>
            )}

            {settingsOpen && (
                <GameSettingsPanel onClose={() => setSettingsOpen(false)} onChange={setSettings} />
            )}

            {epilogueOpen && (
                <SourceEpilogue
                    character={character}
                    founderNumber={founderNumber}
                    onClose={() => { setEpilogueOpen(false); showToast('✦ You have returned to the Source'); }}
                />
            )}
        </div>
    );
}
