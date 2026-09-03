"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { AlertTriangle, Lock, Zap, Eye } from "lucide-react"

export default function SecurityCoveragePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push("/login")
        return
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const controls = [
    {
      icon: AlertTriangle,
      title: "Prompt Injection Defense",
      description:
        "Detects attempts to override system instructions, reveal secrets, bypass safeguards, or ignore policies through injection patterns in user requests and document context.",
      techniques: [
        "Semantic pattern matching for override keywords",
        "Instruction-set conflict detection",
        "Policy bypass attempt identification",
      ],
    },
    {
      icon: Eye,
      title: "Sensitive Information Disclosure",
      description:
        "Identifies and masks PII, API keys, tokens, email addresses, and credential-like patterns before they propagate through logs or reports.",
      techniques: [
        "Regex-based pattern matching for credentials",
        "PII classification (emails, phone numbers, SSN-like patterns)",
        "Output sanitization and masking",
      ],
    },
    {
      icon: Zap,
      title: "Excessive Agency & Tool Misuse",
      description:
        "Controls which tools agents can access and blocks destructive or excessively privileged requests based on least-privilege principles.",
      techniques: [
        "Tool scope validation",
        "Destructive action detection",
        "Permission boundary enforcement",
      ],
    },
    {
      icon: Lock,
      title: "Insecure Output Handling",
      description:
        "Ensures sanitized previews and prevents sensitive data from being returned to unauthorized users.",
      techniques: [
        "Output filtering and sanitization",
        "Role-based result filtering",
        "Safe preview generation",
      ],
    },
  ]

  const riskMatrix = [
    { category: "Prompt Injection", severity: "Critical", detection: "Keyword & semantic pattern matching" },
    { category: "Credential Leak", severity: "Critical", detection: "Regex patterns for API keys, tokens" },
    { category: "PII Exposure", severity: "High", detection: "Email, phone, SSN-like pattern detection" },
    { category: "Destructive Action", severity: "High", detection: "Tool scope and permission checks" },
    { category: "Privilege Escalation", severity: "High", detection: "Capability boundary validation" },
    { category: "Malformed Request", severity: "Medium", detection: "Input schema validation" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent">AgentShield Cloud</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/dashboard" className="hover:text-accent transition">
              Dashboard
            </a>
            <a href="/simulator" className="hover:text-accent transition">
              Simulator
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
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-2">Security Coverage</h2>
          <p className="text-muted-foreground">
            How AgentShield Cloud addresses key AI security risks
          </p>
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {controls.map((control, i) => (
            <div
              key={i}
              className="p-6 rounded-lg border border-border/40 bg-card hover:border-accent/50 transition"
            >
              <control.icon className="text-accent mb-4" size={32} />
              <h3 className="text-xl font-semibold mb-2">{control.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {control.description}
              </p>
              <div className="space-y-1">
                {control.techniques.map((tech, j) => (
                  <div key={j} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-accent">•</span>
                    {tech}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Risk Matrix */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-6">Risk Category Assessment</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-3 px-4 font-semibold">Category</th>
                  <th className="text-left py-3 px-4 font-semibold">Severity</th>
                  <th className="text-left py-3 px-4 font-semibold">Detection Method</th>
                </tr>
              </thead>
              <tbody>
                {riskMatrix.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/40 hover:bg-card/50 transition"
                  >
                    <td className="py-3 px-4">{row.category}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          row.severity === "Critical"
                            ? "bg-destructive/20 text-destructive"
                            : row.severity === "High"
                              ? "bg-amber-500/20 text-amber-500"
                              : "bg-secondary/20 text-secondary"
                        }`}
                      >
                        {row.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {row.detection}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-6 rounded-lg border border-border/40 bg-card/50">
          <p className="text-sm text-muted-foreground">
            <strong>Educational Notice:</strong> This platform demonstrates security concepts using deterministic rules and mock data. It is not a certified security product and should not be used for actual production AI security. These controls are designed for learning and recruitment purposes only.
          </p>
        </div>
      </div>
    </div>
  )
}
