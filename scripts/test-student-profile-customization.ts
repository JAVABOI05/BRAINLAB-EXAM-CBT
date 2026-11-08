/**
 * Verification Test Suite for Student Profile Customization & Identity Modernization
 * Run with: npx tsx scripts/test-student-profile-customization.ts
 */

import * as fs from "fs";
import * as path from "path";
import {
  CURATED_AVATARS,
  POPULAR_UNIVERSITIES,
  POPULAR_COURSES,
  ACADEMIC_INTERESTS_LIST,
  STUDY_VIBES,
  TARGET_SCORES,
  extractStudentProfile,
  getCuratedAvatar,
} from "../app/lib/studentProfile";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${testName}${detail ? ` (${detail})` : ""}`);
    failed++;
  }
}

function runTests() {
  console.log("\n========================================================");
  console.log(" BRAINLAB ACADEMY - STUDENT PROFILE & IDENTITY SUITE");
  console.log("========================================================\n");

  // 1. Curated Avatars Engine
  console.log("--- 1. Curated Scholar Personas ---");
  {
    assert(CURATED_AVATARS.length >= 12, "At least 12 curated scholar personas defined");
    const tech = getCuratedAvatar("avatar-tech");
    assert(!!tech && tech.name === "Tech Prodigy" && tech.emoji === "💻", "Tech Prodigy avatar lookup works");
    const medical = getCuratedAvatar("avatar-medical");
    assert(!!medical && medical.name === "Medical Pioneer" && medical.emoji === "🩺", "Medical Pioneer avatar lookup works");
    const space = getCuratedAvatar("avatar-space");
    assert(!!space && space.emoji === "🚀", "Cosmic Explorer avatar lookup works");
  }

  // 2. Profile Extraction & Formatting
  console.log("\n--- 2. Profile Extraction Engine ---");
  {
    const sampleUser = {
      email: "jayeolavictor2005@gmail.com",
      user_metadata: {
        full_name: "Jayeola Victor",
        custom_avatar_id: "avatar-medical",
        dream_school: "University of Lagos (UNILAG)",
        target_course: "Medicine & Surgery",
        target_score: "340+ / 400 (Scholarship & Merit Star)",
        academic_interests: ["Organic Chemistry", "Genetics & Anatomy"],
        study_vibe: "Visual & Interactive Explorer",
        bio: "Future surgeon aiming for 340+ in JAMB 2026!",
      },
    };

    const prof = extractStudentProfile(sampleUser);
    assert(prof.displayName === "Jayeola Victor", "Display name extracted correctly");
    assert(prof.initials === "JV", "Initials computed as 'JV'");
    assert(prof.customAvatarId === "avatar-medical", "Custom avatar ID extracted");
    assert(prof.dreamSchool === "University of Lagos (UNILAG)", "Dream school extracted");
    assert(prof.targetCourse === "Medicine & Surgery", "Target course extracted");
    assert(prof.academicInterests.length === 2, "Academic interests array extracted");
    assert(prof.studyVibe === "Visual & Interactive Explorer", "Study vibe extracted");
    assert(prof.isCustomized === true, "Marks profile as customized");

    // Fallback handling
    const emptyUser = { email: "newstudent@brainlab.ng" };
    const emptyProf = extractStudentProfile(emptyUser);
    assert(emptyProf.displayName === "newstudent", "Defaults display name to email prefix");
    assert(emptyProf.initials === "N", "Computes single initial when one word");
    assert(emptyProf.isCustomized === false, "Marks empty profile as uncustomized");
  }

  // 3. Academic Catalog Options
  console.log("\n--- 3. Academic Discovery Options ---");
  {
    assert(POPULAR_UNIVERSITIES.length >= 10, "Provides 10+ popular higher institutions");
    assert(POPULAR_UNIVERSITIES.some((u) => u.includes("UNILAG")), "Includes UNILAG in universities");
    assert(POPULAR_COURSES.length >= 10, "Provides 10+ popular career courses");
    assert(POPULAR_COURSES.some((c) => c.includes("Medicine")), "Includes Medicine in courses");
    assert(ACADEMIC_INTERESTS_LIST.length >= 10, "Provides 10+ academic interest tags");
    assert(STUDY_VIBES.length >= 4, "Provides 4+ learning vibes");
    assert(TARGET_SCORES.length >= 4, "Provides structured JAMB score targets");
  }

  // 4. UI Architecture & Components Verification
  console.log("\n--- 4. UI Component Architecture ---");
  {
    const avatarComponentPath = path.resolve(process.cwd(), "app/components/ui/StudentAvatar.tsx");
    assert(fs.existsSync(avatarComponentPath), "StudentAvatar component file exists");
    const avatarContent = fs.readFileSync(avatarComponentPath, "utf8");
    assert(avatarContent.includes("export function StudentAvatar"), "StudentAvatar component exported");
    assert(avatarContent.includes("getCuratedAvatar"), "StudentAvatar handles curated avatars");
    assert(avatarContent.includes("showOnlineDot"), "StudentAvatar supports online active indicator");

    const shellPath = path.resolve(process.cwd(), "app/dashboard/StudentPortalShell.tsx");
    const shellContent = fs.readFileSync(shellPath, "utf8");
    assert(shellContent.includes("StudentAvatar"), "StudentPortalShell imports and uses StudentAvatar");
    assert(!shellContent.includes("{displayName.charAt(0)}"), "Removed archaic single letter initial {displayName.charAt(0)}");
    assert(shellContent.includes("studentProfile.dreamSchool") || shellContent.includes("studentProfile.targetCourse"), "StudentPortalShell displays student target pathway in dropdown");

    const profilePagePath = path.resolve(process.cwd(), "app/profile/page.tsx");
    const profilePageContent = fs.readFileSync(profilePagePath, "utf8");
    assert(profilePageContent.includes("CURATED_AVATARS"), "Profile page includes curated scholar avatars");
    assert(profilePageContent.includes("POPULAR_UNIVERSITIES"), "Profile page includes dream school selector");
    assert(profilePageContent.includes("POPULAR_COURSES"), "Profile page includes course of study selector");
    assert(profilePageContent.includes("ACADEMIC_INTERESTS_LIST"), "Profile page includes academic passions");
    assert(profilePageContent.includes("STUDY_VIBES"), "Profile page includes study vibe selector");

    const dashboardPath = path.resolve(process.cwd(), "app/dashboard/page.tsx");
    const dashboardContent = fs.readFileSync(dashboardPath, "utf8");
    assert(dashboardContent.includes("StudentAvatar"), "Dashboard uses modern StudentAvatar in welcome hero");
    assert(dashboardContent.includes("studentProfile.targetCourse") || dashboardContent.includes("studentProfile.dreamSchool"), "Dashboard renders student ambition badges");
  }

  console.log("\n========================================================");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
