// ============================================================
//  TRUTH BANTER — shared no-repeat line picker.
//  Remembers the last several lines Truth has said ANYWHERE
//  (wander, proximity, combat) so he doesn't echo the same line
//  twice and the tone stays organic instead of looping.
// ============================================================

const recent: string[] = [];
const MEMORY = 7;

/** Pick a line that wasn't among the last few said. Falls back to the full pool. */
export function pickFresh(pool: string[]): string {
    if (!pool.length) return '';
    if (pool.length === 1) return pool[0];
    const fresh = pool.filter((l) => !recent.includes(l));
    const from = fresh.length ? fresh : pool;
    const line = from[Math.floor(Math.random() * from.length)];
    recent.push(line);
    while (recent.length > MEMORY) recent.shift();
    return line;
}
