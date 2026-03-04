require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function execute() {
    const email = 'admin@truthbtoldhub.com';
    const password = 'SanctumPassword2026!';

    console.log(`Testing auth connection to ${supabaseUrl}...`);
    const t0 = Date.now();
    let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    console.log(`Auth request completed in ${Date.now() - t0}ms`);

    if (error) {
        console.error('Sign-in failed:', error.message);
    } else {
        console.log('Sign-in successful! Session obtained.');
    }
}

execute();
