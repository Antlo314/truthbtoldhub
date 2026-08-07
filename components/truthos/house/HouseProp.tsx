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
 * Prop manifest. `url: null` means "procedural only for now" — the fallback
 * mesh renders and nothing breaks. Fill a url in to upgrade that prop.
 */
export const HOUSE_MODELS: Record<string, ModelEntry> = {
    vesselMan: {
        url: '/models/vessels/vessel_man.glb',
        licence: 'original',
        source: 'Blender blockout authored for this project',
    },
    vesselWoman: {
        url: '/models/vessels/vessel_woman.glb',
        licence: 'original',
        source: 'Blender blockout authored for this project',
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

        // Uniform scale so the requested axis lands on its real-world size
        let k = 1;
        if (fit?.w && size.x > 1e-4) k = fit.w / size.x;
        else if (fit?.h && size.y > 1e-4) k = fit.h / size.y;
        else if (fit?.d && size.z > 1e-4) k = fit.d / size.z;

        const wrapper = new THREE.Group();
        wrapper.add(clone);
        if (k !== 1) wrapper.scale.setScalar(k);

        // Re-measure after scaling and park the model on its anchor
        const scaled = new THREE.Box3().setFromObject(wrapper);
        const c = scaled.getCenter(new THREE.Vector3());
        clone.position.x -= c.x / k;
        clone.position.z -= c.z / k;
        clone.position.y -= (anchor === 'base' ? scaled.min.y : c.y) / k;

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
    if (primitiveOnly || !entry?.url) return <>{children}</>;

    // The fallback meshes are authored in world space, so they must render
    // OUTSIDE the positioning group — nesting them would double their offset.
    return (
        <ModelBoundary fallback={children}>
            <Suspense fallback={children}>
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
