const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://fveosuladewjtqoqhdbl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5Nzk2OSwiZXhwIjoyMDg2NzczOTY5fQ.N590TQQP2c_N8bO5Fk2G8r-F-kFzB7PzG7H1hGzI7K8';
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function execute() {
    const email = 'iamwhoiambook@gmail.com';
    const password = 'SanctumPassword2026!';

    console.log(`Setting up Admin account: ${email}...`);

    // 1. Check if user exists in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
        console.error("Failed to list users:", listError.message);
        return;
    }

    let adminUser = users.find(u => u.email === email);

    if (!adminUser) {
        console.log(`User does not exist. Creating auth user...`);
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                username: 'iamwhoiam',
                display_name: 'Main Admin',
                aura_color: 'Architect'
            }
        });

        if (createError) {
            console.error("Failed to create auth user:", createError.message);
            return;
        }
        adminUser = user;
        console.log(`Auth user created successfully! ID: ${adminUser.id}`);
    } else {
        console.log(`Auth user already exists. ID: ${adminUser.id}`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
            password: password
        });
        if (updateError) {
            console.warn("Failed to update password:", updateError.message);
        }
    }

    // 2. Ensure the profiles table row exists and is promoted to Architect
    console.log(`Ensuring profile row is set to Architect...`);
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: adminUser.id,
            email: email,
            username: 'iamwhoiam',
            display_name: 'Main Admin',
            tier: 'Architect',
            soul_power: 9999,
            is_supporter: true
        });

    if (profileError) {
        console.error("Failed to upsert profile row:", profileError.message);
    } else {
        console.log("Success! Admin account and profile are ready.");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
    }
}

execute();

