'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Volume2, VolumeX, Heart } from 'lucide-react';
import { gameMusic, type BgmId } from '@/lib/game/music';
import type { GameCharacter } from '@/lib/store/useGameStore';
import type { Destination } from '@/lib/game/destinations';
import { sfx, unlockAudio, setMuted, isMuted } from '@/lib/game/sfx';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { drawWeaponOverlay } from '@/lib/game/weaponVisual';
import { WEAPON_BY_ID } from '@/lib/game/weapons';
import { ABILITY_BY_ID, combatAbilities, type AbilityDef } from '@/lib/game/abilities';
import { PATH_BY_ID } from '@/lib/game/paths';
import { useInputProfile } from '@/components/game/controls/useInputProfile';
import { useJoystick } from '@/components/game/controls/useJoystick';
import CombatControlPad from '@/components/game/controls/CombatControlPad';
import { joyRadius, MOBILE_JOY_R } from '@/lib/game/controls';
import { loadSettings } from '@/lib/game/settings';

// ============================================================
//  COMBAT — real-time, mobile-first. Move with the joystick,
//  tap ATTACK (or J / Space) to strike shades within reach.
//  Clear the shades, then defeat the guardian boss.
// ============================================================

const TILE = 16;
const COLS = 12;
const ROWS = 16;
const W = COLS * TILE;
const H = ROWS * TILE;
const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const SHADE_TILE = { col: 0, row: 3 };
const PLAYER_HP = 100;

// Enemy archetypes. Each reads + behaves differently so a fight is a puzzle of
// positioning, not a stand-and-trade. grunt = lunger, caster = ranged spellshot,
// brute = telegraphed charger, flanker = fast circling skirmisher.
type FoeKind = 'grunt' | 'caster' | 'brute' | 'flanker';
type FoeState = 'approach' | 'windup' | 'strike' | 'charge' | 'recover';

interface Foe {
    x: number; y: number; hp: number; max: number; boss?: boolean; hurt: number;
    kind: FoeKind;
    state: FoeState;
    t: number;        // time left in the current state
    cd: number;       // cooldown before this foe may commit to another attack
    slot: number;     // flank index — spreads the pack around the player
    vx: number; vy: number; // locked aim/heading for a lunge or charge
    hasTok: boolean;  // currently holding one of the limited attack tokens
    hit: boolean;     // already landed the current strike?
    // boss-only fields
    phase: number;
    move: string;
    moveCd: number;
    summons: number;
}

interface Proj { x: number; y: number; vx: number; vy: number; life: number; dmg: number; color: string; r: number; }
interface Ring { x: number; y: number; r: number; t: number; dur: number; dmg: number; done: boolean; }

// Build a varied roster so larger packs aren't just clones — a flanker, then a
// caster, then a brute get mixed in as the count grows.
function buildKinds(n: number): FoeKind[] {
    const out: FoeKind[] = [];
    for (let i = 0; i < n; i++) {
        if (i === 1) out.push('flanker');
        else if (i === 2) out.push('caster');
        else if (i === 3) out.push('brute');
        else if (i >= 4) out.push(i % 2 === 0 ? 'caster' : 'flanker');
        else out.push('grunt');
    }
    return out;
}

interface Props {
    destination: Destination;
    character: GameCharacter;
    weaponDamage: number;
    weaponReach: number;
    bonusHp?: number;
    bonusDamage?: number;
    bonusReach?: number;
    bonusRegen?: number;      // HP restored per second (the Mystic's channel)
    bonusLifesteal?: number;  // fraction of damage healed back
    bonusCrit?: number;       // chance (0..1) a strike lands for double
    bonusKnockback?: number;  // extra knockback on hit
    /** Path-specific combat modifiers (lib/game/pathPowers.ts) */
    enemyHpMult?: number;
    enemyDmgMult?: number;
    playerDamageMult?: number;
    playerReachBonus?: number;
    onVictory: () => void;
    onDefeat: () => void;
    onExit: () => void;
    /** BGM to restore when combat ends (defeat, victory, or flee). */
    exploreBgm?: BgmId;
}

function weakPointMult(character: GameCharacter): number {
    const ids = character.skills;
    if (ids.includes('seer_super')) return 2.5;
    if (ids.includes('seer_sight')) return 2.3;
    return 2;
}

export default function CombatScene({ destination: d, character, weaponDamage, weaponReach, bonusHp = 0, bonusDamage = 0, bonusReach = 0, bonusRegen = 0, bonusLifesteal = 0, bonusCrit = 0, bonusKnockback = 0, enemyHpMult = 1, enemyDmgMult = 1, playerDamageMult = 1, playerReachBonus = 0, onVictory, onDefeat, onExit, exploreBgm = 'world_cavern' }: Props) {
    const maxHp = PLAYER_HP + bonusHp;
    const dmg = Math.round((weaponDamage + bonusDamage) * playerDamageMult);
    const reach = weaponReach + bonusReach + playerReachBonus;
    const regen = bonusRegen;
    const lifesteal = bonusLifesteal;
    const crit = bonusCrit;
    const knockbackBonus = bonusKnockback;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const profile = useInputProfile();
    const joyR = joyRadius(profile, loadSettings().controlSize === 'large') || MOBILE_JOY_R;
    const joy = useJoystick(joyR);
    const joyRef = joy.joyRef;
    const keysRef = useRef<Set<string>>(new Set());
    const attackRef = useRef(false);

    const [hp, setHp] = useState(maxHp);
    const [boss, setBoss] = useState<{ name: string; hp: number; max: number } | null>(null);
    const [foesLeft, setFoesLeft] = useState(0);
    const [outcome, setOutcome] = useState<'fight' | 'won' | 'lost'>('fight');
    const [muted, setMutedState] = useState(isMuted());
    const [dodgeCd, setDodgeCd] = useState(0);
    const [weakPointActive, setWeakPointActive] = useState(false);
    const [abilityCds, setAbilityCds] = useState<Record<string, number>>({});
    const dodgeRef = useRef(false);
    const abilityTriggerRef = useRef<string | null>(null);
    const abilities = useMemo(() => combatAbilities(character), [character.skills, character.path]);
    const abilitiesRef = useRef<AbilityDef[]>(abilities);
    abilitiesRef.current = abilities;
    const pathColor = character.path ? PATH_BY_ID[character.path].color : '#fbbf24';
    const weakMult = weakPointMult(character);

    const endRef = useRef({ onVictory, onDefeat });
    endRef.current = { onVictory, onDefeat };
    // last HP value pushed to the bar — guards against a render every frame
    // while the Mystic's renewal is ticking.
    const shownRef = useRef(maxHp);
    // last cooldown second reflected to each ability button — so we set React
    // state only when the displayed value actually changes (and always reset to
    // 0 when ready). The loop runs in a []-effect, so it can't read live state.
    const dodgeShownRef = useRef(0);
    const abilityCdShownRef = useRef<Record<string, number>>({});
    const musicRestoredRef = useRef(false);

    const restoreExploreBgm = useCallback(() => {
        if (musicRestoredRef.current) return;
        musicRestoredRef.current = true;
        gameMusic.crossfadeBgm(exploreBgm, 1100, gameMusic.pickVariant(exploreBgm));
    }, [exploreBgm]);

    useEffect(() => {
        if (outcome === 'won' || outcome === 'lost') restoreExploreBgm();
    }, [outcome, restoreExploreBgm]);

    useEffect(() => () => restoreExploreBgm(), [restoreExploreBgm]);

    useEffect(() => {
        const canvas = canvasRef.current!;
        let ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.src = CHAR_SHEET;
        const CDIRS = ['down', 'up', 'left', 'right'] as const;
        type CDir = typeof CDIRS[number];
        const avatarFrames = {} as Record<CDir, HTMLCanvasElement[]>;
        for (const cd of CDIRS) avatarFrames[cd] = [avatarOffscreen(character.avatar, 0, cd), avatarOffscreen(character.avatar, 1, cd), avatarOffscreen(character.avatar, 2, cd)];
        let walkTimer = 0;
        let facing: CDir = 'down';
        const cfg = d.combat!;

        const rand = (a: number, b: number) => a + Math.random() * (b - a);
        const st = {
            px: W / 2, py: H - TILE * 3, php: maxHp, atk: 0, swing: 0,
            aimx: 0, aimy: 1, // attack direction (last movement; default down)
            foes: [] as Foe[], projectiles: [] as Proj[], rings: [] as Ring[],
            bossSpawned: false, done: false,
            shake: 0, hurtFlash: 0, hurtCd: 0,
            blockT: 0, blockReduction: 0,
            dodgeT: 0, dodgeCd: 0, dashx: 0, dashy: 0,
            weakPointT: 0, weakPointActive: false,
            trueSightT: 0, rallyT: 0, rallyReduction: 0,
            bindT: 0, bindSlow: 0, surgeT: 0, surgeMult: 1,
            abilityCds: {} as Record<string, number>,
        };
        const foeHp = Math.round(cfg.enemyHp * enemyHpMult);
        const bossHp = Math.round(cfg.bossHp * enemyHpMult);
        const foeDmg = cfg.enemyDmg * enemyDmgMult;
        const bossDmg = cfg.bossDmg * enemyDmgMult;
        const bossTier = cfg.bossDifficulty ?? (cfg.bossHp <= 95 ? 1 : cfg.bossHp <= 150 ? 2 : 3);
        // only this many foes may be MID-ATTACK at once — the rest circle and
        // wait their turn, so the pack coordinates + surrounds instead of mobbing.
        const maxTokens = cfg.enemyCount >= 5 ? 3 : 2;

        const mkFoe = (kind: FoeKind, slot: number, hp: number): Foe => ({
            x: rand(TILE * 2, W - TILE * 2), y: rand(TILE * 2, H * 0.4),
            hp, max: hp, hurt: 0, kind, state: 'approach', t: 0, cd: rand(0.6, 2.0),
            slot, vx: 0, vy: 0, hasTok: false, hit: false,
            phase: 1, move: '', moveCd: 0, summons: 0,
        });
        const kinds = (() => {
            const custom = cfg.enemyKinds;
            if (custom?.length) {
                const out = custom.slice(0, cfg.enemyCount);
                while (out.length < cfg.enemyCount) out.push(buildKinds(cfg.enemyCount)[out.length] ?? 'grunt');
                return out;
            }
            return buildKinds(cfg.enemyCount);
        })();
        kinds.forEach((k, i) => st.foes.push(mkFoe(k, i, foeHp)));
        setFoesLeft(st.foes.length);

        let raf = 0, last = performance.now(), running = true;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
            ctx = canvas.getContext('2d')!;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = false;
        }
        resize();
        window.addEventListener('resize', resize);

        // apply a wound to the player — negated entirely by an active dodge
        // (i-frames), softened by a Sentinel block. Returns whether it landed.
        const hurtPlayer = (amount: number) => {
            if (st.dodgeT > 0) return false;
            let mult = 1;
            if (st.blockT > 0) mult *= Math.max(0, 1 - st.blockReduction);
            if (st.rallyT > 0) mult *= Math.max(0, 1 - st.rallyReduction);
            st.php -= amount * mult;
            st.hurtFlash = Math.min(1, st.hurtFlash + 0.35);
            st.shake = Math.max(st.shake, 3.6);
            if (st.hurtCd <= 0) { sfx.hurt(); st.hurtCd = 0.4; }
            return true;
        };
        const fireProj = (x: number, y: number, ang: number, speed: number, dmg: number, color: string, rr = 3) => {
            st.projectiles.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 3.4, dmg, color, r: rr });
        };
        const bossMoveCd = (phase: number) => {
            const base = phase === 1 ? rand(2.2, 3.0) : phase === 2 ? rand(1.6, 2.2) : rand(1.0, 1.5);
            return bossTier === 1 ? base * 1.4 : base;
        };

        const nearestFoe = () => {
            let best: Foe | null = null, nd = Infinity;
            for (const f of st.foes) {
                const dist = Math.hypot(f.x - st.px, f.y - st.py);
                if (dist < nd) { nd = dist; best = f; }
            }
            return best;
        };

        const fireAtFoe = (ab: AbilityDef, speed = 115, color = d.accent) => {
            const target = nearestFoe();
            if (!target) return;
            const a = Math.atan2(target.y - st.py, target.x - st.px);
            fireProj(st.px, st.py - 4, a, speed, Math.round(dmg * (ab.potency || 1)), color, ab.effect === 'livingWord' ? 5 : 4);
            sfx.cast();
        };

        const damageFoesInRadius = (radius: number, mult: number) => {
            let hits = 0;
            for (const f of st.foes) {
                if (Math.hypot(f.x - st.px, f.y - st.py) > radius) continue;
                f.hp -= Math.round(dmg * mult);
                f.hurt = 0.18;
                const a = Math.atan2(f.y - st.py, f.x - st.px);
                f.x += Math.cos(a) * 8;
                f.y += Math.sin(a) * 8;
                hits++;
            }
            if (hits > 0) { sfx.hit(); st.shake = Math.max(st.shake, 3.5); }
        };

        const triggerAbility = (abId: string) => {
            const ab = ABILITY_BY_ID[abId];
            if (!ab || (st.abilityCds[abId] || 0) > 0) return;
            st.abilityCds[abId] = ab.cooldownSec;
            switch (ab.effect) {
                case 'weakPointReveal':
                    st.weakPointT = ab.durationSec || 5;
                    st.weakPointActive = true;
                    sfx.cast();
                    break;
                case 'unveiling':
                    st.weakPointT = ab.durationSec || 8;
                    st.weakPointActive = true;
                    sfx.bossSpawn();
                    st.shake = Math.max(st.shake, 5);
                    break;
                case 'veilPulse':
                    st.rings.push({ x: st.px, y: st.py, r: 70, t: 0, dur: 0.4, dmg: 0, done: false });
                    damageFoesInRadius(70, ab.potency || 0.65);
                    break;
                case 'trueSight':
                    st.trueSightT = ab.durationSec || 5;
                    sfx.cast();
                    break;
                case 'lightStrike': {
                    const lo = TILE + 4, hiX = W - TILE - 4, hiY = H - TILE - 4;
                    st.px = Math.max(lo, Math.min(hiX, st.px + st.aimx * 52));
                    st.py = Math.max(lo, Math.min(hiY, st.py + st.aimy * 52));
                    damageFoesInRadius(reach + 14, ab.potency || 1.35);
                    sfx.strike();
                    break;
                }
                case 'ward':
                case 'aegis':
                    st.blockT = ab.durationSec || 1.2;
                    st.blockReduction = ab.potency || 0.55;
                    sfx.dash();
                    break;
                case 'banish':
                    for (const f of st.foes) {
                        const a = Math.atan2(f.y - st.py, f.x - st.px);
                        const kb = ab.potency || 22;
                        f.x += Math.cos(a) * kb;
                        f.y += Math.sin(a) * kb;
                        if (!f.boss) f.hp -= Math.round(dmg * 0.35);
                        else f.hp -= Math.round(dmg * 0.2);
                        f.hurt = 0.2;
                    }
                    sfx.slam();
                    st.shake = Math.max(st.shake, 4.5);
                    break;
                case 'rally':
                    st.rallyT = ab.durationSec || 3;
                    st.rallyReduction = ab.potency || 0.4;
                    sfx.dash();
                    break;
                case 'glyphBolt':
                case 'manifestOrb':
                    fireAtFoe(ab);
                    break;
                case 'bindWord':
                    st.bindT = ab.durationSec || 3;
                    st.bindSlow = ab.potency || 0.45;
                    sfx.cast();
                    break;
                case 'livingWord':
                    for (let i = 0; i < 8; i++) {
                        const a = (i / 8) * Math.PI * 2;
                        fireProj(st.px, st.py - 4, a, 95, Math.round(dmg * (ab.potency || 2.2) * 0.45), '#c084fc', 5);
                    }
                    sfx.bossSpawn();
                    st.shake = Math.max(st.shake, 6);
                    break;
                case 'channel':
                case 'layingHands':
                case 'returnSource':
                    st.php = Math.min(maxHp, st.php + maxHp * (ab.potency || 0.25));
                    st.shake = Math.max(st.shake, 3);
                    sfx.hit();
                    break;
                case 'sourceSurge':
                    st.surgeT = ab.durationSec || 4;
                    st.surgeMult = ab.potency || 1.5;
                    sfx.cast();
                    break;
                default:
                    break;
            }
        };

        // ---- BOSS AI ---- repositions to a medium range, then commits to a
        // telegraphed move chosen from its kit by distance + HP phase. Phase 3 is
        // an enrage: faster cadence, radial volleys.
        function updateBoss(f: Foe, dt: number, tsec: number) {
            const pdx = st.px - f.x, pdy = st.py - f.y;
            const pd = Math.hypot(pdx, pdy) || 0.001;
            const ux = pdx / pd, uy = pdy / pd;
            f.phase = f.hp / f.max > 0.6 ? 1 : f.hp / f.max > 0.3 ? 2 : 3;

            if (f.move === '') {
                // hover at a medium distance and strafe
                const want = 64;
                if (pd > want + 14) { f.x += ux * 30 * dt; f.y += uy * 30 * dt; }
                else if (pd < want - 14) { f.x -= ux * 28 * dt; f.y -= uy * 28 * dt; }
                f.x += -uy * 20 * dt * Math.sin(tsec * 0.8); f.y += ux * 20 * dt * Math.sin(tsec * 0.8);
                f.moveCd -= dt;
                if (f.moveCd <= 0) {
                    const opts: string[] = pd < 46 ? ['slam', 'slam', 'charge'] : pd > 80 ? ['volley', 'volley', 'charge'] : ['charge', 'volley', 'slam'];
                    if (f.phase >= 2 && f.summons < (f.phase >= 3 ? 2 : 1) && st.foes.filter((x) => !x.boss).length < 2) opts.push('summon');
                    f.move = opts[Math.floor(Math.random() * opts.length)];
                    f.state = 'windup';
                    f.t = f.move === 'slam' ? (bossTier === 1 ? 0.95 : 0.7) : 0.6;
                    f.hit = false;
                    if (f.move === 'charge') { f.vx = ux; f.vy = uy; }
                }
            } else if (f.state === 'windup') {
                if (f.move === 'charge') { f.vx = ux; f.vy = uy; } // re-aim until launch
                if (f.t <= 0) {
                    if (f.move === 'slam') {
                        const slamR = bossTier === 1 ? 26 : bossTier === 2 ? 34 : 40;
                        const slamDur = bossTier === 1 ? 0.58 : bossTier === 2 ? 0.42 : 0.3;
                        const slamMult = bossTier === 1 ? 0.75 : bossTier === 2 ? 1.1 : 1.5;
                        st.rings.push({ x: st.px, y: st.py, r: slamR, t: 0, dur: slamDur, dmg: bossDmg * slamMult, done: false });
                        sfx.slam(); st.shake = Math.max(st.shake, 5);
                        f.move = ''; f.state = 'approach'; f.moveCd = bossMoveCd(f.phase);
                    } else if (f.move === 'volley') {
                        const n = f.phase === 1 ? 3 : f.phase === 2 ? 5 : 8;
                        const base = Math.atan2(uy, ux);
                        for (let i = 0; i < n; i++) {
                            const a = f.phase >= 3 ? (i / n) * Math.PI * 2 : base + (i - (n - 1) / 2) * (0.95 / Math.max(1, n - 1));
                            fireProj(f.x, f.y - 4, a, 92, bossDmg * 0.7, d.accent, 3.6);
                        }
                        sfx.cast(); st.shake = Math.max(st.shake, 3);
                        f.move = ''; f.state = 'approach'; f.moveCd = bossMoveCd(f.phase);
                    } else if (f.move === 'charge') {
                        f.state = 'charge'; f.t = 0.7; f.hit = false; sfx.charge();
                    } else { // summon
                        const a1 = mkFoe('grunt', st.foes.length, Math.round(foeHp * 0.7));
                        const a2 = mkFoe('grunt', st.foes.length + 1, Math.round(foeHp * 0.7));
                        a1.x = f.x - 18; a1.y = f.y + 10; a2.x = f.x + 18; a2.y = f.y + 10;
                        st.foes.push(a1, a2); f.summons++;
                        setFoesLeft(st.foes.filter((x) => !x.boss).length);
                        f.move = ''; f.state = 'approach'; f.moveCd = bossMoveCd(f.phase);
                    }
                }
            } else if (f.state === 'charge') {
                const cs = 210;
                f.x += f.vx * cs * dt; f.y += f.vy * cs * dt;
                if (f.x < TILE + 6 || f.x > W - TILE - 6 || f.y < TILE + 6 || f.y > H - TILE - 6) f.t = 0;
                if (!f.hit && pd < 16 && hurtPlayer(bossDmg * 1.8)) { f.hit = true; st.px += f.vx * 10; st.py += f.vy * 10; }
                if (f.t <= 0) { f.move = ''; f.state = 'approach'; f.moveCd = bossMoveCd(f.phase); }
            }
            f.x = Math.max(TILE + 6, Math.min(W - TILE - 6, f.x));
            f.y = Math.max(TILE + 6, Math.min(H - TILE - 6, f.y));
        }

        function loop(now: number) {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
            const tsec = now / 1000;
            last = now;

            // juice decays run regardless of state so they settle on the banner
            st.shake = Math.max(0, st.shake - dt * 22);
            st.hurtFlash = Math.max(0, st.hurtFlash - dt * 1.6);
            st.hurtCd -= dt;
            let frameMoving = false;

            if (!st.done) {
                // input
                let ix = joyRef.current.x, iy = joyRef.current.y;
                const k = keysRef.current;
                if (k.has('arrowleft') || k.has('a')) ix = -1;
                if (k.has('arrowright') || k.has('d')) ix = 1;
                if (k.has('arrowup') || k.has('w')) iy = -1;
                if (k.has('arrowdown') || k.has('s')) iy = 1;
                const mag = Math.hypot(ix, iy);
                if (mag > 1) { ix /= mag; iy /= mag; }
                frameMoving = Math.hypot(ix, iy) > 0.12;
                if (frameMoving) {
                    walkTimer += dt;
                    facing = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');
                    const am = Math.hypot(ix, iy) || 1; st.aimx = ix / am; st.aimy = iy / am; // aim follows movement
                }
                const lo = TILE + 4, hiX = W - TILE - 4, hiY = H - TILE - 4;
                st.px = Math.max(lo, Math.min(hiX, st.px + ix * 84 * dt));
                st.py = Math.max(lo, Math.min(hiY, st.py + iy * 84 * dt));

                // DODGE — a quick sidestep with brief invulnerability (i-frames)
                // on a short cooldown. Universal to every path: the skill that
                // turns "stand and trade hits" into "read the attack and slip it".
                st.dodgeT = Math.max(0, st.dodgeT - dt);
                st.dodgeCd = Math.max(0, st.dodgeCd - dt);
                const forceDodge = dodgeRef.current || keysRef.current.has('shift') || keysRef.current.has('k');
                dodgeRef.current = false;
                if (st.dodgeCd <= 0 && forceDodge) {
                    st.dodgeT = 0.4;   // i-frame window
                    st.dodgeCd = 1.3;  // cooldown
                    const dm = Math.hypot(ix, iy);
                    if (dm > 0.12) { st.dashx = ix / dm; st.dashy = iy / dm; }
                    else { st.dashx = st.aimx; st.dashy = st.aimy; }
                    sfx.dash();
                    st.shake = Math.max(st.shake, 2);
                }
                // glide during the first ~0.18s of the window
                if (st.dodgeT > 0.22) {
                    st.px = Math.max(lo, Math.min(hiX, st.px + st.dashx * 320 * dt));
                    st.py = Math.max(lo, Math.min(hiY, st.py + st.dashy * 320 * dt));
                }
                const dOn = st.dodgeCd > 0 ? 1 : 0;
                if (dOn !== dodgeShownRef.current) { dodgeShownRef.current = dOn; setDodgeCd(st.dodgeCd); }

                // attack — MANUAL: only when you press Strike (or J / Space), on a
                // short cooldown. The swing is DIRECTIONAL — it hits foes in front
                // of you (a cone around your aim), so positioning + timing matter.
                st.atk -= dt; st.swing -= dt;
                const forceStrike = attackRef.current || keysRef.current.has('j') || keysRef.current.has(' ');
                attackRef.current = false;
                if (st.atk <= 0 && forceStrike) {
                    st.atk = 0.34; st.swing = 0.2;
                    sfx.strike();
                    // a small lunge in the aim direction for punch
                    st.px = Math.max(lo, Math.min(hiX, st.px + st.aimx * 5));
                    st.py = Math.max(lo, Math.min(hiY, st.py + st.aimy * 5));
                    let hits = 0, dealt = 0;
                    for (const f of st.foes) {
                        const dx = f.x - st.px, dy = f.y - st.py;
                        const dd = Math.hypot(dx, dy) || 0.001;
                        if (dd > reach + (f.boss ? 8 : 0)) continue;
                        if ((dx * st.aimx + dy * st.aimy) / dd < 0.35) continue; // must be in front
                        const sightCrit = st.trueSightT > 0 && Math.random() < 0.55;
                        const isCrit = sightCrit || (crit > 0 && Math.random() < crit);
                        const wpMult = f.boss && st.weakPointActive ? weakMult : 1;
                        const surgeMult = st.surgeT > 0 ? st.surgeMult : 1;
                        const hitDmg = Math.round((isCrit ? dmg * 2 : dmg) * wpMult * surgeMult);
                        f.hp -= hitDmg; f.hurt = 0.16; hits++; dealt += hitDmg;
                        const a = Math.atan2(dy, dx);
                        const kb = (f.boss ? 4 : 9) + knockbackBonus + (isCrit ? 4 : 0);
                        f.x += Math.cos(a) * kb; f.y += Math.sin(a) * kb;
                    }
                    if (hits > 0) {
                        sfx.hit();
                        st.shake = Math.max(st.shake, dealt > dmg ? 4.5 : 2.6);
                        if (lifesteal > 0) st.php = Math.min(maxHp, st.php + dealt * lifesteal);
                    }
                }

                // attunement abilities — triggered from the HUD bar
                const pendingAbility = abilityTriggerRef.current;
                if (pendingAbility) {
                    abilityTriggerRef.current = null;
                    triggerAbility(pendingAbility);
                }
                for (const id of Object.keys(st.abilityCds)) st.abilityCds[id] = Math.max(0, st.abilityCds[id] - dt);
                let cdDirty = false;
                for (const ab of abilitiesRef.current) {
                    const shown = st.abilityCds[ab.id] > 0 ? Math.ceil(st.abilityCds[ab.id]) : 0;
                    if (abilityCdShownRef.current[ab.id] !== shown) {
                        abilityCdShownRef.current[ab.id] = shown;
                        cdDirty = true;
                    }
                }
                if (cdDirty) setAbilityCds({ ...st.abilityCds });

                st.blockT = Math.max(0, st.blockT - dt);
                st.trueSightT = Math.max(0, st.trueSightT - dt);
                st.rallyT = Math.max(0, st.rallyT - dt);
                st.bindT = Math.max(0, st.bindT - dt);
                st.surgeT = Math.max(0, st.surgeT - dt);
                if (st.weakPointT > 0) {
                    st.weakPointT -= dt;
                    st.weakPointActive = true;
                } else {
                    st.weakPointActive = false;
                }
                if (st.weakPointActive !== weakPointActive) setWeakPointActive(st.weakPointActive);
                // ===== ENEMY AI — coordinated, telegraphed, archetype-driven =====
                // only `maxTokens` foes may attack at once; the rest circle.
                let committed = 0;
                for (const f of st.foes) if (!f.boss && (f.state === 'windup' || f.state === 'strike' || f.state === 'charge')) committed++;
                const nNon = st.foes.filter((f) => !f.boss).length || 1;

                for (const f of st.foes) {
                    f.hurt -= dt;
                    if (f.boss) { f.t -= dt; updateBoss(f, dt, tsec); continue; }
                    f.cd -= dt; f.t -= dt;

                    const pdx = st.px - f.x, pdy = st.py - f.y;
                    const pd = Math.hypot(pdx, pdy) || 0.001;
                    const ux = pdx / pd, uy = pdy / pd;
                    const isCaster = f.kind === 'caster';
                    const ringR = isCaster ? 80 : f.kind === 'brute' ? 30 : f.kind === 'flanker' ? 36 : 24;
                    const bindFactor = st.bindT > 0 ? Math.max(0.25, 1 - st.bindSlow) : 1;
                    const moveSpd = (f.kind === 'flanker' ? 64 : f.kind === 'brute' ? 30 : isCaster ? 46 : 50) * bindFactor;

                    if (f.state === 'approach') {
                        // steer to a slot spread around the player (surround); flankers
                        // orbit fast, casters keep their distance and kite.
                        const baseA = (f.slot / nNon) * Math.PI * 2 + tsec * (f.kind === 'flanker' ? 0.9 : 0.25);
                        const sa = Math.atan2(st.py + Math.sin(baseA) * ringR - f.y, st.px + Math.cos(baseA) * ringR - f.x);
                        f.x += Math.cos(sa) * moveSpd * dt;
                        f.y += Math.sin(sa) * moveSpd * dt;
                        if (isCaster && pd < 54) { f.x -= ux * moveSpd * dt; f.y -= uy * moveSpd * dt; }
                        const inRange = isCaster ? (pd < 150 && pd > 44) : pd < (f.kind === 'brute' ? 112 : 28);
                        if (f.cd <= 0 && inRange && committed < maxTokens) {
                            f.state = 'windup'; f.hasTok = true; committed++; f.hit = false;
                            f.t = isCaster ? 0.55 : f.kind === 'brute' ? 0.72 : f.kind === 'flanker' ? 0.3 : 0.45;
                        }
                    } else if (f.state === 'windup') {
                        if (!isCaster) { f.x += ux * 16 * dt; f.y += uy * 16 * dt; } // tracks slightly
                        if (f.t <= 0) {
                            if (isCaster) {
                                const shots = cfg.enemyCount >= 4 ? 3 : 1;
                                const base = Math.atan2(uy, ux);
                                for (let i = 0; i < shots; i++) fireProj(f.x, f.y - 4, base + (i - (shots - 1) / 2) * 0.26, 98, foeDmg * 1.25, '#c084fc', 3);
                                sfx.cast(); f.state = 'recover'; f.t = 0.5;
                            } else if (f.kind === 'brute') {
                                f.state = 'charge'; f.t = 0.55; f.vx = ux; f.vy = uy; f.hit = false; sfx.charge();
                            } else {
                                f.state = 'strike'; f.t = f.kind === 'flanker' ? 0.16 : 0.2; f.vx = ux; f.vy = uy; f.hit = false; sfx.strike();
                            }
                        }
                    } else if (f.state === 'strike') {
                        const ls = f.kind === 'flanker' ? 185 : 150;
                        f.x += f.vx * ls * dt; f.y += f.vy * ls * dt;
                        if (!f.hit && pd < 13 && hurtPlayer(foeDmg * (f.kind === 'flanker' ? 1.2 : 1.5))) f.hit = true;
                        if (f.t <= 0) { f.state = 'recover'; f.t = f.kind === 'flanker' ? 0.35 : 0.5; }
                    } else if (f.state === 'charge') {
                        const cs = 200;
                        f.x += f.vx * cs * dt; f.y += f.vy * cs * dt;
                        if (f.x < TILE + 5 || f.x > W - TILE - 5 || f.y < TILE + 5 || f.y > H - TILE - 5) f.t = 0;
                        if (!f.hit && pd < 15 && hurtPlayer(foeDmg * 2.4)) { f.hit = true; st.px += f.vx * 8; st.py += f.vy * 8; }
                        if (f.t <= 0) { f.state = 'recover'; f.t = 0.7; }
                    } else { // recover — back off, drop the token, set the next cooldown
                        f.x -= ux * 18 * dt; f.y -= uy * 18 * dt;
                        if (f.t <= 0) { f.state = 'approach'; f.hasTok = false; f.cd = isCaster ? rand(1.5, 2.4) : f.kind === 'brute' ? rand(2.6, 3.6) : rand(1.3, 2.1); }
                    }
                    f.x = Math.max(TILE + 4, Math.min(W - TILE - 4, f.x));
                    f.y = Math.max(TILE + 4, Math.min(H - TILE - 4, f.y));
                }

                // projectiles fly straight; a dodge phases through them
                for (const p of st.projectiles) {
                    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
                    if (p.life > 0 && st.dodgeT <= 0 && Math.hypot(p.x - st.px, p.y - (st.py - 6)) < 7 + p.r) { hurtPlayer(p.dmg); p.life = 0; }
                }
                st.projectiles = st.projectiles.filter((p) => p.life > 0 && p.x > -12 && p.x < W + 12 && p.y > -12 && p.y < H + 12);

                // AoE rings (boss slam) detonate when armed
                for (const rg of st.rings) {
                    rg.t += dt;
                    if (!rg.done && rg.t >= rg.dur) { rg.done = true; if (Math.hypot(rg.x - st.px, rg.y - st.py) < rg.r && st.dodgeT <= 0) hurtPlayer(rg.dmg); }
                }
                st.rings = st.rings.filter((rg) => rg.t < rg.dur + 0.25);
                // renewal — the Source mends you over time, never past your max
                const regenMult = st.surgeT > 0 ? st.surgeMult : 1;
                if (regen > 0 && st.php > 0) st.php = Math.min(maxHp, st.php + regen * regenMult * dt);
                // reflect HP to the bar only when the rounded value changes
                const shown = Math.max(0, Math.round(st.php));
                if (shown !== shownRef.current) { shownRef.current = shown; setHp(shown); }

                // remove dead
                const before = st.foes.length;
                const shadeDied = st.foes.some((f) => !f.boss && f.hp <= 0);
                st.foes = st.foes.filter((f) => f.hp > 0);
                if (st.foes.length !== before) {
                    if (shadeDied) { sfx.enemyDown(); st.shake = Math.max(st.shake, 3); }
                    setFoesLeft(st.foes.filter((f) => !f.boss).length);
                }

                // boss phase
                if (!st.bossSpawned && st.foes.length === 0) {
                    if (cfg.skirmish) {
                        st.done = true;
                        setOutcome('won');
                        sfx.victory();
                        st.shake = Math.max(st.shake, 5);
                        setTimeout(() => endRef.current.onVictory(), 1200);
                    } else {
                        st.bossSpawned = true;
                        const b: Foe = { x: W / 2, y: TILE * 3, hp: bossHp, max: bossHp, boss: true, hurt: 0, kind: 'brute', state: 'approach', t: 0, cd: 0, slot: 0, vx: 0, vy: 0, hasTok: false, hit: false, phase: 1, move: '', moveCd: 1.2, summons: 0 };
                        st.foes.push(b);
                        setBoss({ name: cfg.bossName, hp: b.hp, max: b.max });
                        sfx.bossSpawn(); st.shake = Math.max(st.shake, 6);
                    }
                }
                if (st.bossSpawned) {
                    const b = st.foes.find((f) => f.boss);
                    if (b) setBoss({ name: cfg.bossName, hp: Math.max(0, Math.round(b.hp)), max: b.max });
                    else setBoss((prev) => (prev ? { ...prev, hp: 0 } : prev));
                }

                // outcomes
                if (st.php <= 0) { st.done = true; setOutcome('lost'); sfx.defeat(); st.shake = Math.max(st.shake, 5); setTimeout(() => endRef.current.onDefeat(), 1400); }
                else if (st.bossSpawned && st.foes.length === 0) { st.done = true; setOutcome('won'); sfx.victory(); st.shake = Math.max(st.shake, 7); setTimeout(() => endRef.current.onVictory(), 1600); }
            }

            // ---- render ----
            const vw = canvas.clientWidth, vh = canvas.clientHeight;
            const scale = Math.min(vw / W, vh / H);
            const ox = (vw - W * scale) / 2, oy = (vh - H * scale) / 2;
            ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, vw, vh);
            const shx = st.shake > 0 ? (Math.random() * 2 - 1) * st.shake : 0;
            const shy = st.shake > 0 ? (Math.random() * 2 - 1) * st.shake : 0;
            ctx.save(); ctx.translate(ox + shx, oy + shy); ctx.scale(scale, scale);

            // floor
            ctx.fillStyle = d.bg[0]; ctx.fillRect(0, 0, W, H);
            const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.72);
            vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, d.bg[1]);
            ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#00000088';
            ctx.fillRect(0, 0, W, TILE); ctx.fillRect(0, H - TILE, W, TILE); ctx.fillRect(0, 0, TILE, H); ctx.fillRect(W - TILE, 0, TILE, H);

            const spriteAt = (cx: number, cy: number, sizeScale: number, alpha: number) => {
                const s = 16 * sizeScale;
                ctx.globalAlpha = alpha;
                ctx.drawImage(img, SHADE_TILE.col * 17, SHADE_TILE.row * 17, 16, 16, cx - s / 2, cy - s * 0.62, s, s);
                ctx.globalAlpha = 1;
            };
            const glow = (cx: number, cy: number, color: string, r: number) => {
                const g = ctx.createRadialGradient(cx, cy - 4, 0, cx, cy - 4, r);
                g.addColorStop(0, color + '66'); g.addColorStop(1, color + '00');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy - 4, r, 0, Math.PI * 2); ctx.fill();
            };
            // each guardian is its own creature, drawn in the destination's accent
            const drawBoss = (cx: number, cy: number, accent: string, art: string, hurt: number) => {
                glow(cx, cy, accent, 24);
                ctx.save();
                ctx.globalAlpha = hurt > 0 ? 0.95 : 1;
                const eye = '#fff7d6';
                if (art === 'golem') {
                    ctx.fillStyle = '#3a3340'; ctx.fillRect(cx - 12, cy - 16, 24, 28);
                    ctx.fillStyle = '#2a2530'; ctx.fillRect(cx - 12, cy + 7, 24, 5);
                    ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 12); ctx.lineTo(cx - 1, cy - 1); ctx.lineTo(cx - 6, cy + 7); ctx.stroke();
                    ctx.fillStyle = eye; ctx.fillRect(cx - 6, cy - 10, 3, 3); ctx.fillRect(cx + 3, cy - 10, 3, 3);
                } else if (art === 'serpent') {
                    ctx.strokeStyle = accent; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy + 4, 11, 0, Math.PI * 1.7); ctx.stroke();
                    ctx.fillStyle = '#16241f'; ctx.beginPath(); ctx.ellipse(cx, cy - 12, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = accent; ctx.fillRect(cx - 3, cy - 13, 2, 2); ctx.fillRect(cx + 1, cy - 13, 2, 2);
                } else if (art === 'sentinel') {
                    ctx.fillStyle = '#2b2b3a'; ctx.fillRect(cx - 9, cy - 16, 18, 27);
                    ctx.fillStyle = accent; ctx.fillRect(cx - 9, cy - 17, 18, 3);
                    ctx.fillStyle = '#d8dde6'; ctx.fillRect(cx + 9, cy - 20, 3, 30);
                    ctx.fillStyle = eye; ctx.fillRect(cx - 5, cy - 10, 3, 2); ctx.fillRect(cx + 2, cy - 10, 3, 2);
                } else if (art === 'titan') {
                    ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(cx - 10, cy - 13); ctx.lineTo(cx - 15, cy - 23); ctx.lineTo(cx - 6, cy - 15); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(cx + 10, cy - 13); ctx.lineTo(cx + 15, cy - 23); ctx.lineTo(cx + 6, cy - 15); ctx.fill();
                    ctx.fillStyle = eye; ctx.fillRect(cx - 5, cy - 7, 3, 3); ctx.fillRect(cx + 2, cy - 7, 3, 3);
                } else { // wraith
                    ctx.fillStyle = '#0c0a14'; ctx.beginPath();
                    ctx.moveTo(cx, cy - 22); ctx.quadraticCurveTo(cx - 15, cy - 6, cx - 11, cy + 12); ctx.lineTo(cx + 11, cy + 12); ctx.quadraticCurveTo(cx + 15, cy - 6, cx, cy - 22); ctx.fill();
                    ctx.fillStyle = accent + '33'; ctx.beginPath(); ctx.ellipse(cx, cy - 8, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = accent; ctx.fillRect(cx - 3, cy - 9, 2, 2); ctx.fillRect(cx + 1, cy - 9, 2, 2);
                }
                ctx.restore();
            };

            // each archetype reads differently: brutes are big & orange, casters
            // carry a violet orb, flankers are quick & green, grunts cyan. A white
            // ring telegraphs an incoming strike; a ghost trails a lunge/charge.
            const KIND_COLOR: Record<FoeKind, string> = { grunt: '#22d3ee', caster: '#c084fc', brute: '#f97316', flanker: '#34d399' };
            const drawFoe = (f: Foe) => {
                const col = KIND_COLOR[f.kind];
                const arming = f.state === 'windup';
                const sizeScale = f.kind === 'brute' ? 1.75 : f.kind === 'flanker' ? 1.0 : 1.25;
                glow(f.x, f.y, arming ? '#ffffff' : col, f.kind === 'brute' ? 16 : 11);
                if (arming) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.arc(f.x, f.y - 4, 12, 0, Math.PI * 2); ctx.stroke();
                }
                if (f.state === 'charge' || f.state === 'strike') {
                    ctx.globalAlpha = 0.3; spriteAt(f.x - f.vx * 5, f.y - f.vy * 5, sizeScale, 0.4); ctx.globalAlpha = 1;
                }
                spriteAt(f.x, f.y, sizeScale, f.hurt > 0 ? 0.95 : 0.7);
                if (f.kind === 'caster') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(f.x, f.y - 11, 2.6, 0, Math.PI * 2); ctx.fill(); }
                if (f.kind === 'brute') { ctx.fillStyle = '#000a'; ctx.fillRect(f.x - 11, f.y - 19, 22, 2); ctx.fillStyle = col; ctx.fillRect(f.x - 11, f.y - 19, 22 * Math.max(0, f.hp / f.max), 2); }
            };

            // AoE telegraphs (boss slam) — a red ground ring that fills as it arms
            for (const rg of st.rings) {
                const p = Math.min(1, rg.t / rg.dur);
                ctx.strokeStyle = rg.done ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.85)';
                ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = `rgba(239,68,68,${0.18 * (rg.done ? Math.max(0, 1 - (rg.t - rg.dur) / 0.25) : p)})`;
                ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r * (rg.done ? 1 : p), 0, Math.PI * 2); ctx.fill();
            }

            // foes
            for (const f of st.foes) {
                if (f.boss) {
                    const arming = f.state === 'windup';
                    if (arming && f.move === 'charge') {
                        ctx.strokeStyle = 'rgba(239,68,68,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
                        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + f.vx * 130, f.y + f.vy * 130); ctx.stroke(); ctx.setLineDash([]);
                    }
                    if (st.weakPointActive) {
                        glow(f.x, f.y, '#22d3ee', 30);
                        ctx.strokeStyle = '#22d3ee88'; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(f.x, f.y - 6, 18, 0, Math.PI * 2); ctx.stroke();
                    }
                    drawBoss(f.x, f.y, arming ? '#ffffff' : (st.weakPointActive ? '#22d3ee' : d.accent), cfg.bossArt || 'wraith', f.hurt);
                    ctx.fillStyle = '#000a'; ctx.fillRect(f.x - 16, f.y - 28, 32, 3);
                    ctx.fillStyle = d.accent; ctx.fillRect(f.x - 16, f.y - 28, 32 * Math.max(0, f.hp / f.max), 3);
                } else {
                    drawFoe(f);
                }
            }

            // projectiles — glowing spectral bolts you must dodge
            for (const p of st.projectiles) {
                glow(p.x, p.y, p.color, 8);
                ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.45, 0, Math.PI * 2); ctx.fill();
            }

            // swing — a directional slash arc in the aim direction
            if (st.swing > 0) {
                const a0 = Math.atan2(st.aimy, st.aimx);
                ctx.strokeStyle = `rgba(251,191,36,${Math.min(1, st.swing / 0.2)})`;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(st.px, st.py - 2, reach, a0 - 0.7, a0 + 0.7); ctx.stroke();
            }

            // player — the layered avatar (16x24) with its walk cycle
            glow(st.px, st.py, character.appearance.aura, 11);
            ctx.globalAlpha = 1;
            const wphase = Math.floor(walkTimer * 7) % 2;
            const dirFrames = avatarFrames[facing];
            const wframe = frameMoving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            const dodging = st.dodgeT > 0;
            if (dodging) {
                // cyan after-images streaking behind the dash
                ctx.globalAlpha = 0.22;
                ctx.drawImage(dirFrames[0], st.px - 8 - st.dashx * 6, st.py - 19 - st.dashy * 6, 16, 24);
                ctx.drawImage(dirFrames[0], st.px - 8 - st.dashx * 11, st.py - 19 - st.dashy * 11, 16, 24);
            }
            ctx.globalAlpha = dodging ? 0.5 : 1;
            const pBob = frameMoving && wphase === 0 ? 1 : 0;
            const pOx = st.px - 8;
            const pOy = st.py - 19 - pBob;
            ctx.drawImage(wframe, pOx, pOy, 16, 24);
            const wKind = WEAPON_BY_ID[character.equipped.weapon || 'wood_staff']?.kind || 'staff';
            drawWeaponOverlay(ctx, wKind, facing, pOx, pOy, 1);
            ctx.globalAlpha = 1;

            ctx.restore();

            // hurt vignette — a red bleed at the edges when you take a wound
            if (st.hurtFlash > 0.01) {
                const rv = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.28, vw / 2, vh / 2, Math.max(vw, vh) * 0.62);
                rv.addColorStop(0, 'rgba(239,68,68,0)');
                rv.addColorStop(1, `rgba(239,68,68,${0.55 * Math.min(1, st.hurtFlash)})`);
                ctx.fillStyle = rv; ctx.fillRect(0, 0, vw, vh);
            }

            raf = requestAnimationFrame(loop);
        }

        const start = () => { last = performance.now(); raf = requestAnimationFrame(loop); };
        if (img.complete) start(); else img.onload = start;

        const kd = (e: KeyboardEvent) => {
            keysRef.current.add(e.key.toLowerCase());
            const slot = parseInt(e.key, 10);
            if (slot >= 1 && slot <= 4) {
                const ab = abilitiesRef.current[slot - 1];
                if (ab) abilityTriggerRef.current = ab.id;
            }
        };
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        return () => {
            running = false; cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
        };
    }, []);

    const toggleMute = () => { const m = !muted; setMuted(m); setMutedState(m); };

    return (
        <div className="absolute inset-0 z-40 bg-black select-none" style={{ touchAction: 'none' }}>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full world-canvas" />

            {/* top bars — full width on desktop, centred frame on mobile */}
            <div className="absolute top-0 inset-x-0 mx-auto w-full max-w-[540px] lg:max-w-none px-4 lg:px-8 flex flex-col gap-2 pointer-events-none" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
                <div className="flex items-center justify-between">
                    <button type="button" onClick={() => { restoreExploreBgm(); onExit(); }} className="pointer-events-auto text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white">‹ Flee</button>
                    <div className="flex items-center gap-3 pointer-events-auto">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">{boss ? 'Guardian' : `Shades · ${foesLeft}`}</span>
                        <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="text-white/50 hover:text-white">
                            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                {/* player vitality — bar + hearts */}
                <div className="rounded-xl bg-black/55 border border-white/10 px-3 py-2 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[8px] font-black uppercase tracking-[0.22em] text-emerald-300/90">Vitality</span>
                        <span className="text-[9px] font-mono tabular-nums text-zinc-400">{hp} / {maxHp}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-black/60 overflow-hidden border border-white/10 mb-1.5">
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%`, background: hp > maxHp * 0.35 ? '#34d399' : hp > maxHp * 0.15 ? '#fbbf24' : '#ef4444' }}
                        />
                    </div>
                    <div className="flex items-center gap-0.5 flex-wrap" aria-hidden>
                        {Array.from({ length: 10 }, (_, i) => {
                            const threshold = ((i + 1) / 10) * maxHp;
                            const filled = hp >= threshold - maxHp * 0.05;
                            const partial = hp > i * (maxHp / 10) && !filled;
                            return (
                                <Heart
                                    key={i}
                                    className="w-3 h-3 shrink-0"
                                    style={{
                                        color: filled ? '#34d399' : partial ? '#fbbf24' : '#3f3f46',
                                        fill: filled ? '#34d399' : partial ? '#fbbf2488' : 'transparent',
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
                {boss && weakPointActive && (
                    <p className="text-[9px] uppercase tracking-[0.3em] text-cyan-400 animate-pulse">Weak point revealed — strike now</p>
                )}
                {boss && (
                    <div className="mt-1">
                        <p className="text-[9px] uppercase tracking-[0.25em] text-red-400 mb-1">{boss.name}</p>
                        <div className="h-2.5 rounded-full bg-black/50 overflow-hidden border border-red-500/30">
                            <div className="h-full bg-red-500 transition-all" style={{ width: `${(boss.hp / boss.max) * 100}%` }} />
                        </div>
                    </div>
                )}
            </div>

            {/* outcome banner */}
            {outcome !== 'fight' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="font-ritual text-3xl" style={{ color: outcome === 'won' ? '#fbbf24' : '#ef4444' }}>
                        {outcome === 'won' ? 'The guardian falls.' : 'You fall…'}
                    </p>
                </div>
            )}

            <CombatControlPad
                profile={profile}
                joy={joy}
                joyRadius={joyR}
                pathColor={pathColor}
                abilities={abilities.map((ab) => ({ id: ab.id, name: ab.name, cooldownSec: ab.cooldownSec, cd: abilityCds[ab.id] || 0 }))}
                dodgeCd={dodgeCd}
                onStrike={() => { attackRef.current = true; }}
                onDodge={() => { dodgeRef.current = true; }}
                onAbility={(id) => { abilityTriggerRef.current = id; }}
            />
        </div>
    );
}
