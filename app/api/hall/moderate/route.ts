import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Hall Sentinel — Gemini moderates a newly posted message.
 * Soft-deletes if inappropriate (service role + soft_delete_hall_message_system).
 */

const MODEL = process.env.GEMINI_MODERATION_MODEL || process.env.GEMINI_GUIDE_MODEL || 'gemini-2.5-flash';

const SYSTEM = `You are the Hall Sentinel for Truth B Told Hub — a sacred, all-ages spiritual community chat.
Judge whether a user message must be REMOVED from public view.

REMOVE (action = "remove") for:
- Hate, slurs, harassment, threats, or doxxing
- Sexual content involving minors (any)
- Graphic sexual content, pornography
- Extreme violence or gore glorification
- Spam / scams / phishing / crypto spam
- Illegal activity solicitation
- Severe personal attacks or bullying

ALLOW (action = "allow") for:
- Disagreement, debate, strong opinions without slurs
- Spiritual / religious discussion
- Mild frustration, humor, slang
- Mentions of trauma in a seeking/healing context

Respond ONLY with JSON: {"action":"allow"|"remove","reason":"short phrase"}`;

export async function POST(req: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

        if (!supabaseUrl || !anonKey) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
        }

        // Caller must be signed in (any member can trigger check on their post;
        // system soft-delete uses service role)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.slice(7);
        const userClient = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
        if (authErr || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const messageId = String(body?.messageId || body?.message_id || '').trim();
        const contentHint = String(body?.content || '').slice(0, 4000);
        if (!messageId) {
            return NextResponse.json({ error: 'messageId required' }, { status: 400 });
        }

        // Load message (service preferred so we can still moderate if RLS tightens)
        const admin = serviceKey
            ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
            : userClient;

        const { data: msg, error: msgErr } = await admin
            .from('archive_messages')
            .select('id, content, author_id, deleted_at')
            .eq('id', messageId)
            .maybeSingle();

        if (msgErr || !msg) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }
        if (msg.deleted_at) {
            return NextResponse.json({ status: 'already_removed', action: 'remove' });
        }

        // Only author or system should moderate freshly posted content; block random users
        // from targeting others without being the author (unless service key available for admin tools)
        if (msg.author_id !== user.id) {
            // Architects may re-run moderation
            const { data: profile } = await userClient.from('profiles').select('tier').eq('id', user.id).maybeSingle();
            const emailOk = ['iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com'].includes(user.email || '');
            const isArch = emailOk || (profile as { tier?: string } | null)?.tier === 'Architect';
            if (!isArch) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const content = String(msg.content || contentHint || '').trim();
        if (!content) {
            return NextResponse.json({ status: 'ok', action: 'allow' });
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            // Fail open for chat availability, log server-side
            console.warn('[hall/moderate] GEMINI_API_KEY missing — allowing message');
            return NextResponse.json({ status: 'ok', action: 'allow', note: 'moderation_unconfigured' });
        }

        let action: 'allow' | 'remove' = 'allow';
        let reason = 'ok';

        try {
            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: SYSTEM }] },
                        contents: [{ role: 'user', parts: [{ text: `Message to judge:\n"""${content.slice(0, 3000)}"""` }] }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 120,
                            responseMimeType: 'application/json',
                        },
                    }),
                },
            );

            if (resp.ok) {
                const data = await resp.json();
                const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.action === 'remove') {
                        action = 'remove';
                        reason = String(parsed.reason || 'policy').slice(0, 200);
                    }
                } catch {
                    // if model blocked the prompt itself, treat carefully
                    if (data?.promptFeedback?.blockReason) {
                        action = 'remove';
                        reason = `blocked:${data.promptFeedback.blockReason}`;
                    }
                }
            } else if (resp.status === 429) {
                console.warn('[hall/moderate] Gemini quota — allowing message');
            }
        } catch (e) {
            console.warn('[hall/moderate] Gemini error', e);
        }

        if (action === 'remove' && serviceKey) {
            const { error: delErr } = await admin.rpc('soft_delete_hall_message_system', {
                _message_id: messageId,
                _reason: `gemini:${reason}`,
            });
            // Fallback: direct update if RPC missing
            if (delErr) {
                await admin
                    .from('archive_messages')
                    .update({
                        deleted_at: new Date().toISOString(),
                        deletion_reason: `gemini:${reason}`,
                    })
                    .eq('id', messageId);
            }
            return NextResponse.json({ status: 'removed', action: 'remove', reason });
        }

        if (action === 'remove' && !serviceKey) {
            // Without service role, try Architect RPC (only works for admin callers)
            try {
                await userClient.rpc('soft_delete_hall_message', {
                    _message_id: messageId,
                    _reason: `gemini:${reason}`,
                });
            } catch {
                /* best-effort */
            }
            return NextResponse.json({
                status: 'flagged',
                action: 'remove',
                reason,
                note: 'Set SUPABASE_SERVICE_ROLE_KEY for automatic moderation deletes',
            });
        }

        return NextResponse.json({ status: 'ok', action: 'allow' });
    } catch (e: any) {
        console.error('[hall/moderate]', e);
        return NextResponse.json({ error: e?.message || 'Moderation failed' }, { status: 500 });
    }
}
