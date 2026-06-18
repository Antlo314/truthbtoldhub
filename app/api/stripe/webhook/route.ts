import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { tierById } from '@/lib/donationTiers';

// ============================================================
//  STRIPE WEBHOOK — the ONLY trustworthy place to grant Soul Power.
//  Stripe calls this after a *verified* payment. We check the
//  signature, process each event exactly once (idempotency via the
//  stripe_events table), then credit the user with the service role.
//  Never grant SP from a success-redirect — that's client-spoofable.
//
//  Setup: Stripe Dashboard -> Developers -> Webhooks -> add endpoint
//    https://truthbtoldhub.com/api/stripe/webhook
//  select event `checkout.session.completed`, copy the signing secret
//  into STRIPE_WEBHOOK_SECRET (Vercel env). Run stripe_events_schema.sql.
// ============================================================

export const dynamic = 'force-dynamic';

// Soul Power per $1 for the open-ended "mint SP" flow (matches the tier
// economy, ~$100 -> 2,500 SP). Tier gifts use their own defined grants.
const SP_PER_DOLLAR = 25;

export async function POST(req: Request) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeKey || stripeKey === 'sk_test_placeholder' || !webhookSecret) {
        return new NextResponse('Stripe webhook not configured', { status: 503 });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });

    const sig = req.headers.get('stripe-signature');
    if (!sig) return new NextResponse('Missing signature', { status: 400 });

    // raw body is required for signature verification
    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err);
        return new NextResponse('Invalid signature', { status: 400 });
    }

    // we only grant on a completed checkout (covers one-time gifts, the cineworks
    // mint, and the first payment of a subscription). Recurring monthly re-grants
    // (invoice.paid) are a follow-up.
    if (event.type !== 'checkout.session.completed') {
        return NextResponse.json({ received: true });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!serviceKey) return new NextResponse('Server not configured', { status: 500 });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // idempotency — record the event first; if it's already there, we've handled it.
    const { error: seen } = await admin.from('stripe_events').insert({ id: event.id, type: event.type });
    if (seen) {
        if (seen.code === '23505') return NextResponse.json({ received: true, duplicate: true });
        // table missing / other error → 500 so Stripe retries (and we never double-grant)
        console.error('stripe_events insert failed:', seen.message);
        return new NextResponse('Event store unavailable', { status: 500 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const md = session.metadata || {};
    const userId = md.userId;
    if (!userId) return NextResponse.json({ received: true, skipped: 'no userId in metadata' });

    // resolve the grant
    let soulPower = 0;
    const perks: Record<string, unknown> = {};
    let label = 'Offering';
    const tier = md.tierId ? tierById(md.tierId) : undefined;
    if (tier) {
        label = tier.title;
        soulPower = tier.grants.soulPower ?? tier.grants.soulPowerMonthly ?? 0;
        if (tier.grants.isSupporter) perks.is_supporter = true;
        if (tier.grants.customTitle) perks.custom_title = tier.grants.customTitle;
        if (tier.grants.auraColor) perks.aura_color = tier.grants.auraColor;
    } else if (md.amount) {
        label = 'Lumen Energy';
        soulPower = Math.round(Number(md.amount) * SP_PER_DOLLAR);
    }

    // credit Soul Power (critical path)
    if (soulPower > 0) {
        const { data: profile } = await admin.from('profiles').select('soul_power').eq('id', userId).maybeSingle();
        const newSp = ((profile as { soul_power?: number } | null)?.soul_power ?? 0) + soulPower;
        const { error: spErr } = await admin.from('profiles').update({ soul_power: newSp }).eq('id', userId);
        if (spErr) {
            console.error('SP grant failed:', spErr.message);
            return new NextResponse('Grant failed', { status: 500 });
        }
        // best-effort transaction log (don't fail the grant if the table differs)
        const { error: txErr } = await admin.from('transactions').insert({
            profile_id: userId,
            amount: soulPower,
            transaction_type: 'MINT',
            description: `Stripe · ${label} · ${event.id}`,
        });
        if (txErr) console.warn('transaction log skipped:', txErr.message);
    }

    // best-effort supporter perks (a missing column must not block the SP grant)
    if (Object.keys(perks).length) {
        const { error: perkErr } = await admin.from('profiles').update(perks).eq('id', userId);
        if (perkErr) console.warn('supporter perks skipped:', perkErr.message);
    }

    return NextResponse.json({ received: true, granted: soulPower });
}
