'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SacredButton from '@/components/sanctum/SacredButton';
import { sacredUi } from '@/lib/game/sacredUiSfx';

const DISMISS = 'tbth-install-dismiss-v2';

function isIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return iOS;
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    // @ts-expect-error iOS Safari
    return window.matchMedia('(display-mode: standalone)').matches || !!navigator.standalone;
}

/** Soft "Add to Home Screen" — Chromium install prompt + iOS Share sheet tip. */
export default function InstallPrompt() {
    const [deferred, setDeferred] = useState<any>(null);
    const [show, setShow] = useState(false);
    const [mode, setMode] = useState<'prompt' | 'ios' | null>(null);

    useEffect(() => {
        try {
            if (localStorage.getItem(DISMISS)) return;
            if (isStandalone()) return;
        } catch { /* */ }

        const onBip = (e: Event) => {
            e.preventDefault();
            setDeferred(e);
            setMode('prompt');
            setTimeout(() => setShow(true), 4000);
        };
        window.addEventListener('beforeinstallprompt', onBip);

        // iOS never fires beforeinstallprompt — soft tip after a longer settle
        let iosTimer: ReturnType<typeof setTimeout> | undefined;
        if (isIos() && !isStandalone()) {
            iosTimer = setTimeout(() => {
                try {
                    if (localStorage.getItem(DISMISS)) return;
                } catch { /* */ }
                setMode((m) => m ?? 'ios');
                setShow(true);
            }, 9000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', onBip);
            if (iosTimer) clearTimeout(iosTimer);
        };
    }, []);

    const dismiss = () => {
        setShow(false);
        try { localStorage.setItem(DISMISS, '1'); } catch { /* */ }
    };

    const install = async () => {
        if (!deferred) return;
        sacredUi.click();
        deferred.prompt();
        try {
            await deferred.userChoice;
        } catch { /* */ }
        setDeferred(null);
        dismiss();
    };

    const visible = show && (mode === 'prompt' ? !!deferred : mode === 'ios');

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    className="fixed z-[70] left-4 right-4 sm:left-auto sm:right-6 sm:w-[360px] bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
                >
                    <div className="rounded-2xl border border-aether-gold/30 bg-black/90 backdrop-blur-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                        <p className="text-[9px] uppercase tracking-[0.35em] text-aether-gold/70 mb-1">Install</p>
                        <p className="font-ritual text-base text-white mb-1">Keep the Sanctum close</p>
                        {mode === 'ios' ? (
                            <p className="text-[12px] text-white/45 mb-3 leading-relaxed">
                                On iPhone: tap <span className="text-white/70">Share</span>, then{' '}
                                <span className="text-white/70">Add to Home Screen</span> for a full-screen shell.
                            </p>
                        ) : (
                            <p className="text-[12px] text-white/45 mb-3 leading-relaxed">
                                Add Sacred Sanctum to your home screen for a full-screen awakening shell.
                            </p>
                        )}
                        <div className="flex gap-2">
                            {mode === 'prompt' && deferred ? (
                                <SacredButton size="sm" pulse onClick={install}>
                                    Install
                                </SacredButton>
                            ) : (
                                <SacredButton size="sm" pulse onClick={() => { sacredUi.click(); dismiss(); }}>
                                    Got it
                                </SacredButton>
                            )}
                            <SacredButton size="sm" variant="veil" onClick={dismiss}>
                                Not now
                            </SacredButton>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
