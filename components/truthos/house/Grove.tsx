'use client';

/**
 * The grove — real trees where the player actually looks.
 *
 * The jungle's far wall is instanced cylinders and icosahedrons, which is
 * the right call for a hundred metres of foliage: it costs almost nothing
 * and reads correctly as a mass of green. But the same trick was also
 * doing the near band, the twenty metres you walk through and stand
 * beside, and up close a cylinder is a cylinder. Meanwhile the Kenney
 * Nature Kit models were sitting registered and unplaced in the manifest.
 *
 * So this layer sits between them: real GLB trees, bushes, flowers and
 * rocks in the visible ring around the clearing and along the corridor
 * edges, thinning out where the instanced wall takes over. Every prop
 * keeps the HouseProp fallback, so a missing model leaves a shrub-shaped
 * primitive rather than a hole, and phones get roughly a third as many.
 */
import { useMemo } from 'react';
import HouseProp from './HouseProp';
import { buildGrove } from './groveScatter';

export default function Grove({ low = false }: { low?: boolean }) {
    const k = low ? 0.35 : 1;

    // One call, because the layers are no longer independent: each is
    // scattered against the ones before it so nothing grows through
    // anything else. Splitting them back into four useMemos would lose
    // that ordering.
    const { all } = useMemo(() => buildGrove(k), [k]);

    return (
        <group>
            {all.map((p, i) => (
                <group key={`${p.key}-${i}`} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]} scale={p.scale}>
                    <HouseProp model={p.key} position={[0, 0, 0]}>
                        {null}
                    </HouseProp>
                </group>
            ))}
        </group>
    );
}
