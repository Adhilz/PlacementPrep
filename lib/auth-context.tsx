"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User
} from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase"

interface HistoryItem {
  id: string
  type: "aptitude" | "gd" | "coding"
  title: string
  score?: number
  percentage?: number
  completedAt: Date
  details?: any
}

interface UserStats {
  aptitudeTestsCompleted: number
  gdTopicsPrepared: number
  codingChallengesCompleted: number
  totalScore: number
}

interface Solution {
  id: string;
  problemId: string;
  code: string;
  language: string;
  submittedAt: string;
  status: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error";
  runtime?: string;
  memory?: string;
}

interface UserProfile {
  uid: string
  email: string
  displayName: string
  username?: string
  photoURL?: string
  createdAt: Date
  hasSetUsername: boolean
  stats: UserStats
  history: HistoryItem[]
  completedCodingChallenges: string[];
  solutions: Solution[];
  completedAptitudeTests: string[];
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateUsername: (username: string) => Promise<void>
  updateStats: (stats: Partial<UserStats>) => Promise<void>
  addToHistory: (item: Omit<HistoryItem, "id" | "completedAt">) => Promise<void>
  getRecentHistory: (type?: "aptitude" | "gd" | "coding", limit?: number) => HistoryItem[]
  shareWithGroup: (groupId: string, item: HistoryItem) => Promise<void>
    updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          let data = userDoc.data() as UserProfile;

          // Consistent date conversion
          data = {
            ...data,
            createdAt: convertFirebaseDate(data.createdAt),
            history: data.history.map(item => ({
              ...item,
              completedAt: convertFirebaseDate(item.completedAt),
            })),
          };

          // Ensure completedCodingChallenges exists and is an array
          if (!data.completedCodingChallenges) {
            data.completedCodingChallenges = [];
          }
          // Ensure completedAptitudeTests exists and is an array
          if (!data.completedAptitudeTests) {
            data.completedAptitudeTests = [];
          }
          // Ensure solutions exists and is an array
          if (!data.solutions) {
            data.solutions = [];
          }

          setUserProfile(data)
        } else {
          // Create new user profile
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL || "",
            createdAt: new Date(),
            hasSetUsername: false,
            stats: {
              aptitudeTestsCompleted: 0,
              gdTopicsPrepared: 0,
              codingChallengesCompleted: 0,
              totalScore: 0,
            },
            history: [],
            completedCodingChallenges: [],
            solutions: [],
            completedAptitudeTests: [],
          }
          await setDoc(doc(db, "users", firebaseUser.uid), newProfile)
          setUserProfile(newProfile)
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
    setUserProfile(null)
    window.location.href = "/"
  }

  const updateUsername = async (username: string) => {
    if (!user) return
    const userRef = doc(db, "users", user.uid)
    await updateDoc(userRef, { username, hasSetUsername: true })
    setUserProfile((prev) => prev ? { ...prev, username, hasSetUsername: true } : prev)
  }

  // Helper: calculate total score from history
  const calculateTotalScore = (history: HistoryItem[]) => {
    return history.reduce((sum, item) => sum + (item.score || 0), 0);
  };

  const updateStats = async (stats: Partial<UserStats>) => {
    if (!user || !userProfile) return;

    const userRef = doc(db, "users", user.uid);

    // Always recalculate totalScore from history
    const newTotalScore = calculateTotalScore(userProfile.history || []);
    const updatedStats = {
      ...userProfile.stats,
      ...stats,
      totalScore: newTotalScore,
    };

    await updateDoc(userRef, { stats: updatedStats });

    setUserProfile((prev) =>
      prev ? { ...prev, stats: updatedStats } : prev
    );
  };

    const updateUserProfile = async (profile: Partial<UserProfile>) => {
    if (!user || !userProfile) return;

    const userRef = doc(db, "users", user.uid);

    // Filter out any undefined values from the profile object
    const validProfileUpdates = Object.fromEntries(
        Object.entries(profile).filter(([key, value]) => value !== undefined)
    );

    await updateDoc(userRef, validProfileUpdates);

    setUserProfile((prev) =>
        prev ? { ...prev, ...validProfileUpdates } as UserProfile : null
    );
};

  const addToHistory = async (item: Omit<HistoryItem, "id" | "completedAt">) => {
    if (!user) return;
    const newItem: HistoryItem = {
      ...item,
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      completedAt: new Date(),
    };
    const userRef = doc(db, "users", user.uid);
    const newHistory = [newItem, ...(userProfile?.history || [])];
    // Recalculate totalScore
    const newTotalScore = calculateTotalScore(newHistory);
    // Update both history and stats.totalScore
    await updateDoc(userRef, { history: newHistory, "stats.totalScore": newTotalScore });
    setUserProfile((prev) =>
      prev ? { ...prev, history: newHistory, stats: { ...prev.stats, totalScore: newTotalScore } } : prev
    );
  };

  const getRecentHistory = (type?: "aptitude" | "gd" | "coding", limit = 5) => {
    if (!userProfile) return []
    let history = userProfile.history
    if (type) history = history.filter((item) => item.type === type)
    return history.slice(0, limit)
  }

  const shareWithGroup = async (groupId: string, item: HistoryItem) => {
    // Implement group sharing logic here if needed
    return
  }

  // Helper function to handle date conversions from Firebase
  const convertFirebaseDate = (date: any): Date => {
    if (!date) return date;
    if (typeof date === "string") {
      return new Date(date);
    }
    if (typeof date === "object" && typeof (date as any).toDate === "function") {
      return (date as any).toDate();
    }
    return date;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithGoogle,
        signOut,
        updateUsername,
        updateStats,
        addToHistory,
        getRecentHistory,
        shareWithGroup,
          updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}