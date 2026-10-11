'use client';

/**
 * The post stack, by quality tier.
 *
 * Bloom on the lit image, the vignette last among the colour passes, and
 * SMAA at the very end so it smooths the final frame. Depth of field is
 * opt-in — the old always-on blur made every desk two metres away soft.
 *
 * No screen-space ambient occlusion. N8AO's composite blacked out the
 * cinema screen (unlit, untonemapped) and drew every transparent light
 * shaft — the oculus, the skylights, the projector beam — as a grey
 * veil; its occlusion buffer was clean, its merge was not. The lair is
 * full of exactly those surfaces, so the pass is gone rather than tuned.
 */
import { useCallback, useRef } from 'react';
import type { BloomEffect } from 'postprocessing';
import { Bloom, DepthOfField, EffectComposer, SMAA, Vignette } from '@react-three/postprocessing';
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
                <Vignette eskil={false} offset={0.22} darkness={0.4} />
                {profile.smaa ? <SMAA /> : <></>}
            </EffectComposer>
        </>
    );
}
