import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fellowFromGameRow, worldPresenceDayKey } from '@/lib/game/worldPresence';
import type { GameCharacter } from '@/lib/store/useGameStore';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const revalidate = 60;

function startOfUtcDay(): string {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

export async function GET(req: Request) {
    try {
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ walkedToday: 0, fellows: [] });
        }

        const exclude = new URL(req.url).searchParams.get('exclude') || '';
        const today = worldPresenceDayKey();
        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { count, error: countErr } = await admin
            .from('game_state')
            .select('user_id', { count: 'exact', head: true })
            .eq('initiated', true)
            .gte('updated_at', startOfUtcDay());

        if (countErr) {
            console.error('presence count:', countErr.message);
            return NextResponse.json({ walkedToday: 0, fellows: [] });
        }

        const { data: rows, error } = await admin
            .from('game_state')
            .select('user_id, character')
            .eq('initiated', true)
            .gte('updated_at', startOfUtcDay())
            .order('updated_at', { ascending: false })
            .limit(40);

        if (error) {
            console.error('presence fetch:', error.message);
            return NextResponse.json({ walkedToday: count ?? 0, fellows: [] });
        }

        const fellows: ReturnType<typeof fellowFromGameRow>[] = [];

        const needProfiles = (rows || [])
            .filter((r) => r.user_id !== exclude);

        const profileIds = needProfiles.map((r) => r.user_id);
        const profileMap = new Map<string, string>();

        if (profileIds.length > 0) {
            const { data: profiles } = await admin
                .from('profiles')
                .select('id, display_name, username')
                .in('id', profileIds);
            for (const p of profiles || []) {
                profileMap.set(p.id, p.display_name || p.username || '');
            }
        }

        for (const row of needProfiles) {
            if (row.user_id === exclude) continue;
            const fellow = fellowFromGameRow(
                row.user_id,
                (row.character || {}) as Partial<GameCharacter>,
                profileMap.get(row.user_id),
            );
            if (fellow && fellows.length < 10) fellows.push(fellow);
        }

        return NextResponse.json({ walkedToday: count ?? 0, fellows: fellows.filter(Boolean) });
    } catch (e) {
        console.error('presence GET:', e);
        return NextResponse.json({ walkedToday: 0, fellows: [] });
    }
}

export async function POST(req: Request) {
    try {
        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.slice(7);
        const userClient = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: { user }, error: authError } = await userClient.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const x = Number(body?.x);
        const y = Number(body?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const today = worldPresenceDayKey();
        const now = new Date().toISOString();

        const { data: existing } = await admin
            .from('game_state')
            .select('character, initiated')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!existing) {
            return NextResponse.json({ ok: false }, { status: 404 });
        }

        const character = {
            ...((existing.character || {}) as Partial<GameCharacter>),
            lastWalk: {
                day: today,
                x: Math.round(x),
                y: Math.round(y),
                at: now,
            },
        };

        const { error: updateErr } = await admin
            .from('game_state')
            .update({ character, updated_at: now })
            .eq('user_id', user.id);

        if (updateErr) {
            console.error('presence ping:', updateErr.message);
            return NextResponse.json({ error: 'Save failed' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error('presence POST:', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}