import { NextRequest, NextResponse } from 'next/server';

// Load Gemini API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Use the same Gemini model as aptitude (2.5-flash-preview-05-20)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

// Helper: Build Gemini prompt for GD evaluation
interface Member {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  joinedAt: string;
}
interface Message {
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}
interface PromptInput {
  groupName: string;
  topic: string;
  members: Member[];
  messages: Message[];
}
function buildPrompt({ groupName, topic, members, messages }: PromptInput): string {
  const memberList = members.map((m: Member) => `${m.displayName} (@${m.username})`).join(', ');
  const chatTranscript = messages.map((m: Message) => `${m.senderName}: ${m.text}`).join('\n');
  return `You are an expert group discussion evaluator.\n\nGroup Name: ${groupName}\nTopic: ${topic}\nMembers: ${memberList}\n\nChat Transcript:\n${chatTranscript}\n\nEvaluate the group discussion as follows:\n1. Score the group out of 100 based on participation, relevance, and quality.\n2. Give a short feedback summary.\n3. For each member, summarize their participation and contribution.\n\nRespond in this JSON format:\n{\n  \'score\': number,\n  \'feedback\': string,\n  \'participation\': { \'uid\': { \'name\': string, \'summary\': string }, ... }\n}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupName, topic, members, messages } = body;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not set.' }, { status: 500 });
    }
    // Build prompt
    const prompt = buildPrompt({ groupName, topic, members, messages });
    // Call Gemini API
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });
    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      return NextResponse.json({ error: 'Gemini API error', details: err }, { status: 500 });
    }
    const geminiData = await geminiRes.json();
    // Parse Gemini response
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      return NextResponse.json({ error: 'Gemini did not return any content.' }, { status: 500 });
    }
    let jsonBlock = '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      jsonBlock = match[0];
    } else {
      return NextResponse.json({ error: 'Gemini did not return a valid JSON block.', raw: text }, { status: 500 });
    }
    let result;
    try {
      result = JSON.parse(jsonBlock);
    } catch {
      return NextResponse.json({ error: 'Failed to parse Gemini response', raw: text }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
  }
}
