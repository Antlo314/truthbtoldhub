const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fveosuladewjtqoqhdbl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTc5NjksImV4cCI6MjA4Njc3Mzk2OX0.tl1cQAwzQ-UWWoEYw0j4nkUmNPsQLQapk672qatxCPU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function execute() {
    const email = 'admin@truthbtoldhub.com';
    const password = 'SanctumPassword2026!';

    console.log(`Attempting to sign in with ${email}...`);
    let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.log(`Sign-in failed: ${error.message}. Attempting to sign up...`);
        let { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password
        });

        if (signUpError) {
            console.error('Sign-up failed:', signUpError.message);
        } else {
            console.log('Sign-up successful!', signUpData.user ? 'User created.' : 'Check email for confirmation.');
            console.log(`Credentials: ${email} / ${password}`);
        }
    } else {
        console.log('Sign-in successful! User already exists with this password.');
        console.log(`Credentials: ${email} / ${password}`);
    }
}

execute();
