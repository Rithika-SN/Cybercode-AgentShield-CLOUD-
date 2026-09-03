-- Seed demo policies
INSERT INTO public.policies (name, description, category, severity_threshold, tool_scope, action, enabled)
VALUES
  (
    'Block Prompt Injection',
    'Immediately block any request with detected prompt injection patterns',
    'prompt_injection',
    75,
    ARRAY['*'],
    'block',
    TRUE
  ),
  (
    'Block Credential Leak',
    'Block any request with exposed API keys, passwords, or tokens',
    'credential_leak',
    80,
    ARRAY['*'],
    'block',
    TRUE
  ),
  (
    'Require Approval for High Risk',
    'Require human approval for actions with risk score above 60',
    'all',
    60,
    ARRAY['*'],
    'require_approval',
    TRUE
  ),
  (
    'Block Destructive Operations',
    'Block delete, drop, and similar destructive operations',
    'destructive',
    70,
    ARRAY['delete_mock_record'],
    'block',
    TRUE
  )
ON CONFLICT DO NOTHING;
