"use client"

import { useAuth } from "@/lib/auth-context"
import { UsernameSetup } from "@/components/auth/username-setup"
import { LandingPage } from "@/components/landing-page"
import { Dashboard } from "@/components/dashboard"
import { AuthProvider } from "@/lib/auth-context"
//import { LoadingSpinner } from "@/components/loading-spinner"

function AppContent() {
  const { user, userProfile, loading } = useAuth()

//  if (loading) {
    // Shows loading spinner
  //  return <LoadingSpinner />
//  }

  if (user && userProfile && !userProfile.hasSetUsername) {
    // Shows username setup for new users
    return <UsernameSetup />
  }

  if (user && userProfile && userProfile.hasSetUsername) {
    // Shows main dashboard for authenticated users
    return <Dashboard />
  }

  // Shows landing page for non-authenticated users
  return <LandingPage />
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
