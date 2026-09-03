"use client"

import Link from "next/link"
import { ArrowRight, Shield, Lock, Eye, FileText } from "lucide-react"
import { motion } from "framer-motion"

export default function Home() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="text-2xl font-bold text-accent">AgentShield Cloud</div>
          <nav className="flex gap-8">
            <Link href="/login" className="text-sm hover:text-accent transition">
              Login
            </Link>
            <Link href="/signup" className="text-sm hover:text-accent transition">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24">
        <motion.div className="text-center max-w-3xl mx-auto" {...fadeInUp}>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent">
            Secure Every AI Agent Action
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Detect prompt injection, sensitive data leakage, excessive permissions, and high-risk actions before they execute. Complete audit trail and policy enforcement.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/simulator"
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition flex items-center gap-2"
            >
              View Demo
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/signup"
              className="px-6 py-3 border border-accent/50 rounded-lg hover:bg-accent/10 transition"
            >
              Get Started
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <h2 className="text-4xl font-bold text-center mb-16">Key Capabilities</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Shield,
              title: "Prompt Injection Defense",
              desc: "Detect attempts to override instructions and bypass safeguards",
            },
            {
              icon: Eye,
              title: "Data Protection",
              desc: "Identify and mask PII, credentials, and sensitive tokens",
            },
            {
              icon: Lock,
              title: "Tool Access Control",
              desc: "Enforce least-privilege principle for mock tool access",
            },
            {
              icon: FileText,
              title: "Audit Evidence",
              desc: "Complete immutable record of all evaluations and decisions",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              className="p-6 rounded-lg border border-border/40 bg-card hover:border-accent/50 transition card-hover"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <feature.icon className="text-accent mb-4" size={28} />
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="container mx-auto px-4 py-24">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              num: "1",
              title: "Agent Request",
              desc: "Agent submits action with user request and requested tool",
            },
            {
              num: "2",
              title: "Evaluation",
              desc: "Security engine detects risks and evaluates policies",
            },
            {
              num: "3",
              title: "Decision",
              desc: "Allow, require approval, or block with risk score",
            },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent text-background flex items-center justify-center font-bold">
                {step.num}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security Controls */}
      <section className="container mx-auto px-4 py-24">
        <h2 className="text-4xl font-bold text-center mb-16">
          Enterprise Security Controls
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-sm">
          {[
            "Role-Based Access Control with Row-Level Security",
            "Deterministic risk scoring with explainable signals",
            "Policy templates and custom policy creation",
            "Approval workflow for high-risk actions",
            "Complete audit trail with immutable logs",
            "JWT token validation and secure authentication",
          ].map((control, i) => (
            <div key={i} className="flex gap-3">
              <div className="text-accent">✓</div>
              <div>{control}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-24">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>
            AgentShield Cloud is a demonstration platform using mock data and
            deterministic evaluation rules. Not for production use.
          </p>
        </div>
      </footer>
    </div>
  )
}
