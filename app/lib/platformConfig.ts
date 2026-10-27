import { supabase } from "./supabase";
import {
  AdministratorDifficultyConfig,
  DEFAULT_ADMIN_DIFFICULTY_CONFIG,
  validateProportionsSum,
} from "./difficultyEngine";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_kobo: number;
  price_naira: number;
  currency: string;
  interval: "monthly" | "yearly";
  features: string[];
  entitlements: Record<string, unknown>;
  is_active: boolean;
  display_order: number;
}

export interface FeatureFlags {
  competitions_enabled: boolean;
  ai_hints_enabled: boolean;
  offline_mode: boolean;
  public_leaderboard: boolean;
  mock_exams: boolean;
  calculator_enabled: boolean;
  certificates_enabled: boolean;
  negative_marking: boolean;
}

export interface ExamSettings {
  exam_duration_seconds: number;
  pass_mark_percent: number;
  negative_marking: boolean;
  max_attempts_per_code: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_results_immediately: boolean;
  show_marks_in_exam?: boolean; // toggle visibility of marks in CBT exam interface
  show_topic_in_exam?: boolean; // toggle visibility of question topic in CBT exam interface
  allow_corrections?: boolean; // toggle candidate access to post-exam question corrections & explanations
  result_notifications?: boolean; // toggle candidate result notifications dispatch (SMS/Email/Alerts)
}

export interface CouponCampaign {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number; // e.g. 20 for 20% or 500 for N500
  max_discount_naira?: number;
  valid_plans: string[]; // empty means all plans
  usage_limit: number;
  used_count: number;
  expires_at: string;
  is_active: boolean;
}

export interface AcademicConfig {
  current_session: string; // e.g. "2026/2027"
  classes: string[]; // e.g. ["SS1", "SS2", "SS3", "UTME Candidate", "Post-UTME"]
  curricula: string[]; // e.g. ["JAMB UTME", "WAEC SSCE", "NECO", "General Practice"]
  available_subjects: string[];
}

export interface AIPlatformConfig {
  provider: "gemini" | "groq";
  gemini_model: string;
  groq_model: string;
  daily_free_quota: number;
  monthly_premium_quota: number;
  max_output_tokens: number;
  system_prompt_tone: string;
}

export interface WebsiteContentConfig {
  platform_name: string;
  hero_headline: string;
  hero_subtitle: string;
  banner_announcement: string;
  banner_active: boolean;
  support_email: string;
  academy_email?: string;
  support_phone: string;
  maintenance_mode: boolean;
}

export interface SocialLinkConfig {
  platform: "whatsapp" | "instagram" | "youtube" | "facebook" | "tiktok" | "linkedin" | "x";
  name: string;
  url: string;
  enabled: boolean;
}

export interface FooterConfig {
  brand_tagline: string;
  brand_description: string;
  support_email: string;
  academy_email: string;
  support_phone: string;
  whatsapp_number: string;
  whatsapp_channel_url: string;
  office_location: string;
  social_links: SocialLinkConfig[];
  copyright_notice: string;
  accreditation_statement: string;
}

export interface MasterclassRoomConfig {
  class_type: "open" | "masterclass";
  entry_code?: string;
  require_permission?: boolean;
  is_active?: boolean;
  active_host_id?: string;
  active_host_name?: string;
  title?: string;
  topic?: string;
  started_at?: string;
  admitted_students?: string[];
}

export interface LiveClassroomConfig {
  provider: "webrtc" | "livekit" | "agora" | "daily";
  max_capacity_default: number;
  default_duration_minutes: number;
  student_mic_default: boolean;
  student_cam_default: boolean;
  student_chat_default: boolean;
  student_screenshare_default: boolean;
  recordings_enabled: boolean;
  attendance_min_minutes: number;
  attendance_threshold_percent: number;
  waiting_room_default: boolean;
  formats_enabled: ("interactive" | "broadcast" | "hybrid")[];
  allowed_tutor_emails?: string[];
  room_configs?: Record<string, MasterclassRoomConfig>;
}

export interface CommunicationConfig {
  private_messaging_enabled: boolean;
  group_messaging_enabled: boolean;
  student_can_message_tutor: boolean;
  read_receipts_enabled: boolean;
  reactions_enabled: boolean;
  official_tags_enabled: boolean;
  announcement_views_enabled: boolean;
  presence_visibility_default: boolean;
  message_rate_limit_per_minute: number;
}

export interface AudioPolicyConfig {
  max_duration_seconds: number;
  max_file_size_mb: number;
  allowed_formats: string[];
  student_audio_enabled_globally: boolean;
  transcription_enabled: boolean;
  audio_retention_days: number;
  allow_downloads: boolean;
}

export interface AuditLogEntry {
  id?: string;
  admin_id?: string;
  admin_email: string;
  entity_type: "config" | "plan" | "coupon" | "academic" | "ai" | "content" | "exam" | "classroom" | "communication" | "audio" | "footer";
  entity_id: string;
  action: "created" | "updated" | "published" | "deleted";
  previous_value?: unknown;
  new_value?: unknown;
  change_reason?: string;
  created_at?: string;
}

// Default initial fallbacks for graceful resilience
const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free Learner",
    description: "Essential CBT exam preparation and basic practice.",
    price_kobo: 0,
    price_naira: 0,
    currency: "NGN",
    interval: "monthly",
    features: ["Full CBT examination portal", "Standard Self Practice", "10 AI Tutor queries per day", "Public leaderboards"],
    entitlements: { cbt_unlimited: true, ai_daily_quota: 10, offline_saving: true },
    is_active: true,
    display_order: 1,
  },
  {
    id: "premium",
    name: "Premium Study",
    description: "Enhanced practice with step-by-step AI explanations and full topic mastery.",
    price_kobo: 150000,
    price_naira: 1500,
    currency: "NGN",
    interval: "monthly",
    features: ["Everything in Free", "500 AI Tutor explanations per month", "Topic weakness auto-retry loop", "Detailed subject analytics", "Priority email support"],
    entitlements: { cbt_unlimited: true, ai_monthly_quota: 500, competitions_included: true, advanced_analytics: true },
    is_active: true,
    display_order: 2,
  },
  {
    id: "plus",
    name: "BrainLab Plus",
    description: "Unlimited AI tutoring, school competition entry, and digital certificate verification.",
    price_kobo: 300000,
    price_naira: 3000,
    currency: "NGN",
    interval: "monthly",
    features: ["Everything in Premium", "1,500 AI Tutor explanations per month", "Official Competition & Quiz access", "Verified Digital Certificates", "Personalized study planner sync"],
    entitlements: { cbt_unlimited: true, ai_monthly_quota: 1500, competitions_included: true, certificates_issued: true },
    is_active: true,
    display_order: 3,
  },
  {
    id: "pro",
    name: "BrainLab Pro",
    description: "Complete master academy access with 1-on-1 AI coaching, premium question banks, and institution badges.",
    price_kobo: 500000,
    price_naira: 5000,
    currency: "NGN",
    interval: "monthly",
    features: ["Everything in Plus", "Unlimited AI study missions", "All national & school competitions included", "Lifetime verified credential portfolio", "VIP 24/7 priority support"],
    entitlements: { cbt_unlimited: true, ai_unlimited: true, competitions_included: true, certificates_issued: true, vip_support: true },
    is_active: true,
    display_order: 4,
  },
];

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  competitions_enabled: true,
  ai_hints_enabled: true,
  offline_mode: true,
  public_leaderboard: true,
  mock_exams: true,
  calculator_enabled: true,
  certificates_enabled: true,
  negative_marking: false,
};

const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  exam_duration_seconds: 7200,
  pass_mark_percent: 50,
  negative_marking: false,
  max_attempts_per_code: 1,
  randomize_questions: true,
  randomize_options: true,
  show_results_immediately: true,
  show_marks_in_exam: true,
  show_topic_in_exam: true,
  allow_corrections: true,
  result_notifications: true,
};

const DEFAULT_ACADEMIC_CONFIG: AcademicConfig = {
  current_session: "2026/2027",
  classes: ["SS1", "SS2", "SS3", "UTME Candidate", "Post-UTME", "General Adult Learner"],
  curricula: ["JAMB UTME", "WAEC SSCE", "NECO", "Post-UTME Screening"],
  available_subjects: ["English", "Chemistry", "Physics", "Biology", "Mathematics", "Economics", "Government", "Literature"],
};

const DEFAULT_AI_CONFIG: AIPlatformConfig = {
  provider: "gemini",
  gemini_model: "gemini-3-flash-preview",
  groq_model: "qwen/qwen3.8-27b",
  daily_free_quota: 10,
  monthly_premium_quota: 500,
  max_output_tokens: 350,
  system_prompt_tone: "Supportive, direct, concise Nigerian secondary/tertiary exam tutor.",
};

const DEFAULT_WEBSITE_CONTENT: WebsiteContentConfig = {
  platform_name: "BrainLab Academy",
  hero_headline: "Prepare with Purpose. Master Every Subject.",
  hero_subtitle: "Adaptive CBT examination practice, live AI Tutor breakdowns, and national examination readiness intelligence for Nigerian learners.",
  banner_announcement: "🎓 2026/2027 JAMB UTME & WAEC Mock Examination series is now live!",
  banner_active: true,
  support_email: "support@brainlabacademy.com.ng",
  support_phone: "+234 907 431 0204",
  maintenance_mode: false,
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  brand_tagline: "Helping learners prepare smarter, build confidence, and achieve their academic goals.",
  brand_description:
    "Empowering Nigerian secondary and tertiary candidates with adaptive CBT mock exams, curriculum-aligned study materials, and instant AI tutor explanations.",
  support_email: "support@brainlabacademy.com.ng",
  academy_email: "hello@brainlabacademy.com.ng",
  support_phone: "+234 907 431 0204",
  whatsapp_number: "2349074310204",
  whatsapp_channel_url: "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m",
  office_location: "Lagos, Nigeria",
  social_links: [
    {
      platform: "x",
      name: "X (Twitter)",
      url: "https://x.com/The_brainlabhub",
      enabled: true,
    },
    {
      platform: "instagram",
      name: "Instagram",
      url: "https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4",
      enabled: true,
    },
    {
      platform: "facebook",
      name: "Facebook",
      url: "https://www.facebook.com/profile.php?id=61595669640028",
      enabled: true,
    },
    {
      platform: "youtube",
      name: "YouTube",
      url: "https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u",
      enabled: true,
    },
    {
      platform: "tiktok",
      name: "TikTok",
      url: "https://www.tiktok.com/@brainlabacademy",
      enabled: true,
    },
    {
      platform: "whatsapp",
      name: "WhatsApp Channel",
      url: "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m",
      enabled: true,
    },
  ],
  copyright_notice: "BrainLab Academy. All rights reserved.",
  accreditation_statement: "Dedicated to student excellence across Nigerian national examinations (JAMB UTME, WAEC SSCE, NECO).",
};

const DEFAULT_CLASSROOM_CONFIG: LiveClassroomConfig = {
  provider: "webrtc",
  max_capacity_default: 100,
  default_duration_minutes: 60,
  student_mic_default: true,
  student_cam_default: false,
  student_chat_default: true,
  student_screenshare_default: false,
  recordings_enabled: true,
  attendance_min_minutes: 15,
  attendance_threshold_percent: 60,
  waiting_room_default: false,
  formats_enabled: ["interactive", "broadcast", "hybrid"],
  allowed_tutor_emails: [],
  room_configs: {
    "BL-LIVE-101": {
      class_type: "open",
      require_permission: false,
      is_active: true,
      title: "BrainLab Live Academic Stage (BL-LIVE-101)",
    },
  },
};

const DEFAULT_COMMUNICATION_CONFIG: CommunicationConfig = {
  private_messaging_enabled: true,
  group_messaging_enabled: true,
  student_can_message_tutor: true,
  read_receipts_enabled: true,
  reactions_enabled: true,
  official_tags_enabled: true,
  announcement_views_enabled: true,
  presence_visibility_default: true,
  message_rate_limit_per_minute: 20,
};

const DEFAULT_AUDIO_CONFIG: AudioPolicyConfig = {
  max_duration_seconds: 300,
  max_file_size_mb: 25,
  allowed_formats: ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"],
  student_audio_enabled_globally: true,
  transcription_enabled: true,
  audio_retention_days: 90,
  allow_downloads: true,
};

/**
 * Low-level getter: Reads a configuration key from Supabase.
 * Checks dedicated table first, then `exam_config`, and falls back to defaultValue.
 */
export async function getPlatformConfig<T>(key: string, defaultValue: T): Promise<T> {
  try {
    // 1. Try exam_config key-value table
    const { data, error } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", key)
      .maybeSingle();

    if (!error && data?.config_value !== undefined && data.config_value !== null) {
      return data.config_value as T;
    }
  } catch {
    // Fall through on network error
  }

  // 2. Client-side local storage fallback
  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(`brainlab_cfg_${key}`);
      if (local) return JSON.parse(local) as T;
    } catch {}
  }

  return defaultValue;
}

/**
 * Low-level setter: Writes a configuration key to Supabase `exam_config`
 * and records an audit log entry.
 */
export async function setPlatformConfig<T>(
  key: string,
  value: T,
  adminUser?: { id: string; email: string },
  changeReason?: string
): Promise<boolean> {
  try {
    const previous = await getPlatformConfig<T>(key, value);

    const { error } = await supabase.from("exam_config").upsert(
      {
        config_key: key,
        config_value: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );

    if (error) {
      console.error(`[platformConfig] Failed to save config for ${key}:`, error);
      return false;
    }

    // Mirror locally
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`brainlab_cfg_${key}`, JSON.stringify(value));
      } catch {}
    }

    // Record audit log
    if (adminUser) {
      void logAdminAction({
        admin_id: adminUser.id,
        admin_email: adminUser.email,
        entity_type: "config",
        entity_id: key,
        action: "updated",
        previous_value: previous,
        new_value: value,
        change_reason: changeReason || "Admin updated configuration.",
      });
    }

    return true;
  } catch (err) {
    console.error(`[platformConfig] Exception saving ${key}:`, err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// Subscription Plans & Dynamic Pricing
// ----------------------------------------------------------------------------
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const plans = await getPlatformConfig<SubscriptionPlan[]>("subscription_plans", DEFAULT_PLANS);
  return plans.sort((a, b) => a.display_order - b.display_order);
}

export async function saveSubscriptionPlan(
  plan: SubscriptionPlan,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  const existing = await getSubscriptionPlans();
  const index = existing.findIndex((p) => p.id === plan.id);
  const oldPlan = index !== -1 ? existing[index] : null;

  const planWithNaira = {
    ...plan,
    price_naira: Math.round(plan.price_kobo / 100),
  };

  let updatedList: SubscriptionPlan[];
  if (index !== -1) {
    updatedList = [...existing];
    updatedList[index] = planWithNaira;
  } else {
    updatedList = [...existing, planWithNaira];
  }

  const success = await setPlatformConfig("subscription_plans", updatedList, adminUser, reason);

  if (success) {
    void logAdminAction({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      entity_type: "plan",
      entity_id: plan.id,
      action: index !== -1 ? "updated" : "created",
      previous_value: oldPlan,
      new_value: planWithNaira,
      change_reason: reason || `Updated plan ${plan.name} price to ₦${planWithNaira.price_naira.toLocaleString()}`,
    });
  }

  return success;
}

export async function deleteSubscriptionPlan(
  planId: string,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  const existing = await getSubscriptionPlans();
  const oldPlan = existing.find((p) => p.id === planId);
  const updatedList = existing.filter((p) => p.id !== planId);
  const success = await setPlatformConfig("subscription_plans", updatedList, adminUser, reason);

  if (success) {
    void logAdminAction({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      entity_type: "plan",
      entity_id: planId,
      action: "deleted",
      previous_value: oldPlan,
      new_value: null,
      change_reason: reason || `Deleted plan ${planId}`,
    });
  }

  return success;
}

// ----------------------------------------------------------------------------
// Feature Flags
// ----------------------------------------------------------------------------
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const flags = await getPlatformConfig<FeatureFlags>("platform_feature_flags", DEFAULT_FEATURE_FLAGS);
  return { ...DEFAULT_FEATURE_FLAGS, ...flags };
}

export async function setFeatureFlag(
  flagKey: keyof FeatureFlags,
  enabled: boolean,
  adminUser?: { id: string; email: string }
): Promise<boolean> {
  const flags = await getFeatureFlags();
  const oldVal = flags[flagKey];
  flags[flagKey] = enabled;
  const success = await setPlatformConfig("platform_feature_flags", flags, adminUser, `Toggled ${String(flagKey)} to ${enabled}`);

  if (success && adminUser) {
    void logAdminAction({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      entity_type: "config",
      entity_id: `flag:${String(flagKey)}`,
      action: "updated",
      previous_value: oldVal,
      new_value: enabled,
      change_reason: `Feature flag ${String(flagKey)} changed to ${enabled}`,
    });
  }

  return success;
}

// ----------------------------------------------------------------------------
// Coupon & Promotion Campaigns
// ----------------------------------------------------------------------------
export async function getCouponCampaigns(): Promise<CouponCampaign[]> {
  return await getPlatformConfig<CouponCampaign[]>("coupon_campaigns", [
    {
      id: "welcome2026",
      code: "WELCOME2026",
      discount_type: "percent",
      discount_value: 20,
      max_discount_naira: 1000,
      valid_plans: [],
      usage_limit: 1000,
      used_count: 24,
      expires_at: "2026-12-31T23:59:59Z",
      is_active: true,
    },
    {
      id: "jambmock500",
      code: "JAMB500",
      discount_type: "fixed",
      discount_value: 500,
      valid_plans: ["plus", "pro"],
      usage_limit: 500,
      used_count: 12,
      expires_at: "2026-11-30T23:59:59Z",
      is_active: true,
    },
  ]);
}

export async function saveCouponCampaign(
  coupon: CouponCampaign,
  adminUser: { id: string; email: string }
): Promise<boolean> {
  const existing = await getCouponCampaigns();
  const index = existing.findIndex((c) => c.code.toUpperCase() === coupon.code.toUpperCase());
  const oldCoupon = index !== -1 ? existing[index] : null;

  const normalized = {
    ...coupon,
    code: coupon.code.toUpperCase().trim(),
  };

  let updatedList: CouponCampaign[];
  if (index !== -1) {
    updatedList = [...existing];
    updatedList[index] = normalized;
  } else {
    updatedList = [...existing, normalized];
  }

  const success = await setPlatformConfig("coupon_campaigns", updatedList, adminUser);
  if (success) {
    void logAdminAction({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      entity_type: "coupon",
      entity_id: normalized.code,
      action: index !== -1 ? "updated" : "created",
      previous_value: oldCoupon,
      new_value: normalized,
      change_reason: `Admin saved coupon campaign ${normalized.code}`,
    });
  }
  return success;
}

export async function validateCoupon(
  code: string,
  planId: string,
  planPriceKobo: number
): Promise<{
  valid: boolean;
  discount_kobo: number;
  final_price_kobo: number;
  message: string;
  campaign?: CouponCampaign;
}> {
  const normCode = code.toUpperCase().trim();
  const campaigns = await getCouponCampaigns();
  const found = campaigns.find((c) => c.code === normCode && c.is_active);

  if (!found) {
    return { valid: false, discount_kobo: 0, final_price_kobo: planPriceKobo, message: "Coupon code is invalid or inactive." };
  }

  if (new Date(found.expires_at).getTime() < Date.now()) {
    return { valid: false, discount_kobo: 0, final_price_kobo: planPriceKobo, message: "This coupon code has expired." };
  }

  if (found.used_count >= found.usage_limit) {
    return { valid: false, discount_kobo: 0, final_price_kobo: planPriceKobo, message: "This coupon code has reached its maximum redemptions." };
  }

  if (found.valid_plans.length > 0 && !found.valid_plans.includes(planId)) {
    return { valid: false, discount_kobo: 0, final_price_kobo: planPriceKobo, message: `This coupon is not eligible for the selected plan.` };
  }

  let discountKobo = 0;
  if (found.discount_type === "percent") {
    discountKobo = Math.round((planPriceKobo * found.discount_value) / 100);
    if (found.max_discount_naira) {
      discountKobo = Math.min(discountKobo, found.max_discount_naira * 100);
    }
  } else {
    discountKobo = found.discount_value * 100;
  }

  discountKobo = Math.min(discountKobo, planPriceKobo);
  const finalPriceKobo = Math.max(0, planPriceKobo - discountKobo);

  return {
    valid: true,
    discount_kobo: discountKobo,
    final_price_kobo: finalPriceKobo,
    campaign: found,
    message: `Coupon applied: ₦${Math.round(discountKobo / 100).toLocaleString()} discount!`,
  };
}

// ----------------------------------------------------------------------------
// CBT Examination Rules & Settings
// ----------------------------------------------------------------------------
export async function getExamSettings(): Promise<ExamSettings> {
  return await getPlatformConfig<ExamSettings>("exam_settings", DEFAULT_EXAM_SETTINGS);
}

export async function saveExamSettings(
  settings: Partial<ExamSettings>,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  const current = await getExamSettings();
  const updated = { ...current, ...settings };
  return await setPlatformConfig("exam_settings", updated, adminUser, reason || "Updated CBT exam rules");
}

// ----------------------------------------------------------------------------
// Academic Structure
// ----------------------------------------------------------------------------
export async function getAcademicConfig(): Promise<AcademicConfig> {
  return await getPlatformConfig<AcademicConfig>("academic_structure", DEFAULT_ACADEMIC_CONFIG);
}

export async function saveAcademicConfig(
  config: AcademicConfig,
  adminUser: { id: string; email: string }
): Promise<boolean> {
  return await setPlatformConfig("academic_structure", config, adminUser, "Updated academic structure & classes");
}

// ----------------------------------------------------------------------------
// AI Platform Config
// ----------------------------------------------------------------------------
export async function getAIPlatformConfig(): Promise<AIPlatformConfig> {
  return await getPlatformConfig<AIPlatformConfig>("ai_platform_config", DEFAULT_AI_CONFIG);
}

export async function saveAIPlatformConfig(
  config: AIPlatformConfig,
  adminUser: { id: string; email: string }
): Promise<boolean> {
  return await setPlatformConfig("ai_platform_config", config, adminUser, "Updated AI models and quotas");
}

// ----------------------------------------------------------------------------
// Website Content & Branding
// ----------------------------------------------------------------------------
export async function getWebsiteContent(): Promise<WebsiteContentConfig> {
  return await getPlatformConfig<WebsiteContentConfig>("website_content", DEFAULT_WEBSITE_CONTENT);
}

export async function saveWebsiteContent(
  content: WebsiteContentConfig,
  adminUser: { id: string; email: string }
): Promise<boolean> {
  return await setPlatformConfig("website_content", content, adminUser, "Updated website content & announcement");
}

// ----------------------------------------------------------------------------
// Audit Trail Recorder
// ----------------------------------------------------------------------------
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  const logItem: AuditLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  try {
    const existingLogs = await getPlatformConfig<AuditLogEntry[]>("audit_logs_trail", []);
    const updated = [logItem, ...existingLogs].slice(0, 500); // Retain newest 500 actions
    await supabase.from("exam_config").upsert(
      {
        config_key: "audit_logs_trail",
        config_value: updated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );
  } catch (err) {
    console.warn("[platformConfig] Could not write audit log:", err);
  }
}

export async function getAuditLogs(limit: number = 50): Promise<AuditLogEntry[]> {
  const logs = await getPlatformConfig<AuditLogEntry[]>("audit_logs_trail", []);
  return logs.slice(0, limit);
}

// ----------------------------------------------------------------------------
// Live Classroom Configuration
// ----------------------------------------------------------------------------
export async function getLiveClassroomConfig(): Promise<LiveClassroomConfig> {
  return await getPlatformConfig<LiveClassroomConfig>("live_classroom_config", DEFAULT_CLASSROOM_CONFIG);
}

export async function saveLiveClassroomConfig(
  config: Partial<LiveClassroomConfig>,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  const current = await getLiveClassroomConfig();
  const updated = { ...current, ...config };
  return await setPlatformConfig("live_classroom_config", updated, adminUser, reason || "Updated Live Classroom policy");
}

// ----------------------------------------------------------------------------
// Communication & Messaging Configuration
// ----------------------------------------------------------------------------
export async function getCommunicationConfig(): Promise<CommunicationConfig> {
  return await getPlatformConfig<CommunicationConfig>("communication_config", DEFAULT_COMMUNICATION_CONFIG);
}

export async function saveCommunicationConfig(
  config: Partial<CommunicationConfig>,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  const current = await getCommunicationConfig();
  const updated = { ...current, ...config };
  return await setPlatformConfig("communication_config", updated, adminUser, reason || "Updated communication policy");
}

// ----------------------------------------------------------------------------
// Audio & Voice Notes Policy Configuration
// ----------------------------------------------------------------------------
export async function getAudioPolicyConfig(): Promise<AudioPolicyConfig> {
  return await getPlatformConfig<AudioPolicyConfig>("audio_policy_config", DEFAULT_AUDIO_CONFIG);
}

export async function saveAudioPolicyConfig(
  config: Partial<AudioPolicyConfig>,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  const current = await getAudioPolicyConfig();
  const updated = { ...current, ...config };
  return await setPlatformConfig("audio_policy_config", updated, adminUser, reason || "Updated audio & voice note policy");
}

// ----------------------------------------------------------------------------
// Footer Configuration & Social Channels
// ----------------------------------------------------------------------------
export async function getFooterConfig(): Promise<FooterConfig> {
  return await getPlatformConfig<FooterConfig>("website_footer", DEFAULT_FOOTER_CONFIG);
}

export async function saveFooterConfig(
  config: FooterConfig,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  return await setPlatformConfig("website_footer", config, adminUser, reason || "Updated website footer and official channels");
}

// ----------------------------------------------------------------------------
// Section 11: Formal Difficulty Model Configuration
// ----------------------------------------------------------------------------
export async function getDifficultyConfig(): Promise<AdministratorDifficultyConfig> {
  return await getPlatformConfig<AdministratorDifficultyConfig>(
    "formal_difficulty_config",
    DEFAULT_ADMIN_DIFFICULTY_CONFIG
  );
}

export async function saveDifficultyConfig(
  config: AdministratorDifficultyConfig,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  // Section 11: Configuration changes must be validated before publication
  const { reference_distributions } = config;
  if (!reference_distributions) {
    return { success: false, error: "Reference distributions are required." };
  }

  if (!validateProportionsSum(reference_distributions.low)) {
    return { success: false, error: "Low reference distribution (Easy + Medium + Hard) must sum to exactly 100%." };
  }
  if (!validateProportionsSum(reference_distributions.medium)) {
    return { success: false, error: "Medium reference distribution (Easy + Medium + Hard) must sum to exactly 100%." };
  }
  if (!validateProportionsSum(reference_distributions.high)) {
    return { success: false, error: "High reference distribution (Easy + Medium + Hard) must sum to exactly 100%." };
  }

  if (config.default_slider_position < 0 || config.default_slider_position > 100) {
    return { success: false, error: "Default slider position must be between 0 and 100." };
  }

  const updatedConfig: AdministratorDifficultyConfig = {
    ...config,
    version: (config.version || 1) + 1,
    updated_at: new Date().toISOString(),
    updated_by: adminUser.email,
  };

  const ok = await setPlatformConfig(
    "formal_difficulty_config",
    updatedConfig,
    adminUser,
    reason || `Updated CBT Formal Difficulty Model (version ${updatedConfig.version})`
  );

  return { success: ok, error: ok ? undefined : "Failed to persist configuration to platform database." };
}
