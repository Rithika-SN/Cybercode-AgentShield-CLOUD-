from typing import Optional
from pydantic import BaseModel, Field


class SecurityEvaluationRequest(BaseModel):
    agent_name: str = Field(..., min_length=1)
    user_request: str = Field(..., min_length=1)
    mock_context: Optional[str] = None
    requested_tool: str = Field(
        default="knowledge_search",
        description="One of: knowledge_search, read_demo_file, send_mock_email, export_mock_report, delete_mock_record",
    )
    action_type: str = "default"


class SecurityEvaluationResponse(BaseModel):
    decision: str  # ALLOW, REQUIRE_APPROVAL, BLOCK
    risk_score: int
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    categories: list[str]
    detections: list[str]
    matching_policy_ids: list[str]
    mitigation_recommendations: list[str]
    sanitized_input_preview: str


class SecurityEvent(BaseModel):
    id: str
    user_id: str
    agent_name: str
    user_request: str
    tool_requested: str
    decision: str
    risk_score: int
    severity: str
    detections: list[str]
    matching_policy_ids: list[str]
    created_at: str
    sanitized_input_preview: Optional[str] = None


class DashboardMetrics(BaseModel):
    total_evaluations: int
    blocked_actions: int
    monitored_actions: int
    approval_requests: int
    active_policies: int
    avg_risk_score: float
