'use client';

/**
 * The post stack, by quality tier.
 *
 * Order matters and is deliberate: ambient occlusion first (it needs the
 * raw depth), bloom on the lit image, the vignette last among the colour
 * passes, and SMAA at the very end so it smooths the final frame. Depth
 * of field is opt-in — the old always-on blur, focused 7.5 m out, is what
 * made every desk and wall two metres away read soft.
 */
import { useCallback, useRef } from 'react';
import type { BloomEffect } from 'postprocessing';
import { Bloom, DepthOfField, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing';
import { BloomByDaylight } from './WeatherFx';
import type { QualityProfile } from './renderQuality';

export default function PostFX({ profile }: { profile: QualityProfile }) {
    const bloom = useRef<BloomEffect>(null);
    /**
     * ⚠ The bloom handle MUST be attached with a callback ref, never
     * `ref={bloom}`. @react-three/postprocessing memoises an effect's args on
     * `[JSON.stringify(props)]`, and under React 19 `ref` arrives as a normal
     * prop — so an object ref serialises the live BloomEffect, walks its
     * `__r3f` instance and throws "Converting circular structure to JSON" on
     * the first re-render, killing the whole Canvas. A function is skipped by
     * JSON.stringify, so the memo key stays "{}" and the world keeps standing.
     */
    const attachBloom = useCallback((e: BloomEffect | null) => {
        bloom.current = e;
    }, []);

    if (!profile.post) return null;

    return (
        <>
            {profile.bloom && <BloomByDaylight effect={bloom} night={0.5} day={0.14} />}
            <EffectComposer multisampling={0} enableNormalPass={false}>
                {profile.ao ? (
                    <N8AO
                        halfRes={profile.aoHalfRes}
                        aoRadius={1.15}
                        intensity={2.4}
                        distanceFalloff={0.9}
                        quality={profile.tier === 'ultra' ? 'high' : 'performance'}
                        color="#07050d"
                        depthAwareUpsampling
                    />
                ) : (
                    <></>
                )}
                {profile.bloom ? (
                    <Bloom
                        ref={attachBloom}
                        intensity={0.3}
                        luminanceThreshold={1.02}
                        luminanceSmoothing={0.32}
                        mipmapBlur
                        radius={0.6}
                    />
                ) : (
                    <></>
                )}
                {profile.dof ? (
                    <DepthOfField worldFocusDistance={9} worldFocusRange={30} bokehScale={1.1} resolutionScale={0.5} />
                ) : (
                    <></>
                )}
                <Vignette eskil={false} offset={0.2} darkness={0.34} />
                {profile.smaa ? <SMAA /> : <></>}
            </EffectComposer>
        </>
    );
}
