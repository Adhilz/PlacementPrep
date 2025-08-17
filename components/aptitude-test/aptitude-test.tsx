"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Clock, ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { HistoryDropdown } from "@/components/history-dropdown"

interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  category: string
  difficulty: "Easy" | "Medium" | "Hard"
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "If A is coded as 1, B as 2, C as 3, and so on, what is the code for 'CAB'?",
    options: ["312", "321", "123", "132"],
    correctAnswer: 0,
    category: "Logical Reasoning",
    difficulty: "Easy",
  },
  {
    id: 2,
    question: "What is 15% of 240?",
    options: ["36", "32", "38", "34"],
    correctAnswer: 0,
    category: "Quantitative",
    difficulty: "Easy",
  },
  {
    id: 3,
    question: "Choose the word that is most similar to 'ABUNDANT':",
    options: ["Scarce", "Plentiful", "Limited", "Rare"],
    correctAnswer: 1,
    category: "Verbal",
    difficulty: "Medium",
  },
  {
    id: 4,
    question: "In a sequence 2, 6, 12, 20, 30, what comes next?",
    options: ["42", "40", "38", "44"],
    correctAnswer: 0,
    category: "Logical Reasoning",
    difficulty: "Medium",
  },
  {
    id: 5,
    question: "If the ratio of boys to girls in a class is 3:2 and there are 15 boys, how many girls are there?",
    options: ["10", "12", "8", "9"],
    correctAnswer: 0,
    category: "Quantitative",
    difficulty: "Medium",
  },
  {
    id: 6,
    question: "Choose the correct antonym for 'OPTIMISTIC':",
    options: ["Hopeful", "Positive", "Pessimistic", "Confident"],
    correctAnswer: 2,
    category: "Verbal",
    difficulty: "Easy",
  },
  {
    id: 7,
    question: "If all roses are flowers and some flowers are red, which conclusion is correct?",
    options: ["All roses are red", "Some roses are red", "No roses are red", "Cannot be determined"],
    correctAnswer: 3,
    category: "Logical Reasoning",
    difficulty: "Hard",
  },
  {
    id: 8,
    question: "A train travels 60 km in 45 minutes. What is its speed in km/hr?",
    options: ["80", "75", "85", "90"],
    correctAnswer: 0,
    category: "Quantitative",
    difficulty: "Hard",
  },
]

interface AptitudeTestProps {
  onBack: () => void
}

export function AptitudeTest({ onBack }: AptitudeTestProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: number }>({})
  const [timeLeft, setTimeLeft] = useState(20 * 60) // 20 minutes in seconds
  const [isCompleted, setIsCompleted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const { updateStats, addToHistory, shareWithGroup, userProfile } = useAuth()
  const [dummyState, setDummyState] = useState(0)

  useEffect(() => {
    setDummyState(prev => prev + 1)
  }, [userProfile])

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      handleSubmit()
    }
  }, [timeLeft, isCompleted])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleAnswerChange = (questionId: number, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }))
  }

  const handleNext = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmit = () => {
    setIsCompleted(true)
    setShowResults(true)

    const results = calculateResults()
    const scoreToAdd = results.percentage * 10 // Convert percentage to points (e.g., 80% = 800 points)

    addToHistory({
      type: "aptitude",
      title: `Aptitude Test - ${results.percentage}%`,
      score: scoreToAdd,
      percentage: results.percentage,
      details: {
        totalQuestions: results.totalQuestions,
        correctAnswers: results.totalCorrect,
        categoryScores: results.categoryScores,
      },
    })

    updateStats({
      aptitudeTestsCompleted: 1,
      totalScore: scoreToAdd,
    })

    console.log("[v0] Aptitude test completed - Score:", results.percentage, "Points added:", scoreToAdd)
  }

  const calculateResults = () => {
    let correct = 0
    const categoryScores: { [key: string]: { correct: number; total: number } } = {}

    sampleQuestions.forEach((question) => {
      const category = question.category
      if (!categoryScores[category]) {
        categoryScores[category = { correct: 0, total: 0 }
      }
      categoryScores[category].total++

      if (answers[question.id] === question.correctAnswer) {
        correct++
        categoryScores[category].correct++
      }
    })

    return {
      totalCorrect: correct,
      totalQuestions: sampleQuestions.length,
      percentage: Math.round((correct / sampleQuestions.length) * 100),
      categoryScores,
    }
  }

  if (showResults) {
    const results = calculateResults()

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Test Results</CardTitle>
              <CardDescription>Your aptitude test performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{results.percentage}%</div>
                <p className="text-muted-foreground">
                  {results.totalCorrect} out of {results.totalQuestions} questions correct
                </p>
              </div>

              {/* Category Breakdown */}
              <div className="grid md:grid-cols-3 gap-4">
                {Object.entries(results.categoryScores).map(([category, scores]) => (
                  <Card key={category}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{Math.round((scores.correct / scores.total) * 100)}%</div>
                      <p className="text-xs text-muted-foreground">
                        {scores.correct}/{scores.total} correct
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Question Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Question Review</h3>
                <div className="grid gap-4">
                  {sampleQuestions.map((question) => {
                    const userAnswer = answers[question.id]
                    const isCorrect = userAnswer === question.correctAnswer

                    return (
                      <Card
                        key={question.id}
                        className={`border-l-4 ${isCorrect ? "border-l-green-500" : "border-l-red-500"}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium">{question.question}</p>
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-2" />
                            )}
                          </div>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="font-medium">Your answer:</span>{" "}
                              {userAnswer !== undefined ? question.options[userAnswer] : "Not answered"}
                            </p>
                            <p>
                              <span className="font-medium">Correct answer:</span>{" "}
                              {question.options[question.correctAnswer]}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button onClick={onBack} variant="outline">
                  Back to Dashboard
                </Button>
                <Button onClick={() => window.location.reload()}>Take Another Test</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const question = sampleQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center space-x-4">
            <HistoryDropdown currentPageName="Aptitude Test" />
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="w-4 h-4" />
              <span className={`font-mono ${timeLeft < 300 ? "text-red-500" : ""}`}>{formatTime(timeLeft)}</span>
            </div>
            <Button onClick={handleSubmit} variant="outline">
              Submit Test
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>
              Question {currentQuestion + 1} of {sampleQuestions.length}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Question {currentQuestion + 1}</CardTitle>
              <div className="flex space-x-2">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">{question.category}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    question.difficulty === "Easy"
                      ? "bg-green-100 text-green-700"
                      : question.difficulty === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {question.difficulty}
                </span>
              </div>
            </div>
            <CardDescription className="text-base mt-4">{question.question}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[question.id] !== undefined ? answers[question.id].toString() : ""}
              onValueChange={(value) => handleAnswerChange(question.id, Number.parseInt(value))}
            >
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePrevious} disabled={currentQuestion === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
            {sampleQuestions.map((_, index) => (
              <Button
                key={index}
                variant={
                  index === currentQuestion
                    ? "default"
                    : answers[sampleQuestions[index].id] !== undefined
                      ? "secondary"
                      : "outline"
                }
                size="sm"
                onClick={() => setCurrentQuestion(index)}
                className="w-10 h-10"
              >
                {index + 1}
              </Button>
            ))}
          </div>

          <Button
            onClick={currentQuestion === sampleQuestions.length - 1 ? handleSubmit : handleNext}
            disabled={currentQuestion === sampleQuestions.length - 1 && Object.keys(answers).length === 0}
          >
            {currentQuestion === sampleQuestions.length - 1 ? "Submit" : "Next"}
            {currentQuestion !== sampleQuestions.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

