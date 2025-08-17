"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Lightbulb, RefreshCw, Save, Clock, Users } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { HistoryDropdown } from "@/components/history-dropdown"

interface GDTopic {
  topic: string
  category: string
  difficulty: string
  supportingPoints: string[]
  generatedAt: string
}

interface SavedTopic extends GDTopic {
  id: string
  notes: string
  savedAt: string
}

interface GroupMember {
  uid: string
  username: string
  displayName: string
  photoURL?: string
  joinedAt: string
}

interface DiscussionGroup {
  id: string
  name: string
  topic: string
  category: string
  difficulty: string
  createdBy: string
  members: GroupMember[]
  maxMembers: number
  createdAt: string
  status: "waiting" | "active" | "completed"
}

interface GroupDiscussionProps {
  onBack: () => void
}

export function GroupDiscussion({ onBack }: GroupDiscussionProps) {
  const [currentTopic, setCurrentTopic] = useState<GDTopic | null>(null)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState("Current Affairs")
  const [difficulty, setDifficulty] = useState("Medium")
  const [notes, setNotes] = useState("")
  const [savedTopics, setSavedTopics] = useState<SavedTopic[]>([])
  const [activeView, setActiveView] = useState<"generate" | "saved" | "groups">("generate")
  const [groups, setGroups] = useState<DiscussionGroup[]>([])
  const [currentGroup, setCurrentGroup] = useState<DiscussionGroup | null>(null)
  const [groupName, setGroupName] = useState("")
  const [maxMembers, setMaxMembers] = useState(4)
  const [availableUsers, setAvailableUsers] = useState<GroupMember[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const { updateStats, userProfile, addToHistory, shareWithGroup } = useAuth()
  const [loadingUsers, setLoadingUsers] = useState(false)

  const categories = ["Current Affairs", "Technology", "Business"]
  const difficulties = ["Easy", "Medium", "Hard"]

  const generateTopic = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/generate-gd-topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category, difficulty }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate topic")
      }

      const topic = await response.json()
      setCurrentTopic(topic)
      setNotes("")
    } catch (error) {
      console.error("Error generating topic:", error)
      // Fallback topic for demo
      setCurrentTopic({
        topic: "The impact of artificial intelligence on future job markets",
        category,
        difficulty,
        supportingPoints: [
          "Consider the economic implications and market dynamics",
          "Analyze the social impact on different demographic groups",
          "Evaluate the technological feasibility and implementation challenges",
        ],
        generatedAt: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const saveTopic = () => {
    if (!currentTopic) return

    const savedTopic: SavedTopic = {
      ...currentTopic,
      id: Date.now().toString(),
      notes,
      savedAt: new Date().toISOString(),
    }

    setSavedTopics((prev) => [savedTopic, ...prev])
    setNotes("")

    addToHistory({
      type: "gd",
      title: `GD Topic: ${currentTopic.topic.substring(0, 50)}...`,
      details: {
        category: currentTopic.category,
        difficulty: currentTopic.difficulty,
        notes: notes,
        supportingPoints: currentTopic.supportingPoints,
      },
    })

    if (currentGroup) {
      shareWithGroup(currentGroup.id, {
        id: savedTopic.id,
        type: "gd",
        title: `GD Topic: ${currentTopic.topic}`,
        completedAt: new Date(),
        details: savedTopic,
      })
    }

    updateStats({ gdTopicsPrepared: 1 })
    console.log("[v0] GD topic saved and stats updated")

    // Show success message
    console.log("Topic saved successfully!")
  }

  const deleteSavedTopic = (id: string) => {
    setSavedTopics((prev) => prev.filter((topic) => topic.id !== id))
  }

  const createGroup = () => {
    if (!currentTopic || !groupName.trim()) return

    if (!userProfile) return

    const initialMembers: GroupMember[] = [
      {
        uid: userProfile.uid,
        username: userProfile.username || "Unknown",
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        joinedAt: new Date().toISOString(),
      },
    ]

    // Add selected users to the group
    selectedUsers.forEach((userId) => {
      const user = availableUsers.find((u) => u.uid === userId)
      if (user) {
        initialMembers.push({
          ...user,
          joinedAt: new Date().toISOString(),
        })
      }
    })

    const newGroup: DiscussionGroup = {
      id: Date.now().toString(),
      name: groupName.trim(),
      topic: currentTopic.topic,
      category: currentTopic.category,
      difficulty: currentTopic.difficulty,
      createdBy: userProfile.uid,
      members: initialMembers,
      maxMembers,
      createdAt: new Date().toISOString(),
      status: "waiting",
    }

    setGroups((prev) => [newGroup, ...prev])
    setCurrentGroup(newGroup)
    setGroupName("")
    setSelectedUsers([]) // Reset selected users
    setShowCreateGroup(false)
    console.log("[v0] Group created with", initialMembers.length, "members:", newGroup.name)
  }

  const joinGroup = (group: DiscussionGroup) => {
    if (!userProfile || group.members.length >= group.maxMembers) return

    const isAlreadyMember = group.members.some((member) => member.uid === userProfile.uid)
    if (isAlreadyMember) return

    const updatedGroup = {
      ...group,
      members: [
        ...group.members,
        {
          uid: userProfile.uid,
          username: userProfile.username || "Unknown",
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL,
          joinedAt: new Date().toISOString(),
        },
      ],
    }

    setGroups((prev) => prev.map((g) => (g.id === group.id ? updatedGroup : g)))
    setCurrentGroup(updatedGroup)
    console.log("[v0] Joined group:", group.name)
  }

  const leaveGroup = (groupId: string) => {
    if (!userProfile) return

    setGroups((prev) =>
      prev.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            members: group.members.filter((member) => member.uid !== userProfile.uid),
          }
        }
        return group
      }),
    )

    if (currentGroup?.id === groupId) {
      setCurrentGroup(null)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      // Try to fetch real users from Firebase
      const usersRef = collection(db, "users")
      const usersQuery = query(usersRef, where("uid", "!=", userProfile?.uid || ""))
      const snapshot = await getDocs(usersQuery)

      if (!snapshot.empty) {
        const realUsers: GroupMember[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            uid: data.uid,
            username: data.username || `user_${data.uid.slice(0, 8)}`,
            displayName: data.displayName || data.email?.split("@")[0] || "Unknown User",
            photoURL: data.photoURL,
            joinedAt: new Date().toISOString(),
          }
        })

        console.log("[v0] Fetched", realUsers.length, "real users from Firebase")
        setAvailableUsers(realUsers)
      } else {
        // Fallback to mock users if no real users found
        console.log("[v0] No real users found, using mock users for demo")
        generateMockUsers()
      }
    } catch (error) {
      console.error("[v0] Error fetching users from Firebase:", error)
      // Fallback to mock users on error
      console.log("[v0] Using mock users due to Firebase error")
      generateMockUsers()
    } finally {
      setLoadingUsers(false)
    }
  }

  const generateMockUsers = () => {
    const mockUsers: GroupMember[] = [
      {
        uid: "user-1",
        username: "alex_coder",
        displayName: "Alex Johnson",
        photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        joinedAt: new Date().toISOString(),
      },
      {
        uid: "user-2",
        username: "priya_tech",
        displayName: "Priya Sharma",
        photoURL: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        joinedAt: new Date().toISOString(),
      },
      {
        uid: "user-3",
        username: "raj_analyst",
        displayName: "Raj Patel",
        photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        joinedAt: new Date().toISOString(),
      },
      {
        uid: "user-4",
        username: "sarah_dev",
        displayName: "Sarah Wilson",
        photoURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        joinedAt: new Date().toISOString(),
      },
      {
        uid: "user-5",
        username: "mike_data",
        displayName: "Mike Chen",
        photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        joinedAt: new Date().toISOString(),
      },
      {
        uid: "user-6",
        username: "lisa_pm",
        displayName: "Lisa Rodriguez",
        photoURL: "https://images.unsplash.com/photo-1567515004908-94c95e48d65c?w=150&h=150&fit=crop&crop=face",
        joinedAt: new Date().toISOString(),
      },
    ]
    console.log("[v0] Generated", mockUsers.length, "mock users for demo")
    setAvailableUsers(mockUsers)
  }

  useEffect(() => {
    if (activeView === "groups") {
      fetchUsers()
    }
  }, [activeView])

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
            <HistoryDropdown currentPageName="Group Discussion" />
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold">Group Discussion Topics</h1>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg">
          <Button
            variant={activeView === "generate" ? "default" : "ghost"}
            onClick={() => setActiveView("generate")}
            className="flex-1"
          >
            Generate Topics
          </Button>
          <Button
            variant={activeView === "groups" ? "default" : "ghost"}
            onClick={() => setActiveView("groups")}
            className="flex-1"
          >
            Groups ({groups.length})
          </Button>
          <Button
            variant={activeView === "saved" ? "default" : "ghost"}
            onClick={() => setActiveView("saved")}
            className="flex-1"
          >
            Saved Topics ({savedTopics.length})
          </Button>
        </div>

        {activeView === "groups" ? (
          <div className="space-y-6">
            {/* Create Group Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Create Discussion Group</span>
                  <Button onClick={() => setShowCreateGroup(!showCreateGroup)} variant="default" size="sm">
                    {showCreateGroup ? "Cancel" : "Create New Group"}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {currentTopic
                    ? `Form a group to discuss: "${currentTopic.topic}"`
                    : "Generate a topic first, then create a group to discuss it"}
                </CardDescription>
              </CardHeader>
              {showCreateGroup && (
                <CardContent className="space-y-4">
                  {!currentTopic && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        Please generate a discussion topic first by going to the "Generate Topics" tab.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-transparent"
                        onClick={() => setActiveView("generate")}
                      >
                        Generate Topic
                      </Button>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Group Name</label>
                      <input
                        type="text"
                        placeholder="Enter group name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Members</label>
                      <Select
                        value={maxMembers.toString()}
                        onValueChange={(value) => setMaxMembers(Number.parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Members</SelectItem>
                          <SelectItem value="4">4 Members</SelectItem>
                          <SelectItem value="5">5 Members</SelectItem>
                          <SelectItem value="6">6 Members</SelectItem>
                          <SelectItem value="7">7 Members</SelectItem>
                          <SelectItem value="8">8 Members</SelectItem>
                          <SelectItem value="9">9 Members</SelectItem>
                          <SelectItem value="10">10 Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Invite Users to Group</label>
                      <span className="text-xs text-muted-foreground">
                        {selectedUsers.length} selected (+ you = {selectedUsers.length + 1} total)
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                      {loadingUsers ? (
                        <div className="text-center py-4">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Loading users...</p>
                        </div>
                      ) : availableUsers.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            No users available.{" "}
                            {db
                              ? "No registered users found in database."
                              : "Mock users will be generated automatically."}
                          </p>
                          {!db && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 bg-transparent"
                              onClick={generateMockUsers}
                            >
                              Generate Demo Users
                            </Button>
                          )}
                        </div>
                      ) : (
                        availableUsers.map((user) => (
                          <div
                            key={user.uid}
                            className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedUsers.includes(user.uid)
                                ? "bg-primary/10 border border-primary/20"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                            onClick={() => toggleUserSelection(user.uid)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.uid)}
                              onChange={() => toggleUserSelection(user.uid)}
                              className="w-4 h-4"
                            />
                            <img
                              src={
                                user.photoURL ||
                                `https://ui-avatars.com/api/?name=${user.displayName || "/placeholder.svg"}&background=random`
                              }
                              alt={user.displayName}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{user.displayName}</p>
                              <p className="text-xs text-muted-foreground">@{user.username}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={createGroup}
                    disabled={!groupName.trim() || !currentTopic || selectedUsers.length + 1 > maxMembers}
                    className="w-full"
                  >
                    Create Group with {selectedUsers.length + 1} Members
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Available Groups */}
            <Card>
              <CardHeader>
                <CardTitle>Available Groups</CardTitle>
                <CardDescription>Join existing discussion groups</CardDescription>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Groups Yet</h3>
                    <p className="text-muted-foreground">Generate a topic and create the first group!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <div key={group.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">{group.topic}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant="secondary">{group.category}</Badge>
                            <Badge variant={group.status === "waiting" ? "default" : "secondary"}>{group.status}</Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="flex -space-x-2">
                              {group.members.slice(0, 3).map((member) => (
                                <img
                                  key={member.uid}
                                  src={
                                    member.photoURL ||
                                    `https://ui-avatars.com/api/?name=${member.displayName || "/placeholder.svg"}&background=random`
                                  }
                                  alt={member.displayName}
                                  className="w-8 h-8 rounded-full border-2 border-background"
                                />
                              ))}
                              {group.members.length > 3 && (
                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                  +{group.members.length - 3}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {group.members.length}/{group.maxMembers} members
                            </span>
                          </div>

                          <div className="flex space-x-2">
                            {group.members.some((m) => m.uid === userProfile?.uid) ? (
                              <Button variant="outline" size="sm" onClick={() => leaveGroup(group.id)}>
                                Leave
                              </Button>
                            ) : group.members.length < group.maxMembers ? (
                              <Button size="sm" onClick={() => joinGroup(group)}>
                                Join
                              </Button>
                            ) : (
                              <Button size="sm" disabled>
                                Full
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Group */}
            {currentGroup && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Group: {currentGroup.name}</CardTitle>
                  <CardDescription>Discussion Topic: {currentGroup.topic}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Group Members</h4>
                      <div className="space-y-2">
                        {currentGroup.members.map((member) => (
                          <div key={member.uid} className="flex items-center space-x-3 p-2 bg-muted rounded-lg">
                            <img
                              src={
                                member.photoURL ||
                                `https://ui-avatars.com/api/?name=${member.displayName || "/placeholder.svg"}&background=random`
                              }
                              alt={member.displayName}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="font-medium">{member.displayName}</p>
                              <p className="text-sm text-muted-foreground">@{member.username}</p>
                            </div>
                            {member.uid === currentGroup.createdBy && (
                              <Badge variant="secondary" className="ml-auto">
                                Creator
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {currentGroup.members.length >= 2 && <Button className="w-full">Start Discussion</Button>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : activeView === "generate" ? (
          <div className="space-y-6">
            {/* Topic Generator */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>Generate New Topic</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {difficulties.map((diff) => (
                          <SelectItem key={diff} value={diff}>
                            {diff}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={generateTopic} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Generate Topic
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Topic */}
            {currentTopic && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Generated Topic</CardTitle>
                    <div className="flex space-x-2">
                      <Badge variant="secondary">{currentTopic.category}</Badge>
                      <Badge
                        variant={
                          currentTopic.difficulty === "Easy"
                            ? "default"
                            : currentTopic.difficulty === "Medium"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {currentTopic.difficulty}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">{currentTopic.topic}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      Generated {new Date(currentTopic.generatedAt).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Key Points to Consider:</h4>
                    <ul className="space-y-1">
                      {currentTopic.supportingPoints.map((point, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Notes & Preparation</label>
                    <Textarea
                      placeholder="Add your thoughts, arguments, examples, and preparation notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={saveTopic} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Save Topic
                    </Button>
                    <Button variant="outline" onClick={generateTopic}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate New
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {savedTopics.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Saved Topics</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate and save topics to build your preparation library
                  </p>
                  <Button onClick={() => setActiveView("generate")}>Generate Your First Topic</Button>
                </CardContent>
              </Card>
            ) : (
              savedTopics.map((topic) => (
                <Card key={topic.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Badge variant="secondary">{topic.category}</Badge>
                        <Badge
                          variant={
                            topic.difficulty === "Easy"
                              ? "default"
                              : topic.difficulty === "Medium"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {topic.difficulty}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => deleteSavedTopic(topic.id)}>
                        Delete
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <h3 className="font-semibold">{topic.topic}</h3>

                    <div>
                      <h4 className="font-medium text-sm mb-1">Key Points:</h4>
                      <ul className="space-y-1">
                        {topic.supportingPoints.map((point, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {topic.notes && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Your Notes:</h4>
                        <p className="text-sm bg-muted p-3 rounded">{topic.notes}</p>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Saved {new Date(topic.savedAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
