'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { wornAvatar } from '@/lib/game/avatar';
import { Volume2, VolumeX, ArrowLeft, Heart, Compass, Zap } from 'lucide-react';
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
    FAIR_MAP_W, FAIR_MAP_H, FAIR_TILE, FAIR_TILES, FAIR_SPAWN, FAIR_RELIC, FAIR_GATE_TILES,
    FAIR_VIEW_TILES, FAIR_WHEEL, FAIR_VISTA, FAIR_WARDENS, FAIR_SPOT_RANGE, FAIR_SPOT_HALF_ANGLE,
    FAIR_DYNAMO_CODE, FAIR_PYLON_PERIOD_MS, fairHazardActive,
    hydrateFairState, isFairSolid, updateFairProgress, fairDestinationStub,
    fairZoneLabel, fairWingId, fairDiscoveriesFromState, canRevealFairCache,
    fairGuideStep, FAIR_KEEPER_LINES, FAIR_RESPAWN_LINE, FAIR_VISTA_LINE, FAIR_HINT_DELAYS_SEC,
    FAIR_MINIMAP_TERRAIN_COLORS, fairMinimapTerrain, fairMinimapGates, fairMinimapPois,
    type FairLevelState,
} from '@/lib/game/fairLevel';

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

type Facing = 'down' | 'up' | 'left' | 'right';

interface WardenState {
    id: string;
    x: number; y: number;
    tx: number; ty: number;
    sx: number; sy: number;
    speed: number;
    facing: Facing;
    lastHitAt: number;
}

export default function StLouisWorld({
    character, isSolved, minigameDone = true, isGuardianCleared,
    onSolve, onClaim, onExit, onGuardianCleared, onDiscover, puzzleId, puzzleHint, accent = '#fbbf24',
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
    const [level, setLevel] = useState<FairLevelState>(() => hydrateFairState(character));
    const [zoneLabel, setZoneLabel] = useState('The Pike');
    const [nearCard, setNearCard] = useState<string | null>(null);
    const [nearDynamo, setNearDynamo] = useState<number | null>(null);
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_fair_token'));
    const [activeFight, setActiveFight] = useState<string | null>(null);
    const [dialogue, setDialogue] = useState(
        isGuardianCleared
            ? 'The Caretaker has fallen. Walk the marble again — the Token waits by the Festival Hall stage.'
            : '【Mabel Hart】 Welcome to the grandest city that ever vanished. Read the amber ◆ postcard by the turnstiles, then follow the compass.',
    );
    const [hintTier, setHintTier] = useState(0);
    const [showTrail, setShowTrail] = useState(false);
    const [playerPos, setPlayerPos] = useState({
        x: FAIR_SPAWN.gx * FAIR_TILE + 8,
        y: FAIR_SPAWN.gy * FAIR_TILE + 8,
    });
    const [exploredVersion, setExploredVersion] = useState(0);
    const exploredRef = useRef(exploredChunksFromDiscovered(character.discovered, 'fair'));
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
    const wingsSeenRef = useRef(new Set(character.discovered.filter((d) => d.startsWith('fair_wing_'))));
    const lastWingRef = useRef<string | null>(null);
    const guideStepIdRef = useRef('');
    const stuckSinceRef = useRef(Date.now());
    const hintTierRef = useRef(0);
    const fightWarnRef = useRef<Record<string, number>>({});
    const dialoguePriorityRef = useRef(0);
    const swingTRef = useRef(0);
    const hazardCdRef = useRef(0);
    const wardensRef = useRef<WardenState[]>(FAIR_WARDENS.map((w) => ({
        id: w.id, x: w.x1, y: w.y1, tx: w.x2, ty: w.y2, sx: w.x1, sy: w.y1,
        speed: w.speed, facing: 'down', lastHitAt: 0,
    })));

    /** Effective level: puzzle solved in Records also powers the dynamos. */
    const effLevel = useMemo(
        () => updateFairProgress({ ...level, dialsSet: level.dialsSet || isSolved }),
        [level, isSolved],
    );
    const solvedFlag = effLevel.dialsSet;

    const fairTerrain = useMemo(() => fairMinimapTerrain(), []);
    const minimapPois = useMemo(() => fairMinimapPois(effLevel, {
        cacheVisible: canRevealFairCache(effLevel, character),
        relicClaimed,
        solved: solvedFlag,
    }), [effLevel, character, relicClaimed, solvedFlag]);
    const minimapGates = useMemo(() => fairMinimapGates(effLevel), [effLevel]);
    const showMinimap = loadSettings().showMinimap;

    useEffect(() => {
        const explored = exploredChunksFromDiscovered(character.discovered, 'fair');
        const toDiscover: string[] = [];
        for (const ch of initialRevealChunks(FAIR_SPAWN.gx, FAIR_SPAWN.gy, FAIR_MAP_W, FAIR_MAP_H)) {
            if (!explored.has(ch)) {
                explored.add(ch);
                const [cx, cy] = ch.split('_').map(Number);
                toDiscover.push(mapRevealKey('fair', cx, cy));
            }
        }
        exploredRef.current = explored;
        if (toDiscover.length) onDiscover(toDiscover);
        setExploredVersion((v) => v + 1);
    }, [character.discovered, onDiscover]);

    const guideStep = useMemo(() => fairGuideStep(effLevel, {
        isGuardianCleared,
        isSolved,
        minigameDone,
        relicClaimed,
        hasWeapon: !!character.equipped.weapon,
    }), [effLevel, isGuardianCleared, isSolved, minigameDone, relicClaimed, character.equipped.weapon]);

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
            for (let i = FAIR_HINT_DELAYS_SEC.length - 1; i >= 0; i--) {
                if (elapsed >= FAIR_HINT_DELAYS_SEC[i]) { tier = i + 1; break; }
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
        pax: FAIR_SPAWN.gx * FAIR_TILE + 8,
        pay: FAIR_SPAWN.gy * FAIR_TILE + 8,
        facing: 'up' as Facing,
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
        st.pax = FAIR_SPAWN.gx * FAIR_TILE + 8;
        st.pay = FAIR_SPAWN.gy * FAIR_TILE + 8;
        setDungeonHp(50);
        setGuideDialogue(`【Mabel Hart】 ${FAIR_RESPAWN_LINE}`, 3);
        sfx.defeat();
    }, [setGuideDialogue]);

    const markFightCleared = useCallback((fightId: string, combatId: string) => {
        setLevel((prev) => {
            const next = updateFairProgress({
                ...prev,
                fights: prev.fights.map((f) => (f.id === fightId ? { ...f, cleared: true } : f)),
            });
            onDiscover(fairDiscoveriesFromState(next));
            if (combatId === 'fair_boss') onGuardianCleared();
            return next;
        });
        fightTriggeredRef.current = null;
        setActiveFight(null);
        setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + 20));
    }, [onGuardianCleared, onDiscover]);

    const readCard = useCallback((cardId: string) => {
        const card = level.cards.find((c) => c.id === cardId);
        if (!card || card.read) return;
        setLevel((prev) => {
            const next = {
                ...prev,
                cards: prev.cards.map((c) => (c.id === cardId ? { ...c, read: true } : c)),
            };
            onDiscover(fairDiscoveriesFromState(next));
            return next;
        });
        setDialogue(`【${card.title}】 ${card.text}`);
        sfx.hit();
    }, [level, onDiscover]);

    const cycleDynamo = useCallback((dynamoId: number) => {
        if (solvedFlag) {
            setDialogue('The dynamos hold steady at 1·9·0·4. The year is remembered.');
            return;
        }
        const nextDynamos = level.dynamos.map((d) => (d.id === dynamoId ? { ...d, val: (d.val + 1) % 10 } : d));
        const code = nextDynamos.map((d) => d.val).join('');
        sfx.strike();
        if (code === FAIR_DYNAMO_CODE) {
            if (!minigameDone) {
                setLevel((prev) => ({ ...prev, dynamos: nextDynamos }));
                setDialogue('The dynamos align — but the current will not flow. Pass the White Blocks trial in Records first.');
                return;
            }
            setLevel((prev) => {
                const next = updateFairProgress({ ...prev, dynamos: nextDynamos, dialsSet: true });
                onDiscover(fairDiscoveriesFromState(next));
                return next;
            });
            onSolve();
            setDialogue('The four dynamos sing the year 1904! The pylons go dark, and Festival Hall answers with a groan of iron.');
            sfx.victory();
            gameMusic.playCue('rivers_converge');
        } else {
            setLevel((prev) => ({ ...prev, dynamos: nextDynamos }));
            const d = nextDynamos.find((x) => x.id === dynamoId)!;
            setDialogue(`Dynamo ${dynamoId + 1} set to ${d.val} · the four read ${code}`);
        }
    }, [solvedFlag, level.dynamos, minigameDone, onDiscover, onSolve]);

    const isSolid = useCallback((gx: number, gy: number) => {
        return isFairSolid(gx, gy, effLevel);
    }, [effLevel]);

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

        // baked ground — static tiles drawn once
        const ground = document.createElement('canvas');
        ground.width = FAIR_MAP_W * FAIR_TILE;
        ground.height = FAIR_MAP_H * FAIR_TILE;
        {
            const g = ground.getContext('2d')!;
            for (let r = 0; r < FAIR_MAP_H; r++) {
                for (let c = 0; c < FAIR_MAP_W; c++) {
                    const cell = FAIR_TILES[r][c];
                    if (cell === 1) {
                        // plaster facades at dusk
                        g.fillStyle = '#2a2140';
                        g.fillRect(c * FAIR_TILE, r * FAIR_TILE, FAIR_TILE, FAIR_TILE);
                        g.fillStyle = '#3b3158';
                        g.fillRect(c * FAIR_TILE + 1, r * FAIR_TILE + 1, FAIR_TILE - 2, 3);
                    } else if (cell === 2) {
                        g.fillStyle = '#3b2a12';
                        g.fillRect(c * FAIR_TILE, r * FAIR_TILE, FAIR_TILE, FAIR_TILE);
                        g.fillStyle = '#57401d';
                        g.fillRect(c * FAIR_TILE + 6, r * FAIR_TILE, 4, FAIR_TILE);
                    } else {
                        g.fillStyle = (c + r) % 2 === 0 ? '#43371f' : '#3a2f1a';
                        g.fillRect(c * FAIR_TILE, r * FAIR_TILE, FAIR_TILE, FAIR_TILE);
                        if (cell === 3) {
                            // striped stall canopy
                            for (let s = 0; s < 4; s++) {
                                g.fillStyle = s % 2 === 0 ? '#9f1239' : '#e2e8f0';
                                g.fillRect(c * FAIR_TILE + s * 4, r * FAIR_TILE + 2, 4, 5);
                            }
                            g.fillStyle = '#78350f';
                            g.fillRect(c * FAIR_TILE + 2, r * FAIR_TILE + 8, 12, 6);
                        }
                    }
                }
            }
        }

        const emberMotes: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
        for (let i = 0; i < 26; i++) {
            emberMotes.push({
                x: Math.random() * FAIR_MAP_W * FAIR_TILE,
                y: Math.random() * FAIR_MAP_H * FAIR_TILE,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,
                size: 0.5 + Math.random(),
                alpha: 0.1 + Math.random() * 0.28,
            });
        }

        function resize() {
            if (!canvas.parentElement) return;
            const size = Math.min(canvas.parentElement.clientWidth || 400, 520);
            canvas.width = size;
            canvas.height = size;
            Z = size / (FAIR_VIEW_TILES * FAIR_TILE);
            ctx.imageSmoothingEnabled = false;
        }
        resize();
        window.addEventListener('resize', resize);

        const inSpotlight = (w: WardenState, px: number, py: number) => {
            const dx = px - w.x, dy = py - w.y;
            const dist = Math.hypot(dx, dy);
            if (dist > FAIR_SPOT_RANGE || dist < 2) return false;
            let coneCenter = 0;
            if (w.facing === 'right') coneCenter = 0;
            else if (w.facing === 'left') coneCenter = Math.PI;
            else if (w.facing === 'down') coneCenter = Math.PI / 2;
            else coneCenter = -Math.PI / 2;
            let diff = Math.abs(Math.atan2(dy, dx) - coneCenter);
            while (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < FAIR_SPOT_HALF_ANGLE;
        };

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
                const ngx = Math.floor(nx / FAIR_TILE);
                if (!isSolid(ngx, Math.floor(state.pay / FAIR_TILE))) state.pax = nx;
                const ny = state.pay + iy * 76 * dt;
                const ngy = Math.floor(ny / FAIR_TILE);
                if (!isSolid(Math.floor(state.pax / FAIR_TILE), ngy)) state.pay = ny;
            }

            const pgx = Math.floor(state.pax / FAIR_TILE);
            const pgy = Math.floor(state.pay / FAIR_TILE);

            if (now - mapSyncRef.current.lastAt > 80) {
                mapSyncRef.current.lastAt = now;
                const added = newRevealDiscoveries('fair', pgx, pgy, exploredRef.current, FAIR_MAP_W, FAIR_MAP_H);
                if (added.length) {
                    onDiscover(added);
                    setExploredVersion((v) => v + 1);
                }
                setPlayerPos({ x: state.pax, y: state.pay });
            }

            const zl = fairZoneLabel(pgx, pgy);
            if (zl) setZoneLabel(zl);

            const wingId = fairWingId(pgx, pgy);
            if (wingId && wingId !== lastWingRef.current) {
                lastWingRef.current = wingId;
                const discId = `fair_${wingId}`;
                if (!wingsSeenRef.current.has(discId)) {
                    wingsSeenRef.current.add(discId);
                    onDiscover([discId]);
                    setDialogue(`【Mabel Hart】 ${FAIR_KEEPER_LINES[wingId]}`);
                }
            }

            // —— Caretaker wardens: patrol, lantern cones cost vitality + shove ——
            for (const w of wardensRef.current) {
                const dx = w.tx - w.x, dy = w.ty - w.y;
                const d = Math.hypot(dx, dy);
                if (d < 1) {
                    const tx = w.tx, ty = w.ty;
                    w.tx = w.sx; w.ty = w.sy;
                    w.sx = tx; w.sy = ty;
                } else {
                    w.x += (dx / d) * w.speed * dt;
                    w.y += (dy / d) * w.speed * dt;
                    w.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
                }
                if (isGuardianCleared) continue; // the Erased no longer reach for you
                if (now - w.lastHitAt > 1200 && inSpotlight(w, state.pax, state.pay)) {
                    w.lastHitAt = now;
                    const ux = (state.pax - w.x) / Math.max(1, Math.hypot(state.pax - w.x, state.pay - w.y));
                    const uy = (state.pay - w.y) / Math.max(1, Math.hypot(state.pax - w.x, state.pay - w.y));
                    const sx = state.pax + ux * 28;
                    if (!isSolid(Math.floor(sx / FAIR_TILE), pgy)) state.pax = sx;
                    const sy = state.pay + uy * 28;
                    if (!isSolid(Math.floor(state.pax / FAIR_TILE), Math.floor(sy / FAIR_TILE))) state.pay = sy;
                    sfx.hit();
                    setDungeonHp((hp) => {
                        const next = hp - 10;
                        if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
                        return next;
                    });
                    setGuideDialogue('A Caretaker\'s lantern finds you — the light burns and shoves you back. Stay out of the cones.', 2);
                }
            }

            // —— arc-pylon hazard: sweeps on a beat until the dynamos read 1904 ——
            if (!solvedFlag && FAIR_TILES[pgy]?.[pgx] === 2 && fairHazardActive(pgx, now) && now - hazardCdRef.current > 900) {
                hazardCdRef.current = now;
                sfx.bossSpawn();
                setDungeonHp((hp) => {
                    const next = hp - 8;
                    if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
                    return next;
                });
                setGuideDialogue('Zap! The pylons arc on a rhythm — cross on the dark beat.', 2);
            }

            // wheel vista milestone
            if (!level.wheelVista
                && Math.hypot(FAIR_VISTA.gx * FAIR_TILE + 8 - state.pax, FAIR_VISTA.gy * FAIR_TILE + 8 - state.pay) < 20) {
                setLevel((prev) => {
                    const next = { ...prev, wheelVista: true };
                    onDiscover(fairDiscoveriesFromState(next));
                    return next;
                });
                setDialogue(FAIR_VISTA_LINE);
                sfx.hit();
            }

            let closestCard: string | null = null;
            let closestCardD = Infinity;
            for (const c of level.cards) {
                const d = Math.hypot(c.gx * FAIR_TILE + 8 - state.pax, c.gy * FAIR_TILE + 8 - state.pay);
                if (d < 22 && d < closestCardD) { closestCardD = d; closestCard = c.id; }
            }
            if (closestCard !== nearCard) setNearCard(closestCard);

            let closestDyn: number | null = null;
            let closestDynD = Infinity;
            for (const d of level.dynamos) {
                const dd = Math.hypot(d.gx * FAIR_TILE + 8 - state.pax, d.gy * FAIR_TILE + 8 - state.pay);
                if (dd < 22 && dd < closestDynD) { closestDynD = dd; closestDyn = d.id; }
            }
            if (closestDyn !== nearDynamo) setNearDynamo(closestDyn);

            for (const pk of level.pickups) {
                if (pk.collected || touchedRef.current.has(pk.id)) continue;
                if (Math.hypot(pk.gx * FAIR_TILE + 8 - state.pax, pk.gy * FAIR_TILE + 8 - state.pay) < 14) {
                    touchedRef.current.add(pk.id);
                    setLevel((prev) => {
                        const next = { ...prev, pickups: prev.pickups.map((p) => (p.id === pk.id ? { ...p, collected: true } : p)) };
                        onDiscover(fairDiscoveriesFromState(next));
                        return next;
                    });
                    setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + pk.amount));
                    sfx.pickup();
                    setDialogue(`Vitality restored · +${pk.amount}`);
                }
            }

            const cacheVisible = canRevealFairCache(level, charRef.current);
            for (const ch of level.caches) {
                if (ch.opened || touchedRef.current.has(ch.id)) continue;
                if (ch.hidden && !cacheVisible) continue;
                if (Math.hypot(ch.gx * FAIR_TILE + 8 - state.pax, ch.gy * FAIR_TILE + 8 - state.pay) < 18) {
                    touchedRef.current.add(ch.id);
                    setLevel((prev) => {
                        const next = { ...prev, caches: prev.caches.map((c) => (c.id === ch.id ? { ...c, opened: true } : c)) };
                        onDiscover(fairDiscoveriesFromState(next));
                        return next;
                    });
                    grantSkillPoint();
                    setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + ch.health));
                    setDialogue(`The Wheel cache — +${ch.health} vitality and a skill point. The demolition crews missed this, and Mabel made sure they would.`);
                    sfx.pickup();
                }
            }

            if (!effLevel.gateOpen) {
                const gateDist = Math.hypot(26.5 * FAIR_TILE + 8 - state.pax, 9 * FAIR_TILE + 8 - state.pay);
                if (gateDist < 36) {
                    setGuideDialogue('【Mabel Hart】 The hall gate yields to a quiet Pike and the year 1904 on the dynamos.', 1);
                }
            }

            for (const fz of effLevel.fights) {
                if (fz.cleared || fightTriggeredRef.current === fz.id || fz.radius <= 0) continue;
                const dist = Math.hypot(fz.gx * FAIR_TILE + 8 - state.pax, fz.gy * FAIR_TILE + 8 - state.pay);
                if (dist >= fz.radius + 8) { delete fightWarnRef.current[fz.id]; continue; }
                if (dist < fz.radius) {
                    if (!character.equipped.weapon) {
                        setGuideDialogue('Arm yourself at Truth\'s Hut before facing the Erased.', 2);
                        break;
                    }
                    if (fz.combatId === 'fair_boss' && !effLevel.gateOpen) {
                        setGuideDialogue('Festival Hall is sealed. Clear both Pike trials and set the dynamos to 1904.', 2);
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
                for (const node of level.nodes) {
                    if (node.collected || touchedRef.current.has(node.id)) continue;
                    if (Math.hypot(node.gx * FAIR_TILE + 8 - state.pax, node.gy * FAIR_TILE + 8 - state.pay) < 24) {
                        touchedRef.current.add(node.id);
                        setLevel((prev) => {
                            const next = { ...prev, nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, collected: true } : n)) };
                            onDiscover(fairDiscoveriesFromState(next));
                            return next;
                        });
                        addMaterial('copper', 1);
                        setDialogue('Clang! A copper sheet pries loose — Hana can temper this at Truth\'s Forge.');
                        sfx.hit();
                    }
                }
                attackRef.current = false;
            }

            if (solvedFlag && !relicClaimed) {
                const rx = FAIR_RELIC.gx * FAIR_TILE + 8;
                const ry = FAIR_RELIC.gy * FAIR_TILE + 8;
                if (Math.hypot(rx - state.pax, ry - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue('You claim the Fairgrounds Token — brass stamped with a building no record admits ever stood.');
                    sfx.hit();
                    gameMusic.playSting('relic_claim', Math.random() < 0.4 ? 'alt' : 'main');
                }
            }

            // ---- render ----
            const camX = state.pax - (FAIR_VIEW_TILES * FAIR_TILE) / 2;
            const camY = state.pay - (FAIR_VIEW_TILES * FAIR_TILE) / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(Z, Z);
            ctx.translate(-camX + (canvas.width / Z - FAIR_VIEW_TILES * FAIR_TILE) / 2, -camY + (canvas.height / Z - FAIR_VIEW_TILES * FAIR_TILE) / 2);

            ctx.drawImage(ground, 0, 0);

            // —— the Observation Wheel, towering over the east plaza ——
            {
                const wx = (FAIR_WHEEL.gx + 0.5) * FAIR_TILE;
                const wy = 8.5 * FAIR_TILE;
                const R = 84;
                const rot = state.t / 9000;
                ctx.save();
                ctx.globalAlpha = 0.55;
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(wx, wy, R, 0, Math.PI * 2); ctx.stroke();
                ctx.lineWidth = 1;
                for (let i = 0; i < 12; i++) {
                    const a = rot + (i / 12) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(wx, wy);
                    ctx.lineTo(wx + Math.cos(a) * R, wy + Math.sin(a) * R);
                    ctx.stroke();
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillRect(wx + Math.cos(a) * R - 2, wy + Math.sin(a) * R - 2, 4, 4);
                }
                // support struts down to the solid base
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(wx - 14, (FAIR_WHEEL.gy + 2) * FAIR_TILE);
                ctx.lineTo(wx, wy);
                ctx.lineTo(wx + 14, (FAIR_WHEEL.gy + 2) * FAIR_TILE);
                ctx.stroke();
                ctx.restore();
            }

            // festival gate
            if (!effLevel.gateOpen) {
                const pulse = 0.3 + Math.sin(state.t / 320) * 0.12;
                ctx.fillStyle = `rgba(251,191,36,${pulse})`;
                for (const [gx, gy] of FAIR_GATE_TILES) ctx.fillRect(gx * FAIR_TILE, gy * FAIR_TILE, FAIR_TILE, FAIR_TILE);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(FAIR_GATE_TILES[0][0] * FAIR_TILE + 13, FAIR_GATE_TILES[0][1] * FAIR_TILE + 4, 6, 8);
            } else {
                ctx.fillStyle = 'rgba(52,211,153,0.2)';
                for (const [gx, gy] of FAIR_GATE_TILES) ctx.fillRect(gx * FAIR_TILE, gy * FAIR_TILE, FAIR_TILE, FAIR_TILE);
            }

            // arc-pylon lightning (live rows sweep until solved)
            if (!solvedFlag) {
                const beat = Math.floor(state.t / FAIR_PYLON_PERIOD_MS) % 3;
                for (const py of [9, 14]) {
                    for (let x = 3; x <= 19; x++) {
                        if (FAIR_TILES[py][x] !== 2) continue;
                        if (Math.floor(x / 4) % 3 !== beat) continue;
                        const bx = x * FAIR_TILE, by = py * FAIR_TILE;
                        ctx.strokeStyle = 'rgba(56,189,248,0.85)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(bx + 2, by + 2);
                        ctx.lineTo(bx + 8 + (Math.random() - 0.5) * 6, by + 8 + (Math.random() - 0.5) * 6);
                        ctx.lineTo(bx + 14, by + 14);
                        ctx.stroke();
                        ctx.fillStyle = 'rgba(56,189,248,0.16)';
                        ctx.fillRect(bx, by, FAIR_TILE, FAIR_TILE);
                    }
                }
            }
            // coil pillars glow
            for (const py of [9, 14]) {
                for (const x of [5, 9, 13, 17]) {
                    ctx.fillStyle = solvedFlag ? '#475569' : '#38bdf8';
                    ctx.fillRect(x * FAIR_TILE + 6, py * FAIR_TILE + 2, 4, 4);
                }
            }

            // dynamos
            for (const d of level.dynamos) {
                ctx.fillStyle = '#854d0e';
                ctx.fillRect(d.gx * FAIR_TILE + 2, d.gy * FAIR_TILE + 2, 12, 12);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(d.gx * FAIR_TILE + 4, d.gy * FAIR_TILE + 4, 8, 8);
                ctx.fillStyle = solvedFlag ? '#34d399' : '#fcd34d';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(String(solvedFlag ? FAIR_DYNAMO_CODE[d.id] : d.val), d.gx * FAIR_TILE + 8, d.gy * FAIR_TILE + 11);
            }

            // postcards
            for (const c of level.cards) {
                const pulse = 0.5 + Math.sin(state.t / 300 + c.gx) * 0.2;
                ctx.fillStyle = c.read ? 'rgba(251,191,36,0.3)' : `rgba(251,191,36,${pulse})`;
                ctx.fillRect(c.gx * FAIR_TILE + 3, c.gy * FAIR_TILE + 2, 10, 12);
                ctx.fillStyle = c.read ? '#a16207' : '#fde68a';
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('◆', c.gx * FAIR_TILE + 8, c.gy * FAIR_TILE + 11);
            }

            // copper nodes
            for (const n of level.nodes) {
                if (n.collected) continue;
                ctx.fillStyle = '#9a3412';
                ctx.fillRect(n.gx * FAIR_TILE + 3, n.gy * FAIR_TILE + 3, 10, 10);
                ctx.fillStyle = '#fdba74';
                ctx.fillRect(n.gx * FAIR_TILE + 5, n.gy * FAIR_TILE + 4, 3, 3);
            }

            // pickups
            for (const pk of level.pickups) {
                if (pk.collected) continue;
                const bob = Math.sin(state.t / 200 + pk.gx) * 2;
                const px = pk.gx * FAIR_TILE + 8, py = pk.gy * FAIR_TILE + 8 + bob;
                ctx.fillStyle = '#f8717188';
                ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fecaca';
                ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
            }

            // hidden wheel cache shimmer
            for (const ch of level.caches) {
                if (ch.opened || !cacheVisible) continue;
                const shimmer = 0.35 + Math.sin(state.t / 220) * 0.25;
                ctx.fillStyle = `rgba(251,191,36,${shimmer})`;
                ctx.fillRect(ch.gx * FAIR_TILE + 1, ch.gy * FAIR_TILE + 3, 14, 12);
                ctx.fillStyle = '#92400e';
                ctx.fillRect(ch.gx * FAIR_TILE + 3, ch.gy * FAIR_TILE + 5, 10, 8);
            }

            // relic token
            if (solvedFlag && !relicClaimed) {
                const bounce = Math.sin(state.t / 150) * 2;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(FAIR_RELIC.gx * FAIR_TILE + 8, FAIR_RELIC.gy * FAIR_TILE + 8 + bounce, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fef3c7';
                ctx.beginPath();
                ctx.arc(FAIR_RELIC.gx * FAIR_TILE + 8, FAIR_RELIC.gy * FAIR_TILE + 8 + bounce, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // waypoint trail
            const wp = guideStep.waypoint;
            if (wp) {
                const wx = wp.gx * FAIR_TILE + 8;
                const wy = wp.gy * FAIR_TILE + 8;
                const pulse = 0.5 + Math.sin(state.t / 260) * 0.4;
                const trailA = showTrail || hintTier > 0 ? 0.55 : 0.2;
                ctx.strokeStyle = `rgba(251,191,36,${trailA * (0.45 + pulse * 0.35)})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 6]);
                if (showTrail || hintTier > 0) {
                    ctx.beginPath();
                    ctx.moveTo(state.pax, state.pay);
                    ctx.lineTo(wx, wy);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
                ctx.fillStyle = `rgba(251,191,36,${(showTrail || hintTier > 0 ? 0.55 : 0.28) * (0.5 + pulse * 0.35)})`;
                ctx.beginPath();
                ctx.arc(wx, wy, 5 + pulse * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // fight circles
            for (const fz of effLevel.fights) {
                if (fz.cleared || fz.radius <= 0) continue;
                ctx.strokeStyle = fz.combatId === 'fair_boss' ? '#ef444466' : '#fbbf2466';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(fz.gx * FAIR_TILE + 8, fz.gy * FAIR_TILE + 8, fz.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // —— Caretaker wardens + lantern cones ——
            for (const w of wardensRef.current) {
                let angle = 0;
                if (w.facing === 'right') angle = 0;
                else if (w.facing === 'left') angle = Math.PI;
                else if (w.facing === 'down') angle = Math.PI / 2;
                else angle = -Math.PI / 2;
                ctx.fillStyle = isGuardianCleared ? 'rgba(148,163,184,0.06)' : 'rgba(253,224,71,0.16)';
                ctx.beginPath();
                ctx.moveTo(w.x, w.y);
                ctx.arc(w.x, w.y, FAIR_SPOT_RANGE, angle - FAIR_SPOT_HALF_ANGLE, angle + FAIR_SPOT_HALF_ANGLE);
                ctx.closePath();
                ctx.fill();
                // figure — dark coat, lantern
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.beginPath(); ctx.ellipse(w.x, w.y + 6, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#1e1b2e';
                ctx.fillRect(w.x - 4, w.y - 10, 8, 14);
                ctx.fillStyle = '#3f3a52';
                ctx.fillRect(w.x - 3, w.y - 13, 6, 4);
                ctx.fillStyle = isGuardianCleared ? '#64748b' : '#fde047';
                ctx.beginPath();
                ctx.arc(w.x + Math.cos(angle) * 7, w.y + Math.sin(angle) * 7 - 2, 2.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // ember motes
            emberMotes.forEach((m) => {
                m.x += m.vx * dt;
                m.y += m.vy * dt;
                if (m.x < 0) m.x = FAIR_MAP_W * FAIR_TILE;
                if (m.x > FAIR_MAP_W * FAIR_TILE) m.x = 0;
                if (m.y < 0) m.y = FAIR_MAP_H * FAIR_TILE;
                if (m.y > FAIR_MAP_H * FAIR_TILE) m.y = 0;
                ctx.save();
                ctx.globalAlpha = m.alpha;
                ctx.fillStyle = '#fcd34d';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            if (swingTRef.current > 0) {
                ctx.strokeStyle = `rgba(251, 191, 36, ${swingTRef.current / 0.35})`;
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

            // dusk vignette — wider than a torch; the arc-lamps carry further
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
            const gradient = ctx.createRadialGradient(
                state.pax * Z, (state.pay - 10) * Z, 0,
                state.pax * Z, (state.pay - 10) * Z, 68 * Z,
            );
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(0.7, 'rgba(0,0,0,0.85)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(state.pax * Z, (state.pay - 10) * Z, 68 * Z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, [activeFight, level, effLevel, isSolved, minigameDone, relicClaimed, isSolid, onClaim, consumeFightBonusHp, onDiscover, nearCard, nearDynamo, grantSkillPoint, character.equipped.weapon, guideStep, showTrail, hintTier, setGuideDialogue, solvedFlag, addMaterial, softRespawn, isGuardianCleared]);

    const handleAction = () => {
        if (nearCard) {
            readCard(nearCard);
            return;
        }
        if (nearDynamo !== null && !solvedFlag) {
            cycleDynamo(nearDynamo);
            return;
        }
        attackRef.current = true;
    };

    const activeFightZone = effLevel.fights.find((f) => f.combatId === activeFight && !f.cleared);
    const fightDest = activeFight ? fairDestinationStub(activeFight) : null;

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
                            setDialogue('The Erased overwhelm you. Rest, gather vitality, and try again.');
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
                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 block">St. Louis 1904 — The Gilded Fair</span>
                    <span className="text-[8px] uppercase tracking-widest text-zinc-500 block truncate">{zoneLabel}</span>
                </div>
                <button onClick={toggleMute} className="text-zinc-400 hover:text-white">{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
            </div>

            <div className="w-full max-w-[520px] mb-2 space-y-1.5">
                <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <div className="flex-1 h-2.5 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(dungeonHp / MAX_DUNGEON_HP) * 100}%`, background: dungeonHp > 35 ? '#fbbf24' : '#ef4444' }} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 w-14 text-right">{dungeonHp}/{MAX_DUNGEON_HP}</span>
                </div>
                {!solvedFlag && (
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-amber-400/90">
                        <Zap className="w-3 h-3" />
                        dynamos · {level.dynamos.map((d) => d.val).join(' ')}
                    </div>
                )}
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/15 bg-amber-950/40 px-2.5 py-2">
                    <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-300/90">{guideStep.objective}</p>
                        <p className="text-[8px] text-zinc-500 leading-snug mt-0.5">{guideStep.tip}</p>
                        {hintTier > 0 && (
                            <p className="text-[7px] uppercase tracking-widest text-amber-400/70 mt-1 animate-pulse">Mabel Hart hint · follow the amber trail</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative border-4 border-amber-600/40 rounded-2xl overflow-hidden bg-amber-950 shadow-inner w-full max-w-[520px]">
                <canvas ref={canvasRef} className="block w-full aspect-square" />
                {showMinimap && !activeFight && (
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                        <DestinationMinimap
                            label="The Fair"
                            mapW={FAIR_MAP_W}
                            mapH={FAIR_MAP_H}
                            terrain={fairTerrain}
                            terrainColors={FAIR_MINIMAP_TERRAIN_COLORS}
                            explored={exploredRef.current}
                            exploredVersion={exploredVersion}
                            playerX={playerPos.x}
                            playerY={playerPos.y}
                            tileSize={FAIR_TILE}
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
                <div className="w-full max-w-[520px] mt-3 p-3 rounded-xl border border-amber-500/20 bg-amber-950/45 text-center">
                    <p className="font-ritual text-sm leading-relaxed text-zinc-200">{dialogue}</p>
                </div>
            )}

            <DestinationControlPad
                profile={profile}
                joy={joy}
                joyRadius={joyR}
                accent="rgba(251, 191, 36, 0.65)"
                actionLabel={nearCard ? 'Read' : nearDynamo !== null && !solvedFlag ? 'Cycle' : 'Strike'}
                actionDisabled={!nearCard && nearDynamo === null && !character.equipped.weapon}
                onAction={handleAction}
                hint="◆ read postcards · cycle dynamos to 1·9·0·4 · cross arcs on the dark beat · avoid lantern cones"
            />
        </div>
    );
}
