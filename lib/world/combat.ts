/**
 * The plain's fight, in one place. The player's live vitals (vitality,
 * breath, spirit) and what they are doing; every enemy that can be struck,
 * registered by its component; how a strike finds its targets and how a
 * blow finds the player. Mutable module state, read in frame loops — the
 * HUD samples it on a timer, so nothing re-renders at 60 Hz.
 */
import { getWalkerPose } from '@/components/truthos/house/walkerPose';
import type { Stats } from './stats';
import type { EnemyKind } from './quests';
import { sfx } from './sfx';

export type ActionId = 'atk1' | 'atk2' | 'atk3' | 'heavy' | 'roll' | 'hurt' | 'knock' | 'die' | 'pray' | 'block' | 'light' | 'eat';

/** How long each action holds the body, and when its blow lands (s) */
export const ACTIONS: Record<ActionId, { dur: number; hitAt?: number; cost?: number; mul?: number; move: number }> = {
    atk1: { dur: 0.55, hitAt: 0.22, cost: 14, mul: 1, move: 0.35 },
    atk2: { dur: 0.55, hitAt: 0.22, cost: 14, mul: 1.1, move: 0.35 },
    atk3: { dur: 0.75, hitAt: 0.32, cost: 18, mul: 1.45, move: 0.25 },
    heavy: { dur: 1.0, hitAt: 0.5, cost: 30, mul: 2.3, move: 0.1 },
    roll: { dur: 0.6, cost: 22, move: 0 },
    hurt: { dur: 0.35, move: 0.4 },
    knock: { dur: 0.8, move: 0 },
    die: { dur: 99, move: 0 },
    pray: { dur: 99, move: 0 },
    block: { dur: 99, move: 0.35 },
    light: { dur: 0.9, hitAt: 0.35, move: 0 },
    eat: { dur: 1.1, move: 0.5 },
};

export type Player = {
    hp: number;
    stamina: number;
    spirit: number;
    stats: Stats | null;
    action: ActionId | null;
    /** performance.now() the action began */
    actionAt: number;
    /** strike already resolved for this action */
    struck: boolean;
    comboStep: number;
    /** a strike pressed during the current one */
    queued: 'light' | 'heavy' | null;
    iframesUntil: number;
    /** breath does not return until */
    regenAt: number;
    blocking: boolean;
    dead: boolean;
    /** heal over time */
    hot: { left: number; perS: number };
    deliverUntil: number;
    lightReadyAt: number;
    /** roll direction */
    rollX: number;
    rollZ: number;
};

export const player: Player = {
    hp: 100,
    stamina: 100,
    spirit: 40,
    stats: null,
    action: null,
    actionAt: 0,
    struck: false,
    comboStep: 0,
    queued: null,
    iframesUntil: 0,
    regenAt: 0,
    blocking: false,
    dead: false,
    hot: { left: 0, perS: 0 },
    deliverUntil: 0,
    lightReadyAt: 0,
    rollX: 0,
    rollZ: 0,
};

export function actionAge(now = performance.now()): number {
    return (now - player.actionAt) / 1000;
}

export function setAction(a: ActionId | null) {
    player.action = a;
    player.actionAt = performance.now();
    player.struck = false;
}

export function spend(cost: number): boolean {
    if (player.stamina < Math.min(cost, 6)) return false;
    player.stamina = Math.max(0, player.stamina - cost);
    player.regenAt = performance.now() + 750;
    return true;
}

/* ── events: the HUD and the experience listen ─────────────── */

export type CombatEvent =
    | { type: 'hit'; x: number; y: number; z: number; amount: number; crit: boolean }
    | { type: 'hurt'; amount: number; blocked: boolean }
    | { type: 'heal'; amount: number }
    | { type: 'kill'; kind: EnemyKind; x: number; z: number; level: number }
    | { type: 'death' }
    | { type: 'aggro'; kind: EnemyKind };

const listeners = new Set<(e: CombatEvent) => void>();
export function onCombat(fn: (e: CombatEvent) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
export function emit(e: CombatEvent) {
    listeners.forEach((fn) => fn(e));
}

/* ── enemies register themselves ─────────────────────────── */

export type EnemyHandle = {
    id: string;
    kind: EnemyKind;
    x: number;
    y: number;
    z: number;
    radius: number;
    alive: () => boolean;
    /** take a blow; returns true if it fell */
    receive: (amount: number, fromX: number, fromZ: number, opts: { stagger: boolean; knock: number }) => boolean;
};

export const enemies = new Map<string, EnemyHandle>();

/** Nearest living enemy within range — for the HUD's target frame and soft aim */
export function nearestEnemy(x: number, z: number, range: number): EnemyHandle | null {
    let best: EnemyHandle | null = null;
    let bd = range;
    enemies.forEach((e) => {
        if (!e.alive()) return;
        const d = Math.hypot(e.x - x, e.z - z);
        if (d < bd) {
            bd = d;
            best = e;
        }
    });
    return best;
}

/**
 * A strike from the walker: every living enemy within reach and inside the
 * arc in front takes it. Returns how many were hit.
 */
export function strike(opts: { damage: number; reach: number; arc: number; crit: number; stagger: boolean; knock: number; around?: boolean }): number {
    const p = getWalkerPose();
    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    let hits = 0;
    enemies.forEach((e) => {
        if (!e.alive()) return;
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > opts.reach + e.radius) return;
        // anything nearly touching you is in the blow, whatever its bearing
        if (!opts.around && d > e.radius + 0.9) {
            const cos = (dx * fx + dz * fz) / d;
            if (cos < Math.cos(opts.arc / 2)) return;
        }
        const crit = Math.random() < opts.crit;
        const amount = Math.round(opts.damage * (crit ? 2 : 1) * (0.92 + Math.random() * 0.16));
        e.receive(amount, p.x, p.z, { stagger: opts.stagger || crit, knock: opts.knock });
        emit({ type: 'hit', x: e.x, y: e.y + 1.2, z: e.z, amount, crit });
        sfx(crit ? 'crit' : 'hit', { at: e });
        hits++;
    });
    return hits;
}

/**
 * A blow aimed at the walker from (fromX, fromZ). Rolling makes you
 * untouchable; a raised Shield of Faith turns most of a frontal blow.
 * Returns the damage that landed.
 */
export function hurtPlayer(amount: number, fromX: number, fromZ: number, knock = false): number {
    if (player.dead) return 0;
    const now = performance.now();
    if (now < player.iframesUntil) return 0;
    const s = player.stats;
    let dmg = amount * (1 - (s?.guard ?? 0));
    let blocked = false;
    if (player.blocking && s?.hasShield) {
        const p = getWalkerPose();
        const fx = -Math.sin(p.yaw);
        const fz = -Math.cos(p.yaw);
        const dx = fromX - p.x;
        const dz = fromZ - p.z;
        const d = Math.hypot(dx, dz) || 1;
        if ((dx * fx + dz * fz) / d > 0.25 && spend(amount * 0.8)) {
            dmg *= 0.3;
            blocked = true;
            sfx('block');
        }
    }
    dmg = Math.max(1, Math.round(dmg));
    player.hp = Math.max(0, player.hp - dmg);
    player.iframesUntil = now + 380;
    emit({ type: 'hurt', amount: dmg, blocked });
    if (!blocked) sfx('hurt', { volume: 0.9 });
    if (player.hp <= 0) {
        player.dead = true;
        setAction('die');
        emit({ type: 'death' });
        sfx('fall');
    } else if (!blocked && player.action !== 'pray' && player.action !== 'roll') {
        setAction(knock ? 'knock' : 'hurt');
    } else if (player.action === 'pray') {
        // a blow breaks the prayer
        setAction('hurt');
    }
    return dmg;
}

export function healPlayer(amount: number) {
    const max = player.stats?.maxHp ?? 100;
    const before = player.hp;
    player.hp = Math.min(max, player.hp + amount);
    if (player.hp > before) emit({ type: 'heal', amount: Math.round(player.hp - before) });
}

/** Full vitals — entering the plain, rising after a fall */
export function restorePlayer() {
    const s = player.stats;
    player.hp = s?.maxHp ?? 100;
    player.stamina = s?.maxStamina ?? 100;
    player.spirit = s?.maxSpirit ?? 40;
    player.dead = false;
    player.action = null;
    player.blocking = false;
    player.hot = { left: 0, perS: 0 };
    player.iframesUntil = performance.now() + 2500;
}
