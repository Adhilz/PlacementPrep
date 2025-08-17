import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { category, difficulty } = await request.json()

    // For demo purposes, we'll use sample topics instead of actual Gemini API
    // In production, you would integrate with Gemini API here
    const sampleTopics = {
      "Current Affairs": {
        Easy: [
          "Should social media platforms be regulated by the government?",
          "Is remote work the future of employment?",
          "Should electric vehicles be mandatory by 2030?",
        ],
        Medium: [
          "Impact of artificial intelligence on job market and society",
          "Climate change: Individual responsibility vs corporate accountability",
          "Digital privacy vs national security in the modern world",
        ],
        Hard: [
          "Geopolitical implications of cryptocurrency adoption by nations",
          "Ethical considerations in gene editing and human enhancement",
          "The role of international organizations in global governance",
        ],
      },
      Technology: {
        Easy: [
          "Should children have access to smartphones?",
          "Is online education as effective as traditional classroom learning?",
          "Should companies be allowed to track user data for advertising?",
        ],
        Medium: [
          "The impact of automation on employment and economic inequality",
          "Cybersecurity challenges in an increasingly connected world",
          "The role of big tech companies in shaping public opinion",
        ],
        Hard: [
          "Quantum computing: Revolutionary potential and security implications",
          "The ethics of artificial general intelligence development",
          "Blockchain technology beyond cryptocurrency: transforming industries",
        ],
      },
      Business: {
        Easy: [
          "Should companies prioritize profit or social responsibility?",
          "Is entrepreneurship better than traditional employment?",
          "Should businesses be required to hire locally?",
        ],
        Medium: [
          "The gig economy: Freedom or exploitation of workers?",
          "Corporate sustainability: Genuine commitment or greenwashing?",
          "The future of retail: Online vs brick-and-mortar stores",
        ],
        Hard: [
          "Stakeholder capitalism vs shareholder primacy in modern business",
          "The role of ESG investing in driving corporate behavior change",
          "Globalization vs localization: Finding the optimal business strategy",
        ],
      },
    }

    const topics =
      sampleTopics[category as keyof typeof sampleTopics]?.[
        difficulty as keyof (typeof sampleTopics)[keyof typeof sampleTopics]
      ]

    if (!topics) {
      return NextResponse.json({ error: "Invalid category or difficulty" }, { status: 400 })
    }

    const randomTopic = topics[Math.floor(Math.random() * topics.length)]

    // Generate supporting points
    const supportingPoints = [
      "Consider the economic implications and market dynamics",
      "Analyze the social impact on different demographic groups",
      "Evaluate the technological feasibility and implementation challenges",
      "Examine the regulatory and legal framework requirements",
      "Assess the long-term sustainability and environmental effects",
    ].slice(0, 3)

    return NextResponse.json({
      topic: randomTopic,
      category,
      difficulty,
      supportingPoints,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error generating GD topic:", error)
    return NextResponse.json({ error: "Failed to generate topic" }, { status: 500 })
  }
}
