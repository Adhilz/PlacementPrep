"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { query, where, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function UsernameSetup() {
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { updateUsername } = useAuth()

  const checkUsernameAvailability = async (username: string) => {
    const q = query(collection(db, "users"), where("username", "==", username))
    const querySnapshot = await getDocs(q)
    return querySnapshot.empty
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Validate username
      if (username.length < 3) {
        throw new Error("Username must be at least 3 characters long")
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error("Username can only contain letters, numbers, and underscores")
      }

      // Check availability
      const isAvailable = await checkUsernameAvailability(username)
      if (!isAvailable) {
        throw new Error("Username is already taken")
      }

      await updateUsername(username)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Welcome to PlacementPrep!</CardTitle>
          <CardDescription>Choose a unique username to complete your profile setup</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                disabled={loading}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Username must be at least 3 characters and contain only letters, numbers, and underscores
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading || username.length < 3}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
