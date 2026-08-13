import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CAPTION_MAX, PNG_MAX_BYTES, WALL_YEAR, clipCaption, normEmail } from '@/lib/truthos/wallYear';

function admin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function caller(req: Request) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const authHeader = req.headers.get('Authorization');
    if (!url || !anon || !authHeader?.startsWith('Bearer ')) return null;
    const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await userClient.auth.getUser(authHeader.slice(7));
    if (error || !data.user?.email) return null;
    return data.user;
}

export async function GET() {
    const year = WALL_YEAR();
    const db = admin();
    if (!db) return NextResponse.json({ year, marks: [], nextOpen: `${year + 1}-01-01` });
    const { data, error } = await db
        .from('wall_marks')
        .select('year, face, col, row, png, caption, gold_frame, author_id')
        .eq('year', year)
        .is('hidden_at', null);
    if (error) {
        return NextResponse.json({ year, marks: [], nextOpen: `${year + 1}-01-01`, error: error.message });
    }
    return NextResponse.json({
        year,
        nextOpen: `${year + 1}-01-01`,
        marks: (data ?? []).map((r) => ({
            year: r.year,
            face: r.face,
            col: r.col,
            row: r.row,
            png: r.png,
            caption: r.caption,
            goldFrame: !!r.gold_frame,
            authorId: r.author_id,
        })),
    });
}

export async function POST(req: Request) {
    const user = await caller(req);
    if (!user?.email) return NextResponse.json({ error: 'Sign in to leave a mark.' }, { status: 401 });

    const db = admin();
    if (!db) return NextResponse.json({ error: 'Wall is not wired yet.' }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const face = String(body.face || '');
    const col = Number(body.col);
    const row = Number(body.row);
    const png = String(body.png || '');
    const caption = clipCaption(String(body.caption || user.user_metadata?.display_name || user.email.split('@')[0] || 'Soul'));

    if (!['w', 's', 'n'].includes(face) || !Number.isInteger(col) || !Number.isInteger(row)) {
        return NextResponse.json({ error: 'Pick a cell.' }, { status: 400 });
    }
    if (!png.startsWith('data:image/png') || png.length > PNG_MAX_BYTES * 1.4) {
        return NextResponse.json({ error: 'Paint is too heavy. Use a smaller mark.' }, { status: 400 });
    }
    if (caption.length > CAPTION_MAX) {
        return NextResponse.json({ error: 'Caption is too long.' }, { status: 400 });
    }

    const year = WALL_YEAR();
    const email = normEmail(user.email);

    const { data: profile } = await db.from('profiles').select('id, is_supporter, display_name').eq('id', user.id).maybeSingle();

    const { error } = await db.from('wall_marks').insert({
        year,
        face,
        col,
        row,
        author_id: user.id,
        email_norm: email,
        png,
        caption: clipCaption(caption || profile?.display_name || 'Soul'),
        gold_frame: !!profile?.is_supporter,
    });

    if (error) {
        const msg = error.message || '';
        if (msg.includes('wall_marks_email_norm_year') || msg.includes('email_norm')) {
            return NextResponse.json({ error: 'You already left a mark this year.' }, { status: 409 });
        }
        if (msg.includes('wall_marks_year_face') || msg.includes('year, face')) {
            return NextResponse.json({ error: 'That cell is taken.' }, { status: 409 });
        }
        return NextResponse.json({ error: msg || 'Could not leave the mark.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, year, goldFrame: !!profile?.is_supporter });
}
