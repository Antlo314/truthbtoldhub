import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WALL_YEAR, normEmail } from '@/lib/truthos/wallYear';

export async function GET(req: Request) {
    const year = WALL_YEAR();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const authHeader = req.headers.get('Authorization');
    if (!url || !anon || !authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ year, marked: false, nextOpen: `${year + 1}-01-01` });
    }
    const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await userClient.auth.getUser(authHeader.slice(7));
    if (error || !data.user?.email) {
        return NextResponse.json({ year, marked: false, nextOpen: `${year + 1}-01-01` });
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || anon;
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: row } = await db
        .from('wall_marks')
        .select('face, col, row, caption, gold_frame')
        .eq('year', year)
        .eq('email_norm', normEmail(data.user.email))
        .maybeSingle();

    return NextResponse.json({
        year,
        marked: !!row,
        nextOpen: `${year + 1}-01-01`,
        mine: row
            ? { face: row.face, col: row.col, row: row.row, caption: row.caption, goldFrame: !!row.gold_frame }
            : null,
    });
}
