"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Lightbulb, RefreshCw, Save, Clock, Users } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { collection, getDocs, query, where, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc, orderBy, serverTimestamp, deleteDoc } from "firebase/firestore"
// Message interface for chat
interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  createdAt: any;
}
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
  // Always call useAuth() before any useEffect or code that uses userProfile
  const { updateStats, userProfile, addToHistory, shareWithGroup } = useAuth();
  const [currentTopic, setCurrentTopic] = useState<GDTopic | null>(null)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState("Current Affairs")
  const [difficulty, setDifficulty] = useState("Medium")
  const [notes, setNotes] = useState("")
  const [savedTopics, setSavedTopics] = useState<SavedTopic[]>([])
  // Set 'groups' as the default view
  const [activeView, setActiveView] = useState<"generate" | "saved" | "groups">("groups")
  const [groups, setGroups] = useState<DiscussionGroup[]>([])
  const [currentGroup, setCurrentGroup] = useState<DiscussionGroup | null>(null)
  // Chat state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  // Submission state
  const [submitting, setSubmitting] = useState(false);
  interface GDEvaluation {
    score: number;
    feedback: string;
    participation: Record<string, { name: string; summary: string }>;
    [key: string]: any;
  }
  interface GroupSubmission {
    groupId: string;
    groupName: string;
    topic: string;
    members: GroupMember[];
    messages: Array<{
      senderId: string;
      senderName: string;
      text: string;
      createdAt: string;
    }>;
    evaluation: GDEvaluation;
    submittedAt: string;
  }
  const [submissionResult, setSubmissionResult] = useState<GDEvaluation | { error: string } | null>(null);
  const [groupSubmissions, setGroupSubmissions] = useState<GroupSubmission[]>([]);

  // Fetch group submissions for the current user from Firestore (eagerly on mount and when userProfile changes)
  useEffect(() => {
    if (userProfile) {
      const fetchSubmissions = async () => {
        try {
          const submissionsRef = collection(db, "groupSubmissions");
          // Only fetch submissions where the user is a member
          const q = query(submissionsRef, where("memberIds", "array-contains", userProfile.uid));
          const snap = await getDocs(q);
          const submissions: GroupSubmission[] = snap.docs.map(doc => doc.data() as GroupSubmission);
          setGroupSubmissions(submissions.sort((a, b) => (b.submittedAt.localeCompare(a.submittedAt))));
        } catch (err) {
          setGroupSubmissions([]);
        }
      };
      fetchSubmissions();
    }
  }, [userProfile]);
  const [groupName, setGroupName] = useState("")
  const [maxMembers, setMaxMembers] = useState(4)
  const [availableUsers, setAvailableUsers] = useState<GroupMember[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  // Modal for group creation
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  // For topic entry/generation in group creation
  const [groupTopicMode, setGroupTopicMode] = useState<'manual' | 'generate'>('manual');
  const [groupManualTopic, setGroupManualTopic] = useState<string>("");
  const [groupGeneratedTopic, setGroupGeneratedTopic] = useState<GDTopic | null>(null);

  // Helper: check if user is in any group
  const isInAnyGroup = groups.some(g => g.members.some(m => m.uid === userProfile?.uid));
  // Helper: get set of all user ids who are in any group
  const userIdsInGroups = new Set<string>();
  groups.forEach(g => g.members.forEach(m => userIdsInGroups.add(m.uid)));
  const [loadingUsers, setLoadingUsers] = useState(false)

  const categories = ["Current Affairs", "Technology", "Business", "Others"]
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
      // No fallback: only Gemini-generated topics
      setCurrentTopic(null)
    } finally {
      setLoading(false)
    }
  }

  const saveTopic = () => {
    // Always recalculate and update totalScore in Firestore after GD topic save
    if (userProfile?.uid) {
      import("@/lib/update-total-score").then(({ recalculateAndUpdateTotalScore }) => {
        recalculateAndUpdateTotalScore(userProfile.uid);
      });
    }
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

  const createGroup = async () => {
    // Determine topic for group: either manual or generated
    let topicObj: GDTopic | null = null;
    if (groupTopicMode === 'manual') {
      if (!groupManualTopic.trim()) return;
      topicObj = {
        topic: groupManualTopic.trim(),
        category,
        difficulty,
        supportingPoints: [],
        generatedAt: new Date().toISOString(),
      };
    } else if (groupTopicMode === 'generate' && groupGeneratedTopic) {
      topicObj = groupGeneratedTopic;
    }
    if (!topicObj || !groupName.trim()) return;
    if (!userProfile) return;
    const initialMembers: GroupMember[] = [
      {
        uid: userProfile.uid,
        username: userProfile.username || "Unknown",
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        joinedAt: new Date().toISOString(),
      },
    ];
    selectedUsers.forEach((userId) => {
      const user = availableUsers.find((u) => u.uid === userId);
      if (user) {
        initialMembers.push({
          ...user,
          joinedAt: new Date().toISOString(),
        });
      }
    });
    // Use Firestore auto ID
    const groupData: Omit<DiscussionGroup, 'id'> = {
      name: groupName.trim(),
      topic: topicObj.topic,
      category: topicObj.category,
      difficulty: topicObj.difficulty,
      createdBy: userProfile.uid,
      members: initialMembers,
      maxMembers,
      createdAt: new Date().toISOString(),
      status: "waiting",
    };
    try {
      const docRef = await addDoc(collection(db, "groups"), groupData);
      // Firestore docRef.id is the group id
      const newGroup: DiscussionGroup = { ...groupData, id: docRef.id };
      setCurrentGroup(newGroup);
      setGroupName("");
      setSelectedUsers([]);
      setGroupManualTopic("");
      setGroupGeneratedTopic(null);
      console.log("[v0] Group created and uploaded to Firestore:", newGroup.name);
    } catch (err) {
      console.error("[v0] Error creating group in Firestore:", err);
    }
  };

  const joinGroup = async (group: DiscussionGroup) => {
    if (!userProfile || group.members.length >= group.maxMembers) return;
    const isAlreadyMember = group.members.some((member) => member.uid === userProfile.uid);
    if (isAlreadyMember) return;
    const updatedMembers = [
      ...group.members,
      {
        uid: userProfile.uid,
        username: userProfile.username || "Unknown",
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        joinedAt: new Date().toISOString(),
      },
    ];
    try {
      const groupRef = doc(db, "groups", group.id);
      await updateDoc(groupRef, { members: updatedMembers });
      // setCurrentGroup will be updated by Firestore listener
      console.log("[v0] Joined group and updated Firestore:", group.name);
    } catch (err) {
      console.error("[v0] Error joining group:", err);
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!userProfile) return;
    try {
      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const groupData = groupSnap.data() as DiscussionGroup;
        const updatedMembers = groupData.members.filter((member) => member.uid !== userProfile.uid);
        await updateDoc(groupRef, { members: updatedMembers });
        if (currentGroup?.id === groupId) {
          setCurrentGroup(null);
        }
        console.log("[v0] Left group and updated Firestore:", groupId);
      }
    } catch (err) {
      console.error("[v0] Error leaving group:", err);
    }
  };

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

  // Listen for real-time group updates from Firestore
  useEffect(() => {
    if (activeView === "groups") {
      fetchUsers();
      const groupsRef = collection(db, "groups");
      const unsubscribe = onSnapshot(groupsRef, (snapshot) => {
        const groupList: DiscussionGroup[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DiscussionGroup));
        setGroups(groupList);
        // If currentGroup is set, update it with the latest data
        if (currentGroup) {
          const updated = groupList.find(g => g.id === currentGroup.id);
          if (updated) setCurrentGroup(updated);
        }
      });
      return () => unsubscribe();
    }
    // eslint-disable-next-line
  }, [activeView]);

  // Listen for real-time chat messages for the selected group
  useEffect(() => {
    if (!currentGroup) {
      setMessages([]);
      return;
    }
    const msgsRef = collection(db, 'groups', currentGroup.id, 'messages');
    const unsubscribe = onSnapshot(query(msgsRef, orderBy('createdAt', 'asc')), (snapshot) => {
      const msgs: GroupMessage[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [currentGroup]);

  // Delete group function (creator only)
  const deleteGroup = async (groupId: string) => {
    if (!userProfile) return;
    try {
      // Delete all messages in the group first
      const msgsRef = collection(db, 'groups', groupId, 'messages');
      const msgsSnap = await getDocs(msgsRef);
      const batchDeletes: Promise<any>[] = [];
      msgsSnap.forEach((docSnap) => {
        batchDeletes.push(deleteDoc(docSnap.ref));
      });
      await Promise.all(batchDeletes);
      // Delete the group document
      await deleteDoc(doc(db, 'groups', groupId));
      setCurrentGroup(null);
      console.log('[v0] Group deleted:', groupId);
    } catch (err) {
      console.error('[v0] Error deleting group:', err);
    }
  };

  // Fullscreen chat view if currentGroup is set
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  if (currentGroup) {
    const isCreator = userProfile && currentGroup.createdBy === userProfile.uid;
    // Submission handler
    const handleSubmitDiscussion = async () => {
      if (!currentGroup || messages.length === 0 || submitting) return;
      setSubmitting(true);
      setSubmissionResult(null);
      try {
        // Prepare payload for Gemini API
        const payload = {
          groupId: currentGroup.id,
          groupName: currentGroup.name,
          topic: currentGroup.topic,
          members: currentGroup.members,
          messages: messages.map(m => ({
            senderId: m.senderId,
            senderName: m.senderName,
            text: m.text,
            createdAt: m.createdAt?.toDate ? m.createdAt.toDate().toISOString() : '',
          })),
        };
        // Call Gemini API (mock endpoint)
        const response = await fetch("/api/gemini-gd-evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to evaluate GD");
        const result = await response.json();
        setSubmissionResult(result);
        // Save submission for each user in group
        const submission = {
          groupId: currentGroup.id,
          groupName: currentGroup.name,
          topic: currentGroup.topic,
          members: currentGroup.members,
          messages: payload.messages,
          evaluation: result,
          submittedAt: new Date().toISOString(),
          memberIds: currentGroup.members.map(m => m.uid),
        };
        // Save to Firestore for persistence
        await addDoc(collection(db, "groupSubmissions"), submission);
        setGroupSubmissions(prev => [submission, ...prev]);

        // Update all group members' Firestore history and recalculate their totalScore for leaderboard
        if (currentGroup?.members && Array.isArray(currentGroup.members)) {
          await Promise.all(currentGroup.members.map(async (member) => {
            const userDocRef = doc(db, "users", member.uid);
            // Fetch current history
            const userDocSnap = await getDoc(userDocRef);
            let history = [];
            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              history = Array.isArray(data.history) ? data.history : [];
            }
            // Add new GD submission to history
            const newHistoryItem = {
              id: submission.groupId + "-" + submission.submittedAt,
              type: "group-discussion",
              title: `GD: ${submission.topic}`,
              score: result.score || 0,
              completedAt: submission.submittedAt,
              details: {
                groupId: submission.groupId,
                groupName: submission.groupName,
                topic: submission.topic,
                evaluation: result,
              },
            };
            await updateDoc(userDocRef, { history: [newHistoryItem, ...history] });
            // Recalculate and update totalScore for leaderboard
            try {
              const { recalculateAndUpdateTotalScore } = await import("@/lib/update-total-score");
              await recalculateAndUpdateTotalScore(member.uid);
            } catch (e) {
              console.error("Failed to update totalScore for leaderboard", e);
            }
          }));
        }
      } catch (err) {
        setSubmissionResult({ error: "Failed to evaluate GD." });
      } finally {
        setSubmitting(false);
      }
    };
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background md:relative md:min-h-screen md:bg-gradient-to-br md:from-primary/5 md:to-accent/5">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/80 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentGroup(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Groups
            </Button>
            {isCreator && (
              <Button variant="destructive" size="sm" className="ml-2" onClick={() => {
                if (window.confirm('Are you sure you want to delete this group? This cannot be undone.')) {
                  deleteGroup(currentGroup.id);
                }
              }}>
                Delete Group
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg truncate max-w-[120px] md:max-w-xs">{currentGroup.name}</span>
          </div>
        </div>
        {/* Group Info */}
        <div className="px-4 pt-4 pb-2">
          <div className="text-xs text-muted-foreground mb-1">Discussion Topic:</div>
          <div className="font-semibold text-base mb-2 truncate">{currentGroup.topic}</div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{currentGroup.category}</Badge>
            <Badge variant={currentGroup.status === "waiting" ? "default" : "secondary"}>{currentGroup.status}</Badge>
            <Badge variant={currentGroup.difficulty === "Easy" ? "default" : currentGroup.difficulty === "Medium" ? "secondary" : "destructive"}>{currentGroup.difficulty}</Badge>
          </div>
          <div className="flex -space-x-2 mb-2">
            {currentGroup.members.map((member) => (
              <img
                key={member.uid}
                src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName || "/placeholder.svg"}&background=random`}
                alt={member.displayName}
                className="w-8 h-8 rounded-full border-2 border-background"
              />
            ))}
          </div>
        </div>
        {/* Chatroom UI */}
        <div className="flex-1 flex flex-col px-2 md:px-4 pb-4">
          <div
            className="flex-1 overflow-y-auto bg-muted rounded-lg p-3 flex flex-col gap-2 mb-2"
            style={{ minHeight: 200, maxHeight: 400 }}
            ref={chatContainerRef}
          >
            {messages.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center my-auto">No messages yet. Start the discussion!</div>
            ) : (
              messages.map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${msg.senderId === userProfile?.uid ? 'justify-end' : ''}`}
                    ref={isLast ? lastMessageRef : undefined}
                  >
                    {msg.senderId !== userProfile?.uid && (
                      <img src={msg.senderPhoto || `https://ui-avatars.com/api/?name=${msg.senderName}&background=random`} alt={msg.senderName} className="w-8 h-8 rounded-full" />
                    )}
                    <div className={`rounded-lg px-3 py-2 ${msg.senderId === userProfile?.uid ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}
                      title={msg.senderName + (msg.senderId === userProfile?.uid ? ' (You)' : '')}
                    >
                      <div className="text-xs font-semibold mb-1">{msg.senderName}{msg.senderId === userProfile?.uid ? ' (You)' : ''}</div>
                      <div className="text-sm">{msg.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 text-right">{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : ''}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form className="flex gap-2" onSubmit={async e => {
            e.preventDefault();
            if (!newMessage.trim() || !userProfile || sending) return;
            setSending(true);
            try {
              const msgData = {
                senderId: userProfile.uid,
                senderName: userProfile.displayName || userProfile.username || 'You',
                senderPhoto: userProfile.photoURL,
                text: newMessage.trim(),
                createdAt: serverTimestamp(),
              };
              await addDoc(collection(db, 'groups', currentGroup.id, 'messages'), msgData);
              setNewMessage("");
            } catch (err) {
              console.error("[v0] Error sending message:", err);
            } finally {
              setSending(false);
            }
          }}>
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border rounded-md"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" disabled={sending || !newMessage.trim()}>Send</Button>
          </form>
          {/* Submit Button for GD Evaluation */}
          <div className="mt-4 flex justify-end">
            <Button variant="default" onClick={handleSubmitDiscussion} disabled={submitting || messages.length === 0}>
              {submitting ? "Submitting..." : "Submit Discussion"}
            </Button>
          </div>
          {/* Show evaluation result if available */}
          {submissionResult && (
            <div className="mt-4 p-4 bg-muted rounded border">
              {"error" in submissionResult ? (
                <div className="text-destructive font-semibold">{submissionResult.error}</div>
              ) : (
                <>
                  <div className="font-bold mb-2">Group Evaluation Result</div>
                  <div className="mb-1">Score: <span className="font-semibold">{submissionResult.score}/100</span></div>
                  <div className="mb-1">Feedback: <span className="text-sm">{submissionResult.feedback}</span></div>
                  <div className="mb-1">Participation:</div>
                  <ul className="list-disc ml-6">
                    {submissionResult.participation &&
                      Object.entries(submissionResult.participation).map(([uid, part]) => (
                        <li key={uid}><span className="font-semibold">{(part as any).name}:</span> {(part as any).summary}</li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 px-2 py-4 sm:px-4">
      <div className="max-w-3xl md:max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 w-full sm:w-auto">
            <HistoryDropdown currentPageName="Group Discussion" />
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold">Group Discussion Topics</h1>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Only Groups and Submissions */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 mb-4 sm:mb-6 bg-muted p-1 rounded-lg">
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
            Submissions ({groupSubmissions.length})
          </Button>
        </div>

        {/* Main Content Responsive Grid */}
        <div className="w-full">
          {activeView === "groups" ? (
            <div className="space-y-6">
              {/* Create Group Modal Trigger */}
              <div className="flex justify-end mb-2">
                <Button onClick={() => setShowCreateGroupModal(true)} variant="default" size="sm">
                  Create New Group
                </Button>
              </div>
              {/* Create Group Modal */}
              {showCreateGroupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-2">
                  <div className="bg-background rounded-lg shadow-lg w-full max-w-lg p-4 sm:p-6 relative">
                    <button
                      className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCreateGroupModal(false)}
                    >
                      ✕
                    </button>
                    <h2 className="text-lg font-bold mb-4">Create Discussion Group</h2>
                    {isInAnyGroup ? (
                      <div className="p-4 bg-destructive/10 border border-destructive rounded text-destructive text-center font-semibold">
                        You are already a member of a group. Please leave your current group before creating a new one.
                      </div>
                    ) : (
                      <>
                        {/* Topic entry/generation for group */}
                        <div className="space-y-2 mb-2">
                          <label className="text-sm font-medium">Choose Topic Mode</label>
                          <div className="flex gap-2 flex-col sm:flex-row">
                            <Button variant={groupTopicMode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setGroupTopicMode('manual')} className="flex-1">Enter Topic</Button>
                            <Button variant={groupTopicMode === 'generate' ? 'default' : 'outline'} size="sm" onClick={() => setGroupTopicMode('generate')} className="flex-1">Generate Topic</Button>
                          </div>
                        </div>
                        {groupTopicMode === 'manual' ? (
                          <div className="mb-2 space-y-2">
                            <label className="text-sm font-medium">Enter Discussion Topic</label>
                            <input
                              type="text"
                              className="w-full border rounded px-2 py-1 mt-1"
                              placeholder="Type your topic here..."
                              value={groupManualTopic}
                              onChange={e => setGroupManualTopic(e.target.value)}
                              maxLength={120}
                            />
                            <div className="flex flex-col gap-2 mt-2 sm:flex-row">
                              <div className="flex-1">
                                <label className="text-xs font-medium">Category</label>
                                <Select value={category} onValueChange={setCategory}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1">
                                <label className="text-xs font-medium">Difficulty</label>
                                <Select value={difficulty} onValueChange={setDifficulty}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {difficulties.map(diff => <SelectItem key={diff} value={diff}>{diff}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-2">
                            <label className="text-sm font-medium">Generate New Topic</label>
                            <Button
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  const response = await fetch("/api/generate-gd-topic", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ category, difficulty }),
                                  });
                                  if (!response.ok) throw new Error("Failed to generate topic");
                                  const topic = await response.json();
                                  setGroupGeneratedTopic(topic);
                                } catch (error) {
                                  setGroupGeneratedTopic(null);
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                              variant="outline"
                              className="w-full mt-1"
                            >
                              {loading ? "Generating..." : "Generate Topic"}
                            </Button>
                            {groupGeneratedTopic && (
                              <div className="p-2 bg-muted rounded text-xs mt-2">
                                {groupGeneratedTopic.topic}
                              </div>
                            )}
                            {!groupGeneratedTopic && !loading && (
                              <div className="text-xs text-muted-foreground p-2">No topic generated yet. Click above to generate a topic.</div>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
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
                        <div className="space-y-3 mb-2">
                          <div className="flex items-center justify-between flex-col sm:flex-row gap-2">
                            <label className="text-sm font-medium">Invite Users to Group</label>
                            <span className="text-xs text-muted-foreground">
                              {selectedUsers.length} selected (+ you = {selectedUsers.length + 1} total)
                            </span>
                          </div>
                          <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2 bg-muted">
                            {loadingUsers ? (
                              <div className="text-center py-4">
                                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Loading users...</p>
                              </div>
                            ) : availableUsers.length === 0 ? (
                              <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground">
                                  No users available. {db ? "No registered users found in database." : "Mock users will be generated automatically."}
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
                              availableUsers.map((user) => {
                                const isUserInGroup = userIdsInGroups.has(user.uid);
                                return (
                                  <div
                                    key={user.uid}
                                    className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                                      isUserInGroup
                                        ? "bg-destructive/10 border border-destructive/30 opacity-60 cursor-not-allowed"
                                        : selectedUsers.includes(user.uid)
                                          ? "bg-primary/10 border border-primary/20 cursor-pointer"
                                          : "bg-muted hover:bg-muted/80 cursor-pointer"
                                    }`}
                                    onClick={() => {
                                      if (!isUserInGroup) toggleUserSelection(user.uid);
                                    }}
                                    title={isUserInGroup ? "This user is already in a group and cannot be added." : undefined}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedUsers.includes(user.uid)}
                                      onChange={() => {
                                        if (!isUserInGroup) toggleUserSelection(user.uid);
                                      }}
                                      className="w-4 h-4"
                                      disabled={isUserInGroup}
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
                                    {isUserInGroup && (
                                      <span className="ml-2 text-xs text-destructive font-semibold">In a group</span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => { createGroup(); setShowCreateGroupModal(false); }}
                          disabled={
                            !groupName.trim() ||
                            (groupTopicMode === 'manual' ? !groupManualTopic.trim() : !groupGeneratedTopic) ||
                            selectedUsers.length + 1 > maxMembers
                          }
                          className="w-full"
                        >
                          Create Group with {selectedUsers.length + 1} Members
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Available Groups */}
              <Card className="w-full">
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
                      {groups.map((group) => {
                        const isMember = group.members.some((m) => m.uid === userProfile?.uid);
                        return (
                          <div key={group.id} className="border rounded-lg p-4 hover:bg-accent/30 transition cursor-pointer w-full"
                            onClick={() => isMember ? setCurrentGroup(group) : undefined}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                              <div>
                                <h3 className="font-semibold">{group.name}</h3>
                                <p className="text-sm text-muted-foreground">{group.topic}</p>
                              </div>
                              <div className="flex space-x-2 mt-2 sm:mt-0">
                                <Badge variant="secondary">{group.category}</Badge>
                                <Badge variant={group.status === "waiting" ? "default" : "secondary"}>{group.status}</Badge>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                                {isMember ? (
                                  <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); leaveGroup(group.id); }}>
                                    Leave
                                  </Button>
                                ) : isInAnyGroup ? (
                                  <Button size="sm" disabled title="You must leave your current group to join another.">
                                    Join
                                  </Button>
                                ) : group.members.length < group.maxMembers ? (
                                  <Button size="sm" onClick={e => { e.stopPropagation(); joinGroup(group); }}>
                                    Join
                                  </Button>
                                ) : (
                                  <Button size="sm" disabled>
                                    Full
                                  </Button>
                                )}
                              </div>
                            </div>
                            {isMember && currentGroup && 'id' in currentGroup && (currentGroup as any).id === group.id && (
                              <div className="mt-2 text-xs text-primary font-semibold">(Chat Open)</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show group submissions if any */}
              {groupSubmissions.length > 0 ? (
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Group Submissions</CardTitle>
                    <CardDescription>Evaluated group discussions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {groupSubmissions.map((sub, idx) => (
                      <div key={idx} className="mb-6 border-b pb-4 last:border-b-0 last:pb-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                          <div>
                            <span className="font-semibold">{sub.groupName}</span> &mdash; <span className="text-xs text-muted-foreground">{sub.topic}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(sub.submittedAt).toLocaleString()}</span>
                        </div>
                        <div className="mb-1">Score: <span className="font-semibold">{sub.evaluation?.score}/100</span></div>
                        <div className="mb-1">Feedback: <span className="text-sm">{sub.evaluation?.feedback}</span></div>
                        <div className="mb-1">Participation:</div>
                        <ul className="list-disc ml-6">
                          {sub.evaluation?.participation &&
                            Object.entries(sub.evaluation.participation).map(([uid, part]) => (
                              <li key={uid}><span className="font-semibold">{(part as any).name}:</span> {(part as any).summary}</li>
                            ))}
                        </ul>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-primary">Show Chat Transcript</summary>
                          <div className="bg-muted p-2 rounded mt-1 text-xs max-h-40 overflow-y-auto">
                            {sub.messages.map((msg, i) => (
                              <div key={i}><span className="font-semibold">{msg.senderName}:</span> {msg.text}</div>
                            ))}
                          </div>
                        </details>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                savedTopics.length === 0 ? (
                  <Card className="w-full">
                    <CardContent className="text-center py-12">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Submissions</h3>
                      <p className="text-muted-foreground mb-4">
                        Submit a group discussion to see your evaluated results here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  savedTopics.map((topic) => (
                    <Card key={topic.id} className="w-full">
                      <CardHeader>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
