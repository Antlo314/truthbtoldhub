'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import HouseLoadBar from '@/components/truthos/house/HouseLoadBar';

/**
 * The world on its own URL — the Aether Plain, with the Lair one gate in.
 * Truth.OS at `/` is the home surface; every way back leads there.
 */
const WorldDoors = dynamic(() => import('@/components/world/WorldDoors'), {
    ssr: false,
    loading: () => <HouseLoadBar label="Walking out onto the plain" />,
});

export default function WorldPage() {
    const router = useRouter();
    return (
        <div className="relative min-h-[100dvh] bg-black">
            <WorldDoors onReturnToTerminal={() => router.push('/')} />
        </div>
    );
}
