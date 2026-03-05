const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://fveosuladewjtqoqhdbl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZW9zdWxhZGV3anRxb3FoZGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTc5NjksImV4cCI6MjA4Njc3Mzk2OX0.tl1cQAwzQ-UWWoEYw0j4nkUmNPsQLQapk672qatxCPU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadFile(filePath, fileName) {
    try {
        const file = fs.readFileSync(filePath);
        const { data, error } = await supabase.storage.from('cineworks').upload(fileName, file, {
            upsert: true,
            contentType: 'image/png'
        });
        if (error) {
            console.error("Error uploading", fileName, error.message);
        } else {
            console.log("Successfully uploaded to Supabase Storage:", fileName);
        }
    } catch (err) {
        console.error("Local file error", err.message);
    }
}

async function main() {
    await uploadFile('C:/Users/aarons/Desktop/sacred-sanctum/public/cineworks/poster1.png', 'poster1.png');
    await uploadFile('C:/Users/aarons/Desktop/sacred-sanctum/public/cineworks/poster2.png', 'poster2.png');
    await uploadFile('C:/Users/aarons/Desktop/sacred-sanctum/public/cineworks/poster3.png', 'poster3.png');

    console.log("Updating database thumbnail URLs...");
    const p1 = supabaseUrl + '/storage/v1/object/public/cineworks/poster1.png';
    const p2 = supabaseUrl + '/storage/v1/object/public/cineworks/poster2.png';
    const p3 = supabaseUrl + '/storage/v1/object/public/cineworks/poster3.png';

    await supabase.from('films').update({ thumbnail_url: p1, status: 'AVAILABLE' }).ilike('title', '%AWAKENING%');
    await supabase.from('films').update({ thumbnail_url: p2, status: 'COMING SOON' }).ilike('title', '%OFFERING%');
    await supabase.from('films').update({ thumbnail_url: p3, status: 'POST-PRODUCTION' }).ilike('title', '%ZION%');

    console.log("Database update complete. The remote AI images are now securely hosted in the cloud!");
}

main();
