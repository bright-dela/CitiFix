"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect to appropriate dashboard based on user role
        if (user.role === "citizen") {
          router.push("/dashboard/citizen")
        } else if (user.role === "authority") {
          router.push("/dashboard/authority")
        } else if (user.role === "media") {
          router.push("/dashboard/media")
        }
      } else {
        router.push("/login")
      }
    }
  }, [user, loading, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-foreground">Loading...</p>
      </div>
    </div>
  )
}
