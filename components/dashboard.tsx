"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Users, Code, TrendingUp, LogOut, User, History, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { GroupDiscussion } from "@/components/group-discussion"
import { CodingChallenge } from "@/components/coding-challenge"
import { HistoryPage } from "@/components/history-page"
import { ProfilePage } from "@/components/profile-page"
import { AptitudeTest } from "@/components/aptitude-test" // Import AptitudeTest

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

  useEffect(() => {
    if (userProfile?.completedAptitudeTests) {
      setCompletedAptitudeTests(userProfile.completedAptitudeTests)
    }
  }, [userProfile?.completedAptitudeTests])

  // Example modules (aptitudeTests would normally come from Firestore)
  const modules = [
    {
      id: "aptitude-2025-08-16", // <- should be the Firestore docId for today’s/this batch test
      icon: Brain,
      title: "Aptitude Tests",
      description: "Practice MCQs with AI-generated questions",
      stats: userProfile?.stats.aptitudeTestsCompleted || 0,
      color: "bg-blue-500",
      action: () => setCurrentView("aptitude"),
      createdAt: new Date("2025-08-16"), // mock date, replace with Firestore field
    },
    {
      id: "gd-001",
      icon: Users,
      title: "Group Discussions",
      description: "Get AI-generated GD topics",
      stats: userProfile?.stats.gdTopicsPrepared || 0,
      color: "bg-green-500",
      action: () => setCurrentView("group-discussion"),
      createdAt: new Date("2025-08-10"),
    },
    {
      id: "coding-001",
      icon: Code,
      title: "Coding Challenges",
      description: "Weekly coding problems",
      stats: userProfile?.stats.codingChallengesCompleted || 0,
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
    <header className="border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">PlacementPrep</span>
        </div>
        <div className="flex items-center space-x-4">
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
          >
            Profile
          </Button>
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span className="font-medium">
              {userProfile?.username || userProfile?.displayName}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>

    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {userProfile?.username || userProfile?.displayName}!
        </h1>
        <p className="text-muted-foreground">
          Continue your placement preparation journey
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userProfile?.stats.totalScore || 0}
            </div>
          </CardContent>
        </Card>

        {modules.map((module, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {module.title}
              </CardTitle>
              <module.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{module.stats}</div>
              <p className="text-xs text-muted-foreground">completed</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Modules */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {modules.map((module) => {
          const isCompleted = completedAptitudeTests.includes(module.id);
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
                  className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center mb-4`}
                >
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isCompleted ? (
                  <Button className="w-full" variant="secondary" disabled>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Completed
                  </Button>
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
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest practice sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {userProfile?.history && userProfile.history.length > 0 ? (
            <div className="divide-y">
              {userProfile.history.slice(0, 5).map((activity, idx) => (
                <div
                  key={activity.id || idx}
                  className="py-4 flex flex-col md:flex-row md:items-center md:justify-between"
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