require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// We need the service role key to auto-confirm users, but if we only have anon
// we might have to just sign up and rely on the Supabase dashboard auto-confirm setting
// Let's check if the project has the service key in env, otherwise we will test a different user.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function execute() {
    // If the user deleted the profile, the signup might have put it in a "waiting for confirmation" state
    // Let's use a dummy email that doesn't exist yet, or see if we can trick the system.
    const email = 'admin_test123@truthbtoldhub.com';
    const password = 'SanctumPassword2026!';

    console.log(`Attempting to sign up fresh admin ${email}...`);
    let { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: 'Admin Override' }
        }
    });

    if (signUpError) {
        console.error('Sign-up failed:', signUpError.message);
    } else {
        console.log('Sign-up returned:', signUpData.user ? signUpData.user.email : 'No user');

        // Wait a sec, then try to login immediately. If confirmation is required, it will fail.
        let { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Sign-in failed after signup:', error.message);
            console.log('Email confirmation IS required on this Supabase project.');
        } else {
            console.log('Sign-in successful! Email confirmation is NOT required, or it bypassed.');
        }
    }
}

execute();
