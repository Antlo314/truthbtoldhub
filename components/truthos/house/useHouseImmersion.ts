'use client';

/**
 * Keep focus inside the house experience — no Windows/browser chrome fighting us.
 * Pointer lock (PC), fullscreen, blocked context menu / select / drag.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useHouseImmersion({
    enabled,
    mobile,
    uiLocked,
}: {
    enabled: boolean;
    mobile: boolean;
    uiLocked: boolean;
}) {
    const shellRef = useRef<HTMLDivElement>(null);
    const [pointerLocked, setPointerLocked] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    // Global capture: block OS/browser menus that steal the session
    useEffect(() => {
        if (!enabled) return;
        const shell = shellRef.current;

        const onContext = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
        };
        const onSelect = (e: Event) => {
            // Allow selection inside OS panels / inputs
            const t = e.target as HTMLElement;
            if (t?.closest?.('input, textarea, [contenteditable="true"], [data-allow-select]')) return;
            e.preventDefault();
        };
        const onDrag = (e: DragEvent) => {
            e.preventDefault();
        };
        const onKey = (e: KeyboardEvent) => {
            // Block common browser chrome shortcuts while immersed (not when typing)
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
            if (uiLocked) return;

            // F11 / F — fullscreen
            if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                void toggleFullscreen();
            }
            // Escape handled by pointer lock release + panels
            if (e.code === 'Tab' && !uiLocked && !mobile) {
                // keep tab inside shell when possible
                // (do not fully block accessibility when locked UI)
            }
        };

        document.addEventListener('contextmenu', onContext, true);
        document.addEventListener('selectstart', onSelect, true);
        document.addEventListener('dragstart', onDrag, true);
        window.addEventListener('keydown', onKey, true);
        shell?.addEventListener('contextmenu', onContext);

        return () => {
            document.removeEventListener('contextmenu', onContext, true);
            document.removeEventListener('selectstart', onSelect, true);
            document.removeEventListener('dragstart', onDrag, true);
            window.removeEventListener('keydown', onKey, true);
            shell?.removeEventListener('contextmenu', onContext);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, uiLocked, mobile]);

    // Pointer lock state sync
    useEffect(() => {
        const onChange = () => {
            setPointerLocked(document.pointerLockElement != null);
        };
        const onFs = () => {
            setFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('pointerlockchange', onChange);
        document.addEventListener('fullscreenchange', onFs);
        return () => {
            document.removeEventListener('pointerlockchange', onChange);
            document.removeEventListener('fullscreenchange', onFs);
        };
    }, []);

    // Exit pointer lock when UI opens
    useEffect(() => {
        if (uiLocked && document.pointerLockElement) {
            try {
                document.exitPointerLock();
            } catch {
                /* */
            }
        }
    }, [uiLocked]);

    const requestPointerLock = useCallback(() => {
        if (mobile || uiLocked) return;
        const el = shellRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
        if (!el) return;
        try {
            void el.requestPointerLock();
        } catch {
            /* user gesture required */
        }
    }, [mobile, uiLocked]);

    const toggleFullscreen = useCallback(async () => {
        const el = shellRef.current;
        if (!el) return;
        try {
            if (!document.fullscreenElement) {
                await el.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch {
            /* */
        }
    }, []);

    const exitImmersion = useCallback(() => {
        try {
            if (document.pointerLockElement) document.exitPointerLock();
        } catch {
            /* */
        }
    }, []);

    return {
        shellRef,
        pointerLocked,
        fullscreen,
        requestPointerLock,
        toggleFullscreen,
        exitImmersion,
    };
}
