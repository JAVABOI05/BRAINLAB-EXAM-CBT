// BrainLab Academy - Student Profile Customization & Identity Engine
// Manages student avatar selection, dream school, target course, academic interests, and learning vibe.

export interface CuratedAvatar {
  id: string;
  name: string;
  category: string;
  emoji: string;
  gradient: string;
  accentColor: string;
  badge: string;
}

export const CURATED_AVATARS: CuratedAvatar[] = [
  {
    id: "avatar-medical",
    name: "Medical Pioneer",
    category: "Health & Life Sciences",
    emoji: "🩺",
    gradient: "from-rose-500 via-pink-600 to-indigo-600",
    accentColor: "#f43f5e",
    badge: "Future Doctor",
  },
  {
    id: "avatar-tech",
    name: "Tech Prodigy",
    category: "Computing & AI",
    emoji: "💻",
    gradient: "from-cyan-500 via-blue-600 to-indigo-700",
    accentColor: "#06b6d4",
    badge: "AI Architect",
  },
  {
    id: "avatar-space",
    name: "Cosmic Explorer",
    category: "Aerospace & Physics",
    emoji: "🚀",
    gradient: "from-purple-600 via-indigo-600 to-blue-500",
    accentColor: "#9333ea",
    badge: "Astrophysicist",
  },
  {
    id: "avatar-chemistry",
    name: "Molecular Chemist",
    category: "Chemical Sciences",
    emoji: "🧪",
    gradient: "from-emerald-500 via-teal-600 to-cyan-600",
    accentColor: "#10b981",
    badge: "Lab Researcher",
  },
  {
    id: "avatar-math",
    name: "Math Mastermind",
    category: "Pure & Applied Math",
    emoji: "📐",
    gradient: "from-amber-500 via-orange-600 to-rose-600",
    accentColor: "#f59e0b",
    badge: "Quant Solver",
  },
  {
    id: "avatar-genetics",
    name: "Genomics Pioneer",
    category: "Biotechnology",
    emoji: "🧬",
    gradient: "from-teal-400 via-emerald-500 to-blue-600",
    accentColor: "#14b8a6",
    badge: "Biotech Innovator",
  },
  {
    id: "avatar-law",
    name: "Supreme Jurist",
    category: "Law & Jurisprudence",
    emoji: "⚖️",
    gradient: "from-slate-700 via-indigo-900 to-blue-800",
    accentColor: "#6366f1",
    badge: "Future SAN",
  },
  {
    id: "avatar-physics",
    name: "Quantum Solver",
    category: "Engineering & Energy",
    emoji: "⚡",
    gradient: "from-blue-600 via-violet-600 to-purple-600",
    accentColor: "#3b82f6",
    badge: "Energy Innovator",
  },
  {
    id: "avatar-creative",
    name: "Design Innovator",
    category: "Creative & Media",
    emoji: "🎨",
    gradient: "from-pink-500 via-purple-500 to-indigo-500",
    accentColor: "#ec4899",
    badge: "Creative Director",
  },
  {
    id: "avatar-global",
    name: "Global Diplomat",
    category: "Economics & Policy",
    emoji: "🌍",
    gradient: "from-blue-500 via-teal-500 to-emerald-500",
    accentColor: "#0ea5e9",
    badge: "Policy Strategist",
  },
  {
    id: "avatar-champion",
    name: "Arena Champion",
    category: "Competitive Mastery",
    emoji: "🏆",
    gradient: "from-amber-400 via-yellow-500 to-orange-500",
    accentColor: "#eab308",
    badge: "Top 1% Ranker",
  },
  {
    id: "avatar-eagle",
    name: "Apex Scholar",
    category: "Academic Excellence",
    emoji: "🦅",
    gradient: "from-sky-500 via-blue-700 to-slate-900",
    accentColor: "#0284c7",
    badge: "Valedictorian",
  },
];

import {
  POPULAR_UNIVERSITIES_LIST,
  POPULAR_COURSES_LIST,
} from "./nigerianInstitutions";

export const POPULAR_UNIVERSITIES = POPULAR_UNIVERSITIES_LIST;
export const POPULAR_COURSES = POPULAR_COURSES_LIST;

export const ACADEMIC_INTERESTS_LIST = [
  { id: "ai", label: "AI & Robotics", emoji: "🤖" },
  { id: "organic-chem", label: "Organic Chemistry", emoji: "🧪" },
  { id: "calculus", label: "Calculus & Pure Math", emoji: "🧮" },
  { id: "genetics", label: "Genetics & Anatomy", emoji: "🧬" },
  { id: "electromagnetism", label: "Electromagnetism", emoji: "⚡" },
  { id: "coding", label: "Software & Web Development", emoji: "💻" },
  { id: "astrophysics", label: "Astrophysics & Space", emoji: "🚀" },
  { id: "neuroscience", label: "Neuroscience", emoji: "🧠" },
  { id: "economics", label: "Macroeconomics & Finance", emoji: "📈" },
  { id: "literature", label: "African & World Literature", emoji: "📖" },
  { id: "public-speaking", label: "Debate & Public Speaking", emoji: "🎙️" },
  { id: "innovation", label: "Startups & Innovation", emoji: "💡" },
];

export const STUDY_VIBES = [
  { id: "visual", label: "Visual & Interactive Explorer", emoji: "✨", desc: "Learns best with 3D models, flowcharts & videos" },
  { id: "deep", label: "Quiet Midnight Solver", emoji: "🌙", desc: "Thrives in deep, distraction-free quiet study hours" },
  { id: "competitive", label: "Speed Duelist & Arena Warrior", emoji: "⚔️", desc: "Fuelled by timed challenges and leaderboard duels" },
  { id: "analytical", label: "Analytical First-Principles Thinker", emoji: "🔬", desc: "Deconstructs formulas down to core fundamental proofs" },
  { id: "collaborator", label: "Study Group Leader & Explainer", emoji: "🤝", desc: "Masters concepts by teaching and discussing with peers" },
];

export const TARGET_SCORES = [
  "280+ / 400 (Solid Admission Goal)",
  "300+ / 400 (High-Tier Competitive)",
  "320+ / 400 (Top 1% Elite Cohort)",
  "340+ / 400 (Scholarship & Merit Star)",
  "350+ / 400 (BrainLab Legend)",
];

export const AVAILABLE_UTME_ELECTIVE_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Government",
  "Literature in English",
  "Economics",
  "Commerce",
  "Christian Religious Studies",
  "Agricultural Science",
  "Geography",
  "Financial Accounting",
  "History",
  "Islamic Studies",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Music",
  "Visual Art",
];

export interface SubjectPreset {
  id: string;
  label: string;
  description: string;
  subjects: [string, string, string, string];
}

export const FACULTY_SUBJECT_PRESETS: SubjectPreset[] = [
  {
    id: "medical",
    label: "Medical & Health Sciences",
    description: "Medicine, Nursing, Pharmacy, Dentistry, Anatomy",
    subjects: ["English", "Biology", "Physics", "Chemistry"],
  },
  {
    id: "engineering",
    label: "Engineering & Computing",
    description: "Mechanical, Software, Electrical, Computer Science",
    subjects: ["English", "Mathematics", "Physics", "Chemistry"],
  },
  {
    id: "law_arts",
    label: "Law, Arts & Humanities",
    description: "Law, Mass Comm, International Relations, Linguistics",
    subjects: ["English", "Literature in English", "Government", "Christian Religious Studies"],
  },
  {
    id: "commercial",
    label: "Commercial & Management",
    description: "Accounting, Economics, Business Admin, Banking & Finance",
    subjects: ["English", "Economics", "Mathematics", "Commerce"],
  },
  {
    id: "agriculture",
    label: "Agricultural & Environmental Sciences",
    description: "Agronomy, Animal Science, Forestry, Soil Science",
    subjects: ["English", "Agricultural Science", "Biology", "Chemistry"],
  },
  {
    id: "islamic_arts",
    label: "Islamic Studies & Humanities",
    description: "Arabic Studies, Islamic Law, Islamic Jurisprudence, History",
    subjects: ["English", "Islamic Studies", "Government", "Literature in English"],
  },
];

export const DEFAULT_CANDIDATE_SUBJECTS: [string, string, string, string] = [
  "English",
  "Mathematics",
  "Physics",
  "Chemistry",
];

export interface StudentProfileData {
  displayName: string;
  email: string;
  avatarUrl: string;
  customAvatarId: string;
  dreamSchool: string;
  targetCourse: string;
  targetScore: string;
  academicInterests: string[];
  studyVibe: string;
  bio: string;
  initials: string;
  isCustomized: boolean;
  selectedSubjects: [string, string, string, string];
}

/**
 * Extracts student profile from user object or local candidate cache
 */
export function extractStudentProfile(user: any): StudentProfileData {
  const meta = user?.user_metadata || {};
  const email = user?.email || "";
  const displayName = meta.full_name || meta.name || user?.name || email.split("@")[0] || "Learner";
  
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("") || displayName.charAt(0)?.toUpperCase() || "BL";

  const customAvatarId = meta.custom_avatar_id || meta.custom_avatar || "";
  const avatarUrl = meta.avatar_url || meta.picture || "";
  const dreamSchool = meta.dream_school || "";
  const targetCourse = meta.target_course || "";
  const targetScore = meta.target_score || "";
  const academicInterests = Array.isArray(meta.academic_interests) ? meta.academic_interests : [];
  const studyVibe = meta.study_vibe || "";
  const bio = meta.bio || meta.motto || "";

  // Resolve persistent 4-subject combination across cloud metadata and local fallback
  let subjects: [string, string, string, string] = [...DEFAULT_CANDIDATE_SUBJECTS];
  if (Array.isArray(meta.selected_subjects) && meta.selected_subjects.length === 4) {
    subjects = [
      "English",
      meta.selected_subjects[1] || "Mathematics",
      meta.selected_subjects[2] || "Physics",
      meta.selected_subjects[3] || "Chemistry",
    ];
  } else if (typeof window !== "undefined") {
    try {
      const savedCandidate = localStorage.getItem("candidate");
      if (savedCandidate) {
        const parsed = JSON.parse(savedCandidate);
        if (Array.isArray(parsed.subjects) && parsed.subjects.length === 4) {
          subjects = [
            "English",
            parsed.subjects[1] || "Mathematics",
            parsed.subjects[2] || "Physics",
            parsed.subjects[3] || "Chemistry",
          ];
        }
      }
    } catch {}
  }

  const isCustomized = Boolean(
    customAvatarId ||
    avatarUrl ||
    dreamSchool ||
    targetCourse ||
    academicInterests.length > 0 ||
    studyVibe ||
    bio ||
    (Array.isArray(meta.selected_subjects) && meta.selected_subjects.length === 4)
  );

  return {
    displayName,
    email,
    avatarUrl,
    customAvatarId,
    dreamSchool,
    targetCourse,
    targetScore,
    academicInterests,
    studyVibe,
    bio,
    initials,
    isCustomized,
    selectedSubjects: subjects,
  };
}

/**
 * Finds curated avatar metadata if an avatar ID is selected
 */
export function getCuratedAvatar(avatarId: string): CuratedAvatar | undefined {
  return CURATED_AVATARS.find((a) => a.id === avatarId);
}
