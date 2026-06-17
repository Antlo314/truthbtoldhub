'use client';

import { useCallback, useEffect, useState } from 'react';
import { DESKTOP_BREAKPOINT_PX, resolveInputProfile, type InputProfile } from '@/lib/game/platform';
import { loadSettings } from '@/lib/game/settings';

export function useInputProfile(): InputProfile {
    const read = useCallback(() => {
        const s = loadSettings();
        return resolveInputProfile(s.controlScheme);
    }, []);

    const [profile, setProfile] = useState<InputProfile>('touch');

    useEffect(() => {
        setProfile(read());
        const onResize = () => setProfile(read());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [read]);

    return profile;
}

export function useIsDesktopLayout(): boolean {
    const [desktop, setDesktop] = useState(false);
    useEffect(() => {
        const check = () => setDesktop(window.innerWidth >= DESKTOP_BREAKPOINT_PX);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return desktop;
}