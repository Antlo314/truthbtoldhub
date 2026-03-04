import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
    try {
        // Initialize Stripe inside the handler to prevent Next.js build-time errors when the ENV var is missing
        const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
        const stripe = new Stripe(stripeKey, {
            apiVersion: '2023-10-16' as any,
        });

        const { amount, userId } = await req.json();

        if (!amount || !userId) {
            return new NextResponse("Missing parameters", { status: 400 });
        }

        // Amount comes in as raw dollars, convert to cents for Stripe
        const unitAmount = Math.round(Number(amount) * 100);

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
            metadata: {
                userId,
                amount,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}
