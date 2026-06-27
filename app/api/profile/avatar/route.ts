import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
//  AVATAR UPLOAD — service-role endpoint.
//  The browser uploading straight to the `avatars` storage bucket fails unless
//  that bucket + its RLS policies were set up by hand in Supabase (they often
//  weren't → "not allowed"). Routing the upload through the server with the
//  service-role key sidesteps storage RLS entirely AND auto-creates the public
//  bucket on first use, so changing your portrait just works — no manual SQL.
//
//  Note: capped at 4 MB to stay under the serverless request-body limit; the
//  file now passes through this function rather than going straight to storage.
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const MAX = 4 * 1024 * 1024; // 4 MB

export async function POST(req: Request) {
    try {
        // 1. Authenticate the caller from their bearer token.
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Sign in to change your portrait.' }, { status: 401 });
        }
        const token = authHeader.slice(7);

        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Uploads are not configured on the server (missing service-role key).' }, { status: 500 });
        }

        const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
        if (authErr || !user) {
            return NextResponse.json({ error: 'Your session has expired — sign in again.' }, { status: 401 });
        }

        // 2. Read + validate the image.
        const form = await req.formData();
        const file = form.get('file');
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No image received.' }, { status: 400 });
        }
        const type = file.type || 'image/png';
        if (!type.startsWith('image/')) {
            return NextResponse.json({ error: 'Please choose an image file.' }, { status: 400 });
        }
        if (file.size > MAX) {
            return NextResponse.json({ error: 'Image too large — keep it under 4 MB.' }, { status: 400 });
        }

        // 3. Upload with the service role (bypasses storage RLS).
        const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'png';
        const path = `${user.id}-${Date.now()}.${ext}`;
        const buf = Buffer.from(await file.arrayBuffer());

        const doUpload = () => admin.storage.from('avatars').upload(path, buf, { contentType: type, upsert: true });
        let { error: upErr } = await doUpload();
        if (upErr && /not found|does not exist|bucket/i.test(upErr.message || '')) {
            // First-ever upload — create the public bucket, then retry once.
            await admin.storage.createBucket('avatars', { public: true, fileSizeLimit: MAX }).catch(() => { /* already exists */ });
            ({ error: upErr } = await doUpload());
        }
        if (upErr) {
            return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
        }

        // Ensure the bucket serves public URLs (covers a pre-existing private bucket).
        await admin.storage.updateBucket('avatars', { public: true }).catch(() => { /* ignore */ });

        const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path);
        return NextResponse.json({ url: publicUrl });
    } catch (e: any) {
        console.error('avatar upload error:', e);
        return NextResponse.json({ error: 'Upload failed — please try again.' }, { status: 500 });
    }
}
