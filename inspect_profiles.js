require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Using service role key if possible to bypass RLS, but we'll try anon first
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProfiles() {
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("Error fetching profiles:", error.message);
    } else {
        console.log("Profiles in Database:");
        console.table(profiles);
    }

    // Also get users if we have admin rights (anon won't have this, but let's try)
    // const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    // if (!userError) console.table(users.users);
}

inspectProfiles();
