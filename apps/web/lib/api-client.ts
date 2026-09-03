import axios from "axios"
import { supabase } from "./supabase"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Get the current Supabase session and attach its access token.
apiClient.interceptors.request.use(async (config) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.error("Failed to get Supabase session:", error)
  }

  return config
})

export default apiClient
