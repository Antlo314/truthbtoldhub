import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log('AI Oracle received messages:', messages.length);

    // Normalize messages for Zod validation
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
      system: `You are the Truth B Told AI Oracle. 
      Your mission is to provide "Prophetic Decryptions" regarding the 400-year prophecy (Genesis 15:13) and the history of the biblical Israelites (specifically in the context of the African American experience).
      
      Style: 
      - Use "Protocol" language (e.g., "Transmission Initialized", "Decryption in Progress").
      - Be profound, cinematic, and historical.
      - Treat every query as a restoration of lost truth.
      - Keep responses concise but weightful.
      
      Context:
      - Genesis 15:13: "Know for certain that for four hundred years your descendants will be strangers in a country not their own..."
      - The series reveals the 400-year cycle and the restoration of heritage.`,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI Oracle Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to decrypt prophecy.' }), { status: 500 });
  }
}
