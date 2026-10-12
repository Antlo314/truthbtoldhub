'use client';

/**
 * The inbox, everywhere — how many whispers wait for you, kept live from
 * any surface (Truth.OS, the Hall, the world), so the dock badge, the tab
 * title and a notification can tell you someone wrote without you having
 * to open the Hall to find out.
 *
 * Realtime postgres_changes respect RLS, so an unfiltered subscription to
 * dm_messages only ever carries the conversations you are part of.
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type Whisper = { conversationId: string; fromId: string; from: string; text: string };

type InboxState = {
    dmUnread: number;
    setUnread: (n: number) => void;
};

export const useInbox = create<InboxState>((set) => ({
    dmUnread: 0,
    setUnread: (n) => set({ dmUnread: Math.max(0, n) }),
}));

let refs = 0;
let stop: (() => void) | null = null;
const listeners = new Set<(w: Whisper) => void>();

async function recount(uid: string) {
    const { count } = await supabase
        .from('dm_messages')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .neq('sender_id', uid);
    if (typeof count === 'number') useInbox.getState().setUnread(count);
}

async function boot(): Promise<() => void> {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return () => {};
    await recount(uid).catch(() => {});
    const names = new Map<string, string>();
    let pending: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
        if (pending) clearTimeout(pending);
        pending = setTimeout(() => void recount(uid).catch(() => {}), 600);
    };
    const ch = supabase
        .channel(`inbox_${uid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, async (payload) => {
            const m = payload.new as { conversation_id: string; sender_id: string; content: string };
            if (!m || m.sender_id === uid) return;
            useInbox.getState().setUnread(useInbox.getState().dmUnread + 1);
            let from: string = names.get(m.sender_id) ?? '';
            if (!from) {
                const { data: p } = await supabase.from('profiles').select('display_name, username').eq('id', m.sender_id).maybeSingle();
                from = String(p?.display_name || p?.username || 'A soul');
                names.set(m.sender_id, from);
            }
            const w: Whisper = { conversationId: m.conversation_id, fromId: m.sender_id, from, text: String(m.content || '').slice(0, 140) };
            listeners.forEach((fn) => fn(w));
            browserNotify(w);
        })
        // something was read (here or on another device) — count again
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_messages' }, soon)
        .subscribe();
    const onVis = () => {
        if (!document.hidden) soon();
    };
    document.addEventListener('visibilitychange', onVis);
    const poll = setInterval(soon, 90_000);
    return () => {
        document.removeEventListener('visibilitychange', onVis);
        clearInterval(poll);
        if (pending) clearTimeout(pending);
        void supabase.removeChannel(ch);
    };
}

/**
 * Keep the inbox live while the caller is mounted. Reference-counted:
 * the OS and the Hall can both hold it without opening two channels.
 */
export function holdInbox(onWhisper?: (w: Whisper) => void): () => void {
    if (onWhisper) listeners.add(onWhisper);
    refs++;
    let cancelled = false;
    if (refs === 1) {
        void boot().then((fn) => {
            if (cancelled && refs === 0) fn();
            else stop = fn;
        });
    }
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
        if (e === 'SIGNED_OUT') useInbox.getState().setUnread(0);
    });
    return () => {
        cancelled = true;
        if (onWhisper) listeners.delete(onWhisper);
        sub.subscription.unsubscribe();
        refs = Math.max(0, refs - 1);
        if (refs === 0) {
            stop?.();
            stop = null;
        }
    };
}

/* ── the tab title and the system notification ─────────────── */

const PREFIX = /^\(\d+\+?\)\s/;

/** "(3) Truth B Told" while whispers wait */
export function syncTitle(n: number) {
    if (typeof document === 'undefined') return;
    const base = document.title.replace(PREFIX, '');
    document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${base}` : base;
}

export function notificationsState(): 'unsupported' | NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

export async function askNotifications(): Promise<NotificationPermission | 'unsupported'> {
    if (notificationsState() === 'unsupported') return 'unsupported';
    try {
        return await Notification.requestPermission();
    } catch {
        return Notification.permission;
    }
}

function browserNotify(w: Whisper) {
    if (typeof document === 'undefined' || !document.hidden) return;
    if (notificationsState() !== 'granted') return;
    try {
        const n = new Notification(`Whisper from ${w.from}`, { body: w.text, tag: `dm-${w.conversationId}`, icon: '/favicon.ico' });
        n.onclick = () => {
            window.focus();
            n.close();
        };
    } catch {
        /* some mobile browsers only notify from a service worker */
    }
}
