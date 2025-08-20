"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight } from "lucide-react"

import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { v4 as uuidv4 } from 'uuid'; // Import UUID library

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  difficulty: "easy" | "medium" | "hard"
  category?: string
}

export function AptitudeTest() {
  const { userProfile, updateStats, addToHistory, updateUserProfile } = useAuth()
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(1800) // 30 minutes
  const [isCompleted, setIsCompleted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true) // Start with loading set to true
  const [error, setError] = useState("")
  const [aptitudeTestId, setAptitudeTestId] = useState<string>(''); //Test Id

    useEffect(() => {
        const newId = uuidv4();
        setAptitudeTestId(newId);
    }, []);
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError("");
      try {
        const q = query(collection(db, "aptitude_questions"), orderBy("createdAt"));
        const snapshot = await getDocs(q);
        const fetched: Question[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Question, "id">),
        }));
        setQuestions(fetched);
        setSelectedAnswers(Array(fetched.length).fill(-1));
      } catch (e) {
        setError("Failed to load questions.");
      }
      setLoading(false);
    };
    fetchQuestions();
    if (typeof window !== "undefined") {
      localStorage.removeItem("aptitudeQuestionsNew");
    }
  }, [])

  useEffect(() => {
    if (timeLeft > 0 && !isCompleted && questions.length > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && questions.length > 0) {
      handleSubmitTest()
    }
  }, [timeLeft, isCompleted, questions])

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmitTest = async () => {
    setIsCompleted(true)
    setShowResults(true)

    const correctAnswers = selectedAnswers.filter(
      (answer, index) => answer === questions[index]?.correctAnswer,
    ).length

    const score = Math.round((correctAnswers / questions.length) * 100)

    // Update user stats
    await updateStats({
      aptitudeTestsCompleted: 1,
      totalScore: score,
    })

    // Add to history
    await addToHistory({
      type: "aptitude",
      title: "Aptitude Test",
      score,
      percentage: score,
      details: {
        correctAnswers,
        totalQuestions: questions.length,
        selectedAnswers,
      },
    })

      if (userProfile && updateUserProfile && aptitudeTestId) {
          const updatedCompletedAptitudeTests = [...(userProfile.completedAptitudeTests || []), aptitudeTestId];
        await updateUserProfile({
          completedAptitudeTests: updatedCompletedAptitudeTests,
        });
      }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const correctAnswers = selectedAnswers.filter(
    (answer, index) => answer === questions[index]?.correctAnswer,
  ).length

  // --- Crucial addition to handle loading and empty state ---
  if (loading) {
    return <div className="text-center p-8">Loading questions...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  if (questions.length === 0) {
    return <div className="text-center p-8">No questions found. Please check back later.</div>;
  }

  // --- Now that we know questions[currentQuestion] exists, we can use it safely ---
  const currentQ = questions[currentQuestion];
if (showResults) {
  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center px-2 sm:px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Test Completed!</CardTitle>
          <CardDescription className="text-sm sm:text-base">Here are your results</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 sm:space-y-6 px-2 sm:px-6">
          {/* Score Section */}
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-1 sm:mb-2">
              {Math.round((correctAnswers / questions.length) * 100)}%
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {correctAnswers} out of {questions.length} questions correct
            </p>
          </div>

          {/* Question Results */}
          <div className="space-y-3 sm:space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm sm:text-base">Question {index + 1}</h4>
                  {selectedAnswers[index] === question.correctAnswer ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                  {question.question}
                </p>
                <p className="text-xs sm:text-sm">
                  <span className="font-medium">Correct Answer:</span>{" "}
                  {question.options[question.correctAnswer]}
                </p>
                {selectedAnswers[index] !== question.correctAnswer && (
                  <p className="text-xs sm:text-sm text-red-600">
                    <span className="font-medium">Your Answer:</span>{" "}
                    {question.options[selectedAnswers[index]] || "Not answered"}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  {question.explanation}
                </p>
              </div>
            ))}
          </div>

          {/* Button */}
          <Button className="w-full text-sm sm:text-base py-2 sm:py-3" onClick={() => window.location.reload()}>
            Take Another Test
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


 return (
    <div className="container mx-auto px-2 sm:px-4 py-8 max-w-full overflow-hidden">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Sticky Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky top-0 bg-white z-40 p-2 sm:p-4 shadow">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Aptitude Test</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(timeLeft)}</span>
            <Badge variant={timeLeft < 300 ? "destructive" : "secondary"}>
              {timeLeft < 300 ? "Hurry!" : "Time Left"}
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />

        {/* Question */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex justify-between">
              <Badge variant="outline">{currentQ.category}</Badge>
              <Badge
                variant={
                  currentQ.difficulty === "easy"
                    ? "secondary"
                    : currentQ.difficulty === "medium"
                    ? "default"
                    : "destructive"
                }
              >
                {currentQ.difficulty}
              </Badge>
            </div>
            <CardTitle className="text-base sm:text-xl">{currentQ.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQ.options.map((option, i) => (
              <Button
                key={i}
                variant={selectedAnswers[currentQuestion] === i ? "default" : "outline"}
                className="w-full justify-start text-left h-auto p-3 sm:p-4 whitespace-normal break-words"
                onClick={() => handleAnswerSelect(i)}
              >
                <span className="font-medium mr-2 sm:mr-3">{String.fromCharCode(65 + i)}.</span>
                {option}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion(currentQuestion - 1)}>
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> Prev
          </Button>
          {currentQuestion === questions.length - 1 ? (
            <Button onClick={handleSubmitTest} className="px-6 sm:px-8">
              Submit
            </Button>
          ) : (
            <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>
              Next <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
            </Button>
          )}
        </div>

        {/* Question Navigator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {questions.map((_, i) => (
                <Button
                  key={i}
                  variant={
                    i === currentQuestion
                      ? "default"
                      : selectedAnswers[i] !== undefined && selectedAnswers[i] !== -1
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  className="aspect-square text-xs sm:text-sm"
                  onClick={() => setCurrentQuestion(i)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}