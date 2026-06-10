import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

if (typeof window !== 'undefined') {
    // If the session-only cookie is missing, sign out client-side to clear localStorage
    const hasToken = document.cookie.split('; ').some(row => row.trim().startsWith('sb-access-token='));
    if (!hasToken) {
        supabase.auth.signOut().catch(console.error);
    }

    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            // Set session-only cookie (no max-age / expires, so it clears when browser closes)
            document.cookie = `sb-access-token=${session.access_token}; path=/; SameSite=Lax; Secure`;
        } else {
            // Clear cookie
            document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax; Secure';
        }
    });
}


