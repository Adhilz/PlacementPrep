// app/api/gemini-generate-aptitude/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Your existing API logic goes here
  const prompt = `{
   "Generate an array of exactly 10 advanced aptitude questions in JSON format. 
The questions should be highly challenging, designed for final-year students preparing for software developer job interviews. 
Focus only on complex aptitude topics such as puzzles, logical reasoning, quantitative aptitude, probability, permutations & combinations, time & work, and critical problem-solving. 
Avoid coding, DSA, or technical questions — keep them purely aptitude.

Rules for generation:
- All 10 questions must be of medium or hard difficulty (no easy ones).
- Each JSON object should have:
  - question (string)
  - options (array of exactly 4 strings)
  - correctAnswer (number, 0-based index)
  - difficulty (string: "medium" or "hard")

Output format:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "difficulty": "hard"
    },
    ...
  ]
}

Important:
- Do NOT include explanations or solutions in the output.
- Return only valid JSON that can be parsed directly.
- Ensure questions are non-trivial, require logical/quantitative reasoning, and are at the level of competitive placement exams."

}`;

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