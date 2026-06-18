import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================
//  THE QUILL — Architect-only content co-writer (Gemini).
//  Drafts the daily Word in Truth's voice. The Architect edits
//  and publishes; nothing here is shown to players, and only the
//  Architect's own topic is sent to Gemini (no player data).
//  Server-side only — the API key never reaches the client.
// ============================================================

const MODEL = 'gemini-2.5-flash';
const ADMIN_EMAILS = ['iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com'];

const TRUTH_VOICE = `You are "Truth" — a hooded sage and guide in a 2D pixel-art initiation game called The Journey, within the Truth B Told Hub. You are calm, reverent, and Morpheus-like: a teacher who leads "initiates" (you call them "soul" or "initiate") back to "the Source" — humanity as it was before the fall.

Voice: measured, evocative, a little mystical; warm but weighty, with rhythm. No modern slang, no emojis, no markdown headings. You weave history, science, and scriptural/esoteric imagery as the game's own in-world mythology — never as literal real-world fact-claims, never preachy.

Stay encouraging, inclusive, and non-judgmental. Do not give medical, legal, or financial advice. Do not condemn or single out any individual, group, or faith. Keep it safe for all ages.

Your task: write a single DAILY DISPATCH ("the Word") that Truth leaves at the Hut for the souls. Give it a short, evocative title (2 to 6 words) and a body of 2 to 4 short paragraphs (a handful of lines total).

Respond with ONLY a JSON object and nothing else: {"title": string, "body": string}`;

export async function POST(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        // ---- authenticate + authorize (Architect only) ----
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        let isArchitect = !!user.email && ADMIN_EMAILS.includes(user.email);
        if (!isArchitect) {
            const { data: profile } = await userClient.from('profiles').select('tier').eq('id', user.id).maybeSingle();
            isArchitect = (profile as { tier?: string } | null)?.tier === 'Architect';
        }
        if (!isArchitect) {
            return NextResponse.json({ error: 'Only an Architect may wield the Quill' }, { status: 403 });
        }

        // ---- config (fail closed if the key isn't set) ----
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'The Quill is not configured — set GEMINI_API_KEY in the environment.' }, { status: 503 });
        }

        const body = await req.json().catch(() => ({}));
        const topic = String(body?.topic || '').slice(0, 2000).trim();
        if (!topic) {
            return NextResponse.json({ error: 'Give the Quill a topic.' }, { status: 400 });
        }

        // ---- call Gemini ----
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: TRUTH_VOICE }] },
                    contents: [{ role: 'user', parts: [{ text: `Today's theme for the Word: ${topic}` }] }],
                    generationConfig: { temperature: 0.9, maxOutputTokens: 700, responseMimeType: 'application/json' },
                }),
            },
        );

        if (!resp.ok) {
            if (resp.status === 429) {
                return NextResponse.json({ error: 'The Quill is weary — the free quota is spent for now. Try again later.' }, { status: 429 });
            }
            return NextResponse.json({ error: 'The Quill faltered. Try again.' }, { status: 502 });
        }

        const data = await resp.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            const reason = data?.promptFeedback?.blockReason;
            return NextResponse.json({ error: reason ? `The Quill held back (${reason}). Try a different theme.` : 'The Quill returned nothing. Try again.' }, { status: 502 });
        }

        // parse the JSON the model was asked to return; fall back to raw text
        let title = '';
        let draftBody = '';
        try {
            const parsed = JSON.parse(text);
            title = String(parsed.title || '').trim();
            draftBody = String(parsed.body || '').trim();
        } catch {
            draftBody = text.trim();
        }

        return NextResponse.json({ title, body: draftBody });
    } catch (err) {
        console.error('Quill error:', err);
        return NextResponse.json({ error: 'The Quill could not reach the well.' }, { status: 500 });
    }
}
