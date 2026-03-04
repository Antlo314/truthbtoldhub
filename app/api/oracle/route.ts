import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the API only if the key exists
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

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

Current user context (where they are right now): ${context}

`;

        if (history && history.length > 0) {
            promptStr += "Previous conversation:\n";
            for (const h of history) {
                promptStr += `${h.role === 'user' ? 'Wanderer' : 'Oracle'}: ${h.text}\n`;
            }
        }
        promptStr += `\nWanderer: ${message}\nOracle:`;

        const result = await model.generateContent(promptStr);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ message: text });
    } catch (error) {
        console.error("Oracle AI Error:", error);
        return NextResponse.json(
            { message: "A temporal disturbance has disrupted my neural link. Please try again." },
            { status: 500 }
        );
    }
}
