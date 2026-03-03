import fs from 'fs';

const envStr = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envStr.match(/NEXT_PUBLIC_SUPABASE_URL="(.+)"/);
const keyMatch = envStr.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="(.+)"/);

if (!urlMatch || !keyMatch) {
    console.error("Missing NEXT_PUBLIC_SUPABASE variables in .env.local");
    process.exit(1);
}

const url = urlMatch[1] + '/storage/v1/object/list/cineworks';
const key = keyMatch[1];

async function run() {
    try {
        const req = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } })
        });
        const data = await req.json();
        for (let d of data) {
            console.log(d.name);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
