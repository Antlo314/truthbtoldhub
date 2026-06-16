'use client';

import { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import type { Destination } from '@/lib/game/destinations';
import { sfx, unlockAudio, setMuted, isMuted } from '@/lib/game/sfx';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';

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

interface Foe { x: number; y: number; hp: number; max: number; boss?: boolean; hurt: number; }

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
    canChannel?: boolean;
    channelHealPct?: number;
    channelCooldownSec?: number;
    canBlock?: boolean;
    blockReduction?: number;
    blockCooldownSec?: number;
    canWeakPoint?: boolean;
    weakPointDamageMult?: number;
    onVictory: () => void;
    onDefeat: () => void;
    onExit: () => void;
}

export default function CombatScene({ destination: d, character, weaponDamage, weaponReach, bonusHp = 0, bonusDamage = 0, bonusReach = 0, bonusRegen = 0, bonusLifesteal = 0, bonusCrit = 0, bonusKnockback = 0, enemyHpMult = 1, enemyDmgMult = 1, playerDamageMult = 1, playerReachBonus = 0, canChannel = false, channelHealPct = 0.25, channelCooldownSec = 14, canBlock = false, blockReduction = 0.55, blockCooldownSec = 8, canWeakPoint = false, weakPointDamageMult = 2, onVictory, onDefeat, onExit }: Props) {
    const maxHp = PLAYER_HP + bonusHp;
    const dmg = Math.round((weaponDamage + bonusDamage) * playerDamageMult);
    const reach = weaponReach + bonusReach + playerReachBonus;
    const regen = bonusRegen;
    const lifesteal = bonusLifesteal;
    const crit = bonusCrit;
    const knockbackBonus = bonusKnockback;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const joyRef = useRef({ x: 0, y: 0 });
    const keysRef = useRef<Set<string>>(new Set());
    const attackRef = useRef(false);
    const [knob, setKnob] = useState({ x: 0, y: 0 });
    const joyActive = useRef(false);
    const baseRef = useRef<HTMLDivElement>(null);
    const JOY_R = 46;

    const [hp, setHp] = useState(maxHp);
    const [boss, setBoss] = useState<{ name: string; hp: number; max: number } | null>(null);
    const [foesLeft, setFoesLeft] = useState(0);
    const [outcome, setOutcome] = useState<'fight' | 'won' | 'lost'>('fight');
    const [muted, setMutedState] = useState(isMuted());
    const [channelCd, setChannelCd] = useState(0);
    const [blockCd, setBlockCd] = useState(0);
    const [weakPointActive, setWeakPointActive] = useState(false);
    const channelRef = useRef(false);
    const blockRef = useRef(false);

    const endRef = useRef({ onVictory, onDefeat });
    endRef.current = { onVictory, onDefeat };
    // last HP value pushed to the bar — guards against a render every frame
    // while the Mystic's renewal is ticking.
    const shownRef = useRef(maxHp);

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
            foes: [] as Foe[], bossSpawned: false, done: false,
            shake: 0, hurtFlash: 0, hurtCd: 0,
            blockT: 0, blockCd: 0,
            weakPointT: 0, weakPointActive: false, weakPointCycle: 7,
        };
        const foeHp = Math.round(cfg.enemyHp * enemyHpMult);
        const bossHp = Math.round(cfg.bossHp * enemyHpMult);
        const foeDmg = cfg.enemyDmg * enemyDmgMult;
        const bossDmg = cfg.bossDmg * enemyDmgMult;
        let channelTimer = 0;

        for (let i = 0; i < cfg.enemyCount; i++) {
            st.foes.push({ x: rand(TILE * 2, W - TILE * 2), y: rand(TILE * 2, H / 2), hp: foeHp, max: foeHp, hurt: 0 });
        }
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

        const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

        function loop(now: number) {
            if (!running) return;
            const dt = Math.min(0.05, (now - last) / 1000);
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
                        const isCrit = crit > 0 && Math.random() < crit;
                        const weakMult = f.boss && canWeakPoint && st.weakPointActive ? weakPointDamageMult : 1;
                        const hitDmg = Math.round((isCrit ? dmg * 2 : dmg) * weakMult);
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

                // foes act
                const speedFor = (f: Foe) => (f.boss ? 26 : 34);
                let contactDps = 0;
                for (const f of st.foes) {
                    f.hurt -= dt;
                    const a = Math.atan2(st.py - f.y, st.px - f.x);
                    f.x += Math.cos(a) * speedFor(f) * dt;
                    f.y += Math.sin(a) * speedFor(f) * dt;
                    if (dist(f, { x: st.px, y: st.py }) < (f.boss ? 14 : 10)) contactDps += f.boss ? bossDmg : foeDmg;
                }
                // Sentinel block — brief damage reduction on cooldown
                st.blockCd = Math.max(0, st.blockCd - dt);
                if (canBlock && blockRef.current && st.blockCd <= 0) {
                    blockRef.current = false;
                    st.blockT = 0.45;
                    st.blockCd = blockCooldownSec;
                }
                st.blockT = Math.max(0, st.blockT - dt);
                if (Math.abs(st.blockCd - blockCd) > 0.4 || (st.blockCd === 0 && blockCd > 0)) {
                    setBlockCd(st.blockCd);
                }

                // Seer weak point — periodic boss vulnerability window
                if (canWeakPoint && st.bossSpawned) {
                    st.weakPointCycle -= dt;
                    if (st.weakPointCycle <= 0) {
                        st.weakPointActive = !st.weakPointActive;
                        st.weakPointCycle = st.weakPointActive ? 2.4 : 7;
                        if (st.weakPointActive !== weakPointActive) setWeakPointActive(st.weakPointActive);
                    }
                }

                // Mystic channel — burst heal on cooldown
                channelTimer = Math.max(0, channelTimer - dt);
                if (canChannel && channelRef.current && channelTimer <= 0 && st.php > 0) {
                    channelRef.current = false;
                    channelTimer = channelCooldownSec;
                    st.php = Math.min(maxHp, st.php + maxHp * channelHealPct);
                    st.shake = Math.max(st.shake, 3);
                    sfx.hit();
                }
                if (Math.abs(channelTimer - channelCd) > 0.4 || (channelTimer === 0 && channelCd > 0)) {
                    setChannelCd(channelTimer);
                }
                if (contactDps > 0) {
                    const blockMult = st.blockT > 0 ? Math.max(0, 1 - blockReduction) : 1;
                    st.php -= contactDps * blockMult * dt;
                    st.hurtFlash = Math.min(1, st.hurtFlash + 0.22);
                    st.shake = Math.max(st.shake, 2.6);
                    if (st.hurtCd <= 0) { sfx.hurt(); st.hurtCd = 0.45; }
                }
                // renewal — the Source mends you over time, never past your max
                if (regen > 0 && st.php > 0) st.php = Math.min(maxHp, st.php + regen * dt);
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
                    st.bossSpawned = true;
                    const b: Foe = { x: W / 2, y: TILE * 3, hp: bossHp, max: bossHp, boss: true, hurt: 0 };
                    st.foes.push(b);
                    setBoss({ name: cfg.bossName, hp: b.hp, max: b.max });
                    sfx.bossSpawn(); st.shake = Math.max(st.shake, 6);
                }
                if (st.bossSpawned) {
                    const b = st.foes.find((f) => f.boss);
                    if (b) setBoss({ name: cfg.bossName, hp: Math.max(0, Math.round(b.hp)), max: b.max });
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

            const spriteAt = (cx: number, cy: number, sizeScale: number, alpha: number, tint?: string) => {
                const s = 16 * sizeScale;
                if (tint) { ctx.save(); }
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

            // foes
            for (const f of st.foes) {
                if (f.boss) {
                    if (canWeakPoint && st.weakPointActive) {
                        glow(f.x, f.y, '#22d3ee', 30);
                        ctx.strokeStyle = '#22d3ee88';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(f.x, f.y - 6, 18, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    drawBoss(f.x, f.y, canWeakPoint && st.weakPointActive ? '#22d3ee' : d.accent, cfg.bossArt || 'wraith', f.hurt);
                    ctx.fillStyle = '#000a'; ctx.fillRect(f.x - 16, f.y - 28, 32, 3);
                    ctx.fillStyle = d.accent; ctx.fillRect(f.x - 16, f.y - 28, 32 * (f.hp / f.max), 3);
                } else {
                    glow(f.x, f.y, '#22d3ee', 11);
                    spriteAt(f.x, f.y, 1.2, f.hurt > 0 ? 0.9 : 0.55);
                }
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
            ctx.drawImage(wframe, st.px - 8, st.py - 19 - (frameMoving && wphase === 0 ? 1 : 0), 16, 24);

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

        const kd = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        return () => {
            running = false; cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
        };
    }, []);

    const joyMove = (cx: number, cy: number) => {
        const rect = baseRef.current!.getBoundingClientRect();
        const dx = cx - (rect.left + rect.width / 2), dy = cy - (rect.top + rect.height / 2);
        const dd = Math.hypot(dx, dy) || 1, m = Math.min(dd, JOY_R), a = Math.atan2(dy, dx);
        const kx = Math.cos(a) * m, ky = Math.sin(a) * m;
        setKnob({ x: kx, y: ky }); joyRef.current = { x: kx / JOY_R, y: ky / JOY_R };
    };
    const joyEnd = () => { joyActive.current = false; setKnob({ x: 0, y: 0 }); joyRef.current = { x: 0, y: 0 }; };
    const toggleMute = () => { const m = !muted; setMuted(m); setMutedState(m); };

    return (
        <div className="absolute inset-0 z-40 bg-black select-none" style={{ touchAction: 'none' }}>
            <canvas ref={canvasRef} className="world-canvas" />

            {/* top bars — centred phone-width frame, safe-area aware */}
            <div className="absolute top-0 inset-x-0 mx-auto w-full max-w-[540px] px-4 flex flex-col gap-2 pointer-events-none" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
                <div className="flex items-center justify-between">
                    <button onClick={onExit} className="pointer-events-auto text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white">‹ Flee</button>
                    <div className="flex items-center gap-3 pointer-events-auto">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">{boss ? 'Guardian' : `Shades · ${foesLeft}`}</span>
                        <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="text-white/50 hover:text-white">
                            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                {/* player hp */}
                <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(hp / maxHp) * 100}%`, background: hp > maxHp * 0.3 ? '#34d399' : '#ef4444' }} />
                </div>
                {canWeakPoint && boss && weakPointActive && (
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

            {/* controls — centred phone-width frame; joystick and Strike sit at
                the same height (safe-area aware) so they're balanced for thumbs */}
            <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[540px] pointer-events-none" style={{ height: 220 }}>
                <div
                    ref={baseRef}
                    onTouchStart={(e) => { unlockAudio(); joyActive.current = true; const t = e.touches[0]; joyMove(t.clientX, t.clientY); }}
                    onTouchMove={(e) => { e.preventDefault(); if (joyActive.current) { const t = e.touches[0]; joyMove(t.clientX, t.clientY); } }}
                    onTouchEnd={joyEnd}
                    onMouseDown={(e) => { unlockAudio(); joyActive.current = true; joyMove(e.clientX, e.clientY); }}
                    onMouseMove={(e) => { if (joyActive.current) joyMove(e.clientX, e.clientY); }}
                    onMouseUp={joyEnd} onMouseLeave={joyEnd}
                    className="absolute left-6 rounded-full border border-white/15 bg-black/30 backdrop-blur-md pointer-events-auto"
                    style={{ width: JOY_R * 2, height: JOY_R * 2, bottom: 'calc(1.75rem + env(safe-area-inset-bottom))', boxShadow: 'inset 0 0 18px rgba(0,0,0,0.4)', touchAction: 'none' }}
                >
                    <div className="absolute rounded-full" style={{ width: '44%', height: '44%', left: '28%', top: '28%', background: 'rgba(251,191,36,0.6)', border: '1px solid rgba(251,191,36,0.85)', boxShadow: '0 0 12px rgba(251,191,36,0.5)', transform: `translate(${knob.x}px, ${knob.y}px)` }} />
                </div>

                {canBlock && (
                    <button
                        onClick={() => { unlockAudio(); blockRef.current = true; }}
                        disabled={blockCd > 0}
                        className="absolute w-[4.25rem] h-[4.25rem] rounded-full text-[8px] font-black uppercase tracking-widest text-black flex flex-col items-center justify-center active:scale-95 transition-transform pointer-events-auto disabled:opacity-35"
                        style={{
                            right: canChannel ? '11.5rem' : '6.75rem',
                            bottom: 'calc(2rem + env(safe-area-inset-bottom))',
                            background: 'linear-gradient(135deg,#e2e8f0 0%,#94a3b8 100%)',
                            boxShadow: '0 0 18px rgba(148,163,184,0.35)',
                            touchAction: 'none',
                        }}
                    >
                        Block
                        {blockCd > 0 && <span className="text-[7px] mt-0.5">{Math.ceil(blockCd)}s</span>}
                    </button>
                )}
                {canChannel && (
                    <button
                        onClick={() => { unlockAudio(); channelRef.current = true; }}
                        disabled={channelCd > 0}
                        className="absolute right-[6.75rem] w-[4.5rem] h-[4.5rem] rounded-full text-[9px] font-black uppercase tracking-widest text-white flex flex-col items-center justify-center active:scale-95 transition-transform pointer-events-auto disabled:opacity-35"
                        style={{ bottom: 'calc(2rem + env(safe-area-inset-bottom))', background: 'linear-gradient(135deg,#10b981 0%,#047857 100%)', boxShadow: '0 0 20px rgba(16,185,129,0.35)', touchAction: 'none' }}
                    >
                        Channel
                        {channelCd > 0 && <span className="text-[7px] mt-0.5">{Math.ceil(channelCd)}s</span>}
                    </button>
                )}
                <button
                    onClick={() => { unlockAudio(); attackRef.current = true; }}
                    onTouchStart={(e) => { e.preventDefault(); unlockAudio(); attackRef.current = true; }}
                    className="absolute right-6 w-[5.5rem] h-[5.5rem] rounded-full text-[11px] font-black uppercase tracking-widest text-black flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
                    style={{ bottom: 'calc(1.75rem + env(safe-area-inset-bottom))', background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)', boxShadow: '0 0 28px rgba(251,191,36,0.45)', touchAction: 'none' }}
                >
                    Strike
                </button>
            </div>
        </div>
    );
}
