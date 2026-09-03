"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { motion } from "framer-motion"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Shield,
} from "lucide-react"

type SecurityEvent = {
  id: string
  decision: string
  risk_score: number
  severity: string
  categories: string[]
  created_at: string
}

type Metrics = {
  blocked_actions: number
  approval_requests: number
  monitored_actions: number
  active_policies: number
  avg_risk_score: number
  total_evaluations: number
}

const CATEGORY_COLORS = [
  "#00CED1",
  "#D946EF",
  "#22C55E",
  "#EF4444",
  "#F59E0B",
  "#8B5CF6",
]

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<Metrics>({
    blocked_actions: 0,
    approval_requests: 0,
    monitored_actions: 0,
    active_policies: 0,
    avg_risk_score: 0,
    total_evaluations: 0,
  })
  const [riskCategoryData, setRiskCategoryData] = useState<
    { name: string; value: number; color: string }[]
  >([])
  const [timelineData, setTimelineData] = useState<
    { date: string; blocked: number; allowed: number; approval: number }[]
  >([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push("/login")
          return
        }

        setUser(authUser)

        const { data: events, error: eventsError } = await supabase
          .from("agent_security_events")
          .select(
            "id, decision, risk_score, severity, categories, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(1000)

        if (eventsError) {
          console.error("Failed to load security events:", eventsError)
          return
        }

        const securityEvents = (events ?? []) as SecurityEvent[]

        const blocked = securityEvents.filter(
          (event) => event.decision === "BLOCK"
        ).length

        const approval = securityEvents.filter(
          (event) => event.decision === "REQUIRE_APPROVAL"
        ).length

        const allowed = securityEvents.filter(
          (event) => event.decision === "ALLOW"
        ).length

        const total = securityEvents.length

        const avgRisk =
          total > 0
            ? Math.round(
                securityEvents.reduce(
                  (sum, event) => sum + (event.risk_score || 0),
                  0
                ) / total
              )
            : 0

        setMetrics({
          blocked_actions: blocked,
          approval_requests: approval,
          monitored_actions: allowed,
          active_policies: 0,
          avg_risk_score: avgRisk,
          total_evaluations: total,
        })

        // Build category analytics from real event categories.
        const categoryCounts: Record<string, number> = {}

        securityEvents.forEach((event) => {
          ;(event.categories ?? []).forEach((category) => {
            const formatted = category
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase())

            categoryCounts[formatted] =
              (categoryCounts[formatted] || 0) + 1
          })
        })

        const categoryData = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value], index) => ({
            name,
            value,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          }))

        setRiskCategoryData(categoryData)

        // Build the last 7 days of real event activity.
        const today = new Date()
        const days: {
          date: string
          blocked: number
          allowed: number
          approval: number
        }[] = []

        for (let i = 6; i >= 0; i--) {
          const date = new Date(today)
          date.setHours(0, 0, 0, 0)
          date.setDate(today.getDate() - i)

          const nextDate = new Date(date)
          nextDate.setDate(date.getDate() + 1)

          const dayEvents = securityEvents.filter((event) => {
            const eventDate = new Date(event.created_at)
            return eventDate >= date && eventDate < nextDate
          })

          days.push({
            date: date.toLocaleDateString("en-US", {
              weekday: "short",
            }),
            blocked: dayEvents.filter(
              (event) => event.decision === "BLOCK"
            ).length,
            allowed: dayEvents.filter(
              (event) => event.decision === "ALLOW"
            ).length,
            approval: dayEvents.filter(
              (event) => event.decision === "REQUIRE_APPROVAL"
            ).length,
          })
        }

        setTimelineData(days)
      } catch (error) {
        console.error("Dashboard loading error:", error)
      } finally {
        setDataLoading(false)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

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
          <h1 className="text-2xl font-bold text-accent">
            AgentShield Cloud
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>

            <button
              onClick={() =>
                supabase.auth.signOut().then(() => router.push("/"))
              }
              className="px-3 py-1 rounded-lg border border-border hover:bg-card text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl font-bold mb-2">
            Welcome, {user?.user_metadata?.full_name || "User"}
          </h2>

          <p className="text-muted-foreground">
            Manage policies, review security events, and run simulations
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[
            {
              icon: AlertCircle,
              label: "Blocked Actions",
              value: metrics.blocked_actions,
              color: "text-destructive",
            },
            {
              icon: Clock,
              label: "Awaiting Approval",
              value: metrics.approval_requests,
              color: "text-amber-500",
            },
            {
              icon: CheckCircle2,
              label: "Allowed Actions",
              value: metrics.monitored_actions,
              color: "text-emerald-500",
            },
            {
              icon: Shield,
              label: "Active Policies",
              value:
                dataLoading ? "..." : metrics.active_policies,
              color: "text-accent",
            },
            {
              icon: BarChart3,
              label: "Avg Risk Score",
              value: `${metrics.avg_risk_score}%`,
              color: "text-secondary",
            },
            {
              icon: AlertCircle,
              label: "Total Evaluations",
              value: metrics.total_evaluations,
              color: "text-muted-foreground",
            },
          ].map((metric, i) => (
            <motion.div
              key={i}
              className="p-6 rounded-lg border border-border/40 bg-card hover:border-accent/50 transition card-hover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-4">
                <metric.icon className={`${metric.color}`} size={32} />

                <div>
                  <p className="text-xs text-muted-foreground uppercase">
                    {metric.label}
                  </p>

                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Timeline Chart */}
          <motion.div
            className="p-6 rounded-lg border border-border/40 bg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-semibold mb-4">
              Security Events — Last 7 Days
            </h3>

            {timelineData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No security events yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timelineData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#333"
                  />

                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                    }}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="allowed"
                    name="Allowed"
                    stroke="#00CED1"
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="blocked"
                    name="Blocked"
                    stroke="#EF4444"
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="approval"
                    name="Approval"
                    stroke="#F59E0B"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Risk Category Pie */}
          <motion.div
            className="p-6 rounded-lg border border-border/40 bg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="font-semibold mb-4">
              Risk Categories
            </h3>

            {riskCategoryData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No risk categories detected yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={riskCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {riskCategoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              label: "Run Simulation",
              href: "/simulator",
              icon: "🔍",
            },
            {
              label: "View Events",
              href: "/events",
              icon: "📋",
            },
            {
              label: "Manage Policies",
              href: "/policies",
              icon: "⚙️",
            },
            {
              label: "Security Coverage",
              href: "/security-coverage",
              icon: "🛡️",
            },
          ].map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="p-4 rounded-lg border border-accent/30 bg-card hover:bg-accent/10 transition text-center"
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="text-sm font-medium">
                {action.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
