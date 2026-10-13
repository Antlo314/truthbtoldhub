'use client';

/**
 * The fight, frame by frame. Reads what the hands asked for (combatInput),
 * runs the action the body is in — a three-strike combo, a heavy blow, a
 * roll you cannot be touched during, a raised shield, a prayer, the Light —
 * resolves strikes at the moment they land, and keeps breath, spirit and
 * healing-over-time moving. Publishes the action to the walker state so
 * your body (and, over presence, everyone else's view of it) performs it.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ACTIONS, actionAge, player, setAction, spend, strike } from '@/lib/world/combat';
import { combatInput } from '@/lib/world/combatInput';
import { PRAYER_SECONDS } from '@/lib/world/disciplines';
import { sfx } from '@/lib/world/sfx';
import { getWalkerState, setWalkerState } from '@/components/truthos/house/walkerPose';
import type { WorldProgress } from '@/lib/world/quests';
import { has, isFasting } from '@/lib/world/stats';

const ATTACKS = new Set(['atk1', 'atk2', 'atk3', 'heavy', 'light']);

export default function PlainCombat({
    locked,
    world,
    onPrayed,
    onDenied,
}: {
    locked: boolean;
    world: WorldProgress;
    /** a prayer was finished (not broken) */
    onPrayed: () => void;
    /** something could not be done — and why, for a toast */
    onDenied: (why: string) => void;
}) {
    const { gl } = useThree();
    const lockedRef = useRef(locked);
    lockedRef.current = locked;
    const worldRef = useRef(world);
    worldRef.current = world;
    const cbs = useRef({ onPrayed, onDenied });
    cbs.current = { onPrayed, onDenied };
    const lastFight = useRef(0);
    const prayStart = useRef(0);
    const deniedAt = useRef(0);

    // dev only: a headless check can drive and read the fight
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') return;
        void import('@/lib/world/combat').then((c) => {
            (window as unknown as { __combat?: unknown }).__combat = { player: c.player, enemies: c.enemies, input: combatInput };
        });
    }, []);

    // keys and mouse buttons
    useEffect(() => {
        const el = gl.domElement;
        const typing = (e: Event) => {
            const t = e.target as HTMLElement | null;
            return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        };
        const down = (e: KeyboardEvent) => {
            if (typing(e) || lockedRef.current || e.repeat) return;
            if (e.code === 'KeyF') combatInput.push('light');
            else if (e.code === 'KeyG') combatInput.push('heavy');
            else if (e.code === 'KeyQ') combatInput.push('roll');
            else if (e.code === 'KeyP') combatInput.push('pray');
            else if (e.code === 'KeyX') combatInput.push('burst');
            else if (e.code === 'KeyC') combatInput.block = true;
        };
        const up = (e: KeyboardEvent) => {
            if (e.code === 'KeyC') combatInput.block = false;
        };
        const mouse = (e: PointerEvent) => {
            if (lockedRef.current || document.pointerLockElement !== el) return;
            if (e.button === 0) combatInput.push('light');
            else if (e.button === 2) combatInput.push('heavy');
        };
        const blur = () => combatInput.clear();
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        el.addEventListener('pointerdown', mouse);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
            el.removeEventListener('pointerdown', mouse);
            combatInput.clear();
        };
    }, [gl]);

    useFrame((_, dtRaw) => {
        const dt = Math.min(dtRaw, 0.05);
        const now = performance.now();
        const s = player.stats;
        if (!s) return;
        const w = worldRef.current;
        const deny = (why: string) => {
            if (now - deniedAt.current < 700) return;
            deniedAt.current = now;
            sfx('deny');
            cbs.current.onDenied(why);
        };

        // ── vitals ──
        if (!player.dead) {
            const walk = getWalkerState();
            const busy = player.action && ATTACKS.has(player.action);
            if (walk.sprinting && walk.speed > 3) {
                player.stamina = Math.max(0, player.stamina - 11 * dt);
                player.regenAt = now + 350;
            } else if (now > player.regenAt && !busy && player.action !== 'roll' && !player.blocking) {
                player.stamina = Math.min(s.maxStamina, player.stamina + s.staminaRegen * dt);
            }
            if (player.blocking) player.stamina = Math.max(0, player.stamina - 4 * dt);
            if (player.hot.left > 0) {
                const step = Math.min(player.hot.left, player.hot.perS * dt);
                player.hot.left -= step;
                player.hp = Math.min(s.maxHp, player.hp + step);
            }
            if (isFasting(w) && has(w, 'not_by_bread')) player.hp = Math.min(s.maxHp, player.hp + 0.8 * dt);
            player.spirit = Math.min(s.maxSpirit, player.spirit + 1.2 * dt);
        }

        // ── what the hands asked for ──
        const cmd = lockedRef.current || player.dead ? undefined : combatInput.take();
        if (lockedRef.current) combatInput.clear();
        const a = player.action;
        const free = !a || a === 'block';
        if (cmd === 'light') {
            if (a && (a === 'atk1' || a === 'atk2' || a === 'atk3') && actionAge(now) > 0.12) {
                player.queued = 'light';
            } else if (free) {
                if (spend(ACTIONS.atk1.cost!)) {
                    player.comboStep = 1;
                    setAction('atk1');
                    sfx('swing');
                    lastFight.current = now;
                } else deny('Out of breath');
            }
        } else if (cmd === 'heavy') {
            if (free || (a && ATTACKS.has(a) && actionAge(now) > ACTIONS[a].dur * 0.7)) {
                const cost = ACTIONS.heavy.cost! * (has(w, 'iron_will') ? 0.75 : 1);
                if (spend(cost)) {
                    player.comboStep = 0;
                    setAction('heavy');
                    sfx('swingHeavy');
                    lastFight.current = now;
                } else deny('Out of breath');
            }
        } else if (cmd === 'roll') {
            if (a !== 'die' && a !== 'knock' && a !== 'roll') {
                const cost = ACTIONS.roll.cost! * (has(w, 'thy_will') ? 0.7 : 1);
                if (spend(cost)) {
                    // the roll goes where you were heading, or back from where you face
                    setAction('roll');
                    player.iframesUntil = now + (has(w, 'thy_will') ? 470 : 360);
                    sfx('dodge');
                } else deny('Out of breath');
            }
        } else if (cmd === 'pray') {
            if (a === 'pray') {
                setAction(null);
            } else if (free) {
                const walk = getWalkerState();
                if (now - lastFight.current < 5000) deny('Your heart is still racing — step away from the fight first');
                else if (walk.speed > 0.5 || !walk.grounded) deny('Be still to pray');
                else {
                    setAction('pray');
                    prayStart.current = now;
                    sfx('prayStart');
                }
            }
        } else if (cmd === 'burst') {
            if (!has(w, 'the_light')) deny('Learn The Light (prayer branch) to call it');
            else if (now < player.lightReadyAt) deny('The Light is gathering');
            else if (player.spirit < 25) deny('Not enough spirit');
            else if (free) {
                player.spirit -= 25;
                player.lightReadyAt = now + 8000;
                setAction('light');
                sfx('light');
                lastFight.current = now;
            }
        }

        // the shield
        const wantBlock = combatInput.block && s.hasShield && player.stamina > 2;
        if (wantBlock && (!player.action || player.action === 'block')) {
            if (player.action !== 'block') setAction('block');
            player.blocking = true;
        } else if (player.action === 'block') {
            setAction(null);
            player.blocking = false;
        } else player.blocking = false;

        // ── the action runs ──
        const act = player.action;
        if (act && act !== 'block' && act !== 'pray' && act !== 'die') {
            const spec = ACTIONS[act];
            const age = actionAge(now);
            if (spec.hitAt !== undefined && !player.struck && age >= spec.hitAt) {
                player.struck = true;
                if (act === 'light') {
                    strike({ damage: s.damage * 1.6, reach: 5, arc: Math.PI * 2, crit: 0, stagger: true, knock: 2.5, around: true });
                } else {
                    const mountain = act === 'atk3' && has(w, 'mountain_mover');
                    strike({
                        damage: s.damage * (spec.mul ?? 1) * (mountain ? 2 : 1),
                        reach: s.reach,
                        arc: act === 'heavy' ? 2.8 : 2.45,
                        crit: s.crit,
                        stagger: act === 'heavy' && has(w, 'iron_will'),
                        knock: mountain ? 3 : act === 'heavy' ? 1.6 : 0.5,
                    });
                }
            }
            if (age >= spec.dur) {
                // a strike pressed in time continues the combo
                if (player.queued === 'light' && (act === 'atk1' || act === 'atk2') && player.stamina >= 6) {
                    const next = act === 'atk1' ? 'atk2' : 'atk3';
                    spend(ACTIONS[next].cost!);
                    player.comboStep++;
                    setAction(next);
                    sfx(next === 'atk3' ? 'swingHeavy' : 'swing');
                    lastFight.current = now;
                } else {
                    setAction(null);
                    player.comboStep = 0;
                }
                player.queued = null;
            }
        }
        if (act === 'pray' && (now - prayStart.current) / 1000 >= PRAYER_SECONDS) {
            setAction(null);
            sfx('prayDone');
            cbs.current.onPrayed();
        }
        if (act && act !== 'pray' && prayStart.current && act !== 'die') prayStart.current = 0;

        // ── publish to the body ──
        const cur = player.action;
        setWalkerState({
            action: cur,
            actionAt: player.actionAt,
            actionDur: cur ? ACTIONS[cur].dur : undefined,
            combat: now - lastFight.current < 6000,
        });
    });

    return null;
}

/** Seconds into the current prayer, 0 if not praying — for the prayer overlay */
export function prayerProgress(): number {
    if (player.action !== 'pray') return 0;
    return Math.min(1, actionAge() / PRAYER_SECONDS);
}
