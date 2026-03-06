import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
    console.log("Zeroing out treasury escrow...");
    const { error: escrowError } = await supabase.from('treasury_escrow').update({ balance_usd: 0 }).neq('balance_usd', -999999);
    console.log("Escrow error:", escrowError?.message || "None");

    console.log("Removing all petitions...");
    const { error: petError } = await supabase.from('petitions').delete().neq('status', 'IMPOSSIBLE_STATUS');
    console.log("Petition error:", petError?.message || "None");

    console.log("Done.");
}

run();
