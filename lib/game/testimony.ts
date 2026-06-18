import { supabase } from '@/lib/supabase';

// ============================================================
//  TESTIMONIES — the souls' async wall beneath Truth's Word.
//  Short posts, public-read, post-as-yourself, delete-own (or
//  Architect-moderate). NOT live chat. Fails soft if the table
//  doesn't exist yet (returns empty / throws a readable message).
// ============================================================

export interface Testimony {
    id: string;
    author_id: string | null;
    author_name: string;
    body: string;
    created_at: string;
}

export const TESTIMONY_MAX = 400;

export async function fetchTestimonies(limit = 40): Promise<Testimony[]> {
    const { data, error } = await supabase
        .from('testimonies')
        .select('id, author_id, author_name, body, created_at')
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) return [];
    return (data || []) as Testimony[];
}

export async function postTestimony(body: string, authorName: string): Promise<Testimony> {
    const text = body.trim().slice(0, TESTIMONY_MAX);
    if (!text) throw new Error('Say something first.');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in to leave a testimony.');
    const row = {
        author_id: session.user.id,
        author_name: (authorName || 'A soul').slice(0, 40),
        body: text,
    };
    const { data, error } = await supabase.from('testimonies').insert(row).select().single();
    if (error) throw new Error(error.message);
    return data as Testimony;
}

export async function deleteTestimony(id: string): Promise<void> {
    const { error } = await supabase.from('testimonies').delete().eq('id', id);
    if (error) throw new Error(error.message);
}
