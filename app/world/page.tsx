'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHouseUi } from '@/components/truthos/house/houseUiStore';

/**
 * Legacy /world URL — routes into Truth.OS House chamber (same build).
 * No separate Unity / old hut shell.
 */
export default function WorldPage() {
    const router = useRouter();

    useEffect(() => {
        try {
            sessionStorage.setItem('tbth-open-panel', 'chamber');
        } catch {
            /* */
        }
        useHouseUi.getState().openPanel('chamber');
        router.replace('/');
    }, [router]);

    return (
        <div className="min-h-[100dvh] bg-[#05060c] flex flex-col items-center justify-center text-center px-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-aether-gold/70 mb-3">Truth.OS House</p>
            <p className="font-ritual text-2xl text-white/85">Entering the chamber…</p>
        </div>
    );
}
