import { supabase } from "./supabase";
import type { LiveServicesCredentials } from "./liveClassroom/types";
import {
  AdministratorDifficultyConfig,
  DEFAULT_ADMIN_DIFFICULTY_CONFIG,
  validateProportionsSum,
} from "./difficultyEngine";

export interface PlanEntitlements {
  cbt_access: boolean; // CBT Mock and examination portal access
  cbt_unlimited: boolean; // true = unlimited attempts, false = limited by daily quota
  cbt_daily_limit: number; // Max mock attempts per day if not unlimited (0 = unlimited)
  cbt_corrections: boolean; // Access to post-exam step-by-step corrections & explanations
  offline_saving: boolean; // Ability to cache questions and practice offline
  ai_tutor_enabled: boolean; // AI study buddy & hint assistance
  ai_monthly_quota: number; // Monthly AI query allowance (999999 = unlimited)
  ai_voice_tutor: boolean; // AI voice note read aloud & pronunciation
  classroom_access: boolean; // Access to live masterclasses & audio/video classrooms
  competitions_included: boolean; // Access to live 1v1 arena & school competitions
  advanced_analytics: boolean; // Detailed topic psychometrics & weakness diagnostics
  certificates_issued: boolean; // Verified digital certificates upon score threshold
  calculator_type: "none" | "standard" | "scientific"; // Allowed exam calculator type
  vip_support: boolean; // 24/7 priority resolution and tutor direct dispatch
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_kobo: number;
  price_naira: number;
  currency: string;
  interval: "monthly" | "yearly";
  features: string[];
  entitlements: PlanEntitlements;
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
  chief_proctor_name?: string;
  chief_proctor_title?: string;
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

export type AIModelStrength =
  | "reasoning_stem"   // Complex math, physics, chemistry, analytical reasoning
  | "speed_drill"       // Rapid practice drills, fast definitions, flashcards
  | "general"          // Standard English, government, literature, biology
  | "failover";        // Fallback / backup model

export type AIRoutingStrategy =
  | "auto_strength"    // Automatically routes based on subject & task complexity + live availability
  | "load_balance"     // Shuffles / round-robins across all healthy models with quota headroom
  | "priority_failover"// Strict priority order (Priority 1 -> Priority 2 -> Priority 3)
  | "admin_pinned";    // Locks to a specific model designated by Super Admin

export type AIProvider = "gemini" | "groq" | "openai" | "anthropic" | "openrouter";

export interface AIModelDefinition {
  id: string;
  name: string;
  provider: AIProvider;
  modelIdentifier: string;
  strength: AIModelStrength;
  priority: number;
  enabled: boolean;
  maxTokens: number;
  dailyQuotaLimit: number;
  notes?: string;
  addedAt: string;
  addedBy?: string;
}

export interface AIPlatformConfig {
  provider: "gemini" | "groq" | "openai" | "anthropic" | "openrouter";
  gemini_model: string;
  groq_model: string;
  openai_model?: string;
  anthropic_model?: string;
  openrouter_model?: string;
  provider_keys?: {
    openai?: string;
    anthropic?: string;
    openrouter?: string;
    gemini?: string;
    groq?: string;
  };
  routing_strategy?: AIRoutingStrategy;
  pinned_model_id?: string;
  model_pool?: AIModelDefinition[];
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
  provider_credentials?: LiveServicesCredentials;
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

export const DEFAULT_FREE_ENTITLEMENTS: PlanEntitlements = {
  cbt_access: true,
  cbt_unlimited: false,
  cbt_daily_limit: 1,
  cbt_corrections: false,
  offline_saving: true,
  ai_tutor_enabled: true,
  ai_monthly_quota: 50,
  ai_voice_tutor: false,
  classroom_access: true,
  competitions_included: false,
  advanced_analytics: false,
  certificates_issued: false,
  calculator_type: "standard",
  vip_support: false,
};

export function normalizePlanEntitlements(
  raw?: Partial<PlanEntitlements> | Record<string, unknown>,
  isFreeTier: boolean = false
): PlanEntitlements {
  const base: PlanEntitlements = isFreeTier
    ? DEFAULT_FREE_ENTITLEMENTS
    : {
        cbt_access: true,
        cbt_unlimited: true,
        cbt_daily_limit: 0,
        cbt_corrections: true,
        offline_saving: true,
        ai_tutor_enabled: true,
        ai_monthly_quota: 500,
        ai_voice_tutor: true,
        classroom_access: true,
        competitions_included: true,
        advanced_analytics: true,
        certificates_issued: false,
        calculator_type: "scientific",
        vip_support: false,
      };

  if (!raw || typeof raw !== "object") return { ...base };

  const rawObj = raw as Record<string, unknown>;
  const rawCalc = rawObj.calculator_type;
  const calcType: "none" | "standard" | "scientific" =
    rawCalc === "none" || rawCalc === "standard" || rawCalc === "scientific" ? rawCalc : base.calculator_type;

  return {
    cbt_access: typeof rawObj.cbt_access === "boolean" ? rawObj.cbt_access : base.cbt_access,
    cbt_unlimited: typeof rawObj.cbt_unlimited === "boolean" ? rawObj.cbt_unlimited : base.cbt_unlimited,
    cbt_daily_limit: typeof rawObj.cbt_daily_limit === "number" ? rawObj.cbt_daily_limit : base.cbt_daily_limit,
    cbt_corrections: typeof rawObj.cbt_corrections === "boolean" ? rawObj.cbt_corrections : base.cbt_corrections,
    offline_saving: typeof rawObj.offline_saving === "boolean" ? rawObj.offline_saving : base.offline_saving,
    ai_tutor_enabled: typeof rawObj.ai_tutor_enabled === "boolean" ? rawObj.ai_tutor_enabled : base.ai_tutor_enabled,
    ai_monthly_quota:
      typeof rawObj.ai_monthly_quota === "number"
        ? rawObj.ai_monthly_quota
        : typeof rawObj.ai_daily_quota === "number"
        ? (rawObj.ai_daily_quota as number) * 30
        : base.ai_monthly_quota,
    ai_voice_tutor: typeof rawObj.ai_voice_tutor === "boolean" ? rawObj.ai_voice_tutor : base.ai_voice_tutor,
    classroom_access: typeof rawObj.classroom_access === "boolean" ? rawObj.classroom_access : base.classroom_access,
    competitions_included:
      typeof rawObj.competitions_included === "boolean" ? rawObj.competitions_included : base.competitions_included,
    advanced_analytics:
      typeof rawObj.advanced_analytics === "boolean" ? rawObj.advanced_analytics : base.advanced_analytics,
    certificates_issued:
      typeof rawObj.certificates_issued === "boolean" ? rawObj.certificates_issued : base.certificates_issued,
    calculator_type: calcType,
    vip_support: typeof rawObj.vip_support === "boolean" ? rawObj.vip_support : base.vip_support,
  };
}

// Default initial fallbacks for graceful resilience
export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free Learner",
    description: "Essential CBT exam preparation and basic practice.",
    price_kobo: 0,
    price_naira: 0,
    currency: "NGN",
    interval: "monthly",
    features: [
      "1 CBT mock test per day",
      "Standard Self Practice questions",
      "50 AI Tutor study hints per month",
      "Standard Exam Calculator",
      "Offline study saving",
    ],
    entitlements: DEFAULT_FREE_ENTITLEMENTS,
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
    features: [
      "Unlimited CBT mock examinations",
      "Step-by-step post-exam corrections & answers",
      "500 AI Tutor explanations per month",
      "AI Voice audio pronunciations & summaries",
      "Full Live Masterclass & Classroom access",
      "Competition Arena & 1v1 challenges",
      "In-depth topic psychometrics & analytics",
      "Scientific Exam Calculator",
    ],
    entitlements: {
      cbt_access: true,
      cbt_unlimited: true,
      cbt_daily_limit: 0,
      cbt_corrections: true,
      offline_saving: true,
      ai_tutor_enabled: true,
      ai_monthly_quota: 500,
      ai_voice_tutor: true,
      classroom_access: true,
      competitions_included: true,
      advanced_analytics: true,
      certificates_issued: false,
      calculator_type: "scientific",
      vip_support: false,
    },
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
    features: [
      "Everything in Premium Study",
      "1,500 AI Tutor explanations per month",
      "Official National School Competitions & Quizzes",
      "Verified Digital Certificates of Achievement",
      "Live Academic Masterclass Priority Entry",
    ],
    entitlements: {
      cbt_access: true,
      cbt_unlimited: true,
      cbt_daily_limit: 0,
      cbt_corrections: true,
      offline_saving: true,
      ai_tutor_enabled: true,
      ai_monthly_quota: 1500,
      ai_voice_tutor: true,
      classroom_access: true,
      competitions_included: true,
      advanced_analytics: true,
      certificates_issued: true,
      calculator_type: "scientific",
      vip_support: false,
    },
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
    features: [
      "Everything in BrainLab Plus",
      "Unlimited AI Tutor coaching & hints",
      "All National, State & School Competitions included",
      "Lifetime verified credential portfolio",
      "VIP 24/7 priority support & dispute escalations",
    ],
    entitlements: {
      cbt_access: true,
      cbt_unlimited: true,
      cbt_daily_limit: 0,
      cbt_corrections: true,
      offline_saving: true,
      ai_tutor_enabled: true,
      ai_monthly_quota: 999999,
      ai_voice_tutor: true,
      classroom_access: true,
      competitions_included: true,
      advanced_analytics: true,
      certificates_issued: true,
      calculator_type: "scientific",
      vip_support: true,
    },
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
  chief_proctor_name: "",
  chief_proctor_title: "Chief Examination Proctor",
};

const DEFAULT_ACADEMIC_CONFIG: AcademicConfig = {
  current_session: "2026/2027",
  classes: ["SS1", "SS2", "SS3", "UTME Candidate", "Post-UTME", "General Adult Learner"],
  curricula: ["JAMB UTME", "WAEC SSCE", "NECO", "Post-UTME Screening"],
  available_subjects: ["English", "Chemistry", "Physics", "Biology", "Mathematics", "Economics", "Government", "Literature"],
};

export const DEFAULT_MODEL_POOL: AIModelDefinition[] = [
  {
    id: "gemini-3-flash-preview",
    name: "Google Gemini 3 Flash (High-Reasoning & STEM)",
    provider: "gemini",
    modelIdentifier: "gemini-3-flash-preview",
    strength: "reasoning_stem",
    priority: 1,
    enabled: true,
    maxTokens: 350,
    dailyQuotaLimit: 1500,
    notes: "Primary reasoning model for mathematics, chemistry equations, and step-by-step problem breakdowns.",
    addedAt: "2026-10-27T00:00:00.000Z",
  },
  {
    id: "qwen-3.8-27b",
    name: "Groq Qwen 27B (Ultra-Fast Inference & Drills)",
    provider: "groq",
    modelIdentifier: "qwen/qwen3.8-27b",
    strength: "speed_drill",
    priority: 2,
    enabled: true,
    maxTokens: 350,
    dailyQuotaLimit: 1000,
    notes: "Sub-200ms ultra-low latency model for high-frequency practice drills and immediate answer hints.",
    addedAt: "2026-10-27T00:00:00.000Z",
  },
  {
    id: "gemini-3.8-flash",
    name: "Google Gemini 3.8 Flash (General Studies & Verbal)",
    provider: "gemini",
    modelIdentifier: "gemini-3.8-flash",
    strength: "general",
    priority: 3,
    enabled: true,
    maxTokens: 350,
    dailyQuotaLimit: 1500,
    notes: "Well-rounded model for English, literature, and general mock assessments.",
    addedAt: "2026-10-27T00:00:00.000Z",
  },
];

const DEFAULT_AI_CONFIG: AIPlatformConfig = {
  provider: "gemini",
  gemini_model: "gemini-3-flash-preview",
  groq_model: "qwen/qwen3.8-27b",
  routing_strategy: "auto_strength",
  pinned_model_id: "gemini-3-flash-preview",
  model_pool: DEFAULT_MODEL_POOL,
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
  provider_credentials: {
    livekit_url: "",
    livekit_api_key: "",
    livekit_api_secret: "",
    agora_app_id: "",
    agora_app_certificate: "",
    daily_api_key: "",
    daily_domain: "",
    webrtc_ice_servers: "",
  },
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
  return plans
    .map((p) => ({
      ...p,
      entitlements: normalizePlanEntitlements(p.entitlements, p.id === "free"),
    }))
    .sort((a, b) => a.display_order - b.display_order);
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
  const config = await getPlatformConfig<AIPlatformConfig>("ai_platform_config", DEFAULT_AI_CONFIG);
  if (!config.model_pool || !Array.isArray(config.model_pool) || config.model_pool.length === 0) {
    config.model_pool = DEFAULT_MODEL_POOL;
  }
  if (!config.routing_strategy) {
    config.routing_strategy = "auto_strength";
  }
  return config;
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

// ----------------------------------------------------------------------------
// Payment Gateways & Dynamic API Key Configuration
// ----------------------------------------------------------------------------
export interface GatewayProviderConfig {
  enabled: boolean;
  test_mode: boolean;
  public_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  api_key?: string;
  encryption_key?: string;
  contract_code?: string;
}

export interface BankTransferConfig {
  enabled: boolean;
  bank_name: string;
  account_number: string;
  account_name: string;
  instructions?: string;
}

export interface PaymentGatewaysConfig {
  active_provider: "paystack" | "flutterwave" | "bachs" | "bank_transfer";
  allow_candidate_choice: boolean;
  providers: {
    paystack: GatewayProviderConfig;
    flutterwave: GatewayProviderConfig;
    bachs: GatewayProviderConfig;
    bank_transfer: BankTransferConfig;
  };
}

export const DEFAULT_PAYMENT_GATEWAYS_CONFIG: PaymentGatewaysConfig = {
  active_provider: "paystack",
  allow_candidate_choice: true,
  providers: {
    paystack: {
      enabled: true,
      test_mode: process.env.PAYMENT_LIVE_ENABLED !== "true",
      public_key: process.env.PAYSTACK_PUBLIC_KEY || "",
      secret_key: process.env.PAYSTACK_SECRET_KEY || "",
      webhook_secret: process.env.PAYSTACK_SECRET_KEY || "",
    },
    flutterwave: {
      enabled: false,
      test_mode: true,
      public_key: process.env.FLUTTERWAVE_PUBLIC_KEY || "",
      secret_key: process.env.FLUTTERWAVE_SECRET_KEY || "",
      webhook_secret: process.env.FLUTTERWAVE_SECRET_HASH || "",
    },
    bachs: {
      enabled: true,
      test_mode: process.env.BACHS_ENVIRONMENT !== "production",
      api_key: process.env.BACHS_API_KEY || "",
      webhook_secret: process.env.BACHS_WEBHOOK_SECRET || "",
    },
    bank_transfer: {
      enabled: true,
      bank_name: "Guaranty Trust Bank (GTBank)",
      account_number: "0123456789",
      account_name: "BrainLab Educational Technologies Ltd",
      instructions: "Transfer the exact amount to the account above and retain your transaction receipt for automated or manual verification.",
    },
  },
};

export async function getPaymentGatewaysConfig(): Promise<PaymentGatewaysConfig> {
  const config = await getPlatformConfig<PaymentGatewaysConfig>(
    "payment_gateways_config",
    DEFAULT_PAYMENT_GATEWAYS_CONFIG
  );
  return {
    ...DEFAULT_PAYMENT_GATEWAYS_CONFIG,
    ...config,
    providers: {
      ...DEFAULT_PAYMENT_GATEWAYS_CONFIG.providers,
      ...(config.providers || {}),
    },
  };
}

export async function savePaymentGatewaysConfig(
  config: PaymentGatewaysConfig,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  return await setPlatformConfig(
    "payment_gateways_config",
    config,
    adminUser,
    reason || `Updated payment gateway settings (Active: ${config.active_provider})`
  );
}

// ============================================================================
// ANNOUNCEMENTS & CBT MAINTENANCE MODE
// ============================================================================

export interface AnnouncementConfig {
  enabled: boolean;
  message: string;
  severity: "info" | "warning" | "urgent" | "success";
  dismissible: boolean;
  target_audience: "all" | "students" | "unsubscribed";
  link_url?: string;
  link_label?: string;
  updated_at?: string;
}

export const DEFAULT_ANNOUNCEMENT_CONFIG: AnnouncementConfig = {
  enabled: false,
  message: "Welcome to BrainLab Academy. Prepare for JAMB UTME & WAEC with timed mock tests and AI tutoring.",
  severity: "info",
  dismissible: true,
  target_audience: "all",
  link_url: "/pricing",
  link_label: "View Plans",
};

export interface MaintenanceModeConfig {
  cbt_maintenance_enabled: boolean;
  message: string;
  estimated_resumption?: string;
  allow_admin_bypass: boolean;
  updated_at?: string;
}

export const DEFAULT_MAINTENANCE_MODE_CONFIG: MaintenanceModeConfig = {
  cbt_maintenance_enabled: false,
  message: "The CBT Testing Engine is undergoing routine scheduled maintenance to update question blueprints. We will resume shortly.",
  estimated_resumption: "Within 30 minutes",
  allow_admin_bypass: true,
};

export async function getAnnouncementConfig(): Promise<AnnouncementConfig> {
  const config = await getPlatformConfig<AnnouncementConfig>(
    "announcement_config",
    DEFAULT_ANNOUNCEMENT_CONFIG
  );
  return { ...DEFAULT_ANNOUNCEMENT_CONFIG, ...config };
}

export async function saveAnnouncementConfig(
  config: AnnouncementConfig,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  return await setPlatformConfig(
    "announcement_config",
    { ...config, updated_at: new Date().toISOString() },
    adminUser,
    reason || `Updated site-wide announcement banner (${config.enabled ? "Active" : "Disabled"})`
  );
}

export async function getMaintenanceModeConfig(): Promise<MaintenanceModeConfig> {
  const config = await getPlatformConfig<MaintenanceModeConfig>(
    "maintenance_mode_config",
    DEFAULT_MAINTENANCE_MODE_CONFIG
  );
  return { ...DEFAULT_MAINTENANCE_MODE_CONFIG, ...config };
}

export async function saveMaintenanceModeConfig(
  config: MaintenanceModeConfig,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  return await setPlatformConfig(
    "maintenance_mode_config",
    { ...config, updated_at: new Date().toISOString() },
    adminUser,
    reason || `Updated CBT maintenance mode (${config.cbt_maintenance_enabled ? "MAINTENANCE ON" : "NORMAL OPERATIONS"})`
  );
}


// ============================================================================
// COMMUNICATION & EMAIL PROVIDERS CONFIGURATION (RESEND, ZOHO, CLOUDFLARE, TERMII)
// ============================================================================

export interface CommunicationServicesConfig {
  active_email_provider: "resend" | "zoho" | "smtp";
  resend: {
    enabled: boolean;
    api_key: string;
    from_email: string;
    system_from_email: string;
    reply_to: string;
  };
  zoho: {
    enabled: boolean;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    from_email: string;
    use_tls: boolean;
  };
  cloudflare: {
    enabled: boolean;
    api_token: string;
    account_id: string;
    zone_id: string;
    turnstile_site_key: string;
    turnstile_secret_key: string;
    email_routing_domain: string;
  };
  termii: {
    enabled: boolean;
    api_key: string;
    sender_id: string;
    channel: "generic" | "dnd" | "whatsapp";
  };
  updated_at?: string;
  updated_by?: string;
}

export const DEFAULT_COMMUNICATION_SERVICES_CONFIG: CommunicationServicesConfig = {
  active_email_provider: "resend",
  resend: {
    enabled: true,
    api_key: process.env.RESEND_API_KEY || "",
    from_email: process.env.RESEND_FROM_EMAIL || "BrainLab Academy <support@brainlab.edu.ng>",
    system_from_email: process.env.SYSTEM_FROM_EMAIL || "BrainLab Academy <results@brainlabacademy.com.ng>",
    reply_to: "support@brainlab.edu.ng",
  },
  zoho: {
    enabled: false,
    smtp_host: "smtppro.zoho.com",
    smtp_port: 465,
    smtp_user: "",
    smtp_pass: "",
    from_email: "support@brainlab.edu.ng",
    use_tls: true,
  },
  cloudflare: {
    enabled: false,
    api_token: process.env.CLOUDFLARE_API_TOKEN || "",
    account_id: process.env.CLOUDFLARE_ACCOUNT_ID || "",
    zone_id: "",
    turnstile_site_key: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "",
    turnstile_secret_key: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "",
    email_routing_domain: "brainlab.edu.ng",
  },
  termii: {
    enabled: true,
    api_key: process.env.TERMII_API_KEY || "",
    sender_id: process.env.TERMII_SENDER_ID || "BrainLab",
    channel: "generic",
  },
};

export async function getCommunicationServicesConfig(): Promise<CommunicationServicesConfig> {
  const config = await getPlatformConfig<CommunicationServicesConfig>(
    "communication_services_config",
    DEFAULT_COMMUNICATION_SERVICES_CONFIG
  );
  return {
    ...DEFAULT_COMMUNICATION_SERVICES_CONFIG,
    ...config,
    resend: {
      ...DEFAULT_COMMUNICATION_SERVICES_CONFIG.resend,
      ...(config?.resend || {}),
      api_key: config?.resend?.api_key || process.env.RESEND_API_KEY || "",
      from_email: config?.resend?.from_email || process.env.RESEND_FROM_EMAIL || DEFAULT_COMMUNICATION_SERVICES_CONFIG.resend.from_email,
      system_from_email: config?.resend?.system_from_email || process.env.SYSTEM_FROM_EMAIL || DEFAULT_COMMUNICATION_SERVICES_CONFIG.resend.system_from_email,
    },
    zoho: {
      ...DEFAULT_COMMUNICATION_SERVICES_CONFIG.zoho,
      ...(config?.zoho || {}),
    },
    cloudflare: {
      ...DEFAULT_COMMUNICATION_SERVICES_CONFIG.cloudflare,
      ...(config?.cloudflare || {}),
      api_token: config?.cloudflare?.api_token || process.env.CLOUDFLARE_API_TOKEN || "",
      account_id: config?.cloudflare?.account_id || process.env.CLOUDFLARE_ACCOUNT_ID || "",
      turnstile_site_key: config?.cloudflare?.turnstile_site_key || process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "",
      turnstile_secret_key: config?.cloudflare?.turnstile_secret_key || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "",
    },
    termii: {
      ...DEFAULT_COMMUNICATION_SERVICES_CONFIG.termii,
      ...(config?.termii || {}),
      api_key: config?.termii?.api_key || process.env.TERMII_API_KEY || "",
      sender_id: config?.termii?.sender_id || process.env.TERMII_SENDER_ID || "BrainLab",
    },
  };
}

export async function saveCommunicationServicesConfig(
  config: CommunicationServicesConfig,
  adminUser: { id: string; email: string },
  reason?: string
): Promise<boolean> {
  return await setPlatformConfig(
    "communication_services_config",
    {
      ...config,
      updated_at: new Date().toISOString(),
      updated_by: adminUser.email,
    },
    adminUser,
    reason || `Updated communication services & email provider settings (Active: ${config.active_email_provider})`
  );
}
