'use client';

import dynamic from 'next/dynamic';

/**
 * Truth.OS desktop — primary hub.
 * Full Hut features live as OS apps after Google/email auth.
 * 3D Chamber is optional (Start → Chamber).
 */
const TruthOSDesktop = dynamic(() => import('@/components/truthos/TruthOSDesktop'), {
    ssr: false,
    loading: () => (
        <div className="min-h-[100dvh] bg-black flex items-center justify-center font-mono text-emerald-500/50 text-xs tracking-[0.35em]">
            booting Truth.OS…
        </div>
    ),
});

export default function HomePage() {
    return <TruthOSDesktop />;
}
