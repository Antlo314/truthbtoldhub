'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useGameStore } from '@/lib/store/useGameStore';
import { PATH_BY_ID, skillBonuses } from '@/lib/game/paths';
import { ArrowLeft, Menu, Settings, Gem, Swords, ScrollText, Check, X, Shirt, BookOpen, SlidersHorizontal, Sparkles, FlaskConical, Backpack, Heart } from 'lucide-react';
import { maxVitality, currentVitality } from '@/lib/game/vitality';
import AttunementPanel from '@/components/game/AttunementPanel';
import { QUESTS, QUESTS_ENABLED, questsAvailable, objectiveMet, objectiveProgress, type Quest } from '@/lib/game/quests';
import WorldEventBanner from '@/components/game/WorldEventBanner';
import WorldPresenceBanner from '@/components/game/WorldPresenceBanner';
import { fetchWorldPresence, pingWorldWalk, type WorldPresence } from '@/lib/game/worldPresence';
import { supabase } from '@/lib/supabase';
import {
    activeWorldEvent,
    effectiveShadeCount,
    scalePickupQty,
    wildEncounterMods,
    worldEventDayKey,
} from '@/lib/game/worldEvents';
import {
    destinationVisitId,
    newlyMetRoamMilestones,
    nextRoamMilestoneHint,
    nextWildShadeWinId,
} from '@/lib/game/roamMilestones';
import { combatRelicBonuses, resonanceTier, shadeCountForTier, resonanceLabel } from '@/lib/game/resonance';
import { pathCombatMods } from '@/lib/game/pathPowers';
import { hiddenPoiById } from '@/lib/game/hiddenPois';
import { SCROLL_BY_ID } from '@/lib/game/scrolls';
import { fetchBulletins, fetchMedia, getArchitectStatus, type Bulletin, type DispatchMedia } from '@/lib/game/hut';
import { FounderBadge } from '@/components/game/FounderBadge';
import { founderBonuses } from '@/lib/game/founders';
import { clothingBonus, CLOTHING_BY_ID } from '@/lib/game/clothing';
import { DEST_BY_POI, RELIC_BY_ID, hasAllRelics, ALL_RELIC_IDS, type Destination } from '@/lib/game/destinations';
import { rollWildArchetype, wildEncounter, wildShadeDiscoverId } from '@/lib/game/wildShades';
import { CONSUMABLE_BY_ID, consumableStock, formatConsumableEffect } from '@/lib/game/consumables';
import { type Pickup } from '@/lib/game/overworld';
import { sfx } from '@/lib/game/sfx';
import CutscenePlayer from '@/components/game/CutscenePlayer';
import { cutscene, cutsceneForCombat } from '@/lib/game/cutscenes';
import { WEAPON_BY_ID } from '@/lib/game/weapons';
import { activeQuestWaypoint, focusWaypoint } from '@/lib/game/questWaypoint';
import { isDestinationUnlocked, unlockBlockMessage, isDestinationSealed } from '@/lib/game/progression';
import { loadSettings, applyMusicSetting, type GameSettings } from '@/lib/game/settings';
import { gameMusic } from '@/lib/game/music';
import { hapticTap } from '@/lib/game/haptics';
import Minimap from '@/components/game/Minimap';
import TutorialOverlay, { TUTORIAL_IDS } from '@/components/game/TutorialOverlay';
import WorldDialogueBox from '@/components/game/WorldDialogueBox';
import { useIsDesktopLayout } from '@/components/game/controls/useInputProfile';
import {
    truthCombatLine,
    truthDestClearLine,
    truthBulletinPing,
    truthNpcEcho,
    truthRelicLine,
    truthForgeLine,
} from '@/lib/game/truthVoice';

const WorldCanvas = dynamic(() => import('@/components/game/WorldCanvas'), { ssr: false });
// Gated overlays — only mount behind state, so split them out of the first-load
// bundle (keeps the overworld's first paint light on mobile). CutscenePlayer
// stays static above: it renders on first paint for the world intro.
const DestinationScene = dynamic(() => import('@/components/game/DestinationScene'), { ssr: false });
const CombatScene = dynamic(() => import('@/components/game/CombatScene'), { ssr: false });
const SourceScene = dynamic(() => import('@/components/game/SourceScene'), { ssr: false });
const WeaponForge = dynamic(() => import('@/components/game/WeaponForge'), { ssr: false });
const HutInterior = dynamic(() => import('@/components/game/HutInterior'), { ssr: false });
const JournalPanel = dynamic(() => import('@/components/game/JournalPanel'), { ssr: false });
const GameSettingsPanel = dynamic(() => import('@/components/game/GameSettingsPanel'), { ssr: false });
const SourceEpilogue = dynamic(() => import('@/components/game/SourceEpilogue'), { ssr: false });

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

/** Suppress every intro walkthrough at once ("Never show again"). */
function markAllTutorialsSeen() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify([...TUTORIAL_IDS]));
}

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
    const setHpStore = useGameStore((s) => s.setHp);
    const healHp = useGameStore((s) => s.healHp);
    const restVitality = useGameStore((s) => s.restVitality);
    const grantScroll = useGameStore((s) => s.grantScroll);
    const equipRelic = useGameStore((s) => s.equipRelic);
    const equipScroll = useGameStore((s) => s.equipScroll);
    const markDiscovered = useGameStore((s) => s.markDiscovered);
    const addMaterial = useGameStore((s) => s.addMaterial);
    const useConsumable = useGameStore((s) => s.useConsumable);
    const returnToSource = useGameStore((s) => s.returnToSource);

    const [mounted, setMounted] = useState(false);
    const isDesktop = useIsDesktopLayout();
    const [dialogue, setDialogue] = useState<{ speaker: string; text: string; color?: string } | null>(null);
    // ambient Truth lines (proximity/wander/bulletin) — non-blocking bubble that
    // never freezes the world or hides the joystick, unlike the modal `dialogue`
    const [ambient, setAmbient] = useState<{ text: string; color?: string } | null>(null);
    const [hutOpen, setHutOpen] = useState(false);
    // deep-link straight to a Hut station (?hut=patron / ?hut=truth)
    const [hutInitial, setHutInitial] = useState<'offering' | 'truth' | null>(null);

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
    const [menuOpen, setMenuOpen] = useState(false);
    const [topBannersUp, setTopBannersUp] = useState(true);
    const [sourceOpen, setSourceOpen] = useState(false);
    const [journalOpen, setJournalOpen] = useState(false);
    const [attunementOpen, setAttunementOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [epilogueOpen, setEpilogueOpen] = useState(false);
    const [settings, setSettings] = useState<GameSettings>(loadSettings);
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [hutAlert, setHutAlert] = useState(false);
    const [tutorial, setTutorial] = useState<TutorialId | null>(null);
    const [worldPresence, setWorldPresence] = useState<WorldPresence>({ walkedToday: 0, fellows: [] });
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ambientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastWalkPing = useRef(0);
    const userIdRef = useRef<string | null>(null);

    const showAmbient = useCallback((text: string, color = '#f97316') => {
        setAmbient({ text, color });
        if (ambientTimer.current) clearTimeout(ambientTimer.current);
        ambientTimer.current = setTimeout(() => setAmbient(null), 5200);
    }, []);

    const finishWorldIntro = useCallback(() => {
        sessionStorage.setItem('tbth-cutscene-world', '1');
        setWorldIntroDone(true);
        gameMusic.crossfadeBgm('world_cavern', 3000, gameMusic.pickVariant('world_cavern'));
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
        // load the cloud soul first, THEN grant the founder seal — so the
        // founder skill-point bump can't be overwritten by a late cloud adopt.
        loadFromCloud().then(() => loadFounder()).then((tier) => {
            if (tier) {
                setToast(`✦ ${tier.name} — founding seal claimed · +${tier.bonusSkillPoints} skill ${tier.bonusSkillPoints === 1 ? 'point' : 'points'}`);
                if (toastTimer.current) clearTimeout(toastTimer.current);
                toastTimer.current = setTimeout(() => setToast(null), 5000);
            }
        });
        fetchBulletins(8).then((bs) => {
            setBulletins(bs);
            if (bs.length > 0) {
                const lastSeen = localStorage.getItem('tbth-hut-seen');
                if (!lastSeen || lastSeen !== bs[0].id) {
                    setHutAlert(true);
                    setTimeout(() => {
                        setAmbient({ text: truthBulletinPing(bs[0].title), color: '#f97316' });
                        if (ambientTimer.current) clearTimeout(ambientTimer.current);
                        ambientTimer.current = setTimeout(() => setAmbient(null), 5200);
                    }, 4500);
                }
            }
        });
        fetchMedia(16).then(setMedia);
        getArchitectStatus().then((a) => setIsArchitect(a.isArchitect));
        applyMusicSetting(loadSettings().music);
        if (sessionStorage.getItem('tbth-cutscene-world') === '1') {
            gameMusic.playBgm('world_cavern', { variant: gameMusic.pickVariant('world_cavern') });
        }
        const params = new URLSearchParams(window.location.search);
        const hutParam = params.get('hut');
        if (hutParam === 'patron' || hutParam === 'truth') {
            setHutOpen(true);
            setHutInitial(hutParam === 'patron' ? 'offering' : 'truth');
            window.history.replaceState({}, '', '/world');
        }
        const t = setTimeout(() => setHint(false), 5000);
        return () => {
            clearTimeout(t);
            if (ambientTimer.current) clearTimeout(ambientTimer.current);
            gameMusic.stopBgm(2200);
        };
    }, [loadFromCloud]);

    useEffect(() => {
        if (!mounted || !worldIntroDone) return;
        if (combatDest || encounter) {
            const dest = combatDest || encounter;
            const skirmish = dest?.combat?.skirmish || !!encounter;
            const edenBoss = combatDest?.poiId === 'dest_eden' && !skirmish && (combatDest.combat?.bossHp ?? 0) > 0;
            const track = edenBoss ? 'combat_eden_cherub' : 'combat_skirmish';
            gameMusic.crossfadeBgm(track, 900, gameMusic.pickVariant(track));
            return;
        }
        if (activeDest?.poiId === 'dest_eden') {
            gameMusic.crossfadeBgm('eden_garden', 2200, gameMusic.pickVariant('eden_garden'));
            return;
        }
        gameMusic.crossfadeBgm('world_cavern', 2000, gameMusic.pickVariant('world_cavern'));
    }, [mounted, worldIntroDone, activeDest, combatDest, encounter]);

    useEffect(() => {
        if (!worldIntroDone) return;
        if (!tutorialsSeen().includes('roam')) setTutorial('roam');
    }, [worldIntroDone]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            userIdRef.current = data.session?.user?.id ?? null;
        });
    }, []);

    useEffect(() => {
        if (!worldIntroDone) return;
        let alive = true;
        const refresh = () => {
            fetchWorldPresence(userIdRef.current).then((data) => {
                if (alive) setWorldPresence(data);
            });
        };
        refresh();
        const t = setInterval(refresh, 90_000);
        return () => { alive = false; clearInterval(t); };
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

    const dismissAllTutorials = useCallback(() => {
        markAllTutorialsSeen();
        setTutorial(null);
    }, []);

    const onPositionUpdate = useCallback((x: number, y: number) => {
        setPlayerPos({ x, y });
        if (!worldIntroDone) return;
        const now = Date.now();
        if (now - lastWalkPing.current < 45_000) return;
        lastWalkPing.current = now;
        void pingWorldWalk(x, y);
    }, [worldIntroDone]);

    const onTruthLine = useCallback((line: string) => {
        showAmbient(line, '#f97316');
    }, [showAmbient]);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 2600);
    }, []);

    const eventDay = worldEventDayKey();
    const worldEvent = useMemo(() => activeWorldEvent(), [eventDay]);
    useEffect(() => {
        if (!worldIntroDone) return;
        const key = `tbth-event-seen-${eventDay}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        showToast(`✦ Today's rhythm · ${worldEvent.shortLabel}`);
    }, [worldIntroDone, eventDay, worldEvent.shortLabel, showToast]);

    // the top banner column (world rhythm + objective) is an on-entry cue, not a
    // permanent fixture — fade it out after a few seconds so it doesn't sit there.
    useEffect(() => {
        if (!worldIntroDone) return;
        setTopBannersUp(true);
        const t = setTimeout(() => setTopBannersUp(false), 6500);
        return () => clearTimeout(t);
    }, [worldIntroDone]);

    // the Hut is the safe haven — resting there restores vitality to full.
    useEffect(() => {
        if (hutOpen) restVitality();
    }, [hutOpen, restVitality]);

    const unlockRoamMilestones = useCallback((opts?: { silent?: boolean }) => {
        const ch = useGameStore.getState().character;
        const fresh = newlyMetRoamMilestones(ch);
        if (!fresh.length) return;
        for (const m of fresh) markDiscovered(m.id);
        saveToCloud();
        if (opts?.silent) return;
        fresh.forEach((m, i) => {
            setTimeout(() => showToast(`${m.toast} · Codex Journal`), i * 2800);
        });
    }, [markDiscovered, saveToCloud, showToast]);

    useEffect(() => {
        if (!worldIntroDone) return;
        unlockRoamMilestones({ silent: true });
    }, [worldIntroDone, unlockRoamMilestones]);

    const onInteract = useCallback((poi: InteractPOI) => {
        setHint(false);
        hapticTap('light');
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
                const visitId = destinationVisitId(dest.poiId);
                if (!ch.discovered.includes(visitId)) markDiscovered(visitId);
                setActiveDest(dest);
                saveToCloud();
                setTimeout(() => unlockRoamMilestones(), 50);
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
                    setTimeout(() => unlockRoamMilestones(), 100);
                }
                setDialogue({ speaker: hidden.name, text: hidden.lore, color: '#22d3ee' });
                const echo = truthNpcEcho(poi.id, useGameStore.getState().character);
                if (echo) setTimeout(() => setDialogue({ speaker: 'Truth', text: echo, color: '#f97316' }), 3200);
            } else if (questsAvailable(poi.id, useGameStore.getState().character).length > 0) {
                setQuestNpc({ id: poi.id, name: poi.name });
            } else if (poi.detail) {
                setDialogue({ speaker: poi.name, text: poi.detail });
                const echo = truthNpcEcho(poi.id, useGameStore.getState().character);
                if (echo) setTimeout(() => setDialogue({ speaker: 'Truth', text: echo, color: '#f97316' }), 3200);
            } else {
                setDialogue({
                    speaker: poi.name,
                    text: 'The roads are open. Roam the cavern, enter the portals, gather relics, and return to Truth\'s Hut when you need word from home.',
                });
                const echo = truthNpcEcho(poi.id, useGameStore.getState().character);
                if (echo) setTimeout(() => setDialogue({ speaker: 'Truth', text: echo, color: '#f97316' }), 3200);
            }
        } else if (poi.type === 'cave') {
            setDialogue({ speaker: poi.name, text: 'The cave is sealed with old wards. You are not yet ready to descend — return when your path has deepened.' });
        } else if (poi.type === 'portal') {
            setDialogue({ speaker: 'Portal to the Past', text: 'The veil between ages shimmers, but holds. Its hour has not yet come.', color: '#a855f7' });
        }
    }, [markDiscovered, saveToCloud, showToast, unlockRoamMilestones]);

    // a shade catches you in the open — if you're armed, it's a real skirmish;
    // unarmed, it's only a cold warning to go forge a weapon.
    const onEncounter = useCallback(() => {
        setHint(false);
        hapticTap('medium');
        const ch = useGameStore.getState().character;
        if (!ch.equipped.weapon) {
            // non-blocking nudge — never freeze roaming just to say "go forge"
            showAmbient(truthCombatLine(ch, 'unarmedShade'), '#f97316');
            return;
        }
        const mods = wildEncounterMods(worldEvent);
        const arch = rollWildArchetype(ch.cleared.length, mods.worldEventId);
        if (!ch.discovered.includes(wildShadeDiscoverId(arch.id))) markDiscovered(wildShadeDiscoverId(arch.id));
        setEncounter(wildEncounter(ch.cleared.length, mods, arch));
        showToast(arch.encounterToast);
        saveToCloud();
    }, [markDiscovered, saveToCloud, showToast, showAmbient, worldEvent]);

    // walked over an essence mote in the world — bank the material for the forge.
    // (collection is tracked in the daily-harvest set in WorldCanvas, not in the
    // permanent `discovered` set, so the world refills each day.)
    const onPickup = useCallback((pk: Pickup) => {
        saveToCloud();
        sfx.pickup();
        hapticTap('light');
        const qty = scalePickupQty(pk.qty, worldEvent);
        if (pk.kind === 'health') {
            healHp(qty);
            const bonus = qty > pk.qty ? ' · bountiful day' : '';
            showToast(`✦ +${qty} vitality restored${bonus}`);
            return;
        }
        addMaterial(pk.kind, qty);
        const label = pk.kind === 'iron' ? 'Iron Ore' : pk.kind === 'copper' ? 'Copper' : 'Cosmic Essence';
        const bonus = qty > pk.qty ? ' · bountiful day' : '';
        showToast(`✦ +${qty} ${label}${bonus}`);
        setTimeout(() => unlockRoamMilestones(), 50);
    }, [addMaterial, healHp, markDiscovered, saveToCloud, showToast, worldEvent, unlockRoamMilestones]);

    const onEncounterVictory = useCallback(() => {
        consumeFightBonusHp();
        setEncounter(null);
        const ch = useGameStore.getState().character;
        const firstStand = !ch.discovered.includes('shade_stood');
        if (firstStand) markDiscovered('shade_stood');
        const winId = nextWildShadeWinId(useGameStore.getState().character);
        if (!useGameStore.getState().character.discovered.includes(winId)) markDiscovered(winId);
        const roll = Math.random();
        let loot: string;
        const mult = worldEvent.materialMult;
        if (roll < 0.12) {
            const q = scalePickupQty(1, worldEvent);
            addMaterial('cosmic', q);
            loot = `+${q} Cosmic Essence`;
        } else if (roll < 0.5) {
            const q = scalePickupQty(1, worldEvent);
            addMaterial('copper', q);
            loot = `+${q} Copper`;
        } else {
            const q = scalePickupQty(2, worldEvent);
            addMaterial('iron', q);
            loot = `+${q} Iron Ore`;
        }
        if (mult > 1) loot += ' · bountiful day';
        showToast(
            firstStand
                ? `✦ You stood against the shade · ${loot}`
                : roll < 0.12
                    ? '✦ A mote of Cosmic Essence drifts free'
                    : roll < 0.5
                        ? '✦ The shades scatter — +1 Copper'
                        : '✦ The shades scatter — +2 Iron Ore',
        );
        setTimeout(() => {
            setDialogue({
                speaker: 'Truth',
                text: truthCombatLine(useGameStore.getState().character, firstStand ? 'wildWinFirst' : 'wildWin'),
                color: '#f97316',
            });
        }, 2200);
        saveToCloud();
        setTimeout(() => unlockRoamMilestones(), 50);
    }, [addMaterial, consumeFightBonusHp, markDiscovered, saveToCloud, showToast, worldEvent.materialMult, unlockRoamMilestones]);

    const onEncounterDefeat = useCallback(() => {
        consumeFightBonusHp();
        setEncounter(null);
        restVitality();
        setHutOpen(true); // wake at the Hut, fully restored
        showToast('✦ The shades take you — you wake in Truth\'s Hut, vitality restored.');
    }, [consumeFightBonusHp, restVitality, showToast]);

    const handleClaim = useCallback(async (relicId: string) => {
        const beforeTier = resonanceTier(useGameStore.getState().character.inventory);
        gameMusic.playSting('relic_claim', Math.random() < 0.4 ? 'alt' : 'main');
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
        const relicLine = truthRelicLine(useGameStore.getState().character);
        if (relicLine) {
            setTimeout(() => setDialogue({ speaker: 'Truth', text: relicLine, color: '#f97316' }), 2800);
        }
        setTimeout(() => unlockRoamMilestones(), 100);
    }, [claimRelic, findClothing, saveToCloud, showToast, activeDest, unlockRoamMilestones]);

    const handleForge = useCallback((id: string) => {
        equipWeapon(id);
        saveToCloud();
        setForgeOpen(false);
        hapticTap('medium');
        if (!tutorialsSeen().includes('forge')) setTutorial('forge');
        showToast(`✦ ${WEAPON_BY_ID[id]?.name || 'Weapon'} forged — you are armed`);
        setTimeout(() => {
            setDialogue({
                speaker: 'Truth',
                text: truthForgeLine(useGameStore.getState().character, true),
                color: '#f97316',
            });
        }, 2400);
        setTimeout(() => unlockRoamMilestones(), 100);
    }, [equipWeapon, saveToCloud, showToast, unlockRoamMilestones]);

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
                    setTimeout(() => {
                        const now = useGameStore.getState().character;
                        const deep = truthDestClearLine(now, d.poiId);
                        if (deep) {
                            setDialogue({ speaker: 'Truth', text: deep, color: '#f97316' });
                        } else {
                            showToast(truthCombatLine(now, 'guardianWin'));
                        }
                    }, 2800);
                }
                const visitId = destinationVisitId(d.poiId);
                if (!ch.discovered.includes(visitId)) markDiscovered(visitId);
                setActiveDest(d);
                setTimeout(() => unlockRoamMilestones(), 100);
            }
            return null;
        });
    }, [markCleared, markDiscovered, saveToCloud, showToast, consumeFightBonusHp, unlockRoamMilestones]);

    const onDefeat = useCallback(() => {
        consumeFightBonusHp();
        setCombatDest(null);
        restVitality();
        setHutOpen(true); // wake at the Hut, fully restored
        showToast('✦ You fall — and wake in Truth\'s Hut, your vitality restored.');
    }, [consumeFightBonusHp, restVitality, showToast]);

    const handleSolve = useCallback((puzzleId: string) => {
        markSolved(puzzleId);
        saveToCloud();
        showToast('✦ The seal breaks — the relic is yours to claim');
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
    const maxHp = maxVitality(character, founderNumber);
    const curHp = currentVitality(character, founderNumber, maxHp);
    const combatStatProps = {
        bonusHp: combatBlessing.hp + cSkill.hp + cFounder.hp + cCloth.hp,
        startHp: curHp,
        onCombatEnd: (hp: number) => setHpStore(hp),
        bonusDamage: combatBlessing.damage + cSkill.damage + cFounder.damage + cCloth.damage + (character.fightBonusDamage ?? 0),
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
    const baseShades = shadeCountForTier(resTier);
    const roamingShades = effectiveShadeCount(baseShades, worldEvent);
    const nextMilestone = nextRoamMilestoneHint(character);
    const questWaypoint = activeQuestWaypoint(character);
    // persistent "go here next" — quests are off, so fall back to a focus
    // waypoint (forge at the Hut, then the next destination) so roaming always
    // has a direction instead of the 5s intro hint being the only cue.
    const objectiveWaypoint = QUESTS_ENABLED ? questWaypoint : focusWaypoint(character);
    const hutQuests = questsAvailable('hut', character);

    // freeze the roaming world whenever any overlay/scene is on top of it
    const worldPaused = !worldIntroDone || !!combatIntroDest || hutOpen || satchelOpen || !!activeDest ||
        !!combatDest || !!encounter || !!questNpc || questLogOpen || forgeOpen || sourceOpen || !!dialogue ||
        journalOpen || settingsOpen || epilogueOpen || attunementOpen;

    // secondary HUD actions — inline on desktop, tucked into a menu on mobile so
    // the player's name + path always have room to breathe.
    const hudActions: { id: string; Icon: typeof BookOpen; label: string; onClick: () => void; badge?: number; color?: string }[] = [
        ...(QUESTS_ENABLED ? [{ id: 'missions', Icon: ScrollText, label: 'Missions', onClick: () => setQuestLogOpen(true) }] : []),
        { id: 'journal', Icon: BookOpen, label: 'Journal', onClick: () => setJournalOpen(true) },
        { id: 'attune', Icon: Sparkles, label: 'Attune', onClick: () => setAttunementOpen(true), badge: character.skillPoints > 0 ? character.skillPoints : undefined, color: path?.color },
        { id: 'settings', Icon: SlidersHorizontal, label: 'Settings', onClick: () => setSettingsOpen(true) },
    ];

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
                shadeCount={roamingShades}
                shadeAggroMult={worldEvent.aggroMult}
                paused={worldPaused}
                resonanceTier={resTier}
                showQuestTrail={settings.showQuestTrail}
                questWaypoint={objectiveWaypoint}
                onInteract={onInteract}
                onEncounter={onEncounter}
                onPickup={onPickup}
                onPositionUpdate={onPositionUpdate}
                onTruthLine={onTruthLine}
                fellowSouls={worldPresence.fellows}
                hideControls={!!dialogue && !isDesktop}
            />

            {/* readability scrims so the HUD + controls read against bright grass */}
            <div className="absolute top-0 inset-x-0 h-28 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }} />
            <div className="absolute bottom-0 inset-x-0 h-44 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }} />

            {/* HUD — compact on mobile, full-width desktop bar with larger targets */}
            <div className="absolute top-0 inset-x-0 mx-auto w-full max-w-[540px] lg:max-w-none flex items-center justify-between gap-2 px-4 lg:px-8 pointer-events-none" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
                <div className="flex items-center gap-1.5 lg:gap-2">
                    {/* mobile: a single collapsible menu (Return + all actions) */}
                    <div className="relative lg:hidden">
                        <button onClick={() => setMenuOpen((v) => !v)} className={`pointer-events-auto p-2.5 rounded-full border backdrop-blur-sm min-w-[44px] min-h-[44px] flex items-center justify-center relative transition-colors ${menuOpen ? 'bg-aether-gold/20 border-aether-gold/40 text-aether-gold' : 'bg-black/45 border-white/10 text-zinc-300'}`} title="Menu" aria-label="Menu">
                            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                            {!menuOpen && character.skillPoints > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-aether-gold text-[8px] font-black text-black flex items-center justify-center">{character.skillPoints}</span>
                            )}
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-[18] pointer-events-auto" onClick={() => setMenuOpen(false)} />
                                <div className="absolute left-0 top-full mt-2 z-[19] w-48 rounded-2xl bg-black/85 border border-white/10 backdrop-blur-md p-1.5 pointer-events-auto flex flex-col gap-0.5 shadow-2xl">
                                    <Link href="/awakening/path" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:bg-white/10">
                                        <ArrowLeft className="w-4 h-4 shrink-0" />
                                        <span className="text-[11px] uppercase tracking-widest font-bold flex-1">Return</span>
                                    </Link>
                                    <div className="h-px bg-white/10 my-0.5" />
                                    {hudActions.map((a) => (
                                        <button key={a.id} onClick={() => { a.onClick(); setMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-200 hover:bg-white/10 text-left" style={a.color ? { color: a.color } : undefined}>
                                            <a.Icon className="w-4 h-4 shrink-0" />
                                            <span className="text-[11px] uppercase tracking-widest font-bold flex-1">{a.label}</span>
                                            {a.badge !== undefined && <span className="w-4 h-4 rounded-full bg-aether-gold text-[8px] font-black text-black flex items-center justify-center">{a.badge}</span>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* desktop: back + inline buttons (room exists) */}
                    <Link href="/awakening/path" className="hidden lg:flex pointer-events-auto p-3 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-300 hover:text-white min-w-[44px] min-h-[44px] items-center justify-center" title="Return">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="hidden lg:flex items-center gap-2">
                        {hudActions.map((a) => (
                            <button key={a.id} onClick={a.onClick} className="pointer-events-auto px-4 py-2.5 rounded-full bg-black/45 border border-white/10 backdrop-blur-sm text-zinc-300 hover:text-aether-gold relative min-h-[44px] flex items-center gap-2" title={a.label} style={a.color ? { color: a.color } : undefined}>
                                <a.Icon className="w-4 h-4" />
                                <span className="text-[10px] uppercase tracking-widest">{a.label}</span>
                                {a.badge !== undefined && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-aether-gold text-[8px] font-black text-black flex items-center justify-center">{a.badge}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col items-stretch gap-1 px-3.5 py-1.5 rounded-2xl bg-black/45 border border-aether-gold/20 backdrop-blur-sm min-w-0 lg:px-5">
                    <div className="flex items-center gap-2 min-w-0 justify-center">
                        <FounderBadge founderNumber={founderNumber} size={18} />
                        <span className="font-ritual text-sm lg:text-base text-white truncate">{character.name || 'Soul'}</span>
                        {path && (
                            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: path.color }}>· {path.name}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Heart className="w-2.5 h-2.5 shrink-0 text-red-400" />
                        <div className="flex-1 h-1 min-w-[60px] rounded-full bg-black/50 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, (curHp / maxHp) * 100)}%`, background: curHp > maxHp * 0.35 ? '#34d399' : curHp > maxHp * 0.15 ? '#fbbf24' : '#ef4444' }} />
                        </div>
                        <span className="text-[7px] font-mono tabular-nums text-zinc-400 shrink-0">{curHp}/{maxHp}</span>
                    </div>
                </div>
                <button
                    onClick={() => setSatchelOpen(true)}
                    className="pointer-events-auto flex items-center gap-1.5 px-3.5 lg:px-5 py-2.5 rounded-full bg-black/45 border border-aether-gold/20 backdrop-blur-sm hover:border-aether-gold/40 min-h-[44px]"
                >
                    <Backpack className="w-4 h-4 text-aether-gold" />
                    <span className="text-xs lg:text-sm font-black text-aether-gold">{character.inventory.length}</span>
                    <span className="hidden lg:inline text-[10px] uppercase tracking-widest text-aether-gold/80">Satchel</span>
                </button>
            </div>

            {settings.showMinimap && worldIntroDone && !worldPaused && (
                <div className="absolute right-4 lg:right-8 z-10 pointer-events-none" style={{ top: 'calc(4.5rem + env(safe-area-inset-top))' }}>
                    <Minimap
                        playerX={playerPos.x}
                        playerY={playerPos.y}
                        character={character}
                        questWaypoint={settings.showQuestTrail ? objectiveWaypoint : null}
                        hutAlert={hutAlert}
                    />
                </div>
            )}

            {tutorial && worldIntroDone && !worldPaused && (
                <TutorialOverlay id={tutorial} onDismiss={() => dismissTutorial(tutorial)} onNeverShow={dismissAllTutorials} />
            )}

            {worldIntroDone && !worldPaused && (
                <div
                    className={`absolute inset-x-2 lg:left-1/2 lg:inset-x-auto lg:-translate-x-1/2 z-[9] pointer-events-none flex flex-col items-center gap-1.5 transition-opacity duration-1000 ${topBannersUp ? 'opacity-100' : 'opacity-0'} ${settings.showMinimap ? 'pr-28 lg:pr-0' : ''}`}
                    style={{ top: 'calc(5.75rem + env(safe-area-inset-top))' }}
                >
                    <WorldEventBanner event={worldEvent} />
                    <WorldPresenceBanner
                        walkedToday={worldPresence.walkedToday}
                        fellowCount={worldPresence.fellows.length}
                    />
                    {objectiveWaypoint && !hasAllRelics(character.inventory) && (
                        <div className="px-3 py-1 rounded-full bg-black/50 border border-aether-gold/25 backdrop-blur-sm">
                            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-aether-gold/90">◆ {objectiveWaypoint.title}</span>
                        </div>
                    )}
                </div>
            )}

            {hint && (
                <div className="absolute left-1/2 top-[60%] -translate-x-1/2 pointer-events-none text-center">
                    <p className="px-4 py-1.5 rounded-full bg-black/35 border border-white/10 backdrop-blur-sm text-[10px] uppercase tracking-[0.3em] text-white/60 animate-pulse whitespace-nowrap">drag to roam · start at Truth&apos;s Hut</p>
                    {nextMilestone && (
                        <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-zinc-500/90 max-w-[16rem] mx-auto leading-snug">
                            Next road · {nextMilestone.title}
                        </p>
                    )}
                </div>
            )}

            {toast && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 z-[25] px-4 py-2 rounded-2xl sm:rounded-full bg-black/75 border border-aether-gold/30 text-[11px] text-aether-gold font-mono tracking-wide pointer-events-none text-center max-w-[min(92vw,28rem)] leading-snug"
                    style={{ top: 'calc(4.25rem + env(safe-area-inset-top))' }}
                >
                    {toast}
                </div>
            )}

            {/* ambient Truth — non-blocking bubble above the controls; the world
                keeps running and the joystick stays under your thumb */}
            {ambient && worldIntroDone && !worldPaused && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 z-[15] pointer-events-none w-full max-w-[min(88vw,30rem)] px-4"
                    style={{ bottom: 'calc(8.5rem + env(safe-area-inset-bottom))' }}
                >
                    <div className="rounded-2xl bg-black/72 border backdrop-blur-sm px-4 py-2.5" style={{ borderColor: `${ambient.color || '#f97316'}40` }}>
                        <p className="text-[8px] font-black uppercase tracking-[0.32em] mb-0.5" style={{ color: ambient.color || '#f97316' }}>Truth</p>
                        <p className="text-[12px] text-white/90 leading-snug">{ambient.text}</p>
                    </div>
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

            {dialogue && (
                <WorldDialogueBox
                    speaker={dialogue.speaker}
                    text={dialogue.text}
                    color={dialogue.color}
                    onClose={() => setDialogue(null)}
                    controlsHidden={!isDesktop}
                />
            )}

            {/* Truth's Hut — live daily dispatch */}
            {hutOpen && (
                <HutInterior
                    character={character}
                    bulletins={bulletins}
                    media={media}
                    isArchitect={isArchitect}
                    worldEvent={worldEvent}
                    onClose={() => { setHutOpen(false); setHutInitial(null); }}
                    onOpenForge={() => setForgeOpen(true)}
                    onToast={showToast}
                    initialStation={hutInitial ?? undefined}
                />
            )}

            {/* satchel of relics */}
            {satchelOpen && (
                <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setSatchelOpen(false)}>
                    <div
                        className="w-full max-w-md rounded-[1.75rem] p-6 pt-11 max-h-[82dvh] overflow-y-auto custom-scrollbar relative"
                        style={{ background: 'linear-gradient(165deg,#5a3d22 0%,#3f2a16 55%,#2b1d0f 100%)', boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.35), inset 0 0 0 4px rgba(214,160,90,0.22), 0 22px 55px rgba(0,0,0,0.65)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* leather flap, buckle & stitching — this is a satchel */}
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-9 rounded-t-[1.75rem]" style={{ background: 'linear-gradient(180deg,#6b4a28,#4a3119)', boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.22), 0 3px 7px rgba(0,0,0,0.4)' }} />
                        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ top: '1.55rem', width: '2.2rem', height: '0.95rem', background: 'linear-gradient(180deg,#f3cf8a,#b9852f)', border: '1px solid rgba(80,50,15,0.7)', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />
                        <div className="pointer-events-none absolute inset-[6px] rounded-[1.5rem] border border-dashed border-amber-200/20" />
                        <button onClick={() => setSatchelOpen(false)} className="absolute top-2.5 right-3 z-10 p-2 rounded-full bg-black/30 border border-amber-200/20 text-amber-100/70 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-amber-200/70 mb-1">Inventory</p>
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

                        {(() => {
                            const stocked = Object.keys(character.consumables || {}).filter((id) => consumableStock(character, id) > 0);
                            if (!stocked.length) return null;
                            return (
                                <div className="mb-5">
                                    <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-400/80 mb-2 flex items-center gap-1.5">
                                        <FlaskConical className="w-3 h-3" /> Road tonics
                                    </p>
                                    <div className="space-y-2">
                                        {stocked.map((id) => {
                                            const def = CONSUMABLE_BY_ID[id];
                                            if (!def) return null;
                                            const qty = consumableStock(character, id);
                                            return (
                                                <div key={id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border" style={{ borderColor: `${def.accent}44`, background: `${def.accent}14` }}>
                                                        <FlaskConical className="w-4 h-4" style={{ color: def.accent }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white">{def.name}</p>
                                                        <p className="text-[9px] text-zinc-500">×{qty} · {formatConsumableEffect(def.effect)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (useConsumable(id)) {
                                                                saveToCloud();
                                                                showToast(`✦ ${def.name} taken · ${formatConsumableEffect(def.effect)} for next fight`);
                                                            }
                                                        }}
                                                        className="shrink-0 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-black"
                                                        style={{ background: 'linear-gradient(135deg,#6ee7b7 0%,#059669 100%)' }}
                                                    >
                                                        Drink
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {(character.fightBonusHp > 0 || (character.fightBonusDamage ?? 0) > 0) && (
                                        <p className="text-[9px] text-emerald-400/80 mt-2 leading-relaxed">
                                            Active for next fight
                                            {character.fightBonusHp > 0 ? ` · +${character.fightBonusHp} vitality` : ''}
                                            {(character.fightBonusDamage ?? 0) > 0 ? ` · +${character.fightBonusDamage} might` : ''}
                                        </p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* the goal — gather all five relics to open the way to the Source */}
                        {(() => {
                            // Near-term goal tracks relics from the ages that are OPEN; the
                            // full 5-relic Source gate still needs every age (some sealed).
                            const openRelicIds = Object.values(DEST_BY_POI)
                                .filter((d) => !isDestinationSealed(d.poiId))
                                .flatMap((d) => d.relics.map((r) => r.id));
                            const openTotal = openRelicIds.length;
                            const got = openRelicIds.filter((id) => character.inventory.includes(id)).length;
                            const grandTotal = ALL_RELIC_IDS.length;
                            const moreComing = openTotal < grandTotal;
                            const done = got >= grandTotal;
                            const pct = openTotal > 0 ? (got / openTotal) * 100 : 0;
                            const msg = done
                                ? 'The five relics burn as one. The way to the Source is open.'
                                : moreComing && got >= openTotal
                                    ? 'You hold every relic of the open ages. More will unveil on the road ahead.'
                                    : moreComing
                                        ? 'Gather the relics of the ages now open. More will unveil as you walk.'
                                        : 'Gather all five relics — one from each destination — to open the way back to the Source.';
                            return (
                                <div className="mb-5 rounded-2xl border p-4" style={{ borderColor: done ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.1)', background: done ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] uppercase tracking-[0.3em] text-aether-gold/80">Path to the Source</p>
                                        <p className="text-[10px] font-black tracking-widest text-aether-gold">{got} / {openTotal}{moreComing ? ` · ${grandTotal} in all` : ''}</p>
                                    </div>
                                    <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#fcd34d,#b45309)' }} />
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">{msg}</p>
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
            {QUESTS_ENABLED && questNpc && (
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
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <h3 className="font-ritual text-lg text-white">{q.title}</h3>
                                            {q.missionStep != null && q.missionTotal != null && (
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-aether-gold/30 text-aether-gold/90 shrink-0">
                                                    Mission {q.missionStep} / {q.missionTotal}
                                                    {q.missionPhase === 'boss' ? ' · Boss' : q.missionPhase === 'relic' ? ' · Relic' : ''}
                                                </span>
                                            )}
                                        </div>
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
            {QUESTS_ENABLED && questLogOpen && (
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
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-white break-words">{q.title}</h3>
                                                {q.missionStep != null && q.missionTotal != null && (
                                                    <p className="text-[8px] uppercase tracking-[0.18em] text-zinc-500 mt-0.5">
                                                        {q.giverName} · Mission {q.missionStep}/{q.missionTotal}
                                                    </p>
                                                )}
                                            </div>
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
                    exploreBgm={combatDest.poiId === 'dest_eden' ? 'eden_garden' : 'world_cavern'}
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
                    exploreBgm="world_cavern"
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
