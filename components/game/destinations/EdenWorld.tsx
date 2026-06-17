'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { ArrowLeft, Heart, Key, Volume2, VolumeX } from 'lucide-react';
import { sfx, isMuted, setMuted } from '@/lib/game/sfx';
import { gameMusic } from '@/lib/game/music';
import CombatScene from '@/components/game/CombatScene';
import { skillBonuses } from '@/lib/game/paths';
import { pathCombatMods } from '@/lib/game/pathPowers';
import { combatRelicBonuses } from '@/lib/game/resonance';
import { founderBonuses } from '@/lib/game/founders';
import { clothingBonus } from '@/lib/game/clothing';
import { WEAPON_BY_ID } from '@/lib/game/weapons';
import WorldControlPad from '@/components/game/controls/WorldControlPad';
import WorldDialogueBox from '@/components/game/WorldDialogueBox';
import { useInputProfile, useIsDesktopLayout } from '@/components/game/controls/useInputProfile';
import { useJoystick } from '@/components/game/controls/useJoystick';
import { joyRadius, MOBILE_JOY_R } from '@/lib/game/controls';
import { loadSettings } from '@/lib/game/settings';
import { buildEdenOverworld } from '@/lib/game/edenOverworld';
import {
    EDEN_MAP_W, EDEN_MAP_H, EDEN_TILE, EDEN_SPAWN, EDEN_TREE, EDEN_RIVERS, EDEN_GARDENER,
    hydrateEdenState, isEdenSolid, updateEdenProgress, edenDestinationStub,
    edenZoneLabel, edenDiscoveriesFromState, edenWingId, canRevealEdenSecret, edenGuideStep,
    EDEN_GARDENER_LINES, EDEN_RESPAWN_LINE, EDEN_TEMPTATION, EDEN_TEMPTATION_SHORTCUT, EDEN_SERPENT_LINES,
    type EdenLevelState,
} from '@/lib/game/edenLevel';

const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const SHADE_TILE = { col: 0, row: 3 };
const MAX_DUNGEON_HP = 100;

function clamp(v: number, lo: number, hi: number) {
    return v < lo ? lo : v > hi ? hi : v;
}

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
    onOpenRecords?: () => void;
    puzzleId?: string;
    puzzleHint?: string;
    accent?: string;
}

interface NearTarget {
    kind: 'lore' | 'read' | 'none';
    label: string;
}

export default function EdenWorld({
    character, isSolved, minigameDone = true, isGuardianCleared,
    onSolve, onClaim, onExit, onGuardianCleared, onDiscover, onOpenRecords,
}: Props) {
    const founderNumber = useGameStore((s) => s.founderNumber);
    const consumeFightBonusHp = useGameStore((s) => s.consumeFightBonusHp);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const [muted, setMutedState] = useState(isMuted());
    const [dungeonHp, setDungeonHp] = useState(MAX_DUNGEON_HP);
    const [level, setLevel] = useState<EdenLevelState>(() => hydrateEdenState(character));
    const [zoneLabel, setZoneLabel] = useState('The Threshold');
    const [near, setNear] = useState<NearTarget | null>(null);
    const [nearLore, setNearLore] = useState<string | null>(null);
    const [nearTemptation, setNearTemptation] = useState(false);
    const [sequence, setSequence] = useState<number[]>([]);
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_eden_leaf'));
    const [activeFight, setActiveFight] = useState<string | null>(null);
    const [dialogue, setDialogue] = useState<{ speaker: string; text: string; color?: string } | null>(
        isGuardianCleared
            ? { speaker: 'The Gardener', text: 'The cherub has fallen. Attune the four rivers and claim the Leaf — the hour before the lie.', color: '#34d399' }
            : { speaker: 'The Gardener', text: 'Welcome back. Roam the open garden — read the golden stones, clear the shades, and walk north to the Tree.', color: '#34d399' },
    );
    const [barrierActive, setBarrierActive] = useState(!isSolved);

    const profile = useInputProfile();
    const isDesktop = useIsDesktopLayout();
    const joyR = joyRadius(profile, loadSettings().controlSize === 'large') || MOBILE_JOY_R;
    const joy = useJoystick(joyR);
    const joyRef = joy.joyRef;
    const keysRef = useRef<Set<string>>(new Set());
    const fightTriggeredRef = useRef<string | null>(null);
    const fightBonusRef = useRef(0);
    const touchedRef = useRef(new Set<string>());
    const wingsSeenRef = useRef(new Set(character.discovered.filter((d) => d.startsWith('eden_wing_'))));
    const lastWingRef = useRef<string | null>(null);
    const riverParticlesRef = useRef<{ ox: number; oy: number; tx: number; ty: number; color: string; t: number; speed: number }[]>([]);
    const ambientRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);
    const temptOfferShownRef = useRef(false);
    const fightWarnRef = useRef<Record<string, number>>({});
    const levelRef = useRef(level);
    levelRef.current = level;
    const barrierRef = useRef(barrierActive);
    barrierRef.current = barrierActive;

    const guideStep = useMemo(() => edenGuideStep(level, {
        isGuardianCleared, isSolved, minigameDone, barrierActive, relicClaimed,
        hasWeapon: !!character.equipped.weapon, riversLit: sequence.length,
    }), [level, isGuardianCleared, isSolved, minigameDone, barrierActive, relicClaimed, character.equipped.weapon, sequence.length]);

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
        const st = gameStateRef.current;
        st.px = (EDEN_SPAWN.gx + 0.5) * EDEN_TILE;
        st.py = (EDEN_SPAWN.gy + 0.5) * EDEN_TILE;
        setDungeonHp(50);
        setDialogue({ speaker: 'The Gardener', text: EDEN_RESPAWN_LINE, color: '#34d399' });
        sfx.defeat();
    }, []);

    const gameStateRef = useRef({
        px: (EDEN_SPAWN.gx + 0.5) * EDEN_TILE,
        py: (EDEN_SPAWN.gy + 0.5) * EDEN_TILE,
        walkT: 0,
        facing: 'down' as 'down' | 'up' | 'left' | 'right',
        t: 0,
        rivers: EDEN_RIVERS.map((r) => ({ ...r, active: false })),
        shades: [
            { x: 20 * EDEN_TILE, y: 34 * EDEN_TILE, vx: 14, vy: -10, fightId: 'fight_1' },
            { x: 42 * EDEN_TILE, y: 28 * EDEN_TILE, vx: -12, vy: 11, fightId: 'fight_2' },
            { x: 40 * EDEN_TILE, y: 16 * EDEN_TILE, vx: 10, vy: 13, fightId: 'fight_3' },
        ],
    });

    const acceptTemptation = useCallback(() => {
        if (level.temptationResolved !== 'none') return;
        const st = gameStateRef.current;
        st.px = (EDEN_TEMPTATION_SHORTCUT.gx + 0.5) * EDEN_TILE;
        st.py = (EDEN_TEMPTATION_SHORTCUT.gy + 0.5) * EDEN_TILE;
        setLevel((prev) => {
            const next = { ...prev, temptationResolved: 'accepted' as const };
            onDiscover(edenDiscoveriesFromState(next));
            return next;
        });
        setNearTemptation(false);
        setDialogue({ speaker: 'A whisper', text: EDEN_SERPENT_LINES.accepted, color: '#ef4444' });
        setDungeonHp((hp) => {
            const next = hp - 25;
            if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
            return next;
        });
        const temptFight = level.fights.find((f) => f.combatId === 'eden_temptation');
        if (temptFight && !temptFight.cleared && character.equipped.weapon) {
            fightTriggeredRef.current = temptFight.id;
            fightBonusRef.current = consumeFightBonusHp();
            setActiveFight('eden_temptation');
        }
        sfx.hit();
    }, [level, character.equipped.weapon, onDiscover, consumeFightBonusHp, softRespawn]);

    const resistTemptation = useCallback(() => {
        if (level.temptationResolved !== 'none') return;
        setLevel((prev) => {
            const next = { ...prev, temptationResolved: 'resisted' as const };
            onDiscover(edenDiscoveriesFromState(next));
            return next;
        });
        setNearTemptation(false);
        setDialogue({ speaker: 'The Gardener', text: EDEN_SERPENT_LINES.resisted, color: '#34d399' });
        sfx.strike();
    }, [level, onDiscover]);

    const resetSequence = useCallback(() => {
        setSequence([]);
        gameStateRef.current.rivers.forEach((r) => { r.active = false; });
        setDialogue({ speaker: 'The Gardener', text: 'The resonance breaks. Begin again from Pishon in the south-west.', color: '#34d399' });
        sfx.defeat();
    }, []);

    const markFightCleared = useCallback((fightId: string, combatId: string) => {
        setLevel((prev) => {
            const next = updateEdenProgress({
                ...prev,
                fights: prev.fights.map((f) => (f.id === fightId ? { ...f, cleared: true } : f)),
            });
            onDiscover(edenDiscoveriesFromState(next));
            if (combatId === 'eden_boss') onGuardianCleared();
            return next;
        });
        fightTriggeredRef.current = null;
        setActiveFight(null);
        setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + 20));
    }, [onGuardianCleared, onDiscover]);

    const readLoreStone = useCallback((stoneId: string) => {
        const stone = level.loreStones.find((s) => s.id === stoneId);
        if (!stone || stone.read) return;
        setLevel((prev) => {
            const next = {
                ...prev,
                loreStones: prev.loreStones.map((s) => (s.id === stoneId ? { ...s, read: true } : s)),
            };
            onDiscover(edenDiscoveriesFromState(next));
            return next;
        });
        setDialogue({ speaker: stone.title, text: stone.text, color: '#fbbf24' });
        sfx.hit();
    }, [level.loreStones, onDiscover]);

    const solidAt = useCallback((wx: number, wy: number) => {
        const gx = Math.floor(wx / EDEN_TILE);
        const gy = Math.floor(wy / EDEN_TILE);
        return isEdenSolid(gx, gy, levelRef.current, barrierRef.current);
    }, []);

    const handleInteract = useCallback(() => {
        if (nearLore) readLoreStone(nearLore);
    }, [nearLore, readLoreStone]);

    useEffect(() => {
        if (activeFight) {
            const boss = activeFight === 'eden_boss';
            gameMusic.crossfadeBgm(boss ? 'combat_eden_cherub' : 'combat_skirmish', 700, boss ? 'main' : gameMusic.pickVariant('combat_skirmish'));
        } else {
            gameMusic.crossfadeBgm('eden_garden', 1200, gameMusic.pickVariant('eden_garden'));
        }
    }, [activeFight]);

    useEffect(() => {
        if (activeFight) return;
        const canvas = canvasRef.current!;
        const ow = buildEdenOverworld();
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
        let avatarFrames = buildFrames(charRef.current.avatar);
        let avatarKey = JSON.stringify(charRef.current.avatar);
        const st = gameStateRef.current;
        let raf = 0;
        let last = performance.now();
        let running = true;
        let Z = 2.5;
        let ox = 0;
        let oy = 0;

        const GRASS = ['#5d9e41', '#6bb04c', '#549238'];
        function th(c: number, r: number, s = 0) {
            let x = (c * 374761393 + r * 668265263 + s * 2246822519) | 0;
            x = Math.imul(x ^ (x >>> 13), 1274126177);
            return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
        }

        const groundLayer = document.createElement('canvas');
        groundLayer.width = EDEN_MAP_W * 16;
        groundLayer.height = EDEN_MAP_H * 16;
        const gctx = groundLayer.getContext('2d')!;
        for (let r = 0; r < EDEN_MAP_H; r++) {
            for (let c = 0; c < EDEN_MAP_W; c++) {
                const gv = ow.ground[r][c];
                const x = c * 16, y = r * 16;
                if (gv === 2) { gctx.fillStyle = '#1e4d7a'; gctx.fillRect(x, y, 16, 16); }
                else if (gv === 1) { gctx.fillStyle = '#b58a52'; gctx.fillRect(x, y, 16, 16); }
                else {
                    gctx.fillStyle = GRASS[Math.floor(th(c >> 2, r >> 2, 1) * 3) % 3];
                    gctx.fillRect(x, y, 16, 16);
                }
                const d = ow.decor[r][c];
                if (d === 1) {
                    gctx.fillStyle = '#2e6a30';
                    gctx.beginPath();
                    gctx.ellipse(x + 8, y + 6, 7, 7, 0, 0, Math.PI * 2);
                    gctx.fill();
                    gctx.fillStyle = '#6e4a28';
                    gctx.fillRect(x + 6, y + 10, 4, 6);
                } else if (d === 2) {
                    gctx.fillStyle = '#357a39';
                    gctx.beginPath();
                    gctx.ellipse(x + 8, y + 10, 6, 5, 0, 0, Math.PI * 2);
                    gctx.fill();
                }
            }
        }

        function computeZoom() {
            const vw = canvas.clientWidth;
            const vh = canvas.clientHeight;
            const desktop = vw >= 1024;
            const viewTiles = desktop ? 14 : 11;
            Z = clamp(Math.round(Math.min(vw, vh) / (viewTiles * EDEN_TILE)), 2, desktop ? 5 : 4);
        }
        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            ctx = canvas.getContext('2d')!;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;
            computeZoom();
        }
        resize();
        window.addEventListener('resize', resize);

        const SX = (wx: number) => Math.round(wx * Z + ox);
        const SY = (wy: number) => Math.round(wy * Z + oy);

        const loop = (now: number) => {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            st.t = now;
            const lvl = levelRef.current;
            const barrier = barrierRef.current;

            let ix = joyRef.current.x, iy = joyRef.current.y;
            const k = keysRef.current;
            if (k.has('arrowleft') || k.has('a')) ix = -1;
            if (k.has('arrowright') || k.has('d')) ix = 1;
            if (k.has('arrowup') || k.has('w')) iy = -1;
            if (k.has('arrowdown') || k.has('s')) iy = 1;
            const mag = Math.hypot(ix, iy);
            if (mag > 1) { ix /= mag; iy /= mag; }
            const moving = Math.hypot(ix, iy) > 0.15;
            const spd = 78;

            if (moving) {
                st.walkT += dt;
                st.facing = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');
                const nx = st.px + ix * spd * dt;
                const ny = st.py + iy * spd * dt;
                const fy = 5;
                if (!solidAt(nx + (ix > 0 ? fy : ix < 0 ? -fy : 0), st.py + fy)) st.px = nx;
                if (!solidAt(st.px, ny + (iy > 0 ? fy : iy < 0 ? -fy : 0) + fy)) st.py = ny;
            }

            const pgx = Math.floor(st.px / EDEN_TILE);
            const pgy = Math.floor(st.py / EDEN_TILE);
            const zl = edenZoneLabel(pgx, pgy);
            if (zl) setZoneLabel(zl);

            const wingId = edenWingId(pgx, pgy);
            if (wingId && wingId !== lastWingRef.current) {
                lastWingRef.current = wingId;
                const discId = `eden_${wingId}`;
                if (!wingsSeenRef.current.has(discId)) {
                    wingsSeenRef.current.add(discId);
                    onDiscover([discId]);
                    setDialogue({ speaker: 'The Gardener', text: EDEN_GARDENER_LINES[wingId], color: '#34d399' });
                }
            }

            // roaming shades
            for (const sh of st.shades) {
                const fight = lvl.fights.find((f) => f.id === sh.fightId);
                if (!fight || fight.cleared) continue;
                let nx = sh.x + sh.vx * dt;
                let ny = sh.y + sh.vy * dt;
                if (solidAt(nx, sh.y)) { sh.vx *= -1; nx = sh.x; }
                if (solidAt(sh.x, ny)) { sh.vy *= -1; ny = sh.y; }
                sh.x = nx; sh.y = ny;
                if (Math.hypot(sh.x - st.px, sh.y - st.py) < 20 && character.equipped.weapon && fightTriggeredRef.current !== fight.id) {
                    fightTriggeredRef.current = fight.id;
                    fightBonusRef.current = consumeFightBonusHp();
                    setActiveFight(fight.combatId);
                    setDialogue({ speaker: 'The Gardener', text: fight.hint, color: '#34d399' });
                }
            }

            // temptation
            const temptNear = lvl.temptationResolved === 'none'
                && Math.hypot((EDEN_TEMPTATION.gx + 0.5) * EDEN_TILE - st.px, (EDEN_TEMPTATION.gy + 0.5) * EDEN_TILE - st.py) < 24;
            if (temptNear !== nearTemptation) setNearTemptation(temptNear);
            if (temptNear && !temptOfferShownRef.current) {
                temptOfferShownRef.current = true;
                setDialogue({ speaker: 'A whisper', text: EDEN_SERPENT_LINES.offer, color: '#ef4444' });
            }
            if (!temptNear) temptOfferShownRef.current = false;

            // lore proximity
            let closestLore: string | null = null;
            let closestD = Infinity;
            for (const ls of lvl.loreStones) {
                const d = Math.hypot((ls.gx + 0.5) * EDEN_TILE - st.px, (ls.gy + 0.5) * EDEN_TILE - st.py);
                if (d < 28 && d < closestD) { closestD = d; closestLore = ls.id; }
            }
            if (closestLore !== nearLore) {
                setNearLore(closestLore);
                const stone = closestLore ? lvl.loreStones.find((s) => s.id === closestLore) : null;
                setNear(closestLore ? { kind: 'lore', label: stone?.title ?? 'Lore stone' } : null);
            }

            // pickups, chests (auto on walk-over)
            for (const pk of lvl.pickups) {
                if (pk.collected || touchedRef.current.has(pk.id)) continue;
                if (Math.hypot((pk.gx + 0.5) * EDEN_TILE - st.px, (pk.gy + 0.5) * EDEN_TILE - st.py) < 18) {
                    touchedRef.current.add(pk.id);
                    setLevel((prev) => {
                        const next = { ...prev, pickups: prev.pickups.map((p) => (p.id === pk.id ? { ...p, collected: true } : p)) };
                        onDiscover(edenDiscoveriesFromState(next));
                        return next;
                    });
                    setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + pk.amount));
                    sfx.pickup();
                }
            }

            const secretVisible = canRevealEdenSecret(lvl, charRef.current);
            for (const ch of lvl.chests) {
                if (ch.opened || touchedRef.current.has(ch.id)) continue;
                if (ch.hidden && !secretVisible) continue;
                if (Math.hypot((ch.gx + 0.5) * EDEN_TILE - st.px, (ch.gy + 0.5) * EDEN_TILE - st.py) < 20) {
                    touchedRef.current.add(ch.id);
                    setLevel((prev) => {
                        const next = updateEdenProgress({
                            ...prev,
                            chests: prev.chests.map((c) => (c.id === ch.id ? { ...c, opened: true } : c)),
                            keysFound: ch.keyId && !prev.keysFound.includes(ch.keyId) ? [...prev.keysFound, ch.keyId] : prev.keysFound,
                        });
                        onDiscover(edenDiscoveriesFromState(next));
                        return next;
                    });
                    if (ch.health) setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + ch.health!));
                    sfx.pickup();
                }
            }

            // boss / temptation fight zones
            for (const fz of lvl.fights) {
                if (fz.cleared || fightTriggeredRef.current === fz.id) continue;
                if (fz.combatId === 'eden_temptation') continue;
                const dist = Math.hypot((fz.gx + 0.5) * EDEN_TILE - st.px, (fz.gy + 0.5) * EDEN_TILE - st.py);
                if (fz.radius > 0 && dist < fz.radius) {
                    if (!character.equipped.weapon) break;
                    if (fz.combatId === 'eden_boss' && !lvl.bossGateOpen) break;
                    const warnedAt = fightWarnRef.current[fz.id];
                    if (!warnedAt) { fightWarnRef.current[fz.id] = now; break; }
                    if (now - warnedAt < 1800) break;
                    fightTriggeredRef.current = fz.id;
                    fightBonusRef.current = consumeFightBonusHp();
                    setActiveFight(fz.combatId);
                    setDialogue({ speaker: 'The Gardener', text: fz.hint, color: '#34d399' });
                    break;
                }
            }

            // rivers puzzle
            if (lvl.sanctumOpen && !isSolved) {
                for (const r of st.rivers) {
                    if (r.active) continue;
                    if (Math.hypot((r.gx + 0.5) * EDEN_TILE - st.px, (r.gy + 0.5) * EDEN_TILE - st.py) < 20) {
                        if (!minigameDone) break;
                        r.active = true;
                        sfx.strike();
                        setSequence((prev) => {
                            const next = [...prev, r.id];
                            const expected = [0, 1, 2, 3];
                            if (!next.every((v, i) => v === expected[i])) {
                                setTimeout(() => resetSequence(), 100);
                                return [];
                            }
                            if (next.length === 4) {
                                setBarrierActive(false);
                                onSolve();
                                setDialogue({ speaker: 'The Gardener', text: 'The four rivers converge. The Tree of Life opens.', color: '#34d399' });
                                sfx.victory();
                            }
                            return next;
                        });
                    }
                }
            }

            if (!relicClaimed && !barrier && lvl.sanctumOpen) {
                const tx = (EDEN_TREE.gx + 0.5) * EDEN_TILE;
                const ty = (EDEN_TREE.gy + 1.5) * EDEN_TILE;
                if (Math.hypot(tx - st.px, ty - st.py) < 18) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue({ speaker: 'The Gardener', text: 'You claim the Leaf of the Tree of Life.', color: '#34d399' });
                }
            }

            // camera
            const vw = canvas.clientWidth;
            const vh = canvas.clientHeight;
            const halfW = vw / (2 * Z);
            const halfH = vh / (2 * Z);
            const camX = clamp(st.px, halfW, EDEN_MAP_W * EDEN_TILE - halfW);
            const camY = clamp(st.py, halfH, EDEN_MAP_H * EDEN_TILE - halfH);
            ox = Math.round(vw / 2 - camX * Z);
            oy = Math.round(vh / 2 - camY * Z);

            // ambient pollen / fireflies
            if (ambientRef.current.length < 28 && Math.random() < 0.06) {
                ambientRef.current.push({
                    x: st.px + (Math.random() - 0.5) * vw / Z,
                    y: st.py + (Math.random() - 0.5) * vh / Z,
                    vx: (Math.random() - 0.5) * 8,
                    vy: -4 - Math.random() * 6,
                    life: 2.5 + Math.random() * 2,
                    color: Math.random() > 0.5 ? '#34d399' : '#fbbf24',
                });
            }
            for (let i = ambientRef.current.length - 1; i >= 0; i--) {
                const p = ambientRef.current[i];
                p.life -= dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.life <= 0) { ambientRef.current.splice(i, 1); continue; }
                const a = Math.min(1, p.life) * (0.35 + Math.sin(st.t / 200 + i) * 0.15);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = a;
                ctx.beginPath();
                ctx.arc(SX(p.x), SY(p.y), 1.5 * Z, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // render
            ctx.fillStyle = '#0a1410';
            ctx.fillRect(0, 0, vw, vh);
            ctx.drawImage(groundLayer, 0, 0, groundLayer.width, groundLayer.height, ox, oy, groundLayer.width * Z, groundLayer.height * Z);

            // water shimmer overlay (viewport only)
            const visL = Math.max(0, Math.floor((-ox / Z) / EDEN_TILE) - 1);
            const visT = Math.max(0, Math.floor((-oy / Z) / EDEN_TILE) - 1);
            const visR = Math.min(EDEN_MAP_W, Math.ceil((vw - ox) / Z / EDEN_TILE) + 1);
            const visB = Math.min(EDEN_MAP_H, Math.ceil((vh - oy) / Z / EDEN_TILE) + 1);
            for (let r = visT; r < visB; r++) {
                for (let c = visL; c < visR; c++) {
                    if (ow.ground[r][c] !== 2) continue;
                    const shimmer = 0.06 + Math.sin(st.t / 500 + c * 0.4 + r * 0.3) * 0.04;
                    ctx.fillStyle = `rgba(56, 189, 248, ${shimmer})`;
                    ctx.fillRect(SX(c * EDEN_TILE), SY(r * EDEN_TILE), EDEN_TILE * Z, EDEN_TILE * Z);
                }
            }

            // lore stones — pulsing diamond markers
            for (const ls of lvl.loreStones) {
                const wx = (ls.gx + 0.5) * EDEN_TILE;
                const wy = (ls.gy + 0.5) * EDEN_TILE;
                const pulse = 0.55 + Math.sin(st.t / 280 + ls.gx) * 0.25;
                const bob = Math.sin(st.t / 420 + ls.gy) * 2 * Z;
                const sz = (6 + Math.sin(st.t / 350) * 1.5) * Z;
                const col = ls.read ? 'rgba(52,211,153,0.65)' : `rgba(251,191,36,${pulse})`;
                ctx.strokeStyle = ls.read ? 'rgba(52,211,153,0.35)' : `rgba(251,191,36,${pulse * 0.4})`;
                ctx.lineWidth = Z * 0.75;
                ctx.beginPath();
                ctx.arc(SX(wx), SY(wy + bob / Z) - 2 * Z, (sz + 4 * Z), 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = col;
                ctx.save();
                ctx.translate(SX(wx), SY(wy + bob / Z));
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
                ctx.restore();
            }

            // chests / pickups
            for (const ch of lvl.chests) {
                if (ch.opened || (ch.hidden && !secretVisible)) continue;
                const bob = Math.sin(st.t / 380 + ch.gx) * 2 * Z;
                const cx = SX((ch.gx + 0.5) * EDEN_TILE);
                const cy = SY((ch.gy + 0.5) * EDEN_TILE) + bob;
                const glow = 0.35 + Math.sin(st.t / 300 + ch.gy) * 0.2;
                ctx.fillStyle = `rgba(252, 211, 77, ${glow})`;
                ctx.fillRect(cx - 6 * Z, cy - 5 * Z, 12 * Z, 10 * Z);
                ctx.fillStyle = '#fcd34d';
                ctx.fillRect(cx - 4 * Z, cy - 3 * Z, 8 * Z, 6 * Z);
            }
            for (const pk of lvl.pickups) {
                if (pk.collected) continue;
                const pulse = 0.7 + Math.sin(st.t / 220 + pk.gx) * 0.3;
                const rad = (5 + Math.sin(st.t / 180) * 1.5) * Z;
                ctx.fillStyle = `rgba(248, 113, 113, ${pulse * 0.35})`;
                ctx.beginPath();
                ctx.arc(SX((pk.gx + 0.5) * EDEN_TILE), SY((pk.gy + 0.5) * EDEN_TILE), rad + 3 * Z, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#f87171';
                ctx.beginPath();
                ctx.arc(SX((pk.gx + 0.5) * EDEN_TILE), SY((pk.gy + 0.5) * EDEN_TILE), rad, 0, Math.PI * 2);
                ctx.fill();
            }

            // rivers
            const treeCx = (EDEN_TREE.gx + 0.5) * EDEN_TILE;
            const treeCy = (EDEN_TREE.gy + 0.5) * EDEN_TILE;
            for (const r of st.rivers) {
                const fx = (r.gx + 0.5) * EDEN_TILE;
                const fy = (r.gy + 0.5) * EDEN_TILE;
                const lit = r.active || isSolved;
                const fountainPulse = lit ? 0.85 + Math.sin(st.t / 260 + r.id) * 0.15 : 0.55 + Math.sin(st.t / 400 + r.id) * 0.1;
                ctx.fillStyle = lit ? r.color : '#64748b';
                ctx.globalAlpha = fountainPulse;
                ctx.fillRect(SX(fx) - 7 * Z, SY(fy) - 7 * Z, 14 * Z, 14 * Z);
                ctx.globalAlpha = 1;
                if (lit) {
                    ctx.strokeStyle = r.color;
                    ctx.lineWidth = 2 * Z;
                    ctx.globalAlpha = 0.5 + Math.sin(st.t / 320) * 0.2;
                    ctx.beginPath();
                    ctx.moveTo(SX(fx), SY(fy));
                    ctx.lineTo(SX(treeCx), SY(treeCy));
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    if (Math.random() < 0.14) {
                        riverParticlesRef.current.push({
                            ox: fx, oy: fy, tx: treeCx, ty: treeCy,
                            color: r.color, t: 0, speed: 0.55 + Math.random() * 0.35,
                        });
                    }
                }
            }
            riverParticlesRef.current = riverParticlesRef.current.filter((p) => {
                const dx = p.tx - p.ox;
                const dy = p.ty - p.oy;
                const len = Math.hypot(dx, dy) || 1;
                p.t += dt * p.speed;
                if (p.t >= 1) return false;
                const px = p.ox + dx * p.t;
                const py = p.oy + dy * p.t;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 0.5 + (1 - p.t) * 0.5;
                ctx.beginPath();
                ctx.arc(SX(px), SY(py), 2.5 * Z, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                return true;
            });

            // tree of life
            if (lvl.sanctumOpen) {
                const treeGlow = 0.4 + Math.sin(st.t / 400) * 0.25;
                ctx.fillStyle = `rgba(52, 211, 153, ${treeGlow})`;
                ctx.beginPath();
                ctx.arc(SX(treeCx), SY(treeCy - 8), (18 + Math.sin(st.t / 350) * 3) * Z, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#166534';
                ctx.beginPath();
                ctx.arc(SX(treeCx), SY(treeCy - 8), 14 * Z, 0, Math.PI * 2);
                ctx.fill();
                if (!barrier && lvl.sanctumOpen) {
                    ctx.fillStyle = `rgba(251, 191, 36, ${0.5 + Math.sin(st.t / 280) * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(SX(treeCx), SY(treeCy + 6), 4 * Z, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // fight zones + roaming shades
            const dashOff = -(st.t / 35) % 20;
            for (const fz of lvl.fights) {
                if (fz.cleared || fz.radius <= 0) continue;
                const isBoss = fz.combatId === 'eden_boss';
                const pulse = 0.55 + Math.sin(st.t / 380 + fz.gx) * 0.2;
                ctx.strokeStyle = isBoss ? `rgba(239, 68, 68, ${pulse})` : `rgba(251, 191, 36, ${pulse})`;
                ctx.lineWidth = Z;
                ctx.setLineDash([5 * Z, 5 * Z]);
                ctx.lineDashOffset = dashOff;
                ctx.beginPath();
                ctx.arc(SX((fz.gx + 0.5) * EDEN_TILE), SY((fz.gy + 0.5) * EDEN_TILE), fz.radius * Z, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            for (const sh of st.shades) {
                const fight = lvl.fights.find((f) => f.id === sh.fightId);
                if (!fight || fight.cleared) continue;
                const shBob = Math.sin(st.t / 200 + sh.x) * 1.5 * Z;
                ctx.globalAlpha = 0.35 + Math.sin(st.t / 180) * 0.15;
                ctx.fillStyle = '#1e1b4b';
                ctx.beginPath();
                ctx.arc(SX(sh.x), SY(sh.y) - 4 * Z + shBob, 10 * Z, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.drawImage(charImg, SHADE_TILE.col * 17, SHADE_TILE.row * 17, 16, 16,
                    SX(sh.x) - 8 * Z, SY(sh.y) - 12 * Z + shBob, 16 * Z, 16 * Z);
            }

            // gardener NPC at spawn
            const gwx = (EDEN_GARDENER.gx + 0.5) * EDEN_TILE;
            const gwy = (EDEN_GARDENER.gy + 0.5) * EDEN_TILE;
            const gPulse = 0.3 + Math.sin(st.t / 450) * 0.2;
            ctx.strokeStyle = `rgba(52, 211, 153, ${gPulse})`;
            ctx.lineWidth = Z;
            ctx.beginPath();
            ctx.arc(SX(gwx), SY(gwy), (8 + Math.sin(st.t / 500) * 2) * Z, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#34d399';
            ctx.beginPath();
            ctx.arc(SX(gwx), SY(gwy), 5 * Z, 0, Math.PI * 2);
            ctx.fill();

            // player
            const curKey = JSON.stringify(charRef.current.avatar);
            if (curKey !== avatarKey) { avatarKey = curKey; avatarFrames = buildFrames(charRef.current.avatar); }
            const wphase = Math.floor(st.walkT * 7) % 2;
            const dirFrames = avatarFrames[st.facing];
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            const pw = 16 * Z * 1.05;
            const ph = 24 * Z * 1.05;
            ctx.drawImage(wframe, SX(st.px) - pw / 2, SY(st.py) - ph + 5 * Z, pw, ph);

            // quest trail — marching dashes toward objective
            const wp = guideStep.waypoint;
            if (wp) {
                const wx = (wp.gx + 0.5) * EDEN_TILE;
                const wy = (wp.gy + 0.5) * EDEN_TILE;
                const trailPulse = 0.35 + Math.sin(st.t / 300) * 0.2;
                ctx.strokeStyle = `rgba(52,211,153,${trailPulse})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([5 * Z, 7 * Z]);
                ctx.lineDashOffset = dashOff;
                ctx.beginPath();
                ctx.moveTo(SX(st.px), SY(st.py));
                ctx.lineTo(SX(wx), SY(wy));
                ctx.stroke();
                ctx.setLineDash([]);
                const markerPulse = 4 + Math.sin(st.t / 250) * 2;
                ctx.fillStyle = `rgba(52,211,153,${0.5 + Math.sin(st.t / 280) * 0.3})`;
                ctx.beginPath();
                ctx.arc(SX(wx), SY(wy), markerPulse * Z, 0, Math.PI * 2);
                ctx.fill();
            }

            raf = requestAnimationFrame(loop);
        };

        const kd = (e: KeyboardEvent) => {
            keysRef.current.add(e.key.toLowerCase());
            if ((e.key === 'e' || e.key === 'Enter') && nearLore) readLoreStone(nearLore);
        };
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        raf = requestAnimationFrame(loop);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
        };
    }, [activeFight, isSolved, minigameDone, relicClaimed, nearLore, nearTemptation, onSolve, onClaim, onDiscover, consumeFightBonusHp, readLoreStone, resetSequence, solidAt, character.equipped.weapon, guideStep.waypoint]);

    const activeFightZone = level.fights.find((f) => f.combatId === activeFight && !f.cleared);
    const fightDest = activeFight ? edenDestinationStub(activeFight) : null;

    const nearPoi = near ? { name: near.label, type: 'npc' as const } : null;

    return (
        <div className="relative flex-1 w-full min-h-0 overflow-hidden select-none" style={{ touchAction: 'none', background: '#0a1f17' }}>
            {activeFight && fightDest?.combat && (
                <CombatScene
                    destination={fightDest}
                    character={character}
                    weaponDamage={wpn.damage}
                    weaponReach={wpn.reach}
                    {...combatStatProps}
                    bonusHp={combatStatProps.bonusHp + fightBonusRef.current}
                    onVictory={() => {
                        if (activeFightZone) markFightCleared(activeFightZone.id, activeFight);
                        setDialogue({ speaker: 'The Gardener', text: fightDest.combat!.victory, color: '#34d399' });
                        sfx.victory();
                    }}
                    onDefeat={() => {
                        fightTriggeredRef.current = null;
                        setActiveFight(null);
                        setDungeonHp((hp) => {
                            const next = hp - 30;
                            if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
                            setDialogue({ speaker: 'The Gardener', text: 'The shades overwhelm you. Rest, gather health, and try again.', color: '#34d399' });
                            sfx.defeat();
                            return Math.max(0, next);
                        });
                    }}
                    onExit={() => { fightTriggeredRef.current = null; setActiveFight(null); }}
                />
            )}

            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full world-canvas" />

            <div className="absolute top-0 inset-x-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }} />
            <div className="absolute bottom-0 inset-x-0 h-36 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }} />

            <div
                className="absolute top-0 inset-x-0 z-10 grid grid-cols-[auto_1fr_auto] items-start gap-x-2 px-3 sm:px-4 pointer-events-none"
                style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
            >
                <button
                    type="button"
                    onClick={onExit}
                    className="pointer-events-auto shrink-0 flex items-center gap-1 text-[10px] sm:text-xs text-zinc-300 hover:text-white bg-black/50 border border-white/10 rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2"
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="leading-none">Leave</span>
                </button>

                <div className="text-center min-w-0 px-0.5 sm:px-1 pt-0.5">
                    <p
                        className="font-black uppercase text-emerald-400 leading-tight text-balance"
                        style={{ fontSize: 'clamp(7px, 2.2vw, 9px)', letterSpacing: '0.2em' }}
                    >
                        Eden · Before the Lie
                    </p>
                    <p
                        key={zoneLabel}
                        className="eden-zone-in text-zinc-400 leading-snug mt-0.5 text-balance break-words hyphens-auto"
                        style={{ fontSize: 'clamp(7px, 2vw, 8px)', letterSpacing: '0.14em' }}
                    >
                        {zoneLabel}
                    </p>
                </div>

                <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
                    {onOpenRecords && (
                        <button
                            type="button"
                            onClick={onOpenRecords}
                            className="px-2 py-1.5 rounded-full bg-black/50 border border-white/10 font-black uppercase text-zinc-300 hover:text-white leading-none"
                            style={{ fontSize: 'clamp(7px, 1.9vw, 9px)', letterSpacing: '0.12em' }}
                        >
                            Records
                        </button>
                    )}
                    <button type="button" onClick={toggleMute} className="p-1.5 sm:p-2 rounded-full bg-black/50 border border-white/10 text-zinc-300 shrink-0">
                        {muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                </div>
            </div>

            <div
                key={guideStep.id}
                className="eden-animate-in absolute left-3 sm:left-4 z-10 pointer-events-none glass-panel rounded-xl border border-emerald-500/20 bg-black/40 backdrop-blur-sm px-2.5 py-2"
                style={{
                    top: 'calc(3.25rem + env(safe-area-inset-top))',
                    maxWidth: 'min(280px, calc(100vw - 5.5rem))',
                }}
            >
                <div className="flex items-center gap-2 mb-1.5">
                    <Heart className="w-3 h-3 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0 h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                        <div
                            className="eden-hp-bar h-full rounded-full"
                            style={{
                                width: `${(dungeonHp / MAX_DUNGEON_HP) * 100}%`,
                                background: dungeonHp > 35 ? '#34d399' : '#ef4444',
                            }}
                        />
                    </div>
                    <span className="text-[7px] font-mono text-zinc-500 shrink-0 tabular-nums">{dungeonHp}</span>
                </div>
                <p
                    className="text-emerald-300/95 leading-snug break-words text-pretty font-medium"
                    style={{ fontSize: 'clamp(7px, 2vw, 8px)', letterSpacing: '0.04em' }}
                >
                    {guideStep.objective}
                </p>
                {level.keysFound.length > 0 && (
                    <p
                        className="text-amber-400/85 mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-snug"
                        style={{ fontSize: 'clamp(6px, 1.8vw, 7px)' }}
                    >
                        <Key className="w-2.5 h-2.5 shrink-0" />
                        {level.keysFound.map((k, i) => (
                            <span key={k} className="whitespace-nowrap">
                                {i > 0 && <span className="opacity-50 mx-0.5">·</span>}
                                {k.replace('key_', '')}
                            </span>
                        ))}
                    </p>
                )}
            </div>

            {dialogue && (
                <WorldDialogueBox
                    speaker={dialogue.speaker}
                    text={dialogue.text}
                    color={dialogue.color}
                    onClose={() => setDialogue(null)}
                    controlsHidden={!isDesktop}
                />
            )}

            {nearTemptation && level.temptationResolved === 'none' && !activeFight && (
                <div
                    className="eden-animate-in absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-auto px-4 w-full max-w-xs"
                    style={{ bottom: isDesktop ? 'calc(5.5rem + env(safe-area-inset-bottom))' : 'calc(6.5rem + env(safe-area-inset-bottom))' }}
                >
                    <p className="text-[8px] uppercase tracking-[0.2em] text-red-300/80 text-center text-balance leading-snug">
                        A whisper at the forbidden verge
                    </p>
                    <div className="flex gap-2 w-full justify-center">
                        <button
                            type="button"
                            onClick={acceptTemptation}
                            className="flex-1 max-w-[9rem] px-3 py-2 rounded-lg font-black uppercase bg-red-900/70 border border-red-500/40 text-red-100 leading-tight text-center"
                            style={{ fontSize: 'clamp(8px, 2.2vw, 9px)', letterSpacing: '0.1em' }}
                        >
                            Listen
                        </button>
                        <button
                            type="button"
                            onClick={resistTemptation}
                            className="flex-1 max-w-[9rem] px-3 py-2 rounded-lg font-black uppercase bg-emerald-900/70 border border-emerald-500/40 text-emerald-100 leading-tight text-center"
                            style={{ fontSize: 'clamp(8px, 2.2vw, 9px)', letterSpacing: '0.1em' }}
                        >
                            Walk on
                        </button>
                    </div>
                </div>
            )}

            {!activeFight && !dialogue && (
                <WorldControlPad
                    profile={profile}
                    joy={joy}
                    joyRadius={joyR}
                    near={nearPoi ? { name: nearPoi.name, type: 'npc' } : null}
                    onInteract={handleInteract}
                />
            )}
            {!activeFight && dialogue && !isDesktop && (
                <WorldControlPad profile={profile} joy={joy} joyRadius={joyR} near={null} onInteract={() => {}} />
            )}
        </div>
    );
}