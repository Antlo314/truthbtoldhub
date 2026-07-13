'use client';

import dynamic from 'next/dynamic';

const BedroomStage = dynamic(() => import('@/components/truthos/BedroomStage'), {
    ssr: false,
    loading: () => (
        <div className="min-h-[100dvh] bg-black flex items-center justify-center font-mono text-emerald-500/60 text-xs tracking-[0.3em]">
            initializing room…
        </div>
    ),
});

/**
 * Truth B Told Hub — modern bedroom staging.
 * Login on PC / phone → Truth.OS (all hub content).
 * 3D Hut lives at /world as Chamber.exe
 */
export default function HomePage() {
    return <BedroomStage />;
}
