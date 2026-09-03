import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SecurityEvaluator:
    """
    Generic deterministic security evaluator for LLM/agent interactions.

    The evaluator does not depend on predefined demo scenarios. It analyzes
    arbitrary agent names, user requests, context, and requested tools.
    """

    # ------------------------------------------------------------------
    # Prompt-injection / instruction-manipulation detection
    # ------------------------------------------------------------------
    INJECTION_PATTERNS = [
        (
            r"(?i)\b(ignore|disregard|forget|override|bypass|dismiss)\b"
            r".{0,100}\b(previous|prior|system|developer|assistant|"
            r"instruction|rule|policy|safeguard|restriction)s?\b",
            "Instruction override attempt",
            30,
        ),
        (
            r"(?i)\b(reveal|show|print|display|expose|leak)\b"
            r".{0,80}\b(system prompt|developer prompt|hidden prompt|"
            r"instructions|secret|credentials?|api[\s_-]?keys?|tokens?)\b",
            "Attempt to expose hidden instructions or secrets",
            30,
        ),
        (
            r"(?i)\b(act|pretend|behave|respond)\b.{0,50}"
            r"\bas\s+(an?\s+)?(admin|root|system|developer)\b",
            "Privilege/persona manipulation attempt",
            25,
        ),
        (
            r"(?i)\b(disable|turn off|remove|bypass)\b.{0,80}"
            r"\b(safety|security|filter|guardrail|restriction|policy)\b",
            "Security-control bypass attempt",
            35,
        ),
        (
            r"(?i)\b(what|tell|show|give)\b.{0,80}"
            r"\b(your|the)\b.{0,40}"
            r"\b(system prompt|hidden instructions|internal instructions)\b",
            "Attempt to obtain hidden instructions",
            25,
        ),
    ]

    # ------------------------------------------------------------------
    # Credential / secret detection
    # ------------------------------------------------------------------
    CREDENTIAL_PATTERNS = [
        (
            r"(?i)\bapi[_ -]?key\b\s*[:=]\s*['\"]?"
            r"[A-Za-z0-9_\-./+=]{16,}",
            "API key",
        ),
        (
            r"(?i)\b(access[_ -]?token|auth[_ -]?token)\b\s*[:=]\s*['\"]?"
            r"[A-Za-z0-9_\-./+=]{16,}",
            "access token",
        ),
        (
            r"(?i)\b(password|passwd|pwd)\b\s*[:=]\s*['\"]?"
            r"[^\s'\"]{8,}",
            "password",
        ),
        (
            r"(?i)\b(secret|secret[_ -]?key)\b\s*[:=]\s*['\"]?"
            r"[A-Za-z0-9_\-./+=]{8,}",
            "secret",
        ),
        (
            r"(?i)\bbearer\s+[A-Za-z0-9_\-./+=]{20,}",
            "bearer token",
        ),
        (
            r"\bsk[-_][A-Za-z0-9_\-]{16,}\b",
            "API key",
        ),
        (
            r"-----BEGIN\s+(RSA |EC |OPENSSH )?PRIVATE KEY-----",
            "private key",
        ),
        (
            r"(?i)\b(?:mongodb|postgres(?:ql)?|mysql|redis)://"
            r"[^\s]+:[^\s@]+@",
            "database connection credential",
        ),
    ]

    # ------------------------------------------------------------------
    # PII detection
    # ------------------------------------------------------------------
    PII_PATTERNS = [
        (
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
            "Email",
        ),
        (
            r"\b(?:\+?\d{1,3}[-.\s]?)?"
            r"(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b",
            "Phone",
        ),
        (
            r"\b\d{3}[- ]\d{2}[- ]\d{4}\b",
            "SSN",
        ),
        (
            r"(?i)\b(?:credit\s*card|card\s*number)\b"
            r"\s*[:=]?\s*\d(?:[\s-]?\d){12,18}\b",
            "Payment card",
        ),
    ]

    # ------------------------------------------------------------------
    # Sensitive-data request indicators
    # ------------------------------------------------------------------
    PII_REQUEST_PATTERNS = [
        (
            r"(?i)\b(?:employee|staff|customer|user|patient|client)\b.{0,80}\b(?:phone|mobile|email|address|contact)\b",
            "Request for personal contact information",
            25,
        ),
        (
            r"(?i)\b(?:personal|private|sensitive)\b.{0,60}\b(?:email|emails|phone|phones|phone numbers|contact details|information)\b",
            "Request for personal information",
            25,
        ),
        (
            r"(?i)\b(?:all|every|entire|list of)\b.{0,60}\b(?:employee|staff|customer|user|patient|client)\b.{0,60}\b(?:phone|email|contact|personal information)\b",
            "Bulk personal-data request",
            30,
        ),
    ]


    # ------------------------------------------------------------------
    EXFILTRATION_PATTERNS = [
        (
            r"(?i)\b(send|upload|forward|transfer|post|share|export|"
            r"exfiltrate|leak)\b.{0,120}\b(data|records?|database|"
            r"credentials?|passwords?|secrets?|tokens?|files?|users?)\b",
            "Potential sensitive-data exfiltration",
            40,
        ),
        (
            r"(?i)\b(send|upload|post|forward|transfer)\b.{0,100}"
            r"\b(to|into)\b.{0,100}"
            r"(https?://|ftp://|external|attacker|unknown|third[- ]party)",
            "Potential external data transfer",
            35,
        ),
        (
            r"(?i)\b(download|upload|send|copy|dump)\b.{0,100}"
            r"\b(all|entire|every|full)\b.{0,80}"
            r"\b(database|records?|users?|files?|data)\b",
            "Bulk data transfer request",
            40,
        ),
    ]

    # ------------------------------------------------------------------
    # Destructive-operation indicators
    # ------------------------------------------------------------------
    DESTRUCTIVE_PATTERNS = [
        (
            r"(?i)\b(delete|drop|truncate|wipe|destroy|erase|purge)\b"
            r".{0,100}\b(all|everything|records?|data|database|tables?|files?)\b",
            "Bulk destructive operation",
            45,
        ),
        (
            r"(?i)\b(delete|drop|truncate|wipe|destroy|erase|purge)\b",
            "Destructive operation requested",
            30,
        ),
        (
            r"(?i)\b(shutdown|terminate|kill|disable)\b"
            r".{0,80}\b(service|server|system|application|account)\b",
            "Potentially destructive system operation",
            35,
        ),
    ]

    # ------------------------------------------------------------------
    # Generic sensitive-intent detection
    # ------------------------------------------------------------------
    SECRET_EXTRACTION_PATTERNS = [
        (
            r"(?i)\b("
            r"reveal|show|display|print|dump|extract|retrieve|"
            r"give|tell|provide|output|return|expose"
            r")\b.{0,120}\b("
            r"system prompt|developer prompt|hidden prompt|hidden instructions|"
            r"internal instructions|secret instructions|system instructions|"
            r"internal prompt|private prompt|confidential instructions"
            r")\b",
            "Attempt to extract hidden or confidential instructions",
            40,
        ),
        (
            r"(?i)\b("
            r"reveal|show|display|print|dump|extract|retrieve|"
            r"give|tell|provide|output|return|expose"
            r")\b.{0,100}\b("
            r"secrets?|credentials?|passwords?|api[\s_-]?keys?|"
            r"access[\s_-]?tokens?|auth[\s_-]?tokens?|private keys?"
            r")\b",
            "Attempt to extract secrets or credentials",
            45,
        ),
    ]

    SOCIAL_ENGINEERING_PATTERNS = [
        (
            r"(?i)\b("
            r"impersonate|pretend to be|pose as|masquerade as|"
            r"convince|persuade|deceive|trick|manipulate"
            r")\b.{0,120}\b("
            r"employee|customer|user|manager|administrator|admin|"
            r"bank|support|security|executive|ceo|victim"
            r")\b",
            "Potential social-engineering or impersonation attempt",
            35,
        ),
        (
            r"(?i)\b("
            r"send|write|create|compose|generate"
            r")\b.{0,100}\b("
            r"phishing|fraudulent|fake|deceptive|scam"
            r")\b.{0,100}\b("
            r"email|message|login|payment|request|link"
            r")\b",
            "Potential phishing or deceptive communication",
            40,
        ),
    ]

    FRAUD_PATTERNS = [
        (
            r"(?i)\b("
            r"commit|perform|execute|facilitate|enable|carry out|"
            r"help with|assist with"
            r")\b.{0,100}\b("
            r"fraud|financial fraud|payment fraud|bank fraud|"
            r"identity fraud|scam|money laundering"
            r")\b",
            "Potential financial fraud activity",
            45,
        ),
        (
            r"(?i)\b("
            r"steal|take|obtain|transfer|move"
            r")\b.{0,100}\b("
            r"money|funds|payments?|bank account"
            r")\b.{0,100}\b("
            r"without permission|unauthorized|illegally|"
            r"without authorization"
            r")\b",
            "Potential unauthorized financial activity",
            45,
        ),
    ]

    # Generic high-risk tool indicators.
    HIGH_RISK_TOOL_PATTERNS = [
        (r"(?i)\b(delete|remove|destroy|drop|truncate|wipe|purge)\b", 35),
        (r"(?i)\b(export|download|upload|transfer|send|email)\b", 20),
        (r"(?i)\b(exec|execute|shell|command|terminal|code|script)\b", 30),
        (r"(?i)\b(admin|root|sudo|privileged)\b", 30),
    ]

    def evaluate(
        self,
        agent_name: str,
        user_request: str,
        requested_tool: str,
        mock_context: Optional[str] = None,
    ) -> dict:
        """
        Evaluate arbitrary LLM/agent input.

        Existing API compatibility is preserved through the mock_context
        parameter. It represents contextual data supplied to the evaluator.
        """

        user_request = str(user_request or "")
        requested_tool = str(requested_tool or "")
        context = str(mock_context or "")

        # Analyze both request and context because attacks can appear in
        # either the user's instruction or retrieved/tool-generated content.
        combined_text = self._normalize(
            f"Agent: {agent_name}\n"
            f"User request: {user_request}\n"
            f"Requested tool: {requested_tool}\n"
            f"Context: {context}"
        )

        detections = []
        categories = set()
        matching_policies = []
        risk_score = 0

        # 1. Prompt injection
        result = self._check_prompt_injection(combined_text)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("prompt_injection")
            matching_policies.append("policy_001")

        # 2. Credentials / secrets
        result = self._check_credentials(combined_text)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("credential_leak")
            matching_policies.append("policy_002")

        # 3. PII
        result = self._check_pii(combined_text)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("data_leak")

        # 3b. PII request detection
        result = self._check_pii_request(combined_text)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("data_leak")

        # 4. Exfiltration
        result = self._check_exfiltration(combined_text)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("data_exfiltration")
            matching_policies.append("policy_005")

        # 5. Hidden-secret / instruction extraction
        result = self._check_sensitive_extraction(combined_text)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("secret_extraction")
            matching_policies.append("policy_002")

        # 6. Social engineering / phishing
        result = self._check_social_engineering(combined_text)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("social_engineering")
            matching_policies.append("policy_006")

        # 7. Fraud / unauthorized financial activity
        result = self._check_fraud(combined_text)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("fraud")
            matching_policies.append("policy_007")

        # 8. Destructive actions
        result = self._check_destructive_operations(
            user_request,
            requested_tool,
            context,
        )
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("destructive")
            matching_policies.append("policy_004")

        # 9. Generic tool risk
        result = self._check_tool_risk(requested_tool)
        if result["detected"]:
            detections.extend(result["signals"])
            risk_score += result["score"]
            categories.add("tool_risk")

        # Multiple independent security signals increase confidence.
        if len(categories) >= 2:
            risk_score += 10

        if len(categories) >= 3:
            risk_score += 10

        risk_score = min(100, max(0, risk_score))

        severity = self._get_severity(risk_score)

        decision = self._make_decision(
            risk_score,
            severity,
            categories,
            credential_detected=("credential_leak" in categories),
        )

        if risk_score >= 60 and decision != "BLOCK":
            if "policy_003" not in matching_policies:
                matching_policies.append("policy_003")

        sanitized_preview = self._sanitize_input(
            f"{user_request} {context}"
        )

        mitigation = self._get_mitigation_recommendations(
            categories,
            severity,
        )

        return {
            "decision": decision,
            "risk_score": risk_score,
            "severity": severity,
            "categories": sorted(categories),
            "detections": detections,
            "matching_policy_ids": sorted(set(matching_policies)),
            "mitigation_recommendations": mitigation,
            "sanitized_input_preview": sanitized_preview,
        }

    # ------------------------------------------------------------------
    # Detection functions
    # ------------------------------------------------------------------

    def _check_prompt_injection(self, text: str) -> dict:
        signals = []
        score = 0

        for pattern, description, weight in self.INJECTION_PATTERNS:
            if re.search(pattern, text):
                signals.append(f"Prompt injection: {description}")
                score += weight

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(60, score),
        }

    def _check_credentials(self, text: str) -> dict:
        signals = []
        score = 0

        for pattern, credential_type in self.CREDENTIAL_PATTERNS:
            matches = list(re.finditer(pattern, text))
            if matches:
                signals.append(
                    f"Exposed {credential_type}: {len(matches)} match(es)"
                )
                score += 50

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(70, score),
        }

    def _check_pii(self, text: str) -> dict:
        signals = []
        score = 0

        for pattern, pii_type in self.PII_PATTERNS:
            matches = list(re.finditer(pattern, text))
            if matches:
                signals.append(
                    f"Found {pii_type}: {len(matches)} instance(s)"
                )
                score += 15

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(45, score),
        }

    def _check_pii_request(self, text: str) -> dict:
        signals = []
        score = 0

        for pattern, description, weight in self.PII_REQUEST_PATTERNS:
            if re.search(pattern, text):
                signals.append(f"Sensitive-data request: {description}")
                score += weight

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(50, score),
        }

    def _check_sensitive_extraction(self, text: str) -> dict:
        signals = []
        score = 0

        for pattern, description, weight in self.SECRET_EXTRACTION_PATTERNS:
            if re.search(pattern, text):
                signals.append(f"Sensitive extraction: {description}")
                score += weight

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(70, score),
        }

    def _check_social_engineering(self, text: str) -> dict:
        signals = []
        score = 0

        for pattern, description, weight in self.SOCIAL_ENGINEERING_PATTERNS:
            if re.search(pattern, text):
                signals.append(f"Social engineering: {description}")
                score += weight

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(70, score),
        }

    def _check_fraud(self, text: str) -> dict:
        signals = []
        score = 0

        for pattern, description, weight in self.FRAUD_PATTERNS:
            if re.search(pattern, text):
                signals.append(f"Fraud indicator: {description}")
                score += weight

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(70, score),
        }

    def _check_exfiltration(self, text: str) -> dict:
        signals = []
        score = 0

        for pattern, description, weight in self.EXFILTRATION_PATTERNS:
            if re.search(pattern, text):
                signals.append(f"Data exfiltration: {description}")
                score += weight

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(70, score),
        }

    def _check_destructive_operations(
        self,
        user_request: str,
        tool: str,
        context: str,
    ) -> dict:
        signals = []
        score = 0

        combined = f"{user_request} {tool} {context}"

        for pattern, description, weight in self.DESTRUCTIVE_PATTERNS:
            if re.search(pattern, combined):
                signals.append(f"Destructive action: {description}")
                score += weight

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(70, score),
        }

    def _check_tool_risk(self, tool: str) -> dict:
        signals = []
        score = 0

        # Not using a tool is normal and should not increase risk.
        if not tool.strip():
            return {
                "detected": False,
                "signals": [],
                "score": 0,
            }

        for pattern, weight in self.HIGH_RISK_TOOL_PATTERNS:
            if re.search(pattern, tool):
                signals.append(
                    f"High-risk tool capability detected: {tool}"
                )
                score += weight

        return {
            "detected": bool(signals),
            "signals": signals,
            "score": min(40, score),
        }

    # ------------------------------------------------------------------
    # Sanitization
    # ------------------------------------------------------------------

    def _sanitize_input(self, text: str) -> str:
        sanitized = text

        for pattern, _ in self.CREDENTIAL_PATTERNS:
            sanitized = re.sub(
                pattern,
                "[REDACTED_CREDENTIAL]",
                sanitized,
            )

        for pattern, _ in self.PII_PATTERNS:
            sanitized = re.sub(
                pattern,
                "[REDACTED_PII]",
                sanitized,
            )

        if len(sanitized) > 500:
            sanitized = sanitized[:500] + "...[truncated]"

        return sanitized

    # ------------------------------------------------------------------
    # Risk and decision engine
    # ------------------------------------------------------------------

    def _get_severity(self, risk_score: int) -> str:
        if risk_score >= 80:
            return "CRITICAL"
        if risk_score >= 60:
            return "HIGH"
        if risk_score >= 40:
            return "MEDIUM"
        return "LOW"

    def _make_decision(
        self,
        risk_score: int,
        severity: str,
        categories: set,
        credential_detected: bool = False,
    ) -> str:
        """
        Convert detected security categories and risk into an enforcement decision.

        Policy:
        - Credentials/secrets: always BLOCK
        - Destructive actions: BLOCK
        - Data exfiltration: BLOCK
        - Critical risk: BLOCK
        - Prompt injection: REQUIRE_APPROVAL unless combined with a severe action
        - PII/data leakage: REQUIRE_APPROVAL
        - High risk: REQUIRE_APPROVAL
        - Low/medium benign activity: ALLOW
        """

        # 1. Credentials or secrets must never be allowed.
        if credential_detected or "credential_leak" in categories:
            return "BLOCK"

        # 2. Destructive operations must never execute automatically.
        if "destructive" in categories:
            return "BLOCK"

        # 3. Data exfiltration is blocked by default.
        if "data_exfiltration" in categories:
            return "BLOCK"

        # 4. Attempts to extract hidden instructions or secrets are blocked.
        if "secret_extraction" in categories:
            return "BLOCK"

        # 5. Fraudulent or unauthorized financial activity is blocked.
        if "fraud" in categories:
            return "BLOCK"

        # 6. Critical risk is always blocked.
        if severity == "CRITICAL" or risk_score >= 80:
            return "BLOCK"

        # 7. Prompt injection combined with another sensitive category
        #    indicates an attempt to manipulate the security boundary.
        if (
            "prompt_injection" in categories
            and len(categories) >= 2
        ):
            return "BLOCK"

        # 8. Prompt injection by itself requires human approval.
        if "prompt_injection" in categories:
            return "REQUIRE_APPROVAL"

        # 9. PII / sensitive data should not silently pass.
        if "data_leak" in categories:
            return "REQUIRE_APPROVAL"

        # 10. Any remaining high-risk activity requires approval.
        if severity == "HIGH" or risk_score >= 60:
            return "REQUIRE_APPROVAL"

        # 11. Benign/low-risk activity is allowed.
        return "ALLOW"

    def _get_mitigation_recommendations(
        self,
        categories: set,
        severity: str,
    ) -> list[str]:
        recommendations = []

        if "prompt_injection" in categories:
            recommendations.extend([
                "Apply prompt-injection detection before model execution",
                "Separate system instructions from untrusted content",
            ])

        if "credential_leak" in categories:
            recommendations.extend([
                "Block exposed credentials and rotate compromised secrets",
                "Never log or return raw credentials",
            ])

        if "secret_extraction" in categories:
            recommendations.extend([
                "Do not expose system prompts, hidden instructions, or secrets",
                "Protect credentials and confidential configuration from model output",
            ])

        if "data_leak" in categories:
            recommendations.extend([
                "Apply PII detection and masking",
                "Use least-privilege access to sensitive data",
            ])

        if "data_exfiltration" in categories:
            recommendations.extend([
                "Require approval before external data transfer",
                "Restrict outbound destinations and sensitive-data export",
            ])

        if "destructive" in categories:
            recommendations.extend([
                "Require explicit approval for destructive operations",
                "Use audit logging and reversible operations where possible",
            ])

        if "social_engineering" in categories:
            recommendations.extend([
                "Block impersonation and deceptive requests",
                "Require identity verification before sensitive actions",
            ])

        if "fraud" in categories:
            recommendations.extend([
                "Block unauthorized financial activity",
                "Require transaction verification and explicit authorization",
            ])

        if "tool_risk" in categories:
            recommendations.extend([
                "Apply least-privilege tool permissions",
                "Validate tool arguments before execution",
            ])

        if severity == "CRITICAL":
            recommendations.insert(
                0,
                "Escalate to the security team immediately",
            )

        # Remove duplicate recommendations while preserving order.
        recommendations = list(dict.fromkeys(recommendations))

        return recommendations[:5]

    @staticmethod
    def _normalize(text: str) -> str:
        # Normalize whitespace while preserving enough structure for regex
        # matching and sanitization.
        return re.sub(r"[ \t]+", " ", text).strip()
