'use client';

import dynamic from 'next/dynamic';

/**
 * Truth.OS House — first-person multiplayer home.
 * Login → walk the house (FP) → interact with Hut-mapped objects → Hub sections.
 * Computer boots Truth.OS overlay. 3D chamber at /world.
 */
const HouseExperience = dynamic(
    () => import('@/components/truthos/house/HouseExperience'),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-[100dvh] bg-black flex items-center justify-center font-mono text-emerald-500/50 text-xs tracking-[0.35em]">
                entering the house…
            </div>
        ),
    },
);

export default function HomePage() {
    return <HouseExperience />;
}
