import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================
//  TREASURY PLEDGE — server-authoritative Soul Power spend.
//  Pledging used to deduct soul_power straight from the browser
//  (useSoulStore.updateSP), which meant the client was trusted to set its
//  own balance — a user could just as easily INCREASE it. soul_power is now
//  locked at the database level (secure_profiles_privileges.sql), so the
//  deduction MUST happen here with the service role after we re-derive the
//  balance from the database and verify the soul can afford the pledge.
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: Request) {
    try {
        // 1. Authenticate the caller from their bearer token.
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing or invalid credentials' }, { status: 401 });
        }
        const token = authHeader.substring(7);

        const userClient = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data: { user }, error: authError } = await userClient.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
        }

        // Fail closed if the server isn't configured with a real service-role key.
        if (!serviceRoleKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is not set — pledges disabled');
            return NextResponse.json({ error: 'Server is not configured for pledges' }, { status: 500 });
        }

        // 2. Validate the payload.
        const body = await req.json();
        const petitionId = body?.petitionId;
        const amount = Math.floor(Number(body?.amount));
        if (!petitionId || !Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: 'Invalid pledge parameters' }, { status: 400 });
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        // 3. Re-derive the soul's balance from the DB (never trust the client).
        const { data: prof, error: profErr } = await admin
            .from('profiles')
            .select('soul_power, is_banned')
            .eq('id', user.id)
            .single();
        if (profErr || !prof) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }
        if (prof.is_banned) {
            return NextResponse.json({ error: 'Account is isolated' }, { status: 403 });
        }
        const currentSP = Number(prof.soul_power) || 0;
        if (currentSP < amount) {
            return NextResponse.json({ error: 'Insufficient Soul Power for this pledge' }, { status: 400 });
        }

        // 4. Load the petition and compute its new consensus.
        const { data: petition, error: petErr } = await admin
            .from('petitions')
            .select('*')
            .eq('id', petitionId)
            .single();
        if (petErr || !petition) {
            return NextResponse.json({ error: 'Petition not found' }, { status: 404 });
        }

        const newPledged = (petition.sp_pledged || 0) + amount;
        const goal = petition.sp_goal || 10000;
        const newConsensus = Math.min(100, Math.floor((newPledged / goal) * 100));
        const newBackerCount = (petition.backer_count || 0) + 1;
        let newStatus = petition.status;
        if (newConsensus >= 100 && newStatus === 'Consensus Building') {
            newStatus = 'Consensus Reached';
        }

        // 5. Deduct the Soul Power.
        const newSP = currentSP - amount;
        const { error: spErr } = await admin
            .from('profiles')
            .update({ soul_power: newSP })
            .eq('id', user.id);
        if (spErr) {
            console.error('Pledge SP deduction failed:', spErr);
            return NextResponse.json({ error: 'Failed to deduct Soul Power' }, { status: 500 });
        }

        // 6. Record the pledge on the petition. If this fails, refund the SP so
        //    the soul is never charged for a pledge that did not land.
        const { error: petUpdErr } = await admin
            .from('petitions')
            .update({
                sp_pledged: newPledged,
                consensus_percentage: newConsensus,
                backer_count: newBackerCount,
                status: newStatus
            })
            .eq('id', petitionId);
        if (petUpdErr) {
            console.error('Pledge petition update failed, refunding SP:', petUpdErr);
            await admin.from('profiles').update({ soul_power: currentSP }).eq('id', user.id);
            return NextResponse.json({ error: 'Failed to record pledge' }, { status: 500 });
        }

        // 7. Log the transaction (best-effort — the pledge already landed).
        await admin.from('transactions').insert({
            profile_id: user.id,
            amount: -amount,
            transaction_type: 'PLEDGE',
            description: `Pledged to Petition: ${petition.title}`
        });

        return NextResponse.json({
            success: true,
            soul_power: newSP,
            petition: {
                id: petitionId,
                sp_pledged: newPledged,
                consensus_percentage: newConsensus,
                backer_count: newBackerCount,
                status: newStatus
            }
        });
    } catch (err: any) {
        console.error('Pledge API Catch-All Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
