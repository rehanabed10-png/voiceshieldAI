"""
Rule-based Context & Fraud Analysis Module for VoiceShield (Phase 3).
Provides deterministic, explainable evaluation of caller metadata, transaction amounts,
urgency indicators, authority claims, and suspicious keywords without requiring external LLM dependencies.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Set


# Default suspicious keywords indicative of social engineering and financial wire fraud
DEFAULT_SUSPICIOUS_KEYWORDS: Set[str] = {
    "wire immediately",
    "wire transfer",
    "send funds",
    "urgent payment",
    "bypass protocol",
    "bypass procedure",
    "do not tell anyone",
    "keep this confidential",
    "keep this secret",
    "gift card",
    "crypto transfer",
    "otp",
    "one time password",
    "security code",
    "emergency transfer",
    "authorize now",
    "account details",
    "bank transfer",
    "unauthorized transaction",
}

# High-authority roles frequently targeted in executive impersonation (CEO fraud / BEC)
HIGH_AUTHORITY_ROLES: Set[str] = {
    "ceo",
    "chief executive officer",
    "cfo",
    "chief financial officer",
    "director",
    "managing director",
    "vp",
    "vice president",
    "executive",
    "bank manager",
    "compliance officer",
    "it administrator",
    "legal counsel",
}


@dataclass
class CallContext:
    """
    Contextual information regarding the call, caller identity, transaction, and transcript.
    """
    caller_id: Optional[str] = None
    is_caller_recognized: bool = True
    is_previously_flagged: bool = False
    claimed_role: Optional[str] = None
    requested_transaction_amount: Optional[float] = None
    normal_transaction_amount: Optional[float] = None
    is_urgent: bool = False
    urgency_reason: Optional[str] = None
    transcript_text: Optional[str] = None
    suspicious_keywords_found: List[str] = field(default_factory=list)


@dataclass
class ContextEvaluation:
    """
    Result of rule-based context analysis.
    """
    context_flag: float                 # Continuous or discrete flag score in [0.0, 1.0] (0 = benign, 1 = suspicious)
    is_suspicious: bool                 # Boolean decision threshold (context_flag > 0)
    flags: List[str]                    # Human-readable explanation reasons
    severity_score: float               # Raw unweighted context risk penalty


class RuleBasedContextAnalyzer:
    """
    Deterministic context analyzer enforcing explainable anti-fraud rules.
    """

    def __init__(
        self,
        suspicious_keywords: Optional[Set[str]] = None,
        transaction_deviation_multiplier: float = 2.0,
        large_unverified_amount_threshold: float = 10000.0,
    ):
        """
        Args:
            suspicious_keywords: Custom set of lowercase suspicious phrases.
            transaction_deviation_multiplier: Ratio above normal transaction volume that triggers a flag.
            large_unverified_amount_threshold: Flat transaction amount considered high-risk when no historical baseline exists.
        """
        self.suspicious_keywords = suspicious_keywords or DEFAULT_SUSPICIOUS_KEYWORDS
        self.transaction_deviation_multiplier = transaction_deviation_multiplier
        self.large_unverified_amount_threshold = large_unverified_amount_threshold

    def analyze(self, context: CallContext) -> ContextEvaluation:
        """
        Evaluates the call context against deterministic fraud rules.
        """
        flags: List[str] = []
        severity_points: float = 0.0

        # Rule 1: History of prior fraudulent activity
        if context.is_previously_flagged:
            flags.append("Caller ID or voice history previously flagged for suspicious activity")
            severity_points += 0.8

        # Rule 2: Unrecognized caller asserting high-authority executive role
        if not context.is_caller_recognized and context.claimed_role:
            role_lower = context.claimed_role.strip().lower()
            if any(auth_role in role_lower for auth_role in HIGH_AUTHORITY_ROLES):
                flags.append(
                    f"Unrecognized caller asserting high-authority executive role: '{context.claimed_role}'"
                )
                severity_points += 0.7
            else:
                flags.append(f"Unrecognized caller claiming role: '{context.claimed_role}'")
                severity_points += 0.3
        elif not context.is_caller_recognized:
            flags.append("Incoming call from unrecognized/unknown contact")
            severity_points += 0.2

        # Rule 3: Transaction amount anomalies
        if context.requested_transaction_amount is not None and context.requested_transaction_amount > 0:
            req_amt = context.requested_transaction_amount
            norm_amt = context.normal_transaction_amount

            if norm_amt is not None and norm_amt > 0:
                ratio = req_amt / norm_amt
                if ratio >= self.transaction_deviation_multiplier:
                    flags.append(
                        f"Requested transaction amount (${req_amt:,.2f}) is {ratio:.1f}x higher than normal baseline (${norm_amt:,.2f})"
                    )
                    severity_points += min(0.8, 0.4 * (ratio / self.transaction_deviation_multiplier))
            elif req_amt >= self.large_unverified_amount_threshold:
                flags.append(
                    f"Substantial transaction requested (${req_amt:,.2f}) without established historical baseline"
                )
                severity_points += 0.5

        # Rule 4: High urgency pressure combined with financial or access claims
        if context.is_urgent:
            reason = f" ({context.urgency_reason})" if context.urgency_reason else ""
            flags.append(f"High urgency and immediate execution pressure detected{reason}")
            severity_points += 0.4

        # Rule 5: Keyword & transcript phrase extraction
        detected_keywords: List[str] = []
        if context.suspicious_keywords_found:
            detected_keywords.extend(context.suspicious_keywords_found)

        if context.transcript_text:
            transcript_lower = context.transcript_text.lower()
            for kw in self.suspicious_keywords:
                if kw in transcript_lower and kw not in detected_keywords:
                    detected_keywords.append(kw)

        if detected_keywords:
            flags.append(
                f"Suspicious social engineering keywords detected: {', '.join([repr(k) for k in detected_keywords[:4]])}"
            )
            severity_points += min(0.7, 0.3 * len(detected_keywords))

        # Calculate final normalized context flag C in [0.0, 1.0]
        if not flags:
            context_flag = 0.0
            is_suspicious = False
        else:
            # Map severity score into [0.0, 1.0], clamping discrete activation
            context_flag = round(min(1.0, max(0.0, severity_points)), 2)
            # Binary flag representation (1 if any high-confidence fraud indicator exists, or proportional)
            if context_flag >= 0.5:
                context_flag = 1.0
            is_suspicious = context_flag > 0.0

        return ContextEvaluation(
            context_flag=context_flag,
            is_suspicious=is_suspicious,
            flags=flags,
            severity_score=round(severity_points, 2),
        )
