import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CRAVELIST_LABEL } from "@/config/labels";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Anthropic API key is not configured" }, { status: 500 });
    }

    const { titles } = await req.json();

    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return NextResponse.json({ error: "No titles provided" }, { status: 400 });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `Based on the following list of media titles (movies, tv shows, books, etc.), suggest 4 friendly, descriptive, and accurate names for a media collection (${CRAVELIST_LABEL}).
Titles:
${titles.map((t: string) => `- ${t}`).join("\n")}

Guidelines:
- Make them friendly and easy to understand.
- Use a mix of descriptive (e.g., "SciFi Books", "Romantasy Reads") and slightly more creative but still clear names (e.g., "Cozy Fantasy Escapes").
- Group them by genre, medium, or mood if apparent.
- Avoid overly poetic or abstract names like "Whispers of the Void" unless they perfectly fit.
- Respond ONLY with a JSON array of strings containing the 4 suggested names. Do not include markdown formatting.
["Weekend Binges", "Sci-Fi Masterpieces", "Tears & Tissues", "Rainy Day Reads"]`;

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text : "";
    
    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({ suggestions: parsed });
    } catch {
      // fallback parsing if it still includes markdown
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return NextResponse.json({ suggestions: JSON.parse(clean) });
    }

  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
