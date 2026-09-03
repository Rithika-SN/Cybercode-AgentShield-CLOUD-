import { createClient } from "@supabase/supabase-js"

// Local defaults keep the portfolio app buildable before cloud credentials are
// configured. Production deployments must provide their own public values.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5NzAwMDAwMDB9.K3IEUea01cn3MgPIHEW0qGqtMISQBXs_hp02pWQQZEU"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
