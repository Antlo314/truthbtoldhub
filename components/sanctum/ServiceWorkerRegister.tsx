'use client';

import { useEffect } from 'react';

/** Registers the lightweight offline shell SW once on the client. */
export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
        // Avoid SW on localhost if it frustrates dev — still register for production feel
        const run = () => {
            navigator.serviceWorker.register('/sw.js').catch(() => undefined);
        };
        if (document.readyState === 'complete') run();
        else window.addEventListener('load', run);
        return () => window.removeEventListener('load', run);
    }, []);
    return null;
}
