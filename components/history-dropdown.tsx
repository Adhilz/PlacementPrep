"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, History, Brain, Users, Code, Calendar, Trophy } from "lucide-react"
import { useState } from "react"

interface HistoryDropdownProps {
  currentPageName: string
}

export function HistoryDropdown({ currentPageName }: HistoryDropdownProps) {
  const { getRecentHistory } = useAuth()
  const [showHistory, setShowHistory] = useState(false)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "aptitude":
        return Brain
      case "gd":
        return Users
      case "coding":
        return Code
      default:
        return History
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "aptitude":
        return "Aptitude Test"
      case "gd":
        return "Group Discussion"
      case "coding":
        return "Coding Challenge"
      default:
        return type
    }
  }

  if (showHistory) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent History
              </CardTitle>
              <CardDescription>Your last 3 activities from each module</CardDescription>
            </div>
            <Button variant="outline" onClick={() => setShowHistory(false)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="overflow-y-auto">
            <div className="grid gap-6">
              {/* Aptitude Tests History */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-500" />
                  Aptitude Tests
                </h3>
                <div className="space-y-2">
                  {getRecentHistory("aptitude", 3).length > 0 ? (
                    getRecentHistory("aptitude", 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.completedAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          {item.percentage && <p className="font-semibold text-blue-600">{item.percentage}%</p>}
                          {item.score && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {item.score} pts
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No aptitude tests completed yet</p>
                  )}
                </div>
              </div>

              {/* Group Discussions History */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  Group Discussions
                </h3>
                <div className="space-y-2">
                  {getRecentHistory("gd", 3).length > 0 ? (
                    getRecentHistory("gd", 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.completedAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-600 font-medium">Topic Prepared</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No GD topics prepared yet</p>
                  )}
                </div>
              </div>

              {/* Coding Challenges History */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-500" />
                  Coding Challenges
                </h3>
                <div className="space-y-2">
                  {getRecentHistory("coding", 3).length > 0 ? (
                    getRecentHistory("coding", 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.completedAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          {item.score && (
                            <p className="font-semibold text-purple-600 flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {item.score} pts
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No coding challenges completed yet</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
          <span>{currentPageName}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{currentPageName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowHistory(true)} className="flex items-center gap-2">
          <History className="w-4 h-4" />
          History
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
