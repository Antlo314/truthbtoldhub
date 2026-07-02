'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { wornAvatar } from '@/lib/game/avatar';
import { Volume2, VolumeX, ArrowLeft, Heart, Compass } from 'lucide-react';
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
    EMERALD_MAP_W, EMERALD_MAP_H, EMERALD_TILE, EMERALD_TILES, EMERALD_VIEW_TILES,
    EMERALD_SPAWN, EMERALD_RELIC, EMERALD_MIRROR_CACHE, EMERALD_MIRROR_Y, EMERALD_TRUE_DOOR_ID,
    EMERALD_SHRINES, EMERALD_GALLERY_COLUMNS, EMERALD_GLYPHS, mirrorRow, freshEmeraldOrbs,
    hydrateEmeraldState, isEmeraldSolid, updateEmeraldProgress, emeraldDestinationStub,
    emeraldZoneLabel, emeraldWingId, emeraldDiscoveriesFromState, emeraldGuideStep,
    EMERALD_KEEPER_LINES, EMERALD_RESPAWN_LINE, EMERALD_MIRROR_LINES, EMERALD_HINT_DELAYS_SEC,
    EMERALD_MINIMAP_TERRAIN_COLORS, emeraldMinimapTerrain, emeraldMinimapGates, emeraldMinimapPois,
    type EmeraldLevelState,
} from '@/lib/game/emeraldLevel';

const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const MAX_DUNGEON_HP = 100;
const T = EMERALD_TILE;
const MIRROR_AXIS = EMERALD_MIRROR_Y * T; // pixel line the gallery reflects across

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

/** Bake the static tile layer once — walls, luminous floor, mirror-glass. */
function bakeEmeraldGround(): HTMLCanvasElement {
    const off = document.createElement('canvas');
    off.width = EMERALD_MAP_W * T;
    off.height = EMERALD_MAP_H * T;
    const ctx = off.getContext('2d')!;
    for (let r = 0; r < EMERALD_MAP_H; r++) {
        for (let c = 0; c < EMERALD_MAP_W; c++) {
            const cell = EMERALD_TILES[r][c];
            const x = c * T, y = r * T;
            const inMirror = r >= EMERALD_MIRROR_Y && r <= 25 && c >= 1 && c <= EMERALD_MAP_W - 2;
            if (cell === 1) {
                ctx.fillStyle = '#03150f';
                ctx.fillRect(x, y, T, T);
                ctx.fillStyle = '#0a2e22';
                ctx.fillRect(x, y, T, 2);
            } else if (inMirror) {
                // the Inverted Gallery's dark glass floor
                ctx.fillStyle = (c + r) % 2 === 0 ? '#02231b' : '#032a20';
                ctx.fillRect(x, y, T, T);
                const speck = (c * 29 + r * 13) % 97;
                if (speck > 88) {
                    ctx.fillStyle = 'rgba(167,243,208,0.25)';
                    ctx.fillRect(x + (speck % T), y + ((speck * 5) % T), 1, 1);
                }
            } else {
                ctx.fillStyle = (c + r) % 2 === 0 ? '#064e3b' : '#053f30';
                ctx.fillRect(x, y, T, T);
                if (cell === 3) {
                    ctx.fillStyle = '#0d9268';
                    ctx.beginPath();
                    ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 14, y + 8); ctx.lineTo(x + 8, y + 14); ctx.lineTo(x + 2, y + 8);
                    ctx.closePath(); ctx.fill();
                } else if (cell === 2) {
                    ctx.fillStyle = '#083b2e';
                    ctx.beginPath(); ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2); ctx.fill();
                }
            }
        }
    }
    return off;
}

export default function EmeraldWorld({
    character, isSolved, minigameDone = true, isGuardianCleared,
    onSolve, onClaim, onExit, onGuardianCleared, onDiscover, puzzleId, puzzleHint, accent = '#10b981',
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
    const [level, setLevel] = useState<EmeraldLevelState>(() => hydrateEmeraldState(character));
    const [zoneLabel, setZoneLabel] = useState('Antechamber of Smoke');
    const [nearAxiom, setNearAxiom] = useState<string | null>(null);
    const [shrineSeq, setShrineSeq] = useState<number[]>(() => {
        const solvedAlready = character.solved.includes('puz_emerald') || isSolved;
        return solvedAlready ? [0, 1, 2, 3, 4, 5, 6] : [];
    });
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_emerald_fragment'));
    const [activeFight, setActiveFight] = useState<string | null>(null);
    const [dialogue, setDialogue] = useState(
        isGuardianCleared
            ? 'The Guardian has unmade itself. The Fragment of the Emerald Tablet waits upon the throne.'
            : '【Hermes】 The last age. Smoke first, then clarity — read the axioms, trust the reflection, and walk awake.',
    );
    const [hintTier, setHintTier] = useState(0);
    const [showTrail, setShowTrail] = useState(false);
    const [playerPos, setPlayerPos] = useState({
        x: EMERALD_SPAWN.gx * T + 8,
        y: EMERALD_SPAWN.gy * T + 8,
    });
    const [exploredVersion, setExploredVersion] = useState(0);
    const exploredRef = useRef(exploredChunksFromDiscovered(character.discovered, 'emerald'));
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
    const wingsSeenRef = useRef(new Set(character.discovered.filter((d) => d.startsWith('emerald_wing_'))));
    const lastWingRef = useRef<string | null>(null);
    const guideStepIdRef = useRef('');
    const stuckSinceRef = useRef(Date.now());
    const hintTierRef = useRef(0);
    const fightWarnRef = useRef<Record<string, number>>({});
    const doorMsgAtRef = useRef<Record<string, number>>({});
    const dialoguePriorityRef = useRef(0);
    const swingTRef = useRef(0);
    const orbsRef = useRef(freshEmeraldOrbs());
    const orbHurtUntilRef = useRef(0);
    const shrineInsideRef = useRef(new Set<number>());
    const shrineSeqRef = useRef(shrineSeq);
    shrineSeqRef.current = shrineSeq;

    const throneOpen = level.throneOpen || isSolved;
    const baked = useMemo(() => bakeEmeraldGround(), []);

    const emeraldTerrain = useMemo(() => emeraldMinimapTerrain(), []);
    const minimapPois = useMemo(() => emeraldMinimapPois(level, {
        relicClaimed,
        shrinesLit: shrineSeq,
    }), [level, relicClaimed, shrineSeq]);
    const minimapGates = useMemo(() => emeraldMinimapGates(
        updateEmeraldProgress({ ...level, throneOpen }),
    ), [level, throneOpen]);
    const showMinimap = loadSettings().showMinimap;

    useEffect(() => {
        const explored = exploredChunksFromDiscovered(character.discovered, 'emerald');
        const toDiscover: string[] = [];
        for (const ch of initialRevealChunks(EMERALD_SPAWN.gx, EMERALD_SPAWN.gy, EMERALD_MAP_W, EMERALD_MAP_H)) {
            if (!explored.has(ch)) {
                explored.add(ch);
                const [cx, cy] = ch.split('_').map(Number);
                toDiscover.push(mapRevealKey('emerald', cx, cy));
            }
        }
        exploredRef.current = explored;
        if (toDiscover.length) onDiscover(toDiscover);
        setExploredVersion((v) => v + 1);
    }, [character.discovered, onDiscover]);

    const guideStep = useMemo(() => emeraldGuideStep({ ...level, throneOpen }, {
        isGuardianCleared,
        isSolved,
        minigameDone,
        relicClaimed,
        hasWeapon: !!character.equipped.weapon,
        shrinesLit: shrineSeq.length,
    }), [level, throneOpen, isGuardianCleared, isSolved, minigameDone, relicClaimed, character.equipped.weapon, shrineSeq.length]);

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
            for (let i = EMERALD_HINT_DELAYS_SEC.length - 1; i >= 0; i--) {
                if (elapsed >= EMERALD_HINT_DELAYS_SEC[i]) { tier = i + 1; break; }
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
        pax: EMERALD_SPAWN.gx * T + 8,
        pay: EMERALD_SPAWN.gy * T + 8,
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
        st.pax = EMERALD_SPAWN.gx * T + 8;
        st.pay = EMERALD_SPAWN.gy * T + 8;
        setDungeonHp(50);
        setGuideDialogue(`【Hermes】 ${EMERALD_RESPAWN_LINE}`, 3);
        sfx.defeat();
    }, [setGuideDialogue]);

    const resetShrineChain = useCallback((reason: string) => {
        setShrineSeq([]);
        setDialogue(reason);
        sfx.defeat();
    }, []);

    const touchShrine = useCallback((shrineId: number) => {
        if (level.throneOpen || isSolved) return;
        const seq = shrineSeqRef.current;
        if (seq.includes(shrineId)) return;
        const expected = seq.length;
        if (shrineId !== expected) {
            resetShrineChain(expected === 0
                ? 'The sphere flares and dies. Begin with Saturn — the highest, slowest wanderer.'
                : 'The alignment snaps! The chain breaks back to Saturn. Slowest to swiftest.');
            return;
        }
        if (expected === 6 && !minigameDone) {
            // FIX: the seventh sphere must not light while the Records trial is unpassed.
            setDialogue('The Moon refuses an untested hand. Pass the Trial of the Seven Spheres in Records — then return.');
            sfx.hit();
            return;
        }
        sfx.strike();
        const next = [...seq, shrineId];
        setShrineSeq(next);
        const s = EMERALD_SHRINES[shrineId];
        setDialogue(`The ${s.name} sphere kindles (${next.length}/7). The orbit path forms.`);
        if (next.length === 7) {
            setLevel((prev) => {
                const upd = updateEmeraldProgress({ ...prev, throneOpen: true });
                onDiscover(emeraldDiscoveriesFromState(upd));
                return upd;
            });
            onSolve();
            setDialogue('The seven wanderers blaze as one sentence! Across the Orrery, the throne door grinds open.');
            sfx.victory();
            gameMusic.playCue('rivers_converge');
        }
    }, [level.throneOpen, isSolved, minigameDone, resetShrineChain, onDiscover, onSolve]);

    const markFightCleared = useCallback((fightId: string, combatId: string) => {
        setLevel((prev) => {
            const next = updateEmeraldProgress({
                ...prev,
                fights: prev.fights.map((f) => (f.id === fightId ? { ...f, cleared: true } : f)),
            });
            onDiscover(emeraldDiscoveriesFromState(next));
            if (combatId === 'emerald_boss') onGuardianCleared();
            return next;
        });
        fightTriggeredRef.current = null;
        setActiveFight(null);
        setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + 20));
    }, [onGuardianCleared, onDiscover]);

    const readAxiom = useCallback((stoneId: string) => {
        const stone = level.axioms.find((s) => s.id === stoneId);
        if (!stone || stone.read) return;
        setLevel((prev) => {
            const next = {
                ...prev,
                axioms: prev.axioms.map((s) => (s.id === stoneId ? { ...s, read: true } : s)),
            };
            onDiscover(emeraldDiscoveriesFromState(next));
            return next;
        });
        setDialogue(`【${stone.title}】 ${stone.text}`);
        sfx.hit();
    }, [level, onDiscover]);

    const isSolid = useCallback((gx: number, gy: number) => {
        return isEmeraldSolid(gx, gy, { ...level, throneOpen });
    }, [level, throneOpen]);

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

        const motes: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
        for (let i = 0; i < 26; i++) {
            motes.push({
                x: Math.random() * EMERALD_MAP_W * T,
                y: Math.random() * EMERALD_MAP_H * T,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: 0.5 + Math.random(),
                alpha: 0.1 + Math.random() * 0.25,
            });
        }
        // heavier smoke wisps confined to the Antechamber of Smoke
        const smoke: { x: number; y: number; vx: number; r: number; alpha: number }[] = [];
        for (let i = 0; i < 12; i++) {
            smoke.push({
                x: (1 + Math.random() * 42) * T,
                y: (27.5 + Math.random() * 6.5) * T,
                vx: 3 + Math.random() * 5,
                r: 8 + Math.random() * 12,
                alpha: 0.04 + Math.random() * 0.07,
            });
        }

        function resize() {
            if (!canvas.parentElement) return;
            const size = Math.min(canvas.parentElement.clientWidth || 400, 520);
            canvas.width = size;
            canvas.height = size;
            Z = size / (EMERALD_VIEW_TILES * T);
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
                const ngx = Math.floor(nx / T);
                if (!isSolid(ngx, Math.floor(state.pay / T))) state.pax = nx;
                const ny = state.pay + iy * 76 * dt;
                const ngy = Math.floor(ny / T);
                if (!isSolid(Math.floor(state.pax / T), ngy)) state.pay = ny;
            }

            const pgx = Math.floor(state.pax / T);
            const pgy = Math.floor(state.pay / T);

            if (now - mapSyncRef.current.lastAt > 80) {
                mapSyncRef.current.lastAt = now;
                const added = newRevealDiscoveries('emerald', pgx, pgy, exploredRef.current, EMERALD_MAP_W, EMERALD_MAP_H);
                if (added.length) {
                    onDiscover(added);
                    setExploredVersion((v) => v + 1);
                }
                setPlayerPos({ x: state.pax, y: state.pay });
            }

            const zl = emeraldZoneLabel(pgx, pgy);
            if (zl) setZoneLabel(zl);

            const wingId = emeraldWingId(pgx, pgy);
            if (wingId && wingId !== lastWingRef.current) {
                lastWingRef.current = wingId;
                const discId = `emerald_${wingId}`;
                if (!wingsSeenRef.current.has(discId)) {
                    wingsSeenRef.current.add(discId);
                    onDiscover([discId]);
                    setDialogue(`【Hermes】 ${EMERALD_KEEPER_LINES[wingId]}`);
                }
            }

            // —— axiom proximity ——
            let closestAxiom: string | null = null;
            let closestAxiomD = Infinity;
            for (const ls of level.axioms) {
                const d = Math.hypot(ls.gx * T + 8 - state.pax, ls.gy * T + 8 - state.pay);
                if (d < 22 && d < closestAxiomD) { closestAxiomD = d; closestAxiom = ls.id; }
            }
            if (closestAxiom !== nearAxiom) setNearAxiom(closestAxiom);

            // —— smoke vents: step damage (or strike-disarm below) ——
            for (const v of level.vents) {
                if (v.tripped || touchedRef.current.has(`vent_${v.id}`)) continue;
                if (pgx === v.gx && pgy === v.gy) {
                    touchedRef.current.add(`vent_${v.id}`);
                    setLevel((prev) => {
                        const next = { ...prev, vents: prev.vents.map((x) => (x.id === v.id ? { ...x, tripped: true } : x)) };
                        onDiscover(emeraldDiscoveriesFromState(next));
                        return next;
                    });
                    sfx.bossSpawn();
                    setDungeonHp((hp) => {
                        const next = hp - 6;
                        if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
                        return next;
                    });
                    setGuideDialogue('A vent of emerald smoke sears you — it gutters out. Strike vents from a step away to seal them safely.', 2);
                }
            }

            // —— health pickups ——
            for (const pk of level.pickups) {
                if (pk.collected || touchedRef.current.has(pk.id)) continue;
                if (Math.hypot(pk.gx * T + 8 - state.pax, pk.gy * T + 8 - state.pay) < 14) {
                    touchedRef.current.add(pk.id);
                    setLevel((prev) => {
                        const next = { ...prev, pickups: prev.pickups.map((p) => (p.id === pk.id ? { ...p, collected: true } : p)) };
                        onDiscover(emeraldDiscoveriesFromState(next));
                        return next;
                    });
                    setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + pk.amount));
                    sfx.pickup();
                    setDialogue(`Vitality restored · +${pk.amount}`);
                }
            }

            // —— chests ——
            for (const ch of level.chests) {
                if (ch.opened || touchedRef.current.has(ch.id)) continue;
                if (Math.hypot(ch.gx * T + 8 - state.pax, ch.gy * T + 8 - state.pay) < 18) {
                    touchedRef.current.add(ch.id);
                    setLevel((prev) => {
                        const next = { ...prev, chests: prev.chests.map((c) => (c.id === ch.id ? { ...c, opened: true } : c)) };
                        onDiscover(emeraldDiscoveriesFromState(next));
                        return next;
                    });
                    setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + ch.health));
                    setDialogue(`${ch.label} — +${ch.health} vitality.`);
                    sfx.pickup();
                }
            }

            // —— cosmic shards (persist once-collected) ——
            for (const node of level.nodes) {
                if (node.collected || touchedRef.current.has(node.id)) continue;
                if (Math.hypot(node.gx * T + 8 - state.pax, node.gy * T + 8 - state.pay) < 12) {
                    touchedRef.current.add(node.id);
                    setLevel((prev) => {
                        const next = { ...prev, nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, collected: true } : n)) };
                        onDiscover(emeraldDiscoveriesFromState(next));
                        return next;
                    });
                    addMaterial('cosmic', 1);
                    sfx.pickup();
                    setDialogue('A Cosmic Shard — rare celestial glass Hana can forge with.');
                }
            }

            // —— mirror-only secret cache ——
            if (!level.mirrorSecretFound && !touchedRef.current.has('secret_mirror')) {
                if (Math.hypot(EMERALD_MIRROR_CACHE.gx * T + 8 - state.pax, EMERALD_MIRROR_CACHE.gy * T + 8 - state.pay) < 14) {
                    touchedRef.current.add('secret_mirror');
                    setLevel((prev) => {
                        const next = { ...prev, mirrorSecretFound: true };
                        onDiscover(emeraldDiscoveriesFromState(next));
                        return next;
                    });
                    grantSkillPoint();
                    setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + 20));
                    setDialogue(`${EMERALD_MIRROR_LINES.secret} (+20 vitality · +1 skill point)`);
                    sfx.victory();
                }
            }

            // —— doors: the true arch opens on approach; sealed ones speak ——
            for (const d of level.doors) {
                const dist = Math.hypot(d.gx * T + 8 - state.pax, d.gy * T + 8 - state.pay);
                if (dist >= 22) continue;
                if (d.kind === 'true' && !level.trueDoorFound) {
                    setLevel((prev) => {
                        const next = updateEmeraldProgress({ ...prev, trueDoorFound: true });
                        onDiscover(emeraldDiscoveriesFromState(next));
                        return next;
                    });
                    setDialogue(EMERALD_MIRROR_LINES.trueDoor);
                    sfx.strike();
                } else if (d.kind === 'false') {
                    const fz = level.fights.find((f) => f.gx === d.gx && f.gy === d.gy);
                    if (fz?.cleared && (doorMsgAtRef.current[d.id] ?? 0) < now - 6000) {
                        doorMsgAtRef.current[d.id] = now;
                        setGuideDialogue(EMERALD_MIRROR_LINES.falseDoorSealed, 1);
                    }
                } else if (d.kind === 'throne' && !throneOpen && (doorMsgAtRef.current[d.id] ?? 0) < now - 6000) {
                    doorMsgAtRef.current[d.id] = now;
                    setGuideDialogue('【Hermes】 The throne door answers only the seven spheres, sung in order.', 1);
                }
            }

            // —— astral orbs: knockback, -8 vitality, chain reset ——
            if (pgy <= 14 && pgx <= 30) {
                for (const o of orbsRef.current) {
                    const ox = o.cx + Math.cos(o.angle) * o.radius;
                    const oy = o.cy + Math.sin(o.angle) * o.radius;
                    if (now < orbHurtUntilRef.current) continue;
                    if (Math.hypot(ox - state.pax, oy - state.pay) < 13) {
                        orbHurtUntilRef.current = now + 900;
                        sfx.hurt();
                        const dx = state.pax - ox, dy = state.pay - oy;
                        const dl = Math.hypot(dx, dy) || 1;
                        const nx = state.pax + (dx / dl) * 34;
                        const ny = state.pay + (dy / dl) * 34;
                        if (!isSolid(Math.floor(nx / T), Math.floor(state.pay / T))) state.pax = nx;
                        if (!isSolid(Math.floor(state.pax / T), Math.floor(ny / T))) state.pay = ny;
                        setDungeonHp((hp) => {
                            const next = hp - 8;
                            if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
                            return next;
                        });
                        if (!level.throneOpen && !isSolved && shrineSeqRef.current.length > 0) {
                            resetShrineChain('The burning orbit strikes you — the chain of wanderers shatters back to Saturn.');
                        } else {
                            setGuideDialogue('The burning orbit sears you. Watch its rhythm and cross behind it.', 2);
                        }
                    }
                }
            }
            for (const o of orbsRef.current) o.angle += o.speed * dt;

            // —— shrines: enter-edge touch, Chaldean order ——
            for (const s of EMERALD_SHRINES) {
                const inside = Math.hypot(s.gx * T + 8 - state.pax, s.gy * T + 8 - state.pay) < 12;
                const was = shrineInsideRef.current.has(s.id);
                if (inside && !was) { shrineInsideRef.current.add(s.id); touchShrine(s.id); }
                if (!inside && was) shrineInsideRef.current.delete(s.id);
            }

            // —— fight zones ——
            for (const fz of level.fights) {
                if (fz.cleared || fightTriggeredRef.current === fz.id || fz.radius <= 0) continue;
                const dist = Math.hypot(fz.gx * T + 8 - state.pax, fz.gy * T + 8 - state.pay);
                if (dist >= fz.radius + 8) { delete fightWarnRef.current[fz.id]; continue; }
                if (dist < fz.radius) {
                    if (!character.equipped.weapon) {
                        setGuideDialogue('Arm yourself at Truth\'s Hut before facing the thought-forms.', 2);
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

            // —— strike: swing + vent disarm ——
            if (swingTRef.current > 0) swingTRef.current -= dt;
            const forceSwing = attackRef.current || keysRef.current.has('j') || keysRef.current.has(' ');
            if (forceSwing && swingTRef.current <= 0) {
                swingTRef.current = 0.35;
                sfx.strike();
                for (const v of level.vents) {
                    if (v.tripped || touchedRef.current.has(`vent_${v.id}`)) continue;
                    if (Math.hypot(v.gx * T + 8 - state.pax, v.gy * T + 8 - state.pay) < 24 && !(pgx === v.gx && pgy === v.gy)) {
                        touchedRef.current.add(`vent_${v.id}`);
                        setLevel((prev) => {
                            const next = { ...prev, vents: prev.vents.map((x) => (x.id === v.id ? { ...x, tripped: true } : x)) };
                            onDiscover(emeraldDiscoveriesFromState(next));
                            return next;
                        });
                        setDialogue('You strike the vent shut. The emerald smoke sighs and dies.');
                        sfx.hit();
                    }
                }
                attackRef.current = false;
            }

            // —— relic claim: on the throne, after the Guardian falls ——
            if (level.bossFelled && throneOpen && !relicClaimed) {
                const rx = EMERALD_RELIC.gx * T + 8;
                const ry = EMERALD_RELIC.gy * T + 8;
                if (Math.hypot(rx - state.pax, ry - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue('You claim the Fragment of the Emerald Tablet. Green glass that holds light after the room goes dark.');
                    sfx.hit();
                    gameMusic.playSting('relic_claim', Math.random() < 0.4 ? 'alt' : 'main');
                }
            }

            // ---- render ----
            const camX = state.pax - (EMERALD_VIEW_TILES * T) / 2;
            const camY = state.pay - (EMERALD_VIEW_TILES * T) / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(Z, Z);
            ctx.translate(-camX + (canvas.width / Z - EMERALD_VIEW_TILES * T) / 2, -camY + (canvas.height / Z - EMERALD_VIEW_TILES * T) / 2);

            ctx.drawImage(baked, 0, 0);

            // —— THE INVERTED GALLERY: reflection pass on the dark glass ——
            ctx.save();
            ctx.beginPath();
            ctx.rect(1 * T, EMERALD_MIRROR_Y * T, (EMERALD_MAP_W - 2) * T, 5 * T);
            ctx.clip();
            const shimmerA = 0.3 + Math.sin(state.t / 900) * 0.05;
            // mirrored gallery columns
            ctx.globalAlpha = shimmerA;
            for (const [cx, cy] of EMERALD_GALLERY_COLUMNS) {
                const my = mirrorRow(cy);
                ctx.fillStyle = '#0f5f46';
                ctx.fillRect(cx * T + 3, my * T + 2, 10, 12);
                ctx.fillStyle = '#1a8563';
                ctx.fillRect(cx * T + 5, my * T + 4, 6, 8);
            }
            // mirrored glyph pedestals — only the reflection tells the truth
            for (const gl of EMERALD_GLYPHS) {
                const my = mirrorRow(gl.gy);
                ctx.fillStyle = '#0f5f46';
                ctx.fillRect(gl.gx * T + 3, my * T + 2, 10, 12);
                if (gl.doorId === EMERALD_TRUE_DOOR_ID) {
                    const pulse = 0.65 + Math.sin(state.t / 240) * 0.35;
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = '#6ee7b7';
                    ctx.font = 'bold 9px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('▲', gl.gx * T + 8, my * T + 12);
                    ctx.globalAlpha = shimmerA;
                } else {
                    ctx.fillStyle = '#134e3a';
                    ctx.font = 'bold 9px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('▽', gl.gx * T + 8, my * T + 12);
                }
            }
            // the cache that exists only in the reflection
            if (!level.mirrorSecretFound) {
                const cShimmer = 0.25 + Math.sin(state.t / 300) * 0.2;
                ctx.globalAlpha = cShimmer;
                ctx.fillStyle = '#6ee7b7';
                const cx = EMERALD_MIRROR_CACHE.gx * T, cy = EMERALD_MIRROR_CACHE.gy * T;
                ctx.beginPath();
                ctx.moveTo(cx + 8, cy + 3); ctx.lineTo(cx + 13, cy + 8); ctx.lineTo(cx + 8, cy + 13); ctx.lineTo(cx + 3, cy + 8);
                ctx.closePath(); ctx.fill();
            }
            // the initiate's own reflection, when they walk the upper gallery
            if (state.pay >= 16 * T && state.pay < MIRROR_AXIS) {
                const curKeyR = JSON.stringify(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
                if (curKeyR !== avatarKey) { avatarKey = curKeyR; avatarFrames = buildFrames(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing)); }
                const wphaseR = Math.floor(state.walkT * 7) % 2;
                const framesR = avatarFrames[state.facing];
                const frameR = moving ? framesR[wphaseR === 0 ? 1 : 2] : framesR[0];
                ctx.globalAlpha = 0.28;
                ctx.save();
                ctx.translate(state.pax, 2 * MIRROR_AXIS - state.pay);
                ctx.scale(1, -1);
                ctx.drawImage(frameR, -8, -19, 16, 24);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.restore();

            // upper-gallery glyph pedestals: blank tablets (the wall lies)
            for (const gl of EMERALD_GLYPHS) {
                ctx.fillStyle = '#0b4232';
                ctx.fillRect(gl.gx * T + 3, gl.gy * T + 2, 10, 12);
                ctx.fillStyle = '#0f5f46';
                ctx.fillRect(gl.gx * T + 5, gl.gy * T + 4, 6, 8);
            }

            // —— doors ——
            for (const d of level.doors) {
                const open = d.kind === 'true' ? level.trueDoorFound : d.kind === 'throne' ? throneOpen : false;
                if (open) {
                    ctx.fillStyle = 'rgba(110,231,183,0.28)';
                    ctx.fillRect(d.gx * T, d.gy * T, T, T);
                } else {
                    ctx.fillStyle = '#0b4232';
                    ctx.fillRect(d.gx * T, d.gy * T, T, T);
                    ctx.fillStyle = d.kind === 'throne' ? '#fbbf24' : '#10b981';
                    ctx.fillRect(d.gx * T + 5, d.gy * T + 4, 6, 8);
                    const fz = level.fights.find((f) => f.gx === d.gx && f.gy === d.gy);
                    if (d.kind === 'false' && fz?.cleared) {
                        ctx.strokeStyle = '#022c22';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(d.gx * T + 4, d.gy * T + 3); ctx.lineTo(d.gx * T + 9, d.gy * T + 9); ctx.lineTo(d.gx * T + 6, d.gy * T + 13);
                        ctx.stroke();
                    }
                }
            }

            // —— vents ——
            for (const v of level.vents) {
                if (v.tripped) {
                    ctx.fillStyle = 'rgba(13,148,136,0.18)';
                    ctx.beginPath(); ctx.arc(v.gx * T + 8, v.gy * T + 8, 5, 0, Math.PI * 2); ctx.fill();
                } else {
                    const pulse = 0.35 + Math.sin(state.t / 260 + v.gx) * 0.2;
                    ctx.fillStyle = `rgba(45,212,191,${pulse})`;
                    ctx.beginPath(); ctx.arc(v.gx * T + 8, v.gy * T + 8, 5 + Math.sin(state.t / 200) * 1.2, 0, Math.PI * 2); ctx.fill();
                }
            }

            // —— axiom stones ——
            for (const ls of level.axioms) {
                const pulse = 0.5 + Math.sin(state.t / 300 + ls.gx) * 0.2;
                ctx.fillStyle = ls.read ? 'rgba(52,211,153,0.35)' : `rgba(251,191,36,${pulse})`;
                ctx.fillRect(ls.gx * T + 3, ls.gy * T + 2, 10, 12);
                ctx.fillStyle = ls.read ? '#34d399' : '#fcd34d';
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('◆', ls.gx * T + 8, ls.gy * T + 11);
            }

            // —— chests ——
            for (const ch of level.chests) {
                if (ch.opened) continue;
                ctx.fillStyle = '#065f46';
                ctx.fillRect(ch.gx * T + 2, ch.gy * T + 4, 12, 10);
                ctx.fillStyle = '#6ee7b7';
                ctx.fillRect(ch.gx * T + 4, ch.gy * T + 2, 8, 4);
            }

            // —— pickups ——
            for (const pk of level.pickups) {
                if (pk.collected) continue;
                const bob = Math.sin(state.t / 200 + pk.gx) * 2;
                const px = pk.gx * T + 8, py = pk.gy * T + 8 + bob;
                ctx.fillStyle = '#f8717188';
                ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fecaca';
                ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
            }

            // —— cosmic shards ——
            for (const node of level.nodes) {
                if (node.collected) continue;
                const bob = Math.sin((state.t + node.gx * 500) / 200) * 2;
                ctx.save();
                ctx.shadowColor = '#d946ef';
                ctx.shadowBlur = 6;
                ctx.fillStyle = '#f472b6';
                ctx.beginPath();
                ctx.moveTo(node.gx * T + 8, node.gy * T + 4 + bob);
                ctx.lineTo(node.gx * T + 12, node.gy * T + 10 + bob);
                ctx.lineTo(node.gx * T + 8, node.gy * T + 14 + bob);
                ctx.lineTo(node.gx * T + 4, node.gy * T + 10 + bob);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // —— constellation chain ——
            if (shrineSeqRef.current.length > 1) {
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                shrineSeqRef.current.forEach((id, i) => {
                    const s = EMERALD_SHRINES[id];
                    if (i === 0) ctx.moveTo(s.gx * T + 8, s.gy * T + 8);
                    else ctx.lineTo(s.gx * T + 8, s.gy * T + 8);
                });
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // —— shrines ——
            for (const s of EMERALD_SHRINES) {
                const lit = shrineSeqRef.current.includes(s.id) || throneOpen;
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(s.gx * T + 8, s.gy * T + 8, 4.5, 0, Math.PI * 2);
                ctx.fill();
                if (lit) {
                    ctx.shadowColor = s.color;
                    ctx.shadowBlur = 8;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(s.gx * T + 8, s.gy * T + 8, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(s.gx * T + 8, s.gy * T + 8, 8 + Math.sin(state.t / 200) * 1.5, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // —— astral orbs ——
            for (const o of orbsRef.current) {
                const ox = o.cx + Math.cos(o.angle) * o.radius;
                const oy = o.cy + Math.sin(o.angle) * o.radius;
                const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 12);
                og.addColorStop(0, '#10b981');
                og.addColorStop(0.5, 'rgba(52,211,153,0.4)');
                og.addColorStop(1, 'rgba(52,211,153,0)');
                ctx.fillStyle = og;
                ctx.beginPath(); ctx.arc(ox, oy, 12, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI * 2); ctx.fill();
            }

            // —— the Fragment upon the throne ——
            ctx.fillStyle = '#0b4232';
            ctx.fillRect(EMERALD_RELIC.gx * T + 2, EMERALD_RELIC.gy * T + 2, 12, 12);
            ctx.fillStyle = '#0f5f46';
            ctx.fillRect(EMERALD_RELIC.gx * T + 4, EMERALD_RELIC.gy * T + 4, 8, 8);
            if (level.bossFelled && throneOpen && !relicClaimed) {
                const bounce = Math.sin(state.t / 150) * 2;
                ctx.save();
                ctx.shadowColor = '#34d399';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#34d399';
                ctx.beginPath();
                ctx.moveTo(EMERALD_RELIC.gx * T + 8, EMERALD_RELIC.gy * T + 3 + bounce);
                ctx.lineTo(EMERALD_RELIC.gx * T + 12, EMERALD_RELIC.gy * T + 11 + bounce);
                ctx.lineTo(EMERALD_RELIC.gx * T + 4, EMERALD_RELIC.gy * T + 11 + bounce);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // —— waypoint trail ——
            const wp = guideStep.waypoint;
            if (wp) {
                const wx = wp.gx * T + 8;
                const wy = wp.gy * T + 8;
                const pulse = 0.5 + Math.sin(state.t / 260) * 0.4;
                const trailA = showTrail || hintTier > 0 ? 0.55 : 0.2;
                ctx.strokeStyle = `rgba(52,211,153,${trailA * (0.45 + pulse * 0.35)})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 6]);
                if (showTrail || hintTier > 0) {
                    ctx.beginPath();
                    ctx.moveTo(state.pax, state.pay);
                    ctx.lineTo(wx, wy);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
                ctx.fillStyle = `rgba(52,211,153,${(showTrail || hintTier > 0 ? 0.55 : 0.28) * (0.5 + pulse * 0.35)})`;
                ctx.beginPath();
                ctx.arc(wx, wy, 5 + pulse * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // —— fight circles ——
            for (const fz of level.fights) {
                if (fz.cleared || fz.radius <= 0) continue;
                ctx.strokeStyle = fz.combatId === 'emerald_boss' ? '#ef444466' : '#fbbf2466';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(fz.gx * T + 8, fz.gy * T + 8, fz.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // —— motes + antechamber smoke ——
            motes.forEach((m) => {
                m.x += m.vx * dt;
                m.y += m.vy * dt;
                if (m.x < 0) m.x = EMERALD_MAP_W * T;
                if (m.x > EMERALD_MAP_W * T) m.x = 0;
                if (m.y < 0) m.y = EMERALD_MAP_H * T;
                if (m.y > EMERALD_MAP_H * T) m.y = 0;
                ctx.save();
                ctx.globalAlpha = m.alpha;
                ctx.fillStyle = '#a7f3d0';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
            smoke.forEach((s) => {
                s.x += s.vx * dt;
                if (s.x > 43 * T) s.x = T;
                ctx.save();
                ctx.globalAlpha = s.alpha * (0.8 + Math.sin(state.t / 700 + s.r) * 0.2);
                ctx.fillStyle = '#34d399';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            if (swingTRef.current > 0) {
                ctx.strokeStyle = `rgba(52,211,153,${swingTRef.current / 0.35})`;
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

            // luminous vignette — the halls glow, the edges do not
            ctx.save();
            ctx.fillStyle = 'black';
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
            const gradient = ctx.createRadialGradient(
                state.pax * Z, (state.pay - 10) * Z, 0,
                state.pax * Z, (state.pay - 10) * Z, 62 * Z,
            );
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(0.65, 'rgba(0,0,0,0.82)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(state.pax * Z, (state.pay - 10) * Z, 62 * Z, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, [activeFight, level, isSolved, minigameDone, relicClaimed, isSolid, onClaim, consumeFightBonusHp, onDiscover, nearAxiom, grantSkillPoint, character.equipped.weapon, guideStep, showTrail, hintTier, setGuideDialogue, throneOpen, addMaterial, softRespawn, touchShrine, resetShrineChain, baked]);

    const handleAction = () => {
        if (nearAxiom) {
            readAxiom(nearAxiom);
            return;
        }
        attackRef.current = true;
    };

    const activeFightZone = level.fights.find((f) => f.id === fightTriggeredRef.current && !f.cleared);
    const fightDest = activeFight ? emeraldDestinationStub(activeFight) : null;

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
                            setDialogue('The thought-forms overwhelm you. Rest, gather vitality, and return.');
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
                    <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 block">The Emerald Halls</span>
                    <span className="text-[8px] uppercase tracking-widest text-zinc-500 block truncate">{zoneLabel}</span>
                </div>
                <button onClick={toggleMute} className="text-zinc-400 hover:text-white">{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
            </div>

            <div className="w-full max-w-[520px] mb-2 space-y-1.5">
                <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <div className="flex-1 h-2.5 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(dungeonHp / MAX_DUNGEON_HP) * 100}%`, background: dungeonHp > 35 ? '#10b981' : '#ef4444' }} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 w-14 text-right">{dungeonHp}/{MAX_DUNGEON_HP}</span>
                </div>
                {shrineSeq.length > 0 && !throneOpen && (
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-emerald-400/90">
                        ✦ {shrineSeq.map((id) => EMERALD_SHRINES[id].name).join(' · ')}
                    </div>
                )}
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/15 bg-emerald-950/40 px-2.5 py-2">
                    <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300/90">{guideStep.objective}</p>
                        <p className="text-[8px] text-zinc-500 leading-snug mt-0.5">{guideStep.tip}</p>
                        {hintTier > 0 && (
                            <p className="text-[7px] uppercase tracking-widest text-amber-400/70 mt-1 animate-pulse">Hermes hint · follow the emerald trail</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative border-4 border-emerald-600/40 rounded-2xl overflow-hidden bg-emerald-950 shadow-inner w-full max-w-[520px]">
                <canvas ref={canvasRef} className="block w-full aspect-square" />
                {showMinimap && !activeFight && (
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                        <DestinationMinimap
                            label="Emerald"
                            mapW={EMERALD_MAP_W}
                            mapH={EMERALD_MAP_H}
                            terrain={emeraldTerrain}
                            terrainColors={EMERALD_MINIMAP_TERRAIN_COLORS}
                            explored={exploredRef.current}
                            exploredVersion={exploredVersion}
                            playerX={playerPos.x}
                            playerY={playerPos.y}
                            tileSize={EMERALD_TILE}
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
                <div className="w-full max-w-[520px] mt-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/45 text-center">
                    <p className="font-ritual text-sm leading-relaxed text-zinc-200">{dialogue}</p>
                </div>
            )}

            <DestinationControlPad
                profile={profile}
                joy={joy}
                joyRadius={joyR}
                accent="rgba(16, 185, 129, 0.65)"
                actionLabel={nearAxiom ? 'Read' : 'Strike'}
                actionDisabled={!nearAxiom && !character.equipped.weapon}
                onAction={handleAction}
                hint="◆ read axioms · the reflection marks the true arch · spheres Saturn→Moon · strike vents shut"
            />
        </div>
    );
}
