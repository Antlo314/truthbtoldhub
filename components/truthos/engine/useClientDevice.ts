'use client';

import { useEffect, useState } from 'react';
import type { ClientDevice, DeviceTarget } from './types';

/**
 * Desktop vs mobile for framing + OS chrome.
 * Prefers coarse pointer / narrow viewport = mobile (phone-on-bed path).
 */
export function useClientDevice(): {
    device: ClientDevice;
    target: DeviceTarget;
    ready: boolean;
} {
    const [device, setDevice] = useState<ClientDevice>('desktop');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const compute = () => {
            const narrow = window.matchMedia('(max-width: 768px)').matches;
            const coarse = window.matchMedia('(pointer: coarse)').matches;
            const touch = navigator.maxTouchPoints > 0;
            const isMobile = narrow || (coarse && touch);
            setDevice(isMobile ? 'mobile' : 'desktop');
            setReady(true);
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, []);

    return {
        device,
        target: device === 'mobile' ? 'phone' : 'monitor',
        ready,
    };
}
