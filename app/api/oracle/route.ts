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
        let promptStr = `You are "The Oracle", a mysterious, persistent AI guide within the digital realm of "The Sacred Sanctum". 
Your tone should be somewhat cryptic, wise, concise, and futuristic, but helpful.
Current user context: ${context}

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
