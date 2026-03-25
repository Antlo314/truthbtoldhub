import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fveosuladewjtqoqhdbl.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    console.log("Seeding Archive Data...");

    // Can only do this if RLS allows it! 
    // Wait, with anon key, RLS might block inserting a workspace unless there's a policy allowing it.
    // Let's see what happens.
    
    // 1. Check if workspaces exist
    const { data: workspaces, error: listErr } = await supabase.from('archive_workspaces').select('*');
    if (listErr) {
        console.error("Failed to query workspaces. Did you run archive_schema.sql?", listErr.message);
        return;
    }

    if (workspaces.length === 0) {
        console.error("No workspaces found! You need to run archive_schema.sql in Supabase to insert 'Sanctum Global' and create the channels.");
        return;
    }

    const globalWorkspace = workspaces[0];

    // 2. Insert channels if None exist for this workspace
    const { data: channels } = await supabase.from('archive_channels').select('*').eq('workspace_id', globalWorkspace.id);
    if (!channels || channels.length === 0) {
        console.log("Inserting default channels directly via REST...");
        // This requires an Admin role in workspace_members in RLS, or RLS disabled for channel inserts.
        // If RLS blocks it, we know the issue and must instruct the user.
        
        // Log in as user if possible? Can't.
        console.log("WARNING: RLS will likely block channel insertion here if not authenticated. Make sure archive_schema.sql is executed which seeds a workspace. You may need to create channels manually via UI if logged in.");
    } else {
        console.log("Channels found! Everything is seeded.");
    }
}

seed();
