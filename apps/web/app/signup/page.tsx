"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("")
    setSuccess(false)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: "http://localhost:3000/login",
        },
      })

      if (authError) {
        if (authError.message.toLowerCase().includes("already registered")) {
          throw new Error(
            "An account with this email already exists. Please sign in instead."
          )
        }

        throw authError
      }

      if (!data.user) {
        throw new Error("We couldn't create your account. Please try again.")
      }

      setSuccess(true)
      setPassword("")
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to create your account. Please try again."

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent mb-2">
            AgentShield Cloud
          </h1>

          <p className="text-muted-foreground">
            Create your account
          </p>
        </div>

        {success ? (
          <div className="space-y-6">

            <div className="p-5 rounded-lg bg-accent/10 border border-accent/50">
              <h2 className="font-semibold text-lg mb-2">
                Check your email
              </h2>

              <p className="text-sm text-muted-foreground">
                We've sent a verification email to:
              </p>

              <p className="font-medium mt-2 break-all">
                {email}
              </p>

              <p className="text-sm text-muted-foreground mt-3">
                Open the email and verify your account before signing in.
              </p>
            </div>

            <Link
              href="/login"
              className="block w-full text-center py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition"
            >
              Go to Sign in
            </Link>

          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive text-sm"
              >
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="John Doe"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                required
              />

              <p className="text-xs text-muted-foreground mt-1">
                Minimum 8 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>

          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-accent hover:underline"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/"
            className="text-accent hover:underline"
          >
            Back to home
          </Link>
        </div>

      </div>
    </div>
  )
}
