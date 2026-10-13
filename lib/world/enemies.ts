/**
 * The things on the plain that fight back. Same CC0 Quaternius creatures as
 * the herds, given a name, a level, a temper and loot. Where they live and
 * when they come out follows the land and the sky: slimes rise from the
 * mire (more in rain), spore-kin and wolves keep the hollow (wolves roam
 * the meadow after dark), shades walk only at night or in fog, wisps
 * circle the summit, and the bulls of the Rise leave you alone unless you
 * strike first.
 */
import { CIRCLE_C, LAKE, RISE, sh, isWater } from './terrain';
import { rng, walkableAt } from './plain';
import type { EnemyKind } from './quests';

export type { EnemyKind };

export type EnemyDef = {
    kind: EnemyKind;
    name: string;
    url: string;
    scale: number;
    level: number;
    hp: number;
    damage: number;
    /** m/s */
    walk: number;
    run: number;
    /** notices you within this many metres */
    aggro: number;
    /** strikes from this far (from its centre) */
    reach: number;
    /** seconds of telegraph before the blow */
    windup: number;
    cooldown: number;
    radius: number;
    hover: number;
    /** standing height in metres (measured from the GLB at this scale) — where the bar sits */
    height: number;
    /** how hard a stagger is to cause: damage needed in one blow, as a fraction of max hp */
    poise: number;
    /** neutral: only fights back once struck */
    neutral?: boolean;
    /** walks only at night (or in fog) */
    night?: boolean;
    xp: number;
    coins: [number, number];
    loot: { item: string; chance: number }[];
    clips: { idle: string; walk: string; run: string; attack: string; hit: string; death: string };
    /** sound it makes when it notices you */
    voice: 'squish' | 'growl' | 'wail';
};

const C = '/models/creatures';
const AR = (n: string) => `CharacterArmature|${n}`;

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
    slime: {
        kind: 'slime', name: 'Mire slime', url: `${C}/Pink_Slime.glb`, scale: 0.36, level: 1, hp: 34, damage: 7, walk: 0.8, run: 2.6, aggro: 9, reach: 1.25, windup: 0.55, cooldown: 1.6, radius: 0.4, hover: 0, height: 0.75, poise: 0.2,
        xp: 12, coins: [1, 3], loot: [{ item: 'gel', chance: 0.7 }],
        clips: { idle: AR('Idle'), walk: AR('Walk'), run: AR('Walk'), attack: AR('Bite_Front'), hit: AR('HitRecieve'), death: AR('Death') }, voice: 'squish',
    },
    blob: {
        kind: 'blob', name: 'Thistle blob', url: `${C}/Green_Blob.glb`, scale: 0.34, level: 2, hp: 46, damage: 9, walk: 0.8, run: 2.8, aggro: 9, reach: 1.3, windup: 0.5, cooldown: 1.5, radius: 0.4, hover: 0, height: 0.65, poise: 0.2,
        xp: 16, coins: [1, 4], loot: [{ item: 'gel', chance: 0.5 }, { item: 'figs', chance: 0.15 }],
        clips: { idle: AR('Idle'), walk: AR('Walk'), run: AR('Walk'), attack: AR('Bite_Front'), hit: AR('HitRecieve'), death: AR('Death') }, voice: 'squish',
    },
    spore: {
        kind: 'spore', name: 'Spore-kin', url: `${C}/Mushnub.glb`, scale: 0.32, level: 3, hp: 60, damage: 11, walk: 0.9, run: 3.0, aggro: 10, reach: 1.35, windup: 0.5, cooldown: 1.4, radius: 0.45, hover: 0, height: 1.05, poise: 0.25,
        xp: 22, coins: [2, 5], loot: [{ item: 'spore', chance: 0.75 }, { item: 'bread', chance: 0.1 }],
        clips: { idle: AR('Idle'), walk: AR('Walk'), run: AR('Walk'), attack: AR('Bite_Front'), hit: AR('HitRecieve'), death: AR('Death') }, voice: 'squish',
    },
    wolf: {
        kind: 'wolf', name: 'Hollow wolf', url: `${C}/Wolf.glb`, scale: 0.36, level: 4, hp: 78, damage: 15, walk: 1.3, run: 6.2, aggro: 15, reach: 1.7, windup: 0.42, cooldown: 1.25, radius: 0.55, hover: 0, height: 1, poise: 0.3,
        xp: 34, coins: [3, 8], loot: [{ item: 'pelt', chance: 0.8 }],
        clips: { idle: 'Idle', walk: 'Walk', run: 'Gallop', attack: 'Attack', hit: 'Idle_HitReact_Left', death: 'Death' }, voice: 'growl',
    },
    shade: {
        kind: 'shade', name: 'Shade', url: `${C}/Ghost.glb`, scale: 0.5, level: 5, hp: 70, damage: 17, walk: 1.1, run: 4.2, aggro: 16, reach: 1.6, windup: 0.6, cooldown: 1.5, radius: 0.5, hover: 0.5, height: 1.4, poise: 0.35, night: true,
        xp: 40, coins: [4, 10], loot: [{ item: 'essence', chance: 0.85 }],
        clips: { idle: AR('Flying_Idle'), walk: AR('Flying_Idle'), run: AR('Fast_Flying'), attack: AR('Punch'), hit: AR('HitReact'), death: AR('Death') }, voice: 'wail',
    },
    wisp: {
        kind: 'wisp', name: 'Wild wisp', url: `${C}/Glub.glb`, scale: 0.4, level: 6, hp: 82, damage: 16, walk: 1.0, run: 3.8, aggro: 13, reach: 1.6, windup: 0.5, cooldown: 1.4, radius: 0.5, hover: 1.2, height: 1.2, poise: 0.35,
        xp: 48, coins: [5, 12], loot: [{ item: 'wisp', chance: 0.85 }, { item: 'honey', chance: 0.1 }],
        clips: { idle: AR('Flying_Idle'), walk: AR('Flying_Idle'), run: AR('Fast_Flying'), attack: AR('Headbutt'), hit: AR('HitReact'), death: AR('Death') }, voice: 'wail',
    },
    bull: {
        kind: 'bull', name: 'Bull of the Rise', url: `${C}/Bull.glb`, scale: 0.39, level: 6, hp: 160, damage: 24, walk: 0.9, run: 5.4, aggro: 0, reach: 2.2, windup: 0.6, cooldown: 1.8, radius: 0.9, hover: 0, height: 1.8, poise: 0.5, neutral: true,
        xp: 60, coins: [0, 0], loot: [{ item: 'horn', chance: 0.9 }],
        clips: { idle: 'Idle', walk: 'Walk', run: 'Gallop', attack: 'Attack_Headbutt', hit: 'Idle_HitReact_Right', death: 'Death' }, voice: 'growl',
    },
};

export type EnemySpawn = { id: string; kind: EnemyKind; x: number; z: number; leash: number; seed: number };

/** Camps: a kind, a centre (in the plain's original coordinates, pulled in by sh()), a spread and a count */
function camps(): EnemySpawn[] {
    const r = rng(0xbadf00d);
    const out: EnemySpawn[] = [];
    const camp = (kind: EnemyKind, cx: number, cz: number, spread: number, n: number, opts: { raw?: boolean; water?: boolean } = {}) => {
        const [x0, z0] = opts.raw ? [cx, cz] : sh(cx, cz);
        let i = 0;
        let guard = 0;
        while (i < n && guard++ < 80) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * spread;
            const x = x0 + Math.cos(a) * d;
            const z = z0 + Math.sin(a) * d;
            if (!walkableAt(x, z, ENEMIES[kind].radius)) continue;
            if (!opts.water && isWater(x, z, -0.2)) continue;
            out.push({ id: `${kind}_${out.length}`, kind, x, z, leash: Math.max(18, spread + 14), seed: Math.floor(r() * 1e9) });
            i++;
        }
    };
    // the mire around the Still Water, and stragglers in the meadow
    camp('slime', LAKE.x + LAKE.r * 0.9, LAKE.z - 10, 14, 4, { raw: true });
    camp('slime', LAKE.x - 6, LAKE.z + LAKE.r * 0.95, 14, 3, { raw: true });
    camp('slime', -70, 110, 12, 2);
    // blobs in the wildflower fields
    camp('blob', 50, 300, 16, 3);
    camp('blob', -60, 280, 14, 3);
    // the hollow: spore-kin among the roots, wolves deeper in
    camp('spore', -20, -95, 18, 4);
    camp('spore', 40, -130, 18, 3);
    camp('wolf', 5, -165, 20, 3);
    camp('wolf', -45, -140, 16, 2);
    // shades: the stone circle and the hollow's edge, the meadow — at night
    camp('shade', CIRCLE_C.x, CIRCLE_C.z, 20, 2, { raw: true });
    camp('shade', 60, 120, 30, 2);
    camp('shade', -10, -60, 20, 1);
    // wisps around the summit
    camp('wisp', RISE.x, RISE.z, 26, 4, { raw: true });
    // bulls graze the Rise's lower slopes
    camp('bull', RISE.x - 30, RISE.z + 42, 18, 3, { raw: true });
    return out;
}

let cache: EnemySpawn[] | null = null;
export function enemySpawns(): EnemySpawn[] {
    if (!cache) cache = camps();
    return cache;
}

/** Seconds before a fallen enemy is back at its camp */
export const RESPAWN_S = 75;
