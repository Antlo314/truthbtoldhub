'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Optional 3D Chamber (legacy /world).
 * Primary product is Truth.OS at `/`.
 */
const HouseExperience = dynamic(
    () => import('@/components/truthos/house/HouseExperience'),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-[100dvh] bg-black flex items-center justify-center font-mono text-emerald-500/50 text-xs tracking-[0.35em]">
                entering chamber…
            </div>
        ),
    },
);

export default function WorldPage() {
    const router = useRouter();
    return (
        <div className="relative min-h-[100dvh]">
            <Link
                href="/"
                className="absolute top-3 left-3 z-[80] px-3 py-2 rounded-xl bg-black/70 border border-emerald-400/30 text-[11px] uppercase tracking-widest text-emerald-200 hover:bg-black/90 backdrop-blur-md"
            >
                Open Truth.OS
            </Link>
            {/* Sitting back at the desk goes where the link goes. */}
            <HouseExperience disableOsBoot onReturnToTerminal={() => router.push('/')} />
        </div>
    );
}
