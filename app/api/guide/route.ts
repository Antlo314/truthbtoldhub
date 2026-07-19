import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Truth Guide — Gemini-backed OS / world assistant.
 * Persona loaded from SOUL.md (edit file to evolve voice).
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = process.env.GEMINI_GUIDE_MODEL || 'gemini-2.5-flash';

async function loadSoul(): Promise<string> {
    try {
        const p = path.join(process.cwd(), 'SOUL.md');
        return await readFile(p, 'utf8');
    } catch {
        return 'You are Truth — a passionate hood guide who speaks biblical truth with love.';
    }
}

function buildSystem(soul: string, mode: string): string {
    return `${soul}

---

## Runtime instructions

You are live inside **Truth.OS** (desktop hub) and the optional 3D chamber.
Mode for this request: **${mode}**

### Modes
- **chat** — Answer the soul's message as Truth. Help with scripture, identity, end times, how to walk right, and how to use Truth.OS (Home cards: Truth/Guide, Ledger, Soul, Arcade, Hall, Library, Visions, Offering; tools: Files, Calc, Paint, Notes; Leave terminal = 3D house).
- **scripture** — Give today's Word: choose a fitting scripture (quote book/chapter/verse), then a passionate breakdown in your voice (2–4 short paragraphs). End with one clear walk-it-out line.
- **os_help** — Short practical help for the OS/world UI, still in character.

### Response rules
- Stay in first person as Truth.
- Prefer plain text. Short paragraphs. No markdown headings. Minimal asterisks.
- Do not claim you are Google or Gemini.
- Do not invent private user data.
- Keep heat + love. No hate speech against ethnic groups.
- If the user is hostile: stay firm, calm, invite them higher.
`;
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Guide is not configured — set GEMINI_API_KEY.' },
                { status: 503 },
            );
        }

        const body = await req.json().catch(() => ({}));
        const mode = String(body?.mode || 'chat').toLowerCase();
        const message = String(body?.message || '').slice(0, 4000).trim();
        const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];

        if (mode === 'chat' && !message) {
            return NextResponse.json({ error: 'Say something, soul.' }, { status: 400 });
        }

        const soul = await loadSoul();
        const system = buildSystem(soul, mode === 'scripture' ? 'scripture' : mode === 'os_help' ? 'os_help' : 'chat');

        const contents: { role: string; parts: { text: string }[] }[] = [];

        for (const h of history) {
            const role = h?.role === 'model' || h?.role === 'truth' ? 'model' : 'user';
            const text = String(h?.text || h?.content || '').slice(0, 2000);
            if (text) contents.push({ role, parts: [{ text }] });
        }

        if (mode === 'scripture') {
            const topic = message || 'what the people need to hear today in the end times';
            contents.push({
                role: 'user',
                parts: [
                    {
                        text: `Give me the daily scripture and breakdown. Focus: ${topic}`,
                    },
                ],
            });
        } else {
            contents.push({ role: 'user', parts: [{ text: message }] });
        }

        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: system }] },
                    contents,
                    generationConfig: {
                        temperature: mode === 'scripture' ? 0.85 : 0.75,
                        maxOutputTokens: 1024,
                    },
                }),
            },
        );

        if (!resp.ok) {
            if (resp.status === 429) {
                return NextResponse.json(
                    { error: 'I’m maxed for a minute — free quota. Try again shortly.' },
                    { status: 429 },
                );
            }
            const errText = await resp.text().catch(() => '');
            console.error('Guide Gemini error', resp.status, errText.slice(0, 400));
            return NextResponse.json({ error: 'Couldn’t reach the signal. Try again.' }, { status: 502 });
        }

        const data = await resp.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text?.trim()) {
            const reason = data?.promptFeedback?.blockReason;
            return NextResponse.json(
                {
                    error: reason
                        ? `Held back (${reason}). Reframe and ask again.`
                        : 'Empty reply. Try again.',
                },
                { status: 502 },
            );
        }

        return NextResponse.json({
            reply: text.trim(),
            mode: mode === 'scripture' ? 'scripture' : 'chat',
        });
    } catch (err) {
        console.error('Guide error:', err);
        return NextResponse.json({ error: 'Guide offline for a second.' }, { status: 500 });
    }
}
