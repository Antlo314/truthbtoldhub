const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://fveosuladewjtqoqhdbl.supabase.co";
// Using the service_role key to bypass RLS for seeding.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE5Nzk2OSwiZXhwIjoyMDg2NzczOTY5fQ.N590TQQP2c_N8bO5Fk2G8r-F-kFzB7PzG7H1hGzI7K8";

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
    console.log("Seeding films...");
    const { data: filmsData, error: filmsErr } = await supabase.from('films').insert([
        { title: 'AWAKENING', duration: '03:14', format: '1080p', video_url: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.mp4', thumbnail_url: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.png', is_premiere: true, is_new: true, director: 'The Void' },
        { title: 'THE OFFERING', duration: '05:22', format: '4K', thumbnail_url: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.png', is_premiere: false, is_new: false, director: 'The Void' },
        { title: 'ECHOES OF ZION', duration: '12:05', format: '4K', thumbnail_url: 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/encrypted_sector.png', is_premiere: false, is_new: false, director: 'The Void' }
    ]).select();

    if (filmsErr) console.error("Error seeding films:", filmsErr);
    else console.log(`Seeded ${filmsData.length} films.`);

    console.log("Fetching a profile to attach petitions to...");
    const { data: profiles } = await supabase.from('profiles').select('id').limit(1);

    if (profiles && profiles.length > 0) {
        const uuid = profiles[0].id;
        console.log(`Seeding petitions for user ${uuid}...`);

        const { data: petData, error: petErr } = await supabase.from('petitions').insert([
            { requester_id: uuid, title: 'Equipment Grant: Studio Upgrade', description: 'Need resources for audio hardware.', amount_requested: 850.00, status: 'Consensus Building', consensus_percentage: 18 },
            { requester_id: uuid, title: 'Emergency Medical Fund', description: 'Assistance for unexpected hospital bill.', amount_requested: 1200.00, status: 'Disbursed', consensus_percentage: 100 }
        ]).select();

        if (petErr) console.error("Error seeding petitions:", petErr);
        else console.log(`Seeded ${petData.length} petitions.`);
    } else {
        console.log("No profiles found to attach petitions to.");
    }
}

seedData();
