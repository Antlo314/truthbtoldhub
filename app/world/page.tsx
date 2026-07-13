'use client';

import dynamic from 'next/dynamic';

const HutExperience = dynamic(() => import('@/components/hut3d/HutExperience'), {
    ssr: false,
    loading: () => (
        <div className="min-h-[100dvh] bg-[#05060c] flex flex-col items-center justify-center text-center px-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-aether-gold/70 mb-3">The Journey</p>
            <p className="font-ritual text-2xl text-white/85">Opening Truth&apos;s Hut…</p>
        </div>
    ),
});

/**
 * Truth's Hut — now React Three Fiber (no Unity WebGL).
 * Keeps: walkable hut, Ask Truth, Soul / character creator link.
 */
export default function WorldPage() {
    return <HutExperience />;
}
