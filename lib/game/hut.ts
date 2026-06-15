import { supabase } from '@/lib/supabase';

// ============================================================
//  TRUTH'S HUT — data access for bulletins + dispatch media.
//  Shared by the player-facing Hut overlay and the Architect
//  console. All calls fail soft (return empty / throw with a
//  readable message) so the UI can handle missing tables.
// ============================================================

export type MediaKind = 'pdf' | 'video' | 'audio' | 'image' | 'link';

export interface Bulletin {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    published_at: string;
    created_at: string;
}

export interface DispatchMedia {
    id: string;
    title: string;
    description: string;
    kind: MediaKind;
    url: string;
    file_path: string | null;
    size_bytes: number;
    category: string;
    published_at: string;
    created_at: string;
}

export const DISPATCH_BUCKET = 'dispatches';

export function detectKind(file: File): MediaKind {
    const t = file.type;
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('audio/')) return 'audio';
    if (t === 'application/pdf') return 'pdf';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext && ['mp4', 'webm', 'mov'].includes(ext)) return 'video';
    if (ext && ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
    return 'link';
}

export function formatBytes(n: number): string {
    if (!n) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------- bulletins ----------
export async function fetchBulletins(limit = 50): Promise<Bulletin[]> {
    const { data, error } = await supabase
        .from('bulletins')
        .select('*')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) return [];
    return (data || []) as Bulletin[];
}

export async function createBulletin(input: { title: string; body: string; pinned: boolean; published_at: string }): Promise<Bulletin> {
    const { data, error } = await supabase.from('bulletins').insert(input).select().single();
    if (error) throw new Error(error.message);
    return data as Bulletin;
}

export async function updateBulletin(id: string, patch: Partial<Bulletin>): Promise<void> {
    const { error } = await supabase.from('bulletins').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function deleteBulletin(id: string): Promise<void> {
    const { error } = await supabase.from('bulletins').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// ---------- media ----------
export async function fetchMedia(limit = 100): Promise<DispatchMedia[]> {
    const { data, error } = await supabase
        .from('dispatch_media')
        .select('*')
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) return [];
    return (data || []) as DispatchMedia[];
}

export async function uploadMedia(
    file: File,
    meta: { title: string; description: string; category: string }
): Promise<DispatchMedia> {
    const kind = detectKind(file);
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabase.storage
        .from(DISPATCH_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message} (is the "dispatches" bucket created & public?)`);

    const { data: pub } = supabase.storage.from(DISPATCH_BUCKET).getPublicUrl(path);

    const row = {
        title: meta.title || file.name,
        description: meta.description,
        kind,
        url: pub.publicUrl,
        file_path: path,
        size_bytes: file.size,
        category: meta.category || 'General',
    };
    const { data, error } = await supabase.from('dispatch_media').insert(row).select().single();
    if (error) throw new Error(error.message);
    return data as DispatchMedia;
}

export async function deleteMedia(item: DispatchMedia): Promise<void> {
    if (item.file_path) {
        await supabase.storage.from(DISPATCH_BUCKET).remove([item.file_path]);
    }
    const { error } = await supabase.from('dispatch_media').delete().eq('id', item.id);
    if (error) throw new Error(error.message);
}

// ---------- admin check ----------
export async function getArchitectStatus(): Promise<{ signedIn: boolean; isArchitect: boolean; email: string | null }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { signedIn: false, isArchitect: false, email: null };
    const email = session.user.email ?? null;
    const adminEmails = ['iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com'];
    let isArchitect = !!email && adminEmails.includes(email);
    if (!isArchitect) {
        const { data: profile } = await supabase.from('profiles').select('tier').eq('id', session.user.id).maybeSingle();
        isArchitect = profile?.tier === 'Architect';
    }
    return { signedIn: true, isArchitect, email };
}
