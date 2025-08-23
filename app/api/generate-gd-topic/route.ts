import { type NextRequest, NextResponse } from "next/server"
// Gemini API integration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { category, difficulty } = await request.json();
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

  // Compose prompt for Gemini (natural, plain English, no code blocks, no JSON)
  const prompt = `Generate a unique, current, and relevant group discussion topic for the following category and difficulty.\n\nCategory: ${category}\nDifficulty: ${difficulty}\n\nRespond ONLY in this format:\nTopic: <the topic in one sentence>\n1. <supporting point 1>\n2. <supporting point 2>\n3. <supporting point 3>\n\nDo not use code blocks, markdown, or JSON. Do not include explanations or extra text. Only return the topic and 3 points as above.`;

    // Call Gemini API (Google Generative Language API)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });
    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return NextResponse.json({ error: "Gemini API error", details: err }, { status: 500 });
    }
    const geminiData = await geminiRes.json();
    // Parse Gemini response
    let topic = "";
    let supportingPoints: string[] = [];
    try {
      let text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Remove code block markers if present
      text = text.replace(/^```[a-zA-Z]*\s*|```$/g, "").trim();
      // Extract topic and points from plain text
      const topicMatch = text.match(/^Topic\s*[:\-]\s*(.+)$/im);
      topic = topicMatch ? topicMatch[1].trim() : text.split("\n")[0].replace(/^Topic\s*[:\-]\s*/i, "").trim();
      supportingPoints = text.match(/^\d+\.\s+(.+)$/gm)?.map((s: string) => s.replace(/^\d+\.\s+/, "").trim()) || [];
      // Fallback: if no points, try splitting lines after topic
      if (supportingPoints.length === 0) {
  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 1) supportingPoints = lines.slice(1, 4);
      }
    } catch (e) {
      topic = "";
      supportingPoints = [];
    }
    if (!topic) {
      return NextResponse.json({ error: "Gemini did not return a topic" }, { status: 500 });
    }
    return NextResponse.json({
      topic,
      category,
      difficulty,
      supportingPoints: supportingPoints.slice(0, 3),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating GD topic:", error);
    return NextResponse.json({ error: "Failed to generate topic" }, { status: 500 });
  }
}
