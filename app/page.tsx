'use client';

import dynamic from 'next/dynamic';

/**
 * Primary hub is the 3D Aether Shelf world.
 * Truth.OS stays available via a CTA for anyone who will not walk 3D.
 */
const TruthOSDesktop = dynamic(() => import('@/components/truthos/TruthOSDesktop'), {
    ssr: false,
    loading: () => (
        <div className="min-h-[100dvh] bg-black flex items-center justify-center font-mono text-emerald-500/50 text-xs tracking-[0.35em]">
            entering the shelf…
        </div>
    ),
});

export default function HomePage() {
    return <TruthOSDesktop />;
}
