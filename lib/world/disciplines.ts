/**
 * Matthew 6 — where a soul's strength comes from on the plain.
 *
 * Three disciplines, each done "in secret" for the greater reward:
 *   PRAYER  (6:5–15)  kneel and pray; alone, it counts double.
 *   FASTING (6:16–18) a fast of one plain-day; anoint your head with oil
 *                     early and it is kept in secret, double.
 *   GIVING  (6:1–4)   alms to the poor of the plain; with no other soul
 *                     watching, double. What you give is treasure in
 *                     heaven (6:19–21) — counted forever, never lost.
 *
 * Each discipline has its own experience and level, and those levels are
 * the stats: prayer → spirit and breath, fasting → strength, giving →
 * vitality. The skill tree (skills.ts) is gated on them.
 *
 * Scripture is the King James Version (public domain).
 */

export type Discipline = 'prayer' | 'fasting' | 'giving';

export const DISCIPLINES: { id: Discipline; name: string; secret: string; grants: string; verse: string; ref: string }[] = [
    {
        id: 'prayer',
        name: 'Prayer',
        secret: 'Pray where no other soul can see you.',
        grants: 'Spirit — more breath, faster breath, the Light',
        verse: 'But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly.',
        ref: 'Matthew 6:6',
    },
    {
        id: 'fasting',
        name: 'Fasting',
        secret: 'Anoint your head with oil early in the fast, so it is not seen.',
        grants: 'Strength — every blow lands harder',
        verse: 'But thou, when thou fastest, anoint thine head, and wash thy face; that thou appear not unto men to fast, but unto thy Father which is in secret.',
        ref: 'Matthew 6:17–18',
    },
    {
        id: 'giving',
        name: 'Giving',
        secret: 'Give when no other soul is near.',
        grants: 'Vitality — and treasure in heaven, which is never lost',
        verse: 'But when thou doest alms, let not thy left hand know what thy right hand doeth: that thine alms may be in secret.',
        ref: 'Matthew 6:3–4',
    },
];

export const discipline = (id: Discipline) => DISCIPLINES.find((d) => d.id === id)!;

/** XP needed for discipline level n (level 0 at 0) */
export function discXpFor(level: number): number {
    return Math.round(30 * level * level + 20 * level);
}

export function discLevel(xp: number): number {
    let n = 0;
    while (discXpFor(n + 1) <= xp && n < 30) n++;
    return n;
}

export function discProgress(xp: number): { level: number; into: number; need: number } {
    const level = discLevel(xp);
    const base = discXpFor(level);
    return { level, into: xp - base, need: discXpFor(level + 1) - base };
}

/* ── prayer ───────────────────────────────────────────────── */

/** The Lord's Prayer, line by line, as it scrolls while you kneel (6:9–13) */
export const LORDS_PRAYER = [
    'Our Father which art in heaven,',
    'Hallowed be thy name.',
    'Thy kingdom come. Thy will be done',
    'in earth, as it is in heaven.',
    'Give us this day our daily bread.',
    'And forgive us our debts, as we forgive our debtors.',
    'And lead us not into temptation, but deliver us from evil:',
    'For thine is the kingdom, and the power, and the glory, for ever. Amen.',
];

/** Seconds of kneeling a prayer takes */
export const PRAYER_SECONDS = 8;
/** XP for a prayer; doubled in secret */
export const PRAYER_XP = 12;
/** "In secret": no live soul or person of the plain within this many metres */
export const SECRET_RADIUS = 22;

/** A plain-day is split into four watches; one prayer per watch counts */
export function watchId(day: number, hour: number): string {
    return `${day}:${Math.floor(hour / 6)}`;
}

/* ── fasting ─────────────────────────────────────────────── */

/** A fast lasts one plain-day of play, in seconds (the day is 12 minutes) */
export const FAST_SECONDS = 12 * 60;
/** Anoint within this many seconds of starting for the fast to be secret */
export const ANOINT_WINDOW = 120;
export const FAST_XP = 60;

/* ── giving ───────────────────────────────────────────────── */

/** XP per denarius given; food counts at its price */
export const GIVE_XP_PER_COIN = 2;
/** Giving XP counts up to this much per plain-day (the rest is still treasure) */
export const GIVE_XP_DAILY_CAP = 90;

export const GIVING_THANKS = [
    'Thy Father which seeth in secret himself shall reward thee openly.',
    'Lay up for yourselves treasures in heaven, where neither moth nor rust doth corrupt.',
    'For where your treasure is, there will your heart be also.',
];

/* ── loss on the fall ────────────────────────────────────── */

export const FALL_VERSE = 'Lay not up for yourselves treasures upon earth, where moth and rust doth corrupt, and where thieves break through and steal. — Matthew 6:19';
/** Fraction of carried coin lost when you fall (unless Store Up is learned) */
export const FALL_COIN_LOSS = 0.5;

/** "Seek ye first the kingdom" — all three practised in one plain-day */
export const KINGDOM_VERSE = 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you. — Matthew 6:33';
