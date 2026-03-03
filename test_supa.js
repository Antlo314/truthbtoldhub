const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://fveosuladewjtqoqhdbl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTc5NjksImV4cCI6MjA4Njc3Mzk2OX0.tl1cQAwzQ-UWWoEYw0j4nkUmNPsQLQapk672qatxCPU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostic() {
    console.log(`Pinging Supabase at: ${supabaseUrl}`);

    // Test 1: Try to sign up a dummy system diagnostic user
    const email = `diagnostic_${Date.now()}@theobsidianvoid.test`;
    console.log(`Attempting to register test soul: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: 'SecurePassword123!',
    });

    if (error) {
        console.error("\n[!] SUPABASE AUTH ERROR [!]\nMessage:", error.message);
        if (error.status) console.error("Status:", error.status);
    } else {
        console.log("\n[SUCCESS] Supabase Authentication is fully operational!");
        console.log("Session Data established:", !!data.session);
        console.log("User Data established:", !!data.user);
    }
}

runDiagnostic();
