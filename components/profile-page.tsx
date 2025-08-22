"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Leaderboard } from "@/components/leaderboard"
import { AptitudeAdmin } from "@/components/aptitude-admin"
import { collection, getDocs, query, where } from "firebase/firestore"

export function ProfilePage({ onBack }: { onBack: () => void }) {
  const { user, userProfile, loading } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [group, setGroup] = useState<{ name: string; members: string[] } | null>(null)
  const [groupLoading, setGroupLoading] = useState(false)

 const adminUsers = [
  { username: "adhil_salam", email: "adhilsalam200@gmail.com" },
  { username: "thasleema_sunil", email: "thasleema.connect@gmail.com" }
];
const isAdmin = adminUsers.some(
  admin =>
    userProfile?.username === admin.username &&
    userProfile?.email === admin.email
);


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("")
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.")
      return
    }
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        if (user) {
          await updateDoc(doc(db, "users", user.uid), { photoURL: base64 })
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError("Failed to upload image.")
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!userProfile) return
    setGroupLoading(true)
    // Find group where this user is a member
    const fetchGroup = async () => {
      const groupsRef = collection(db, "groups")
      const q = query(groupsRef, where("members", "array-contains", userProfile.uid))
      const snapshot = await getDocs(q)
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data()
        setGroup({ name: data.name, members: data.members })
      } else {
        setGroup(null)
      }
      setGroupLoading(false)
    }
    fetchGroup()
  }, [userProfile])

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
      <Button variant="outline" onClick={onBack} className="mb-4">
        &larr; Back
      </Button>
      <div className="flex flex-col md:grid md:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column */}
        <div className="md:col-span-1 flex flex-col gap-6 sm:gap-8">
          {/* Profile Card */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="Profile"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center text-2xl sm:text-3xl font-bold">
                    {userProfile?.displayName?.[0] || "U"}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? "Uploading..." : "Upload Profile Image"}
                </Button>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="text-center">
                  <div className="font-bold text-base sm:text-lg">
                    {userProfile?.username || userProfile?.displayName}
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm break-all">
                    {userProfile?.email}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Leaderboard */}
          <div className="w-full">
            <Leaderboard />
          </div>
        </div>
        {/* Right Column */}
        <div className="md:col-span-2 flex flex-col gap-6 sm:gap-8 mt-6 md:mt-0">
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle>Admin: Generate Aptitude Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <AptitudeAdmin />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your Latest Group</CardTitle>
              </CardHeader>
              <CardContent>
                {groupLoading ? (
                  <div>Loading group info...</div>
                ) : group ? (
                  <>
                    <div className="mb-2 font-semibold">
                      Group Name: {" "}
                      <span className="text-primary break-all">{group.name}</span>
                    </div>
                    <div className="mb-2">Members:</div>
                    <ul className="list-disc list-inside text-muted-foreground break-all">
                      {group.members.map((member, idx) => (
                        <li key={idx}>{member}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="text-muted-foreground">You are not in any group.</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}