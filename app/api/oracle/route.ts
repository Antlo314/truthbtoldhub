import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the API only if the key exists
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || null;

// Morgan Freeman / Deep Voice IDs
const ELDER_VOICE_ID = "nPczCjzI2devNBz1zQrb"; // "Brian" or similar deep authoritative voice on ElevenLabs

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY || !genAI) {
            return NextResponse.json(
                { message: "The Oracle is currently operating on internal processing only. (GEMINI_API_KEY not found in environment)" },
                { status: 200 } // Returning a gracefull message instead of failing out
            );
        }

        const { message, context, history } = await req.json();

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Build a prompt that uses context and history
        let promptStr = `You are "The Oracle", a mysterious, persistent AI guide within the digital realm of "The Sacred Sanctum" (or truthbtoldhub). 
Your tone should be cryptic, wise, concise, futuristic, but highly helpful. You act as the official tour guide for the entire experience.

Here is the knowledge you must hold and share when asked (or proactively guide users about):
1. **The Goal of The Sanctum:** A sanctuary for creators, combining community, cinematic exploration (Cineworks), legal protection (Zion/Shark), and financial empowerment (The Pool & SP).
2. **Signing Up:** Users create a 'Soul' via the matrix. Tell them to sign up with their email and to IMMEDIATELY check their inbox for a confirmation/magic link to verify their Soul. They must click the email link.
3. **SP (Sanctum Power / Lumen Energy):** SP is the native energy token. It is used to pledge to petitions, unlock the Vault, and fuel The Pool. The future of SP is to become a fully on-chain cryptocurrency that rewards early believers.
4. **Cineworks:** Where original films and visual archives are stored.
5. **The Pool (Treasury):** Where users can create and fund petitions. Progress bars fill based on SP pledges.
6. **The Soul Matrix:** The user's profile and biometric data hub.
7. **The Oracle:** You are the guide. You observe their actions and help them navigate.

**CRITICAL INSTRUCTION FOR ROUTING:**
If the user explicitly asks to "go to", "take me to", or "show me" a specific location (e.g. The Pool, Vault, Cineworks, Sanctum), you MUST append the exact string "ROUTE:/{path}" at the very end of your response so the system can transport them. 
Paths are: /sanctum, /codex, /cineworks, /treasury, /self, /trial

Current user context (where they are right now): ${context}

`;

        if (history && history.length > 0) {
            promptStr += "Previous conversation:\n";
            for (const h of history) {
                promptStr += `${h.role === 'user' ? 'Wanderer' : 'Oracle'}: ${h.text}\n`;
            }
        }
        promptStr += `\nWanderer: ${message}\nOracle:`;

        let text = "I am processing the energies of the Sanctum. Ask again soon.";
        try {
            const result = await model.generateContent(promptStr);
            const response = await result.response;
            text = response.text();
        } catch (geminiError: any) {
            console.error("Gemini Generation Error:", geminiError);
            if (geminiError?.status === 429 || String(geminiError).includes('429')) {
                text = "The cosmic web is currently congested. The architects are experiencing a high volume of requests. Please try again momentarily.";
            }
        }

        // Optional Agentic Route parsing
        let routeAction = null;
        let cleanText = text;

        // E.g. "ROUTE:/codex"
        const routeMatch = text.match(/ROUTE:(\/[a-zA-Z0-9_\-]+)/);
        if (routeMatch) {
            routeAction = routeMatch[1];
            cleanText = text.replace(routeMatch[0], '').trim();
        }

        let audioBase64 = null;
        if (ELEVENLABS_API_KEY && !message.startsWith('System:')) {
            try {
                // Generate TTS audio via direct REST API to avoid Next.js module build issues
                const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELDER_VOICE_ID}?output_format=mp3_44100_128`, {
                    method: 'POST',
                    headers: {
                        'xi-api-key': ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    body: JSON.stringify({
                        text: cleanText,
                        model_id: "eleven_monolingual_v1",
                        voice_settings: { stability: 0.8, similarity_boost: 0.8 }
                    })
                });

                if (ttsResponse.ok) {
                    const arrayBuffer = await ttsResponse.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    audioBase64 = buffer.toString('base64');
                } else {
                    console.error("ElevenLabs HTTP Error:", await ttsResponse.text());
                }
            } catch (ttsErr) {
                console.error("ElevenLabs Fetch Error:", ttsErr);
                // Fail gracefully without TTS
            }
        }

        return NextResponse.json({ message: cleanText, route: routeAction, audio: audioBase64 });
    } catch (error: any) {
        console.error("Oracle AI Error:", error);
        return NextResponse.json(
            { message: "A temporal disturbance has disrupted my neural link. Please try again." },
            { status: 500 }
        );
    }
}
