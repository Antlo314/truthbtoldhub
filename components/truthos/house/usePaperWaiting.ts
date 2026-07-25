'use client';

/**
 * "Is today's paper still unread?"
 *
 * Keyed to the local calendar date, so a new edition genuinely arrives each
 * morning and the mailbox flag goes back up — the one ambient cue that the
 * world moved on while the player was away.
 *
 * Reading is recorded in localStorage rather than game state: the paper is
 * flavour, not progress, and it shouldn't cost a cloud write or block anyone
 * who isn't signed in.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY = 'truthos_paper_read';

/** Local calendar day, not UTC — the paper should arrive with the player's morning */
export function editionId(d = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
    ).padStart(2, '0')}`;
}

function readStored(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}

/** True while today's edition hasn't been opened */
export function usePaperWaiting(): boolean {
    // Start false so server and first client render agree, then correct on mount
    const [waiting, setWaiting] = useState(false);

    useEffect(() => {
        const sync = () => setWaiting(readStored() !== editionId());
        sync();
        // Catch the rollover if the tab is left open past midnight
        const t = setInterval(sync, 60_000);
        window.addEventListener('storage', sync);
        window.addEventListener('focus', sync);
        return () => {
            clearInterval(t);
            window.removeEventListener('storage', sync);
            window.removeEventListener('focus', sync);
        };
    }, []);

    return waiting;
}

/** Mark today's edition as read; fires a storage event for other listeners */
export function useMarkPaperRead(): () => void {
    return useCallback(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(KEY, editionId());
            // Same-tab listeners don't get the native storage event
            window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
        } catch {
            /* private mode — the flag just stays up */
        }
    }, []);
}
