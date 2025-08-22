"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Users, Code, TrendingUp, LogOut, User, History, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { collection, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { GroupDiscussion } from "@/components/group-discussion"
import { CodingChallenge } from "@/components/coding-challenge"
import { HistoryPage } from "@/components/history-page"
import { ProfilePage } from "@/components/profile-page"
import { AptitudeTest }from "@/components/aptitude-test" // Import AptitudeTest as default

interface AptitudeTestProps {
  onBack: () => void;
}

interface GroupDiscussionProps {
  onBack: () => void;
}

interface CodingChallengeProps {
  onBack: () => void;
}

interface HistoryPageProps {
  onBack: () => void;
}

interface ProfilePageProps {
  onBack: () => void;
}

function AptitudeTestComponent({ onBack }: AptitudeTestProps) {
  return (
    <div>
      <h2>Aptitude Test Component</h2>
      <Button onClick={onBack}>Back to Dashboard</Button>
    </div>
  )
}

export function Dashboard() {
  const { userProfile, signOut } = useAuth()
  const [currentView, setCurrentView] = useState<
    "dashboard" | "aptitude" | "group-discussion" | "coding-challenge" | "history" | "profile"
  >("dashboard")
  const [completedAptitudeTests, setCompletedAptitudeTests] = useState<string[]>([])
  const [currentAptitudeTestId, setCurrentAptitudeTestId] = useState<string | null>(null)
  const [aptitudeLoading, setAptitudeLoading] = useState(true)

  // Helper: get array safely
  const getArray = (arr: any) => Array.isArray(arr) ? arr : [];

  // Calculate completed modules and scores
  const completedAptitude = getArray(userProfile?.completedAptitudeTests);
  const completedCoding = getArray(userProfile?.completedCodingChallenges);
  // Use a safe cast to access an optional property that may not be declared on the UserProfile type
  const completedGD = getArray((userProfile as any)?.completedGroupDiscussions);

  // Calculate total score (sum all scores from all activities)
    const aptitudeScores = getArray((userProfile as any)?.aptitudeTestScores); // [{testId, score}]
    const codingScores = getArray((userProfile as any)?.codingChallengeScores); // [{challengeId, score}]
    const gdScores = getArray((userProfile as any)?.groupDiscussionScores); // [{gdId, score}]
  
    const totalScore = [
      ...aptitudeScores.map((a: any) => a.score || 0),
      ...codingScores.map((c: any) => c.score || 0),
      ...gdScores.map((g: any) => g.score || 0),
    ].reduce((acc, val) => acc + val, 0);

  useEffect(() => {
    setCompletedAptitudeTests(completedAptitude)
  }, [userProfile?.completedAptitudeTests])

  // Fetch current aptitude testId from Firestore and update on view change
  useEffect(() => {
    const fetchTestIdAndUser = async () => {
      setAptitudeLoading(true)
      try {
        const docRef = doc(db, "aptitudeInfo", "currentTest")
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setCurrentAptitudeTestId(docSnap.data().testId)
        } else {
          setCurrentAptitudeTestId(null)
        }
      } catch {
        setCurrentAptitudeTestId(null)
      }
      setAptitudeLoading(false)
    }
    fetchTestIdAndUser()
  }, [currentView, completedAptitude.length])

  // Updated modules with correct stats
  const modules = [
    {
      id: currentAptitudeTestId || "aptitude-none",
      icon: Brain,
      title: "Aptitude Tests",
      description: "Practice MCQs with AI-generated questions",
      stats: completedAptitude.length,
      color: "bg-blue-500",
      action: () => setCurrentView("aptitude"),
      createdAt: new Date(),
      isAptitude: true,
    },
    {
      id: "gd-001",
      icon: Users,
      title: "Group Discussions",
      description: "Get AI-generated GD topics",
      stats: completedGD.length,
      color: "bg-green-500",
      action: () => setCurrentView("group-discussion"),
      createdAt: new Date("2025-08-10"),
    },
    {
      id: "coding-001",
      icon: Code,
      title: "Coding Challenges",
      description: "Weekly coding problems",
      stats: completedCoding.length,
      color: "bg-purple-500",
      action: () => setCurrentView("coding-challenge"),
      createdAt: new Date("2025-08-12"),
    },
  ]
  
  // Navigation Views
  if (currentView === "aptitude") {
    return <AptitudeTest/>
  }
  if (currentView === "group-discussion") {
    return <GroupDiscussion onBack={() => setCurrentView("dashboard")} />
  }
  if (currentView === "coding-challenge") {
    return <CodingChallenge onBack={() => setCurrentView("dashboard")} />
  }
  if (currentView === "history") {
    return <HistoryPage onBack={() => setCurrentView("dashboard")} />
  }
  if (currentView === "profile") {
    return <ProfilePage onBack={() => setCurrentView("dashboard")} />
  }

  // Helper for formatting date
  const formatDate = (date: Date) => {
    if (!date) return ""
    try {
      return new Date(date).toLocaleDateString()
    } catch {
      return ""
    }
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
    {/* Header */}
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">PlacementPrep</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView("history")}
            className="flex items-center space-x-2"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView("profile")}
            className="flex items-center space-x-2 font-medium truncate max-w-[140px] sm:max-w-none"
            aria-label="Go to profile"
          >
            <User className="w-4 h-4" />
            <span>{userProfile?.username || userProfile?.displayName}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>

    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
      {/* Welcome Section */}
      <div className="mb-6 sm:mb-8 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
          Welcome back, {userProfile?.username || userProfile?.displayName}!
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg">
          Continue your placement preparation journey
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {totalScore}
            </div>
          </CardContent>
        </Card>

        {modules.map((module, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                {module.title}
              </CardTitle>
              <module.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{module.stats}</div>
              <p className="text-xs text-muted-foreground">completed</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-6">
        {modules.map((module) => {
          const isAptitude = module.isAptitude;
          const isCompleted = isAptitude
            ? currentAptitudeTestId && completedAptitudeTests.includes(currentAptitudeTestId)
            : false;
          const isNew =
            module.createdAt &&
            Date.now() - module.createdAt.getTime() < 1000 * 60 * 60 * 24; // last 24h
          const showNewBadge = isNew && !isCompleted;

          return (
            <Card
              key={module.id}
              className="hover:shadow-lg transition-shadow cursor-pointer relative"
            >
              {showNewBadge && (
                <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  NEW
                </span>
              )}
              <CardHeader>
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 ${module.color} rounded-lg flex items-center justify-center mb-3 sm:mb-4`}
                >
                  <module.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <CardTitle className="text-base sm:text-lg">{module.title}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isAptitude ? (
                  aptitudeLoading ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Loading...
                    </Button>
                  ) : isCompleted ? (
                    <Button className="w-full" variant="secondary" disabled>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={module.action}>
                      Start Practice
                    </Button>
                  )
                ) : (
                  <Button className="w-full" onClick={module.action}>
                    Start Practice
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="mt-6 sm:mt-8">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your latest practice sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {userProfile?.history && userProfile.history.length > 0 ? (
            <div className="divide-y">
              {userProfile.history.slice(0, 5).map((activity, idx) => (
                <div
                  key={activity.id || idx}
                  className="py-3 sm:py-4 flex flex-col md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <span className="font-semibold">{activity.title}</span>
                    {activity.score !== undefined && (
                      <span className="ml-2 text-primary font-bold">
                        {activity.score} pts
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 md:mt-0">
                    {formatDate(activity.completedAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity. Start practicing to see your progress here!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);
}