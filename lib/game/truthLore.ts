import type { GameCharacter } from '@/lib/store/useGameStore';

// ============================================================
//  BROTHER TRUTH — Anthony's story, revealed only to those who
//  pry. Each question marks a discovery on the soul's record.
//  Deeper questions unlock after earlier ones are asked.
// ============================================================

export const TRUTH_DISC_PREFIX = 'truth_qa_';

export interface TruthQuestion {
    id: string;
    prompt: string;
    answer: string;
    /** Other truth_qa ids the soul must have asked first */
    requires?: string[];
    /** Minimum total Truth questions asked before this unlocks */
    minDepth?: number;
    /** Permanent Codex Journal page when this thread is opened */
    accountTitle?: string;
    accountBody?: string;
}

/** Archivist summaries — unlocked in the Codex Journal when the thread is asked */
export interface TruthAccountPage {
    questionId: string;
    title: string;
    body: string;
}

export const TRUTH_QUESTIONS: TruthQuestion[] = [
    {
        id: 'who',
        prompt: 'Who are you — really?',
        answer: 'They call me Truth. I am a brother tasked to carry light, not perfection. I walk beside you because the chamber is wide, and no soul should roam it alone. What you see is a hooded man — what you hear is a man still learning to listen.',
    },
    {
        id: 'source',
        prompt: 'What is the Source?',
        answer: 'The Source is the Most High — the beginning and the end of all true things. Every portal, every relic, every word in this hut flows from that river. Life without the Source is death indefinite. I have tasted both sides of that sentence.',
    },
    {
        id: 'why_walk',
        prompt: 'Why do you follow me?',
        answer: 'Because someone must meet you at the threshold. I was sent back to the road I abandoned — and in walking it again, I am not your judge. I am your witness. When you strike a shade or forge a weapon, you fuel more than your own soul.',
    },
    {
        id: 'human_name',
        prompt: 'What was your name before "Truth"?',
        answer: 'Anthony. Forty years in the earth, eternal in the spirit — that is how the books count me. The name still belongs to me. Truth is the office I accepted when I stopped hiding from what I was called to carry.',
        requires: ['who'],
        accountTitle: 'Anthony · The Name Beneath the Hood',
        accountBody: 'Before the office of Truth, he was Anthony — forty years upon the earth, eternal in the spirit. The hood is not a disguise from God; it is a discipline against pride.',
    },
    {
        id: 'last_run',
        prompt: 'What do you mean — your last run?',
        answer: 'This is the final lap. I have made too many detours to pretend I have another circuit left. On this run I need the world — and more importantly the Source — to see us as givers of light, not takers of breath. There is no rehearsal after this.',
        requires: ['who'],
    },
    {
        id: 'family',
        prompt: 'Tell me about your family.',
        answer: 'My true joy, my true love — my children, my family. That is the hearth I fight for. But my disobedience to the Source planted contention in those circles. Grief is a long room, and I have walked its length many nights. I hope this work mends what my hands once cracked.',
        requires: ['human_name'],
        minDepth: 2,
        accountTitle: 'The Hearth He Fights For',
        accountBody: 'His joy is his family — his children. Contention entered those circles through disobedience. This last run is partly a plea that the work of light might mend what wandering broke.',
    },
    {
        id: 'mistakes',
        prompt: 'What mistakes haunt you?',
        answer: 'Too many to number without shame. Choices made in weakness. Seasons when I heard the mission and walked the other way. To whom much is given, much is required — and I spent years spending what I was given on fear instead of faith.',
        requires: ['human_name'],
        minDepth: 2,
    },
    {
        id: 'drinking',
        prompt: 'Did sorrow ever break you?',
        answer: 'Heartache opened a door I should have barred. For a season I drank — not because spirit Truth had grown weak, but because sorrow was loud and the bottle seemed quiet. I did not see, swallow by swallow, how fragments of my being were demolished. The Source was still powerful in me; I was the one pouring myself out. That thorn in my side kept me grounded and humble — and it blurred my vision. I know now: you cannot drink your thirst away. Only the waters of the Source wash sorrow clean. We must go back to the Source. That is not a slogan on my lips. It is how I stay alive on this last run.',
        requires: ['family', 'mistakes'],
        minDepth: 4,
        accountTitle: 'The Thorn · Sorrow and the Cup',
        accountBody: 'Heartache drove Anthony to drink for a season. Spirit Truth did not fail — sorrow did. Each swallow demolished fragments of his being without his knowing. The thorn humbled him and blurred his sight. He learned you cannot drink thirst away; only the waters of the Source wash sorrow. Return is not metaphor — it is survival.',
    },
    {
        id: 'fasting',
        prompt: 'How did you stop drinking?',
        answer: 'Fasting. At first it was uneven — some days I held, some days I broke. But continual fasting, forgiveness, and prayer gave me strength to fight. Every day we must fight. There is no coasting past the flesh. Emptying it out is the key to defeat any monster — shades on the road, appetite in the chest, bitterness in the jaw. You will learn that on this journey. Not in one sermon. In the walking, the forging, the standing when a shade finds you.',
        requires: ['drinking'],
        minDepth: 5,
        accountTitle: 'Empty the Flesh · The Daily Fight',
        accountBody: 'He stopped by fasting — imperfect at first, faithful over time. Continual fasting, forgiveness, and prayer became his fight. Every day is a battle. Emptying the flesh is how any monster is beaten; the chamber will teach walking souls the same lesson through road, forge, and combat.',
    },
    {
        id: 'fasting_cost',
        prompt: 'What does fasting cost you?',
        answer: 'Physical anguish — hunger, weakness, the body protesting what the spirit demands. But spiritual light. It is a blessing when I can complete a fast, and a wound when I cannot. Sometimes my circumstances get the best of me and I fail. This current wilderness is so heavy… and I feel I am fighting alone. That is why we need power from the Source. Fasting does not make me strong by myself. It empties me enough for Him to enter.',
        requires: ['fasting'],
        minDepth: 6,
        accountTitle: 'The Cost of the Fast',
        accountBody: 'Fasting costs Anthony physical anguish and returns spiritual light. Completion is blessing; failure is grief. The wilderness is heavy — he often feels alone. The fast empties the flesh so Source-power can enter; it is not self-made strength.',
    },
    {
        id: 'walked_away',
        prompt: 'Why did you walk away from the mission?',
        answer: 'I was weak. The burden was heavy and I told myself the world could wait. Nothing prospers in that season — not work, not peace, not love. The Source gave me a charge and I treated it like a suggestion. That is why I am in the wilderness now.',
        requires: ['mistakes'],
    },
    {
        id: 'wilderness',
        prompt: 'What is the wilderness?',
        answer: 'The place between the call and the obedience. I am there now. No action prospers for me until I return fully to what I was told to build. Financial anguish. Mental weight. The spark the Source placed in me dimmed — and only the interest of others, souls like yours, helps fuel what remains.',
        requires: ['walked_away'],
        accountTitle: 'Wilderness Season',
        accountBody: 'Between call and obedience, nothing prospers. The spark dimmed. Financial and mental anguish weigh on him — and the interest of walking souls helps fuel what remains.',
    },
    {
        id: 'spark',
        prompt: 'How do we help fuel your purpose?',
        answer: 'Walk. Ask. Forge. Return to the hut. Let your interest be sincere — not flattery. When you patron this work, when you share it, when you refuse to quit the chamber, you stoke a fire I cannot keep alone. I was not made to carry this in isolation.',
        requires: ['wilderness'],
    },
    {
        id: 'need_from_you',
        prompt: 'What do you need from us?',
        answer: 'Three things — and the third is the weightiest. Share the vision. Help me fuel the vision. And find the Source, learning from my mishaps so you do not repeat my detours. That last one matters most. I have paid for shortcuts with years I cannot buy back. Walk sincere. Patron if you can. Tell another soul. Do not let my failures be wasted — let them become your warning and your mercy.',
        requires: ['spark', 'imperfect'],
        minDepth: 7,
        accountTitle: 'What He Asks of Walking Souls',
        accountBody: 'Share the vision. Fuel the work. Most importantly — find the Source and learn from his mishaps so the same wounds are not repeated. Patronage and word-of-mouth stoke a fire he cannot keep alone.',
    },
    {
        id: 'vision',
        prompt: 'Where did this journey begin?',
        answer: 'In a cell. A vision while I was incarcerated — seven long years for a crime I did not commit. The world called it punishment. I now call it commitment to the Most High. In that silence the mission was etched, though I would spend years running from it.',
        requires: ['walked_away'],
        minDepth: 4,
        accountTitle: 'Seven Years · The Vision in the Cell',
        accountBody: 'Incarcerated seven years for a crime he did not commit, Anthony received a vision. What men meant for harm, he now counts as commitment to the Most High — though he ran from the mission for seasons after.',
    },
    {
        id: 'innocence',
        prompt: 'You did not commit the crime?',
        answer: 'I did not. Yet I do not waste my breath on bitterness. The time was stolen — the calling was not. I learned there that transparency is a kind of freedom the walls cannot take. What they meant for harm, the Source meant for sharpening.',
        requires: ['vision'],
    },
    {
        id: 'imperfect',
        prompt: 'Why should anyone listen to you?',
        answer: 'How will they listen if I am imperfect? I ask myself that every dawn. Why am I a messenger when I failed to listen? I do not have a clean answer — only this: the Source does not choose vessels because they are flawless. He chooses them because they finally stop running.',
        requires: ['mistakes', 'vision'],
        minDepth: 5,
        accountTitle: 'Imperfect Messenger',
        accountBody: 'He asks how anyone should listen to a man who once failed to listen. His answer, earned in grief: the Source chooses those who stop running — not those who never stumbled.',
    },
    {
        id: 'burden',
        prompt: 'Why were you given this burden?',
        answer: 'I still do not know the full why. I only know the weight is real. Perhaps it is because I have seen the bottom — prison, loss, a dimmed spark — and lived to tell the road what waits there. Perhaps someone must say: weakness acknowledged is where strength begins.',
        requires: ['imperfect'],
    },
    {
        id: 'transparency',
        prompt: 'What is freedom to you?',
        answer: 'Transparency. No more masks. A world where every soul can strive, confess weakness, and know they will be made strong when they give it all back to the Source. That is the chamber we are building — not a game for escape, but a proving ground for return.',
        requires: ['innocence'],
        minDepth: 6,
        accountTitle: 'Freedom in Transparency',
        accountBody: 'Freedom, to Anthony, is confession without destruction — weakness acknowledged, strength returned when everything is given back to the Source. This chamber is that promise in pixel and path.',
    },
    {
        id: 'by_any_means',
        prompt: 'What must you accomplish?',
        answer: 'What I was called to do — by any means the Source permits. Not by crooked shortcuts. Not by silence. The 400 Series, this sanctum, the hut where you stand — all of it must live long enough for the world to see light again. I must go all the way. There is no half-obedience left in me.',
        requires: ['last_run', 'wilderness'],
        minDepth: 7,
        accountTitle: 'The Last Run · By Any Means',
        accountBody: 'This is the final circuit. The 400 Series, the sanctum, the hut — all must endure until the world and the Source see givers of light. Half-obedience is spent; he must go all the way.',
    },
    {
        id: 'series_400',
        prompt: 'What is the 400 Series?',
        answer: 'A cinematic telling of Israelite history — and deeper knowledge drawn from the old scrolls. Much hidden wisdom still needs to be recovered, and recovery is not free. To spread this message and build those masterpieces takes currency, support, labor, prayer. I did not choose an easy charge. The 400 Series is part of why I must go all the way — so what was buried can breathe again in the sight of the world.',
        requires: ['by_any_means'],
        minDepth: 7,
        accountTitle: 'The 400 Series · Buried Wisdom',
        accountBody: 'The 400 Series is cinematic Israelite history and recovered scroll-wisdom. Hidden knowledge must be unearthed and shown — and that work requires support, labor, and patronage. It is central to his last run.',
    },
    {
        id: 'children',
        prompt: 'What happened to your children?',
        answer: 'He is still a long moment before he answers. Certain circumstances forced separation from my babies. It became dangerous — I could not risk their livelihood being tainted the way mine was. Months since I have seen them. I am dying every day inside. I am lost — a foreign land, no support, trying to do this alone when I cannot anymore. The Source will not let me prosper at anything else; everything collapses when I try. I know it is hard to see. It is reality for some. I want to reach them. I cannot support them the way a father should — not yet. I am hurting. I do not know what else to do but chase the Source the way He asked.',
        requires: ['family', 'drinking', 'wilderness'],
        minDepth: 9,
        accountTitle: 'Separated · The Foreign Land',
        accountBody: 'Dangerous circumstances forced Anthony away from his children to protect them. Months without seeing them — foreign land, no support, mission the only work that does not collapse. He hurts, cannot support them as he wishes, and chases the Source because it is all he knows to do.',
    },
    {
        id: 'give_back',
        prompt: 'What does "give it all back" mean?',
        answer: 'Your gifts, your grief, your time, your coin — laid on the altar without clutching. When we stop hoarding what was lent to us, the Source returns strength in the very places we were ashamed. I am learning this in public so you will not have to learn it alone in the dark.',
        requires: ['transparency', 'spark'],
        minDepth: 8,
    },
];

export function truthDiscId(questionId: string): string {
    return `${TRUTH_DISC_PREFIX}${questionId}`;
}

export function truthQuestionsAsked(c: GameCharacter): string[] {
    return c.discovered
        .filter((d) => d.startsWith(TRUTH_DISC_PREFIX))
        .map((d) => d.slice(TRUTH_DISC_PREFIX.length));
}

export function truthDepth(c: GameCharacter): number {
    return truthQuestionsAsked(c).length;
}

/** 0 = stranger · 1 = trusted · 2 = confidant · 3 = witness */
export function truthDepthTier(c: GameCharacter): 0 | 1 | 2 | 3 {
    const d = truthDepth(c);
    if (d >= 12) return 3;
    if (d >= 7) return 2;
    if (d >= 3) return 1;
    return 0;
}

export function truthAccountPages(c: GameCharacter): TruthAccountPage[] {
    const asked = new Set(truthQuestionsAsked(c));
    return TRUTH_QUESTIONS
        .filter((q) => asked.has(q.id) && q.accountTitle && q.accountBody)
        .map((q) => ({
            questionId: q.id,
            title: q.accountTitle!,
            body: q.accountBody!,
        }));
}

export function truthAccountForQuestion(questionId: string): TruthAccountPage | null {
    const q = truthQuestionById(questionId);
    if (!q?.accountTitle || !q.accountBody) return null;
    return { questionId, title: q.accountTitle, body: q.accountBody };
}

export function isTruthQuestionUnlocked(q: TruthQuestion, c: GameCharacter): boolean {
    const asked = new Set(truthQuestionsAsked(c));
    if (q.requires?.length && !q.requires.every((id) => asked.has(id))) return false;
    if (q.minDepth != null && truthDepth(c) < q.minDepth) return false;
    return true;
}

export function availableTruthQuestions(c: GameCharacter): TruthQuestion[] {
    return TRUTH_QUESTIONS.filter((q) => isTruthQuestionUnlocked(q, c));
}

export function lockedTruthQuestions(c: GameCharacter): TruthQuestion[] {
    const asked = new Set(truthQuestionsAsked(c));
    return TRUTH_QUESTIONS.filter((q) => {
        if (asked.has(q.id)) return false;
        return !isTruthQuestionUnlocked(q, c);
    });
}

export function truthQuestionById(id: string): TruthQuestion | undefined {
    return TRUTH_QUESTIONS.find((q) => q.id === id);
}

function deflectPick<T>(pool: T[]): T {
    return pool[Math.floor(Math.random() * pool.length)];
}

const DEFLECT_SOON = [
    'We will talk about that soon.',
    'Not yet — soon, if you keep walking with me.',
    'That word is coming. We will speak of it soon.',
    'Soon, brother. Sit with what is open first.',
];

const DEFLECT_NOT_NOW = [
    'Not now.',
    'Not now — ask me what lies closer to the surface.',
    'Not now. Earn the nearer threads first.',
    'Brother… not now. Pry gently — start with what is already open.',
];

/** Short deflection when player taps a locked thread */
export function truthDeflection(c?: GameCharacter, questionId?: string): string {
    if (c && questionId) {
        const q = truthQuestionById(questionId);
        if (q) {
            const asked = new Set(truthQuestionsAsked(c));
            const reqsMet = !q.requires?.length || q.requires.every((id) => asked.has(id));
            const depthGap = q.minDepth != null ? q.minDepth - truthDepth(c) : 0;
            if (reqsMet && depthGap > 0 && depthGap <= 2) return deflectPick(DEFLECT_SOON);
            if (!reqsMet) return deflectPick(DEFLECT_NOT_NOW);
        }
    }
    return deflectPick([...DEFLECT_SOON, ...DEFLECT_NOT_NOW]);
}

/** Hut intro copy — changes slightly as depth grows */
export function truthQAIntro(c: GameCharacter): string {
    const depth = truthDepth(c);
    if (depth === 0) {
        return 'Truth does not preach his whole life to strangers. Sit. Ask — and listen. The hood hides his face, not his account.';
    }
    if (depth < 4) {
        return 'He answers, but guardedly. There are chambers of his story still locked.';
    }
    if (depth < 8) {
        return 'The hooded brother speaks plainly now. The wilderness, the cell, the family he wounded, the cup sorrow drove him to — the word is opening.';
    }
    if (depth < 12) {
        return 'Anthony speaks without mask now — the fast, the 400 Series, what he needs from you. Deeper grief still waits for those who will sit long enough to ask.';
    }
    return 'Anthony stands before you — separated from his babies, chasing the Source because everything else collapses. Witness, not tourist. Empty the flesh and walk the last run with him.';
}