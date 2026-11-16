// Seed script to initialize all necessary exam_config rows with secure cryptographic hashes
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

console.log("=========================================================================");
console.log("  BRAINLAB SEEDER: INITIALIZING ESSENTIAL EXAM_CONFIG ROWS IN SUPABASE");
console.log("=========================================================================\n");

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local file");
  process.exit(1);
}

const env = fs.readFileSync(envPath, "utf-8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/)?.[1]?.trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/)?.[1]?.trim();

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// PBKDF2 helper for PIN hashing
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin.trim(), salt, 10000, 32, "sha256").toString("hex");
}

async function seed() {
  const INITIAL_ADMIN_PIN = "20262026"; // Default secure 8-digit admin PIN
  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPin = hashPin(INITIAL_ADMIN_PIN, salt);

  const rowsToSeed = [
    {
      config_key: "admin_security_pin",
      config_value: {
        hash: hashedPin,
        salt: salt,
        updated_at: new Date().toISOString(),
        updated_by: "system_seed",
        is_set: true,
      },
    },
    {
      config_key: "website_content_config",
      config_value: {
        platform_name: "BrainLab Academy",
        hero_headline: "Prepare with Purpose. Master Every Subject.",
        hero_subtitle: "Adaptive CBT examination practice, live AI Tutor breakdowns, and national examination readiness intelligence for Nigerian learners.",
        banner_announcement: "🎓 2026/2027 JAMB UTME & WAEC Mock Examination series is now live!",
        banner_active: true,
        support_email: "support@brainlabacademy.com.ng",
        support_phone: "+234 808 926 7399",
        maintenance_mode: false,
      },
    },
    {
      config_key: "footer_config",
      config_value: {
        brand_tagline: "Helping learners prepare smarter, build confidence, and achieve their academic goals.",
        brand_description: "Empowering Nigerian secondary and tertiary candidates with adaptive CBT mock exams, curriculum-aligned study materials, and instant AI tutor explanations.",
        support_email: "support@brainlabacademy.com.ng",
        academy_email: "hello@brainlabacademy.com.ng",
        support_phone: "+234 808 926 7399",
        whatsapp_number: "2348089267399",
        whatsapp_channel_url: "https://whatsapp.com/channel/0029Vb75fko3mFXyaqlnk70m",
        office_location: "Lagos, Nigeria",
        social_links: [
          { platform: "x", name: "X (Twitter)", url: "https://x.com/The_brainlabhub", enabled: true },
          { platform: "instagram", name: "Instagram", url: "https://www.instagram.com/brain_labacademy?dlrf=NGJzcmFnaGcwZHV4", enabled: true },
          { platform: "facebook", name: "Facebook", url: "https://www.facebook.com/profile.php?id=61595669640028", enabled: true },
          { platform: "youtube", name: "YouTube", url: "https://youtube.com/@thebrainlabhub?si=z4sAVuNmJUdPom_u", enabled: true },
        ],
        copyright_notice: "© 2026 BrainLab Academy. All rights reserved.",
        accreditation_statement: "Curriculum-aligned UTME, SSCE, and STEM training platform.",
      },
    },
    {
      config_key: "platform_feature_flags",
      config_value: {
        competitions_enabled: true,
        ai_hints_enabled: true,
        offline_mode: true,
        public_leaderboard: true,
        mock_exams: true,
        calculator_enabled: true,
        certificates_enabled: true,
        negative_marking: false,
        stem_studio_enabled: true,
      },
    },
    {
      config_key: "coupon_campaigns",
      config_value: [
        {
          id: "welcome2026",
          code: "WELCOME2026",
          discount_type: "percent",
          discount_value: 20,
          max_discount_naira: 1000,
          valid_plans: [],
          usage_limit: 1000,
          used_count: 0,
          expires_at: "2026-12-31T23:59:59Z",
          is_active: true,
        },
      ],
    },
    {
      config_key: "academic_config",
      config_value: {
        current_session: "2026/2027",
        classes: ["SS1", "SS2", "SS3", "UTME Candidate", "Post-UTME"],
        curricula: ["JAMB UTME", "WAEC SSCE", "NECO", "General Practice"],
        available_subjects: [
          "Mathematics",
          "English Language",
          "Physics",
          "Chemistry",
          "Biology",
          "Economics",
          "Government",
          "Literature in English",
          "Financial Accounting",
          "Commerce",
          "CRK",
          "IRS",
          "Agricultural Science",
          "Geography",
          "Civic Education",
        ],
      },
    },
  ];

  for (const row of rowsToSeed) {
    // Check if row already exists
    const { data: existing } = await supabase
      .from("exam_config")
      .select("config_key")
      .eq("config_key", row.config_key)
      .maybeSingle();

    if (existing) {
      console.log(`[SKIPPED] ${row.config_key} already exists in database.`);
    } else {
      const { error } = await supabase.from("exam_config").insert({
        config_key: row.config_key,
        config_value: row.config_value,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error(`[ERROR] Failed to insert ${row.config_key}:`, error.message);
      } else {
        console.log(`[SUCCESS] Seeded ${row.config_key} into exam_config.`);
        if (row.config_key === "admin_security_pin") {
          console.log(`          Initial Admin Security PIN configured: ${INITIAL_ADMIN_PIN} (cryptographically hashed)`);
        }
      }
    }
  }

  console.log("\nSeeding routine finished.");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
