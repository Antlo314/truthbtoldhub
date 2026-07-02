'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameCharacter } from '@/lib/store/useGameStore';
import { useGameStore } from '@/lib/store/useGameStore';
import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import { wornAvatar } from '@/lib/game/avatar';
import { ArrowLeft, Heart, Volume2, VolumeX, BookOpen, Wind } from 'lucide-react';
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
import { joyRadius, MOBILE_JOY_R, MOBILE_ACTION } from '@/lib/game/controls';
import { loadSettings, prefersReducedMotion } from '@/lib/game/settings';
import DestinationMinimap from '@/components/game/DestinationMinimap';
import {
    exploredChunksFromDiscovered, initialRevealChunks, mapRevealKey, newRevealDiscoveries,
} from '@/lib/game/mapReveal';
import {
    EDEN_MAP_W, EDEN_MAP_H, EDEN_TILE, edenBiomeAt, edenRegionAt,
    EDEN_SPAWN, EDEN_GARDENER, EDEN_TREE_OF_LIFE, EDEN_TREE_OF_KNOWLEDGE, EDEN_CHERUB,
    EDEN_RIVERS_V2, EDEN_RIVER_ORDER, EDEN_REGIONS, edenRegionById, edenKey, EDEN_KEYS,
    edenDayState, EDEN_DAY_SECONDS,
    type EdenDayPhase, type EdenRiverId, type EdenRegionId,
} from '@/lib/game/eden/atlas';
import { buildEdenOverworld, edenNearestWalkable, isEdenWalkable } from '@/lib/game/edenOverworld';
import { edenRegionCleansed, edenRestoredPct, EDEN_BLIGHT_TRIGGER_LABELS } from '@/lib/game/eden/blight';
import {
    hydrateEdenState, isEdenSolid, updateEdenProgress, edenDestinationStub,
    edenZoneLabel, edenDiscoveriesFromState, edenWingId, edenWingGreeting, canRevealEdenSecret,
    edenGuideStep, EDEN_RESPAWN_LINE, edenMinimapTerrain, edenMinimapGates, edenMinimapPois,
    EDEN_MINIMAP_TERRAIN_COLORS, type EdenLevelState,
} from '@/lib/game/edenLevel';
import { EDEN_CREATURES, EDEN_CREATURE_COUNT, nameCreatureKey, creatureById } from '@/lib/game/eden/bestiary';
import { edenEchoId } from '@/lib/game/eden/combats';
import { EDEN_BEDS, EDEN_SEEDS, seedById, harvestFruitKey, growthStage } from '@/lib/game/eden/cultivation';
import {
    EDEN_SERPENT_BEATS, serpentBeatById, serpentChoiceKey, climaxResolution, knowledgeOutcomeKey, listenedAny,
} from '@/lib/game/eden/serpent';
import type { EdenBedRuntime, EdenSeed } from '@/lib/game/eden/types';
import { edenCodex } from '@/lib/game/eden/codex';
import EdenCodex from '@/components/game/destinations/eden/EdenCodex';
import NamingPanel from '@/components/game/destinations/eden/NamingPanel';
import TendPanel from '@/components/game/destinations/eden/TendPanel';

const CHAR_SHEET = '/assets/kenney/roguelikeChar.png';
const SHADE_TILE = { col: 0, row: 3 };
const MAX_DUNGEON_HP = 100;

function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }
const th = (c: number, r: number, s = 0) => {
    let x = (c * 374761393 + r * 668265263 + s * 2246822519) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

// The biome-tinted ground+decor is static and deterministic — bake it once
// per page load and reuse the canvas across every mount and fight transition.
let EDEN_GROUND_LAYER: HTMLCanvasElement | null = null;
function edenGroundLayer(ow: ReturnType<typeof buildEdenOverworld>): HTMLCanvasElement {
    if (EDEN_GROUND_LAYER) return EDEN_GROUND_LAYER;
    const layer = document.createElement('canvas');
    layer.width = EDEN_MAP_W * 16;
    layer.height = EDEN_MAP_H * 16;
    const gctx = layer.getContext('2d')!;
    for (let r = 0; r < EDEN_MAP_H; r++) {
        for (let c = 0; c < EDEN_MAP_W; c++) {
            const biome = edenBiomeAt(c, r);
            const gv = ow.ground[r][c];
            const x = c * 16, y = r * 16;
            if (gv === 2) { gctx.fillStyle = biome.water; gctx.fillRect(x, y, 16, 16); }
            else if (gv === 1) { gctx.fillStyle = biome.dirt; gctx.fillRect(x, y, 16, 16); }
            else {
                gctx.fillStyle = biome.grass[Math.floor(th(c >> 2, r >> 2, 1) * 3) % 3];
                gctx.fillRect(x, y, 16, 16);
                if (th(c, r, 5) > 0.94) { gctx.fillStyle = biome.motes; gctx.globalAlpha = 0.5; gctx.fillRect(x + 6, y + 6, 2, 2); gctx.globalAlpha = 1; }
            }
            const d = ow.decor[r][c];
            if (d === 1) {
                gctx.fillStyle = 'rgba(0,0,0,0.18)';
                gctx.beginPath(); gctx.ellipse(x + 8, y + 13, 6, 2.5, 0, 0, Math.PI * 2); gctx.fill();
                gctx.fillStyle = biome.trunk; gctx.fillRect(x + 6, y + 9, 4, 6);
                gctx.fillStyle = biome.canopy;
                gctx.beginPath(); gctx.ellipse(x + 8, y + 6, 7, 7, 0, 0, Math.PI * 2); gctx.fill();
                gctx.fillStyle = 'rgba(255,255,255,0.10)';
                gctx.beginPath(); gctx.ellipse(x + 6, y + 4, 3, 3, 0, 0, Math.PI * 2); gctx.fill();
            } else if (d === 2) {
                gctx.fillStyle = biome.canopy;
                gctx.beginPath(); gctx.ellipse(x + 8, y + 10, 6, 5, 0, 0, Math.PI * 2); gctx.fill();
            } else if (d === 3) {
                // rock — walkable biome-tinted stones
                gctx.fillStyle = 'rgba(0,0,0,0.15)';
                gctx.beginPath(); gctx.ellipse(x + 8, y + 12, 5, 2, 0, 0, Math.PI * 2); gctx.fill();
                gctx.fillStyle = '#8a8580'; gctx.beginPath(); gctx.ellipse(x + 8, y + 10, 4, 3, 0, 0, Math.PI * 2); gctx.fill();
                gctx.fillStyle = '#aca7a0'; gctx.beginPath(); gctx.ellipse(x + 7, y + 9, 2, 1.5, 0, 0, Math.PI * 2); gctx.fill();
            } else if (d === 4) {
                // flowers — short stems topped with the biome accent
                gctx.fillStyle = '#4f8a3a';
                gctx.fillRect(x + 5, y + 9, 1, 4); gctx.fillRect(x + 8, y + 8, 1, 5); gctx.fillRect(x + 11, y + 10, 1, 3);
                gctx.fillStyle = biome.accent;
                gctx.fillRect(x + 4, y + 8, 2, 2); gctx.fillRect(x + 7, y + 7, 2, 2); gctx.fillRect(x + 10, y + 9, 2, 2);
            } else if (d === 5) {
                // tall grass — blades in the biome's own grass tones
                gctx.fillStyle = biome.grass[2];
                gctx.fillRect(x + 4, y + 8, 1, 6); gctx.fillRect(x + 6, y + 6, 1, 8); gctx.fillRect(x + 8, y + 7, 1, 7); gctx.fillRect(x + 10, y + 6, 1, 8); gctx.fillRect(x + 12, y + 9, 1, 5);
                gctx.fillStyle = biome.grass[0];
                gctx.fillRect(x + 7, y + 5, 1, 3); gctx.fillRect(x + 11, y + 5, 1, 3);
            } else if (d === 6) {
                // reeds — tall stalks fringing the water's edge
                gctx.fillStyle = '#3f6b4a';
                gctx.fillRect(x + 5, y + 5, 1, 9); gctx.fillRect(x + 8, y + 3, 1, 11); gctx.fillRect(x + 11, y + 6, 1, 8);
                gctx.fillStyle = '#caa15e';
                gctx.fillRect(x + 8, y + 2, 1, 2); gctx.fillRect(x + 5, y + 4, 1, 2);
            }
        }
    }
    EDEN_GROUND_LAYER = layer;
    return layer;
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

type NearTarget =
    | { kind: 'lore'; id: string; label: string }
    | { kind: 'name'; id: string; label: string }
    | { kind: 'tend'; id: string; label: string }
    | { kind: 'gardener'; id: string; label: string }
    | { kind: 'rematch'; id: string; label: string }
    | { kind: 'attune'; id: string; label: string }
    | null;

type Overlay =
    | { kind: 'codex' }
    | { kind: 'naming'; creatureId: string }
    | { kind: 'tend'; bedId: string }
    | null;

interface FruitBuff { hp: number; damage: number; regen: number; lifesteal: number; crit: number; fights: number; }

// ------------------------------------------------------------
//  THE BLIGHT + THE WIND-STEP (dash) + THE ATTUNEMENT TRIALS
//  All session-side tuning lives here; cleansed state itself is
//  derived (lib/game/eden/blight.ts) so saves need no new keys.
// ------------------------------------------------------------
const DASH_TIME = 0.18;         // seconds of dash movement
const DASH_MULT = 2.4;          // speed multiplier while dashing
const DASH_CD = 1.1;            // cooldown between dashes
const DASH_IFRAME = DASH_TIME + 0.4; // blight i-frames: dash + 0.4s after
const BLIGHT_GRACE = 1.5;       // seconds on blighted ground before it drinks
const BLIGHT_DPS = 4;           // hp per second drained
const BLIGHT_FLOOR = 8;         // the blight pressures — it never kills
const RUSH_TIME = 22;           // Pishon: Gleaning Rush timer
const RUSH_MOTES = 10;          // gold motes spawned
const RUSH_NEED = 7;            // motes required
const CHANNEL_NEED = 12;        // seconds of channel to bank
const CHANNEL_RING = 32;        // channel ring radius (world px ≈ 2 tiles)
const ATTUNE_ABORT_DIST = 12 * EDEN_TILE; // wander this far → clean abort

interface AttuneMote { x: number; y: number; got: boolean }
interface AttuneWisp { x: number; y: number; active: boolean; spawnAt: number }
interface AttuneState {
    river: EdenRiverId;
    kind: 'rush' | 'channel';
    t: number;          // elapsed seconds
    timer: number;      // rush: seconds remaining
    motes: AttuneMote[];
    collected: number;
    need: number;
    hitCd: number;      // rush: grace between wisp hits
    progress: number;   // channel: seconds banked
    wisps: AttuneWisp[];
    fx: number;         // fountain world px
    fy: number;
}

/** A wisp rises at the edge of the river's own region and drifts for the ring. */
function channelWispSpawn(riverId: EdenRiverId): { x: number; y: number } {
    const reg = edenRegionById(riverId as EdenRegionId);
    const [x0, y0, x1, y1] = reg.rect;
    const side = Math.floor(Math.random() * 4);
    const rx = x0 + Math.random() * (x1 - x0);
    const ry = y0 + Math.random() * (y1 - y0);
    const gx = side === 0 ? x0 + 1 : side === 1 ? x1 - 1 : rx;
    const gy = side === 2 ? y0 + 1 : side === 3 ? y1 - 1 : ry;
    return { x: (gx + 0.5) * EDEN_TILE, y: (gy + 0.5) * EDEN_TILE };
}

// The garden strengthens, but it does not break the trials: fruit buffs stack
// additively only up to these ceilings, so farming the beds can't trivialise
// the guardians or the Cherub.
const FRUIT_BUFF_CAP = { hp: 30, damage: 12, regen: 8, lifesteal: 0.3, crit: 0.3 } as const;

export default function EdenWorld({
    character, isSolved, isGuardianCleared,
    onSolve, onClaim, onExit, onGuardianCleared, onDiscover,
}: Props) {
    const founderNumber = useGameStore((s) => s.founderNumber);
    const consumeFightBonusHp = useGameStore((s) => s.consumeFightBonusHp);
    const markMinigameCleared = useGameStore((s) => s.markMinigameCleared);
    const grantSkillPoints = useGameStore((s) => s.grantSkillPoints);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const charRef = useRef(character);
    charRef.current = character;

    const [muted, setMutedState] = useState(isMuted());
    const [dungeonHp, setDungeonHp] = useState(MAX_DUNGEON_HP);
    const [level, setLevel] = useState<EdenLevelState>(() => hydrateEdenState(character));
    const [zoneLabel, setZoneLabel] = useState('The Threshold');
    const [dayLabel, setDayLabel] = useState('Morning');
    const [dayT, setDayT] = useState(0.18);
    const [near, setNear] = useState<NearTarget>(null);
    const [nearSerpent, setNearSerpent] = useState<string | null>(null);
    const [relicClaimed, setRelicClaimed] = useState(character.inventory.includes('relic_eden_leaf'));
    const [activeFight, setActiveFight] = useState<string | null>(null);
    const [overlay, setOverlay] = useState<Overlay>(null);
    const [bedRuntime, setBedRuntime] = useState<Record<string, EdenBedRuntime>>({});
    const [fruitBuff, setFruitBuff] = useState<FruitBuff | null>(null);
    const [dialogue, setDialogue] = useState<{ speaker: string; text: string; color?: string } | null>(
        isGuardianCleared
            ? { speaker: 'The Gardener', text: 'The cherub has fallen. Walk north to the Tree of Life and claim the Leaf — the hour before the lie.', color: '#34d399' }
            : { speaker: 'The Gardener', text: 'Welcome back to the hour before shame. Roam the open garden — name the living creatures, light the four rivers, and walk north to the Tree.', color: '#34d399' },
    );
    const [barrierActive, setBarrierActive] = useState(!isSolved);
    const [playerPos, setPlayerPos] = useState({ x: (EDEN_SPAWN.gx + 0.5) * EDEN_TILE, y: (EDEN_SPAWN.gy + 0.5) * EDEN_TILE });
    const [exploredVersion, setExploredVersion] = useState(0);
    const exploredRef = useRef(exploredChunksFromDiscovered(character.discovered, 'eden'));
    const mapSyncRef = useRef({ lastAt: 0 });

    const profile = useInputProfile();
    const isDesktop = useIsDesktopLayout();
    const joyR = joyRadius(profile, loadSettings().controlSize === 'large') || MOBILE_JOY_R;
    const actionBtn = loadSettings().controlSize === 'large' ? 84 : MOBILE_ACTION;
    const joy = useJoystick(joyR);
    const joyRef = joy.joyRef;
    const keysRef = useRef<Set<string>>(new Set());
    const fightTriggeredRef = useRef<string | null>(null);
    const [fightBonus, setFightBonus] = useState(0);
    const serpentResolvingRef = useRef(false);
    const rematchRef = useRef<string | null>(null);
    const completeFiredRef = useRef(character.discovered.includes(edenKey('milestone', 'complete')));
    const touchedRef = useRef(new Set<string>());
    const wingsSeenRef = useRef(new Set(character.discovered.filter((d) => d.startsWith('eden_wing_'))));
    const lastWingRef = useRef<string | null>(null);
    const ambientRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; streak?: boolean; size?: number }[]>([]);
    const riverParticlesRef = useRef<{ ox: number; oy: number; tx: number; ty: number; color: string; t: number; speed: number }[]>([]);
    const serpOfferShownRef = useRef<string | null>(null);
    const fightWarnRef = useRef<Record<string, number>>({});
    const dayPhaseRef = useRef<EdenDayPhase>('morning');
    const dayBrightnessRef = useRef(1);
    const gardenerWorldRef = useRef({ x: (EDEN_GARDENER.gx + 0.5) * EDEN_TILE, y: (EDEN_GARDENER.gy + 0.5) * EDEN_TILE });
    const dawnBlessedRef = useRef(false);
    // ---- blight / dash / attunement (session-side; cleansed state is derived) ----
    const [dashCdUi, setDashCdUi] = useState(0);
    const [bloomToast, setBloomToast] = useState<{ text: string; tone: 'bloom' | 'blight' } | null>(null);
    const bloomToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dashShownRef = useRef(0);
    const dashReqRef = useRef(false);
    const reduceRef = useRef(false);
    const bloomsRef = useRef<{ region: EdenRegionId; start: number }[]>([]);
    const prevCleansedRef = useRef<Record<string, boolean> | null>(null);
    const blightWarnedRef = useRef(false);

    const levelRef = useRef(level);
    levelRef.current = level;
    const barrierRef = useRef(barrierActive);
    barrierRef.current = barrierActive;
    const overlayRef = useRef(overlay);
    overlayRef.current = overlay;
    const bedRuntimeRef = useRef(bedRuntime);
    bedRuntimeRef.current = bedRuntime;
    const nearSerpentRef = useRef(nearSerpent);
    nearSerpentRef.current = nearSerpent;

    const edenTerrain = useMemo(() => edenMinimapTerrain(), []);
    // blighted regions read darker on the minimap — shift their terrain ids by
    // +10 (colors in EDEN_MINIMAP_TERRAIN_COLORS). Rebuilds only when a
    // region's cleansed state actually changes, so it stays cheap.
    const cleansedSig = EDEN_REGIONS.map((r) => (edenRegionCleansed(r.id, level, character) ? '1' : '0')).join('');
    const minimapTerrain = useMemo(() => {
        if (!cleansedSig.includes('0')) return edenTerrain;
        const blighted = EDEN_REGIONS.filter((_, i) => cleansedSig[i] === '0');
        const out = edenTerrain.map((row) => row.slice());
        for (const reg of blighted) {
            const [x0, y0, x1, y1] = reg.rect;
            for (let r = y0; r <= y1; r++) {
                for (let c = x0; c <= x1; c++) {
                    if (out[r]?.[c] !== undefined && out[r][c] < 10) out[r][c] += 10;
                }
            }
        }
        return out;
    }, [edenTerrain, cleansedSig]);
    const minimapPois = useMemo(() => edenMinimapPois(level, {
        secretVisible: canRevealEdenSecret(level, character), relicClaimed,
    }), [level, character, relicClaimed]);
    const minimapGates = useMemo(() => edenMinimapGates(level), [level]);
    const showMinimap = loadSettings().showMinimap;

    const guideStep = useMemo(() => edenGuideStep(level, {
        isGuardianCleared, isSolved, relicClaimed, hasWeapon: !!character.equipped.weapon,
    }), [level, isGuardianCleared, isSolved, relicClaimed, character.equipped.weapon]);

    const wpn = WEAPON_BY_ID[character.equipped.weapon || 'wood_staff'] || WEAPON_BY_ID['wood_staff'];
    const baseBonuses = useMemo(() => {
        const cSkill = skillBonuses(character.skills);
        const cFounder = founderBonuses(founderNumber);
        const cCloth = clothingBonus(character.equipped.clothing);
        const blessing = combatRelicBonuses(character.inventory, character.equipped.relic);
        const pathMods = pathCombatMods(character.path, character.skills);
        return {
            bonusHp: blessing.hp + cSkill.hp + cFounder.hp + cCloth.hp,
            bonusDamage: blessing.damage + cSkill.damage + cFounder.damage + cCloth.damage,
            bonusReach: blessing.reach + cSkill.reach + cFounder.reach + cCloth.reach,
            bonusRegen: cSkill.regen + cCloth.regen + blessing.regen,
            bonusLifesteal: blessing.lifesteal,
            bonusCrit: blessing.crit,
            bonusKnockback: blessing.knockback,
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
        setDungeonHp(30);
        setDialogue({ speaker: 'The Gardener', text: EDEN_RESPAWN_LINE, color: '#34d399' });
        sfx.defeat();
    }, []);

    // fast-travel from the codex — fold the distance to a known wing
    const warpTo = useCallback((gx: number, gy: number) => {
        const snap = edenNearestWalkable(gx, gy, levelRef.current);
        const st = gameStateRef.current;
        st.px = (snap.gx + 0.5) * EDEN_TILE;
        st.py = (snap.gy + 0.5) * EDEN_TILE;
        setOverlay(null);
        setPlayerPos({ x: st.px, y: st.py });
        setDialogue({ speaker: 'The Gardener', text: 'The garden folds the distance for one who has walked it before.', color: '#34d399' });
        sfx.pickup();
    }, []);

    // reduced-motion — settings toggle OR the OS media query (same pattern as
    // the arcade canvases); new blight/bloom flourishes read reduceRef only.
    useEffect(() => {
        reduceRef.current = prefersReducedMotion();
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const set = () => { reduceRef.current = prefersReducedMotion(); };
        mq.addEventListener?.('change', set);
        return () => mq.removeEventListener?.('change', set);
    }, []);

    // "Garden Restored" — derived, no persistence of its own.
    const restoredPct = useMemo(() => edenRestoredPct(level, character), [level, character]);

    // Bloom watcher — when a region's cleansed state flips true during play,
    // fire the one-time celebration (radial pulse + cue + toast). The first
    // pass only records the baseline so loaded saves never re-celebrate.
    useEffect(() => {
        const map: Record<string, boolean> = {};
        for (const r of EDEN_REGIONS) map[r.id] = edenRegionCleansed(r.id, level, character);
        const prev = prevCleansedRef.current;
        prevCleansedRef.current = map;
        if (!prev) return;
        const flipped = EDEN_REGIONS.filter((r) => map[r.id] && !prev[r.id]);
        if (!flipped.length) return;
        const pct = edenRestoredPct(level, character);
        if (!reduceRef.current) {
            for (const r of flipped) bloomsRef.current.push({ region: r.id, start: performance.now() });
        }
        sfx.victory();
        setBloomToast({ text: `${flipped.map((r) => r.name).join(' · ')} breathe${flipped.length > 1 ? '' : 's'} again — Garden Restored ${pct}%`, tone: 'bloom' });
        if (bloomToastTimerRef.current) clearTimeout(bloomToastTimerRef.current);
        bloomToastTimerRef.current = setTimeout(() => setBloomToast(null), 4200);
    }, [level, character]);
    useEffect(() => () => { if (bloomToastTimerRef.current) clearTimeout(bloomToastTimerRef.current); }, []);

    // 100% — every road of the garden walked. Fires once, grants the title + reward.
    useEffect(() => {
        if (completeFiredRef.current) return;
        const sum = edenCodex(character, level);
        if (sum.overall.total > 0 && sum.overall.done >= sum.overall.total) {
            completeFiredRef.current = true;
            onDiscover([edenKey('milestone', 'complete')]);
            grantSkillPoints(2);
            const rank = sum.untempted ? 'Keeper of the Garden, Undivided' : 'Keeper of the Garden';
            setDialogue({
                speaker: 'The Gardener',
                text: `You have walked every road of the garden and left nothing unmet — every creature named, every river lit, every word read, every shade and echo answered. Eden is whole in you. Take the name the first keeper bore: ${rank}. (+2 skill points)`,
                color: '#fde68a',
            });
            sfx.victory();
        }
    }, [character, level, onDiscover, grantSkillPoints]);

    useEffect(() => {
        const explored = exploredChunksFromDiscovered(character.discovered, 'eden');
        const toDiscover: string[] = [];
        for (const ch of initialRevealChunks(EDEN_SPAWN.gx, EDEN_SPAWN.gy, EDEN_MAP_W, EDEN_MAP_H)) {
            if (!explored.has(ch)) {
                explored.add(ch);
                const [cx, cy] = ch.split('_').map(Number);
                toDiscover.push(mapRevealKey('eden', cx, cy));
            }
        }
        exploredRef.current = explored;
        if (toDiscover.length) onDiscover(toDiscover);
        setExploredVersion((v) => v + 1);
    }, [character.discovered, onDiscover]);

    const gameStateRef = useRef({
        px: (EDEN_SPAWN.gx + 0.5) * EDEN_TILE,
        py: (EDEN_SPAWN.gy + 0.5) * EDEN_TILE,
        walkT: 0,
        facing: 'down' as 'down' | 'up' | 'left' | 'right',
        t: 0,
        dayStart: 0,
        // the wind-step (dash) — i-frames vs the blight, respects collision
        dashT: 0, dashCd: 0, dashIT: 0, dashDx: 0, dashDy: 1,
        // blight drain bookkeeping (grace resets when you leave blight)
        blightGrace: 0, blightAcc: 0,
        // the in-world attunement trial (null = none running)
        attune: null as AttuneState | null,
        // roaming lesson shades (flavour for the southern trials)
        shades: [
            { x: 40 * EDEN_TILE, y: 56 * EDEN_TILE, vx: 14, vy: -10, fightId: 'fight_lesson_1' },
            { x: 20 * EDEN_TILE, y: 52 * EDEN_TILE, vx: -12, vy: 11, fightId: 'fight_lesson_2' },
            { x: 74 * EDEN_TILE, y: 52 * EDEN_TILE, vx: 10, vy: 13, fightId: 'fight_lesson_3' },
        ],
        // roaming creatures
        creatures: EDEN_CREATURES.map((c) => ({
            id: c.id,
            x: (c.home.gx + 0.5) * EDEN_TILE,
            y: (c.home.gy + 0.5) * EDEN_TILE,
            hx: (c.home.gx + 0.5) * EDEN_TILE,
            hy: (c.home.gy + 0.5) * EDEN_TILE,
            vx: (th(c.home.gx, c.home.gy, 1) - 0.5) * 18,
            vy: (th(c.home.gx, c.home.gy, 2) - 0.5) * 18,
            roam: c.roam * EDEN_TILE,
            glyph: c.glyph,
            phases: c.phases,
            // wariness — unnamed creatures dart from anyone who rushes them
            dartT: 0, dartDx: 0, dartDy: 0, dartCd: 0, startleT: 0,
        })),
    });

    // ---- creature naming ----
    const nameCreature = useCallback((creatureId: string) => {
        if (level.named.includes(creatureId)) { setOverlay(null); return; }
        const cr = EDEN_CREATURES.find((c) => c.id === creatureId);
        setLevel((prev) => updateEdenProgress({ ...prev, named: [...prev.named, creatureId] }));
        const keys = [nameCreatureKey(creatureId)];
        if (cr?.reward?.key) keys.push(cr.reward.key);
        if (cr?.reward?.skillPoint) grantSkillPoints(1);
        // the first work complete — every living thing named.
        const allNamed = level.named.length + 1 >= EDEN_CREATURE_COUNT
            && !charRef.current.discovered.includes(EDEN_KEYS.allNamed);
        if (allNamed) {
            keys.push(EDEN_KEYS.allNamed);
            grantSkillPoints(1);
            const sp = (cr?.reward?.skillPoint ? 1 : 0) + 1;
            const loreLine = cr?.lore ? `${cr.lore}\n\n` : '';
            setDialogue({ speaker: 'The Gardener', text: `${loreLine}Every living thing has its name again. The first work — the one given to the first man — is finished in you. (+${sp} skill point${sp > 1 ? 's' : ''})`, color: '#34d399' });
        } else if (cr?.lore) {
            const bonus = cr.reward?.skillPoint ? ' (+1 skill point)' : '';
            setDialogue({ speaker: cr.name, text: cr.lore + bonus, color: '#fbbf24' });
        }
        onDiscover(keys);
        sfx.victory();
        setOverlay(null);
    }, [level.named, onDiscover, grantSkillPoints]);

    // ---- cultivation ----
    const plantSeed = useCallback((bedId: string, seedId: string) => {
        setBedRuntime((prev) => ({ ...prev, [bedId]: { seedId, plantedAt: Date.now(), spent: false } }));
        const seed = seedById(seedId);
        setDialogue({ speaker: 'The Gardener', text: `You press a ${seed?.name ?? 'seed'} into the soil. Let the cool of the day pass over it.`, color: '#86efac' });
        sfx.pickup();
        setOverlay(null);
    }, []);

    const harvestBed = useCallback((bedId: string, seed: EdenSeed) => {
        setBedRuntime((prev) => ({ ...prev, [bedId]: { seedId: null, plantedAt: 0, spent: true } }));
        const f = seed.fruit;
        if (f.heal) setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + f.heal!));
        if (f.buff) {
            setFruitBuff((prev) => ({
                hp: Math.min(FRUIT_BUFF_CAP.hp, (prev?.hp ?? 0) + (f.buff!.hp ?? 0)),
                damage: Math.min(FRUIT_BUFF_CAP.damage, (prev?.damage ?? 0) + (f.buff!.damage ?? 0)),
                regen: Math.min(FRUIT_BUFF_CAP.regen, (prev?.regen ?? 0) + (f.buff!.regen ?? 0)),
                lifesteal: Math.min(FRUIT_BUFF_CAP.lifesteal, (prev?.lifesteal ?? 0) + (f.buff!.lifesteal ?? 0)),
                crit: Math.min(FRUIT_BUFF_CAP.crit, (prev?.crit ?? 0) + (f.buff!.crit ?? 0)),
                fights: Math.max(prev?.fights ?? 0, f.buff!.fights),
            }));
        }
        const extra: string[] = [];
        if (!level.fruitsHarvested.includes(f.id)) {
            setLevel((prev) => ({ ...prev, fruitsHarvested: [...prev.fruitsHarvested, f.id] }));
            extra.push(harvestFruitKey(f.id));
        }
        if (!charRef.current.discovered.includes(EDEN_KEYS.firstHarvest)) extra.push(EDEN_KEYS.firstHarvest);
        if (extra.length) onDiscover(extra);
        setDialogue({ speaker: 'The Garden', text: f.line, color: '#a3e635' });
        sfx.victory();
        setOverlay(null);
    }, [level.fruitsHarvested, onDiscover]);

    // ---- serpent arc ----
    const resolveSerpent = useCallback((beatId: string, choice: 'resisted' | 'listened') => {
        // one resolution per beat — guards against a double-tap on the fork
        // (the buttons fire before React unmounts the panel) corrupting a
        // permanent, one-shot moral choice.
        if (serpentResolvingRef.current || levelRef.current.serpent[beatId]) return;
        const beat = serpentBeatById(beatId);
        if (!beat) return;
        serpentResolvingRef.current = true;
        setNearSerpent(null);
        serpOfferShownRef.current = null;

        if (beat.climax) {
            // the moral fork at the Tree of Knowledge — both endings are honourable
            // and the river history shapes the words. Each grants a real blessing:
            // tasting opens the eyes to every hidden cache; refusing pays in strength.
            const taste = choice === 'listened';
            const listenedCount = Object.entries(levelRef.current.serpent)
                .filter(([id, c]) => id !== 'serpent_tree' && c === 'listened').length;
            const res = climaxResolution(taste, listenedCount);
            const sp = res.power === 'extra-skill' ? 2 : 1;
            const keys = [serpentChoiceKey(beatId, choice), knowledgeOutcomeKey(res.outcome)];
            setLevel((prev) => ({ ...prev, serpent: { ...prev.serpent, [beatId]: choice }, knowledgeOutcome: res.outcome }));
            onDiscover(keys);
            grantSkillPoints(sp);
            setDialogue({ speaker: res.title, text: `${res.line}\n\n${res.blessingLabel} · +${sp} skill point${sp > 1 ? 's' : ''}`, color: taste ? '#ef4444' : '#34d399' });
            taste ? sfx.hit() : sfx.victory();
            return;
        }

        setLevel((prev) => ({ ...prev, serpent: { ...prev.serpent, [beatId]: choice } }));
        onDiscover([serpentChoiceKey(beatId, choice)]);

        if (choice === 'resisted') {
            setDialogue({ speaker: 'The Gardener', text: beat.resistedLine, color: '#34d399' });
            sfx.strike();
            return;
        }
        // listened — the shortcut buckles into a trap
        setDialogue({ speaker: 'A whisper', text: beat.listenedLine, color: '#ef4444' });
        if (beat.shortcut) {
            gameStateRef.current.px = (beat.shortcut.gx + 0.5) * EDEN_TILE;
            gameStateRef.current.py = (beat.shortcut.gy + 0.5) * EDEN_TILE;
        }
        setDungeonHp((hp) => {
            const next = hp - 25;
            if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
            return next;
        });
        if (beat.listenedFight && character.equipped.weapon) {
            fightTriggeredRef.current = `serpent_${beatId}`;
            setFightBonus(consumeFightBonusHp());
            setActiveFight(beat.listenedFight);
        }
        sfx.hit();
    }, [onDiscover, character.equipped.weapon, consumeFightBonusHp, softRespawn, grantSkillPoints]);

    // ---- fights ----
    const markFightCleared = useCallback((fightId: string, combatId: string) => {
        setLevel((prev) => {
            const next = updateEdenProgress({
                ...prev,
                fights: prev.fights.map((f) => (f.id === fightId ? { ...f, cleared: true } : f)),
            });
            onDiscover(edenDiscoveriesFromState(next));
            if (combatId === EDEN_CHERUB.combatId) onGuardianCleared();
            return next;
        });
        fightTriggeredRef.current = null;
        setActiveFight(null);
        setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + 10));
        // tick down the fruit buff
        setFruitBuff((prev) => (prev && prev.fights > 1 ? { ...prev, fights: prev.fights - 1 } : null));
    }, [onGuardianCleared, onDiscover]);

    // ---- river lighting — the EXACT flow the old walk-and-touch ran, now the
    //      payoff of a won attunement. Genesis order + Cherub-road opening are
    //      untouched; persistence is the same edenKey('river', id) as ever.
    const lightNextRiver = useCallback(() => {
        const lvl = levelRef.current;
        const nextIdx = lvl.riversLit.length;
        if (nextIdx >= EDEN_RIVER_ORDER.length) return;
        const id = EDEN_RIVER_ORDER[nextIdx];
        const rv = EDEN_RIVERS_V2[id];
        const lit = nextIdx + 1;
        setLevel((prev) => updateEdenProgress({ ...prev, riversLit: [...prev.riversLit, nextIdx] }));
        onDiscover([edenKey('river', id)]);
        sfx.strike();
        if (lit >= EDEN_RIVER_ORDER.length) {
            setBarrierActive(false);
            onSolve();
            markMinigameCleared('mg_eden_match');
            setDialogue({ speaker: 'The Gardener', text: 'The four rivers converge and the ordering is whole. The Cherub road north opens — and the rare cuttings, myrtle and spikenard, have awakened in the garden beds. Tend them before you ascend, if you would go strengthened.', color: '#34d399' });
            sfx.victory();
        } else {
            setDialogue({ speaker: 'The Gardener', text: rv.litLine, color: rv.color });
        }
    }, [onDiscover, onSolve, markMinigameCleared]);
    const lightNextRiverRef = useRef(lightNextRiver);
    lightNextRiverRef.current = lightNextRiver;

    // ---- begin an attunement trial at a ready fountain ----
    const startAttunement = useCallback((riverId: EdenRiverId) => {
        const rv = EDEN_RIVERS_V2[riverId];
        const fx = (rv.fountain.gx + 0.5) * EDEN_TILE, fy = (rv.fountain.gy + 0.5) * EDEN_TILE;
        const lvl = levelRef.current;
        const rush = riverId === 'pishon';
        const at: AttuneState = {
            river: riverId, kind: rush ? 'rush' : 'channel',
            t: 0, timer: RUSH_TIME, motes: [], collected: 0, need: RUSH_NEED, hitCd: 0,
            progress: 0, wisps: [], fx, fy,
        };
        if (rush) {
            // Gleaning Rush — gold motes scattered on walkable tiles near the fountain
            let guard = 0;
            while (at.motes.length < RUSH_MOTES && guard++ < 500) {
                const ang = Math.random() * Math.PI * 2;
                const rad = 2 + Math.random() * 5; // ~2..7 tiles out
                const gx = Math.round(rv.fountain.gx + Math.cos(ang) * rad);
                const gy = Math.round(rv.fountain.gy + Math.sin(ang) * rad);
                if (!isEdenWalkable(gx, gy, lvl, true)) continue;
                const wx = (gx + 0.5) * EDEN_TILE, wy = (gy + 0.5) * EDEN_TILE;
                if (at.motes.some((m) => Math.hypot(m.x - wx, m.y - wy) < EDEN_TILE)) continue;
                at.motes.push({ x: wx, y: wy, got: false });
            }
            at.need = Math.min(RUSH_NEED, Math.max(1, at.motes.length - 1)); // defensive if fewer spawned
            for (let i = 0; i < 2; i++) {
                const a = Math.random() * Math.PI * 2;
                at.wisps.push({ x: fx + Math.cos(a) * 6 * EDEN_TILE, y: fy + Math.sin(a) * 6 * EDEN_TILE, active: true, spawnAt: 0 });
            }
            setDialogue({ speaker: 'The Gardener', text: `The gold of ${rv.land} scatters through the grass — glean ${at.need} motes before the water stills. Shadow wisps will hound you to shake them loose: dash past them.`, color: rv.color });
        } else {
            // Channel & Ward — hold the ring; bop the wisps that drift for it
            const n = riverId === 'gihon' ? 2 : 3;
            for (let i = 0; i < n; i++) {
                const s = channelWispSpawn(riverId);
                at.wisps.push({ x: s.x, y: s.y, active: false, spawnAt: 1.5 + i * 3.5 });
            }
            setDialogue({ speaker: 'The Gardener', text: `Stand within the ring and hold the channel until the ${rv.name} answers. Shadow wisps will drift for the ring — step out and scatter them by touch, then return. Leave the ring and the channel wanes.`, color: rv.color });
        }
        gameStateRef.current.attune = at;
        sfx.cast();
    }, []);

    const readLoreStone = useCallback((stoneId: string) => {
        const stone = level.loreStones.find((s) => s.id === stoneId);
        if (!stone || stone.read) return;
        setLevel((prev) => {
            const next = { ...prev, loreStones: prev.loreStones.map((s) => (s.id === stoneId ? { ...s, read: true } : s)) };
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
        const n = near;
        if (!n) return;
        if (n.kind === 'lore') readLoreStone(n.id);
        else if (n.kind === 'name') setOverlay({ kind: 'naming', creatureId: n.id });
        else if (n.kind === 'tend') setOverlay({ kind: 'tend', bedId: n.id });
        else if (n.kind === 'gardener') {
            // hint-on-demand: the Gardener speaks the current objective + counsel.
            const g = guideStepRef.current;
            setDialogue({ speaker: 'The Gardener', text: `${g.objective}. ${g.tip}`, color: '#34d399' });
        }
        else if (n.kind === 'attune') startAttunement(n.id as EdenRiverId);
        else if (n.kind === 'rematch') {
            // NG+ — re-challenge a fallen guardian's echo for a deeper blessing.
            rematchRef.current = n.id;
            setFightBonus(consumeFightBonusHp());
            setActiveFight(edenEchoId(n.id as EdenRiverId));
        }
    }, [near, readLoreStone, consumeFightBonusHp, startAttunement]);

    // music
    useEffect(() => {
        if (activeFight) {
            const boss = activeFight === EDEN_CHERUB.combatId;
            gameMusic.crossfadeBgm(boss ? 'combat_eden_cherub' : 'combat_skirmish', 700, boss ? 'main' : gameMusic.pickVariant('combat_skirmish'));
        } else {
            gameMusic.crossfadeBgm('eden_garden', 1200, gameMusic.pickVariant('eden_garden'));
        }
    }, [activeFight]);

    // ============================================================
    //  CANVAS LOOP
    // ============================================================
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
        let avatarFrames = buildFrames(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
        let avatarKey = JSON.stringify(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
        const st = gameStateRef.current;
        if (!st.dayStart) st.dayStart = performance.now() - 0.18 * EDEN_DAY_SECONDS * 1000; // begin mid-morning
        // any fight/overlay remount resets the transient verbs — no soft-locks
        st.attune = null;
        st.dashT = 0; st.dashIT = 0; st.dashCd = 0;
        dashReqRef.current = false;
        let raf = 0;
        let last = performance.now();
        let running = true;
        let Z = 2.5, ox = 0, oy = 0;

        // static biome-tinted ground+decor, baked once per page load
        const groundLayer = edenGroundLayer(ow);

        function computeZoom() {
            const vw = canvas.clientWidth, vh = canvas.clientHeight;
            const desktop = vw >= 1024;
            const viewTiles = desktop ? 15 : 12;
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
            const serpentPending = !!nearSerpentRef.current && !lvl.serpent[nearSerpentRef.current];
            const paused = !!overlayRef.current || serpentPending;
            // a panel/serpent fork owns the moment — abort any running attunement cleanly
            if (st.attune && paused) st.attune = null;

            // cool of the day
            const dayTime = ((now - st.dayStart) / 1000 / EDEN_DAY_SECONDS) % 1;
            const ds = edenDayState(dayTime);
            dayPhaseRef.current = ds.phase;
            dayBrightnessRef.current = ds.brightness;
            // surface the clock to the HUD sun-arc, quantized so it doesn't re-render every frame
            setDayT((p) => (Math.abs(p - dayTime) > 0.01 && Math.abs(p - dayTime) < 0.99 ? dayTime : p));
            // the Gardener walks in the cool of the day (Gen 3:8): he leaves his
            // post and strolls the threshold road at 'cool'/'dusk', then returns.
            {
                const gbx = (EDEN_GARDENER.gx + 0.5) * EDEN_TILE, gby = (EDEN_GARDENER.gy + 0.5) * EDEN_TILE;
                const strolling = ds.phase === 'cool' || ds.phase === 'dusk';
                gardenerWorldRef.current.x = strolling ? gbx + Math.sin(now / 2600) * 3.2 * EDEN_TILE : gbx;
                gardenerWorldRef.current.y = strolling ? gby - (1.4 + Math.sin(now / 3400) * 1.2) * EDEN_TILE : gby;
            }

            let ix = 0, iy = 0;
            if (!paused) {
                ix = joyRef.current.x; iy = joyRef.current.y;
                const k = keysRef.current;
                if (k.has('arrowleft') || k.has('a')) ix = -1;
                if (k.has('arrowright') || k.has('d')) ix = 1;
                if (k.has('arrowup') || k.has('w')) iy = -1;
                if (k.has('arrowdown') || k.has('s')) iy = 1;
                const mag = Math.hypot(ix, iy);
                if (mag > 1) { ix /= mag; iy /= mag; }
            }
            const moveMag = Math.min(1, Math.hypot(ix, iy));
            const moving = moveMag > 0.15;
            const spd = 84;

            // ---- the wind-step (dash) — 0.18s burst, i-frames vs the blight ----
            st.dashT = Math.max(0, st.dashT - dt);
            st.dashCd = Math.max(0, st.dashCd - dt);
            st.dashIT = Math.max(0, st.dashIT - dt);
            const wantDash = dashReqRef.current;
            dashReqRef.current = false;
            if (!paused && wantDash && st.dashCd <= 0) {
                st.dashCd = DASH_CD; st.dashT = DASH_TIME; st.dashIT = DASH_IFRAME;
                if (moving) { const m = Math.hypot(ix, iy) || 1; st.dashDx = ix / m; st.dashDy = iy / m; }
                else {
                    st.dashDx = st.facing === 'left' ? -1 : st.facing === 'right' ? 1 : 0;
                    st.dashDy = st.facing === 'up' ? -1 : st.facing === 'down' ? 1 : 0;
                }
                sfx.dash();
            }
            const dOn = st.dashCd > 0 ? 1 : 0;
            if (dOn !== dashShownRef.current) { dashShownRef.current = dOn; setDashCdUi(st.dashCd); }

            if (!paused && st.dashT > 0) {
                // dash movement — same per-axis collision as walking, just faster
                st.walkT += dt;
                if (st.dashDx || st.dashDy) st.facing = Math.abs(st.dashDx) > Math.abs(st.dashDy) ? (st.dashDx < 0 ? 'left' : 'right') : (st.dashDy < 0 ? 'up' : 'down');
                const dsp = spd * DASH_MULT;
                const nx = st.px + st.dashDx * dsp * dt;
                const ny = st.py + st.dashDy * dsp * dt;
                const fy = 5;
                if (!solidAt(nx + (st.dashDx > 0 ? fy : st.dashDx < 0 ? -fy : 0), st.py + fy)) st.px = nx;
                if (!solidAt(st.px, ny + (st.dashDy > 0 ? fy : st.dashDy < 0 ? -fy : 0) + fy)) st.py = ny;
                if (!reduceRef.current && Math.random() < 0.6) {
                    ambientRef.current.push({ x: st.px, y: st.py - 6, vx: -st.dashDx * 24, vy: -st.dashDy * 24, life: 0.3, color: '#a7f3d0', size: 1.6 });
                }
            } else if (moving) {
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

            // ---- the blight — cleansed state derived fresh every frame ----
            const cleansedNow: Record<string, boolean> = {};
            for (const reg of EDEN_REGIONS) cleansedNow[reg.id] = edenRegionCleansed(reg.id, lvl, charRef.current);
            const playerReg = edenRegionAt(pgx, pgy);
            const inBlight = !!playerReg && !cleansedNow[playerReg.id];
            let draining = false;
            if (!paused) {
                if (inBlight && st.dashIT <= 0) {
                    st.blightGrace += dt;
                    if (st.blightGrace > BLIGHT_GRACE) {
                        draining = true;
                        st.blightAcc += BLIGHT_DPS * dt;
                        const whole = Math.floor(st.blightAcc);
                        if (whole >= 1) {
                            st.blightAcc -= whole;
                            // the blight pressures — it never takes the last of you
                            setDungeonHp((hp) => (hp > BLIGHT_FLOOR ? Math.max(BLIGHT_FLOOR, hp - whole) : hp));
                            if (!blightWarnedRef.current) {
                                blightWarnedRef.current = true;
                                setDialogue({ speaker: 'The Gardener', text: 'The blight drinks the slow — it will bleed you to the bone of your strength, though it cannot take the last of it. Dash through the shadowed wings (the wind-step, or Shift), and light the garden region by region to drive it back.', color: '#c4b5fd' });
                            }
                        }
                    }
                } else if (!inBlight) {
                    st.blightGrace = 0; st.blightAcc = 0;
                }
            }

            const zl = edenZoneLabel(pgx, pgy);
            if (zl) setZoneLabel((p) => (p === zl ? p : zl));
            setDayLabel((p) => (p === ds.label ? p : ds.label));

            // first-entry wing greeting
            const wingId = edenWingId(pgx, pgy);
            if (wingId && wingId !== lastWingRef.current) {
                lastWingRef.current = wingId;
                const discId = edenKey('wing', wingId);
                if (!wingsSeenRef.current.has(discId)) {
                    wingsSeenRef.current.add(discId);
                    onDiscover([discId]);
                    setDialogue({ speaker: 'The Gardener', text: edenWingGreeting(wingId), color: '#34d399' });
                }
                // entering a blighted wing — surface what lifts its shadow
                if (!cleansedNow[wingId]) {
                    setBloomToast({ text: `The blight holds ${playerReg?.name ?? 'this wing'} — ${EDEN_BLIGHT_TRIGGER_LABELS[wingId]}`, tone: 'blight' });
                    if (bloomToastTimerRef.current) clearTimeout(bloomToastTimerRef.current);
                    bloomToastTimerRef.current = setTimeout(() => setBloomToast(null), 3800);
                }
            }

            if (!paused) {
                // roaming lesson shades
                for (const sh of st.shades) {
                    const fight = lvl.fights.find((f) => f.id === sh.fightId);
                    if (!fight || fight.cleared) continue;
                    let nx = sh.x + sh.vx * dt, ny = sh.y + sh.vy * dt;
                    if (solidAt(nx, sh.y)) { sh.vx *= -1; nx = sh.x; }
                    if (solidAt(sh.x, ny)) { sh.vy *= -1; ny = sh.y; }
                    sh.x = nx; sh.y = ny;
                    if (Math.hypot(sh.x - st.px, sh.y - st.py) < 20 && character.equipped.weapon && fightTriggeredRef.current !== fight.id) {
                        fightTriggeredRef.current = fight.id;
                        setFightBonus(consumeFightBonusHp());
                        setActiveFight(fight.combatId);
                        setDialogue({ speaker: 'The Gardener', text: fight.hint, color: '#34d399' });
                    }
                }

                // roaming creatures — named ones follow the one who named them
                // (within a generous leash of home); unnamed grow curious when
                // approached SLOWLY, but dart away from anyone who rushes them.
                // The unnamed also keep out of blighted wings entirely.
                for (const cr of st.creatures) {
                    const named = lvl.named.includes(cr.id);
                    const def = creatureById(cr.id);
                    // the blight hides the unnamed — they wake as their wing cleanses
                    if (!named && def && !cleansedNow[def.region]) continue;
                    cr.startleT = Math.max(0, cr.startleT - dt);
                    cr.dartCd = Math.max(0, cr.dartCd - dt);
                    const pdx = st.px - cr.x, pdy = st.py - cr.y, pd = Math.hypot(pdx, pdy) || 1;
                    // mid-dart: sprint toward the dart point, respecting collision +
                    // the home leash (so a startled beast can never be stranded).
                    if (cr.dartT > 0) {
                        cr.dartT -= dt;
                        const nx = cr.x + cr.dartDx * 170 * dt;
                        if (!solidAt(nx, cr.y) && Math.hypot(nx - cr.hx, cr.y - cr.hy) < cr.roam + EDEN_TILE) cr.x = nx; else cr.dartT = 0;
                        const ny = cr.y + cr.dartDy * 170 * dt;
                        if (!solidAt(cr.x, ny) && Math.hypot(cr.x - cr.hx, ny - cr.hy) < cr.roam + EDEN_TILE) cr.y = ny; else cr.dartT = 0;
                        continue;
                    }
                    // wariness: rushing (fast joystick or a dash) inside ~4 tiles startles it
                    if (!named && pd < 4 * EDEN_TILE && cr.dartCd <= 0 && (st.dashT > 0 || (moving && moveMag > 0.55))) {
                        // dart ~4 tiles directly away, clamped inside the roam leash
                        // around the home anchor — always still reachable by a slow walk.
                        let tx = cr.x - (pdx / pd) * 4 * EDEN_TILE;
                        let ty = cr.y - (pdy / pd) * 4 * EDEN_TILE;
                        const ad = Math.hypot(tx - cr.hx, ty - cr.hy);
                        if (ad > cr.roam) { tx = cr.hx + ((tx - cr.hx) / ad) * cr.roam * 0.85; ty = cr.hy + ((ty - cr.hy) / ad) * cr.roam * 0.85; }
                        const ddx = tx - cr.x, ddy = ty - cr.y, dd = Math.hypot(ddx, ddy) || 1;
                        cr.dartDx = ddx / dd; cr.dartDy = ddy / dd;
                        cr.dartT = Math.min(0.55, dd / 170);
                        cr.dartCd = 1.4; cr.startleT = 0.7;
                        continue;
                    }
                    const leash = named ? cr.roam + 6 * EDEN_TILE : cr.roam;
                    if (named && pd < 120 && pd > 22) { cr.vx += (pdx / pd) * 60 * dt; cr.vy += (pdy / pd) * 60 * dt; }
                    else if (!named && pd < 40) { cr.vx *= 0.9; cr.vy *= 0.9; }
                    const sp = Math.hypot(cr.vx, cr.vy), cap = named ? 34 : 22;
                    if (sp > cap) { cr.vx = (cr.vx / sp) * cap; cr.vy = (cr.vy / sp) * cap; }
                    let nx = cr.x + cr.vx * dt, ny = cr.y + cr.vy * dt;
                    if (Math.hypot(nx - cr.hx, ny - cr.hy) > leash || solidAt(nx, ny)) { cr.vx *= -1; cr.vy *= -1; nx = cr.x; ny = cr.y; }
                    cr.x = nx; cr.y = ny;
                    if (th(Math.floor(now / 900), cr.id.length) > 0.94) { cr.vx = (Math.random() - 0.5) * 18; cr.vy = (Math.random() - 0.5) * 18; }
                }

                // springs (auto)
                for (const sp of lvl.springs) {
                    if (sp.collected || touchedRef.current.has(sp.id)) continue;
                    if (Math.hypot((sp.gx + 0.5) * EDEN_TILE - st.px, (sp.gy + 0.5) * EDEN_TILE - st.py) < 18) {
                        touchedRef.current.add(sp.id);
                        setLevel((prev) => {
                            const next = { ...prev, springs: prev.springs.map((p) => (p.id === sp.id ? { ...p, collected: true } : p)) };
                            onDiscover(edenDiscoveriesFromState(next));
                            return next;
                        });
                        setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + sp.amount));
                        sfx.pickup();
                    }
                }
                // chests (auto)
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
                            });
                            onDiscover(edenDiscoveriesFromState(next));
                            return next;
                        });
                        if (ch.health) setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + ch.health!));
                        if (ch.hidden) setDialogue({ speaker: 'The Compartment Beneath Memory', text: 'A hollow no map recorded — the Gardener\'s last cache. The garden was meant to be walked, not believed in from exile.', color: '#fbbf24' });
                        sfx.pickup();
                    }
                }

                // guardian / cherub fight zones
                for (const fz of lvl.fights) {
                    if (fz.cleared || fightTriggeredRef.current === fz.id) continue;
                    if (fz.id.startsWith('fight_lesson')) continue; // handled by roaming shades
                    const dist = Math.hypot((fz.gx + 0.5) * EDEN_TILE - st.px, (fz.gy + 0.5) * EDEN_TILE - st.py);
                    if (fz.radius > 0 && dist < fz.radius) {
                        if (!character.equipped.weapon) break;
                        if (fz.boss && !lvl.bossGateOpen) break;
                        const warnedAt = fightWarnRef.current[fz.id];
                        if (!warnedAt) { fightWarnRef.current[fz.id] = now; setDialogue({ speaker: 'The Gardener', text: fz.hint, color: '#34d399' }); break; }
                        if (now - warnedAt < 1200) break;
                        fightTriggeredRef.current = fz.id;
                        setFightBonus(consumeFightBonusHp());
                        setActiveFight(fz.combatId);
                        break;
                    }
                }

                // ---- the attunement trial (replaces walk-and-touch; the
                //      guardian gate + Genesis order are enforced exactly as
                //      before by the prompt below + lightNextRiver) ----
                const at = st.attune;
                if (at) {
                    at.t += dt;
                    at.hitCd = Math.max(0, at.hitCd - dt);
                    const distF = Math.hypot(st.px - at.fx, st.py - at.fy);
                    if (distF > ATTUNE_ABORT_DIST) {
                        // wandered off — clean abort, never a soft-lock
                        st.attune = null;
                        setDialogue({ speaker: 'The Gardener', text: 'The attunement slips — the water stills. Return to the fountain and begin again; the river holds nothing against you.', color: '#93c5fd' });
                    } else if (at.kind === 'rush') {
                        // GLEANING RUSH (Pishon) — gather motes by touch before time
                        at.timer -= dt;
                        for (const m of at.motes) {
                            if (!m.got && Math.hypot(m.x - st.px, m.y - st.py) < 12) { m.got = true; at.collected++; sfx.pickup(); }
                        }
                        for (const w of at.wisps) {
                            const dx = st.px - w.x, dy = st.py - w.y, d = Math.hypot(dx, dy) || 1;
                            w.x += (dx / d) * 27 * dt; w.y += (dy / d) * 27 * dt;
                            if (d < 12 && at.hitCd <= 0) {
                                at.hitCd = 0.9;
                                if (st.dashIT <= 0) {
                                    // a wisp shakes a mote loose + knocks you back — never hp
                                    if (at.collected > 0) {
                                        at.collected--;
                                        let loosed: AttuneMote | null = null; let bd = Infinity;
                                        for (const m of at.motes) if (m.got) { const md = Math.hypot(m.x - st.px, m.y - st.py); if (md < bd) { bd = md; loosed = m; } }
                                        if (loosed) loosed.got = false;
                                    }
                                    const kx = st.px + (dx / d) * 14, ky = st.py + (dy / d) * 14;
                                    if (!solidAt(kx, st.py + 5)) st.px = kx;
                                    if (!solidAt(st.px, ky + 5)) st.py = ky;
                                    sfx.hit();
                                }
                                const a2 = Math.random() * Math.PI * 2;
                                w.x = at.fx + Math.cos(a2) * 6.5 * EDEN_TILE;
                                w.y = at.fy + Math.sin(a2) * 6.5 * EDEN_TILE;
                            }
                        }
                        if (at.collected >= at.need) {
                            st.attune = null;
                            lightNextRiverRef.current();
                        } else if (at.timer <= 0) {
                            st.attune = null;
                            setDialogue({ speaker: 'The Gardener', text: 'The motes sink back into the grass — no matter. Breathe, and begin the gleaning again; the gold of Havilah is patient.', color: '#fbbf24' });
                            sfx.hit();
                        }
                    } else {
                        // CHANNEL & WARD — hold the ring; wisps drift for it
                        let blocked = false;
                        for (const w of at.wisps) {
                            if (!w.active) { if (at.t >= w.spawnAt) w.active = true; else continue; }
                            const dxF = at.fx - w.x, dyF = at.fy - w.y, dF = Math.hypot(dxF, dyF) || 1;
                            if (dF > CHANNEL_RING + 4) { w.x += (dxF / dF) * 32 * dt; w.y += (dyF / dF) * 32 * dt; }
                            else blocked = true; // latched at the ring — the channel pauses
                            if (Math.hypot(w.x - st.px, w.y - st.py) < 13) {
                                // bopped by contact (walking or dashing) — scatter it
                                w.active = false; w.spawnAt = at.t + 4 + Math.random() * 2;
                                const s2 = channelWispSpawn(at.river);
                                w.x = s2.x; w.y = s2.y;
                                sfx.strike();
                            }
                        }
                        const inRing = distF < CHANNEL_RING;
                        if (inRing && !blocked) at.progress = Math.min(CHANNEL_NEED, at.progress + dt);
                        else if (!inRing) at.progress = Math.max(0, at.progress - dt * 0.35);
                        if (at.progress >= CHANNEL_NEED) {
                            st.attune = null;
                            lightNextRiverRef.current();
                        }
                    }
                }

                // first light — a one-time dawn blessing at any lit fountain
                if (!dawnBlessedRef.current && dayPhaseRef.current === 'dawn') {
                    for (let i = 0; i < EDEN_RIVER_ORDER.length; i++) {
                        if (!lvl.riversLit.includes(i)) continue;
                        const rv = EDEN_RIVERS_V2[EDEN_RIVER_ORDER[i]];
                        if (Math.hypot((rv.fountain.gx + 0.5) * EDEN_TILE - st.px, (rv.fountain.gy + 0.5) * EDEN_TILE - st.py) < 22) {
                            dawnBlessedRef.current = true;
                            setDungeonHp((hp) => Math.min(MAX_DUNGEON_HP, hp + 20));
                            setDialogue({ speaker: 'The Gardener', text: 'First light finds the water, and the water remembers. The dawn restores what the night spent — go strengthened.', color: '#fbbf24' });
                            sfx.pickup();
                            break;
                        }
                    }
                }

                // claim the leaf
                if (!relicClaimed && !barrier && lvl.sanctumOpen) {
                    const tx = (EDEN_TREE_OF_LIFE.gx + 0.5) * EDEN_TILE;
                    const ty = (EDEN_TREE_OF_LIFE.gy + 2.5) * EDEN_TILE;
                    if (Math.hypot(tx - st.px, ty - st.py) < 20) {
                        setRelicClaimed(true);
                        onClaim();
                        if (!charRef.current.discovered.includes(EDEN_KEYS.treeOfLifeClaimed)) onDiscover([EDEN_KEYS.treeOfLifeClaimed]);
                        setDialogue({ speaker: 'The Gardener', text: 'You take the Leaf of the Tree of Life. It will not wither — it remembers the first morning, and now, so do you.', color: '#34d399' });
                        sfx.victory();
                    }
                }

                // proximity targets (gardener / lore / creature / bed) + serpent beats
                let target: NearTarget = null;
                let bestD = Infinity;
                {
                    const gp = gardenerWorldRef.current;
                    const gd = Math.hypot(gp.x - st.px, gp.y - st.py);
                    if (gd < 24 && gd < bestD) { bestD = gd; target = { kind: 'gardener', id: 'gardener', label: 'Speak with the Gardener' }; }
                }
                // ready fountain — "Begin the attunement" (guardian felled, next in
                // Genesis order, not yet lit, no trial already running)
                if (!st.attune) {
                    const nextIdx = lvl.riversLit.length;
                    if (nextIdx < EDEN_RIVER_ORDER.length) {
                        const rid = EDEN_RIVER_ORDER[nextIdx];
                        const rv = EDEN_RIVERS_V2[rid];
                        const gDone = lvl.fights.find((f) => f.river === rid)?.cleared ?? false;
                        if (gDone) {
                            const d = Math.hypot((rv.fountain.gx + 0.5) * EDEN_TILE - st.px, (rv.fountain.gy + 0.5) * EDEN_TILE - st.py);
                            if (d < 26 && d < bestD) { bestD = d; target = { kind: 'attune', id: rid, label: 'Begin the attunement' }; }
                        }
                    }
                }
                for (const ls of lvl.loreStones) {
                    if (ls.read) continue;
                    const d = Math.hypot((ls.gx + 0.5) * EDEN_TILE - st.px, (ls.gy + 0.5) * EDEN_TILE - st.py);
                    if (d < 26 && d < bestD) { bestD = d; target = { kind: 'lore', id: ls.id, label: ls.title }; }
                }
                for (const cr of st.creatures) {
                    if (lvl.named.includes(cr.id)) continue;
                    const def = EDEN_CREATURES.find((c) => c.id === cr.id);
                    if (def && !cleansedNow[def.region]) continue; // hidden by the blight
                    if (def?.phases && !def.phases.includes(dayPhaseRef.current)) continue;
                    const d = Math.hypot(cr.x - st.px, cr.y - st.py);
                    if (d < 26 && d < bestD) { bestD = d; target = { kind: 'name', id: cr.id, label: `Name the ${def?.name ?? 'creature'}` }; }
                }
                for (const bed of EDEN_BEDS) {
                    const d = Math.hypot((bed.at.gx + 0.5) * EDEN_TILE - st.px, (bed.at.gy + 0.5) * EDEN_TILE - st.py);
                    if (d < 22 && d < bestD) { bestD = d; target = { kind: 'tend', id: bed.id, label: 'Tend the bed' }; }
                }
                // NG+ echo rematch at a cleared river-guardian arena (weapon required)
                if (character.equipped.weapon) {
                    for (const fz of lvl.fights) {
                        if (!fz.cleared || !fz.river) continue;
                        if (charRef.current.discovered.includes(edenKey('milestone', `rematch_${fz.river}`))) continue;
                        const d = Math.hypot((fz.gx + 0.5) * EDEN_TILE - st.px, (fz.gy + 0.5) * EDEN_TILE - st.py);
                        if (d < fz.radius && d < bestD) { bestD = d; target = { kind: 'rematch', id: fz.river, label: `Challenge the Echo of ${EDEN_RIVERS_V2[fz.river].name}` }; }
                    }
                }
                setNear((p) => (p?.kind === target?.kind && p?.id === (target as any)?.id ? p : target));

                // serpent whispers — once a beat is entered, freeze the prompt
                // (movement is paused above while it is up) so the climax fork
                // can never be lost by drifting out of range. The whisper text
                // is shown inside the choice panel, not as a separate dialogue.
                if (!nearSerpentRef.current) {
                    for (const b of EDEN_SERPENT_BEATS) {
                        if (lvl.serpent[b.id]) continue;
                        if (Math.hypot((b.at.gx + 0.5) * EDEN_TILE - st.px, (b.at.gy + 0.5) * EDEN_TILE - st.py) < 24) { serpentResolvingRef.current = false; setNearSerpent(b.id); break; }
                    }
                }

                // map reveal sync (~12 Hz)
                if (now - mapSyncRef.current.lastAt > 80) {
                    mapSyncRef.current.lastAt = now;
                    const added = newRevealDiscoveries('eden', pgx, pgy, exploredRef.current, EDEN_MAP_W, EDEN_MAP_H);
                    if (added.length) { onDiscover(added); setExploredVersion((v) => v + 1); }
                    setPlayerPos({ x: st.px, y: st.py });
                }
            }

            // ---------- camera ----------
            const vw = canvas.clientWidth, vh = canvas.clientHeight;
            const halfW = vw / (2 * Z), halfH = vh / (2 * Z);
            const camX = clamp(st.px, halfW, EDEN_MAP_W * EDEN_TILE - halfW);
            const camY = clamp(st.py, halfH, EDEN_MAP_H * EDEN_TILE - halfH);
            ox = Math.round(vw / 2 - camX * Z);
            oy = Math.round(vh / 2 - camY * Z);

            // ---------- render ----------
            ctx.fillStyle = '#0a1410';
            ctx.fillRect(0, 0, vw, vh);
            ctx.drawImage(groundLayer, 0, 0, groundLayer.width, groundLayer.height, ox, oy, groundLayer.width * Z, groundLayer.height * Z);

            const visL = Math.max(0, Math.floor((-ox / Z) / EDEN_TILE) - 1);
            const visT = Math.max(0, Math.floor((-oy / Z) / EDEN_TILE) - 1);
            const visR = Math.min(EDEN_MAP_W, Math.ceil((vw - ox) / Z / EDEN_TILE) + 1);
            const visB = Math.min(EDEN_MAP_H, Math.ceil((vh - oy) / Z / EDEN_TILE) + 1);
            for (let r = visT; r < visB; r++) {
                for (let c = visL; c < visR; c++) {
                    if (ow.ground[r][c] !== 2) continue;
                    const shimmer = 0.06 + Math.sin(st.t / 500 + c * 0.4 + r * 0.3) * 0.04;
                    ctx.fillStyle = `rgba(120, 200, 255, ${shimmer})`;
                    ctx.fillRect(SX(c * EDEN_TILE), SY(r * EDEN_TILE), EDEN_TILE * Z, EDEN_TILE * Z);
                }
            }

            // lore stones
            for (const ls of lvl.loreStones) {
                const wx = (ls.gx + 0.5) * EDEN_TILE, wy = (ls.gy + 0.5) * EDEN_TILE;
                const pulse = 0.55 + Math.sin(st.t / 280 + ls.gx) * 0.25;
                const sz = (6 + Math.sin(st.t / 350) * 1.5) * Z;
                ctx.strokeStyle = ls.read ? 'rgba(52,211,153,0.35)' : `rgba(251,191,36,${pulse * 0.4})`;
                ctx.lineWidth = Z * 0.75;
                ctx.beginPath(); ctx.arc(SX(wx), SY(wy) - 2 * Z, sz + 4 * Z, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = ls.read ? 'rgba(52,211,153,0.65)' : `rgba(251,191,36,${pulse})`;
                ctx.save(); ctx.translate(SX(wx), SY(wy)); ctx.rotate(Math.PI / 4);
                ctx.fillRect(-sz / 2, -sz / 2, sz, sz); ctx.restore();
            }

            // chests + springs. Hidden caches only glimmer by moonlight — found
            // at night/dusk (still openable any phase once you've walked onto one).
            const secretVisible = canRevealEdenSecret(lvl, charRef.current);
            const nightish = dayPhaseRef.current === 'night' || dayPhaseRef.current === 'dusk';
            for (const ch of lvl.chests) {
                if (ch.opened || (ch.hidden && !secretVisible && !nightish)) continue;
                const bob = Math.sin(st.t / 380 + ch.gx) * 2 * Z;
                const cx = SX((ch.gx + 0.5) * EDEN_TILE), cy = SY((ch.gy + 0.5) * EDEN_TILE) + bob;
                const glow = 0.35 + Math.sin(st.t / 300 + ch.gy) * 0.2;
                ctx.fillStyle = `rgba(252, 211, 77, ${glow})`; ctx.fillRect(cx - 6 * Z, cy - 5 * Z, 12 * Z, 10 * Z);
                ctx.fillStyle = ch.hidden ? '#c084fc' : '#fcd34d'; ctx.fillRect(cx - 4 * Z, cy - 3 * Z, 8 * Z, 6 * Z);
            }
            for (const sp of lvl.springs) {
                if (sp.collected) continue;
                const pulse = 0.7 + Math.sin(st.t / 220 + sp.gx) * 0.3;
                const rad = (5 + Math.sin(st.t / 180) * 1.5) * Z;
                ctx.fillStyle = `rgba(248, 113, 113, ${pulse * 0.35})`;
                ctx.beginPath(); ctx.arc(SX((sp.gx + 0.5) * EDEN_TILE), SY((sp.gy + 0.5) * EDEN_TILE), rad + 3 * Z, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#f87171';
                ctx.beginPath(); ctx.arc(SX((sp.gx + 0.5) * EDEN_TILE), SY((sp.gy + 0.5) * EDEN_TILE), rad, 0, Math.PI * 2); ctx.fill();
            }

            // garden beds + crops
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (const bed of EDEN_BEDS) {
                const bx = SX((bed.at.gx + 0.5) * EDEN_TILE), by = SY((bed.at.gy + 0.5) * EDEN_TILE);
                ctx.fillStyle = '#5a3d22'; ctx.fillRect(bx - 7 * Z, by - 5 * Z, 14 * Z, 10 * Z);
                ctx.fillStyle = '#3f2a17';
                for (let i = 0; i < 3; i++) ctx.fillRect(bx - 6 * Z + i * 4.5 * Z, by - 4 * Z, 1.5 * Z, 8 * Z);
                const rt = bedRuntimeRef.current[bed.id];
                if (rt?.seedId) {
                    const seed = seedById(rt.seedId);
                    if (seed) {
                        const stage = growthStage(seed, Date.now() - rt.plantedAt);
                        const glyph = stage === 'ripe' ? seed.fruit.glyph : stage === 'growing' ? '🌿' : '🌱';
                        ctx.font = `${(stage === 'ripe' ? 11 : 8) * Z}px serif`;
                        ctx.fillText(glyph, bx, by - 2 * Z);
                        if (stage === 'ripe') {
                            ctx.strokeStyle = `rgba(163,230,53,${0.5 + Math.sin(st.t / 240) * 0.3})`;
                            ctx.lineWidth = Z; ctx.beginPath(); ctx.arc(bx, by - 2 * Z, 9 * Z, 0, Math.PI * 2); ctx.stroke();
                        }
                    }
                }
            }

            // fountains + lit rivers
            const tlx = (EDEN_TREE_OF_LIFE.gx + 0.5) * EDEN_TILE, tly = (EDEN_TREE_OF_LIFE.gy + 0.5) * EDEN_TILE;
            EDEN_RIVER_ORDER.forEach((id, i) => {
                const rv = EDEN_RIVERS_V2[id];
                const fx = (rv.fountain.gx + 0.5) * EDEN_TILE, fy = (rv.fountain.gy + 0.5) * EDEN_TILE;
                const lit = lvl.riversLit.includes(i);
                const pulse = lit ? 0.85 + Math.sin(st.t / 260 + i) * 0.15 : 0.5 + Math.sin(st.t / 400 + i) * 0.1;
                ctx.fillStyle = lit ? rv.color : '#64748b'; ctx.globalAlpha = pulse;
                ctx.fillRect(SX(fx) - 7 * Z, SY(fy) - 7 * Z, 14 * Z, 14 * Z);
                ctx.globalAlpha = 1;
                // ready fountain — guardian felled, next in order: it beckons
                if (!lit && i === lvl.riversLit.length && (lvl.fights.find((f) => f.river === id)?.cleared ?? false)) {
                    ctx.strokeStyle = rv.color; ctx.lineWidth = Z;
                    ctx.globalAlpha = 0.45 + Math.sin(st.t / 260) * 0.25;
                    ctx.beginPath(); ctx.arc(SX(fx), SY(fy), (10 + Math.sin(st.t / 320) * 2) * Z, 0, Math.PI * 2); ctx.stroke();
                    ctx.globalAlpha = 1;
                }
                if (lit) {
                    ctx.strokeStyle = rv.color; ctx.lineWidth = 2 * Z;
                    ctx.globalAlpha = 0.45 + Math.sin(st.t / 320) * 0.2;
                    ctx.beginPath(); ctx.moveTo(SX(fx), SY(fy)); ctx.lineTo(SX(tlx), SY(tly)); ctx.stroke();
                    ctx.globalAlpha = 1;
                    if (Math.random() < 0.12) riverParticlesRef.current.push({ ox: fx, oy: fy, tx: tlx, ty: tly, color: rv.color, t: 0, speed: 0.5 + Math.random() * 0.35 });
                }
            });
            riverParticlesRef.current = riverParticlesRef.current.filter((p) => {
                const dx = p.tx - p.ox, dy = p.ty - p.oy;
                p.t += dt * p.speed; if (p.t >= 1) return false;
                ctx.fillStyle = p.color; ctx.globalAlpha = 0.5 + (1 - p.t) * 0.5;
                ctx.beginPath(); ctx.arc(SX(p.ox + dx * p.t), SY(p.oy + dy * p.t), 2.5 * Z, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1; return true;
            });

            // tree of knowledge (verge centre — always present, ominous)
            {
                const kx = (EDEN_TREE_OF_KNOWLEDGE.gx + 0.5) * EDEN_TILE, ky = (EDEN_TREE_OF_KNOWLEDGE.gy + 0.5) * EDEN_TILE;
                const resolved = !!lvl.serpent['serpent_tree'];
                ctx.fillStyle = `rgba(239,68,68,${0.18 + Math.sin(st.t / 500) * 0.1})`;
                ctx.beginPath(); ctx.arc(SX(kx), SY(ky - 8), 16 * Z, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = resolved ? '#3a2a3a' : '#4a2030';
                ctx.beginPath(); ctx.arc(SX(kx), SY(ky - 8), 12 * Z, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#7a1f2e'; ctx.fillRect(SX(kx) - 2 * Z, SY(ky - 8), 4 * Z, 12 * Z);
            }

            // tree of life (north sanctum)
            if (lvl.sanctumOpen) {
                const treeGlow = 0.4 + Math.sin(st.t / 400) * 0.25;
                ctx.fillStyle = `rgba(52, 211, 153, ${treeGlow})`;
                ctx.beginPath(); ctx.arc(SX(tlx), SY(tly - 8), (18 + Math.sin(st.t / 350) * 3) * Z, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#166534';
                ctx.beginPath(); ctx.arc(SX(tlx), SY(tly - 8), 14 * Z, 0, Math.PI * 2); ctx.fill();
                if (!barrier && !relicClaimed) {
                    ctx.fillStyle = `rgba(251, 191, 36, ${0.5 + Math.sin(st.t / 280) * 0.3})`;
                    ctx.beginPath(); ctx.arc(SX(tlx), SY(tly + 6), 4 * Z, 0, Math.PI * 2); ctx.fill();
                }
            }

            // fight zones (guardians + cherub)
            const dashOff = -(st.t / 35) % 20;
            for (const fz of lvl.fights) {
                if (fz.cleared || fz.radius <= 0 || fz.id.startsWith('fight_lesson')) continue;
                const pulse = 0.55 + Math.sin(st.t / 380 + fz.gx) * 0.2;
                ctx.strokeStyle = fz.boss ? `rgba(239, 68, 68, ${pulse})` : `rgba(251, 191, 36, ${pulse})`;
                ctx.lineWidth = Z; ctx.setLineDash([5 * Z, 5 * Z]); ctx.lineDashOffset = dashOff;
                ctx.beginPath(); ctx.arc(SX((fz.gx + 0.5) * EDEN_TILE), SY((fz.gy + 0.5) * EDEN_TILE), fz.radius * Z, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
            }
            // NG+ echo markers — a faint violet ↺ at cleared guardian arenas
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (const fz of lvl.fights) {
                if (!fz.cleared || !fz.river) continue;
                if (charRef.current.discovered.includes(edenKey('milestone', `rematch_${fz.river}`))) continue;
                const ex = SX((fz.gx + 0.5) * EDEN_TILE), ey = SY((fz.gy + 0.5) * EDEN_TILE);
                const ep = 0.35 + Math.sin(st.t / 320 + fz.gx) * 0.2;
                ctx.strokeStyle = `rgba(192,132,252,${ep})`; ctx.lineWidth = Z;
                ctx.setLineDash([3 * Z, 4 * Z]); ctx.lineDashOffset = dashOff;
                ctx.beginPath(); ctx.arc(ex, ey, fz.radius * 0.6 * Z, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = `rgba(216,180,254,${ep + 0.2})`; ctx.font = `${9 * Z}px serif`;
                ctx.fillText('↺', ex, ey);
            }
            // lesson shades
            for (const sh of st.shades) {
                const fight = lvl.fights.find((f) => f.id === sh.fightId);
                if (!fight || fight.cleared) continue;
                const shBob = Math.sin(st.t / 200 + sh.x) * 1.5 * Z;
                ctx.globalAlpha = 0.35 + Math.sin(st.t / 180) * 0.15; ctx.fillStyle = '#1e1b4b';
                ctx.beginPath(); ctx.arc(SX(sh.x), SY(sh.y) - 4 * Z + shBob, 10 * Z, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
                ctx.drawImage(charImg, SHADE_TILE.col * 17, SHADE_TILE.row * 17, 16, 16, SX(sh.x) - 8 * Z, SY(sh.y) - 12 * Z + shBob, 16 * Z, 16 * Z);
            }

            // creatures
            for (const cr of st.creatures) {
                const def = EDEN_CREATURES.find((c) => c.id === cr.id);
                const named = lvl.named.includes(cr.id);
                if (!named && def && !cleansedNow[def.region]) continue; // hidden by the blight
                if (def?.phases && !def.phases.includes(dayPhaseRef.current)) continue;
                const bob = Math.sin(st.t / 260 + cr.x) * 2 * Z;
                if (!named) {
                    ctx.strokeStyle = `rgba(251,191,36,${0.4 + Math.sin(st.t / 300 + cr.x) * 0.25})`;
                    ctx.lineWidth = Z; ctx.beginPath(); ctx.arc(SX(cr.x), SY(cr.y) - 3 * Z + bob, 9 * Z, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.globalAlpha = named ? 0.95 : 0.85;
                ctx.font = `${11 * Z}px serif`;
                ctx.fillText(cr.glyph, SX(cr.x), SY(cr.y) - 4 * Z + bob);
                ctx.globalAlpha = 1;
                // startle cue — it darted from a rushing approach
                if (cr.startleT > 0) {
                    ctx.fillStyle = `rgba(251,191,36,${Math.min(1, cr.startleT * 2)})`;
                    ctx.font = `bold ${8 * Z}px monospace`;
                    ctx.fillText('!', SX(cr.x), SY(cr.y) - 15 * Z + bob);
                    ctx.font = `${11 * Z}px serif`;
                }
            }

            // gardener NPC — walks the garden in the cool of the day
            {
                const gp = gardenerWorldRef.current;
                const strolling = dayPhaseRef.current === 'cool' || dayPhaseRef.current === 'dusk';
                const gwx = gp.x, gwy = gp.y + (strolling ? Math.sin(st.t / 150) * 1.2 * Z : 0);
                const gPulse = 0.3 + Math.sin(st.t / 450) * 0.2;
                ctx.strokeStyle = `rgba(52, 211, 153, ${gPulse})`; ctx.lineWidth = Z;
                ctx.beginPath(); ctx.arc(SX(gwx), SY(gwy), (8 + Math.sin(st.t / 500) * 2) * Z, 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = '#34d399'; ctx.beginPath(); ctx.arc(SX(gwx), SY(gwy), 5 * Z, 0, Math.PI * 2); ctx.fill();
            }

            // serpent beats (unresolved markers)
            for (const b of EDEN_SERPENT_BEATS) {
                if (lvl.serpent[b.id] || b.climax) continue;
                const sx = (b.at.gx + 0.5) * EDEN_TILE, sy = (b.at.gy + 0.5) * EDEN_TILE;
                ctx.globalAlpha = 0.5 + Math.sin(st.t / 220 + b.at.gx) * 0.3;
                ctx.font = `${10 * Z}px serif`; ctx.fillText('🐍', SX(sx), SY(sy));
                ctx.globalAlpha = 1;
            }

            // player
            const curKey = JSON.stringify(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing));
            if (curKey !== avatarKey) { avatarKey = curKey; avatarFrames = buildFrames(wornAvatar(charRef.current.avatar, charRef.current.equipped.clothing)); }
            const wphase = Math.floor(st.walkT * 7) % 2;
            const dirFrames = avatarFrames[st.facing];
            const wframe = moving ? dirFrames[wphase === 0 ? 1 : 2] : dirFrames[0];
            const pw = 16 * Z * 1.05, ph = 24 * Z * 1.05;
            ctx.drawImage(wframe, SX(st.px) - pw / 2, SY(st.py) - ph + 5 * Z, pw, ph);

            // ---------- the blight — uncleansed wings drown in shadow ----------
            const viewL = -ox / Z, viewT2 = -oy / Z, viewR2 = (vw - ox) / Z, viewB2 = (vh - oy) / Z; // world px
            for (const reg of EDEN_REGIONS) {
                if (cleansedNow[reg.id]) continue;
                const [rx0, ry0, rx1, ry1] = reg.rect;
                const wx0 = rx0 * EDEN_TILE, wy0 = ry0 * EDEN_TILE;
                const wx1 = (rx1 + 1) * EDEN_TILE, wy1 = (ry1 + 1) * EDEN_TILE;
                if (wx1 < viewL || wx0 > viewR2 || wy1 < viewT2 || wy0 > viewB2) continue; // cull to viewport
                ctx.fillStyle = 'rgba(10,6,20,0.45)';
                ctx.fillRect(SX(wx0), SY(wy0), (wx1 - wx0) * Z, (wy1 - wy0) * Z);
                if (!reduceRef.current) {
                    // slow-drifting shadow motes (static tint only under reduced motion)
                    ctx.fillStyle = 'rgba(88,62,128,0.9)';
                    for (let i = 0; i < 12; i++) {
                        const bx = wx0 + th(i, reg.id.length, 9) * (wx1 - wx0);
                        const by = wy0 + th(i, reg.id.length, 13) * (wy1 - wy0);
                        const mx = bx + Math.sin(st.t / 2600 + i * 1.7) * 14;
                        const my = by + Math.cos(st.t / 3300 + i * 2.1) * 10;
                        if (mx < viewL || mx > viewR2 || my < viewT2 || my > viewB2) continue;
                        ctx.globalAlpha = 0.14 + 0.09 * Math.sin(st.t / 900 + i);
                        ctx.beginPath(); ctx.arc(SX(mx), SY(my), 2.4 * Z, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                }
            }
            // bloom pulses — a wing breathes again (skipped under reduced motion)
            if (bloomsRef.current.length) {
                bloomsRef.current = bloomsRef.current.filter((b) => {
                    const k = (now - b.start) / 1500;
                    if (k >= 1) return false;
                    const reg = EDEN_REGIONS.find((r) => r.id === b.region);
                    if (!reg) return false;
                    const [rx0, ry0, rx1, ry1] = reg.rect;
                    const bcx = ((rx0 + rx1 + 1) / 2) * EDEN_TILE, bcy = ((ry0 + ry1 + 1) / 2) * EDEN_TILE;
                    const maxR = Math.max(rx1 - rx0, ry1 - ry0) * EDEN_TILE * 0.7;
                    const rad = Math.max(4, k * maxR) * Z;
                    const g = ctx.createRadialGradient(SX(bcx), SY(bcy), rad * 0.2, SX(bcx), SY(bcy), rad);
                    g.addColorStop(0, `rgba(163,230,53,${0.28 * (1 - k)})`);
                    g.addColorStop(1, 'rgba(163,230,53,0)');
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(SX(rx0 * EDEN_TILE), SY(ry0 * EDEN_TILE), (rx1 - rx0 + 1) * EDEN_TILE * Z, (ry1 - ry0 + 1) * EDEN_TILE * Z);
                    ctx.clip();
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.arc(SX(bcx), SY(bcy), rad, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                    return true;
                });
            }

            // ---------- the attunement trial ----------
            if (st.attune) {
                const at2 = st.attune;
                const rvc = EDEN_RIVERS_V2[at2.river].color;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                if (at2.kind === 'rush') {
                    for (const m of at2.motes) {
                        if (m.got) continue;
                        const p = 0.6 + Math.sin(st.t / 200 + m.x) * 0.3;
                        ctx.fillStyle = `rgba(252,211,77,${p})`;
                        ctx.beginPath(); ctx.arc(SX(m.x), SY(m.y + Math.sin(st.t / 300 + m.x) * 2), 3 * Z, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = 'rgba(252,211,77,0.3)'; ctx.lineWidth = Z * 0.6;
                        ctx.beginPath(); ctx.arc(SX(m.x), SY(m.y), 5 * Z, 0, Math.PI * 2); ctx.stroke();
                    }
                    ctx.fillStyle = '#fcd34d'; ctx.font = `bold ${7 * Z}px monospace`;
                    ctx.fillText(`${at2.collected}/${at2.need} · ${Math.max(0, Math.ceil(at2.timer))}s`, SX(at2.fx), SY(at2.fy) - 14 * Z);
                } else {
                    const ringR = CHANNEL_RING * Z;
                    ctx.globalAlpha = 0.5; ctx.strokeStyle = rvc; ctx.lineWidth = Z;
                    ctx.setLineDash([4 * Z, 4 * Z]); ctx.lineDashOffset = dashOff;
                    ctx.beginPath(); ctx.arc(SX(at2.fx), SY(at2.fy), ringR, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.globalAlpha = 0.9; ctx.lineWidth = 2 * Z;
                    ctx.beginPath(); ctx.arc(SX(at2.fx), SY(at2.fy), ringR, -Math.PI / 2, -Math.PI / 2 + (at2.progress / CHANNEL_NEED) * Math.PI * 2); ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = rvc; ctx.font = `bold ${7 * Z}px monospace`;
                    ctx.fillText(`${Math.round((at2.progress / CHANNEL_NEED) * 100)}%`, SX(at2.fx), SY(at2.fy) - 14 * Z);
                }
                for (const w of at2.wisps) {
                    if (at2.kind === 'channel' && !w.active) continue;
                    const wb = Math.sin(st.t / 180 + w.x) * 1.5 * Z;
                    ctx.globalAlpha = 0.42 + Math.sin(st.t / 160 + w.y) * 0.15;
                    ctx.fillStyle = '#1e1b4b';
                    ctx.beginPath(); ctx.arc(SX(w.x), SY(w.y) + wb, 6 * Z, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#7c3aed'; ctx.globalAlpha = 0.7;
                    ctx.beginPath(); ctx.arc(SX(w.x), SY(w.y) + wb, 2.2 * Z, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }

            // quest trail
            const wp = guideStepRef.current.waypoint;
            if (wp) {
                const wx = (wp.gx + 0.5) * EDEN_TILE, wy = (wp.gy + 0.5) * EDEN_TILE;
                const trailPulse = 0.35 + Math.sin(st.t / 300) * 0.2;
                ctx.strokeStyle = `rgba(52,211,153,${trailPulse})`; ctx.lineWidth = 2;
                ctx.setLineDash([5 * Z, 7 * Z]); ctx.lineDashOffset = dashOff;
                ctx.beginPath(); ctx.moveTo(SX(st.px), SY(st.py)); ctx.lineTo(SX(wx), SY(wy)); ctx.stroke();
                ctx.setLineDash([]);
                const mk = 4 + Math.sin(st.t / 250) * 2;
                ctx.fillStyle = `rgba(52,211,153,${0.5 + Math.sin(st.t / 280) * 0.3})`;
                ctx.beginPath(); ctx.arc(SX(wx), SY(wy), mk * Z, 0, Math.PI * 2); ctx.fill();
            }

            // ambient weather — per-biome, more at night (fireflies). Each
            // land has its own air: Gihon drizzles, Hiddekel breathes violet
            // mist, Pishon glints with gold dust; elsewhere the biome's motes.
            const night = dayPhaseRef.current === 'night' || dayPhaseRef.current === 'dusk';
            const regId = edenRegionAt(pgx, pgy)?.id;
            const curBiome = edenBiomeAt(pgx, pgy);
            const rain = regId === 'gihon' && !night;
            const mist = regId === 'hiddekel';
            const moteCap = night ? 42 : rain ? 46 : mist ? 36 : 26;
            const spawnRate = rain ? 0.30 : regId === 'pishon' ? 0.11 : mist ? 0.10 : 0.06;
            if (ambientRef.current.length < moteCap && Math.random() < spawnRate) {
                ambientRef.current.push({
                    x: st.px + (Math.random() - 0.5) * vw / Z,
                    y: st.py + (Math.random() - 0.5) * vh / Z - (rain ? (vh / Z) * 0.55 : 0),
                    vx: rain ? 10 : (Math.random() - 0.5) * (mist ? 4 : 8),
                    vy: rain ? 150 + Math.random() * 50 : mist ? -1.5 : -4 - Math.random() * 6,
                    life: rain ? 1.1 : mist ? 4.5 : 2.5 + Math.random() * 2,
                    color: night ? '#fde68a' : rain ? '#67e8f9' : (regId ? curBiome.motes : (Math.random() > 0.5 ? '#34d399' : '#fbbf24')),
                    streak: rain,
                    size: mist ? 3.4 : night ? 1.8 : 1.5,
                });
            }
            for (let i = ambientRef.current.length - 1; i >= 0; i--) {
                const p = ambientRef.current[i];
                p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
                if (p.life <= 0) { ambientRef.current.splice(i, 1); continue; }
                if (p.streak) {
                    ctx.strokeStyle = p.color; ctx.globalAlpha = Math.min(1, p.life) * 0.4;
                    ctx.lineWidth = Z; ctx.beginPath();
                    ctx.moveTo(SX(p.x), SY(p.y)); ctx.lineTo(SX(p.x - p.vx * 0.03), SY(p.y - p.vy * 0.03)); ctx.stroke();
                } else {
                    const soft = (p.size ?? 1.5) > 3 ? 0.22 : (night ? 0.55 : 0.4);
                    const a = Math.min(1, p.life) * soft * (0.6 + Math.sin(st.t / 200 + i) * 0.4);
                    ctx.fillStyle = p.color; ctx.globalAlpha = a;
                    ctx.beginPath(); ctx.arc(SX(p.x), SY(p.y), (p.size ?? 1.5) * Z, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // ---------- cool-of-the-day overlay ----------
            if (ds.tint !== 'rgba(255, 255, 255, 0.00)') { ctx.fillStyle = ds.tint; ctx.fillRect(0, 0, vw, vh); }
            if (ds.brightness < 1) { ctx.fillStyle = `rgba(8,12,26,${(1 - ds.brightness) * 0.7})`; ctx.fillRect(0, 0, vw, vh); }

            // ---------- blight-drain cue — a violet vignette while it drinks ----------
            if (draining) {
                const dp = reduceRef.current ? 0.14 : 0.10 + 0.07 * Math.sin(st.t / 260);
                const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.38, vw / 2, vh / 2, Math.max(vw, vh) * 0.62);
                vg.addColorStop(0, 'rgba(124,58,237,0)');
                vg.addColorStop(1, `rgba(124,58,237,${dp})`);
                ctx.fillStyle = vg;
                ctx.fillRect(0, 0, vw, vh);
            }

            raf = requestAnimationFrame(loop);
        };

        const kd = (e: KeyboardEvent) => {
            if (overlayRef.current) return; // a panel owns the keyboard
            keysRef.current.add(e.key.toLowerCase());
            if ((e.key === 'e' || e.key === 'Enter')) handleInteractRef.current();
            if (e.key === 'Shift' || e.key.toLowerCase() === 'k') dashReqRef.current = true; // the wind-step
        };
        const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
        const blur = () => keysRef.current.clear(); // never resume auto-walk on a missed keyup
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        window.addEventListener('blur', blur);
        raf = requestAnimationFrame(loop);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
            window.removeEventListener('blur', blur);
        };
    }, [activeFight, character.equipped.weapon, relicClaimed, onSolve, onClaim, onDiscover, consumeFightBonusHp, markMinigameCleared, solidAt]);

    // keep latest guideStep + interact handler available to the loop without re-mounting it
    const guideStepRef = useRef(guideStep);
    guideStepRef.current = guideStep;
    const handleInteractRef = useRef(handleInteract);
    handleInteractRef.current = handleInteract;

    // ---- combat hand-off ----
    const activeFightZone = level.fights.find((f) => f.combatId === activeFight && !f.cleared);
    const fightDest = activeFight ? edenDestinationStub(activeFight) : null;
    const liveBonuses = useMemo(() => {
        const fb = fruitBuff;
        return {
            ...baseBonuses,
            bonusHp: baseBonuses.bonusHp + (fb?.hp ?? 0) + fightBonus,
            bonusDamage: baseBonuses.bonusDamage + (fb?.damage ?? 0),
            bonusRegen: baseBonuses.bonusRegen + (fb?.regen ?? 0),
            bonusLifesteal: baseBonuses.bonusLifesteal + (fb?.lifesteal ?? 0),
            bonusCrit: baseBonuses.bonusCrit + (fb?.crit ?? 0),
        };
    }, [baseBonuses, fruitBuff, fightBonus]);

    const nearPoi = near ? { name: near.label, type: 'npc' as const } : null;
    const openCreature = overlay?.kind === 'naming' ? EDEN_CREATURES.find((c) => c.id === overlay.creatureId) : null;
    const openBed = overlay?.kind === 'tend' ? EDEN_BEDS.find((b) => b.id === overlay.bedId) : null;
    const openBedRt: EdenBedRuntime = (openBed && bedRuntime[openBed.id]) || { seedId: null, plantedAt: 0 };

    return (
        <div className="relative flex-1 w-full min-h-0 overflow-hidden select-none" style={{ touchAction: 'none', background: '#0a1f17' }}>
            {activeFight && fightDest?.combat && (
                <CombatScene
                    destination={fightDest}
                    character={character}
                    weaponDamage={wpn.damage}
                    weaponReach={wpn.reach}
                    exploreBgm="eden_garden"
                    {...liveBonuses}
                    onVictory={() => {
                        if (activeFightZone) markFightCleared(activeFightZone.id, activeFight);
                        else {
                            fightTriggeredRef.current = null;
                            setActiveFight(null);
                            setFruitBuff((p) => (p && p.fights > 1 ? { ...p, fights: p.fights - 1 } : null));
                            // NG+ echo cleared — grant the one-time deeper blessing.
                            // Gate on the won fight actually being an echo so a
                            // stale ref can never pay out on an unrelated fight.
                            if (rematchRef.current && activeFight?.startsWith('eden_echo_')) {
                                const key = edenKey('milestone', `rematch_${rematchRef.current}`);
                                if (!charRef.current.discovered.includes(key)) { onDiscover([key]); grantSkillPoints(1); }
                            }
                            rematchRef.current = null;
                        }
                        setDialogue({ speaker: 'The Gardener', text: fightDest.combat!.victory, color: '#34d399' });
                        sfx.victory();
                    }}
                    onDefeat={() => {
                        fightTriggeredRef.current = null;
                        rematchRef.current = null;
                        setActiveFight(null);
                        setDungeonHp((hp) => {
                            const next = hp - 40;
                            if (next <= 0) { setTimeout(() => softRespawn(), 50); return 0; }
                            setDialogue({ speaker: 'The Gardener', text: 'The shades overwhelm you. Rest, gather health, and try again.', color: '#34d399' });
                            sfx.defeat();
                            return Math.max(0, next);
                        });
                    }}
                    onExit={() => { fightTriggeredRef.current = null; rematchRef.current = null; setActiveFight(null); }}
                />
            )}

            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full world-canvas" />

            <div className="absolute top-0 inset-x-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }} />
            <div className="absolute bottom-0 inset-x-0 h-36 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }} />

            {/* top bar */}
            <div className="absolute top-0 inset-x-0 z-10 grid grid-cols-[auto_1fr_auto] items-start gap-x-2 px-3 sm:px-4 pointer-events-none" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}>
                <button type="button" onClick={onExit} className="pointer-events-auto shrink-0 flex items-center gap-1 text-[10px] sm:text-xs text-zinc-300 hover:text-white bg-black/50 border border-white/10 rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2">
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /><span className="leading-none">Leave</span>
                </button>
                <div className="text-center min-w-0 px-0.5 sm:px-1 pt-0.5">
                    <p className="font-black uppercase text-emerald-400 leading-tight text-balance" style={{ fontSize: 'clamp(7px, 2.2vw, 9px)', letterSpacing: '0.2em' }}>Eden · Before the Lie</p>
                    <p key={zoneLabel} className="eden-zone-in text-zinc-400 leading-snug mt-0.5 text-balance break-words" style={{ fontSize: 'clamp(7px, 2vw, 8px)', letterSpacing: '0.14em' }}>
                        {zoneLabel} · <span className="text-amber-300/70">{dayLabel}</span>
                    </p>
                    {/* sun-arc clock — the sun (amber) by day, the moon (slate) by night */}
                    <div className="mx-auto mt-0.5 flex justify-center">
                        <svg viewBox="0 0 80 18" width="60" height="14" aria-hidden style={{ overflow: 'visible' }}>
                            <path d="M4,16 Q40,-3 76,16" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
                            {(() => {
                                const u = Math.max(0, Math.min(1, dayT));
                                const bz = (a: number, b: number, c: number) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
                                const cx = bz(4, 40, 76), cy = bz(16, -3, 16);
                                const isNight = dayT >= 0.85 || dayT < 0.02;
                                const col = isNight ? '#cbd5e1' : '#fcd34d';
                                return <circle cx={cx} cy={cy} r={3} fill={col} style={{ filter: `drop-shadow(0 0 3px ${col})` }} />;
                            })()}
                        </svg>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
                    <button type="button" onClick={() => setOverlay({ kind: 'codex' })} className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/50 border border-white/10 text-zinc-300 hover:text-white leading-none" style={{ fontSize: 'clamp(7px, 1.9vw, 9px)', letterSpacing: '0.1em' }}>
                        <BookOpen className="w-3 h-3" /> Codex
                    </button>
                    <button type="button" onClick={toggleMute} className="p-1.5 sm:p-2 rounded-full bg-black/50 border border-white/10 text-zinc-300 shrink-0">
                        {muted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                </div>
            </div>

            {showMinimap && !activeFight && !overlay && (
                <div className="absolute right-3 sm:right-4 z-10 pointer-events-none" style={{ top: 'calc(3.25rem + env(safe-area-inset-top))' }}>
                    <DestinationMinimap label="Eden" mapW={EDEN_MAP_W} mapH={EDEN_MAP_H} terrain={minimapTerrain} terrainColors={EDEN_MINIMAP_TERRAIN_COLORS} explored={exploredRef.current} exploredVersion={exploredVersion} playerX={playerPos.x} playerY={playerPos.y} tileSize={EDEN_TILE} pois={minimapPois} gates={minimapGates} questWaypoint={guideStep.waypoint ?? null} size={isDesktop ? 96 : 80} />
                </div>
            )}

            {/* objective + HP + fruit buff */}
            <div key={guideStep.id} className="eden-animate-in absolute left-3 sm:left-4 z-10 pointer-events-none glass-panel rounded-xl border border-emerald-500/20 bg-black/40 backdrop-blur-sm px-2.5 py-2" style={{ top: 'calc(3.25rem + env(safe-area-inset-top))', maxWidth: 'min(280px, calc(100vw - 5.5rem))' }}>
                <div className="flex items-center gap-2 mb-1.5">
                    <Heart className="w-3 h-3 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0 h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                        <div className="eden-hp-bar h-full rounded-full" style={{ width: `${(dungeonHp / MAX_DUNGEON_HP) * 100}%`, background: dungeonHp > 35 ? '#34d399' : '#ef4444' }} />
                    </div>
                    <span className="text-[7px] font-mono text-zinc-500 shrink-0 tabular-nums">{dungeonHp}</span>
                </div>
                <p className="text-emerald-300/95 leading-snug break-words text-pretty font-medium" style={{ fontSize: 'clamp(7px, 2vw, 8px)', letterSpacing: '0.04em' }}>{guideStep.objective}</p>
                <p className="text-emerald-200/50 leading-snug mt-0.5" style={{ fontSize: 'clamp(6px, 1.7vw, 7px)' }}>{level.riversLit.length}/4 rivers · {level.named.length}/{EDEN_CREATURES.length} named</p>
                {/* Garden Restored — the blight recedes region by region */}
                <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-lime-300/70 uppercase shrink-0" style={{ fontSize: 'clamp(6px, 1.6vw, 7px)', letterSpacing: '0.12em' }}>Restored</span>
                    <div className="flex-1 min-w-0 h-1.5 rounded-full bg-black/50 border border-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${restoredPct}%`, background: 'linear-gradient(90deg,#34d399,#a3e635)' }} />
                    </div>
                    <span className="text-[7px] font-mono text-zinc-500 shrink-0 tabular-nums">{restoredPct}%</span>
                </div>
                {fruitBuff && (
                    <p className="text-lime-300/85 mt-1 leading-snug" style={{ fontSize: 'clamp(6px, 1.7vw, 7px)' }}>
                        🍃 Garden vigour · {fruitBuff.damage ? `+${fruitBuff.damage} strike ` : ''}{fruitBuff.hp ? `+${fruitBuff.hp} vit ` : ''}{fruitBuff.regen ? `+${fruitBuff.regen} renew ` : ''}{fruitBuff.lifesteal ? `+${Math.round(fruitBuff.lifesteal * 100)}% leech ` : ''}{fruitBuff.crit ? `+${Math.round(fruitBuff.crit * 100)}% edge ` : ''}· {fruitBuff.fights} fight{fruitBuff.fights > 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* garden toast — a wing breathes again / the blight's trigger hint */}
            {bloomToast && (
                <div className="absolute inset-x-0 z-20 flex justify-center px-6 pointer-events-none" style={{ top: 'calc(9.25rem + env(safe-area-inset-top))' }}>
                    <p
                        className={`eden-animate-in rounded-full bg-black/70 border px-3 py-1.5 text-center leading-snug backdrop-blur-sm ${bloomToast.tone === 'bloom' ? 'border-lime-400/30 text-lime-200' : 'border-violet-400/30 text-violet-200'}`}
                        style={{ fontSize: 'clamp(8px, 2.2vw, 10px)', letterSpacing: '0.06em', boxShadow: bloomToast.tone === 'bloom' ? '0 0 20px rgba(163,230,53,0.25)' : '0 0 20px rgba(139,92,246,0.2)' }}
                    >
                        {bloomToast.text}
                    </p>
                </div>
            )}

            {dialogue && (
                <WorldDialogueBox speaker={dialogue.speaker} text={dialogue.text} color={dialogue.color} onClose={() => setDialogue(null)} controlsHidden={!isDesktop} />
            )}

            {/* serpent choice — whisper + fork, movement paused while this is up */}
            {nearSerpent && !level.serpent[nearSerpent] && !activeFight && !overlay && (() => {
                const beat = serpentBeatById(nearSerpent);
                const climax = !!beat?.climax;
                const whisper = (beat?.whisper ?? '').replace(/^【[^】]*】\s*/, '');
                return (
                    <div className="absolute inset-x-0 z-30 flex justify-center px-4 pointer-events-none" style={{ bottom: isDesktop ? 'calc(5rem + env(safe-area-inset-bottom))' : 'calc(6.25rem + env(safe-area-inset-bottom))' }}>
                        <div className="eden-animate-in pointer-events-auto w-full max-w-sm rounded-xl border border-red-500/30 bg-black/85 backdrop-blur-md p-3" style={{ boxShadow: '0 0 30px rgba(239,68,68,0.25)' }}>
                            <p className="text-center uppercase text-red-300/80 mb-1.5" style={{ fontSize: 'clamp(7px,1.9vw,8px)', letterSpacing: '0.22em' }}>
                                {climax ? 'The tree of knowing good and evil' : 'A whisper at the water'}
                            </p>
                            <p className="text-red-100/90 text-center leading-snug mb-2.5 text-pretty" style={{ fontSize: 'clamp(8px,2.3vw,10px)' }}>{whisper}</p>
                            {listenedAny(character.discovered) && (
                                <p className="text-center italic text-red-300/55 mb-2 leading-snug" style={{ fontSize: 'clamp(7px,1.8vw,8px)' }}>
                                    …it speaks softer now, the way a voice does once you have listened.
                                </p>
                            )}
                            <div className="flex gap-2 justify-center">
                                <button type="button" onClick={() => resolveSerpent(nearSerpent, 'listened')} className="flex-1 max-w-[9rem] px-3 py-2.5 rounded-lg font-black uppercase bg-red-900/70 border border-red-500/40 text-red-100 leading-tight text-center" style={{ fontSize: 'clamp(8px, 2.2vw, 9px)', letterSpacing: '0.1em', minHeight: 40 }}>
                                    {climax ? 'Taste' : 'Listen'}
                                </button>
                                <button type="button" onClick={() => resolveSerpent(nearSerpent, 'resisted')} className="flex-1 max-w-[9rem] px-3 py-2.5 rounded-lg font-black uppercase bg-emerald-900/70 border border-emerald-500/40 text-emerald-100 leading-tight text-center" style={{ fontSize: 'clamp(8px, 2.2vw, 9px)', letterSpacing: '0.1em', minHeight: 40 }}>
                                    Walk on
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* overlays */}
            {overlay?.kind === 'codex' && <EdenCodex character={character} level={level} onClose={() => setOverlay(null)} accent="#34d399" onWarp={warpTo} />}
            {overlay?.kind === 'naming' && openCreature && <NamingPanel creature={openCreature} onName={nameCreature} onClose={() => setOverlay(null)} accent="#34d399" />}
            {overlay?.kind === 'tend' && openBed && <TendPanel bed={openBed} runtime={openBedRt} onPlant={(seedId) => plantSeed(openBed.id, seedId)} onHarvest={(seed) => harvestBed(openBed.id, seed)} onClose={() => setOverlay(null)} accent="#34d399" rareUnlocked={level.bossGateOpen} />}

            {/* Dash — the wind-step. Sits above the interact button's slot so it
                never overlaps existing controls; ≥48px touch target. */}
            {!activeFight && !overlay && !nearSerpent && profile !== 'keyboard' && (
                <button
                    type="button"
                    onPointerDown={(e) => { e.preventDefault(); dashReqRef.current = true; }}
                    aria-label="Dash"
                    className="absolute z-10 rounded-full font-black uppercase flex flex-col items-center justify-center text-center pointer-events-auto active:scale-95 transition-all"
                    style={{
                        width: Math.max(48, Math.round(actionBtn * 0.72)),
                        height: Math.max(48, Math.round(actionBtn * 0.72)),
                        right: '1rem',
                        bottom: `calc(1.25rem + env(safe-area-inset-bottom) + ${actionBtn + 14}px)`,
                        background: dashCdUi > 0 ? 'linear-gradient(135deg,#334155 0%,#1e293b 100%)' : 'linear-gradient(135deg,#a7f3d0 0%,#059669 100%)',
                        boxShadow: dashCdUi > 0 ? 'none' : '0 0 18px rgba(52,211,153,0.4)',
                        color: dashCdUi > 0 ? '#94a3b8' : '#052e1b',
                        opacity: dashCdUi > 0 ? 0.55 : 1,
                        letterSpacing: '0.14em',
                        fontSize: 8,
                        touchAction: 'none',
                    }}
                >
                    <Wind className="w-4 h-4 mb-0.5" />
                    Dash
                </button>
            )}

            {/* controls */}
            {!activeFight && !dialogue && !overlay && (
                <WorldControlPad profile={profile} joy={joy} joyRadius={joyR} near={nearPoi ? { name: nearPoi.name, type: 'npc' } : null} onInteract={handleInteract} />
            )}
            {!activeFight && dialogue && !isDesktop && !overlay && (
                <WorldControlPad profile={profile} joy={joy} joyRadius={joyR} near={null} onInteract={() => {}} />
            )}
        </div>
    );
}
