'use client';

import dynamic from 'next/dynamic';

/**
 * Truth.OS — industry immersive entry
 * Auth → create (BG preload) → 3D bedroom → GSAP zoom → OS overlay
 * 3D Hut chamber remains at /world (Chamber.exe)
 */
const ImmersiveExperience = dynamic(
    () => import('@/components/truthos/engine/ImmersiveExperience'),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-[100dvh] bg-black flex items-center justify-center font-mono text-emerald-500/50 text-xs tracking-[0.35em]">
                follow the white rabbit…
            </div>
        ),
    },
);

export default function HomePage() {
    return <ImmersiveExperience />;
}
