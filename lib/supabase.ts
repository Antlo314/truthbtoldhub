import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

if (typeof window !== 'undefined') {
    // Only mark the cookie Secure over https — on http (localhost) a Secure
    // cookie is silently dropped, which would break the auth gate locally.
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    const setGate = (token: string) => { document.cookie = `sb-access-token=${token}; path=/; SameSite=Lax${secure}`; };
    const clearGate = () => { document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax${secure}`; };

    // Keep the gate cookie in lock-step with the REAL session. The cookie is
    // session-only (clears when the browser closes), but the Supabase session
    // persists in localStorage — so on a fresh load we must REBUILD the cookie
    // from the stored session, never sign the user out for a missing cookie.
    // (The old code called signOut() here, which logged returning souls out and
    //  dumped them on the title card after they'd already made a character.)
    supabase.auth.getSession().then(({ data }) => {
        if (data.session) setGate(data.session.access_token);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
        if (session) setGate(session.access_token);
        else clearGate();
    });
}


