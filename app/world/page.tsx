'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy /world (old Hut) — always returns to Truth.OS House.
 * No chamber embed. Truth is only on the computer (Truth.OS).
 */
export default function WorldPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, [router]);

    return (
        <div className="min-h-[100dvh] bg-[#05060c] flex flex-col items-center justify-center text-center px-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-aether-gold/70 mb-3">Truth.OS House</p>
            <p className="font-ritual text-2xl text-white/85">Returning home…</p>
        </div>
    );
}
