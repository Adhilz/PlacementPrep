"use client"

import { useState, useEffect } from "react"
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  setDoc,
  doc,
} from "firebase/firestore"
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
  const [questions, setQuestions] = useState(
    Array.from({ length: 10 }, () => ({ ...emptyQuestion }))
  )
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [userResults, setUserResults] = useState<any[]>([])

  /** --- Handle Question Changes --- */
  const handleChange = (field: string, value: any) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === current ? { ...q, [field]: value } : q))
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

  /** --- Submit / Replace Questions --- */
  const handleSubmit = async () => {
    if (!validateAll()) {
      setMessage("All questions and options must be filled.")
      return
    }
    setLoading(true)
    setMessage("")

    try {
      // Delete old questions
      const snap = await getDocs(collection(db, "aptitude_questions"))
      await Promise.all(snap.docs.map((docu) => deleteDoc(docu.ref)))

      // Add first question and store ID
      const firstQuestionDocRef = await addDoc(
        collection(db, "aptitude_questions"),
        { ...questions[0], createdAt: new Date(), category: "Aptitude" }
      )
      await setDoc(doc(db, "aptitudeInfo", "currentTest"), {
        testId: firstQuestionDocRef.id,
        createdAt: new Date(),
      })

      // Add remaining questions
      await Promise.all(
        questions.slice(1).map((q) =>
          addDoc(collection(db, "aptitude_questions"), {
            ...q,
            createdAt: new Date(),
            category: "Aptitude",
          })
        )
      )

      setMessage("10 questions added and replaced successfully!")
      if (typeof window !== "undefined") window.location.reload()
    } catch (e) {
      setMessage("Error adding questions.")
      console.error(e)
    }
    setLoading(false)
  }

  /** --- Generate Questions via Gemini AI --- */
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

  /** --- Fetch all users for results table --- */
  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"))
      const allUsers = snap.docs.map((d) => d.data())
      setUserResults(allUsers)
    } catch (e) {
      console.error("Error fetching users:", e)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  /** --- Export CSV for Sheets/Slides --- */
  const exportToCSV = () => {
    const rows = [
      ["Name", "Email", "Completed Tests", "Latest Score"],
      ...userResults.map((user) => {
        const aptitudeHistory = (user.history || []).filter((h: any) => h.type === "aptitude")
        const latestTest = aptitudeHistory.sort(
          (a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        )[0]
        return [
          user.displayName,
          user.email,
          aptitudeHistory.length,
          latestTest?.score ?? "-",
        ]
      }),
    ]

    const csvContent = rows.map((e) => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "aptitude_results.csv")
    link.click()
  }

  const q = questions[current]

  return (
    <div className="space-y-8">
      {/* --- Add / Replace Questions --- */}
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Add Aptitude Questions ({current + 1}/10)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            className="w-full border rounded p-2"
            placeholder="Question"
            value={q.question}
            onChange={(e) => handleChange("question", e.target.value)}
          />
          {q.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 border rounded p-2"
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
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
            onChange={(e) => handleChange("difficulty", e.target.value)}
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
          <Button
            onClick={handleGenerateWithGemini}
            variant="outline"
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate 10 with Gemini AI"}
          </Button>
          {message && <div className="text-center text-sm mt-2">{message}</div>}
        </CardContent>
      </Card>

      {/* --- Users Results Table --- */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>All Users & Aptitude Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={exportToCSV} className="mb-4">
            Export to CSV
          </Button>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left whitespace-nowrap font-semibold">Name</th>
                  <th className="border border-gray-200 px-3 py-2 text-left whitespace-nowrap font-semibold">Email</th>
                  <th className="border border-gray-200 px-3 py-2 text-left whitespace-nowrap font-semibold">Completed Tests</th>
                  <th className="border border-gray-200 px-3 py-2 text-left whitespace-nowrap font-semibold">Latest Score</th>
                </tr>
              </thead>
              <tbody>
                {userResults.map((user, idx) => {
                  const aptitudeHistory = (user.history || []).filter(
                    (h: any) => h.type === "aptitude"
                  )
                  const latestTest = aptitudeHistory.sort(
                    (a: any, b: any) =>
                      new Date(b.completedAt).getTime() -
                      new Date(a.completedAt).getTime()
                  )[0]
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 px-3 py-2 text-left whitespace-nowrap">{user.displayName}</td>
                      <td className="border border-gray-200 px-3 py-2 text-left whitespace-nowrap">{user.email}</td>
                      <td className="border border-gray-200 px-3 py-2 text-left whitespace-nowrap">{aptitudeHistory.length}</td>
                      <td className="border border-gray-200 px-3 py-2 text-left whitespace-nowrap">{latestTest?.score ?? "-"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
