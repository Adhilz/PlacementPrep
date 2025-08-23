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
  const [group, setGroup] = useState<{
    name: string;
    members: any[];
    topic?: string;
    createdBy?: string;
    groupId?: string;
  } | null>(null)
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
    // Fetch all groups, then find the latest group where any member's uid or username matches the current user
    const fetchGroup = async () => {
      const groupsRef = collection(db, "groups");
      const snapshot = await getDocs(groupsRef);
      let latestGroup = null;
      let latestJoinedAt: Date | null = null;
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!Array.isArray(data.members)) return;
        // Find a member that matches by uid or username
        const member = data.members.find((m: any) =>
          m.uid === userProfile.uid ||
          (userProfile.username && m.username === userProfile.username)
        );
        const joinedAt = member?.joinedAt ? new Date(member.joinedAt) : null;
        if (member && joinedAt && (!latestJoinedAt || joinedAt > latestJoinedAt)) {
          latestJoinedAt = joinedAt;
          latestGroup = {
            name: data.name,
            members: data.members,
            topic: data.topic || undefined,
            createdBy: data.createdBy || undefined,
            groupId: docSnap.id,
          };
        }
      });
      setGroup(latestGroup);
      setGroupLoading(false);
    };
    fetchGroup();
  }, [userProfile])

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <Button variant="outline" onClick={onBack} className="mb-4 w-fit sm:w-auto">
        &larr; Back
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Profile & Leaderboard */}
        <div className="col-span-1 flex flex-col gap-6 sm:gap-8">
          <Card className="w-full bg-background/90">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt="Profile"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-muted flex items-center justify-center text-3xl sm:text-4xl font-bold">
                      {userProfile?.displayName?.[0] || "U"}
                    </div>
                  )}
                  {uploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full z-10">
                      <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    </span>
                  )}
                </div>
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
                  className="w-full max-w-xs"
                >
                  {uploading ? "Uploading..." : "Upload Profile Image"}
                </Button>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="text-center">
                  <div className="font-bold text-lg sm:text-xl">
                    {userProfile?.username || userProfile?.displayName}
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm break-all">
                    {userProfile?.email}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="w-full">
            <Leaderboard />
          </div>
        </div>
        {/* Group Info / Admin */}
        <div className="col-span-1 md:col-span-2 flex flex-col gap-6 sm:gap-8 mt-4 md:mt-0">
          {isAdmin ? (
            <Card className="bg-background/90">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Admin: Generate Aptitude Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <AptitudeAdmin />
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-background/90">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Your Latest Group</CardTitle>
              </CardHeader>
              <CardContent>
                {groupLoading ? (
                  <div className="text-center py-6">Loading group info...</div>
                ) : group ? (
                  <>
                    <div className="mb-3 flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-primary break-all">{group.name}</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide">Group</span>
                    </div>
                    {group.topic && (
                      <div className="mb-2 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-muted-foreground">Topic:</span>
                        <span className="text-base font-medium break-words">{group.topic}</span>
                      </div>
                    )}
                    {group.createdBy && (
                      <div className="mb-2 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-muted-foreground">Created By:</span>
                        <span className="text-base font-medium">
                          {(() => {
                            const creator = group.members.find((m: any) => m.uid === group.createdBy);
                            return creator?.username || creator?.displayName || group.createdBy;
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="mb-2 font-semibold text-sm text-muted-foreground">Members:</div>
                    <div className="flex flex-wrap gap-3 mb-2">
                      {group.members.map((member, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-muted/60 rounded-lg px-2 py-1 shadow-sm">
                          <img
                            src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || member.username || 'U')}&background=random`}
                            alt={member.displayName || member.username || 'User'}
                            className="w-8 h-8 rounded-full border"
                          />
                          <span className="font-medium text-sm break-all">{member.displayName || member.username || member.email || member.uid}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-center py-6">You are not in any group.</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}