import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const revalidate = 120;

export async function GET() {
    try {
        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ totalSouls: 0, leaders: [] });
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        const { count, error: countErr } = await admin
            .from('profiles')
            .select('id', { count: 'exact', head: true });

        if (countErr) {
            console.error('ledger count:', countErr.message);
            return NextResponse.json({ totalSouls: 0, leaders: [] });
        }

        const { data: leaders, error: leadErr } = await admin
            .from('profiles')
            .select('id, display_name, username, soul_power, founder_number, tier')
            .order('soul_power', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(15);

        if (leadErr) {
            console.error('ledger leaders:', leadErr.message);
            return NextResponse.json({ totalSouls: count ?? 0, leaders: [] });
        }

        return NextResponse.json({
            totalSouls: count ?? 0,
            leaders: (leaders || []).map((p, i) => ({
                rank: i + 1,
                id: p.id,
                name: p.display_name || p.username || `Soul ${p.founder_number ?? '—'}`,
                soulPower: p.soul_power ?? 0,
                founderNumber: p.founder_number ?? null,
                tier: p.tier ?? null,
            })),
        });
    } catch (e) {
        console.error('ledger route:', e);
        return NextResponse.json({ totalSouls: 0, leaders: [] });
    }
}