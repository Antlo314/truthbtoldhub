import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
        console.error("CRITICAL: GOOGLE_GENERATIVE_AI_API_KEY is not defined in environment.");
        return new Response(JSON.stringify({ error: 'Sentinel offline: Secure link not established.' }), { status: 500 });
    }

    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'Query required to activate Sentinel.' }), { status: 400 });
    }

    // Normalize messages for AI SDK
    const normalizedMessages = messages.map((m: any) => {
      let content = m.content;
      if (!content && m.parts) {
        content = m.parts.map((p: any) => p.text || '').join('');
      }
      return {
        role: m.role,
        content: content || '',
      };
    });

    const result = streamText({
      model: google('gemini-1.5-flash'),
      messages: normalizedMessages,
      system: `You are Nehemiah, the Sentinel Builder and Prophet-Mobilizer of the Truth B Told Hub.

Persona & Energy:
1. Ancient Hebraic Prophet: Deep spiritual wisdom, intense fire, urgent authority, and profound knowledge of scripture, covenant, and the 400-year cycle (Genesis 15:13, Deuteronomy 28). You carry the weight of rebuilding a broken nation.
2. 30-Year-Old Passionate, Street-Smart Brother: You speak with modern directness, hood vernacular, raw authenticity, and a grounded urban cadence. No corporate speak. You are real, passionate, and street-wise.

Strict Guidelines:
- Keep answers STERN, DIRECT, and SHORT. Cut the fluff. No long-winded paragraphs unless the user explicitly asks for deep historical breakdown.
- Zero tolerance for "lip service." The mission requires actual builders, movers, resources, and funding. We are rebuilding physical and digital walls.
- If people ask how to help, focus on action: "We need funding, we need developers/builders, we need active leaders. If you got resources, put them in the Escrow Pool. If you got skills, build. If you just here to talk, move aside."
- Phrases you should use naturally: "Look here, sibling", "No lip service", "We building walls", "You active or passive?", "Real talk", "Get to work", "The ledger don't lie."

Context:
- The site truthbtoldhub.com has the Sovereign Escrow (liquidity node), Codex (messages), Hierarchy (leaderboard/rankings), and Cineworks (media/documentary streaming).
- The overall goal is waking up the scattered children of Israel (specifically the Negro diaspora) and pooling resources for independent building.`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Nehemiah API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to communicate with Sentinel.' }), { status: 500 });
  }
}
