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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
        <Card className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-hidden rounded-xl">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-6 pt-4 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <History className="w-5 h-5" />
                Recent History
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your last 3 activities from each module</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowHistory(false)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="overflow-y-auto px-2 sm:px-6 pb-4 max-h-[70vh]">
            <div className="flex flex-col gap-4">
              {/* Aptitude Tests History */}
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-2 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-500" />
                  Aptitude Tests
                </h3>
                <div className="flex flex-col gap-2">
                  {getRecentHistory("aptitude", 3).length > 0 ? (
                    getRecentHistory("aptitude", 3).map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.completedAt)}
                          </p>
                        </div>
                        <div className="text-right min-w-[70px]">
                          {item.percentage && <p className="font-semibold text-blue-600 text-xs">{item.percentage}%</p>}
                          {item.score && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              {item.score} pts
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-3 text-xs">No aptitude tests completed yet</p>
                  )}
                </div>
              </div>

              {/* Group Discussions History */}
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  Group Discussions
                </h3>
                <div className="flex flex-col gap-2">
                  {getRecentHistory("gd", 3).length > 0 ? (
                    getRecentHistory("gd", 3).map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.completedAt)}
                          </p>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <p className="text-xs text-green-600 font-medium">Topic Prepared</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-3 text-xs">No GD topics prepared yet</p>
                  )}
                </div>
              </div>

              {/* Coding Challenges History */}
              <div>
                <h3 className="font-semibold text-base sm:text-lg mb-2 flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-500" />
                  Coding Challenges
                </h3>
                <div className="flex flex-col gap-2">
                  {getRecentHistory("coding", 3).length > 0 ? (
                    getRecentHistory("coding", 3).map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.completedAt)}
                          </p>
                        </div>
                        <div className="text-right min-w-[70px]">
                          {item.score && (
                            <p className="font-semibold text-purple-600 flex items-center gap-1 text-xs">
                              <Trophy className="w-3 h-3" />
                              {item.score} pts
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-3 text-xs">No coding challenges completed yet</p>
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
