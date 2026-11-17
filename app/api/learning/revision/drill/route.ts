import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest } from "../../../../lib/supabaseServer";
import { getAIPlatformConfig } from "../../../../lib/platformConfig";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diagnostics generate five complete questions plus worked solutions. Keep this
// allowance independent of the much smaller general chat response setting.
const DIAGNOSTIC_MAX_OUTPUT_TOKENS = 7000;
const DIAGNOSTIC_TIMEOUT_MS = 55_000;

export interface RevisionDrillQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "Easy" | "Medium" | "Challenging";
}

export interface RevisionDrillPayload {
  id: string;
  subject: string;
  topic: string;
  examType: string;
  diagnosticSummary: string;
  keyFormulasOrRules: Array<{ rule: string; explanation: string }>;
  commonTraps: string[];
  questions: RevisionDrillQuestion[];
}

// Built-in fallback drills covering core Nigerian exam topics when external AI is offline or unconfigured
const FALLBACK_DRILLS: Record<string, RevisionDrillPayload> = {
  mathematics: {
    id: "drill-math-quad",
    subject: "Mathematics",
    topic: "Quadratic Equations & Nature of Roots",
    examType: "JAMB UTME",
    diagnosticSummary:
      "JAMB candidates frequently lose marks on determining discriminant conditions (Δ = b² - 4ac) for equal or real roots and sign errors during quadratic substitution.",
    keyFormulasOrRules: [
      {
        rule: "x = [-b ± √(b² - 4ac)] / (2a)",
        explanation: "General quadratic formula for ax² + bx + c = 0.",
      },
      {
        rule: "Discriminant Δ = b² - 4ac",
        explanation: "Δ > 0: two real distinct roots; Δ = 0: two equal real roots; Δ < 0: no real roots.",
      },
      {
        rule: "Sum = -b/a, Product = c/a",
        explanation: "Relationships between roots α, β and quadratic coefficients.",
      },
    ],
    commonTraps: [
      "Dividing only the radical term by 2a instead of the entire numerator (-b ± √Δ).",
      "Confusing 'equal roots' (Δ = 0) with 'positive roots' (Δ > 0, -b/a > 0).",
      "Sign errors when b is negative (e.g. -(-4) = +4).",
    ],
    questions: [
      {
        id: "m1",
        question: "If the quadratic equation 2x² - 8x + k = 0 has equal real roots, find the value of k.",
        options: {
          A: "4",
          B: "8",
          C: "16",
          D: "2",
        },
        correctAnswer: "B",
        explanation:
          "For equal real roots, the discriminant Δ = b² - 4ac must equal 0. Here a = 2, b = -8, c = k. Hence (-8)² - 4(2)(k) = 0 => 64 - 8k = 0 => 8k = 64 => k = 8.",
        difficulty: "Medium",
      },
      {
        id: "m2",
        question: "Find the sum and product of the roots of 3x² + 9x - 12 = 0.",
        options: {
          A: "Sum = -3, Product = -4",
          B: "Sum = 3, Product = 4",
          C: "Sum = -3, Product = 4",
          D: "Sum = 9, Product = -12",
        },
        correctAnswer: "A",
        explanation:
          "For ax² + bx + c = 0: Sum of roots α + β = -b/a = -9/3 = -3. Product of roots αβ = c/a = -12/3 = -4.",
        difficulty: "Easy",
      },
      {
        id: "m3",
        question: "If α and β are roots of x² - 5x + 6 = 0, evaluate α² + β².",
        options: {
          A: "25",
          B: "13",
          C: "37",
          D: "19",
        },
        correctAnswer: "B",
        explanation:
          "From the equation, α + β = 5 and αβ = 6. Use the identity α² + β² = (α + β)² - 2αβ = (5)² - 2(6) = 25 - 12 = 13.",
        difficulty: "Medium",
      },
      {
        id: "m4",
        question: "For what range of values of p does the equation x² + px + 9 = 0 have distinct real roots?",
        options: {
          A: "-6 < p < 6",
          B: "p > 6 or p < -6",
          C: "p ≥ 6",
          D: "p = ±6",
        },
        correctAnswer: "B",
        explanation:
          "For distinct real roots, Δ = b² - 4ac > 0. Here p² - 4(1)(9) > 0 => p² - 36 > 0 => (p - 6)(p + 6) > 0. Therefore p > 6 or p < -6.",
        difficulty: "Challenging",
      },
      {
        id: "m5",
        question: "Form the quadratic equation whose roots are 1/2 and -3.",
        options: {
          A: "2x² + 5x - 3 = 0",
          B: "2x² - 5x - 3 = 0",
          C: "2x² + 5x + 3 = 0",
          D: "x² - 2.5x - 1.5 = 0",
        },
        correctAnswer: "A",
        explanation:
          "The equation is x² - (sum)x + product = 0. Sum = 1/2 + (-3) = -5/2. Product = 1/2 * (-3) = -3/2. Equation: x² - (-5/2)x + (-3/2) = 0 => x² + 5x/2 - 3/2 = 0. Multiply throughout by 2: 2x² + 5x - 3 = 0.",
        difficulty: "Medium",
      },
    ],
  },
  physics: {
    id: "drill-phy-optics",
    subject: "Physics",
    topic: "Geometrical Optics & Refraction",
    examType: "JAMB UTME",
    diagnosticSummary:
      "Optics questions in UTME heavily test critical angle, total internal reflection conditions, and sign convention for curved mirrors and lenses.",
    keyFormulasOrRules: [
      {
        rule: "1/f = 1/u + 1/v",
        explanation: "Mirror and lens formula (use real-is-positive convention).",
      },
      {
        rule: "n = sin i / sin r = 1 / sin C",
        explanation: "Snell's law and critical angle C relation for light leaving dense medium into air.",
      },
      {
        rule: "m = v / u = h_i / h_o",
        explanation: "Linear magnification formula.",
      },
    ],
    commonTraps: [
      "Inverting the critical angle formula: n is always ≥ 1, so sin C = 1/n.",
      "Assigning wrong focal length signs: Convex mirror f is negative, Concave lens f is negative.",
      "Confusing real inverted images with virtual erect images.",
    ],
    questions: [
      {
        id: "p1",
        question: "A ray of light traveling in glass of refractive index 1.5 strikes an air interface. Calculate the critical angle.",
        options: {
          A: "41.8°",
          B: "48.6°",
          C: "30.0°",
          D: "60.0°",
        },
        correctAnswer: "A",
        explanation:
          "From sin C = 1/n, sin C = 1 / 1.5 = 0.6667. Taking the inverse sine, C = sin⁻¹(0.6667) ≈ 41.8°.",
        difficulty: "Easy",
      },
      {
        id: "p2",
        question: "An object is placed 20 cm in front of a concave mirror of focal length 15 cm. Find the image distance and nature.",
        options: {
          A: "60 cm, real and inverted",
          B: "30 cm, virtual and erect",
          C: "8.57 cm, real and diminished",
          D: "60 cm, virtual and erect",
        },
        correctAnswer: "A",
        explanation:
          "Using 1/f = 1/u + 1/v with concave mirror f = +15 cm and u = +20 cm: 1/15 = 1/20 + 1/v => 1/v = 1/15 - 1/20 = (4 - 3)/60 = 1/60. Hence v = +60 cm. Since v > 0, the image is real and inverted.",
        difficulty: "Medium",
      },
      {
        id: "p3",
        question: "Which of the following conditions is necessary for total internal reflection to occur?",
        options: {
          A: "Light must travel from an optically denser to an optically less dense medium and angle of incidence must exceed critical angle.",
          B: "Light must travel from air into glass at any angle of incidence.",
          C: "Angle of incidence must equal angle of refraction.",
          D: "Light must be monochromatic and normal to the boundary.",
        },
        correctAnswer: "A",
        explanation:
          "Total internal reflection occurs only when: (1) Light travels from denser to less dense medium, and (2) The angle of incidence in the denser medium exceeds the critical angle.",
        difficulty: "Easy",
      },
      {
        id: "p4",
        question: "A converging lens has a focal length of 10 cm. If an object is placed 5 cm from the optical centre, the magnification produced is:",
        options: {
          A: "2.0",
          B: "0.5",
          C: "1.5",
          D: "3.0",
        },
        correctAnswer: "A",
        explanation:
          "Using 1/f = 1/u + 1/v: 1/10 = 1/5 + 1/v => 1/v = 1/10 - 2/10 = -1/10 => v = -10 cm (virtual). Magnification m = |v| / u = 10 / 5 = 2.0.",
        difficulty: "Medium",
      },
      {
        id: "p5",
        question: "A swimming pool appears 1.8 m deep when viewed normally from above. If the refractive index of water is 4/3, what is its actual depth?",
        options: {
          A: "2.4 m",
          B: "1.35 m",
          C: "2.0 m",
          D: "3.2 m",
        },
        correctAnswer: "A",
        explanation:
          "Refractive index n = Real depth / Apparent depth. Therefore, Real depth = n * Apparent depth = (4/3) * 1.8 m = 2.4 m.",
        difficulty: "Medium",
      },
    ],
  },
  chemistry: {
    id: "drill-chem-stoich",
    subject: "Chemistry",
    topic: "Stoichiometry & Gas Laws",
    examType: "JAMB UTME",
    diagnosticSummary:
      "Stoichiometry calculations in UTME test molar volume at s.t.p. (22.4 dm³), mole ratios from balanced equations, and percentage yield.",
    keyFormulasOrRules: [
      {
        rule: "Moles = Mass (g) / Molar Mass (g/mol)",
        explanation: "Fundamental relationship between mass and mole quantity.",
      },
      {
        rule: "Volume at s.t.p. = Moles × 22.4 dm³",
        explanation: "Molar volume of any ideal gas at standard temperature and pressure (273 K, 1 atm).",
      },
      {
        rule: "Concentration (mol/dm³) = Moles / Volume (dm³)",
        explanation: "Molarity formula for solution reactions.",
      },
    ],
    commonTraps: [
      "Forgetting to balance chemical equations before deriving mole ratios.",
      "Using cm³ instead of converting to dm³ (1 dm³ = 1000 cm³).",
      "Using atomic mass instead of diatomic mass for gases like O₂ (32 g/mol) and N₂ (28 g/mol).",
    ],
    questions: [
      {
        id: "c1",
        question: "What volume of oxygen gas at s.t.p. is required for the complete combustion of 4.4 g of propane (C₃H₈)? [C=12, H=1, O=16, Molar volume at s.t.p. = 22.4 dm³]",
        options: {
          A: "11.2 dm³",
          B: "2.24 dm³",
          C: "5.6 dm³",
          D: "22.4 dm³",
        },
        correctAnswer: "A",
        explanation:
          "Balanced equation: C₃H₈ + 5O₂ → 3CO₂ + 4H₂O. Molar mass of C₃H₈ = (3*12) + (8*1) = 44 g/mol. Moles of C₃H₈ = 4.4 / 44 = 0.1 mol. From mole ratio, moles of O₂ needed = 5 * 0.1 = 0.5 mol. Volume of O₂ at s.t.p. = 0.5 * 22.4 dm³ = 11.2 dm³.",
        difficulty: "Medium",
      },
      {
        id: "c2",
        question: "How many moles of hydrogen ions are present in 250 cm³ of 0.2 mol/dm³ tetraoxosulphate(VI) acid (H₂SO₄)?",
        options: {
          A: "0.10 mol",
          B: "0.05 mol",
          C: "0.20 mol",
          D: "0.025 mol",
        },
        correctAnswer: "A",
        explanation:
          "Moles of H₂SO₄ = Concentration * Volume (dm³) = 0.2 * (250/1000) = 0.2 * 0.25 = 0.05 mol. Since H₂SO₄ is a diprotic acid (H₂SO₄ → 2H⁺ + SO₄²⁻), moles of H⁺ = 2 * 0.05 = 0.10 mol.",
        difficulty: "Medium",
      },
      {
        id: "c3",
        question: "Calculate the percentage by mass of nitrogen in ammonium trioxonitrate(V), NH₄NO₃. [N=14, H=1, O=16]",
        options: {
          A: "35.0%",
          B: "17.5%",
          C: "28.0%",
          D: "42.5%",
        },
        correctAnswer: "A",
        explanation:
          "Molar mass of NH₄NO₃ = (2 * 14) + (4 * 1) + (3 * 16) = 28 + 4 + 48 = 80 g/mol. Mass of Nitrogen = 2 * 14 = 28 g. % N = (28 / 80) * 100% = 35.0%.",
        difficulty: "Easy",
      },
      {
        id: "c4",
        question: "At constant temperature, the volume of a gas decreases from 600 cm³ to 200 cm³. If the initial pressure was 1.2 atm, what is the final pressure?",
        options: {
          A: "3.6 atm",
          B: "0.4 atm",
          C: "2.4 atm",
          D: "1.8 atm",
        },
        correctAnswer: "A",
        explanation:
          "According to Boyle's law (P₁V₁ = P₂V₂): 1.2 * 600 = P₂ * 200 => 720 = 200 P₂ => P₂ = 720 / 200 = 3.6 atm.",
        difficulty: "Easy",
      },
      {
        id: "c5",
        question: "What mass of copper is deposited at the cathode when a current of 2.0 A is passed through aqueous CuSO₄ for 1930 seconds? [Cu = 64, 1 Faraday = 96500 C]",
        options: {
          A: "1.28 g",
          B: "2.56 g",
          C: "0.64 g",
          D: "3.84 g",
        },
        correctAnswer: "A",
        explanation:
          "Quantity Q = I * t = 2.0 * 1930 = 3860 C. Cathode reaction: Cu²⁺ + 2e⁻ → Cu. 2 Faradays (2 * 96500 = 193,000 C) deposits 1 mole of Cu (64 g). Mass deposited m = (Q * Molar Mass) / (n * F) = (3860 * 64) / (2 * 96500) = 247040 / 193000 = 1.28 g.",
        difficulty: "Challenging",
      },
    ],
  },
  biology: {
    id: "drill-bio-genetics",
    subject: "Biology",
    topic: "Genetics & Inheritance Patterns",
    examType: "JAMB UTME",
    diagnosticSummary:
      "UTME candidates stumble frequently on sex-linked inheritance (haemophilia, colour blindness), ABO blood group genotypes, and Mendelian monohybrid crosses.",
    keyFormulasOrRules: [
      {
        rule: "Monohybrid F2 phenotypic ratio: 3:1",
        explanation: "Ratio when two heterozygous individuals (Aa × Aa) are crossed.",
      },
      {
        rule: "Sex-linked traits on X chromosome",
        explanation: "Males (XY) express recessive allele immediately; females (XX) require homozygous recessive to express.",
      },
      {
        rule: "Codominance in ABO blood grouping",
        explanation: "Alleles I^A and I^B are codominant with each other and dominant over recessive i.",
      },
    ],
    commonTraps: [
      "Assuming a father can pass a sex-linked condition like haemophilia to his son (fathers only pass Y to sons).",
      "Confusing heterozygous Blood Group A (I^A i) with homozygous Blood Group A (I^A I^A).",
      "Confusing phenotype (observable traits) with genotype (genetic makeup).",
    ],
    questions: [
      {
        id: "b1",
        question: "A man of blood group A (heterozygous) marries a woman of blood group B (heterozygous). Which blood groups are possible in their offspring?",
        options: {
          A: "A, B, AB, and O",
          B: "AB only",
          C: "A and B only",
          D: "AB and O only",
        },
        correctAnswer: "A",
        explanation:
          "Father genotype is I^A i; mother genotype is I^B i. Gametes cross: I^A I^B (AB), I^A i (A), I^B i (B), and i i (O). All four ABO blood groups are possible with equal 25% probability.",
        difficulty: "Medium",
      },
      {
        id: "b2",
        question: "A colour-blind man marries a woman with normal vision whose father was colour-blind. What percentage of their male children are expected to be colour-blind?",
        options: {
          A: "50%",
          B: "25%",
          C: "100%",
          D: "0%",
        },
        correctAnswer: "A",
        explanation:
          "The woman must be a carrier (X^C X^c) because her father was colour-blind (X^c Y). The man is colour-blind (X^c Y). Male offspring inherit the mother's X chromosome and father's Y. The mother has a 50% chance of passing X^c (colour-blind) and 50% chance of passing X^C (normal). Therefore, 50% of the sons will be colour-blind.",
        difficulty: "Challenging",
      },
      {
        id: "b3",
        question: "In pea plants, tallness (T) is dominant over dwarfness (t). A cross between a tall plant and a dwarf plant produces 50% tall and 50% dwarf offspring. The genotype of the tall parent is:",
        options: {
          A: "Tt (heterozygous)",
          B: "TT (homozygous dominant)",
          C: "tt (homozygous recessive)",
          D: "TT or Tt",
        },
        correctAnswer: "A",
        explanation:
          "This is a test cross. The dwarf parent is tt. For 50% of offspring to be dwarf (tt), the tall parent must contribute a recessive 't' allele. Hence the tall parent is heterozygous Tt.",
        difficulty: "Easy",
      },
      {
        id: "b4",
        question: "Which of the following cellular processes produces genetically identical diploid daughter cells?",
        options: {
          A: "Mitosis",
          B: "Meiosis I",
          C: "Meiosis II",
          D: "Fertilization",
        },
        correctAnswer: "A",
        explanation:
          "Mitosis results in two genetically identical diploid (2n) somatic daughter cells. Meiosis produces four haploid (n) genetically varied gametes.",
        difficulty: "Easy",
      },
      {
        id: "b5",
        question: "Sickle cell anaemia is inherited as an autosomal recessive trait. Two carrier parents (HbA HbS) have a child. What is the probability that the child has sickle cell disease (HbS HbS)?",
        options: {
          A: "25% (1 in 4)",
          B: "50% (2 in 4)",
          C: "75% (3 in 4)",
          D: "0%",
        },
        correctAnswer: "A",
        explanation:
          "Cross between HbA HbS × HbA HbS yields: 1 HbA HbA (normal, 25%), 2 HbA HbS (carrier, 50%), and 1 HbS HbS (sickle cell disease, 25%). The probability is 1 in 4 or 25%.",
        difficulty: "Medium",
      },
    ],
  },
};

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const subjectRaw = typeof body.subject === "string" ? body.subject.trim() : "Mathematics";
    const topicRaw = typeof body.topic === "string" ? body.topic.trim() : "";
    const examTypeRaw = typeof body.examType === "string" ? body.examType.trim() : "JAMB UTME";
    const weaknessNote = typeof body.weaknessNote === "string" ? body.weaknessNote.trim() : "";

    const subjectNormalized = subjectRaw.toLowerCase();

    // Check if external AI provider is configured
    const groqKey = process.env.GROQ_API_KEY || process.env.GROQAPIKEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY;
    const aiConfig = await getAIPlatformConfig().catch(() => null);

    const hasAI = Boolean(groqKey || geminiKey);

    if (hasAI) {
      try {
        const systemPrompt = `You are BrainLab Academy's Senior UTME/WASSCE Subject Specialist and Chief Examiner.
Your objective is to generate an authentic, high-yield diagnostic 5-question revision drill for a Nigerian secondary/pre-university candidate preparing for ${examTypeRaw}.
Subject: "${subjectRaw}".
Topic: "${topicRaw || "Core High-Frequency Syllabus Topic"}".
${weaknessNote ? `Student Weakness Context: "${weaknessNote}". Focus specifically on resolving this difficulty.` : ""}

IMPORTANT: You MUST respond ONLY with a single valid JSON object, without markdown formatting or code fences.
The JSON must follow this exact schema:
{
  "subject": "${subjectRaw}",
  "topic": "Specific Topic Name",
  "examType": "${examTypeRaw}",
  "diagnosticSummary": "2-3 sentences explaining why this topic is essential and where students commonly lose marks.",
  "keyFormulasOrRules": [
    { "rule": "Formula or fundamental principle", "explanation": "Brief clear context and when to use it." },
    { "rule": "Formula or rule 2", "explanation": "Brief context." }
  ],
  "commonTraps": [
    "Trap 1: frequent misconception in past questions",
    "Trap 2: calculation or reading pitfall"
  ],
  "questions": [
    {
      "id": "q1",
      "question": "Clear, syllabus-accurate multiple choice question with numerical values or authentic scenarios.",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Detailed step-by-step worked solution explaining the logic and why distractors fail.",
      "difficulty": "Medium"
    }
    // Must contain exactly 5 questions (q1 to q5) with difficulty balanced across Easy, Medium, and Challenging.
  ]
}`;

        const userMessage = `Generate the 5-question high-yield revision drill for Subject: ${subjectRaw}, Topic: ${topicRaw || "Core Topics"}.`;

        let rawOutput = "";
        const preferredProvider = aiConfig?.provider === "gemini" && geminiKey ? "gemini" : groqKey ? "groq" : "gemini";

        if (preferredProvider === "groq" && groqKey) {
          const model = aiConfig?.groq_model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
              temperature: 0.2,
              max_tokens: DIAGNOSTIC_MAX_OUTPUT_TOKENS,
            }),
            signal: AbortSignal.timeout(DIAGNOSTIC_TIMEOUT_MS),
          });
          if (res.ok) {
            const data = await res.json();
            const choice = data.choices?.[0];
            if (choice?.finish_reason === "length") {
              throw new Error("Groq reached its output limit before completing the diagnostic.");
            }
            rawOutput = choice?.message?.content?.trim() || "";
          }
        } else if (geminiKey) {
          const model = aiConfig?.gemini_model || process.env.GEMINI_MODEL || "gemini-3-flash-preview";
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userMessage }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: DIAGNOSTIC_MAX_OUTPUT_TOKENS,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(20_000),
          });
          if (res.ok) {
            const data = await res.json();
            const candidate = data.candidates?.[0];
            if (candidate?.finishReason === "MAX_TOKENS") {
              throw new Error("Gemini reached its output limit before completing the diagnostic.");
            }
            rawOutput = candidate?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim() || "";
          }
        }

        if (rawOutput) {
          // Clean possible markdown code fences
          const cleaned = rawOutput.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
          const parsed = JSON.parse(cleaned) as RevisionDrillPayload;
          const isComplete =
            parsed &&
            typeof parsed.subject === "string" &&
            typeof parsed.topic === "string" &&
            typeof parsed.examType === "string" &&
            typeof parsed.diagnosticSummary === "string" &&
            parsed.diagnosticSummary.trim().length >= 40 &&
            Array.isArray(parsed.keyFormulasOrRules) &&
            parsed.keyFormulasOrRules.length >= 2 &&
            Array.isArray(parsed.commonTraps) &&
            parsed.commonTraps.length >= 2 &&
            Array.isArray(parsed.questions) &&
            parsed.questions.length === 5 &&
            parsed.questions.every((question) =>
              question &&
              typeof question.question === "string" &&
              question.question.trim().length > 10 &&
              question.options &&
              ["A", "B", "C", "D"].every((option) => typeof question.options[option] === "string" && question.options[option].trim().length > 0) &&
              ["A", "B", "C", "D"].includes(question.correctAnswer) &&
              typeof question.explanation === "string" &&
              question.explanation.trim().length >= 40
            );

          if (isComplete) {
            parsed.id = `drill-${Date.now()}`;
            return NextResponse.json({ ok: true, drill: parsed, generatedBy: "ai" });
          }
          throw new Error("The AI returned an incomplete diagnostic. A complete five-question report was not received.");
        }
      } catch (aiErr) {
        console.warn("[RevisionDrillAPI] AI generation failed, falling back to built-in curriculum drills:", aiErr);
      }
    }

    // High-yield syllabus fallback when AI is unavailable
    let fallback = FALLBACK_DRILLS[subjectNormalized];
    if (!fallback) {
      if (subjectNormalized.includes("math")) fallback = FALLBACK_DRILLS.mathematics;
      else if (subjectNormalized.includes("phys")) fallback = FALLBACK_DRILLS.physics;
      else if (subjectNormalized.includes("chem")) fallback = FALLBACK_DRILLS.chemistry;
      else if (subjectNormalized.includes("bio")) fallback = FALLBACK_DRILLS.biology;
      else fallback = FALLBACK_DRILLS.mathematics;
    }

    // Clone fallback to avoid mutating constant
    const drill: RevisionDrillPayload = JSON.parse(JSON.stringify(fallback));
    if (topicRaw && topicRaw !== drill.topic) {
      drill.topic = topicRaw;
    }
    drill.id = `drill-${Date.now()}`;

    return NextResponse.json({
      ok: true,
      drill,
      generatedBy: "curriculum_fallback",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
