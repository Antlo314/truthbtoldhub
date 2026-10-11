'use client';

/**
 * Model loading for the house — GLTF/GLB props with a procedural fallback.
 *
 * The house is built entirely from primitives, and that stays the floor: every
 * <HouseProp> takes the existing procedural mesh as `children` and renders it
 * whenever the model is missing, still downloading, or fails to parse. Adding
 * art can therefore never leave a hole in the room, and the scene keeps working
 * for anyone who clones the repo without the (large, often unredistributable)
 * asset packs.
 *
 * Provenance lives next to the path in HOUSE_MODELS so licence obligations are
 * visible in code rather than remembered.
 */
import { Component, Suspense, createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export type ModelLicence = 'CC0' | 'CC-BY' | 'original' | 'unverified';

export type ModelEntry = {
    /** Public path, or null when we haven't sourced art for this prop yet */
    url: string | null;
    licence: ModelLicence;
    /** Required attribution string, when the licence demands one */
    credit?: string;
    source?: string;
    /**
     * Real-world size this prop should occupy, in metres. Taken from the
     * procedural mesh it replaces, so the model lands inside the collider that
     * was already verified for that footprint.
     */
    fit?: { w?: number; h?: number; d?: number };
};

const KEN = '/models/kenney';
/** Kenney kits are CC0 — no attribution required, redistribution permitted */
const kenney = (
    file: string,
    fit: { w?: number; h?: number; d?: number },
): ModelEntry => ({
    url: `${KEN}/${file}.glb`,
    licence: 'CC0',
    source: 'Kenney Furniture / Nature Kit (kenney.nl) — CC0',
    fit,
});

/**
 * The later kits live one folder down, pulled by scripts/fetch-kenney.mjs
 * (which also writes each kit's own License.txt beside the models).
 */
const kit = (
    slug: string,
    file: string,
    fit: { w?: number; h?: number; d?: number },
): ModelEntry => ({
    url: `${KEN}/${slug}/${file}.glb`,
    licence: 'CC0',
    source: `Kenney ${slug} (kenney.nl) — CC0`,
    fit,
});

/**
 * Prop manifest. `url: null` means "procedural only for now" — the fallback
 * mesh renders and nothing breaks. Fill a url in to upgrade that prop.
 */
export const HOUSE_MODELS: Record<string, ModelEntry> = {
    // The rigged bodies are loaded by house/Vessel.tsx, not through
    // <HouseProp>; they are listed so the audit sees them and the
    // licence is next to the path.
    vesselMasc: {
        url: '/models/vessels/vessel_masc.glb',
        licence: 'CC0',
        source: 'Quaternius Universal Base Characters / Modular Outfits (CC0), rebuilt by scripts/build-vessels.mjs',
    },
    vesselFem: {
        url: '/models/vessels/vessel_fem.glb',
        licence: 'CC0',
        source: 'Quaternius Universal Base Characters / Modular Outfits (CC0), rebuilt by scripts/build-vessels.mjs',
    },
    vesselAnims: {
        url: '/models/vessels/vessel_anims.glb',
        licence: 'CC0',
        source: 'Quaternius Universal Animation Library (CC0), rebuilt by scripts/build-vessels.mjs',
    },

    // ── Living ──
    sofa: kenney('loungeSofa', { w: 3.0 }),
    coffeeTable: kenney('tableCoffee', { w: 1.15 }),
    mediaConsole: kenney('cabinetTelevision', { w: 2.1 }),
    television: kenney('televisionModern', { w: 1.85 }),
    accentChair: kenney('loungeChair', { w: 0.84 }),
    floorLamp: kenney('lampRoundFloor', { h: 1.6 }),
    pottedPlant: kenney('pottedPlant', { h: 0.9 }),
    plantSmall: kenney('plantSmall1', { h: 0.42 }),

    // ── Kitchen ──
    kitchenCabinet: kenney('kitchenCabinet', { h: 0.9 }),
    kitchenSink: kenney('kitchenSink', { h: 0.9 }),
    kitchenStove: kenney('kitchenStove', { h: 0.9 }),
    kitchenUpper: kenney('kitchenCabinetUpper', { h: 0.7 }),
    fridge: kenney('kitchenFridgeLarge', { h: 1.7 }),
    diningTable: kenney('tableRound', { w: 1.2 }),
    diningChair: kenney('chair', { h: 0.92 }),

    // ── Bedroom ──
    bed: kenney('bedDouble', { d: 2.16 }),
    nightstand: kenney('cabinetBedDrawer', { w: 0.6 }),
    dresser: kenney('sideTableDrawers', { w: 1.5 }),
    coatRack: kenney('coatRackStanding', { h: 1.7 }),

    // ── Study / desk ──
    desk: kenney('desk', { w: 1.8 }),
    deskChair: kenney('chairDesk', { w: 0.64 }),
    monitor: kenney('computerScreen', { w: 0.98 }),
    keyboard: kenney('computerKeyboard', { w: 0.42 }),
    bookcase: kenney('bookcaseOpen', { h: 2.4 }),

    // ── Interior dressing ──
    bookcaseClosed: kenney('bookcaseClosedWide', { h: 2.2 }),
    booksStack: kenney('books', { w: 0.28 }),
    tableLamp: kenney('lampRoundTable', { h: 0.52 }),
    coffeeMachine: kenney('kitchenCoffeeMachine', { h: 0.34 }),
    rangeHood: kenney('hoodModern', { w: 0.9 }),
    kitchenDrawers: kenney('kitchenCabinetDrawer', { h: 0.9 }),
    barStool: kenney('stoolBar', { h: 0.72 }),
    trashcan: kenney('trashcan', { h: 0.62 }),
    mouse: kenney('computerMouse', { w: 0.11 }),
    bedsideTable: kenney('cabinetBedDrawerTable', { w: 0.6 }),
    throwPillow: kenney('pillow', { w: 0.44 }),
    rugRect: kenney('rugRectangle', { w: 3.2 }),
    rugRoundSm: kenney('rugRound', { w: 2.2 }),

    // ── Yard ──
    treeDefault: kenney('tree_default', { h: 4.2 }),
    treeOak: kenney('tree_oak', { h: 3.8 }),
    treeDetailed: kenney('tree_detailed', { h: 3.6 }),
    treeFat: kenney('tree_fat', { h: 3.4 }),
    bush: kenney('plant_bushDetailed', { w: 1.1 }),
    bushSmall: kenney('plant_bush', { w: 0.8 }),
    bushLarge: kenney('plant_bushLarge', { w: 0.95 }),
    flowerPurple: kenney('flower_purpleA', { h: 0.45 }),
    flowerRed: kenney('flower_redA', { h: 0.45 }),
    flowerYellow: kenney('flower_yellowA', { h: 0.42 }),
    grassTuft: kenney('grass', { h: 0.4 }),
    grassLarge: kenney('grass_large', { h: 0.5 }),
    rock: kenney('rock_smallA', { w: 0.7 }),
    stone: kenney('stone_smallA', { w: 0.6 }),
    logStack: kenney('log_stack', { w: 1.1 }),
    campfire: kenney('campfire_logs', { w: 1.1 }),
    fencePanel: kenney('fence_simple', { w: 2.0 }),
    fenceCorner: kenney('fence_corner', { w: 2.0 }),
    fenceGate: kenney('fence_gate', { w: 2.6 }),

    // ── Fantasy Town Kit — the shelf's lamps, the Source well, market dressing ──
    ftLantern: kit('fantasy-town-kit', 'lantern', { h: 2.5 }),
    ftBannerRed: kit('fantasy-town-kit', 'banner-red', { h: 1.5 }),
    ftBannerGreen: kit('fantasy-town-kit', 'banner-green', { h: 1.5 }),
    ftStall: kit('fantasy-town-kit', 'stall', { w: 2.3 }),
    ftStallStool: kit('fantasy-town-kit', 'stall-stool', { h: 0.5 }),
    ftStallBench: kit('fantasy-town-kit', 'stall-bench', { w: 1.3 }),
    ftPillarStone: kit('fantasy-town-kit', 'pillar-stone', { h: 2.3 }),
    ftFountainRound: kit('fantasy-town-kit', 'fountain-round', { w: 3.8 }),
    ftFountainCenter: kit('fantasy-town-kit', 'fountain-center', { w: 1.7 }),
    ftWallArch: kit('fantasy-town-kit', 'wall-arch', { h: 3.3 }),
    ftCart: kit('fantasy-town-kit', 'cart', { w: 1.5 }),
    ftWheel: kit('fantasy-town-kit', 'wheel', { w: 0.8 }),
    ftPlanks: kit('fantasy-town-kit', 'planks', { w: 2.0 }),
    ftHedge: kit('fantasy-town-kit', 'hedge', { w: 1.3 }),
    ftRockLarge: kit('fantasy-town-kit', 'rock-large', { w: 1.5 }),

    // ── Castle Kit — banners, the Signal tower, bridge heads ──
    ckFlagBannerLong: kit('castle-kit', 'flag-banner-long', { h: 3.4 }),
    ckFlag: kit('castle-kit', 'flag', { h: 1.9 }),
    ckTowerBase: kit('castle-kit', 'tower-square-base', { w: 3.0 }),
    ckTowerMid: kit('castle-kit', 'tower-square-mid', { w: 2.8 }),
    ckTowerMidWindows: kit('castle-kit', 'tower-square-mid-windows', { w: 2.8 }),
    ckTowerTop: kit('castle-kit', 'tower-square-top', { w: 3.0 }),
    ckTowerRoof: kit('castle-kit', 'tower-square-top-roof', { w: 3.0 }),
    ckWallPillar: kit('castle-kit', 'wall-pillar', { h: 2.6 }),
    ckRocksLarge: kit('castle-kit', 'rocks-large', { w: 2.4 }),
    ckRocksSmall: kit('castle-kit', 'rocks-small', { w: 1.7 }),

    // ── Survival Kit — camp life at the isles, signposts on the paths ──
    skSignpost: kit('survival-kit', 'signpost', { h: 2.2 }),
    skSignpostSingle: kit('survival-kit', 'signpost-single', { h: 2.1 }),
    skCampfireStand: kit('survival-kit', 'campfire-stand', { w: 1.5 }),
    skCampfirePit: kit('survival-kit', 'campfire-pit', { w: 1.2 }),
    skBedroll: kit('survival-kit', 'bedroll', { w: 0.8 }),
    skChest: kit('survival-kit', 'chest', { w: 0.82 }),
    skBarrel: kit('survival-kit', 'barrel', { h: 0.95 }),
    skBoxLarge: kit('survival-kit', 'box-large', { w: 0.8 }),
    skBucket: kit('survival-kit', 'bucket', { h: 0.4 }),
    skWorkbench: kit('survival-kit', 'workbench', { w: 1.35 }),
    skTent: kit('survival-kit', 'tent', { w: 2.7 }),
    skResourceWood: kit('survival-kit', 'resource-wood', { w: 0.9 }),

    // ── Platformer Kit — shards, springs, a flag ──
    pkJewel: kit('platformer-kit', 'jewel', { h: 0.5 }),
    pkStar: kit('platformer-kit', 'star', { h: 0.5 }),
    pkSpring: kit('platformer-kit', 'spring', { w: 1.1 }),
    pkCoinGold: kit('platformer-kit', 'coin-gold', { h: 0.4 }),
    pkFlag: kit('platformer-kit', 'flag', { h: 1.6 }),
    pkLever: kit('platformer-kit', 'lever', { w: 0.7 }),
    pkChest: kit('platformer-kit', 'chest', { w: 0.9 }),

    // ── Food Kit — the kitchen is lived in ──
    fkApple: kit('food-kit', 'apple', { w: 0.085 }),
    fkPear: kit('food-kit', 'pear', { h: 0.11 }),
    fkOrange: kit('food-kit', 'orange', { w: 0.08 }),
    fkBowl: kit('food-kit', 'bowl', { w: 0.3 }),
    fkBread: kit('food-kit', 'bread', { w: 0.3 }),
    fkBaguette: kit('food-kit', 'loaf-baguette', { w: 0.46 }),
    fkCuttingBoard: kit('food-kit', 'cutting-board', { w: 0.36 }),
    fkKnifeBlock: kit('food-kit', 'knife-block', { w: 0.22 }),
    fkPotStew: kit('food-kit', 'pot-stew', { w: 0.3 }),
    fkCupCoffee: kit('food-kit', 'cup-coffee', { w: 0.09 }),
    fkPlateDinner: kit('food-kit', 'plate-dinner', { w: 0.27 }),
    fkPie: kit('food-kit', 'pie', { w: 0.3 }),
    fkGlassWine: kit('food-kit', 'glass-wine', { h: 0.17 }),
    fkCheese: kit('food-kit', 'cheese', { w: 0.2 }),
    fkFryingPan: kit('food-kit', 'frying-pan', { w: 0.3 }),
    fkMug: kit('food-kit', 'mug', { w: 0.1 }),
    fkPumpkin: kit('food-kit', 'pumpkin', { w: 0.3 }),
    fkGrapes: kit('food-kit', 'grapes', { w: 0.14 }),

    // ── Nature Kit, second wave — the shelf's rim and the isles' stone ──
    nkStatueColumn: kit('nature-kit', 'statue_column', { h: 3.2 }),
    nkStatueObelisk: kit('nature-kit', 'statue_obelisk', { h: 2.6 }),
    nkStatueRing: kit('nature-kit', 'statue_ring', { h: 2.6 }),
    nkCliffRock: kit('nature-kit', 'cliff_rock', { w: 4.0 }),
    nkCliffLargeRock: kit('nature-kit', 'cliff_large_rock', { w: 4.0 }),
    nkRockTallA: kit('nature-kit', 'rock_tallA', { h: 2.6 }),
    nkRockTallD: kit('nature-kit', 'rock_tallD', { h: 1.9 }),
    nkRockLargeA: kit('nature-kit', 'rock_largeA', { w: 2.0 }),
    nkStoneTallA: kit('nature-kit', 'stone_tallA', { h: 2.4 }),
    nkLilyLarge: kit('nature-kit', 'lily_large', { w: 0.6 }),
    nkTreePineRoundA: kit('nature-kit', 'tree_pineRoundA', { h: 4.2 }),
    nkMushroomRedGroup: kit('nature-kit', 'mushroom_redGroup', { w: 0.5 }),
    nkLogStackLarge: kit('nature-kit', 'log_stackLarge', { w: 1.2 }),
    nkPathStoneCircle: kit('nature-kit', 'path_stoneCircle', { w: 1.6 }),
};

/* The town is gone — the safe house stands alone in the jungle now. */

/** Attribution lines for every non-CC0, non-original model actually in use */
export function requiredCredits(): string[] {
    return Object.values(HOUSE_MODELS)
        .filter((m) => m.url && m.credit)
        .map((m) => m.credit as string)
        .filter((c, i, a) => a.indexOf(c) === i);
}

class ModelBoundary extends Component<
    { fallback: ReactNode; children: ReactNode },
    { failed: boolean }
> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(err: unknown) {
        // A missing or malformed model must never take the scene down
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[HouseProp] model failed, using procedural fallback:', err);
        }
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

/**
 * Asset packs don't agree on scale — inside one Kenney kit a sofa wants ~2x
 * and a bed wants ~1x to hit real-world metres. Rather than hand-tuning a
 * magic number per model (which breaks the moment a pack is swapped), each
 * prop declares the real size it should occupy and we normalise the loaded
 * mesh to it. `anchor: 'base'` then drops it onto the floor regardless of
 * where the author put the origin.
 */
function Model({
    url,
    shadows,
    fit,
    anchor,
}: {
    url: string;
    shadows: boolean;
    fit?: { w?: number; h?: number; d?: number };
    anchor: 'base' | 'center';
}) {
    const { scene } = useGLTF(url);
    const object = useMemo(() => {
        const clone = scene.clone(true);
        clone.traverse((o: THREE.Object3D) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
                mesh.castShadow = shadows;
                mesh.receiveShadow = shadows;
            }
        });

        const box = new THREE.Box3().setFromObject(clone);
        const size = box.getSize(new THREE.Vector3());

        // Every requested axis lands on its real-world size; axes not
        // requested follow the first one uniformly, preserving the
        // model's proportions there.
        //
        // This used to be uniform-only — first axis wins, the rest
        // silently ignored. Fine for `fit={{w}}`, but the furn() rework
        // now writes calls like `fit={{h, w, d}}` meaning "fill the
        // collider box", and under the old rule the fridge rendered
        // 1.42m tall against the 1.85m box the walker collides with:
        // an invisible ledge of blocked air. Multi-axis requests are a
        // deliberate non-uniform stretch; single-axis calls behave
        // exactly as before.
        const kw = fit?.w && size.x > 1e-4 ? fit.w / size.x : null;
        const kh = fit?.h && size.y > 1e-4 ? fit.h / size.y : null;
        const kd = fit?.d && size.z > 1e-4 ? fit.d / size.z : null;
        const base = kw ?? kh ?? kd ?? 1;
        const kx = kw ?? base;
        const ky = kh ?? base;
        const kz = kd ?? base;

        const wrapper = new THREE.Group();
        wrapper.add(clone);
        if (kx !== 1 || ky !== 1 || kz !== 1) wrapper.scale.set(kx, ky, kz);

        // Re-measure after scaling and park the model on its anchor.
        // The centre offset is applied to the CHILD, inside the scaled
        // wrapper, so each component divides by its own axis scale.
        const scaled = new THREE.Box3().setFromObject(wrapper);
        const c = scaled.getCenter(new THREE.Vector3());
        clone.position.x -= c.x / kx;
        clone.position.z -= c.z / kz;
        clone.position.y -= (anchor === 'base' ? scaled.min.y : c.y) / ky;

        return wrapper;
    }, [scene, shadows, fit?.w, fit?.h, fit?.d, anchor]);
    return <primitive object={object} />;
}

/**
 * Detail tier for every prop under it.
 *
 * `primitiveOnly` makes HouseProp render the procedural fallback it already
 * carries instead of fetching the GLB. On a phone that removes ~30 model
 * downloads, their parse cost, their materials and their textures in one
 * switch — and because every prop was authored fallback-first, the room is
 * still furnished, just blockier. Flip it off in HouseCanvas if a phone
 * should pay for the art.
 */
export const PropDetail = createContext({ primitiveOnly: false });

export function PropDetailProvider({
    primitiveOnly,
    children,
}: {
    primitiveOnly: boolean;
    children: ReactNode;
}) {
    const value = useMemo(() => ({ primitiveOnly }), [primitiveOnly]);
    return <PropDetail.Provider value={value}>{children}</PropDetail.Provider>;
}

export default function HouseProp({
    model,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    shadows = true,
    anchor = 'base',
    fit,
    children,
}: {
    /** Key into HOUSE_MODELS */
    model: keyof typeof HOUSE_MODELS | string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    shadows?: boolean;
    /** 'base' drops the model onto y=0; 'center' centres it on the origin */
    anchor?: 'base' | 'center';
    /** Overrides the manifest size for this instance */
    fit?: { w?: number; h?: number; d?: number };
    /** Procedural mesh used while loading, and whenever no model is available */
    children: ReactNode;
}) {
    const entry = HOUSE_MODELS[model];
    const { primitiveOnly } = useContext(PropDetail);

    // Children are LOCAL axis-aligned solids (they match the collider).
    // Rotation applies to the GLB only so a turned sofa does not spin its
    // fallback box out of the AABB. Exactly one representation draws.
    const solid = <group position={position}>{children}</group>;

    if (primitiveOnly || !entry?.url) return solid;

    return (
        <ModelBoundary fallback={solid}>
            <Suspense fallback={solid}>
                <group position={position} rotation={rotation}>
                    <Model
                        url={entry.url}
                        shadows={shadows}
                        fit={fit ?? entry.fit}
                        anchor={anchor}
                    />
                </group>
            </Suspense>
        </ModelBoundary>
    );
}

/** Warm the cache for models that are certain to be seen */
export function preloadHouseModels(keys: string[]) {
    for (const k of keys) {
        const url = HOUSE_MODELS[k]?.url;
        if (url) useGLTF.preload(url);
    }
}
