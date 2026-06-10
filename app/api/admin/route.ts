import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5Nzk2OSwiZXhwIjoyMDg2NzczOTY5fQ.N590TQQP2c_N8bO5Fk2G8r-F-kFzB7PzG7H1hGzI7K8';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Admin accounts whitelist
const ADMIN_EMAILS = ['iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com'];

export async function POST(req: Request) {
    try {
        // 1. Authenticate user from the Authorization header token
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized: Missing or invalid credentials' }, { status: 401 });
        }

        const token = authHeader.substring(7);

        // Verify with the user client using the user's token
        const userClient = createClient(supabaseUrl, anonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });

        const { data: { user }, error: authError } = await userClient.auth.getUser(token);

        if (authError || !user) {
            console.error('Auth verification failed:', authError);
            return NextResponse.json({ error: 'Unauthorized: Session invalid' }, { status: 401 });
        }

        // 2. Strict Email-Based Authorization Check
        if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
            console.warn(`Unauthorized access attempt to Admin API by: ${user.email}`);
            return NextResponse.json({ error: 'Forbidden: Administrative power required' }, { status: 403 });
        }

        // 3. Parse Request Payload
        const body = await req.json();
        const { action, userId, updates } = body;

        // Initialize admin client to perform database overrides (bypassing user RLS policies)
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });

        if (action === 'getUsers') {
            // Fetch all users sorted by soul power then created_at
            const { data: users, error: fetchErr } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .order('soul_power', { ascending: false });

            if (fetchErr) {
                console.error('Database fetch error:', fetchErr);
                return NextResponse.json({ error: fetchErr.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, users });

        } else if (action === 'updateUser') {
            if (!userId) {
                return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
            }

            const { tier, soulPower, isBanned, display_name, custom_title, bio, aura_color } = updates;

            // Fetch current user details to calculate relative SP transaction amount
            const { data: existingUser, error: checkErr } = await supabaseAdmin
                .from('profiles')
                .select('soul_power')
                .eq('id', userId)
                .single();

            if (checkErr) {
                return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
            }

            const dbUpdates: any = {};
            if (tier !== undefined) dbUpdates.tier = tier;
            if (soulPower !== undefined) dbUpdates.soul_power = parseInt(soulPower, 10);
            if (isBanned !== undefined) dbUpdates.is_banned = isBanned;
            if (display_name !== undefined) dbUpdates.display_name = display_name;
            if (custom_title !== undefined) dbUpdates.custom_title = custom_title;
            if (bio !== undefined) dbUpdates.bio = bio;
            if (aura_color !== undefined) dbUpdates.aura_color = aura_color;

            // Update user details
            const { error: updateErr } = await supabaseAdmin
                .from('profiles')
                .update(dbUpdates)
                .eq('id', userId);

            if (updateErr) {
                console.error('Database update error:', updateErr);
                return NextResponse.json({ error: updateErr.message }, { status: 500 });
            }

            // Create a system transaction log if Soul Power changed
            if (soulPower !== undefined) {
                const diff = parseInt(soulPower, 10) - (existingUser.soul_power || 0);
                if (diff !== 0) {
                    await supabaseAdmin.from('transactions').insert({
                        profile_id: userId,
                        amount: diff,
                        transaction_type: diff > 0 ? 'MINT' : 'OFFERING',
                        description: `Administrative Adjustment by ${user.email}`
                    });
                }
            }

            return NextResponse.json({ success: true, message: 'User updated successfully' });

        } else {
            return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });
        }

    } catch (err: any) {
        console.error('Admin API Catch-All Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
