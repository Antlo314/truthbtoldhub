const fs = require('fs');
function extract(file, encoding = 'utf8') {
    try {
        let raw = fs.readFileSync(file);
        let str = raw.toString('utf8');
        if (str.includes('\0')) str = raw.toString('utf16le');
        let urls = str.match(/https?:\/\/[^\s"'()]+/g);
        if (urls) {
            let sc = urls.filter(u => u.includes('supabase.co'));
            if (sc.length > 0) {
                console.log(`--- ${file} ---`);
                [...new Set(sc)].forEach(u => console.log(u));
            }
        }
    } catch (e) { }
}

extract('C:/Users/aarons/Desktop/sacred-sanctum/public/style.css');
extract('C:/Users/aarons/Desktop/sacred-sanctum/public/index.html');
extract('C:/Users/aarons/Desktop/sacred-sanctum/public/script.js');
