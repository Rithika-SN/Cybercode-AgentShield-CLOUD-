"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { apiClient } from "@/lib/api-client"
import { motion } from "framer-motion"
import {
  SecurityEvaluationRequest,
  SecurityEvaluationResponse,
} from "@/types"
import { AlertCircle, CheckCircle2, XCircle, Zap } from "lucide-react"


export default function SimulatorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [formData, setFormData] = useState<SecurityEvaluationRequest>({
    agent_name: "",
    user_request: "",
    mock_context: "",
    requested_tool: "",
    action_type: "default",
  })
  const [result, setResult] = useState<SecurityEvaluationResponse | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        if (!authUser) {
          router.push("/login")
          return
        }
      } catch (error) {
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResult(null)
    setEvaluating(true)

    try {
      const response = await apiClient.post<SecurityEvaluationResponse>(
        "/api/v1/evaluate",
        formData
      )
      setResult(response.data)
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "Evaluation failed"
      )
    } finally {
      setEvaluating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">AgentShield Cloud</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/dashboard" className="hover:text-accent transition">
              Dashboard
            </a>
            <a href="/events" className="hover:text-accent transition">
              Events
            </a>
            <a href="/policies" className="hover:text-accent transition">
              Policies
            </a>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
              className="text-muted-foreground hover:text-accent transition"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl font-bold mb-2">Security Simulator</h2>
          <p className="text-muted-foreground">
            Test agent actions and see how our security engine evaluates them
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <motion.div
            className="p-6 rounded-lg border border-border/40 bg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="font-semibold mb-6">Evaluate Agent Action</h3>

            <form onSubmit={handleEvaluate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={formData.agent_name}
                  onChange={(e) =>
                    setFormData({ ...formData, agent_name: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., DataExportBot"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  User Request
                </label>
                <textarea
                  value={formData.user_request}
                  onChange={(e) =>
                    setFormData({ ...formData, user_request: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="What is the user asking the agent to do?"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Context / Document Content
                </label>
                <textarea
                  value={formData.mock_context}
                  onChange={(e) =>
                    setFormData({ ...formData, mock_context: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Any additional context the agent sees"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Requested Tool <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.requested_tool}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requested_tool: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="e.g., database_query, send_email, web_search"
                />
              </div>

              <button
                type="submit"
                disabled={evaluating}
                className="w-full py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap size={18} />
                {evaluating ? "Evaluating..." : "Evaluate"}
              </button>
            </form>

          </motion.div>

          {/* Result */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive text-sm mb-4">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Decision */}
                <motion.div
                  className={`p-6 rounded-lg border-2 ${
                    result.decision === "ALLOW"
                      ? "border-emerald-500/50 bg-emerald-950/20"
                      : result.decision === "BLOCK"
                        ? "border-destructive/50 bg-destructive/10"
                        : "border-amber-500/50 bg-amber-950/20"
                  }`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {result.decision === "ALLOW" ? (
                      <CheckCircle2 className="text-emerald-500" size={28} />
                    ) : result.decision === "BLOCK" ? (
                      <XCircle className="text-destructive" size={28} />
                    ) : (
                      <AlertCircle className="text-amber-500" size={28} />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Decision</p>
                      <p className="text-2xl font-bold">{result.decision}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                      <p className="text-xl font-bold">{result.risk_score}/100</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Severity</p>
                      <p className="text-xl font-bold">{result.severity}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Detections */}
                {result.detections.length > 0 && (
                  <div className="p-4 rounded-lg border border-border/40 bg-card">
                    <p className="text-sm font-medium mb-3">Detections</p>
                    <ul className="space-y-2">
                      {result.detections.map((detection, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex gap-2"
                        >
                          <span className="text-accent">•</span>
                          {detection}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mitigation */}
                {result.mitigation_recommendations.length > 0 && (
                  <div className="p-4 rounded-lg border border-border/40 bg-card">
                    <p className="text-sm font-medium mb-3">
                      Mitigation Recommendations
                    </p>
                    <ul className="space-y-2">
                      {result.mitigation_recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex gap-2"
                        >
                          <span className="text-secondary">→</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Matching Policies */}
                {result.matching_policy_ids.length > 0 && (
                  <div className="p-4 rounded-lg border border-border/40 bg-card">
                    <p className="text-sm font-medium mb-3">
                      Matching Policies
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.matching_policy_ids.map((policy, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-lg bg-secondary/20 text-secondary text-xs font-medium"
                        >
                          {policy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sanitized Input */}
                <div className="p-4 rounded-lg border border-border/40 bg-card">
                  <p className="text-sm font-medium mb-3">
                    Sanitized Input Preview
                  </p>
                  <div className="rounded-lg bg-background border border-border/40 p-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {result.sanitized_input_preview}
                    </p>
                  </div>
                </div>

                {/* Categories */}
                {result.categories.length > 0 && (
                  <div className="p-4 rounded-lg border border-border/40 bg-card">
                    <p className="text-sm font-medium mb-3">Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {result.categories.map((cat, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-lg bg-accent/20 text-accent text-xs font-medium"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!result && !error && (
              <div className="p-8 rounded-lg border border-dashed border-border/40 text-center text-muted-foreground">
                <p>Evaluation results will appear here</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
