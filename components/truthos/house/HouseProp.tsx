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
import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import type * as THREE from 'three';

export type ModelLicence = 'CC0' | 'CC-BY' | 'original' | 'unverified';

export type ModelEntry = {
    /** Public path, or null when we haven't sourced art for this prop yet */
    url: string | null;
    licence: ModelLicence;
    /** Required attribution string, when the licence demands one */
    credit?: string;
    source?: string;
};

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
};

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

function Model({ url, shadows }: { url: string; shadows: boolean }) {
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
        return clone;
    }, [scene, shadows]);
    return <primitive object={object} />;
}

export default function HouseProp({
    model,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    shadows = true,
    children,
}: {
    /** Key into HOUSE_MODELS */
    model: keyof typeof HOUSE_MODELS | string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
    shadows?: boolean;
    /** Procedural mesh used while loading, and whenever no model is available */
    children: ReactNode;
}) {
    const entry = HOUSE_MODELS[model];
    if (!entry?.url) return <>{children}</>;

    return (
        <ModelBoundary fallback={children}>
            <Suspense fallback={children}>
                <group position={position} rotation={rotation} scale={scale}>
                    <Model url={entry.url} shadows={shadows} />
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
