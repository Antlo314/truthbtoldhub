/**
 * A soul's numbers on the plain, derived — never stored. Level, the three
 * disciplines of Matthew 6, the skills learned and the armour worn go in;
 * vitality, breath, spirit, strength and the rest come out. Recomputed
 * whenever progress changes, read by the combat loop every frame.
 */
import { discLevel } from './disciplines';
import { item, type EquipSlot } from './items';
import { levelFor, type WorldProgress } from './quests';
import { SKILLS } from './skills';

export type Stats = {
    level: number;
    prayer: number;
    fasting: number;
    giving: number;
    /** derived attributes */
    strength: number;
    vitality: number;
    spirit: number;
    maxHp: number;
    maxStamina: number;
    maxSpirit: number;
    /** breath per second, once you stop spending it */
    staminaRegen: number;
    /** damage of a light strike, before crits */
    damage: number;
    reach: number;
    /** fraction of every blow taken away */
    guard: number;
    crit: number;
    speedMul: number;
    hasShield: boolean;
    weapon: string;
    /** grace: skill points earned, spent and free */
    graceEarned: number;
    graceSpent: number;
    graceFree: number;
};

export const has = (w: WorldProgress | undefined, id: string) => !!w?.skills?.includes(id);

export function isFasting(w: WorldProgress | undefined): boolean {
    return !!w?.fast;
}

export function deriveStats(w: WorldProgress): Stats {
    const level = levelFor(w.xp || 0);
    const prayer = discLevel(w.disc?.prayer ?? 0);
    const fasting = discLevel(w.disc?.fasting ?? 0);
    const giving = discLevel(w.disc?.giving ?? 0);
    const equip = w.equip ?? {};
    const worn = (Object.keys(equip) as EquipSlot[]).map((s) => item(equip[s] || '')).filter(Boolean);

    const strength = 1 + fasting * 2 + Math.floor(level / 2);
    const vitality = giving * 2 + level;
    const spirit = prayer * 2;

    let maxHp = 100 + vitality * 7;
    let maxStamina = 100 + spirit * 5 + prayer * 2;
    let guard = 0;
    let speedMul = 1;
    for (const d of worn) {
        maxHp += d!.maxHp ?? 0;
        maxStamina += d!.maxStamina ?? 0;
        guard += d!.guard ?? 0;
        speedMul += d!.speed ?? 0;
    }
    if (has(w, 'open_hand')) maxHp += 20;
    if (has(w, 'heart_is')) maxHp += Math.min(80, Math.floor((w.heaven ?? 0) / 10));

    const weaponId = equip.weapon && item(equip.weapon) ? equip.weapon : 'staff_shepherd';
    const wd = item(weaponId)!;
    let dmgMul = 1 + strength * 0.06;
    if (has(w, 'lean_strength')) dmgMul += 0.1;
    if (has(w, 'anointed') && isFasting(w)) dmgMul += 0.2;

    let staminaRegen = 26 + spirit * 0.8;
    if (has(w, 'quiet_breath')) staminaRegen *= 1.25;
    if (isFasting(w) && !has(w, 'anointed')) staminaRegen *= 0.85;
    if (has(w, 'anointed') && isFasting(w)) staminaRegen *= 1.15;

    const graceEarned = Math.max(0, level - 1) + Math.floor((prayer + fasting + giving) / 2);
    const graceSpent = (w.skills ?? []).reduce((a, id) => a + (SKILLS.find((s) => s.id === id)?.cost ?? 0), 0);

    return {
        level,
        prayer,
        fasting,
        giving,
        strength,
        vitality,
        spirit,
        maxHp,
        maxStamina,
        maxSpirit: 40 + spirit * 6,
        staminaRegen,
        damage: Math.round((wd.damage ?? 10) * dmgMul),
        reach: wd.reach ?? 2.3,
        guard: Math.min(0.6, guard),
        crit: 0.05 + (has(w, 'left_hand') ? 0.1 : 0),
        speedMul,
        hasShield: equip.shield === 'shield_faith',
        weapon: weaponId,
        graceEarned,
        graceSpent,
        graceFree: Math.max(0, graceEarned - graceSpent),
    };
}
