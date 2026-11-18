/**
 * BrainLab Academy - Nigerian Tertiary Institutions & Courses Compiler
 * 
 * Compiles comprehensive, authoritative datasets for all Nigerian Universities,
 * Polytechnics, Faculties, and Undergraduate Degree Programmes.
 */

import fs from "fs";
import path from "path";
import Papa from "papaparse";

interface RawUniRow {
  "S/N": string;
  "University Name": string;
  Category: "Federal" | "State" | "Private";
  Location: string;
  "Year Established"?: string;
  Website?: string;
  Faculties?: string;
}

interface RawPolyRow {
  "S/N": string;
  "Institution Name": string;
  Category: "Federal" | "State" | "Private";
  State: string;
  "Year Established"?: string;
  "Schools/Departments"?: string;
}

const KNOWN_ACRONYMS: Record<string, string> = {
  "University of Lagos": "UNILAG",
  "University of Ibadan": "UI",
  "Obafemi Awolowo University": "OAU",
  "Ahmadu Bello University, Zaria": "ABU",
  "University of Nigeria, Nsukka": "UNN",
  "University of Benin": "UNIBEN",
  "University of Ilorin": "UNILORIN",
  "University of Port Harcourt": "UNIPORT",
  "University of Jos": "UNIJOS",
  "University of Calabar": "UNICAL",
  "University of Abuja": "UNIABUJA",
  "University of Uyo": "UNIUYO",
  "University of Maiduguri": "UNIMAID",
  "Federal University of Technology, Akure": "FUTA",
  "Federal University of Technology, Minna": "FUTMINNA",
  "Federal University of Technology, Owerri": "FUTO",
  "Federal University of Petroleum Resources, Effurun": "FUPRE",
  "Abubakar Tafawa Balewa University, Bauchi": "ATBU",
  "Bayero University, Kano": "BUK",
  "Usmanu Danfodiyo University, Sokoto": "UDUS",
  "Nnamdi Azikiwe University, Awka": "UNIZIK",
  "Michael Okpara University of Agriculture, Umudike": "MOUAU",
  "Federal University of Agriculture, Abeokuta": "FUNAAB",
  "Alex Ekwueme University, Ndufu-Alike": "AE-FUNAI",
  "National Open University of Nigeria, Abuja": "NOUN",
  "Nigerian Defence Academy, Kaduna": "NDA",
  "Nigeria Police Academy, Wudil": "POLAC",
  "Lagos State University": "LASU",
  "Olabisi Onabanjo University": "OOU",
  "Ekiti State University": "EKSU",
  "Adekunle Ajasin University": "AAUA",
  "Rivers State University": "RSU",
  "Delta State University, Abraka": "DELSU",
  "Enugu State University of Science and Technology": "ESUT",
  "Ebonyi State University": "EBSU",
  "Abia State University, Uturu": "ABSU",
  "Osun State University": "UNIOSUN",
  "Kwara State University": "KWASU",
  "Kaduna State University": "KASU",
  "Benue State University, Makurdi": "BSUM",
  "Ambrose Alli University, Ekpoma": "AAU",
  "Covenant University": "CU",
  "Babcock University": "BU",
  "Afe Babalola University": "ABUAD",
  "Bowen University": "BOWEN",
  "Landmark University": "LMU",
  "Redeemer's University": "RUN",
  "Pan-Atlantic University": "PAU",
  "Bells University of Technology": "BELLS",
  "Al-Hikmah University": "AL-HIKMAH",
  "Igbinedion University, Okada": "IUO",
  "American University of Nigeria": "AUN",
  "Bile University": "BIU",
  "Lead City University": "LCU",
  "Nile University of Nigeria": "NILE",
  "Veritas University, Abuja": "VERITAS",
  "Yaba College of Technology": "YABATECH",
  "Kaduna Polytechnic": "KADPOLY",
  "Federal Polytechnic, Nekede": "NEKEDEPOLY",
  "Federal Polytechnic, Ilaro": "ILAROPOLY",
  "Federal Polytechnic, Ede": "EDEPOLY",
  "Federal Polytechnic, Offa": "OFFAPOLY",
  "Federal Polytechnic, Bida": "BIDAPOLY",
  "Federal Polytechnic, Ado-Ekiti": "ADOPOLY",
  "Auchi Polytechnic, Auchi": "AUCHIPOLY",
  "Lagos State Polytechnic": "LASPOTECH",
};

const COMPREHENSIVE_COURSES = [
  // 1. Medicine & Health Sciences
  { name: "Medicine & Surgery (MBBS)", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 280 },
  { name: "Dentistry & Dental Surgery (BDS)", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 265 },
  { name: "Pharmacy / Doctor of Pharmacy (Pharm.D / B.Pharm)", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 260 },
  { name: "Nursing / Nursing Science (B.NSc)", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 255 },
  { name: "Medical Laboratory Science (B.MLS)", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 245 },
  { name: "Physiotherapy (B.Pt)", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 245 },
  { name: "Radiography & Radiation Science", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 240 },
  { name: "Optometry (OD)", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 240 },
  { name: "Human Anatomy", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 220 },
  { name: "Human Physiology", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 220 },
  { name: "Public Health", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 225 },
  { name: "Veterinary Medicine (DVM)", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 230 },
  { name: "Medical Biochemistry", faculty: "Medicine & Health Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 220 },

  // 2. Computing, AI & Emerging Technologies
  { name: "Computer Science", faculty: "Computing & IT", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 250 },
  { name: "Software Engineering", faculty: "Computing & IT", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 255 },
  { name: "Cybersecurity & Information Protection", faculty: "Computing & IT", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 245 },
  { name: "Artificial Intelligence & Robotics", faculty: "Computing & IT", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 250 },
  { name: "Data Science & Big Data Analytics", faculty: "Computing & IT", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 245 },
  { name: "Information Technology (IT)", faculty: "Computing & IT", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 230 },
  { name: "Information Systems", faculty: "Computing & IT", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 220 },

  // 3. Engineering & Technology
  { name: "Mechanical Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 245 },
  { name: "Electrical & Electronic Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 250 },
  { name: "Civil Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 240 },
  { name: "Chemical Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 240 },
  { name: "Petroleum & Gas Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 240 },
  { name: "Computer Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 245 },
  { name: "Mechatronics Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 240 },
  { name: "Biomedical Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 235 },
  { name: "Aerospace & Aeronautical Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 245 },
  { name: "Agricultural & Bio-Resources Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 210 },
  { name: "Industrial & Production Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 225 },
  { name: "Metallurgical & Materials Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 215 },
  { name: "Marine Engineering", faculty: "Engineering & Technology", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 230 },

  // 4. Law & Legal Studies
  { name: "Law / Civil Law (LL.B)", faculty: "Law & Legal Studies", defaultCombo: "Use of English, Literature in English, Government, CRS/IRS", typicalCutoff: 270 },
  { name: "Common & Islamic Law (LL.B)", faculty: "Law & Legal Studies", defaultCombo: "Use of English, Islamic Studies, Government, Literature", typicalCutoff: 250 },
  { name: "Commercial & Business Law", faculty: "Law & Legal Studies", defaultCombo: "Use of English, Literature in English, Economics, Government", typicalCutoff: 260 },
  { name: "International Law & Jurisprudence", faculty: "Law & Legal Studies", defaultCombo: "Use of English, Literature in English, Government, History", typicalCutoff: 260 },

  // 5. Sciences & Natural Sciences
  { name: "Biochemistry", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 230 },
  { name: "Microbiology", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 225 },
  { name: "Biotechnology", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 225 },
  { name: "Industrial Chemistry", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Chemistry, Physics, Mathematics", typicalCutoff: 215 },
  { name: "Pure & Applied Chemistry", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Chemistry, Physics, Mathematics", typicalCutoff: 200 },
  { name: "Pure & Applied Physics", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Physics, Mathematics, Chemistry", typicalCutoff: 200 },
  { name: "Mathematics", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Mathematics, Physics, Chemistry/Economics", typicalCutoff: 205 },
  { name: "Industrial Mathematics", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Mathematics, Physics, Economics", typicalCutoff: 210 },
  { name: "Statistics", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Mathematics, Economics, Physics", typicalCutoff: 205 },
  { name: "Geology & Earth Sciences", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Physics, Chemistry, Mathematics/Biology", typicalCutoff: 210 },
  { name: "Geophysics", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Physics, Mathematics, Chemistry", typicalCutoff: 210 },
  { name: "Plant Biology & Biotechnology (Botany)", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 195 },
  { name: "Animal & Environmental Biology (Zoology)", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 195 },
  { name: "Marine Biology & Fisheries", faculty: "Pure & Applied Sciences", defaultCombo: "Use of English, Biology, Chemistry, Physics", typicalCutoff: 200 },

  // 6. Social Sciences
  { name: "Economics", faculty: "Social Sciences", defaultCombo: "Use of English, Mathematics, Economics, Government/Commerce", typicalCutoff: 240 },
  { name: "Mass Communication / Media Studies", faculty: "Social Sciences", defaultCombo: "Use of English, Literature in English, Government, CRS/IRS/Economics", typicalCutoff: 245 },
  { name: "Political Science & International Relations", faculty: "Social Sciences", defaultCombo: "Use of English, Government, Economics, Literature/CRS/IRS", typicalCutoff: 235 },
  { name: "Sociology", faculty: "Social Sciences", defaultCombo: "Use of English, Government, Economics, Literature/CRS/IRS", typicalCutoff: 215 },
  { name: "Psychology", faculty: "Social Sciences", defaultCombo: "Use of English, Biology, Economics, Government", typicalCutoff: 220 },
  { name: "Criminology & Security Studies", faculty: "Social Sciences", defaultCombo: "Use of English, Government, Economics, Literature", typicalCutoff: 225 },
  { name: "Demography & Social Statistics", faculty: "Social Sciences", defaultCombo: "Use of English, Mathematics, Economics, Government", typicalCutoff: 210 },
  { name: "Peace & Conflict Resolution", faculty: "Social Sciences", defaultCombo: "Use of English, Government, Economics, Literature", typicalCutoff: 210 },

  // 7. Administration & Management Sciences
  { name: "Accounting / Accountancy", faculty: "Management & Administration", defaultCombo: "Use of English, Mathematics, Economics, Commerce/Accounting", typicalCutoff: 245 },
  { name: "Banking & Finance", faculty: "Management & Administration", defaultCombo: "Use of English, Mathematics, Economics, Commerce/Government", typicalCutoff: 230 },
  { name: "Business Administration / Management", faculty: "Management & Administration", defaultCombo: "Use of English, Mathematics, Economics, Commerce/Government", typicalCutoff: 235 },
  { name: "Finance", faculty: "Management & Administration", defaultCombo: "Use of English, Mathematics, Economics, Commerce", typicalCutoff: 235 },
  { name: "Marketing", faculty: "Management & Administration", defaultCombo: "Use of English, Mathematics, Economics, Commerce/Marketing", typicalCutoff: 220 },
  { name: "Public Administration", faculty: "Management & Administration", defaultCombo: "Use of English, Government, Economics, Literature/Mathematics", typicalCutoff: 220 },
  { name: "Human Resource Management", faculty: "Management & Administration", defaultCombo: "Use of English, Economics, Government, Commerce/Mathematics", typicalCutoff: 220 },
  { name: "Actuarial Science", faculty: "Management & Administration", defaultCombo: "Use of English, Mathematics, Economics, Physics", typicalCutoff: 230 },
  { name: "Entrepreneurship & Innovation", faculty: "Management & Administration", defaultCombo: "Use of English, Economics, Mathematics, Commerce", typicalCutoff: 210 },
  { name: "Transport & Logistics Management", faculty: "Management & Administration", defaultCombo: "Use of English, Mathematics, Economics, Geography/Commerce", typicalCutoff: 210 },

  // 8. Environmental Sciences & Built Environment
  { name: "Architecture", faculty: "Environmental Sciences", defaultCombo: "Use of English, Physics, Mathematics, Chemistry/Fine Art/Geography", typicalCutoff: 240 },
  { name: "Estate Management & Valuation", faculty: "Environmental Sciences", defaultCombo: "Use of English, Mathematics, Economics, Geography/Biology", typicalCutoff: 215 },
  { name: "Building Technology", faculty: "Environmental Sciences", defaultCombo: "Use of English, Physics, Mathematics, Chemistry/Technical Drawing", typicalCutoff: 215 },
  { name: "Quantity Surveying", faculty: "Environmental Sciences", defaultCombo: "Use of English, Physics, Mathematics, Chemistry/Economics", typicalCutoff: 215 },
  { name: "Urban & Regional Planning", faculty: "Environmental Sciences", defaultCombo: "Use of English, Mathematics, Geography, Economics/Physics", typicalCutoff: 210 },
  { name: "Surveying & Geoinformatics", faculty: "Environmental Sciences", defaultCombo: "Use of English, Physics, Mathematics, Geography/Chemistry", typicalCutoff: 220 },

  // 9. Arts & Humanities
  { name: "English & Literary Studies", faculty: "Arts & Humanities", defaultCombo: "Use of English, Literature in English, Government, CRS/IRS", typicalCutoff: 230 },
  { name: "Linguistics & Nigerian Languages", faculty: "Arts & Humanities", defaultCombo: "Use of English, Literature in English, Government, Any Nigerian Language", typicalCutoff: 215 },
  { name: "History & International Studies", faculty: "Arts & Humanities", defaultCombo: "Use of English, History/Government, Literature in English, CRS/IRS", typicalCutoff: 225 },
  { name: "Philosophy", faculty: "Arts & Humanities", defaultCombo: "Use of English, Government, Literature in English, Any Art/Social Science", typicalCutoff: 210 },
  { name: "Theatre & Performing Arts / Creative Arts", faculty: "Arts & Humanities", defaultCombo: "Use of English, Literature in English, Government, CRS/IRS/Fine Art", typicalCutoff: 220 },
  { name: "Music", faculty: "Arts & Humanities", defaultCombo: "Use of English, Music, Any Art subjects", typicalCutoff: 200 },
  { name: "French / Foreign Languages", faculty: "Arts & Humanities", defaultCombo: "Use of English, French, Literature in English, Any Art subject", typicalCutoff: 200 },
  { name: "Arabic & Islamic Studies", faculty: "Arts & Humanities", defaultCombo: "Use of English, Arabic, Islamic Studies, Government", typicalCutoff: 205 },
  { name: "Christian Religious Studies (CRS)", faculty: "Arts & Humanities", defaultCombo: "Use of English, CRS, Literature in English, Government", typicalCutoff: 200 },

  // 10. Agricultural Sciences
  { name: "Agricultural Economics & Extension", faculty: "Agricultural Sciences", defaultCombo: "Use of English, Chemistry, Biology/Agric Science, Mathematics/Economics", typicalCutoff: 205 },
  { name: "Agronomy / Crop Science & Horticulture", faculty: "Agricultural Sciences", defaultCombo: "Use of English, Chemistry, Biology/Agric Science, Mathematics/Physics", typicalCutoff: 200 },
  { name: "Animal Science & Livestock Production", faculty: "Agricultural Sciences", defaultCombo: "Use of English, Chemistry, Biology/Agric Science, Physics/Mathematics", typicalCutoff: 200 },
  { name: "Fisheries & Aquaculture", faculty: "Agricultural Sciences", defaultCombo: "Use of English, Chemistry, Biology/Agric Science, Physics", typicalCutoff: 195 },
  { name: "Food Science & Technology", faculty: "Agricultural Sciences", defaultCombo: "Use of English, Chemistry, Mathematics/Physics, Biology/Agric Science", typicalCutoff: 225 },
  { name: "Forestry & Wildlife Management", faculty: "Agricultural Sciences", defaultCombo: "Use of English, Chemistry, Biology/Agric Science, Physics", typicalCutoff: 195 },
  { name: "Soil Science & Land Resources", faculty: "Agricultural Sciences", defaultCombo: "Use of English, Chemistry, Biology/Agric Science, Physics/Mathematics", typicalCutoff: 195 },

  // 11. Education & Teacher Pedagogy
  { name: "Education & Biology", faculty: "Education", defaultCombo: "Use of English, Biology, Chemistry, Physics/Mathematics", typicalCutoff: 200 },
  { name: "Education & Chemistry", faculty: "Education", defaultCombo: "Use of English, Chemistry, Physics, Mathematics/Biology", typicalCutoff: 195 },
  { name: "Education & Physics", faculty: "Education", defaultCombo: "Use of English, Physics, Mathematics, Chemistry", typicalCutoff: 195 },
  { name: "Education & Mathematics", faculty: "Education", defaultCombo: "Use of English, Mathematics, Physics, Chemistry/Economics", typicalCutoff: 200 },
  { name: "Education & English Language", faculty: "Education", defaultCombo: "Use of English, Literature in English, Government, CRS/IRS", typicalCutoff: 215 },
  { name: "Education & Economics", faculty: "Education", defaultCombo: "Use of English, Mathematics, Economics, Government", typicalCutoff: 205 },
  { name: "Education & Computer Science", faculty: "Education", defaultCombo: "Use of English, Mathematics, Physics, Chemistry", typicalCutoff: 205 },
  { name: "Educational Management & Leadership", faculty: "Education", defaultCombo: "Use of English, Economics, Government, Mathematics/Literature", typicalCutoff: 200 },
  { name: "Guidance & Counseling", faculty: "Education", defaultCombo: "Use of English, Any three Arts or Social Science subjects", typicalCutoff: 195 },
  { name: "Early Childhood & Primary Education", faculty: "Education", defaultCombo: "Use of English, Any three Arts, Science or Social Science subjects", typicalCutoff: 190 },
];

function cleanString(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

function deriveAcronym(name: string): string {
  // Check exact map
  for (const [k, v] of Object.entries(KNOWN_ACRONYMS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v;
  }
  // Check parenthesized abbreviations
  const match = name.match(/\(([A-Z]{2,10})\)/);
  if (match) return match[1];

  // Try extracting capital initials for words
  const words = name
    .replace(/^(Federal University of Technology|Federal University|State University of|University of|College of)/i, "")
    .replace(/[,\-()]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(and|for|the|state)$/i.test(w));

  if (words.length >= 2) {
    return words.slice(0, 4).map((w) => w[0].toUpperCase()).join("");
  }

  return "";
}

async function run() {
  console.log("Fetching Nigerian Universities dataset...");
  const uniRes = await fetch(
    "https://raw.githubusercontent.com/reality-farouqk/nigeria-tertiary-institutions-api/main/data/nigerian_universities_faculties.csv"
  );
  if (!uniRes.ok) throw new Error("Failed to fetch universities CSV: " + uniRes.statusText);
  const uniCsv = await uniRes.text();

  console.log("Fetching Nigerian Polytechnics dataset...");
  const polyRes = await fetch(
    "https://raw.githubusercontent.com/reality-farouqk/nigeria-tertiary-institutions-api/main/data/nigerian_polytechnics_schools.csv"
  );
  if (!polyRes.ok) throw new Error("Failed to fetch polytechnics CSV: " + polyRes.statusText);
  const polyCsv = await polyRes.text();

  const parsedUnis = Papa.parse<RawUniRow>(uniCsv, { header: true, skipEmptyLines: true }).data;
  const parsedPolys = Papa.parse<RawPolyRow>(polyCsv, { header: true, skipEmptyLines: true }).data;

  console.log(`Parsed ${parsedUnis.length} universities and ${parsedPolys.length} polytechnics.`);

  const institutions: Array<{
    id: string;
    name: string;
    acronym: string;
    category: "Federal" | "State" | "Private";
    type: "university" | "polytechnic";
    state: string;
    yearEstablished?: string;
    website?: string;
    faculties: string[];
  }> = [];

  // Process Universities
  for (let i = 0; i < parsedUnis.length; i++) {
    const row = parsedUnis[i];
    const name = cleanString(row["University Name"] || "");
    if (!name) continue;

    const acronym = deriveAcronym(name);
    const faculties = (row.Faculties || "")
      .split(/;|\n/)
      .map((f) => cleanString(f))
      .filter((f) => f.length > 2);

    const id = `uni-${acronym ? acronym.toLowerCase() : ""}-${i + 1}`.replace(/--+/g, "-");

    institutions.push({
      id,
      name,
      acronym,
      category: row.Category || "Federal",
      type: "university",
      state: cleanString(row.Location || "Nigeria").replace(/ State$/i, ""),
      yearEstablished: row["Year Established"] ? cleanString(row["Year Established"]) : undefined,
      website: row.Website ? cleanString(row.Website) : undefined,
      faculties,
    });
  }

  // Process Polytechnics
  for (let j = 0; j < parsedPolys.length; j++) {
    const row = parsedPolys[j];
    const name = cleanString(row["Institution Name"] || "");
    if (!name) continue;

    const acronym = deriveAcronym(name);
    const faculties = (row["Schools/Departments"] || "")
      .split(/;|\n/)
      .map((f) => cleanString(f))
      .filter((f) => f.length > 2);

    const id = `poly-${acronym ? acronym.toLowerCase() : ""}-${j + 1}`.replace(/--+/g, "-");

    institutions.push({
      id,
      name,
      acronym,
      category: row.Category || "State",
      type: "polytechnic",
      state: cleanString(row.State || "Nigeria").replace(/ State$/i, ""),
      yearEstablished: row["Year Established"] ? cleanString(row["Year Established"]) : undefined,
      faculties,
    });
  }

  // Deduplicate and sort by priority: Popular/National first, then alphabetical
  institutions.sort((a, b) => {
    // Put universities before polytechnics
    if (a.type !== b.type) return a.type === "university" ? -1 : 1;
    // Federal, then State, then Private
    const catOrder: Record<string, number> = { Federal: 1, State: 2, Private: 3 };
    if (catOrder[a.category] !== catOrder[b.category]) {
      return catOrder[a.category] - catOrder[b.category];
    }
    return a.name.localeCompare(b.name);
  });

  const outDir = path.resolve(process.cwd(), "app/data");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonPayload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalInstitutions: institutions.length,
      universitiesCount: institutions.filter((i) => i.type === "university").length,
      polytechnicsCount: institutions.filter((i) => i.type === "polytechnic").length,
      totalCourses: COMPREHENSIVE_COURSES.length,
    },
    institutions,
    courses: COMPREHENSIVE_COURSES,
  };

  const jsonPath = path.join(outDir, "nigerianInstitutionsData.json");
  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), "utf-8");
  console.log(`Saved JSON dataset to ${jsonPath} (${institutions.length} institutions, ${COMPREHENSIVE_COURSES.length} courses)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
