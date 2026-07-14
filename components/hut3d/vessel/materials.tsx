'use client';

/**
 * Vessel materials — practices adapted from Bruno Simon’s folio-2025:
 * · Shared map library (palette × color multiply)
 * · Material params by surface kind (skin/cloth/hair/leather/metal)
 * · Hot-update color without remounting meshes
 * · Optional finishes (matte / silk / luminous / abyssal) like car paints
 */
import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import {
    SKIN_TONES,
    HAIR_COLORS,
    CLOTH_COLORS,
    BOOT_COLORS,
    EYE_COLORS,
    type AvatarConfig,
    type VesselFinish,
} from '@/lib/game/avatar';
import { getVesselMap, getVerticalGradientMap, type VesselMapKind } from './vesselSkins';

export type { VesselMapKind };

const FinishCtx = createContext<VesselFinish>('silk');
const LowCtx = createContext(false);

/** Wrap vessel tree so Mat inherits finish/quality (Bruno hot-swap paints) */
export function VesselLookProvider({
    finish = 'silk',
    low = false,
    children,
}: {
    finish?: VesselFinish;
    low?: boolean;
    children: ReactNode;
}) {
    return (
        <FinishCtx.Provider value={finish}>
            <LowCtx.Provider value={low}>{children}</LowCtx.Provider>
        </FinishCtx.Provider>
    );
}

const FINISH: Record<
    VesselFinish,
    { roughMul: number; metalAdd: number; env: number; emissive?: string; emissiveIntensity?: number }
> = {
    matte: { roughMul: 1.12, metalAdd: 0, env: 0.35 },
    silk: { roughMul: 0.78, metalAdd: 0.04, env: 0.7 },
    luminous: { roughMul: 0.72, metalAdd: 0.06, env: 0.9, emissive: '#c4b5fd', emissiveIntensity: 0.12 },
    abyssal: { roughMul: 0.55, metalAdd: 0.18, env: 1.15, emissive: '#312e81', emissiveIntensity: 0.18 },
};

const KIND_BASE: Record<
    VesselMapKind,
    { roughness: number; metalness: number; env: number; map?: VesselMapKind }
> = {
    skin: { roughness: 0.68, metalness: 0.02, env: 0.45, map: 'skin' },
    cloth: { roughness: 0.88, metalness: 0.02, env: 0.4, map: 'cloth' },
    hair: { roughness: 0.55, metalness: 0.08, env: 0.55, map: 'hair' },
    leather: { roughness: 0.82, metalness: 0.06, env: 0.4, map: 'leather' },
    metal: { roughness: 0.32, metalness: 0.72, env: 0.95, map: 'metal' },
    eyes: { roughness: 0.2, metalness: 0.15, env: 1.0, map: 'eyes' },
    gold: { roughness: 0.28, metalness: 0.85, env: 1.1, map: 'gold' },
};

export function Mat({
    color,
    roughness,
    metalness,
    kind = 'cloth',
    finish: finishProp,
    low: lowProp,
    gradient = false,
}: {
    color: string;
    roughness?: number;
    metalness?: number;
    kind?: VesselMapKind;
    finish?: VesselFinish;
    low?: boolean;
    /** Bruno-style vertical color gradient multiply */
    gradient?: boolean;
}) {
    const ctxFinish = useContext(FinishCtx);
    const ctxLow = useContext(LowCtx);
    const finish = finishProp ?? ctxFinish;
    const low = lowProp ?? ctxLow;
    const base = KIND_BASE[kind];
    const fin = FINISH[finish] ?? FINISH.silk;

    const mat = useMemo(() => {
        const map = gradient ? getVerticalGradientMap(low) : getVesselMap(base.map ?? kind, low);
        return new THREE.MeshStandardMaterial({
            map,
            color: new THREE.Color(color),
            roughness: roughness ?? base.roughness * fin.roughMul,
            metalness: metalness ?? Math.min(1, base.metalness + fin.metalAdd),
            envMapIntensity: base.env * fin.env * (low ? 0.55 : 1),
            emissive: fin.emissive ? new THREE.Color(fin.emissive) : new THREE.Color(0x000000),
            emissiveIntensity: fin.emissiveIntensity ?? 0,
        });
        // structure fixed per kind/finish; color hot-updated below (Bruno paint swap)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind, finish, low, gradient, roughness, metalness]);

    useLayoutEffect(() => {
        mat.color.set(color);
        const b = KIND_BASE[kind];
        const f = FINISH[finish] ?? FINISH.silk;
        if (roughness == null) mat.roughness = b.roughness * f.roughMul;
        else mat.roughness = roughness;
        if (metalness == null) mat.metalness = Math.min(1, b.metalness + f.metalAdd);
        else mat.metalness = metalness;
        mat.envMapIntensity = b.env * f.env * (low ? 0.55 : 1);
        if (f.emissive && (kind === 'cloth' || kind === 'metal' || kind === 'gold' || kind === 'hair')) {
            mat.emissive.set(f.emissive);
            mat.emissiveIntensity = f.emissiveIntensity ?? 0;
        } else {
            mat.emissive.set(0x000000);
            mat.emissiveIntensity = 0;
        }
        if (finish === 'abyssal' && (kind === 'cloth' || kind === 'leather')) {
            mat.color.multiplyScalar(0.72);
        }
    }, [mat, color, kind, finish, low, roughness, metalness]);

    return <primitive object={mat} attach="material" />;
}

export function shade(hex: string, mult: number) {
    const c = new THREE.Color(hex);
    c.multiplyScalar(mult);
    return `#${c.getHexString()}`;
}

/** Mix two hex colors (Bruno gradient paint A/B) */
export function mixHex(a: string, b: string, t: number) {
    const ca = new THREE.Color(a);
    const cb = new THREE.Color(b);
    ca.lerp(cb, t);
    return `#${ca.getHexString()}`;
}

export function useVesselColors(avatar: AvatarConfig) {
    const skin = SKIN_TONES[avatar.skin] ?? SKIN_TONES[6];
    const top = CLOTH_COLORS[avatar.top] ?? CLOTH_COLORS[5];
    const bottom = CLOTH_COLORS[avatar.bottom] ?? CLOTH_COLORS[12];
    const hair = HAIR_COLORS[avatar.hairColor] ?? HAIR_COLORS[0];
    const beard = HAIR_COLORS[avatar.beardColor ?? avatar.hairColor] ?? hair;
    const finish: VesselFinish = avatar.finish ?? 'silk';
    return {
        skin,
        skinDeep: shade(skin, 0.82),
        /** Bruno-style gradient midpoint for torso shading */
        skinMid: mixHex(skin, shade(skin, 0.82), 0.35),
        hair,
        beard,
        top,
        topDeep: shade(top, 0.72),
        topHi: mixHex(top, '#ffffff', 0.12),
        bottom,
        bottomDeep: shade(bottom, 0.75),
        boots: BOOT_COLORS[avatar.boots] ?? BOOT_COLORS[0],
        eyes: EYE_COLORS[avatar.eyes ?? 0] ?? EYE_COLORS[0],
        gold: '#d4a017',
        leather: '#4a3324',
        white: '#f0ebe3',
        finish,
    };
}

export type VesselColors = ReturnType<typeof useVesselColors>;

/** Limb along local −Y, pivot at joint. */
export function Limb({
    radius,
    length,
    color,
    taper = 1,
}: {
    radius: number;
    length: number;
    color: string;
    taper?: number;
}) {
    return (
        <group>
            <mesh position={[0, -length * 0.5, 0]} castShadow>
                <capsuleGeometry args={[radius, Math.max(0.02, length - radius * 1.6), 5, 10]} />
                <Mat color={color} kind="skin" />
            </mesh>
            {taper < 0.99 && (
                <mesh position={[0, -length * 0.85, 0]} castShadow>
                    <sphereGeometry args={[radius * taper, 8, 8]} />
                    <Mat color={color} kind="skin" />
                </mesh>
            )}
        </group>
    );
}
