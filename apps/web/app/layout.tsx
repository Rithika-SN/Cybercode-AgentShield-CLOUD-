import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/app/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AgentShield Cloud",
  description: "Secure AI agent action evaluation and approval platform",
  keywords: ["security", "AI", "agent", "policy", "risk"],
  openGraph: {
    title: "AgentShield Cloud",
    description: "Secure AI agent action evaluation and approval platform",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
