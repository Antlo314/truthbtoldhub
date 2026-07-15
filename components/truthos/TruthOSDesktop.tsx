'use client';

/**
 * Primary home surface: Truth.OS desktop first.
 * 3D Chamber is optional and loaded only on demand.
 */
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import TruthOSShell from './TruthOSShell';
import { supabase } from '@/lib/supabase';
import { useTruthOs } from './truthOsStore';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const HouseExperience = dynamic(
    () => import('@/components/truthos/house/HouseExperience'),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center font-mono text-emerald-500/50 text-xs tracking-[0.35em]">
                opening chamber…
            </div>
        ),
    },
);

export default function TruthOSDesktop() {
    const [chamber, setChamber] = useState(false);
    const clearDesktop = useTruthOs((s) => s.clearDesktop);
    const setSessionEmail = useTruthOs((s) => s.setSessionEmail);

    const onLogout = useCallback(async () => {
        sacredUi.click();
        try {
            await supabase.auth.signOut();
        } catch {
            /* ignore */
        }
        try {
            document.cookie = 'sb-access-token=; Max-Age=0; path=/';
        } catch {
            /* ignore */
        }
        setSessionEmail(null);
        clearDesktop();
        hubAudio.osExitToHouse();
    }, [clearDesktop, setSessionEmail]);

    const enterChamber = useCallback(() => {
        setChamber(true);
        hubAudio.osExitToHouse();
    }, []);

    const exitChamber = useCallback(() => {
        setChamber(false);
        hubAudio.osBootReady();
        sacredUi.access();
    }, []);

    if (chamber) {
        return (
            <div className="fixed inset-0 z-[60]">
                <button
                    type="button"
                    onClick={exitChamber}
                    className="absolute top-3 left-3 z-[80] px-3 py-2 rounded-xl bg-black/70 border border-emerald-400/30 text-[11px] uppercase tracking-widest text-emerald-200 hover:bg-black/90 backdrop-blur-md"
                >
                    ← Truth.OS desktop
                </button>
                <HouseExperience />
            </div>
        );
    }

    return <TruthOSShell onLogout={onLogout} onEnterChamber={enterChamber} />;
}
