'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
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
import {
    EDEN_MAP_W, EDEN_MAP_H, EDEN_TILE, EDEN_TILES, EDEN_SPAWN, EDEN_RIVERS, EDEN_TREE,
    EDEN_VIEW_TILES, hydrateEdenState, isEdenSolid, updateEdenProgress, edenDestinationStub,
    edenZoneLabel, edenDiscoveriesFromState, edenWingId, canRevealEdenSecret, edenGuideStep,
    EDEN_GARDENER_LINES, EDEN_RESPAWN_LINE, EDEN_TEMPTATION, EDEN_TEMPTATION_SHORTCUT, EDEN_SERPENT_LINES,
    EDEN_HINT_DELAYS_SEC,
    type EdenLevelState,
} from '@/lib/game/edenLevel';

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

export default function EdenWorld({
    character, isSolved, minigameDone = true, isGuardianCleared,
    onSolve, onClaim, onExit, onGuardianCleared, onDiscover, puzzleId, puzzleHint, accent = '#34d399',
}: Props) {
    const founderNumber = useGameStore((s) => s.founderNumber);
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
    const [level, setLevel] = useState<EdenLevelState>(() => hydrateEdenState(character));
    const [zoneLabel, setZoneLabel] = useState('The Threshold');
    const [nearLore, setNearLore] = useState<string | null>(null);
    const [nearTemptation, setNearTemptation] = useState(false);
    const [sequence, setSequence] = useState<number[]>([]);
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_eden_leaf'));
    const [activeFight, setActiveFight] = useState<string | null>(null);
    const [dialogue, setDialogue] = useState(
        isGuardianCleared
            ? 'The cherub has fallen. Attune the four rivers and claim the Leaf — the hour before the lie.'
            : '【The Gardener】 Welcome back. Dark brown tiles are walls — grass is the path. Start with the golden ◆ beside you, then follow the compass hint above.',
    );
    const [hintTier, setHintTier] = useState(0);
    const [showTrail, setShowTrail] = useState(false);
    const [barrierActive, setBarrierActive] = useState(!isSolved);

    const profile = useInputProfile();
    const joyR = joyRadius(profile, loadSettings().controlSize === 'large') || MOBILE_JOY_R;
    const joy = useJoystick(joyR);
    const joyRef = joy.joyRef;
    const keysRef = useRef<Set<string>>(new Set());
    const fightTriggeredRef = useRef<string | null>(null);
    const fightBonusRef = useRef(0);
    const touchedRef = useRef(new Set<string>());
    const wingsSeenRef = useRef(new Set(character.discovered.filter((d) => d.startsWith('eden_wing_'))));
    const lastWingRef = useRef<string | null>(null);
    const riverParticlesRef = useRef<{ x: number; y: number; color: string; t: number; speed: number }[]>([]);
    const temptOfferShownRef = useRef(false);
    const guideStepIdRef = useRef('');
    const stuckSinceRef = useRef(Date.now());
    const hintTierRef = useRef(0);
    const fightWarnRef = useRef<Record<string, number>>({});
    const dialoguePriorityRef = useRef(0);

    const guideStep = useMemo(() => edenGuideStep(level, {
        isGuardianCleared,
        isSolved,
        minigameDone,
        barrierActive,
        relicClaimed,
        hasWeapon: !!character.equipped.weapon,
        riversLit: sequence.length,
    }), [level, isGuardianCleared, isSolved, minigameDone, barrierActive, relicClaimed, character.equipped.weapon, sequence.length]);

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
            for (let i = EDEN_HINT_DELAYS_SEC.length - 1; i >= 0; i--) {
                if (elapsed >= EDEN_HINT_DELAYS_SEC[i]) { tier = i + 1; break; }
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
        px: EDEN_SPAWN.gx * EDEN_TILE + 8,
        py: EDEN_SPAWN.gy * EDEN_TILE + 8,
        pax: EDEN_SPAWN.gx * EDEN_TILE + 8,
        pay: EDEN_SPAWN.gy * EDEN_TILE + 8,
        facing: 'up' as 'down' | 'up' | 'left' | 'right',
        walkT: 0,
        rivers: EDEN_RIVERS.map((r) => ({ ...r, active: false })),
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
        st.pax = EDEN_SPAWN.gx * EDEN_TILE + 8;
        st.pay = EDEN_SPAWN.gy * EDEN_TILE + 8;
        st.px = st.pax;
        st.py = st.pay;
        setDungeonHp(50);
        setGuideDialogue(`【The Gardener】 ${EDEN_RESPAWN_LINE}`, 3);
        sfx.defeat();
    }, [setGuideDialogue]);

    const acceptTemptation = useCallback(() => {
        if (level.temptationResolved !== 'none') return;
        const st = gameState.current;
        st.pax = EDEN_TEMPTATION_SHORTCUT.gx * EDEN_TILE + 8;
        st.pay = EDEN_TEMPTATION_SHORTCUT.gy * EDEN_TILE + 8;
        setLevel((prev) => {
            const next = { ...prev, temptationResolved: 'accepted' as const };
            onDiscover(edenDiscoveriesFromState(next));
            return next;
        });
        setNearTemptation(false);
        setDialogue(EDEN_SERPENT_LINES.accepted);
        setDungeonHp((hp) => {
            const next = hp - 25;
            if (next <= 0) {
                setTimeout(() => softRespawn(), 50);
                return 0;
            }
            return next;
        });
        const temptFight = level.fights.find((f) => f.combatId === 'eden_temptation');
        if (temptFight && !temptFight.cleared && character.equipped.weapon) {
            fightTriggeredRef.current = temptFight.id;
            fightBonusRef.current = consumeFightBonusHp();
            setActiveFight('eden_temptation');
        }
        sfx.hit();
    }, [level.temptationResolved, level.fights, character.equipped.weapon, onDiscover, consumeFightBonusHp, softRespawn]);

    const resistTemptation = useCallback(() => {
        if (level.temptationResolved !== 'none') return;
        setLevel((prev) => {
            const next = { ...prev, temptationResolved: 'resisted' as const };
            onDiscover(edenDiscoveriesFromState(next));
            return next;
        });
        setNearTemptation(false);
        setDialogue(EDEN_SERPENT_LINES.resisted);
        sfx.strike();
    }, [level.temptationResolved, onDiscover]);

    const resetSequence = useCallback(() => {
        setSequence([]);
        gameState.current.rivers.forEach((r) => { r.active = false; });
        setDialogue('The resonance breaks. Begin again from Pishon in the north-west.');
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
        setDialogue(`【${stone.title}】 ${stone.text}`);
        sfx.hit();
    }, [level.loreStones, onDiscover]);

    const isSolid = useCallback((gx: number, gy: number) => {
        return isEdenSolid(gx, gy, level, barrierActive);
    }, [level, barrierActive]);

    useEffect(() => {
        if (activeFight) {
            const boss = activeFight === 'eden_boss';
            const track = boss ? 'combat_eden_cherub' : 'combat_skirmish';
            gameMusic.crossfadeBgm(track, 700, boss ? 'main' : gameMusic.pickVariant(track));
        } else {
            gameMusic.crossfadeBgm('eden_garden', 1200, gameMusic.pickVariant('eden_garden'));
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
        let avatarFrames = buildFrames(charRef.current.avatar);
        let avatarKey = JSON.stringify(charRef.current.avatar);
        const state = gameState.current;
        let raf = 0;
        let last = performance.now();
        let running = true;
        let Z = 2.5;

        function resize() {
            if (!canvas.parentElement) return;
            const size = Math.min(canvas.parentElement.clientWidth || 400, 520);
            canvas.width = size;
            canvas.height = size;
            Z = size / (EDEN_VIEW_TILES * EDEN_TILE);
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
                const nx = state.pax + ix * 78 * dt;
                const ngx = Math.floor(nx / EDEN_TILE);
                if (!isSolid(ngx, Math.floor(state.pay / EDEN_TILE))) state.pax = nx;
                const ny = state.pay + iy * 78 * dt;
                const ngy = Math.floor(ny / EDEN_TILE);
                if (!isSolid(Math.floor(state.pax / EDEN_TILE), ngy)) state.pay = ny;
            }

            const pgx = Math.floor(state.pax / EDEN_TILE);
            const pgy = Math.floor(state.pay / EDEN_TILE);
            const zl = edenZoneLabel(pgx, pgy);
            if (zl) setZoneLabel(zl);

            const wingId = edenWingId(pgx, pgy);
            if (wingId && wingId !== lastWingRef.current) {
                lastWingRef.current = wingId;
                const discId = `eden_${wingId}`;
                if (!wingsSeenRef.current.has(discId)) {
                    wingsSeenRef.current.add(discId);
                    onDiscover([discId]);
                    setDialogue(`【The Gardener】 ${EDEN_GARDENER_LINES[wingId]}`);
                }
            }

            const temptNear = level.temptationResolved === 'none'
                && Math.hypot(EDEN_TEMPTATION.gx * EDEN_TILE + 8 - state.pax, EDEN_TEMPTATION.gy * EDEN_TILE + 8 - state.pay) < 20;
            if (temptNear !== nearTemptation) setNearTemptation(temptNear);
            if (temptNear && !temptOfferShownRef.current) {
                temptOfferShownRef.current = true;
                setDialogue(EDEN_SERPENT_LINES.offer);
            }
            if (!temptNear) temptOfferShownRef.current = false;

            let closestLore: string | null = null;
            let closestLoreD = Infinity;
            for (const ls of level.loreStones) {
                const d = Math.hypot(ls.gx * EDEN_TILE + 8 - state.pax, ls.gy * EDEN_TILE + 8 - state.pay);
                if (d < 22 && d < closestLoreD) { closestLoreD = d; closestLore = ls.id; }
            }
            if (closestLore !== nearLore) setNearLore(closestLore);

            // health pickups
            for (const pk of level.pickups) {
                if (pk.collected || touchedRef.current.has(pk.id)) continue;
                if (Math.hypot(pk.gx * EDEN_TILE + 8 - state.pax, pk.gy * EDEN_TILE + 8 - state.pay) < 14) {
                    touchedRef.current.add(pk.id);
                    setLevel((prev) => {
                        const next = { ...prev, pickups: prev.pickups.map((p) => (p.id === pk.id ? { ...p, collected: true } : p)) };
                        onDiscover(edenDiscoveriesFromState(next));
                        return next;
                    });
                    setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + pk.amount));
                    sfx.pickup();
                    setDialogue(`Vitality restored · +${pk.amount}`);
                }
            }

            const secretVisible = canRevealEdenSecret(level, charRef.current);

            // chests / compartments (proximity — no need to stand dead center)
            for (const ch of level.chests) {
                if (ch.opened || touchedRef.current.has(ch.id)) continue;
                if (ch.hidden && !secretVisible) continue;
                const chDist = Math.hypot(ch.gx * EDEN_TILE + 8 - state.pax, ch.gy * EDEN_TILE + 8 - state.pay);
                if (chDist < 18) {
                    touchedRef.current.add(ch.id);
                    setLevel((prev) => {
                        const next = updateEdenProgress({
                            ...prev,
                            chests: prev.chests.map((c) => (c.id === ch.id ? { ...c, opened: true } : c)),
                            keysFound: ch.keyId && !prev.keysFound.includes(ch.keyId) ? [...prev.keysFound, ch.keyId] : prev.keysFound,
                            doors: ch.keyId ? prev.doors.map((d) => (d.keyId === ch.keyId ? { ...d, open: true } : d)) : prev.doors,
                        });
                        onDiscover(edenDiscoveriesFromState(next));
                        return next;
                    });
                    if (ch.id === 'chest_secret') {
                        onDiscover(['eden_lore_secret']);
                        grantSkillPoint();
                        setDialogue(`${ch.label} — +${ch.health} vitality and a skill point. The Gardener hid this for those who read every stone.`);
                    } else if (ch.keyId) setDialogue(`${ch.label} — you found the ${ch.keyId.replace('key_', '')} key.`);
                    else if (ch.health) setDialogue(`${ch.label} — +${ch.health} vitality.`);
                    if (ch.health) setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + ch.health!));
                    sfx.pickup();
                }
            }

            // doors (auto-open when key held — walk near the gate)
            for (const d of level.doors) {
                if (d.open || !level.keysFound.includes(d.keyId) || touchedRef.current.has(`door_${d.id}`)) continue;
                const doorDist = Math.hypot(d.gx * EDEN_TILE + 8 - state.pax, d.gy * EDEN_TILE + 8 - state.pay);
                if (doorDist < 28) {
                    touchedRef.current.add(`door_${d.id}`);
                    setLevel((prev) => {
                        const next = updateEdenProgress({
                            ...prev,
                            doors: prev.doors.map((door) => (door.id === d.id ? { ...door, open: true } : door)),
                        });
                        onDiscover(edenDiscoveriesFromState(next));
                        return next;
                    });
                    setDialogue('The sealed door yields to your key.');
                    sfx.strike();
                }
            }

            // boss gate nudge when nearby but sealed
            if (!level.bossGateOpen) {
                const gateDist = Math.hypot(23.5 * EDEN_TILE - state.pax, 10 * EDEN_TILE - state.pay);
                if (gateDist < 36) {
                    setGuideDialogue('【The Gardener】 This golden barrier opens after all three shade trials and the grove & river keys.', 1);
                }
            }

            // fight zones — brief warning before combat starts
            for (const fz of level.fights) {
                if (fz.cleared || fightTriggeredRef.current === fz.id || fz.radius <= 0) continue;
                const dist = Math.hypot(fz.gx * EDEN_TILE + 8 - state.pax, fz.gy * EDEN_TILE + 8 - state.pay);
                if (dist >= fz.radius + 8) {
                    delete fightWarnRef.current[fz.id];
                    continue;
                }
                if (dist < fz.radius) {
                    if (!character.equipped.weapon) {
                        setGuideDialogue('Arm yourself at Truth\'s Hut before facing the shades.', 2);
                        break;
                    }
                    if (fz.combatId === 'eden_boss' && !level.bossGateOpen) {
                        setGuideDialogue('The cherub gate is sealed. Clear all three shade trials and find the grove and river keys.', 2);
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

            // river attunement (sanctum only)
            if (level.sanctumOpen && !isSolved) {
                for (const r of state.rivers) {
                    if (r.active) continue;
                    if (Math.hypot(r.gx * EDEN_TILE + 8 - state.pax, r.gy * EDEN_TILE + 8 - state.pay) < 16) {
                        if (!minigameDone) {
                            setDialogue('Pass the Trial of Memory in Records before the rivers will answer.');
                            break;
                        }
                        r.active = true;
                        sfx.strike();
                        gameMusic.playCue('river_attune', r.id % 2 === 1 ? 'alt' : 'main');
                        const ox = r.gx * EDEN_TILE + 8;
                        const oy = r.gy * EDEN_TILE + 8;
                        for (let i = 0; i < 6; i++) {
                            riverParticlesRef.current.push({
                                x: ox, y: oy, color: r.color, t: i * 0.12, speed: 0.35 + Math.random() * 0.15,
                            });
                        }
                        setSequence((prev) => {
                            const next = [...prev, r.id];
                            const expected = [0, 1, 2, 3];
                            if (!next.every((v, i) => v === expected[i])) {
                                setTimeout(() => resetSequence(), 100);
                                return [];
                            }
                            setDialogue(`The river ${r.name} flows into the garden.`);
                            if (next.length === 4) {
                                setBarrierActive(false);
                                onSolve();
                                setDialogue('The four rivers converge. The Tree of Life opens.');
                                sfx.victory();
                                gameMusic.playCue('rivers_converge');
                            }
                            return next;
                        });
                    }
                }
            }

            // relic
            if (!relicClaimed && !barrierActive && level.sanctumOpen) {
                const tx = EDEN_TREE.gx * EDEN_TILE + 8;
                const ty = (EDEN_TREE.gy + 1) * EDEN_TILE + 8;
                if (Math.hypot(tx - state.pax, ty - state.pay) < 14) {
                    setRelicClaimed(true);
                    onClaim();
                    setDialogue('You claim the Leaf of the Tree of Life.');
                    sfx.hit();
                }
            }

            // ---- render with camera ----
            const camX = state.pax - (EDEN_VIEW_TILES * EDEN_TILE) / 2;
            const camY = state.pay - (EDEN_VIEW_TILES * EDEN_TILE) / 2;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(Z, Z);
            ctx.translate(-camX + (canvas.width / Z - EDEN_VIEW_TILES * EDEN_TILE) / 2, -camY + (canvas.height / Z - EDEN_VIEW_TILES * EDEN_TILE) / 2);

            for (let r = 0; r < EDEN_MAP_H; r++) {
                for (let c = 0; c < EDEN_MAP_W; c++) {
                    const cell = EDEN_TILES[r][c];
                    const x = c * EDEN_TILE, y = r * EDEN_TILE;
                    if (cell === 1) ctx.fillStyle = '#1c1917';
                    else if (cell === 2) ctx.fillStyle = '#1e3a8a';
                    else if (cell === 3) ctx.fillStyle = '#44403c';
                    else ctx.fillStyle = (c + r) % 2 === 0 ? '#3f6212' : '#365314';
                    ctx.fillRect(x, y, EDEN_TILE, EDEN_TILE);
                    if (cell === 0 && (c === 8 || r % 5 === 0)) {
                        ctx.fillStyle = '#52525b';
                        ctx.fillRect(x + 3, y + 3, 10, 10);
                    }
                }
            }

            // doors
            for (const d of level.doors) {
                const x = d.gx * EDEN_TILE, y = d.gy * EDEN_TILE;
                ctx.fillStyle = d.open ? '#34d39944' : '#78350f';
                ctx.fillRect(x, y, EDEN_TILE, EDEN_TILE);
                if (!d.open) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillRect(x + 5, y + 4, 6, 8);
                }
            }

            // lore stones
            for (const ls of level.loreStones) {
                const pulse = 0.5 + Math.sin(state.t / 300 + ls.gx) * 0.2;
                ctx.fillStyle = ls.read ? 'rgba(52,211,153,0.35)' : `rgba(251,191,36,${pulse})`;
                ctx.fillRect(ls.gx * EDEN_TILE + 3, ls.gy * EDEN_TILE + 2, 10, 12);
                ctx.fillStyle = ls.read ? '#34d399' : '#fcd34d';
                ctx.font = 'bold 7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('◆', ls.gx * EDEN_TILE + 8, ls.gy * EDEN_TILE + 11);
            }

            // boss gate
            if (!level.bossGateOpen) {
                ctx.fillStyle = 'rgba(251,191,36,0.35)';
                ctx.fillRect(23 * EDEN_TILE, 9 * EDEN_TILE, EDEN_TILE * 2, EDEN_TILE * 3);
            }

            // chests
            for (const ch of level.chests) {
                if (ch.opened || (ch.hidden && !secretVisible)) continue;
                ctx.fillStyle = '#92400e';
                ctx.fillRect(ch.gx * EDEN_TILE + 2, ch.gy * EDEN_TILE + 4, 12, 10);
                ctx.fillStyle = '#fcd34d';
                ctx.fillRect(ch.gx * EDEN_TILE + 4, ch.gy * EDEN_TILE + 2, 8, 4);
            }

            // health orbs
            for (const pk of level.pickups) {
                if (pk.collected) continue;
                const bob = Math.sin(state.t / 200 + pk.gx) * 2;
                const px = pk.gx * EDEN_TILE + 8, py = pk.gy * EDEN_TILE + 8 + bob;
                ctx.fillStyle = '#f8717188';
                ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fecaca';
                ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
            }

            const treeCx = EDEN_TREE.gx * EDEN_TILE + 8;
            const treeCy = EDEN_TREE.gy * EDEN_TILE + 8;

            // fountains + converging river streams
            state.rivers.forEach((r) => {
                ctx.fillStyle = '#64748b';
                ctx.fillRect(r.gx * EDEN_TILE + 2, r.gy * EDEN_TILE + 2, 12, 12);
                if (r.active || isSolved) {
                    const fx = r.gx * EDEN_TILE + 8;
                    const fy = r.gy * EDEN_TILE + 8;
                    const flow = 0.5 + Math.sin(state.t / 280 + r.id) * 0.35;
                    ctx.strokeStyle = r.color;
                    ctx.lineWidth = 2 + flow;
                    ctx.globalAlpha = 0.55 + flow * 0.35;
                    ctx.beginPath();
                    ctx.moveTo(fx, fy);
                    ctx.lineTo(treeCx, treeCy);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = r.color;
                    ctx.beginPath(); ctx.arc(fx, fy, 5 + flow, 0, Math.PI * 2); ctx.fill();
                }
            });

            // river particles flowing toward the tree
            const parts = riverParticlesRef.current;
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.t += dt * p.speed;
                if (p.t >= 1) { parts.splice(i, 1); continue; }
                const px = p.x + (treeCx - p.x) * p.t;
                const py = p.y + (treeCy - p.y) * p.t;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 1 - p.t * 0.6;
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            if (isSolved) {
                for (let i = 0; i < 2; i++) {
                    const src = state.rivers[i % 4];
                    parts.push({
                        x: src.gx * EDEN_TILE + 8,
                        y: src.gy * EDEN_TILE + 8,
                        color: src.color,
                        t: Math.random() * 0.4,
                        speed: 0.25 + Math.random() * 0.2,
                    });
                }
                if (parts.length > 48) parts.splice(0, parts.length - 48);
            }

            // serpent temptation marker
            if (level.temptationResolved === 'none') {
                const pulse = 0.4 + Math.sin(state.t / 350) * 0.25;
                ctx.fillStyle = `rgba(239,68,68,${pulse})`;
                ctx.fillRect(EDEN_TEMPTATION.gx * EDEN_TILE + 4, EDEN_TEMPTATION.gy * EDEN_TILE + 4, 8, 8);
            }

            // secret compartment shimmer
            const secretChest = level.chests.find((c) => c.id === 'chest_secret');
            if (secretChest && !secretChest.opened && secretVisible) {
                const shimmer = 0.35 + Math.sin(state.t / 220) * 0.25;
                ctx.fillStyle = `rgba(251,191,36,${shimmer})`;
                ctx.fillRect(secretChest.gx * EDEN_TILE + 1, secretChest.gy * EDEN_TILE + 3, 14, 12);
            }

            // tree
            if (level.sanctumOpen) {
                const relicReady = !relicClaimed && !barrierActive;
                if (relicReady) {
                    const pulse = 0.65 + Math.sin(state.t / 400) * 0.35;
                    ctx.strokeStyle = `rgba(52,211,153,${pulse * 0.7})`;
                    ctx.lineWidth = 2 + pulse * 2;
                    ctx.beginPath();
                    ctx.arc(treeCx, treeCy - 2, 18 + pulse * 8, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.fillStyle = '#78350f';
                ctx.fillRect(EDEN_TREE.gx * EDEN_TILE + 4, EDEN_TREE.gy * EDEN_TILE + 2, 8, 14);
                ctx.fillStyle = '#166534';
                ctx.beginPath();
                ctx.arc(treeCx, EDEN_TREE.gy * EDEN_TILE - 4, 14, 0, Math.PI * 2);
                ctx.fill();
                if (relicReady) {
                    const bounce = Math.sin(state.t / 150) * 2;
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath();
                    ctx.ellipse(treeCx, EDEN_TREE.gy * EDEN_TILE + 16 + bounce, 4, 6, Math.PI / 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // waypoint trail + marker toward current objective
            const wp = guideStep.waypoint;
            if (wp) {
                const wx = wp.gx * EDEN_TILE + 8;
                const wy = wp.gy * EDEN_TILE + 8;
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
                const dotA = showTrail || hintTier > 0 ? 0.55 : 0.28;
                ctx.fillStyle = `rgba(52,211,153,${dotA * (0.5 + pulse * 0.35)})`;
                ctx.beginPath();
                ctx.arc(wx, wy, 5 + pulse * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(236,253,245,${dotA})`;
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('▸', wx, wy + 3);
            }

            // fight zone hints
            for (const fz of level.fights) {
                if (fz.cleared || fz.radius <= 0) continue;
                ctx.strokeStyle = fz.combatId === 'eden_boss' ? '#ef444466' : '#fbbf2466';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(fz.gx * EDEN_TILE + 8, fz.gy * EDEN_TILE + 8, fz.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // locked doors — subtle key label when player is near
            for (const d of level.doors) {
                if (d.open) continue;
                const dd = Math.hypot(d.gx * EDEN_TILE + 8 - state.pax, d.gy * EDEN_TILE + 8 - state.pay);
                if (dd < 40) {
                    const hasK = level.keysFound.includes(d.keyId);
                    ctx.fillStyle = hasK ? 'rgba(52,211,153,0.85)' : 'rgba(251,191,36,0.75)';
                    ctx.font = '6px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(hasK ? 'gate · open' : `needs ${d.keyId.replace('key_', '')}`, d.gx * EDEN_TILE + 8, d.gy * EDEN_TILE - 2);
                }
            }

            // player
            const curKey = JSON.stringify(charRef.current.avatar);
            if (curKey !== avatarKey) { avatarKey = curKey; avatarFrames = buildFrames(charRef.current.avatar); }
            const wphase = Math.floor(state.walkT * 7) % 2;
            const dirFrames = avatarFrames[state.facing];
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            ctx.drawImage(wframe, state.pax - 8, state.pay - 19, 16, 24);

            ctx.restore();
            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, [activeFight, level, barrierActive, isSolved, minigameDone, relicClaimed, isSolid, onSolve, onClaim, resetSequence, consumeFightBonusHp, onDiscover, nearLore, nearTemptation, grantSkillPoint, character.equipped.weapon, guideStep, showTrail, hintTier, setGuideDialogue]);

    const handleRead = () => { if (nearLore) readLoreStone(nearLore); };

    const activeFightZone = level.fights.find((f) => f.combatId === activeFight && !f.cleared);
    const fightDest = activeFight ? edenDestinationStub(activeFight) : null;

    return (
        <div className="flex flex-col items-center w-full text-white select-none relative">
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
                        setDialogue(fightDest.combat!.victory);
                        sfx.victory();
                    }}
                    onDefeat={() => {
                        fightTriggeredRef.current = null;
                        setActiveFight(null);
                        setDungeonHp((hp) => {
                            const next = hp - 30;
                            if (next <= 0) {
                                setTimeout(() => softRespawn(), 50);
                                return 0;
                            }
                            if (next < 30) {
                                setTimeout(() => softRespawn(), 50);
                                return 50;
                            }
                            setDialogue('The shades overwhelm you. Rest, gather health, and try again.');
                            sfx.defeat();
                            return next;
                        });
                    }}
                    onExit={() => {
                        fightTriggeredRef.current = null;
                        setActiveFight(null);
                    }}
                />
            )}

            <div className="flex justify-between items-center w-full max-w-[520px] mb-2 gap-2">
                <button onClick={onExit} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white">
                    <ArrowLeft className="w-4 h-4" /> Return
                </button>
                <div className="text-center min-w-0">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 block">Eden — Before the Lie</span>
                    <span className="text-[8px] uppercase tracking-widest text-zinc-500 block truncate">{zoneLabel}</span>
                </div>
                <button onClick={toggleMute} className="text-zinc-400 hover:text-white">{muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
            </div>

            {/* Life bar + keys */}
            <div className="w-full max-w-[520px] mb-2 space-y-1.5">
                <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <div className="flex-1 h-2.5 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(dungeonHp / MAX_DUNGEON_HP) * 100}%`, background: dungeonHp > 35 ? '#34d399' : '#ef4444' }} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 w-14 text-right">{dungeonHp}/{MAX_DUNGEON_HP}</span>
                </div>
                {level.keysFound.length > 0 && (
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-amber-400/90">
                        <Key className="w-3 h-3" />
                        {level.keysFound.map((k) => k.replace('key_', '')).join(' · ')}
                    </div>
                )}
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/15 bg-emerald-950/40 px-2.5 py-2">
                    <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300/90">{guideStep.objective}</p>
                        <p className="text-[8px] text-zinc-500 leading-snug mt-0.5">{guideStep.tip}</p>
                        {hintTier > 0 && (
                            <p className="text-[7px] uppercase tracking-widest text-amber-400/70 mt-1 animate-pulse">Gardener hint · follow the green trail</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative border-4 border-emerald-600/40 rounded-2xl overflow-hidden bg-emerald-950 shadow-inner w-full max-w-[520px]">
                <canvas ref={canvasRef} className="block w-full aspect-square" />
            </div>

            <MiniWorldInsight character={character} puzzleId={puzzleId} baseHint={puzzleHint} accent={accent} isSolved={isSolved} />

            {dialogue && (
                <div className="w-full max-w-[520px] mt-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/45 text-center">
                    <p className="font-ritual text-sm leading-relaxed text-zinc-200">{dialogue}</p>
                    {nearTemptation && level.temptationResolved === 'none' && !activeFight && (
                        <div className="flex gap-2 justify-center mt-3">
                            <button
                                onClick={acceptTemptation}
                                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-900/60 border border-red-500/40 text-red-200 hover:bg-red-800/70"
                            >
                                Listen
                            </button>
                            <button
                                onClick={resistTemptation}
                                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-800/70"
                            >
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
                accent="rgba(16,185,129,0.65)"
                actionLabel={nearLore ? 'Read' : '—'}
                actionDisabled={!nearLore}
                onAction={handleRead}
                hint="◆ read stones · gold chests hold keys · brown gates open with keys · dashed circles are trials"
            />
        </div>
    );
}