const { createClient } = require('@supabase/supabase-js');

// Load environment from .env.local if needed
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearPetitions() {
    console.log('Clearing petitions...');
    const { data, error } = await supabase.from('petitions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Successfully cleared all petitions.');
    }
}

clearPetitions();
