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
        else if (localStorage.getItem('tbth-demo') !== 'true') clearGate();
    });

    // --- DEMO MODE OVERRIDES ---
    const callbacks = new Set<(event: any, session: any) => void>();
    
    const isDemo = process.env.NEXT_PUBLIC_TBTH_DEMO === 'true';

    // Override getSession
    const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
    supabase.auth.getSession = async () => {
        if (isDemo) {
            return {
                data: {
                    session: {
                        access_token: 'demo-token',
                        token_type: 'bearer',
                        expires_in: 3600,
                        refresh_token: 'demo-refresh-token',
                        user: {
                            id: 'demo-soul-id-12345',
                            aud: 'authenticated',
                            role: 'authenticated',
                            email: 'demo-soul@truthbtoldhub.local',
                            app_metadata: { provider: 'email' },
                            user_metadata: {
                                username: 'DemoSoul',
                                display_name: 'Demo Soul',
                                aura_color: 'Neutral'
                            },
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        },
                        expires_at: Math.floor(Date.now() / 1000) + 3600
                    }
                },
                error: null
            } as any;
        }
        return originalGetSession();
    };

    // Override signOut
    const originalSignOut = supabase.auth.signOut.bind(supabase.auth);
    supabase.auth.signOut = async () => {
        localStorage.removeItem('tbth-demo');
        clearGate();
        if ((window as any).__triggerDemoAuth) {
            (window as any).__triggerDemoAuth(null);
        }
        return originalSignOut();
    };

    // Override onAuthStateChange
    const originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);
    supabase.auth.onAuthStateChange = (callback) => {
        callbacks.add(callback);
        const { data: { subscription } } = originalOnAuthStateChange(callback);
        
        return {
            data: {
                subscription: {
                    ...subscription,
                    unsubscribe: () => {
                        callbacks.delete(callback);
                        subscription.unsubscribe();
                    }
                }
            }
        };
    };

    // Helper to trigger UI auth state changes manually in demo mode
    (window as any).__triggerDemoAuth = (session: any) => {
        callbacks.forEach((cb) => {
            try {
                cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
            } catch (e) {
                console.error(e);
            }
        });
    };

    // Override table queries
    const mockProfiles = {
        id: 'demo-soul-id-12345',
        username: 'DemoSoul',
        display_name: 'Demo Soul',
        avatar_url: '',
        soul_power: 144,
        tier: 'Initiate',
        alignment: 0,
        custom_title: 'Demo Soul',
        bio: 'Exploring the sanctum offline.',
        is_supporter: true
    };

    const originalFrom = supabase.from.bind(supabase);
    supabase.from = (table: string) => {
        if (isDemo) {
            const chain = {
                select: () => chain,
                eq: () => chain,
                gt: () => chain,
                order: () => chain,
                limit: () => chain,
                maybeSingle: async () => {
                    if (table === 'profiles') {
                        return { data: mockProfiles, error: null };
                    }
                    if (table === 'game_state') {
                        const localJourney = localStorage.getItem('tbth-journey');
                        if (localJourney) {
                            try {
                                const parsed = JSON.parse(localJourney);
                                return {
                                    data: {
                                        character: parsed.state.character,
                                        initiated: parsed.state.initiated
                                    },
                                    error: null
                                };
                            } catch (e) {}
                        }
                    }
                    return { data: null, error: null };
                },
                single: async () => {
                    if (table === 'profiles') return { data: mockProfiles, error: null };
                    return { data: null, error: null };
                },
                update: () => chain,
                upsert: () => chain,
                insert: () => chain,
                then: (resolve: any) => {
                    resolve({ data: [], error: null });
                }
            };
            return chain as any;
        }
        return originalFrom(table);
    };
}


