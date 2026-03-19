import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key to bypass RLS for SP granting
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5Nzk2OSwiZXhwIjoyMDg2NzczOTY5fQ.N590TQQP2c_N8bO5Fk2G8r-F-kFzB7PzG7H1hGzI7K8';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function POST(req: Request) {
    try {
        const { cipher, newUserId } = await req.json();

        if (!cipher || cipher.length < 8) {
            return NextResponse.json({ error: 'Invalid cipher provided' }, { status: 400 });
        }

        // Find the profile that matches this cipher (first 8 chars of their ID)
        // We use like query on id. Since id is UUID, we can cast it in postgres, but via JS we pull all and filter, or just use `ilike` on id casting if supported. 
        // Actually, ilike on UUID might fail. Let's just fetch all profiles and find the one that starts with the cipher. 
        // For production this is inefficient, but for MVP it's perfectly safe.
        const { data: profiles, error: fetchError } = await supabaseAdmin.from('profiles').select('id, soul_power');

        if (fetchError || !profiles) {
            console.error('Db fetch error:', fetchError);
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        const referrer = profiles.find(p => p.id.startsWith(cipher));

        if (!referrer) {
            return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
        }

        // To prevent a user from referring themselves:
        if (referrer.id === newUserId) {
            return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
        }

        // Grant the referrer 100 SP
        const newSpValue = (referrer.soul_power || 0) + 100;

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ soul_power: newSpValue })
            .eq('id', referrer.id);

        if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json({ error: 'Failed to distribute SP' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: '100 SP distributed to Architect' });

    } catch (err: any) {
        console.error('Affiliation API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
