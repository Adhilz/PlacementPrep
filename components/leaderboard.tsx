"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Award } from "lucide-react"

interface LeaderboardUser {
  uid: string
  displayName: string
  username?: string
  photoURL?: string
  stats: {
    totalScore: number
  }
}

export function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      const usersRef = collection(db, "users")
      const q = query(usersRef, orderBy("stats.totalScore", "desc"), limit(3))
      const snapshot = await getDocs(q)
      const topUsers: LeaderboardUser[] = []
      snapshot.forEach(doc => {
        const data = doc.data() as LeaderboardUser
        topUsers.push({
          uid: doc.id,
          displayName: data.displayName,
          username: data.username,
          photoURL: data.photoURL,
          stats: { totalScore: data.stats?.totalScore || 0 }
        })
      })
      setUsers(topUsers)
      setLoading(false)
    }
    fetchLeaderboard()
  }, [])

  return (
    <Card className="w-full mt-8">
      <CardHeader className="flex items-center gap-2">
        <Award className="text-yellow-500" />
        <CardTitle className="text-lg font-bold">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No users yet.</div>
        ) : (
          <ol className="space-y-4">
            {users.map((user, idx) => (
              <li key={user.uid} className="flex items-center gap-4">
                {/* Rank */}
                <span className="text-xl font-bold w-6 text-center">
                  {idx + 1}
                </span>

                {/* Avatar (bigger than before) */}
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                    {user.displayName?.[0] || "U"}
                  </div>
                )}

                {/* Name & Score */}
                <div className="flex-1">
                  <div className="font-medium">{user.username || user.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    Score: {user.stats.totalScore}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
