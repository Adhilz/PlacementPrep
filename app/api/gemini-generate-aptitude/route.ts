// app/api/gemini-generate-aptitude/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Your existing API logic goes here
  const prompt = `Generate an array of 10 aptitude test questions in JSON format. The questions should cover Logical Reasoning, Quantitative, and Verbal categories. The difficulties should be a mix of easy, medium, and hard. For each question, include the following fields:
- question (string): The question text.
- options (array of strings): Exactly 4 answer options.
- correctAnswer (number): The 0-based index of the correct answer within the options array.
- category (string): The category of the question (e.g., "Logical Reasoning", "Quantitative", or "Verbal").
- difficulty (string): The difficulty of the question ("easy", "medium", or "hard").`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        "type": "ARRAY",
        "items": {
          "type": "OBJECT",
          "properties": {
            "question": { "type": "STRING" },
            "options": {
              "type": "ARRAY",
              "items": { "type": "STRING" }
            },
            "correctAnswer": { "type": "NUMBER" },
            "category": { "type": "STRING" },
            "difficulty": { "type": "STRING" }
          },
          "propertyOrdering": ["question", "options", "correctAnswer", "category", "difficulty"]
        }
      }
    }
  };

    const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    const generatedContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (generatedContent) {
      const parsedQuestions = JSON.parse(generatedContent);
      return NextResponse.json({ questions: parsedQuestions });
    } else {
      return NextResponse.json({ message: 'Failed to generate content from Gemini.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}