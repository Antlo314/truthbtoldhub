import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// The ONLY profile columns a soul may edit from the browser. Privileged
// columns (tier, soul_power, is_supporter, is_banned, …) are server-only —
// they are written exclusively through service-role endpoints (/api/admin,
// /api/stripe/webhook, /api/treasury/pledge) and are additionally locked at
// the database level (see secure_profiles_privileges.sql). updateProfile
// strips everything outside this list so it can never forward an escalation.
const SAFE_PROFILE_COLUMNS = [
    'display_name',
    'username',
    'avatar_url',
    'bio',
    'custom_title',
    'theme_color',
] as const;

interface SoulProfile {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    soul_power: number;
    tier: string;
    alignment: number;
    custom_title?: string;
    bio?: string;
    theme_color?: string;
    is_supporter?: boolean;
}

interface SoulState {
    user: any | null;
    profile: SoulProfile | null;
    isLoading: boolean;
    error: string | null;
    
    // Actions
    fetchIdentity: () => Promise<void>;
    updateProfile: (updates: Partial<SoulProfile>) => Promise<void>;
    signOut: () => Promise<void>;
}

export const useSoulStore = create<SoulState>((set, get) => ({
    user: null,
    profile: null,
    isLoading: true,
    error: null,

    fetchIdentity: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                set({ user: null, profile: null, isLoading: false });
                return;
            }

            const { user } = session;
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError;
            }

            set({ user, profile, isLoading: false });
        } catch (err: any) {
            console.error('SoulStore Error:', err);
            set({ error: err.message, isLoading: false });
        }
    },

    updateProfile: async (updates: Partial<SoulProfile>) => {
        const { user, profile } = get();
        if (!user || !profile) return;

        // Whitelist: forward ONLY cosmetic columns. Even if a caller passes
        // tier/soul_power/is_supporter/etc., they are dropped here so this
        // path can never be used to self-elevate. (The DB enforces the same.)
        const safe: Partial<SoulProfile> = {};
        for (const key of SAFE_PROFILE_COLUMNS) {
            if (key in updates && (updates as Record<string, unknown>)[key] !== undefined) {
                (safe as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
            }
        }
        if (Object.keys(safe).length === 0) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update(safe)
                .eq('id', user.id);

            if (error) throw error;
            set({ profile: { ...profile, ...safe } });
        } catch (err: any) {
            console.error('Update Profile Error:', err);
            set({ error: err.message });
            throw err;
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, error: null });
    }
}));
