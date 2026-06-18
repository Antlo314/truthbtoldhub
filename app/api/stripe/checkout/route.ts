import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        // Authenticate the caller and derive the user from their verified token —
        // never trust a client-supplied userId (it would let anyone credit any
        // account once a webhook grants SP).
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        const token = authHeader.substring(7);
        const userClient = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: { user }, error: authError } = await userClient.auth.getUser(token);
        if (authError || !user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey === 'sk_test_placeholder') {
            return new NextResponse('Payments are not configured', { status: 503 });
        }
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });

        const { amount } = await req.json();
        const dollars = Number(amount);
        if (!Number.isFinite(dollars) || dollars < 1 || dollars > 10000) {
            return new NextResponse('Invalid amount', { status: 400 });
        }
        const unitAmount = Math.round(dollars * 100);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Lumen Energy (SP)',
                            description: 'Mint energetic liquidity in the Obsidian Void.',
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/self?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/self?payment=cancelled`,
            // userId comes from the verified token, NOT the request body
            metadata: {
                userId: user.id,
                amount: String(dollars),
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        return new NextResponse('Checkout failed', { status: 500 });
    }
}
