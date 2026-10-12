'use client';

/**
 * Primary home surface: Truth.OS first. The world is one door away — the
 * gold tile in the dock, the "Enter the World" widget, Spotlight or the ✦
 * menu — and opens on the Aether Plain, with the Lair one gate further.
 * The world's top-left button brings you back to the desk.
 */
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import TruthOSShell from './TruthOSShell';
import { supabase } from '@/lib/supabase';
import { useTruthOs } from './truthOsStore';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { sacredUi } from '@/lib/game/sacredUiSfx';

import HouseLoadBar from './house/HouseLoadBar';

const WorldDoors = dynamic(() => import('@/components/world/WorldDoors'), {
    ssr: false,
    loading: () => <HouseLoadBar label="Walking out onto the plain" />,
});

export default function TruthOSDesktop() {
    /** Truth.OS opens first; the world is a choice, never the landing. */
    const [chamber, setChamber] = useState(false);
    /**
     * Loaded inside a frame (the OS Browser navigated to "/"): never boot a
     * second OS and a second 3D world inside the first.
     */
    const [framed, setFramed] = useState(false);
    useEffect(() => {
        try {
            setFramed(window.self !== window.top);
        } catch {
            setFramed(true);
        }
    }, []);
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

    if (framed) {
        return (
            <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 bg-[#0b0d13] px-6 text-center">
                <span className="bg-gradient-to-br from-amber-100 to-amber-500 bg-clip-text text-4xl font-black text-transparent">✦</span>
                <p className="text-[15px] font-semibold text-white">Truth.OS is already open</p>
                <p className="max-w-xs text-[13px] text-white/50">You are looking at it. Use the dock or the App Library to open anything else.</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black overflow-clip">
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
                        {/* Each world surface carries its own "Open Truth.OS" in its HUD */}
                        <WorldDoors onReturnToTerminal={exitChamber} />
                    </motion.div>
                )}
            </AnimatePresence>
            {panning && <HouseLoadBar label="Leaving terminal" />}
        </div>
    );
}
