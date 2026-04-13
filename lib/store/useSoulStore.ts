import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

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
}

interface SoulState {
    user: any | null;
    profile: SoulProfile | null;
    isLoading: boolean;
    error: string | null;
    
    // Actions
    fetchIdentity: () => Promise<void>;
    updateSP: (newSP: number) => Promise<void>;
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

    updateSP: async (newSP: number) => {
        const { user, profile } = get();
        if (!user || !profile) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ soul_power: newSP })
                .eq('id', user.id);

            if (error) throw error;
            set({ profile: { ...profile, soul_power: newSP } });
        } catch (err: any) {
            console.error('Update SP Error:', err);
            set({ error: err.message });
        }
    },

    updateProfile: async (updates: Partial<SoulProfile>) => {
        const { user, profile } = get();
        if (!user || !profile) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
            set({ profile: { ...profile, ...updates } });
        } catch (err: any) {
            console.error('Update Profile Error:', err);
            set({ error: err.message });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, error: null });
    }
}));
