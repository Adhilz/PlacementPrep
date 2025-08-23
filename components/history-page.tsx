"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Users, Code, ArrowLeft, Calendar, Trophy } from "lucide-react"
import { useEffect, useState } from "react"

// Speedometer component for aptitude test scores
function Speedometer({ percentage, size = 120 }: { percentage: number; size?: number }) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])

  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference

  const getColor = (score: number) => {
    if (score >= 80) return "#10b981" // green
    if (score >= 60) return "#f59e0b" // yellow
    return "#ef4444" // red
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth="8" fill="transparent" />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(percentage)}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-2000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: getColor(percentage) }}>
          {Math.round(animatedPercentage)}%
        </span>
        <span className="text-xs text-muted-foreground">Score</span>
      </div>
    </div>
  )
}

export function HistoryPage({ onBack }: { onBack: () => void }) {
  const { userProfile, getRecentHistory } = useAuth()

  const aptitudeHistory = getRecentHistory("aptitude", 3)
  const gdHistory = getRecentHistory("gd", 3)
  const codingHistory = getRecentHistory("coding", 3)

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto px-2 sm:px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg sm:text-xl font-bold">PlacementPrep - History</span>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Your Learning History</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track your progress across all modules</p>
        </div>

        {/* Aptitude Tests History with Speedometers */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-base sm:text-lg">Aptitude Tests</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Your recent test performances</CardDescription>
          </CardHeader>
          <CardContent>
            {aptitudeHistory && aptitudeHistory.length > 0 ? (
              <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                {aptitudeHistory.map((test, index) => (
                  <div key={test.id} className="border rounded-lg p-3 sm:p-4 bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base">Test #{aptitudeHistory.length - index}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(test.completedAt)}
                        </p>
                      </div>
                      <Speedometer percentage={test.percentage || 0} size={70} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Score:</span>
                        <span className="font-medium">
                          {test.details?.correctAnswers || 0}/{test.details?.totalQuestions || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>Points:</span>
                        <span className="font-medium text-green-600">+{test.score || 0}</span>
                      </div>
                      {test.details?.categoryScores && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium mb-2">Category Breakdown:</p>
                          {Object.entries(test.details.categoryScores).map(([category, data]: [string, any]) => (
                            <div key={category} className="flex justify-between text-xs">
                              <span className="capitalize">{category}:</span>
                              <span>
                                {data.correct}/{data.total}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No aptitude tests completed yet</p>
                <p className="text-xs sm:text-sm">Start practicing to see your progress here!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Discussions History */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-green-500" />
              <CardTitle className="text-base sm:text-lg">Group Discussions</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Topics you've prepared</CardDescription>
          </CardHeader>
          <CardContent>
            {gdHistory && gdHistory.length > 0 ? (
              <div className="flex flex-col gap-4">
                {gdHistory.map((gd, index) => (
                  <div key={gd.id} className="border rounded-lg p-3 sm:p-4 bg-card">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2 text-sm sm:text-base">{gd.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                          {gd.details?.category || "General"} • {gd.details?.difficulty || "Medium"}
                        </p>
                        {gd.details?.notes && <p className="text-xs sm:text-sm bg-muted p-2 rounded">{gd.details.notes}</p>}
                      </div>
                      <div className="text-right ml-0 sm:ml-4">
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(gd.completedAt)}
                        </p>
                        {gd.details?.groupId && <p className="text-xs text-blue-600 mt-1">Group Activity</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No GD topics prepared yet</p>
                <p className="text-xs sm:text-sm">Generate and save topics to see them here!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coding Challenges History */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Code className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-base sm:text-lg">Coding Challenges</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Problems you've solved</CardDescription>
          </CardHeader>
          <CardContent>
            {codingHistory && codingHistory.length > 0 ? (
              <div className="flex flex-col gap-4">
                {codingHistory.map((challenge, index) => (
                  <div key={challenge.id} className="border rounded-lg p-3 sm:p-4 bg-card">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2 text-sm sm:text-base">{challenge.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              challenge.details?.difficulty === "Easy"
                                ? "bg-green-100 text-green-800"
                                : challenge.details?.difficulty === "Medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {challenge.details?.difficulty || "Medium"}
                          </span>
                          <span>{challenge.details?.language || "JavaScript"}</span>
                          <span className="flex items-center">
                            <Trophy className="w-3 h-3 mr-1" />+{challenge.score || 0} pts
                          </span>
                        </div>
                        {challenge.details?.runtime && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                            <span>Runtime: {challenge.details.runtime}</span>
                            <span>Memory: {challenge.details.memory}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-0 sm:ml-4">
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(challenge.completedAt)}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                            challenge.details?.status === "Accepted"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {challenge.details?.status || "Completed"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No coding challenges completed yet</p>
                <p className="text-xs sm:text-sm">Solve problems to see your progress here!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
