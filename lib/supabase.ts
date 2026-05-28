import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

if (typeof window !== 'undefined') {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            // Set cookie for 7 days
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
        } else {
            // Clear cookie
            document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure';
        }
    });
}

