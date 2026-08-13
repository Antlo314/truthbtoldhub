'use client';

/**
 * Primary home surface: Truth.OS desktop first.
 * Leave terminal pans out into the optional 3D Chamber.
 */
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import TruthOSShell from './TruthOSShell';
import { supabase } from '@/lib/supabase';
import { useTruthOs } from './truthOsStore';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { sacredUi } from '@/lib/game/sacredUiSfx';

import HouseLoadBar from './house/HouseLoadBar';

const HouseExperience = dynamic(
    () => import('@/components/truthos/house/HouseExperience'),
    {
        ssr: false,
        loading: () => <HouseLoadBar label="Entering the house" />,
    },
);

export default function TruthOSDesktop() {
    const [chamber, setChamber] = useState(false);
    const [panning, setPanning] = useState(false);
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
        // Cinematic pan-out: scale OS down, then reveal 3D house
        setPanning(true);
        hubAudio.osExitToHouse();
        window.setTimeout(() => {
            setChamber(true);
            setPanning(false);
        }, 720);
    }, []);

    const exitChamber = useCallback(() => {
        setChamber(false);
        hubAudio.osBootReady();
        sacredUi.access();
    }, []);

    return (
        <div className="fixed inset-0 bg-black overflow-hidden">
            <AnimatePresence mode="wait">
                {!chamber ? (
                    <motion.div
                        key="os"
                        className="absolute inset-0 origin-center"
                        initial={{ opacity: 1, scale: 1 }}
                        animate={
                            panning
                                ? { opacity: 0, scale: 0.72, filter: 'blur(6px)' }
                                : { opacity: 1, scale: 1, filter: 'blur(0px)' }
                        }
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <TruthOSShell onLogout={onLogout} onEnterChamber={enterChamber} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="chamber"
                        className="absolute inset-0"
                        initial={{ opacity: 0, scale: 1.12 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <button
                            type="button"
                            onClick={exitChamber}
                            className="absolute z-[80] px-3 py-2 rounded-xl bg-black/80 border border-emerald-400/35 text-[11px] uppercase tracking-widest text-emerald-200 hover:bg-black/90 backdrop-blur-md min-h-[40px]"
                            style={{
                                top: 'calc(0.6rem + env(safe-area-inset-top, 0px))',
                                left: '0.75rem',
                            }}
                        >
                            ← Terminal
                        </button>
                        {/* The desk hotspot and this button are the same door. */}
                        <HouseExperience disableOsBoot onReturnToTerminal={exitChamber} />
                    </motion.div>
                )}
            </AnimatePresence>
            {panning && <HouseLoadBar label="Leaving terminal" />}
        </div>
    );
}
