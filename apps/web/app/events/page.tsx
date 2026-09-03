"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type SecurityEvent = {
  id: string
  agent_name: string
  user_request: string
  requested_tool: string | null
  decision: string
  risk_score: number
  severity: string
  categories: string[]
  detections: unknown[]
  matching_policy_ids: string[]
  mitigation_recommendations: string[]
  sanitized_input_preview: string | null
  created_at: string
}

export default function EventsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [search, setSearch] = useState("")
  const [decisionFilter, setDecisionFilter] = useState("ALL")
  const [error, setError] = useState("")

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        const { data, error: eventsError } = await supabase
          .from("agent_security_events")
          .select(
            "id, agent_name, user_request, requested_tool, decision, risk_score, severity, categories, detections, matching_policy_ids, mitigation_recommendations, sanitized_input_preview, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(500)

        if (eventsError) {
          console.error("Failed to load events:", eventsError)
          setError("Unable to load security events.")
          return
        }

        setEvents((data ?? []) as SecurityEvent[])
      } catch (err) {
        console.error("Events loading error:", err)
        setError("Unable to load security events.")
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [router])

  const filteredEvents = events.filter((event) => {
    const searchText = search.toLowerCase()

    const matchesSearch =
      !searchText ||
      event.agent_name.toLowerCase().includes(searchText) ||
      event.user_request.toLowerCase().includes(searchText) ||
      (event.requested_tool ?? "").toLowerCase().includes(searchText) ||
      event.categories.some((category) =>
        category.toLowerCase().includes(searchText)
      )

    const matchesDecision =
      decisionFilter === "ALL" || event.decision === decisionFilter

    return matchesSearch && matchesDecision
  })

  const decisionClass = (decision: string) => {
    if (decision === "BLOCK") {
      return "bg-red-500/10 text-red-400 border-red-500/30"
    }

    if (decision === "REQUIRE_APPROVAL") {
      return "bg-amber-500/10 text-amber-400 border-amber-500/30"
    }

    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
  }

  const severityClass = (severity: string) => {
    if (severity === "CRITICAL") {
      return "text-red-400"
    }

    if (severity === "HIGH") {
      return "text-orange-400"
    }

    if (severity === "MEDIUM") {
      return "text-amber-400"
    }

    return "text-emerald-400"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">
          Loading security events...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">
            AgentShield Cloud
          </h1>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="hover:text-accent transition"
            >
              Dashboard
            </Link>

            <Link
              href="/simulator"
              className="hover:text-accent transition"
            >
              Simulator
            </Link>

            <button
              onClick={() =>
                supabase.auth.signOut().then(() => router.push("/"))
              }
              className="text-muted-foreground hover:text-accent transition"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Security Events
          </h2>

          <p className="text-muted-foreground">
            Searchable audit trail of all agent action evaluations
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-5 rounded-lg border border-border/40 bg-card">
            <p className="text-xs text-muted-foreground uppercase">
              Total
            </p>
            <p className="text-2xl font-bold mt-1">
              {events.length}
            </p>
          </div>

          <div className="p-5 rounded-lg border border-red-500/20 bg-card">
            <p className="text-xs text-muted-foreground uppercase">
              Blocked
            </p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {events.filter((event) => event.decision === "BLOCK").length}
            </p>
          </div>

          <div className="p-5 rounded-lg border border-amber-500/20 bg-card">
            <p className="text-xs text-muted-foreground uppercase">
              Approval
            </p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {
                events.filter(
                  (event) => event.decision === "REQUIRE_APPROVAL"
                ).length
              }
            </p>
          </div>

          <div className="p-5 rounded-lg border border-emerald-500/20 bg-card">
            <p className="text-xs text-muted-foreground uppercase">
              Allowed
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {events.filter((event) => event.decision === "ALLOW").length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 rounded-lg border border-border/40 bg-card mb-6">
          <div className="grid md:grid-cols-[1fr_auto] gap-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agent, request, tool, or category..."
              className="w-full px-4 py-3 rounded-lg bg-background border border-border/50 outline-none focus:border-accent"
            />

            <select
              value={decisionFilter}
              onChange={(event) =>
                setDecisionFilter(event.target.value)
              }
              className="px-4 py-3 rounded-lg bg-background border border-border/50 outline-none"
            >
              <option value="ALL">All decisions</option>
              <option value="ALLOW">Allowed</option>
              <option value="BLOCK">Blocked</option>
              <option value="REQUIRE_APPROVAL">
                Require approval
              </option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        {/* Events */}
        {filteredEvents.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-border/40 text-center">
            <p className="text-muted-foreground">
              {events.length === 0
                ? "No security events yet. Run a simulation to create one."
                : "No events match your search or filter."}
            </p>

            {events.length === 0 && (
              <Link
                href="/simulator"
                className="inline-block mt-4 px-5 py-2 rounded-lg bg-accent text-background font-medium hover:opacity-90 transition"
              >
                Run Simulation
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="p-6 rounded-lg border border-border/40 bg-card hover:border-accent/30 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-semibold">
                        {event.agent_name}
                      </h3>

                      <span
                        className={`px-2 py-1 text-xs rounded-full border ${decisionClass(
                          event.decision
                        )}`}
                      >
                        {event.decision}
                      </span>

                      <span
                        className={`text-xs font-semibold ${severityClass(
                          event.severity
                        )}`}
                      >
                        {event.severity}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {new Date(event.created_at).toLocaleString()}
                    </p>

                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground uppercase mb-1">
                        User Request
                      </p>

                      <p className="text-sm break-words">
                        {event.user_request}
                      </p>
                    </div>

                    {event.requested_tool && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground uppercase mb-1">
                          Requested Tool
                        </p>

                        <code className="text-sm text-accent">
                          {event.requested_tool}
                        </code>
                      </div>
                    )}

                    {event.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.categories.map((category) => (
                          <span
                            key={category}
                            className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs"
                          >
                            {category.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="lg:text-right shrink-0">
                    <p className="text-xs text-muted-foreground uppercase">
                      Risk Score
                    </p>

                    <p
                      className={`text-3xl font-bold ${
                        event.risk_score >= 80
                          ? "text-red-400"
                          : event.risk_score >= 60
                            ? "text-orange-400"
                            : event.risk_score >= 30
                              ? "text-amber-400"
                              : "text-emerald-400"
                      }`}
                    >
                      {event.risk_score}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      / 100
                    </p>
                  </div>
                </div>

                {event.mitigation_recommendations.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-border/30">
                    <p className="text-xs text-muted-foreground uppercase mb-2">
                      Mitigation Recommendations
                    </p>

                    <ul className="text-sm text-muted-foreground space-y-1">
                      {event.mitigation_recommendations.map(
                        (recommendation, index) => (
                          <li key={index}>
                            • {recommendation}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
