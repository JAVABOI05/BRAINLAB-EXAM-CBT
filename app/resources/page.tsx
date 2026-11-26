"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { nudgeAcademicResources } from "../lib/proNudge";

interface ResourceCard {
  id: string;
  subject: "Mathematics" | "Physics" | "Chemistry" | "Biology" | "English";
  topic: string;
  title: string;
  description: string;
  formulaOrRule: string;
  examApplication: string;
  examWeight: string; // e.g. "High Frequency (10-15%)"
  tags: string[];
}

const RESOURCES_DATA: ResourceCard[] = [
  // Mathematics
  {
    id: "m-quad",
    subject: "Mathematics",
    topic: "Algebra & Polynomials",
    title: "Quadratic Formula & Nature of Roots",
    description: "Standard quadratic equation solution and discriminant analysis determining root characteristics.",
    formulaOrRule: "x = [-b ± √(b² - 4ac)] / 2a\nDiscriminant Δ = b² - 4ac\n• Δ > 0: Two real, distinct roots\n• Δ = 0: Two real, equal roots (perfect square)\n• Δ < 0: No real roots (complex conjugates)",
    examApplication: "Frequently tested when determining the value of an unknown constant k for equal roots (set b² - 4ac = 0).",
    examWeight: "High Frequency (8-10%)",
    tags: ["Algebra", "Roots", "Equations"],
  },
  {
    id: "m-apgp",
    subject: "Mathematics",
    topic: "Sequences & Series",
    title: "AP, GP & Sum to Infinity",
    description: "Formulas for nth term, finite sum of progression, and infinite convergent series.",
    formulaOrRule: "AP nth term: T_n = a + (n - 1)d\nAP Sum: S_n = n/2 · [2a + (n - 1)d]\nGP nth term: T_n = a · r^(n - 1)\nGP Sum: S_n = a(1 - r^n)/(1 - r)  (for |r| < 1)\nSum to Infinity: S_∞ = a / (1 - r)  (only when -1 < r < 1)",
    examApplication: "UTME frequently asks for the sum to infinity or finding the common ratio given two non-consecutive terms.",
    examWeight: "High Frequency (10-12%)",
    tags: ["Sequences", "Series", "Progressions"],
  },
  {
    id: "m-calc",
    subject: "Mathematics",
    topic: "Calculus",
    title: "Derivatives & Maxima / Minima",
    description: "Power rule, product rule, quotient rule, and turning points identification.",
    formulaOrRule: "Power Rule: d/dx(x^n) = n · x^(n - 1)\nChain Rule: dy/dx = (dy/du) · (du/dx)\nTurning Points: Set dy/dx = 0\n• Maximum if d²y/dx² < 0\n• Minimum if d²y/dx² > 0",
    examApplication: "Tested in rate-of-change word problems and finding coordinates of stationary turning points.",
    examWeight: "Essential (12-14%)",
    tags: ["Calculus", "Differentiation", "Extrema"],
  },
  {
    id: "m-log",
    subject: "Mathematics",
    topic: "Indices & Logarithms",
    title: "Fundamental Laws of Logarithms",
    description: "Multiplication, division, power, and change of base rules.",
    formulaOrRule: "log_b(xy) = log_b(x) + log_b(y)\nlog_b(x/y) = log_b(x) - log_b(y)\nlog_b(x^k) = k · log_b(x)\nChange of base: log_b(a) = log_c(a) / log_c(b)\nlog_b(b) = 1, log_b(1) = 0",
    examApplication: "Commonly tested using known values such as log 2 = 0.3010 and log 3 = 0.4771 to calculate log 18, log 72, etc.",
    examWeight: "High Frequency (8-10%)",
    tags: ["Logarithms", "Indices", "Algebra"],
  },

  // Physics
  {
    id: "p-motion",
    subject: "Physics",
    topic: "Mechanics",
    title: "Linear Equations of Uniform Motion",
    description: "Kinematics equations for uniformly accelerated straight-line and vertical motion under gravity.",
    formulaOrRule: "1) v = u + at\n2) s = ut + ½at²\n3) v² = u² + 2as\n4) s = [(u + v)/2] · t\n(For vertical motion under gravity, replace a with g = 9.8 or 10 m/s²)",
    examApplication: "Directly applied in projectile motion vertical components and vehicle braking distance calculations.",
    examWeight: "Core (15-18%)",
    tags: ["Mechanics", "Kinematics", "Motion"],
  },
  {
    id: "p-ohm",
    subject: "Physics",
    topic: "Electricity & Magnetism",
    title: "Ohm's Law, Resistivity & Electrical Power",
    description: "Potential difference, series/parallel circuit resistance, internal resistance, and electrical energy.",
    formulaOrRule: "V = I · R\nResistivity: R = ρL / A\nSeries: R_total = R₁ + R₂ + ...\nParallel: 1/R_total = 1/R₁ + 1/R₂ + ...\nTerminal voltage: V = E - Ir (where E = emf, r = internal resistance)\nPower: P = IV = I²R = V²/R",
    examApplication: "Calculations involving battery internal resistance when connected to external loads.",
    examWeight: "High Frequency (12-15%)",
    tags: ["Electricity", "Ohm", "Circuits"],
  },
  {
    id: "p-waves",
    subject: "Physics",
    topic: "Waves & Optics",
    title: "Wave Equation & Lens / Mirror Formula",
    description: "Wave velocity, frequency, wavelength, focal length, and optical magnification.",
    formulaOrRule: "Wave Speed: v = f · λ  (v = speed, f = frequency, λ = wavelength)\nPeriod: T = 1/f\nMirror & Lens Formula: 1/f = 1/u + 1/v\nMagnification: M = v/u = h_image / h_object\nRefractive Index: n = sin(i) / sin(r) = c / v",
    examApplication: "Real vs virtual image position calculations in concave/convex mirrors and converging lenses.",
    examWeight: "High Frequency (10-12%)",
    tags: ["Waves", "Optics", "Light"],
  },

  // Chemistry
  {
    id: "c-gas",
    subject: "Chemistry",
    topic: "Physical Chemistry",
    title: "Gas Laws & Molar Volume at S.T.P.",
    description: "Boyle's, Charles's, General Gas Law, and Avogadro's constant calculations.",
    formulaOrRule: "General Gas Law: (P₁V₁) / T₁ = (P₂V₂) / T₂  (T in Kelvin! K = °C + 273)\nIdeal Gas: PV = nRT  (R = 8.314 J/(mol·K) or 0.0821 L·atm/(mol·K))\nMoles: n = mass / molar_mass = Volume(dm³) / 22.4 dm³ (at s.t.p.)\nNumber of particles = n · N_A  (N_A = 6.02 × 10²³)",
    examApplication: "Stoichiometry of liberated gases when metals react with acids (e.g. 2.4g Mg + 2HCl → MgCl₂ + H₂).",
    examWeight: "Core (14-16%)",
    tags: ["Gases", "Stoichiometry", "Physical"],
  },
  {
    id: "c-redox",
    subject: "Chemistry",
    topic: "Electrochemistry",
    title: "Faraday's Laws of Electrolysis",
    description: "Quantitative electrolysis, mass deposited, electric charge, and oxidation states.",
    formulaOrRule: "First Law: m = Z · I · t  (m = mass in g, I = current in A, t = time in s)\nQuantity of Charge: Q = I · t\nFaraday Equivalent: 1 Faraday = 96,500 Coulombs = 1 mole of electrons\nm = (Molar_mass · I · t) / (n · 96500)  [where n = valence/electrons transferred]",
    examApplication: "Finding mass of copper or silver deposited at the cathode during electroplating.",
    examWeight: "High Frequency (10-12%)",
    tags: ["Electrochemistry", "Faraday", "Electrolysis"],
  },
  {
    id: "c-organic",
    subject: "Chemistry",
    topic: "Organic Chemistry",
    title: "Homologous Series & Functional Groups",
    description: "General formulas for hydrocarbons, alcohols, alkanoic acids, esters, and IUPAC nomenclature.",
    formulaOrRule: "Alkanes: C_n H_(2n+2)  (single bonds, substitution)\nAlkenes: C_n H_(2n)  (double bond, addition reactions)\nAlkynes: C_n H_(2n-2)  (triple bond)\nAlkanols (Alcohols): C_n H_(2n+1)OH\nAlkanoic Acids: C_n H_(2n+1)COOH\nEsters: R-COO-R' (sweet fragrance, formed by esterification)",
    examApplication: "Distinguishing saturated vs unsaturated hydrocarbons using bromine water and acidified KMnO₄.",
    examWeight: "High Frequency (15-18%)",
    tags: ["Organic", "Hydrocarbons", "Functional Groups"],
  },

  // Biology
  {
    id: "b-genetics",
    subject: "Biology",
    topic: "Genetics & Heredity",
    title: "Mendelian Inheritance & Blood Grouping",
    description: "Monohybrid cross, Punnett squares, codominance, sex-linked traits, and ABO blood group alleles.",
    formulaOrRule: "Monohybrid Phenotypic Ratio: 3:1 (dominant : recessive in F₂)\nGenotypic Ratio: 1:2:1 (1 RR : 2 Rr : 1 rr)\nABO Blood Groups: Alleles I^A, I^B, I^O (I^A and I^B are codominant; I^O is recessive)\n• Type A: I^A I^A or I^A I^O\n• Type B: I^B I^B or I^B I^O\n• Type AB: I^A I^B (universal recipient)\n• Type O: I^O I^O (universal donor)\nRhesus factor: Rh+ is dominant over Rh-",
    examApplication: "Predicting the possible blood groups of offspring from parent genotypes or solving erythroblastosis fetalis scenarios.",
    examWeight: "Core (14-16%)",
    tags: ["Genetics", "Inheritance", "Blood Groups"],
  },
  {
    id: "b-respiration",
    subject: "Biology",
    topic: "Physiology",
    title: "Cellular Respiration & Photosynthesis",
    description: "Aerobic vs anaerobic respiration equations, ATP yield, and chloroplast light reactions.",
    formulaOrRule: "Aerobic Respiration: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36-38 ATP\nAnaerobic in Yeast: C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂ + 2 ATP\nAnaerobic in Muscles: C₆H₁₂O₆ → 2 Lactic Acid + 2 ATP\nPhotosynthesis: 6CO₂ + 6H₂O + sunlight → C₆H₁₂O₆ + 6O₂\n• Light Stage: Occurs in thylakoids (photolysis of water)\n• Dark Stage (Calvin Cycle): Occurs in stroma (carbon fixation)",
    examApplication: "Distinguishing glycolysis (cytoplasm) from Krebs cycle & electron transport chain (mitochondria).",
    examWeight: "High Frequency (12-14%)",
    tags: ["Respiration", "Photosynthesis", "Energy"],
  },

  // English Language
  {
    id: "e-concord",
    subject: "English",
    topic: "Grammar & Structure",
    title: "Subject-Verb Concord Master Rules",
    description: "Grammatical concord rules that appear on every UTME and WAEC objective paper.",
    formulaOrRule: "1) Rule of Proximity (Neither... nor / Either... or): Verb agrees with the subject closest to it.\n   Example: Neither the teacher nor the students WERE present.\n2) Accompaniment ('as well as', 'together with', 'in addition to'): Verb agrees with the FIRST subject.\n   Example: The captain, as well as his crew, WAS rescued.\n3) Indefinite Pronouns ('each', 'everyone', 'none', 'neither of'): Takes singular verbs.\n   Example: Each of the candidates HAS submitted his slip.\n4) Plural in form, singular in meaning: 'Mathematics', 'Economics', 'News' take singular verbs.",
    examApplication: "Directly determines answers in 5-8 questions on every official UTME English language exam.",
    examWeight: "Essential (15-20%)",
    tags: ["Grammar", "Concord", "English"],
  },
];

type SubjectFilter = "all" | "Mathematics" | "Physics" | "Chemistry" | "Biology" | "English";

export default function LearningResourcesPage() {
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    return RESOURCES_DATA.filter((item) => {
      const matchesSubject = selectedSubject === "all" || item.subject === selectedSubject;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.formulaOrRule.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      return matchesSubject && matchesSearch;
    });
  }, [selectedSubject, searchQuery]);

  const handleCopyFormula = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    void nudgeAcademicResources();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Header Breadcrumb & Title */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/dashboard" className="hover:text-blue-700 dark:hover:text-cyan-400">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-200">Learning Library</span>
              <span>/</span>
              <span className="text-blue-700 dark:text-cyan-400">Formula Sheets &amp; Guides</span>
            </nav>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white flex items-center gap-3">
              <span>Learning Resources</span>
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 px-3 py-0.5 text-xs font-bold text-blue-900 dark:text-cyan-300">
                HIGH-YIELD CHEAT SHEETS
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Curated formulas, scientific laws, grammatical concord rules, and syllabus blueprints for JAMB/UTME, WAEC, and NECO revision.
            </p>

            {/* Quick Academic Hub Navigation */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#012153] px-3 py-1 text-xs font-bold text-white shadow-xs">
                Formula Guides
              </span>
              <Link
                href="/syllabus"
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 transition"
              >
                Syllabus Explorer →
              </Link>
              <Link
                href="/resources/exam-calendar"
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 transition"
              >
                Exam Calendar &amp; Timetable →
              </Link>
              <Link
                href="/cbt"
                className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-bold text-blue-900 dark:text-cyan-300 hover:bg-blue-100 transition"
              >
                Sample CBT Practice →
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/challenge-arena"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950 shadow-sm transition active:scale-95"
            >
              Test in Arena (2× XP)
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Free Plan Entitlements Disclosure (Rule S7 & Prompt 10) */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-bold">
                <span className="mr-1.5 inline-block rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
                  FREE PLAN
                </span>
                BrainLab Free Learner Access
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Includes 1 full CBT practice examination per day, 50 AI study buddy hints per month, and unlimited access to the Syllabus Explorer and Formula Cheatsheets.
              </p>
            </div>
            <Link
              href="/pricing"
              className="whitespace-nowrap font-bold text-blue-700 hover:underline dark:text-cyan-400"
            >
              Compare Plans →
            </Link>
          </div>
        </div>

        {/* Search & Subject Tabs Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Subject Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Subjects" },
                { id: "Mathematics", label: "Mathematics" },
                { id: "Physics", label: "Physics" },
                { id: "Chemistry", label: "Chemistry" },
                { id: "Biology", label: "Biology" },
                { id: "English", label: "English Language" },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub.id as SubjectFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                    selectedSubject === sub.id
                      ? "bg-[#012153] text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Search Input */}
            <div className="relative min-w-[260px]">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </span>
              <input
                type="text"
                placeholder="Search formulas, laws, rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Showing {filteredResources.length} high-yield revision cards</span>
            {searchQuery && <span>Filter applied: &quot;{searchQuery}&quot;</span>}
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredResources.map((card) => {
            const isCopied = copiedId === card.id;
            return (
              <div
                key={card.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-blue-900 dark:text-cyan-300">
                      {card.subject} · {card.topic}
                    </span>
                    <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                      {card.examWeight}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                    {card.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>

                  {/* Formula / Rule Code Block */}
                  <div className="relative rounded-2xl bg-slate-950 text-slate-100 p-4 font-mono text-xs sm:text-sm leading-relaxed border border-slate-800">
                    <pre className="whitespace-pre-wrap font-mono">{card.formulaOrRule}</pre>
                    <button
                      onClick={() => handleCopyFormula(card.id, card.formulaOrRule)}
                      className="absolute top-2.5 right-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white transition active:scale-95 border border-slate-700"
                    >
                      {isCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  {/* Exam Application Note */}
                  <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-3 text-xs leading-relaxed text-blue-950 dark:text-blue-200">
                    <span className="font-bold text-blue-900 dark:text-cyan-300 mr-1">Exam Tip:</span>
                    <span>{card.examApplication}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((t) => (
                      <span key={t} className="text-[10px] text-slate-500 dark:text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/challenge-arena`}
                    className="font-bold text-blue-700 dark:text-cyan-400 hover:underline"
                  >
                    Practice Questions →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-r from-[#00112b] via-[#012153] to-indigo-950 p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              Interactive Self-Paced Practice
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              Put these formulas into action under exam timer conditions
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Choose your subjects and test your speed with randomized past questions in Self Practice or the 5-Minute Challenge Arena.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/self-practice"
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950 transition active:scale-95 shadow-sm"
            >
              Start Self Practice →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95"
            >
              Full CBT Exam
            </Link>
          </div>
        </div>
      </main>

          </div>
  );
}
