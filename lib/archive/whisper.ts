'use client';

/**
 * Send a whisper from anywhere — the world, a profile, a popout — without
 * opening the Hall. Same path the Hall uses: start_dm() finds or makes the
 * one conversation between two souls, then the message goes in under RLS.
 */
import { supabase } from '@/lib/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Presence keys are user ids for signed-in souls and guest-… for guests */
export function isSoulId(id: string | null | undefined): id is string {
    return !!id && UUID.test(id);
}

export async function sendWhisper(toId: string, text: string): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
    const content = text.trim().slice(0, 2000);
    if (!content) return { ok: false, error: 'Nothing to send.' };
    if (!isSoulId(toId)) return { ok: false, error: 'That soul is a guest — guests cannot receive whispers.' };
    const { data: session } = await supabase.auth.getSession();
    const me = session.session?.user.id;
    if (!me) return { ok: false, error: 'Sign in to whisper.' };
    if (me === toId) return { ok: false, error: 'You cannot whisper to yourself.' };
    const { data: convId, error } = await supabase.rpc('start_dm', { _other: toId });
    if (error || !convId) return { ok: false, error: 'Could not open a whisper with that soul.' };
    const { error: e2 } = await supabase.from('dm_messages').insert({ conversation_id: convId, sender_id: me, content });
    if (e2) return { ok: false, error: 'That whisper did not send. Try again.' };
    return { ok: true, conversationId: String(convId) };
}
