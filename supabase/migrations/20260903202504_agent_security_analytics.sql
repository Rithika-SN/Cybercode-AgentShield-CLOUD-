-- AgentShield Cloud analytics/event history
-- Safe standalone table so existing security_events schema is not disturbed.

CREATE TABLE IF NOT EXISTS public.agent_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    agent_name TEXT NOT NULL DEFAULT 'Unknown Agent',
    user_request TEXT NOT NULL DEFAULT '',
    requested_tool TEXT,
    mock_context TEXT,

    decision TEXT NOT NULL DEFAULT 'ALLOW',
    risk_score INTEGER NOT NULL DEFAULT 0,
    severity TEXT NOT NULL DEFAULT 'LOW',

    categories TEXT[] NOT NULL DEFAULT '{}',
    detections JSONB NOT NULL DEFAULT '[]'::jsonb,

    matching_policy_ids TEXT[] NOT NULL DEFAULT '{}',
    mitigation_recommendations TEXT[] NOT NULL DEFAULT '{}',

    sanitized_input_preview TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_security_events_user_id
    ON public.agent_security_events(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_security_events_created_at
    ON public.agent_security_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_security_events_decision
    ON public.agent_security_events(decision);

CREATE INDEX IF NOT EXISTS idx_agent_security_events_risk
    ON public.agent_security_events(risk_score);

ALTER TABLE public.agent_security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agent events"
ON public.agent_security_events;

CREATE POLICY "Users can view own agent events"
ON public.agent_security_events
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own agent events"
ON public.agent_security_events;

CREATE POLICY "Users can insert own agent events"
ON public.agent_security_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Attempt to migrate old security_events data when possible.
-- Uses JSONB so this does not depend on the old table's exact column layout.
DO $$
BEGIN
    IF to_regclass('public.security_events') IS NOT NULL THEN

        EXECUTE $migration$
            INSERT INTO public.agent_security_events
            (
                user_id,
                agent_name,
                user_request,
                requested_tool,
                decision,
                risk_score,
                severity,
                categories,
                detections,
                created_at
            )
            SELECT
                (to_jsonb(s)->>'user_id')::uuid,

                COALESCE(
                    to_jsonb(s)->>'agent_name',
                    to_jsonb(s)->>'agent',
                    'Migrated Agent'
                ),

                COALESCE(
                    to_jsonb(s)->>'user_request',
                    to_jsonb(s)->>'request',
                    ''
                ),

                NULLIF(
                    COALESCE(
                        to_jsonb(s)->>'requested_tool',
                        to_jsonb(s)->>'tool'
                    ),
                    ''
                ),

                COALESCE(
                    to_jsonb(s)->>'decision',
                    'ALLOW'
                ),

                COALESCE(
                    NULLIF(to_jsonb(s)->>'risk_score','')::integer,
                    0
                ),

                COALESCE(
                    to_jsonb(s)->>'severity',
                    'LOW'
                ),

                CASE
                    WHEN jsonb_typeof(
                        COALESCE(
                            to_jsonb(s)->'categories',
                            '[]'::jsonb
                        )
                    ) = 'array'
                    THEN ARRAY(
                        SELECT jsonb_array_elements_text(
                            COALESCE(
                                to_jsonb(s)->'categories',
                                '[]'::jsonb
                            )
                        )
                    )
                    ELSE '{}'
                END,

                COALESCE(
                    to_jsonb(s)->'detections',
                    '[]'::jsonb
                ),

                COALESCE(
                    NULLIF(to_jsonb(s)->>'created_at','')::timestamptz,
                    NOW()
                )

            FROM public.security_events s

            WHERE (to_jsonb(s)->>'user_id') IS NOT NULL

            AND NOT EXISTS (
                SELECT 1
                FROM public.agent_security_events e
                WHERE e.user_id = (to_jsonb(s)->>'user_id')::uuid
                AND e.created_at = COALESCE(
                    NULLIF(to_jsonb(s)->>'created_at','')::timestamptz,
                    NOW()
                )
            );
        $migration$;

    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Old event migration skipped: %', SQLERRM;
END $$;
