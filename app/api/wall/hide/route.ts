import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/adminEmails';
import { WALL_YEAR } from '@/lib/truthos/wallYear';

export async function POST(req: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const authHeader = req.headers.get('Authorization');
    if (!url || !anon || !authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await userClient.auth.getUser(authHeader.slice(7));
    if (error || !isAdminEmail(data.user?.email)) {
        return NextResponse.json({ error: 'Architects only.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const face = String(body.face || '');
    const col = Number(body.col);
    const row = Number(body.row);
    const year = Number(body.year) || WALL_YEAR();
    if (!['w', 's', 'n'].includes(face)) {
        return NextResponse.json({ error: 'Cell required.' }, { status: 400 });
    }

    const db = createClient(url, service || anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: upErr } = await db
        .from('wall_marks')
        .update({ hidden_at: new Date().toISOString() })
        .eq('year', year)
        .eq('face', face)
        .eq('col', col)
        .eq('row', row);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
