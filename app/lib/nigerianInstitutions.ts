/**
 * BrainLab Academy - Comprehensive Nigerian Tertiary Institutions & Courses Library
 * 
 * Provides typed, searchable, zero-latency access to 312+ universities, 200+ polytechnics,
 * and 100+ accredited undergraduate degree programmes across all Nigerian states.
 */

import institutionsData from "@/app/data/nigerianInstitutionsData.json";

export type InstitutionCategory = "Federal" | "State" | "Private";
export type InstitutionType = "university" | "polytechnic";

export interface NigerianInstitution {
  id: string;
  name: string;
  acronym: string;
  category: InstitutionCategory;
  type: InstitutionType;
  state: string;
  yearEstablished?: string;
  website?: string;
  faculties: string[];
}

export interface NigerianCourse {
  name: string;
  faculty: string;
  defaultCombo: string;
  typicalCutoff: number;
}

export interface InstitutionSearchOptions {
  type?: InstitutionType;
  category?: InstitutionCategory;
  state?: string;
  limit?: number;
}

const ALL_INSTITUTIONS: NigerianInstitution[] = (institutionsData.institutions || []) as NigerianInstitution[];
const ALL_COURSES: NigerianCourse[] = (institutionsData.courses || []) as NigerianCourse[];

/**
 * All verified Nigerian tertiary institutions (universities + polytechnics)
 */
export function getAllInstitutions(): NigerianInstitution[] {
  return ALL_INSTITUTIONS;
}

/**
 * All accredited Nigerian universities (Federal, State, Private)
 */
export function getUniversities(): NigerianInstitution[] {
  return ALL_INSTITUTIONS.filter((i) => i.type === "university");
}

/**
 * All accredited Nigerian polytechnics
 */
export function getPolytechnics(): NigerianInstitution[] {
  return ALL_INSTITUTIONS.filter((i) => i.type === "polytechnic");
}

/**
 * Find institution by canonical ID or slug
 */
export function getInstitutionById(id: string): NigerianInstitution | undefined {
  if (!id) return undefined;
  const target = id.toLowerCase().trim();
  return ALL_INSTITUTIONS.find((i) => i.id.toLowerCase() === target);
}

/**
 * Find institution by name or acronym (fuzzy match)
 */
export function getInstitutionByName(query: string): NigerianInstitution | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return ALL_INSTITUTIONS.find(
    (i) =>
      i.name.toLowerCase() === q ||
      (i.acronym && i.acronym.toLowerCase() === q) ||
      i.name.toLowerCase().includes(q)
  );
}

/**
 * Search institutions with multi-field matching (acronym, name, state, location)
 */
export function searchInstitutions(
  query: string,
  options?: InstitutionSearchOptions
): NigerianInstitution[] {
  const cleanQ = (query || "").toLowerCase().trim();
  const { type, category, state, limit } = options || {};

  let pool = ALL_INSTITUTIONS;

  if (type) {
    pool = pool.filter((i) => i.type === type);
  }
  if (category) {
    pool = pool.filter((i) => i.category === category);
  }
  if (state) {
    const s = state.toLowerCase().trim();
    pool = pool.filter((i) => i.state.toLowerCase() === s);
  }

  if (!cleanQ) {
    return typeof limit === "number" ? pool.slice(0, limit) : pool;
  }

  const results = pool.filter((inst) => {
    if (inst.acronym && inst.acronym.toLowerCase() === cleanQ) return true;
    if (inst.name.toLowerCase().includes(cleanQ)) return true;
    if (inst.acronym && inst.acronym.toLowerCase().includes(cleanQ)) return true;
    if (inst.state.toLowerCase().includes(cleanQ)) return true;
    return false;
  });

  return typeof limit === "number" ? results.slice(0, limit) : results;
}

/**
 * Group institutions by category for <optgroup> dropdown rendering
 */
export function getInstitutionsGrouped(type: InstitutionType = "university"): Record<string, NigerianInstitution[]> {
  const list = type === "university" ? getUniversities() : getPolytechnics();
  const groups: Record<string, NigerianInstitution[]> = {
    "Federal Institutions": [],
    "State Institutions": [],
    "Private Institutions": [],
  };

  for (const inst of list) {
    if (inst.category === "Federal") {
      groups["Federal Institutions"].push(inst);
    } else if (inst.category === "State") {
      groups["State Institutions"].push(inst);
    } else {
      groups["Private Institutions"].push(inst);
    }
  }

  return groups;
}

/**
 * All accredited undergraduate courses & degree programmes
 */
export function getAllCourses(): NigerianCourse[] {
  return ALL_COURSES;
}

/**
 * Find course by programme title or fuzzy keyword
 */
export function getCourseByName(query: string): NigerianCourse | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return ALL_COURSES.find(
    (c) => c.name.toLowerCase() === q || c.name.toLowerCase().includes(q)
  );
}

/**
 * Unique faculties / academic disciplines
 */
export const FACULTIES = Array.from(new Set(ALL_COURSES.map((c) => c.faculty))).sort();

/**
 * Get courses filtered by academic faculty / discipline
 */
export function getCoursesByFaculty(faculty: string): NigerianCourse[] {
  if (!faculty) return ALL_COURSES;
  const f = faculty.toLowerCase().trim();
  return ALL_COURSES.filter((c) => c.faculty.toLowerCase() === f);
}

/**
 * Search courses by programme title or keyword
 */
export function searchCourses(query: string, faculty?: string): NigerianCourse[] {
  const cleanQ = (query || "").toLowerCase().trim();
  let pool = faculty ? getCoursesByFaculty(faculty) : ALL_COURSES;

  if (!cleanQ) return pool;

  return pool.filter(
    (c) =>
      c.name.toLowerCase().includes(cleanQ) ||
      c.faculty.toLowerCase().includes(cleanQ)
  );
}

/**
 * Group courses by faculty for <optgroup> dropdown rendering
 */
export function getCoursesGrouped(): Record<string, NigerianCourse[]> {
  const groups: Record<string, NigerianCourse[]> = {};

  for (const course of ALL_COURSES) {
    if (!groups[course.faculty]) {
      groups[course.faculty] = [];
    }
    groups[course.faculty].push(course);
  }

  return groups;
}

/**
 * Top most-sought Nigerian universities for quick UI pills / priority picks
 */
export const POPULAR_UNIVERSITIES_LIST = [
  "University of Lagos (UNILAG)",
  "University of Ibadan (UI)",
  "Obafemi Awolowo University (OAU)",
  "Ahmadu Bello University (ABU Zaria)",
  "University of Nigeria, Nsukka (UNN)",
  "Federal University of Technology, Akure (FUTA)",
  "University of Benin (UNIBEN)",
  "University of Ilorin (UNILORIN)",
  "Lagos State University (LASU)",
  "Federal University of Technology, Minna (FUTMINNA)",
  "Covenant University",
  "Babcock University",
  "Afe Babalola University (ABUAD)",
  "Bowen University",
  "Landmark University",
  "University of Port Harcourt (UNIPORT)",
  "University of Jos (UNIJOS)",
  "Bayero University, Kano (BUK)",
  "Federal University of Technology, Owerri (FUTO)",
  "Olabisi Onabanjo University (OOU)",
  "Yaba College of Technology (YABATECH)",
];

/**
 * Top high-demand courses for quick UI pills / priority picks
 */
export const POPULAR_COURSES_LIST = [
  "Medicine & Surgery (MBBS)",
  "Computer Science",
  "Software Engineering",
  "Nursing / Nursing Science (B.NSc)",
  "Law / Civil Law (LL.B)",
  "Pharmacy / Doctor of Pharmacy (Pharm.D / B.Pharm)",
  "Mechanical Engineering",
  "Electrical & Electronic Engineering",
  "Accounting / Accountancy",
  "Cybersecurity & Information Protection",
  "Artificial Intelligence & Robotics",
  "Economics",
  "Medical Laboratory Science (B.MLS)",
  "Civil Engineering",
  "Mass Communication / Media Studies",
  "Biochemistry",
  "Dentistry & Dental Surgery (BDS)",
  "Architecture",
];
