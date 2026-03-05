const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fveosuladewjtqoqhdbl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTc5NjksImV4cCI6MjA4Njc3Mzk2OX0.tl1cQAwzQ-UWWoEYw0j4nkUmNPsQLQapk672qatxCPU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    await supabase.from('films').update({ thumbnail_url: '/cineworks/poster1.png', status: 'AVAILABLE' }).ilike('title', '%AWAKENING%');
    await supabase.from('films').update({ thumbnail_url: '/cineworks/poster2.png', status: 'COMING SOON' }).ilike('title', '%OFFERING%');
    await supabase.from('films').update({ thumbnail_url: '/cineworks/poster3.png', status: 'POST-PRODUCTION' }).ilike('title', '%ZION%');
    console.log("DB reverted to use local next.js public images.");
}
main();
