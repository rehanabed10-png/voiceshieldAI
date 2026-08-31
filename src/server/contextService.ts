import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface OrganizationPolicy {
  id?: string;
  organization_id: string;
  fake_prob_critical_threshold: number;
  fake_prob_warn_threshold: number;
  speaker_verification_strictness: number;
  acoustic_anomaly_sensitivity: number;
  transaction_auto_hold_amount: number;
  step_up_verification_required: boolean;
  auto_block_on_critical_deepfake: boolean;
}

export interface EnrichedCallContext {
  organization_id: string;
  contact_id?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  caller_id?: string | null;
  speaker_id?: string | null;
  is_caller_recognized: boolean;
  is_previously_flagged: boolean;
  is_verified?: boolean | null;
  flag_reason?: string | null;
  claimed_role?: string | null;
  role_mismatch: boolean;
  requested_amount?: number | null;
  normal_amount?: number | null;
  transaction_reference?: string | null;
  transaction_auto_hold_amount?: number | null;
  is_urgent: boolean;
  urgency_reason?: string | null;
  transcript_text?: string | null;
  suspicious_keywords_found: string[];
  has_prior_fraud_history: boolean;
  fraud_history_count: number;
  recent_fraud_types: string[];
  context_source: "SUPABASE_INTELLIGENCE" | "REQUEST_PAYLOAD_FALLBACK" | "DEFAULT";
  context_available: boolean;
  policy: OrganizationPolicy;
}

export interface ContextRetrievalParams {
  organization_id?: string;
  authenticated_organization_id?: string;
  caller_id?: string;
  contact_id?: string;
  speaker_id?: string;
  claimed_role?: string;
  requested_amount?: number;
  normal_amount?: number;
  transaction_reference?: string;
  is_urgent?: boolean;
  urgency_reason?: string;
  transcript_text?: string;
  suspicious_keywords_found?: string[];
  is_caller_recognized?: boolean;
  is_previously_flagged?: boolean;
}

export const DEFAULT_ORG_ID = process.env.DEFAULT_ORGANIZATION_ID || "00000000-0000-0000-0000-000000000001";

const DEFAULT_POLICY: OrganizationPolicy = {
  organization_id: DEFAULT_ORG_ID,
  fake_prob_critical_threshold: 0.85,
  fake_prob_warn_threshold: 0.50,
  speaker_verification_strictness: 0.65,
  acoustic_anomaly_sensitivity: 0.70,
  transaction_auto_hold_amount: 500000.0,
  step_up_verification_required: true,
  auto_block_on_critical_deepfake: true,
};

export class ContextRetrievalService {
  private supabase: SupabaseClient | null;
  private policyCache: Map<string, { policy: OrganizationPolicy; cachedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache for policies

  constructor(supabaseClient: SupabaseClient | null) {
    this.supabase = supabaseClient;
  }

  public setSupabaseClient(client: SupabaseClient | null) {
    this.supabase = client;
  }

  public getAuthoritativeDefaultOrgId(): string {
    return DEFAULT_ORG_ID;
  }

  /**
   * Resolves the authoritative organization ID.
   * If a trusted authenticatedOrgId exists (from JWT/session), it is authoritative.
   * If unauthenticated, uses the server-configured DEFAULT_ORG_ID.
   * Client-supplied organization_id hints are never trusted to switch tenants arbitrarily.
   */
  public resolveAuthoritativeOrganizationId(
    requestedOrgHint?: string,
    authenticatedOrgId?: string
  ): string {
    if (authenticatedOrgId && authenticatedOrgId.trim().length > 0) {
      return authenticatedOrgId.trim();
    }

    if (requestedOrgHint && requestedOrgHint !== DEFAULT_ORG_ID) {
      console.warn(
        `[Security:TenantBoundary] Ignoring untrusted client organization_id hint: '${requestedOrgHint}'. Enforcing authoritative server organization: '${DEFAULT_ORG_ID}'.`
      );
    }

    return DEFAULT_ORG_ID;
  }

  /**
   * Computes SHA-256 phone hash for privacy-preserving lookup.
   */
  public computePhoneHash(phoneNumber: string): string {
    const sanitized = phoneNumber.replace(/[^0-9+]/g, "").trim();
    return crypto.createHash("sha256").update(sanitized).digest("hex");
  }

  /**
   * Retrieves organization policies for risk thresholding.
   */
  public async getOrganizationPolicy(orgId: string): Promise<OrganizationPolicy> {
    const cached = this.policyCache.get(orgId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.policy;
    }

    if (!this.supabase) {
      return { ...DEFAULT_POLICY, organization_id: orgId };
    }

    try {
      const { data, error } = await this.supabase
        .from("organization_policies")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!error && data) {
        const policy: OrganizationPolicy = {
          id: data.id,
          organization_id: data.organization_id,
          fake_prob_critical_threshold: Number(data.fake_prob_critical_threshold ?? 0.85),
          fake_prob_warn_threshold: Number(data.fake_prob_warn_threshold ?? 0.50),
          speaker_verification_strictness: Number(data.speaker_verification_strictness ?? 0.65),
          acoustic_anomaly_sensitivity: Number(data.acoustic_anomaly_sensitivity ?? 0.70),
          transaction_auto_hold_amount: Number(data.transaction_auto_hold_amount ?? 500000.0),
          step_up_verification_required: Boolean(data.step_up_verification_required ?? true),
          auto_block_on_critical_deepfake: Boolean(data.auto_block_on_critical_deepfake ?? true),
        };
        this.policyCache.set(orgId, { policy, cachedAt: Date.now() });
        return policy;
      }
    } catch (err: any) {
      console.warn("[ContextService:getPolicy] Warning reading organization policy:", err.message);
    }

    return { ...DEFAULT_POLICY, organization_id: orgId };
  }

  /**
   * Resolves contact identity and verification status from Supabase.
   */
  public async resolveContact(
    orgId: string,
    callerId?: string,
    contactId?: string
  ): Promise<any | null> {
    if (!this.supabase) return null;

    try {
      // 1. Direct UUID or contact_id match
      if (contactId) {
        const { data, error } = await this.supabase
          .from("contacts")
          .select("*")
          .eq("organization_id", orgId)
          .or(`id.eq.${contactId},contact_id.eq.${contactId}`)
          .maybeSingle();

        if (!error && data) return data;
      }

      // 2. Lookup by phone_number or phone_hash
      if (callerId) {
        const phoneHash = this.computePhoneHash(callerId);
        const { data, error } = await this.supabase
          .from("contacts")
          .select("*")
          .eq("organization_id", orgId)
          .or(`phone_hash.eq.${phoneHash},phone_number.eq.${callerId},contact_id.eq.${callerId}`)
          .maybeSingle();

        if (!error && data) return data;
      }
    } catch (err: any) {
      console.warn("[ContextService:resolveContact] Warning resolving contact:", err.message);
    }

    return null;
  }

  /**
   * Retrieves bounded unresolved fraud indicators and recent high-risk history.
   */
  public async getRecentFraudHistory(
    orgId: string,
    contactId?: string | null
  ): Promise<{ hasHistory: boolean; count: number; types: string[] }> {
    if (!this.supabase) {
      return { hasHistory: false, count: 0, types: [] };
    }

    try {
      let query = this.supabase
        .from("fraud_indicators")
        .select("indicator_type, severity, is_resolved")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (contactId) {
        // Query unresolved indicators
        query = query.eq("is_resolved", false);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const types = Array.from(new Set(data.map((d: any) => d.indicator_type).filter(Boolean)));
        return {
          hasHistory: true,
          count: data.length,
          types,
        };
      }
    } catch (err: any) {
      console.warn("[ContextService:getFraudHistory] Warning retrieving fraud history:", err.message);
    }

    return { hasHistory: false, count: 0, types: [] };
  }

  /**
   * Primary method: Enriches call context with strict database authoritativeness.
   * When Supabase is available, security-critical fields are strictly authoritative from the database.
   * Client-supplied security fields are only evaluated in fallback mode when the database is unavailable.
   */
  public async retrieveCallContext(params: ContextRetrievalParams): Promise<EnrichedCallContext> {
    const authoritativeOrgId = this.resolveAuthoritativeOrganizationId(
      params.organization_id,
      params.authenticated_organization_id
    );

    const policy = await this.getOrganizationPolicy(authoritativeOrgId);

    let contactRecord: any = null;
    let isDbConnected = false;

    if (this.supabase) {
      try {
        contactRecord = await this.resolveContact(authoritativeOrgId, params.caller_id, params.contact_id);
        isDbConnected = true;
      } catch (dbErr: any) {
        console.warn("[ContextService] Database lookup failed, falling back:", dbErr.message);
        isDbConnected = false;
      }
    }

    if (isDbConnected) {
      // --- DATABASE AUTHORITATIVE MODE ---
      // 1. Caller recognition is true IF AND ONLY IF an authoritative contact record exists
      const isCallerRecognized = contactRecord !== null;

      // 2. Verified status comes exclusively from authoritative contact record
      const isVerified = contactRecord ? Boolean(contactRecord.is_verified ?? false) : false;

      // 3. Contact roles and metadata come exclusively from authoritative record
      const contactId = contactRecord ? contactRecord.id : null;
      const contactName = contactRecord ? (contactRecord.full_name || contactRecord.name || null) : null;
      const contactRole = contactRecord ? (contactRecord.claimed_role || contactRecord.role || null) : null;
      const flagReason = contactRecord ? (contactRecord.flag_reason || null) : null;

      // 4. Retrieve Authoritative Fraud History
      const fraudHistory = await this.getRecentFraudHistory(authoritativeOrgId, contactId);

      // 5. Authoritative previously flagged status
      const isPreviouslyFlagged = Boolean(
        (contactRecord && (contactRecord.is_flagged || contactRecord.is_previously_flagged)) ||
        fraudHistory.hasHistory
      );

      // 6. Compute Role Mismatch exclusively on the server (ignore any client-provided role_mismatch)
      let roleMismatch = false;
      if (params.claimed_role && contactRole) {
        const claimedNorm = params.claimed_role.trim().toLowerCase();
        const contactNorm = contactRole.trim().toLowerCase();
        if (!claimedNorm.includes(contactNorm) && !contactNorm.includes(claimedNorm)) {
          roleMismatch = true;
        }
      }

      return {
        organization_id: authoritativeOrgId,
        contact_id: contactId,
        contact_name: contactName,
        contact_role: contactRole,
        caller_id: params.caller_id ?? null,
        speaker_id: params.speaker_id ?? null,
        is_caller_recognized: isCallerRecognized,
        is_previously_flagged: isPreviouslyFlagged,
        is_verified: isVerified,
        flag_reason: flagReason,
        claimed_role: params.claimed_role ?? null,
        role_mismatch: roleMismatch,
        requested_amount: params.requested_amount ?? null,
        normal_amount: params.normal_amount ?? null,
        transaction_reference: params.transaction_reference ?? null,
        transaction_auto_hold_amount: policy.transaction_auto_hold_amount,
        is_urgent: Boolean(params.is_urgent ?? false),
        urgency_reason: params.urgency_reason ?? null,
        transcript_text: params.transcript_text ?? null,
        suspicious_keywords_found: params.suspicious_keywords_found ?? [],
        has_prior_fraud_history: fraudHistory.hasHistory,
        fraud_history_count: fraudHistory.count,
        recent_fraud_types: fraudHistory.types,
        context_source: "SUPABASE_INTELLIGENCE",
        context_available: true,
        policy,
      };
    } else {
      // --- FALLBACK MODE (DB unavailable or unconfigured) ---
      return {
        organization_id: authoritativeOrgId,
        contact_id: params.contact_id ?? null,
        contact_name: null,
        contact_role: null,
        caller_id: params.caller_id ?? null,
        speaker_id: params.speaker_id ?? null,
        is_caller_recognized: Boolean(params.is_caller_recognized ?? true),
        is_previously_flagged: Boolean(params.is_previously_flagged ?? false),
        is_verified: null,
        flag_reason: null,
        claimed_role: params.claimed_role ?? null,
        role_mismatch: false, // Cannot verify mismatch without authoritative contact role
        requested_amount: params.requested_amount ?? null,
        normal_amount: params.normal_amount ?? null,
        transaction_reference: params.transaction_reference ?? null,
        transaction_auto_hold_amount: policy.transaction_auto_hold_amount,
        is_urgent: Boolean(params.is_urgent ?? false),
        urgency_reason: params.urgency_reason ?? null,
        transcript_text: params.transcript_text ?? null,
        suspicious_keywords_found: params.suspicious_keywords_found ?? [],
        has_prior_fraud_history: false,
        fraud_history_count: 0,
        recent_fraud_types: [],
        context_source: "REQUEST_PAYLOAD_FALLBACK",
        context_available: false,
        policy,
      };
    }
  }

  /**
   * Persists real-time alerts and fraud indicators if high risk is detected.
   */
  public async recordThreatIntelligenceIfHighRisk(
    callDbId: string,
    resultData: any,
    context: EnrichedCallContext
  ): Promise<void> {
    if (!this.supabase) return;

    const riskScore = Number(resultData.risk_score ?? 0);
    const riskLevel = String(resultData.risk_level || "").toUpperCase();

    if (riskLevel === "HIGH" || riskLevel === "CRITICAL" || riskScore >= 70) {
      try {
        // 1. Insert alert
        await this.supabase.from("alerts").insert({
          organization_id: context.organization_id,
          call_id: callDbId,
          alert_type: "HIGH_RISK_CALL",
          severity: riskScore >= 85 ? "CRITICAL" : "HIGH",
          title: `High Risk Call Detected (Score: ${riskScore})`,
          description: (resultData.flags || []).join("; ") || "Multi-signal anomaly detected.",
          metadata: {
            risk_score: riskScore,
            risk_level: riskLevel,
            recommended_action: resultData.recommended_action,
            flags: resultData.flags,
            context_intelligence: {
              caller_id: context.caller_id,
              contact_name: context.contact_name,
              claimed_role: context.claimed_role,
              role_mismatch: context.role_mismatch,
            },
          },
          status: "OPEN",
        });

        // 2. Insert fraud indicators for specific anomaly types
        const fakeProb = Number(resultData.deepfake_detection?.fake_probability ?? 0);
        if (fakeProb >= 0.85) {
          await this.supabase.from("fraud_indicators").insert({
            organization_id: context.organization_id,
            call_id: callDbId,
            indicator_type: "DEEPFAKE_VOICE_CLONE",
            severity: "CRITICAL",
            details: { fake_probability: fakeProb, model: resultData.deepfake_detection?.model_type },
            is_resolved: false,
          });
        }

        if (context.role_mismatch) {
          await this.supabase.from("fraud_indicators").insert({
            organization_id: context.organization_id,
            call_id: callDbId,
            indicator_type: "EXECUTIVE_IMPERSONATION",
            severity: "HIGH",
            details: { claimed_role: context.claimed_role, registered_role: context.contact_role },
            is_resolved: false,
          });
        }

        // 3. Log audit event
        await this.supabase.from("audit_logs").insert({
          organization_id: context.organization_id,
          actor_role: "SYSTEM",
          action: "HIGH_RISK_ALERT_TRIGGERED",
          resource_type: "calls",
          resource_id: callDbId,
          details: {
            risk_score: riskScore,
            recommended_action: resultData.recommended_action,
            flags_count: (resultData.flags || []).length,
          },
        });
      } catch (err: any) {
        console.warn("[ContextService:recordThreatIntelligence] Warning logging alert/indicator:", err.message);
      }
    }
  }
}
