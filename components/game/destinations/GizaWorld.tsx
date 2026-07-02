'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { wornAvatar } from '@/lib/game/avatar';
import { Volume2, VolumeX, ArrowLeft, Key, Heart, Compass } from 'lucide-react';
import { sfx, isMuted, setMuted } from '@/lib/game/sfx';
import { gameMusic } from '@/lib/game/music';
import MiniWorldInsight from '@/components/game/MiniWorldInsight';
import CombatScene from '@/components/game/CombatScene';
import { skillBonuses } from '@/lib/game/paths';
import { pathCombatMods } from '@/lib/game/pathPowers';
import { combatRelicBonuses } from '@/lib/game/resonance';
import { founderBonuses } from '@/lib/game/founders';
import { clothingBonus } from '@/lib/game/clothing';
import { WEAPON_BY_ID } from '@/lib/game/weapons';
import DestinationControlPad from '@/components/game/controls/DestinationControlPad';
import { useInputProfile } from '@/components/game/controls/useInputProfile';
import { useJoystick } from '@/components/game/controls/useJoystick';
import { joyRadius, MOBILE_JOY_R } from '@/lib/game/controls';
import { loadSettings } from '@/lib/game/settings';
import DestinationMinimap from '@/components/game/DestinationMinimap';
import {
    exploredChunksFromDiscovered,
    initialRevealChunks,
    mapRevealKey,
    newRevealDiscoveries,
} from '@/lib/game/mapReveal';
import {
    GIZA_MAP_W, GIZA_MAP_H, GIZA_TILE, GIZA_TILES, GIZA_SPAWN, GIZA_RELIC, GIZA_SLAB,
    GIZA_VIEW_TILES, GIZA_CRYSTALS, GIZA_ILLUSION_WALL, GIZA_TEMPTATION, GIZA_TEMPTATION_DROP,
    hydrateGizaState, isGizaSolid, updateGizaProgress, gizaDestinationStub,
    gizaZoneLabel, gizaDiscoveriesFromState, gizaWingId, canRevealGizaSecret, canSeeGizaHiddenLore,
    gizaGuideStep, GIZA_KEEPER_LINES, GIZA_RESPAWN_LINE, GIZA_WHISPER_LINES, GIZA_HINT_DELAYS_SEC,
    GIZA_MINIMAP_TERRAIN_COLORS, gizaMinimapTerrain, gizaMinimapGates, gizaMinimapPois,
    type GizaLevelState,
} from '@/lib/game/gizaLevel';

const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const MAX_DUNGEON_HP = 100;

interface Props {
    character: GameCharacter;
    isSolved: boolean;
    minigameDone?: boolean;
    isGuardianCleared: boolean;
    onSolve: () => void;
    onClaim: () => void;
    onExit: () => void;
    onGuardianCleared: () => void;
    onDiscover: (ids: string[]) => void;
    puzzleId?: string;
    puzzleHint?: string;
    accent?: string;
}

export default function GizaWorld({
    character, isSolved, minigameDone = true, isGuardianCleared,
    onSolve, onClaim, onExit, onGuardianCleared, onDiscover, puzzleId, puzzleHint, accent = '#22d3ee',
}: Props) {
    const founderNumber = useGameStore((s) => s.founderNumber);
    const addMaterial = useGameStore((s) => s.addMaterial);
    const consumeFightBonusHp = useGameStore((s) => s.consumeFightBonusHp);
    const grantSkillPoint = useCallback(() => {
        useGameStore.setState((s) => ({
            character: { ...s.character, skillPoints: s.character.skillPoints + 1 },
        }));
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const [muted, setMutedState] = useState(isMuted());
    const [dungeonHp, setDungeonHp] = useState(MAX_DUNGEON_HP);
    const [level, setLevel] = useState<GizaLevelState>(() => {
        const h = hydrateGizaState(character);
        return h;
    });
    const [zoneLabel, setZoneLabel] = useState('The Descent');
    const [nearLore, setNearLore] = useState<string | null>(null);
    const [nearCrystal, setNearCrystal] = useState<number | null>(null);
    const [nearTemptation, setNearTemptation] = useState(false);
    const [crystalSeq, setCrystalSeq] = useState<number[]>(() => {
        const h = hydrateGizaState(character);
        return h.slabOpen || isSolved ? [0, 1, 2] : [];
    });
    const [crystalActive, setCrystalActive] = useState<boolean[]>(() => {
        const h = hydrateGizaState(character);
        return h.slabOpen || isSolved ? [true, true, true] : [false, false, false];
    });
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_giza_shard'));
    const [activeFight, setActiveFight] = useState<string | null>(null);
    const [dialogue, setDialogue] = useState(
        isGuardianCleared
            ? 'The Sentinel has fallen. Attune the three crystals — Low, Mid, High — and claim the Shard.'
            : '【Khaemwaset】 Welcome to the descent. Dark granite is wall — sandstone is road. Read the cyan ◆ beside you, then follow the compass.',
    );
    const [hintTier, setHintTier] = useState(0);
    const [showTrail, setShowTrail] = useState(false);
    const [playerPos, setPlayerPos] = useState({
        x: GIZA_SPAWN.gx * GIZA_TILE + 8,
        y: GIZA_SPAWN.gy * GIZA_TILE + 8,
    });
    const [exploredVersion, setExploredVersion] = useState(0);
    const exploredRef = useRef(exploredChunksFromDiscovered(character.discovered, 'giza'));
    const mapSyncRef = useRef({ lastAt: 0 });

    const profile = useInputProfile();
    const joyR = joyRadius(profile, loadSettings().controlSize === 'large') || MOBILE_JOY_R;
    const joy = useJoystick(joyR);
    const joyRef = joy.joyRef;
    const keysRef = useRef<Set<string>>(new Set());
    const attackRef = useRef(false);
    const fightTriggeredRef = useRef<string | null>(null);
    const fightBonusRef = useRef(0);
    const touchedRef = useRef(new Set<string>());
    const wingsSeenRef = useRef(new Set(character.discovered.filter((d) => d.startsWith('giza_wing_'))));
    const lastWingRef = useRef<string | null>(null);
    const temptOfferShownRef = useRef(false);
    const guideStepIdRef = useRef('');
    const stuckSinceRef = useRef(Date.now());
    const hintTierRef = useRef(0);
    const fightWarnRef = useRef<Record<string, number>>({});
    const dialoguePriorityRef = useRef(0);
    const swingTRef = useRef(0);

    const slabOpen = level.slabOpen || isSolved;

    const gizaTerrain = useMemo(() => gizaMinimapTerrain(), []);
    const minimapPois = useMemo(() => gizaMinimapPois(level, {
        secretVisible: canRevealGizaSecret(level, character) || canSeeGizaHiddenLore(level, character),
        relicClaimed,
        crystalsLit: crystalSeq,
    }), [level, character, relicClaimed, crystalSeq]);
    const minimapGates = useMemo(() => gizaMinimapGates(level), [level]);
    const showMinimap = loadSettings().showMinimap;

    useEffect(() => {
        const explored = exploredChunksFromDiscovered(character.discovered, 'giza');
        const toDiscover: string[] = [];
        for (const ch of initialRevealChunks(GIZA_SPAWN.gx, GIZA_SPAWN.gy, GIZA_MAP_W, GIZA_MAP_H)) {
            if (!explored.has(ch)) {
                explored.add(ch);
                const [cx, cy] = ch.split('_').map(Number);
                toDiscover.push(mapRevealKey('giza', cx, cy));
            }
        }
        exploredRef.current = explored;
        if (toDiscover.length) onDiscover(toDiscover);
        setExploredVersion((v) => v + 1);
    }, [character.discovered, onDiscover]);

    const guideStep = useMemo(() => gizaGuideStep(level, {
        isGuardianCleared,
        isSolved,
        minigameDone,
        relicClaimed,
        hasWeapon: !!character.equipped.weapon,
        crystalsLit: crystalSeq.length,
        slabOpen,
    }), [level, isGuardianCleared, isSolved, minigameDone, relicClaimed, character.equipped.weapon, crystalSeq.length, slabOpen]);

    const setGuideDialogue = useCallback((text: string, priority = 1) => {
        if (priority >= dialoguePriorityRef.current) {
            dialoguePriorityRef.current = priority;
            setDialogue(text);
        }
    }, []);

    useEffect(() => {
        if (guideStep.id !== guideStepIdRef.current) {
            guideStepIdRef.current = guideStep.id;
            stuckSinceRef.current = Date.now();
            hintTierRef.current = 0;
            setHintTier(0);
            setShowTrail(false);
            dialoguePriorityRef.current = 0;
        }
        const trailTimer = window.setTimeout(() => setShowTrail(true), 8000);
        return () => window.clearTimeout(trailTimer);
    }, [guideStep.id]);

    useEffect(() => {
        if (activeFight) return;
        const tick = window.setInterval(() => {
            const elapsed = (Date.now() - stuckSinceRef.current) / 1000;
            let tier = 0;
            for (let i = GIZA_HINT_DELAYS_SEC.length - 1; i >= 0; i--) {
                if (elapsed >= GIZA_HINT_DELAYS_SEC[i]) { tier = i + 1; break; }
            }
            if (tier !== hintTierRef.current) {
                hintTierRef.current = tier;
                setHintTier(tier);
                if (tier > 0) {
                    setShowTrail(true);
                    setGuideDialogue(guideStep.timedHints[tier - 1], 2);
                }
            }
        }, 1500);
        return () => window.clearInterval(tick);
    }, [activeFight, guideStep, setGuideDialogue]);

    const gameState = useRef({
        pax: GIZA_SPAWN.gx * GIZA_TILE + 8,
        pay: GIZA_SPAWN.gy * GIZA_TILE + 8,
        facing: 'up' as 'down' | 'up' | 'left' | 'right',
        walkT: 0,
        t: 0,
    });

    const wpn = WEAPON_BY_ID[character.equipped.weapon || 'wood_staff'] || WEAPON_BY_ID['wood_staff'];
    const combatStatProps = useMemo(() => {
        const cSkill = skillBonuses(character.skills);
        const cFounder = founderBonuses(founderNumber);
        const cCloth = clothingBonus(character.equipped.clothing);
        const combatBlessing = combatRelicBonuses(character.inventory, character.equipped.relic);
        const pathMods = pathCombatMods(character.path, character.skills);
        return {
            bonusHp: combatBlessing.hp + cSkill.hp + cFounder.hp + cCloth.hp,
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
    }, [character, founderNumber]);

    const toggleMute = () => { const m = !muted; setMuted(m); setMutedState(m); };

    const softRespawn = useCallback(() => {
        const st = gameState.current;
        st.pax = GIZA_SPAWN.gx * GIZA_TILE + 8;
        st.pay = GIZA_SPAWN.gy * GIZA_TILE + 8;
        setDungeonHp(50);
        setGuideDialogue(`【Khaemwaset】 ${GIZA_RESPAWN_LINE}`, 3);
        sfx.defeat();
    }, [setGuideDialogue]);

    const resetCrystalSeq = useCallback(() => {
        setCrystalSeq([]);
        setCrystalActive([false, false, false]);
        setDialogue('The resonance breaks. Strike the crystals from Low → Mid → High.');
        sfx.defeat();
    }, []);

    const acceptTemptation = useCallback(() => {
        if (level.temptationResolved !== 'none') return;
        const st = gameState.current;
        st.pax = GIZA_TEMPTATION_DROP.gx * GIZA_TILE + 8;
        st.pay = GIZA_TEMPTATION_DROP.gy * GIZA_TILE + 8;
        setLevel((prev) => {
            const next = { ...prev, temptationResolved: 'accepted' as const };
            onDiscover(gizaDiscoveriesFromState(next));
            return next;
        });
        setNearTemptation(false);
        setDialogue(GIZA_WHISPER_LINES.accepted);
        setDungeonHp((hp) => {
            const next = hp - 22;
            if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
            return next;
        });
        const temptFight = level.fights.find((f) => f.combatId === 'giza_temptation');
        if (temptFight && !temptFight.cleared && character.equipped.weapon) {
            fightTriggeredRef.current = temptFight.id;
            fightBonusRef.current = consumeFightBonusHp();
            setActiveFight('giza_temptation');
        }
        sfx.hit();
    }, [level.temptationResolved, level.fights, character.equipped.weapon, onDiscover, consumeFightBonusHp, softRespawn]);

    const resistTemptation = useCallback(() => {
        if (level.temptationResolved !== 'none') return;
        setLevel((prev) => {
            const next = { ...prev, temptationResolved: 'resisted' as const };
            onDiscover(gizaDiscoveriesFromState(next));
            return next;
        });
        setNearTemptation(false);
        setDialogue(GIZA_WHISPER_LINES.resisted);
        sfx.strike();
    }, [level.temptationResolved, onDiscover]);

    const markFightCleared = useCallback((fightId: string, combatId: string) => {
        setLevel((prev) => {
            const next = updateGizaProgress({
                ...prev,
                fights: prev.fights.map((f) => (f.id === fightId ? { ...f, cleared: true } : f)),
            });
            onDiscover(gizaDiscoveriesFromState(next));
            if (combatId === 'giza_boss') onGuardianCleared();
            return next;
        });
        fightTriggeredRef.current = null;
        setActiveFight(null);
        setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + 20));
    }, [onGuardianCleared, onDiscover]);

    const readLoreStone = useCallback((stoneId: string) => {
        const stone = level.loreStones.find((s) => s.id === stoneId);
        if (!stone || stone.read) return;
        if (stone.hidden && !canSeeGizaHiddenLore(level, charRef.current)) return;
        setLevel((prev) => {
            const next = {
                ...prev,
                loreStones: prev.loreStones.map((s) => (s.id === stoneId ? { ...s, read: true } : s)),
            };
            onDiscover(gizaDiscoveriesFromState(next));
            return next;
        });
        setDialogue(`【${stone.title}】 ${stone.text}`);
        sfx.hit();
    }, [level, onDiscover]);

    const strikeCrystal = useCallback((crystalId: number) => {
        if (!level.chamberOpen) {
            setDialogue('The crystals will not resonate until the Sentinel of Stone has fallen.');
            return;
        }
        if (!minigameDone) {
            setDialogue('Pass the Serpent Path trial in Records before the crystals will answer.');
            return;
        }
        const expected = [0, 1, 2];
        const nextSeq = [...crystalSeq, crystalId];
        const correct = nextSeq.every((v, i) => v === expected[i]);
        if (!correct) {
            setTimeout(() => resetCrystalSeq(), 150);
            return;
        }
        sfx.strike();
        setCrystalActive((prev) => {
            const n = [...prev];
            n[crystalId] = true;
            return n;
        });
        setCrystalSeq(nextSeq);
        const c = GIZA_CRYSTALS[crystalId];
        setDialogue(`Resonance stone struck: ${c.name}`);
        if (nextSeq.length === 3) {
            setLevel((prev) => {
                const next = { ...prev, slabOpen: true };
                onDiscover(gizaDiscoveriesFromState(next));
                return next;
            });
            onSolve();
            setDialogue('The three crystals resonate in perfect harmony! The granite slab slides back — the Shard awaits.');
            sfx.victory();
            gameMusic.playCue('rivers_converge');
        }
    }, [level.chamberOpen, minigameDone, crystalSeq, resetCrystalSeq, onDiscover, onSolve]);

    const isSolid = useCallback((gx: number, gy: number) => {
        return isGizaSolid(gx, gy, { ...level, slabOpen });
    }, [level, slabOpen]);

    useEffect(() => {
        if (activeFight) {
            gameMusic.crossfadeBgm('combat_skirmish', 700, gameMusic.pickVariant('combat_skirmish'));
        } else {
            gameMusic.crossfadeBgm('world_cavern', 1200, gameMusic.pickVariant('world_cavern'));
        }
    }, [activeFight]);

    useEffect(() => {
        const kd = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
    }, []);

    useEffect(() => {
        if (activeFight) return;
        const canvas = canvasRef.current!;
        let ctx = canvas.getContext('2d')!;
        const charImg = new Image();
        charImg.src = CHAR_SHEET;
        const DIRS = ['down', 'up', 'left', 'right'] as const;
        type Dir = typeof DIRS[number];
        const buildFrames = (cfg: GameCharacter['avatar']) => {
            const m = {} as Record<Dir, HTMLCanvasElement[]>;
            for (const d of DIRS) m[d] = [avatarOffscreen(cfg, 0, d), avatarOffscreen(cfg, 1, d), avatarOffscreen(cfg, 2, d)];
            return m;
        };
        let avatarFrames = buildFrames(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
        let avatarKey = JSON.stringify(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
        const state = gameState.current;
        let raf = 0;
        let last = performance.now();
        let running = true;
        let Z = 2.5;

        const dustMotes: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
        for (let i = 0; i < 24; i++) {
            dustMotes.push({
                x: Math.random() * GIZA_MAP_W * GIZA_TILE,
                y: Math.random() * GIZA_MAP_H * GIZA_TILE,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: 0.5 + Math.random(),
                alpha: 0.12 + Math.random() * 0.3,
            });
        }

        function resize() {
            if (!canvas.parentElement) return;
            const size = Math.min(canvas.parentElement.clientWidth || 400, 520);
            canvas.width = size;
            canvas.height = size;
            Z = size / (GIZA_VIEW_TILES * GIZA_TILE);
            ctx.imageSmoothingEnabled = false;
        }
        resize();
        window.addEventListener('resize', resize);

        const loop = (now: number) => {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            state.t = now;

            let ix = joyRef.current.x, iy = joyRef.current.y;
            const k = keysRef.current;
            if (k.has('arrowleft') || k.has('a')) ix = -1;
            if (k.has('arrowright') || k.has('d')) ix = 1;
            if (k.has('arrowup') || k.has('w')) iy = -1;
            if (k.has('arrowdown') || k.has('s')) iy = 1;
            const mag = Math.hypot(ix, iy);
            if (mag > 1) { ix /= mag; iy /= mag; }
            const moving = Math.hypot(ix, iy) > 0.15;

            if (moving) {
                state.walkT += dt;
                state.facing = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');
                const nx = state.pax + ix * 76 * dt;
                const ngx = Math.floor(nx / GIZA_TILE);
                if (!isSolid(ngx, Math.floor(state.pay / GIZA_TILE))) state.pax = nx;
                const ny = state.pay + iy * 76 * dt;
                const ngy = Math.floor(ny / GIZA_TILE);
                if (!isSolid(Math.floor(state.pax / GIZA_TILE), ngy)) state.pay = ny;
            }

            const pgx = Math.floor(state.pax / GIZA_TILE);
            const pgy = Math.floor(state.pay / GIZA_TILE);

            if (now - mapSyncRef.current.lastAt > 80) {
                mapSyncRef.current.lastAt = now;
                const added = newRevealDiscoveries('giza', pgx, pgy, exploredRef.current, GIZA_MAP_W, GIZA_MAP_H);
                if (added.length) {
                    onDiscover(added);
                    setExploredVersion((v) => v + 1);
                }
                setPlayerPos({ x: state.pax, y: state.pay });
            }

            const zl = gizaZoneLabel(pgx, pgy);
            if (zl) setZoneLabel(zl);

            const wingId = gizaWingId(pgx, pgy);
            if (wingId && wingId !== lastWingRef.current) {
                lastWingRef.current = wingId;
                const discId = `giza_${wingId}`;
                if (!wingsSeenRef.current.has(discId)) {
                    wingsSeenRef.current.add(discId);
                    onDiscover([discId]);
                    setDialogue(`【Khaemwaset】 ${GIZA_KEEPER_LINES[wingId]}`);
                }
            }

            // illusion wall passage
            if (!level.illusionPassed && pgx === GIZA_ILLUSION_WALL.gx && pgy === GIZA_ILLUSION_WALL.gy) {
                setLevel((prev) => {
                    const next = { ...prev, illusionPassed: true };
                    onDiscover(gizaDiscoveriesFromState(next));
                    return next;
                });
                state.pax = GIZA_ILLUSION_WALL.gx * GIZA_TILE + 8;
                state.pay = (GIZA_ILLUSION_WALL.gy - 1) * GIZA_TILE + 8;
                setDialogue('You pass through crumbling limestone and enter the Orion vault — a brass astrolabe still marks the belt of stars.');
                sfx.hit();
            }

            const temptNear = level.temptationResolved === 'none'
                && Math.hypot(GIZA_TEMPTATION.gx * GIZA_TILE + 8 - state.pax, GIZA_TEMPTATION.gy * GIZA_TILE + 8 - state.pay) < 20;
            if (temptNear !== nearTemptation) setNearTemptation(temptNear);
            if (temptNear && !temptOfferShownRef.current) {
                temptOfferShownRef.current = true;
                setDialogue(GIZA_WHISPER_LINES.offer);
            }
            if (!temptNear) temptOfferShownRef.current = false;

            let closestLore: string | null = null;
            let closestLoreD = Infinity;
            const hiddenLoreOk = canSeeGizaHiddenLore(level, charRef.current);
            for (const ls of level.loreStones) {
                if (ls.hidden && !hiddenLoreOk) continue;
                const d = Math.hypot(ls.gx * GIZA_TILE + 8 - state.pax, ls.gy * GIZA_TILE + 8 - state.pay);
                if (d < 22 && d < closestLoreD) { closestLoreD = d; closestLore = ls.id; }
            }
            if (closestLore !== nearLore) setNearLore(closestLore);

            let closestCrystal: number | null = null;
            let closestCrystalD = Infinity;
            for (const c of GIZA_CRYSTALS) {
                const d = Math.hypot(c.gx * GIZA_TILE + 8 - state.pax, c.gy * GIZA_TILE + 8 - state.pay);
                if (d < 22 && d < closestCrystalD) { closestCrystalD = d; closestCrystal = c.id; }
            }
            if (closestCrystal !== nearCrystal) setNearCrystal(closestCrystal);

            for (const pk of level.pickups) {
                if (pk.collected || touchedRef.current.has(pk.id)) continue;
                if (Math.hypot(pk.gx * GIZA_TILE + 8 - state.pax, pk.gy * GIZA_TILE + 8 - state.pay) < 14) {
                    touchedRef.current.add(pk.id);
                    setLevel((prev) => {
                        const next = { ...prev, pickups: prev.pickups.map((p) => (p.id === pk.id ? { ...p, collected: true } : p)) };
                        onDiscover(gizaDiscoveriesFromState(next));
                        return next;
                    });
                    setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + pk.amount));
                    sfx.pickup();
                    setDialogue(`Vitality restored · +${pk.amount}`);
                }
            }

            const secretVisible = canRevealGizaSecret(level, charRef.current);

            for (const ch of level.chests) {
                if (ch.opened || touchedRef.current.has(ch.id)) continue;
                if (ch.hidden && !secretVisible) continue;
                if (Math.hypot(ch.gx * GIZA_TILE + 8 - state.pax, ch.gy * GIZA_TILE + 8 - state.pay) < 18) {
                    touchedRef.current.add(ch.id);
                    setLevel((prev) => {
                        const next = updateGizaProgress({
                            ...prev,
                            chests: prev.chests.map((c) => (c.id === ch.id ? { ...c, opened: true } : c)),
                            keysFound: ch.keyId && !prev.keysFound.includes(ch.keyId) ? [...prev.keysFound, ch.keyId] : prev.keysFound,
                            doors: ch.keyId ? prev.doors.map((d) => (d.keyId === ch.keyId ? { ...d, open: true } : d)) : prev.doors,
                        });
                        onDiscover(gizaDiscoveriesFromState(next));
                        return next;
                    });
                    if (ch.id === 'chest_secret') {
                        onDiscover(['giza_lore_secret']);
                        grantSkillPoint();
                        setDialogue(`${ch.label} — +${ch.health} vitality and a skill point. Khaemwaset hid this for those who read every stone.`);
                    } else if (ch.keyId) setDialogue(`${ch.label} — you found the ${ch.keyId.replace('key_', '')} key.`);
                    else if (ch.health) setDialogue(`${ch.label} — +${ch.health} vitality.`);
                    if (ch.health) setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + ch.health!));
                    sfx.pickup();
                }
            }

            for (const d of level.doors) {
                if (d.open || !level.keysFound.includes(d.keyId) || touchedRef.current.has(`door_${d.id}`)) continue;
                if (Math.hypot(d.gx * GIZA_TILE + 8 - state.pax, d.gy * GIZA_TILE + 8 - state.pay) < 28) {
                    touchedRef.current.add(`door_${d.id}`);
                    setLevel((prev) => {
                        const next = updateGizaProgress({
                            ...prev,
                            doors: prev.doors.map((door) => (door.id === d.id ? { ...door, open: true } : door)),
                        });
                        onDiscover(gizaDiscoveriesFromState(next));
                        return next;
                    });
                    setDialogue('The sealed gate yields to your key.');
                    sfx.strike();
                }
            }

            for (const trap of level.traps) {
                if (trap.tripped || touchedRef.current.has(`trap_${trap.id}`)) continue;
                if (pgx === trap.gx && pgy === trap.gy) {
                    touchedRef.current.add(`trap_${trap.id}`);
                    setLevel((prev) => {
                        const next = { ...prev, traps: prev.traps.map((t) => (t.id === trap.id ? { ...t, tripped: true } : t)) };
                        onDiscover(gizaDiscoveriesFromState(next));
                        return next;
                    });
                    sfx.bossSpawn();
                    setDungeonHp((hp) => {
                        const next = hp - 8;
                        if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
                        return next;
                    });
                    setGuideDialogue('Click! A pressure plate still guards the hall. Step with care.', 2);
                }
            }

            if (!level.bossGateOpen) {
                const gateDist = Math.hypot(23.5 * GIZA_TILE - state.pax, 12 * GIZA_TILE - state.pay);
                if (gateDist < 36) {
                    setGuideDialogue('【Khaemwaset】 The sentinel gate opens after all three shade trials and the shaft & gallery keys.', 1);
                }
            }

            for (const fz of level.fights) {
                if (fz.cleared || fightTriggeredRef.current === fz.id || fz.radius <= 0) continue;
                const dist = Math.hypot(fz.gx * GIZA_TILE + 8 - state.pax, fz.gy * GIZA_TILE + 8 - state.pay);
                if (dist >= fz.radius + 8) { delete fightWarnRef.current[fz.id]; continue; }
                if (dist < fz.radius) {
                    if (!character.equipped.weapon) {
                        setGuideDialogue('Arm yourself at Truth\'s Hut before facing the shades.', 2);
                        break;
                    }
                    if (fz.combatId === 'giza_boss' && !level.bossGateOpen) {
                        setGuideDialogue('The sentinel gate is sealed. Clear all three trials and find the shaft and gallery keys.', 2);
                        break;
                    }
                    const warnedAt = fightWarnRef.current[fz.id];
                    if (!warnedAt) {
                        fightWarnRef.current[fz.id] = now;
                        setGuideDialogue(`${fz.hint} — the trial begins in a moment…`, 2);
                        break;
                    }
                    if (now - warnedAt < 2200) break;
                    fightTriggeredRef.current = fz.id;
                    fightBonusRef.current = consumeFightBonusHp();
                    setGuideDialogue(fz.hint, 3);
                    setActiveFight(fz.combatId);
                    delete fightWarnRef.current[fz.id];
                    break;
                }
            }

            if (swingTRef.current > 0) swingTRef.current -= dt;
            const forceSwing = attackRef.current || keysRef.current.has('j') || keysRef.current.has(' ');
            if (forceSwing && swingTRef.current <= 0) {
                swingTRef.current = 0.35;
                sfx.strike();
                for (const node of level.ironNodes) {
                    if (node.mined || touchedRef.current.has(`iron_${node.id}`)) continue;
                    if (Math.hypot(node.gx * GIZA_TILE + 8 - state.pax, node.gy * GIZA_TILE + 8 - state.pay) < 24) {
                        touchedRef.current.add(`iron_${node.id}`);
                        setLevel((prev) => {
                            const next = { ...prev, ironNodes: prev.ironNodes.map((n) => (n.id === node.id ? { ...n, mined: true } : n)) };
                            onDiscover(gizaDiscoveriesFromState(next));
                            return next;
                        });
                        addMaterial('iron', 1);
                        setDialogue('Clang! Raw iron ore — Hana can temper this at Truth\'s Forge.');
                        sfx.hit();
                    }
                }
                attackRef.current = false;
            }

            if (slabOpen && !relicClaimed) {
                const rx = GIZA_RELIC.gx * GIZA_TILE + 8;
                const ry = GIZA_RELIC.gy * GIZA_TILE + 8;
                if (Math.hypot(rx - state.pax, ry - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue('You claim the Shard of Casing Stone. It shines with polished white limestone brilliance.');
                    sfx.hit();
                    gameMusic.playSting('relic_claim', Math.random() < 0.4 ? 'alt' : 'main');
                }
            }

            // ---- render ----
            const camX = state.pax - (GIZA_VIEW_TILES * GIZA_TILE) / 2;
            const camY = state.pay - (GIZA_VIEW_TILES * GIZA_TILE) / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(Z, Z);
            ctx.translate(-camX + (canvas.width / Z - GIZA_VIEW_TILES * GIZA_TILE) / 2, -camY + (canvas.height / Z - GIZA_VIEW_TILES * GIZA_TILE) / 2);

            for (let r = 0; r < GIZA_MAP_H; r++) {
                for (let c = 0; c < GIZA_MAP_W; c++) {
                    const cell = GIZA_TILES[r][c];
                    if (cell === 1) ctx.fillStyle = '#1e1b4b';
                    else if (cell === 2) ctx.fillStyle = '#b45309';
                    else if (cell === 3) ctx.fillStyle = '#44403c';
                    else ctx.fillStyle = (c + r) % 2 === 0 ? '#451a03' : '#3c1502';
                    ctx.fillRect(c * GIZA_TILE, r * GIZA_TILE, GIZA_TILE, GIZA_TILE);
                }
            }

            for (const d of level.doors) {
                ctx.fillStyle = d.open ? '#22d3ee44' : '#78350f';
                ctx.fillRect(d.gx * GIZA_TILE, d.gy * GIZA_TILE, GIZA_TILE, GIZA_TILE);
                if (!d.open) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillRect(d.gx * GIZA_TILE + 5, d.gy * GIZA_TILE + 4, 6, 8);
                }
            }

            if (!slabOpen) {
                ctx.fillStyle = '#52525b';
                ctx.fillRect(GIZA_SLAB.gx * GIZA_TILE + 1, GIZA_SLAB.gy * GIZA_TILE + 1, 14, 14);
                ctx.fillStyle = '#71717a';
                ctx.fillRect(GIZA_SLAB.gx * GIZA_TILE + 3, GIZA_SLAB.gy * GIZA_TILE + 3, 10, 10);
            }

            if (!level.bossGateOpen) {
                ctx.fillStyle = 'rgba(251,191,36,0.35)';
                ctx.fillRect(23 * GIZA_TILE, 11 * GIZA_TILE, GIZA_TILE * 2, GIZA_TILE * 3);
            }

            if (!level.illusionPassed) {
                ctx.fillStyle = '#311001';
                ctx.fillRect(GIZA_ILLUSION_WALL.gx * GIZA_TILE, GIZA_ILLUSION_WALL.gy * GIZA_TILE, GIZA_TILE, GIZA_TILE);
            }

            for (const ls of level.loreStones) {
                if (ls.hidden && !hiddenLoreOk) continue;
                const pulse = 0.5 + Math.sin(state.t / 300 + ls.gx) * 0.2;
                ctx.fillStyle = ls.read ? 'rgba(34,211,238,0.35)' : `rgba(251,191,36,${pulse})`;
                ctx.fillRect(ls.gx * GIZA_TILE + 3, ls.gy * GIZA_TILE + 2, 10, 12);
                ctx.fillStyle = ls.read ? '#22d3ee' : '#fcd34d';
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('◆', ls.gx * GIZA_TILE + 8, ls.gy * GIZA_TILE + 11);
            }

            for (const ch of level.chests) {
                if (ch.opened || (ch.hidden && !secretVisible)) continue;
                ctx.fillStyle = '#92400e';
                ctx.fillRect(ch.gx * GIZA_TILE + 2, ch.gy * GIZA_TILE + 4, 12, 10);
                ctx.fillStyle = '#fcd34d';
                ctx.fillRect(ch.gx * GIZA_TILE + 4, ch.gy * GIZA_TILE + 2, 8, 4);
            }

            for (const pk of level.pickups) {
                if (pk.collected) continue;
                const bob = Math.sin(state.t / 200 + pk.gx) * 2;
                const px = pk.gx * GIZA_TILE + 8, py = pk.gy * GIZA_TILE + 8 + bob;
                ctx.fillStyle = '#f8717188';
                ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fecaca';
                ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
            }

            for (const node of level.ironNodes) {
                if (node.mined) continue;
                ctx.fillStyle = '#64748b';
                ctx.fillRect(node.gx * GIZA_TILE + 3, node.gy * GIZA_TILE + 3, 10, 10);
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(node.gx * GIZA_TILE + 5, node.gy * GIZA_TILE + 4, 3, 3);
            }

            GIZA_CRYSTALS.forEach((c, i) => {
                const active = crystalActive[i] || isSolved;
                ctx.fillStyle = c.color;
                ctx.beginPath();
                ctx.arc(c.gx * GIZA_TILE + 8, c.gy * GIZA_TILE + 8, 5, 0, Math.PI * 2);
                ctx.fill();
                if (active) {
                    ctx.shadowColor = c.color;
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(c.gx * GIZA_TILE + 8, c.gy * GIZA_TILE + 8, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            if (slabOpen && !relicClaimed) {
                const bounce = Math.sin(state.t / 150) * 2;
                ctx.fillStyle = '#e0f2fe';
                ctx.beginPath();
                ctx.arc(GIZA_RELIC.gx * GIZA_TILE + 8, GIZA_RELIC.gy * GIZA_TILE + 8 + bounce, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            if (level.temptationResolved === 'none') {
                const pulse = 0.4 + Math.sin(state.t / 350) * 0.25;
                ctx.fillStyle = `rgba(239,68,68,${pulse})`;
                ctx.fillRect(GIZA_TEMPTATION.gx * GIZA_TILE + 4, GIZA_TEMPTATION.gy * GIZA_TILE + 4, 8, 8);
            }

            const secretChest = level.chests.find((c) => c.id === 'chest_secret');
            if (secretChest && !secretChest.opened && secretVisible) {
                const shimmer = 0.35 + Math.sin(state.t / 220) * 0.25;
                ctx.fillStyle = `rgba(251,191,36,${shimmer})`;
                ctx.fillRect(secretChest.gx * GIZA_TILE + 1, secretChest.gy * GIZA_TILE + 3, 14, 12);
            }

            const wp = guideStep.waypoint;
            if (wp) {
                const wx = wp.gx * GIZA_TILE + 8;
                const wy = wp.gy * GIZA_TILE + 8;
                const pulse = 0.5 + Math.sin(state.t / 260) * 0.4;
                const trailA = showTrail || hintTier > 0 ? 0.55 : 0.2;
                ctx.strokeStyle = `rgba(34,211,238,${trailA * (0.45 + pulse * 0.35)})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 6]);
                if (showTrail || hintTier > 0) {
                    ctx.beginPath();
                    ctx.moveTo(state.pax, state.pay);
                    ctx.lineTo(wx, wy);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
                ctx.fillStyle = `rgba(34,211,238,${(showTrail || hintTier > 0 ? 0.55 : 0.28) * (0.5 + pulse * 0.35)})`;
                ctx.beginPath();
                ctx.arc(wx, wy, 5 + pulse * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            for (const fz of level.fights) {
                if (fz.cleared || fz.radius <= 0) continue;
                ctx.strokeStyle = fz.combatId === 'giza_boss' ? '#ef444466' : '#fbbf2466';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(fz.gx * GIZA_TILE + 8, fz.gy * GIZA_TILE + 8, fz.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            dustMotes.forEach((m) => {
                m.x += m.vx * dt;
                m.y += m.vy * dt;
                if (m.x < 0) m.x = GIZA_MAP_W * GIZA_TILE;
                if (m.x > GIZA_MAP_W * GIZA_TILE) m.x = 0;
                if (m.y < 0) m.y = GIZA_MAP_H * GIZA_TILE;
                if (m.y > GIZA_MAP_H * GIZA_TILE) m.y = 0;
                ctx.save();
                ctx.globalAlpha = m.alpha;
                ctx.fillStyle = '#e0f2fe';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            if (swingTRef.current > 0) {
                ctx.strokeStyle = `rgba(34, 211, 238, ${swingTRef.current / 0.35})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(state.pax, state.pay - 3, 20, 0, Math.PI * 2);
                ctx.stroke();
            }

            const curKey = JSON.stringify(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
            if (curKey !== avatarKey) { avatarKey = curKey; avatarFrames = buildFrames(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing)); }
            const wphase = Math.floor(state.walkT * 7) % 2;
            const dirFrames = avatarFrames[state.facing];
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            ctx.drawImage(wframe, state.pax - 8, state.pay - 19, 16, 24);

            ctx.restore();

            // torch vignette
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
            const gradient = ctx.createRadialGradient(
                state.pax * Z, (state.pay - 10) * Z, 0,
                state.pax * Z, (state.pay - 10) * Z, 58 * Z,
            );
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(0.65, 'rgba(0,0,0,0.82)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(state.pax * Z, (state.pay - 10) * Z, 58 * Z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, [activeFight, level, isSolved, minigameDone, relicClaimed, isSolid, onClaim, consumeFightBonusHp, onDiscover, nearLore, nearCrystal, nearTemptation, grantSkillPoint, character.equipped.weapon, guideStep, showTrail, hintTier, setGuideDialogue, slabOpen, crystalActive, addMaterial, softRespawn]);

    const handleAction = () => {
        if (nearLore) {
            readLoreStone(nearLore);
            return;
        }
        if (nearCrystal !== null && level.chamberOpen) {
            strikeCrystal(nearCrystal);
            return;
        }
        attackRef.current = true;
    };

    const activeFightZone = level.fights.find((f) => f.combatId === activeFight && !f.cleared);
    const fightDest = activeFight ? gizaDestinationStub(activeFight) : null;

    return (
        <div className="flex flex-col items-center w-full text-white select-none relative">
            {activeFight && fightDest?.combat && (
                <CombatScene
                    destination={fightDest}
                    character={character}
                    weaponDamage={wpn.damage}
                    weaponReach={wpn.reach}
                    exploreBgm="world_cavern"
                    {...combatStatProps}
                    bonusHp={combatStatProps.bonusHp + fightBonusRef.current}
                    onVictory={() => {
                        if (activeFightZone) markFightCleared(activeFightZone.id, activeFight);
                        setDialogue(fightDest.combat!.victory);
                        sfx.victory();
                    }}
                    onDefeat={() => {
                        fightTriggeredRef.current = null;
                        setActiveFight(null);
                        setDungeonHp((hp) => {
                            const next = hp - 30;
                            if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
                            if (next < 30) { setTimeout(() => softRespawn(), 50); return 50; }
                            setDialogue('The shades overwhelm you. Rest, gather health, and try again.');
                            sfx.defeat();
                            return next;
                        });
                    }}
                    onExit={() => { fightTriggeredRef.current = null; setActiveFight(null); }}
                />
            )}

            <div className="flex justify-between items-center w-full max-w-[520px] mb-2 gap-2">
                <button onClick={onExit} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white">
                    <ArrowLeft className="w-4 h-4" /> Return
                </button>
                <div className="text-center min-w-0">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 block">Giza — Engine of Stone</span>
                    <span className="text-[8px] uppercase tracking-widest text-zinc-500 block truncate">{zoneLabel}</span>
                </div>
                <button onClick={toggleMute} className="text-zinc-400 hover:text-white">{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
            </div>

            <div className="w-full max-w-[520px] mb-2 space-y-1.5">
                <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <div className="flex-1 h-2.5 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(dungeonHp / MAX_DUNGEON_HP) * 100}%`, background: dungeonHp > 35 ? '#22d3ee' : '#ef4444' }} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 w-14 text-right">{dungeonHp}/{MAX_DUNGEON_HP}</span>
                </div>
                {level.keysFound.length > 0 && (
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-amber-400/90">
                        <Key className="w-3 h-3" />
                        {level.keysFound.map((k) => k.replace('key_', '')).join(' · ')}
                    </div>
                )}
                <div className="flex items-start gap-2 rounded-lg border border-cyan-500/15 bg-cyan-950/40 px-2.5 py-2">
                    <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300/90">{guideStep.objective}</p>
                        <p className="text-[8px] text-zinc-500 leading-snug mt-0.5">{guideStep.tip}</p>
                        {hintTier > 0 && (
                            <p className="text-[7px] uppercase tracking-widest text-amber-400/70 mt-1 animate-pulse">Khaemwaset hint · follow the cyan trail</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative border-4 border-cyan-600/40 rounded-2xl overflow-hidden bg-cyan-950 shadow-inner w-full max-w-[520px]">
                <canvas ref={canvasRef} className="block w-full aspect-square" />
                {showMinimap && !activeFight && (
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                        <DestinationMinimap
                            label="Giza"
                            mapW={GIZA_MAP_W}
                            mapH={GIZA_MAP_H}
                            terrain={gizaTerrain}
                            terrainColors={GIZA_MINIMAP_TERRAIN_COLORS}
                            explored={exploredRef.current}
                            exploredVersion={exploredVersion}
                            playerX={playerPos.x}
                            playerY={playerPos.y}
                            tileSize={GIZA_TILE}
                            pois={minimapPois}
                            gates={minimapGates}
                            questWaypoint={guideStep.waypoint ?? null}
                            size={80}
                        />
                    </div>
                )}
            </div>

            <MiniWorldInsight character={character} puzzleId={puzzleId} baseHint={puzzleHint} accent={accent} isSolved={isSolved} />

            {dialogue && (
                <div className="w-full max-w-[520px] mt-3 p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/45 text-center">
                    <p className="font-ritual text-sm leading-relaxed text-zinc-200">{dialogue}</p>
                    {nearTemptation && level.temptationResolved === 'none' && !activeFight && (
                        <div className="flex gap-2 justify-center mt-3">
                            <button onClick={acceptTemptation} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-900/60 border border-red-500/40 text-red-200 hover:bg-red-800/70">
                                Listen
                            </button>
                            <button onClick={resistTemptation} className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-800/70">
                                Walk on
                            </button>
                        </div>
                    )}
                </div>
            )}

            <DestinationControlPad
                profile={profile}
                joy={joy}
                joyRadius={joyR}
                accent="rgba(34, 211, 238, 0.65)"
                actionLabel={nearLore ? 'Read' : nearCrystal !== null && level.chamberOpen ? 'Strike' : 'Strike'}
                actionDisabled={!nearLore && nearCrystal === null && !character.equipped.weapon}
                onAction={handleAction}
                hint="◆ read stones · strike crystals Low→Mid→High · mine iron · crumbling east wall hides the Orion vault"
            />
        </div>
    );
}