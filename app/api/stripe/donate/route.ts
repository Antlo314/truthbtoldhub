import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { tierById } from '@/lib/donationTiers';

export async function POST(req: Request) {
    try {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey || stripeKey === 'sk_test_placeholder') {
            return new NextResponse('Stripe is not configured', { status: 503 });
        }

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });
        const { tierId, userId, email } = await req.json();

        const tier = tierById(tierId);
        if (!tier) {
            return new NextResponse('Unknown tier', { status: 400 });
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const unitAmount = Math.round(tier.amount * 100);
        const isSubscription = tier.kind === 'recurring';

        const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
            currency: 'usd',
            product_data: {
                name: `${tier.title} â€” Truth Be Told`,
                description: tier.description,
            },
            unit_amount: unitAmount,
            ...(isSubscription && tier.interval
                ? { recurring: { interval: tier.interval } }
                : {}),
        };

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: priceData, quantity: 1 }],
            mode: isSubscription ? 'subscription' : 'payment',
            success_url: `${siteUrl}/world2d?hut=patron&thanks=${tier.id}`,
            cancel_url: `${siteUrl}/world2d?hut=patron&cancelled=1`,
            customer_email: email || undefined,
            metadata: {
                tierId: tier.id,
                tierKind: tier.kind,
                userId: userId || '',
                supportCode: '400',
            },
            subscription_data: isSubscription
                ? { metadata: { tierId: tier.id, userId: userId || '', supportCode: '400' } }
                : undefined,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Checkout failed';
        console.error('Stripe Donate Error:', error);
        return new NextResponse(message, { status: 500 });
    }
}