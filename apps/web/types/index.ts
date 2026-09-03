export type SecurityDecision = "ALLOW" | "REQUIRE_APPROVAL" | "BLOCK"

export interface SecurityEvent {
  id: string
  user_id: string
  agent_name: string
  user_request: string
  tool_requested: string
  decision: SecurityDecision
  risk_score: number
  severity: string
  detections: string[]
  matching_policy_ids: string[]
  created_at: string
  sanitized_input_preview?: string
}

export interface SecurityEvaluationRequest {
  agent_name: string
  user_request: string
  mock_context?: string
  requested_tool: string
  action_type?: string
}

export interface SecurityEvaluationResponse {
  decision: SecurityDecision
  risk_score: number
  severity: string
  categories: string[]
  detections: string[]
  matching_policy_ids: string[]
  mitigation_recommendations: string[]
  sanitized_input_preview: string
}

export interface Policy {
  id: string
  organization_id: string
  name: string
  description?: string
  category: string
  severity_threshold: number
  tool_scope: string[]
  action: "allow" | "require_approval" | "block"
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface ApprovalRequest {
  id: string
  event_id: string
  status: "pending" | "approved" | "denied"
  reason?: string
  reviewer_id?: string
  created_at: string
  updated_at: string
}

export interface DashboardMetrics {
  total_evaluations: number
  blocked_actions: number
  monitored_actions: number
  approval_requests: number
  active_policies: number
  avg_risk_score: number
}

export interface User {
  id: string
  email: string
  full_name?: string
  role: "user" | "admin"
  created_at: string
}
