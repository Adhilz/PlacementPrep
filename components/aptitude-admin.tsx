"use client"

import { useState } from "react"
import { collection, addDoc, getDocs, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const emptyQuestion = {
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  difficulty: "easy" as "easy" | "medium" | "hard",
}

export function AptitudeAdmin() {
  const [questions, setQuestions] = useState([
    { ...emptyQuestion },
    { ...emptyQuestion },
    { ...emptyQuestion },
    { ...emptyQuestion },
    { ...emptyQuestion },
    { ...emptyQuestion },
    { ...emptyQuestion },
    { ...emptyQuestion },
    { ...emptyQuestion },
    { ...emptyQuestion },
  ])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleChange = (field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === current ? { ...q, [field]: value } : q
      )
    )
  }

  const handleOptionChange = (idx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, qidx) =>
        qidx === current
          ? { ...q, options: q.options.map((opt, i) => (i === idx ? value : opt)) }
          : q
      )
    )
  }

  const validateAll = () =>
    questions.every(
      (q) =>
        q.question.trim() &&
        q.options.every((opt) => opt.trim()) &&
        typeof q.correctAnswer === "number" &&
        ["easy", "medium", "hard"].includes(q.difficulty)
    )

  const handleSubmit = async () => {
    if (!validateAll()) {
      setMessage("All questions and options must be filled.")
      return
    }
    setLoading(true)
    setMessage("")
    try {
      // Delete all existing questions
      const snap = await getDocs(collection(db, "aptitude_questions"))
      console.log("Attempting to delete old questions...")
      await Promise.all(snap.docs.map((docu) => deleteDoc(docu.ref)))
      console.log("Old questions deleted. Adding new questions...")
      // Add new questions
       await Promise.all(
      questions.map((q) =>
        addDoc(collection(db, "aptitude_questions"), {
          ...q,
          createdAt: new Date(),
          category: "Aptitude", // <-- Add this line
        })
      )
    )
    console.log("New questions added!")
      // Force reload for all users (optional, but helps in dev)
      if (typeof window !== "undefined") {
        window.location.reload()
      }
      setMessage("10 questions added and replaced successfully!")
    } catch (e) {
      setMessage("Error adding questions.")
    }
    setLoading(false)
  }

  // Gemini AI integration (pseudo)
  const handleGenerateWithGemini = async () => {
    setLoading(true)
    setMessage("Generating questions with Gemini AI...")
    try {
      const res = await fetch("/api/gemini-generate-aptitude", { method: "POST" })
      const data = await res.json()
      if (Array.isArray(data.questions) && data.questions.length === 10) {
        setQuestions(data.questions)
        setCurrent(0)
        setMessage("Gemini questions loaded. Review and submit!")
      } else {
        setMessage("Gemini did not return 10 questions.")
      }
    } catch {
      setMessage("Failed to generate with Gemini.")
    }
    setLoading(false)
  }

  const q = questions[current]

  return (
    <Card className="max-w-xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>
          Add Aptitude Questions ({current + 1}/10)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          className="w-full border rounded p-2"
          placeholder="Question"
          value={q.question}
          onChange={e => handleChange("question", e.target.value)}
        />
        {q.options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              className="flex-1 border rounded p-2"
              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              value={opt}
              onChange={e => handleOptionChange(idx, e.target.value)}
            />
            <input
              type="radio"
              checked={q.correctAnswer === idx}
              onChange={() => handleChange("correctAnswer", idx)}
              name="correct"
            />
            <span>Correct</span>
          </div>
        ))}
        <select
          className="w-full border rounded p-2"
          value={q.difficulty}
          onChange={e => handleChange("difficulty", e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrent((c) => Math.min(9, c + 1))}
            disabled={current === 9}
          >
            Next
          </Button>
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Adding..." : "Replace All with These 10"}
        </Button>
        <Button onClick={handleGenerateWithGemini} variant="outline" disabled={loading}>
          {loading ? "Generating..." : "Generate 10 with Gemini AI"}
        </Button>
        {message && <div className="text-center text-sm mt-2">{message}</div>}
      </CardContent>
    </Card>
  )
}