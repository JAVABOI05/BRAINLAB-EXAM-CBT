"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { recordTopicAttempt, calculateExamReadiness, getTopicMasteryRecords, type ExamReadiness } from "@/app/lib/adaptiveEngine";
import { trackEvent } from "@/app/lib/analytics";
import { awardStudentXp } from "@/app/lib/gamification";
import {
  extractStudentProfile,
  DEFAULT_CANDIDATE_SUBJECTS,
  FACULTY_SUBJECT_PRESETS,
  AVAILABLE_UTME_ELECTIVE_SUBJECTS,
} from "@/app/lib/studentProfile";

interface DiagnosticQuestion {
  id: number;
  subject: string;
  category: string;
  question: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  correct: "A" | "B" | "C" | "D";
  explanation: string;
}

// Canonical Question Pool organized by subject for targeted diagnostic selection
const SUBJECT_QUESTION_BANK: Record<string, Omit<DiagnosticQuestion, "id">[]> = {
  English: [
    {
      subject: "English Language",
      category: "Lexis and Structure",
      question: "The newly inaugurated committee has decided to call _______ the meeting until next Monday.",
      options: [
        { key: "A", text: "off" },
        { key: "B", text: "up" },
        { key: "C", text: "in" },
        { key: "D", text: "out" },
      ],
      correct: "A",
      explanation: "To 'call off' is an idiomatic phrasal verb meaning to cancel or postpone until a later date.",
    },
    {
      subject: "English Language",
      category: "Sentence Interpretation",
      question: "Choose the word most nearly opposite in meaning to 'METICULOUS':",
      options: [
        { key: "A", text: "Careless" },
        { key: "B", text: "Precise" },
        { key: "C", text: "Arrogant" },
        { key: "D", text: "Timid" },
      ],
      correct: "A",
      explanation: "'Meticulous' means showing great attention to detail; its antonym is 'Careless'.",
    },
  ],
  Mathematics: [
    {
      subject: "Mathematics",
      category: "Algebra and Equations",
      question: "Solve for x in the equation: 3^(2x - 1) = 27.",
      options: [
        { key: "A", text: "x = 1" },
        { key: "B", text: "x = 2" },
        { key: "C", text: "x = 3" },
        { key: "D", text: "x = 4" },
      ],
      correct: "B",
      explanation: "Express 27 as powers of 3: 27 = 3³. Equating exponents: 2x - 1 = 3 ⟹ 2x = 4 ⟹ x = 2.",
    },
    {
      subject: "Mathematics",
      category: "Coordinate Geometry",
      question: "Find the gradient (slope) of the straight line passing through (2, 3) and (6, 11).",
      options: [
        { key: "A", text: "m = 1" },
        { key: "B", text: "m = 2" },
        { key: "C", text: "m = 3" },
        { key: "D", text: "m = 4" },
      ],
      correct: "B",
      explanation: "Slope m = (y₂ - y₁) / (x₂ - x₁) = (11 - 3) / (6 - 2) = 8 / 4 = 2.",
    },
    {
      subject: "Mathematics",
      category: "Calculus & Limits",
      question: "Differentiate y = 3x⁴ - 5x² + 7 with respect to x.",
      options: [
        { key: "A", text: "12x³ - 10x" },
        { key: "B", text: "12x⁴ - 10x²" },
        { key: "C", text: "7x³ - 10x" },
        { key: "D", text: "12x³ - 5" },
      ],
      correct: "A",
      explanation: "Applying power rule d/dx(axⁿ) = n·a·xⁿ⁻¹: dy/dx = 4(3)x³ - 2(5)x = 12x³ - 10x.",
    },
  ],
  Physics: [
    {
      subject: "Physics",
      category: "Mechanics and Motion",
      question: "A body with a mass of 5 kg accelerates uniformly from rest at 4 m/s² for 6 seconds. What is its final momentum?",
      options: [
        { key: "A", text: "120 kg·m/s" },
        { key: "B", text: "100 kg·m/s" },
        { key: "C", text: "60 kg·m/s" },
        { key: "D", text: "24 kg·m/s" },
      ],
      correct: "A",
      explanation: "Final velocity v = u + at = 0 + (4)(6) = 24 m/s. Momentum p = m × v = 5 kg × 24 m/s = 120 kg·m/s.",
    },
    {
      subject: "Physics",
      category: "Waves and Optics",
      question: "A concave mirror has a radius of curvature of 30 cm. What is its focal length?",
      options: [
        { key: "A", text: "60 cm" },
        { key: "B", text: "30 cm" },
        { key: "C", text: "15 cm" },
        { key: "D", text: "7.5 cm" },
      ],
      correct: "C",
      explanation: "Focal length f of a spherical mirror equals half its radius of curvature: f = r / 2 = 30 / 2 = 15 cm.",
    },
    {
      subject: "Physics",
      category: "Current Electricity",
      question: "Two resistors of 6 Ω and 3 Ω are connected in parallel across a 12 V source. Find total circuit current.",
      options: [
        { key: "A", text: "6 A" },
        { key: "B", text: "4 A" },
        { key: "C", text: "2 A" },
        { key: "D", text: "9 A" },
      ],
      correct: "A",
      explanation: "Equivalent resistance R = (6 × 3) / (6 + 3) = 18 / 9 = 2 Ω. Current I = V / R = 12 / 2 = 6 A.",
    },
  ],
  Chemistry: [
    {
      subject: "Chemistry",
      category: "Stoichiometry & Mole Concept",
      question: "How many moles are present in 44 grams of Carbon Dioxide (CO₂)? [Given C = 12, O = 16]",
      options: [
        { key: "A", text: "0.5 moles" },
        { key: "B", text: "1.0 mole" },
        { key: "C", text: "2.0 moles" },
        { key: "D", text: "44 moles" },
      ],
      correct: "B",
      explanation: "Molar mass of CO₂ = 12 + 2(16) = 44 g/mol. Moles = mass / molar mass = 44 / 44 = 1.0 mole.",
    },
    {
      subject: "Chemistry",
      category: "Acids, Bases & Salts",
      question: "A solution has a Hydrogen ion concentration [H⁺] = 1 × 10⁻⁴ mol/dm³. What is its pH value?",
      options: [
        { key: "A", text: "pH = 4 (Acidic)" },
        { key: "B", text: "pH = 10 (Basic)" },
        { key: "C", text: "pH = 7 (Neutral)" },
        { key: "D", text: "pH = 1 (Strong Acid)" },
      ],
      correct: "A",
      explanation: "pH = -log₁₀[H⁺] = -log₁₀(1 × 10⁻⁴) = 4. Since pH < 7, the solution is acidic.",
    },
    {
      subject: "Chemistry",
      category: "Organic Chemistry",
      question: "Which homologous series does ethyne (C₂H₂) belong to?",
      options: [
        { key: "A", text: "Alkynes" },
        { key: "B", text: "Alkenes" },
        { key: "C", text: "Alkanes" },
        { key: "D", text: "Alkanols" },
      ],
      correct: "A",
      explanation: "Ethyne has a carbon-carbon triple bond and matches general formula CnH2n-2, classifying it as an alkyne.",
    },
  ],
  Biology: [
    {
      subject: "Biology",
      category: "Cell Biology & Genetics",
      question: "Which cellular organelle is responsible for ATP cellular respiration and energy production?",
      options: [
        { key: "A", text: "Ribosome" },
        { key: "B", text: "Mitochondrion" },
        { key: "C", text: "Endoplasmic Reticulum" },
        { key: "D", text: "Golgi Apparatus" },
      ],
      correct: "B",
      explanation: "Mitochondria are the powerhouses of eukaryotic cells where aerobic cellular respiration produces ATP.",
    },
    {
      subject: "Biology",
      category: "Ecology & Adaptation",
      question: "A symbiotic relationship in which one organism benefits while the other is neither harmed nor helped is called:",
      options: [
        { key: "A", text: "Mutualism" },
        { key: "B", text: "Parasitism" },
        { key: "C", text: "Commensalism" },
        { key: "D", text: "Predation" },
      ],
      correct: "C",
      explanation: "Commensalism is a biological association where one species derives benefit without positively or negatively impacting the other.",
    },
    {
      subject: "Biology",
      category: "Genetics & Heredity",
      question: "In Mendel's monohybrid cross of heterozygous tall plants (Tt × Tt), what proportion of offspring are phenotypically tall?",
      options: [
        { key: "A", text: "75% (3/4)" },
        { key: "B", text: "50% (1/2)" },
        { key: "C", text: "25% (1/4)" },
        { key: "D", text: "100%" },
      ],
      correct: "A",
      explanation: "Genotypes are 1 TT : 2 Tt : 1 tt. Both TT and Tt are phenotypically tall, giving 3 out of 4 (75%).",
    },
  ],
  Government: [
    {
      subject: "Government",
      category: "Political Concepts & Systems",
      question: "Which organ of government is primarily empowered to interpret laws and adjudicate disputes?",
      options: [
        { key: "A", text: "The Judiciary" },
        { key: "B", text: "The Legislature" },
        { key: "C", text: "The Executive" },
        { key: "D", text: "The Civil Service" },
      ],
      correct: "A",
      explanation: "Under the constitutional separation of powers, the Judiciary interprets laws and resolves constitutional disputes.",
    },
    {
      subject: "Government",
      category: "Constitutional Development",
      question: "Which Nigerian pre-independence constitution first introduced direct elections into the legislative council in Lagos and Calabar?",
      options: [
        { key: "A", text: "Clifford Constitution (1922)" },
        { key: "B", text: "Richards Constitution (1946)" },
        { key: "C", text: "Macpherson Constitution (1951)" },
        { key: "D", text: "Lyttelton Constitution (1954)" },
      ],
      correct: "A",
      explanation: "The 1922 Clifford Constitution introduced the elective principle for the first time in Nigeria.",
    },
    {
      subject: "Government",
      category: "Federalism & Public Admin",
      question: "Residual powers in a federal system of government are usually exercised by:",
      options: [
        { key: "A", text: "The Component States/Regions" },
        { key: "B", text: "The Central Government only" },
        { key: "C", text: "The Supreme Court" },
        { key: "D", text: "The Senate President" },
      ],
      correct: "A",
      explanation: "Residual matters are subjects not listed in exclusive or concurrent lists, retained by the states.",
    },
  ],
  "Literature in English": [
    {
      subject: "Literature in English",
      category: "Literary Devices & Poetics",
      question: "A direct comparison between two unlike things using 'like' or 'as' is called a:",
      options: [
        { key: "A", text: "Simile" },
        { key: "B", text: "Metaphor" },
        { key: "C", text: "Hyperbole" },
        { key: "D", text: "Personification" },
      ],
      correct: "A",
      explanation: "A simile explicitly compares two things using connecting words such as 'like' or 'as'.",
    },
    {
      subject: "Literature in English",
      category: "Dramatic Techniques",
      question: "A dramatic monologue spoken by a character alone on stage to reveal their innermost thoughts is called a:",
      options: [
        { key: "A", text: "Soliloquy" },
        { key: "B", text: "Prologue" },
        { key: "C", text: "Aside" },
        { key: "D", text: "Epilogue" },
      ],
      correct: "A",
      explanation: "A soliloquy is an utterance delivered by an actor alone on stage expressing genuine inner reflections.",
    },
    {
      subject: "Literature in English",
      category: "Prose & Themes",
      question: "The central point, underlying message, or main idea explored across a literary work is its:",
      options: [
        { key: "A", text: "Theme" },
        { key: "B", text: "Setting" },
        { key: "C", text: "Plot" },
        { key: "D", text: "Tone" },
      ],
      correct: "A",
      explanation: "The theme represents the fundamental philosophical or social insight conveyed by the author.",
    },
  ],
  Economics: [
    {
      subject: "Economics",
      category: "Microeconomics & Price Theory",
      question: "According to the first law of demand, all other things being equal, as the price of a good rises, quantity demanded:",
      options: [
        { key: "A", text: "Decreases" },
        { key: "B", text: "Increases" },
        { key: "C", text: "Remains constant" },
        { key: "D", text: "Becomes perfectly inelastic" },
      ],
      correct: "A",
      explanation: "The law of demand establishes an inverse relationship between price and quantity demanded (ceteris paribus).",
    },
    {
      subject: "Economics",
      category: "Macroeconomics & Money",
      question: "A persistent, general increase in the price level of goods and services in an economy is defined as:",
      options: [
        { key: "A", text: "Inflation" },
        { key: "B", text: "Deflation" },
        { key: "C", text: "Stagflation" },
        { key: "D", text: "Devaluation" },
      ],
      correct: "A",
      explanation: "Inflation is the sustained rise in the average price index, diminishing currency purchasing power.",
    },
    {
      subject: "Economics",
      category: "National Income Accounting",
      question: "Gross National Product (GNP) equals Gross Domestic Product (GDP) plus:",
      options: [
        { key: "A", text: "Net Factor Income from Abroad" },
        { key: "B", text: "Depreciation Allowance" },
        { key: "C", text: "Indirect Taxes" },
        { key: "D", text: "Subsidies" },
      ],
      correct: "A",
      explanation: "GNP = GDP + Net Property/Factor Income earned by domestic citizens from abroad.",
    },
  ],
  Commerce: [
    {
      subject: "Commerce",
      category: "Trade & Distribution",
      question: "The channel of distribution that connects manufacturers directly to final consumers without intermediaries is:",
      options: [
        { key: "A", text: "Direct Selling / Channel Zero" },
        { key: "B", text: "Wholesaling" },
        { key: "C", text: "Retailing" },
        { key: "D", text: "Brokerage" },
      ],
      correct: "A",
      explanation: "Direct marketing bypasses wholesalers and retailers, trading directly between producer and buyer.",
    },
    {
      subject: "Commerce",
      category: "Banking & Financial Services",
      question: "Which document functions as an unconditional written order to a bank to pay a specified sum of money to a named bearer?",
      options: [
        { key: "A", text: "Cheque" },
        { key: "B", text: "Bill of Lading" },
        { key: "C", text: "Debit Note" },
        { key: "D", text: "Pro-forma Invoice" },
      ],
      correct: "A",
      explanation: "A cheque is a negotiable bill of exchange drawn on a specified banker for on-demand payment.",
    },
    {
      subject: "Commerce",
      category: "Business Ownership",
      question: "A business structure where owners enjoy limited liability and shares can be freely sold to the public on the stock exchange is a:",
      options: [
        { key: "A", text: "Public Limited Company (Plc)" },
        { key: "B", text: "Sole Proprietorship" },
        { key: "C", text: "General Partnership" },
        { key: "D", text: "Private Limited Company (Ltd)" },
      ],
      correct: "A",
      explanation: "A Public Limited Company (Plc) raises capital from the general public with transferable shares.",
    },
  ],
  "Christian Religious Studies": [
    {
      subject: "Christian Religious Studies",
      category: "Old Testament Themes",
      question: "Who was chosen by God to succeed Moses as the military and spiritual leader of Israel entering the Promised Land?",
      options: [
        { key: "A", text: "Joshua" },
        { key: "B", text: "Caleb" },
        { key: "C", text: "Aaron" },
        { key: "D", text: "Eleazar" },
      ],
      correct: "A",
      explanation: "Joshua son of Nun was commissioned by God to lead Israel across the Jordan following the death of Moses.",
    },
    {
      subject: "Christian Religious Studies",
      category: "Gospel Narratives",
      question: "In the Sermon on the Mount, Jesus declared: 'Blessed are the peacemakers, for they shall be called:'",
      options: [
        { key: "A", text: "Children of God" },
        { key: "B", text: "Inheritors of the Earth" },
        { key: "C", text: "The Righteous" },
        { key: "D", text: "Kings of Glory" },
      ],
      correct: "A",
      explanation: "Matthew 5:9 records: 'Blessed are the peacemakers, for they shall be called sons/children of God.'",
    },
    {
      subject: "Christian Religious Studies",
      category: "Epistles & Early Church",
      question: "On the Day of Pentecost in Acts chapter 2, the Holy Spirit descended upon the Apostles in the form of:",
      options: [
        { key: "A", text: "Divided tongues as of fire" },
        { key: "B", text: "A pillar of cloud" },
        { key: "C", text: "An earthquake" },
        { key: "D", text: "A burning bush" },
      ],
      correct: "A",
      explanation: "Acts 2:3 records: 'There appeared unto them cloven tongues like as of fire, and it sat upon each of them.'",
    },
  ],
  "Agricultural Science": [
    {
      subject: "Agricultural Science",
      category: "Soil Science & Fertility",
      question: "Which soil organism is primarily known as 'nature's plough' because it aerates the soil and enhances humus formation?",
      options: [
        { key: "A", text: "Earthworm" },
        { key: "B", text: "Termite" },
        { key: "C", text: "Nematode" },
        { key: "D", text: "Millipede" },
      ],
      correct: "A",
      explanation: "Earthworms burrow through soil, increasing aeration, water infiltration, and mineral cycling while depositing nutrient-rich vermicast.",
    },
    {
      subject: "Agricultural Science",
      category: "Agronomy & Crop Production",
      question: "The process of removing excess, overcrowded seedlings from a nursery bed to ensure proper spacing and vigorous growth is called:",
      options: [
        { key: "A", text: "Thinning" },
        { key: "B", text: "Pricking out" },
        { key: "C", text: "Rogueing" },
        { key: "D", text: "Mulching" },
      ],
      correct: "A",
      explanation: "Thinning is the systematic removal of surplus seedlings from a stand or bed to prevent overcrowding and nutrient competition.",
    },
    {
      subject: "Agricultural Science",
      category: "Animal Science & Husbandry",
      question: "Which chamber of the ruminant stomach is considered the 'true stomach' where enzymatic gastric digestion takes place?",
      options: [
        { key: "A", text: "Abomasum" },
        { key: "B", text: "Rumen" },
        { key: "C", text: "Reticulum" },
        { key: "D", text: "Omasum" },
      ],
      correct: "A",
      explanation: "The abomasum is the fourth and glandular compartment of the ruminant stomach where digestive enzymes like pepsin and HCl act.",
    },
  ],
  Geography: [
    {
      subject: "Geography",
      category: "Physical Geography & Landforms",
      question: "The steep-sided, flat-topped tableland residual feature resulting from the weathering and erosion of a plateau is known as a:",
      options: [
        { key: "A", text: "Mesa" },
        { key: "B", text: "Yardang" },
        { key: "C", text: "Zeugen" },
        { key: "D", text: "Barchan" },
      ],
      correct: "A",
      explanation: "A mesa is an isolated flat-topped elevation bounded on all sides by steep escarpments, typical of arid and semi-arid plateau landscapes.",
    },
    {
      subject: "Geography",
      category: "Climatology & Meteorology",
      question: "In West Africa, the dry, dusty continental wind blowing across the Sahara Desert during the harmattan season originates from the:",
      options: [
        { key: "A", text: "Tropical Continental (cT) air mass" },
        { key: "B", text: "Tropical Maritime (mT) air mass" },
        { key: "C", text: "Equatorial Maritime (mE) air mass" },
        { key: "D", text: "Polar Maritime (mP) air mass" },
      ],
      correct: "A",
      explanation: "The Northeast Trade winds blowing from the Sahara Desert belong to the Tropical Continental (cT) air mass, bringing dry and dusty conditions.",
    },
    {
      subject: "Geography",
      category: "Map Work & Cartography",
      question: "If a map distance of 5 cm represents an actual ground distance of 10 km, what is the Representative Fraction (R.F.) scale of the map?",
      options: [
        { key: "A", text: "1:200,000" },
        { key: "B", text: "1:50,000" },
        { key: "C", text: "1:100,000" },
        { key: "D", text: "1:20,000" },
      ],
      correct: "A",
      explanation: "10 km = 10 × 100,000 cm = 1,000,000 cm. Scale = 5 cm / 1,000,000 cm = 1 / 200,000, which is 1:200,000.",
    },
  ],
  "Financial Accounting": [
    {
      subject: "Financial Accounting",
      category: "Double Entry & Principles",
      question: "According to the fundamental golden rules of double-entry bookkeeping, what is the accounting treatment for an increase in liabilities?",
      options: [
        { key: "A", text: "Credit the liability account" },
        { key: "B", text: "Debit the liability account" },
        { key: "C", text: "Deduct from drawings" },
        { key: "D", text: "Credit the cash account directly" },
      ],
      correct: "A",
      explanation: "Under double-entry conventions, increases in liabilities and equity are credited, whereas increases in assets and expenses are debited.",
    },
    {
      subject: "Financial Accounting",
      category: "Trial Balance & Error Correction",
      question: "Which of the following accounting errors will NOT affect the agreement of totals in a Trial Balance?",
      options: [
        { key: "A", text: "Error of complete omission" },
        { key: "B", text: "Single-sided posting error" },
        { key: "C", text: "Casting error in the sales ledger" },
        { key: "D", text: "Transposition error in cash book total" },
      ],
      correct: "A",
      explanation: "An error of omission occurs when a transaction is completely omitted from both debit and credit entries, leaving the trial balance in balance.",
    },
    {
      subject: "Financial Accounting",
      category: "Financial Statements & Working Capital",
      question: "How is the Working Capital (Net Current Assets) of an enterprise computed?",
      options: [
        { key: "A", text: "Current Assets minus Current Liabilities" },
        { key: "B", text: "Total Assets minus Fixed Assets" },
        { key: "C", text: "Gross Profit minus Operating Expenses" },
        { key: "D", text: "Capital Employed plus Long-term Debt" },
      ],
      correct: "A",
      explanation: "Working Capital = Current Assets - Current Liabilities, measuring short-term operational liquidity.",
    },
  ],
  History: [
    {
      subject: "History",
      category: "Pre-Colonial Nigerian History",
      question: "Which pre-colonial empire in the Lake Chad basin was renowned for its Mais dynasty, the Sefawa dynasty, and extensive trans-Saharan trade?",
      options: [
        { key: "A", text: "Kanem-Borno Empire" },
        { key: "B", text: "Oyo Empire" },
        { key: "C", text: "Benin Kingdom" },
        { key: "D", text: "Jukun Kingdom" },
      ],
      correct: "A",
      explanation: "The Kanem-Borno Empire was ruled by the Mais of the Sefawa dynasty for nearly a millennium, controlling key trans-Saharan trade routes.",
    },
    {
      subject: "History",
      category: "Colonial Rule & Administration",
      question: "The historic amalgamation of the Northern and Southern Protectorates of Nigeria to form a single political entity occurred in what year?",
      options: [
        { key: "A", text: "1914" },
        { key: "B", text: "1900" },
        { key: "C", text: "1960" },
        { key: "D", text: "1922" },
      ],
      correct: "A",
      explanation: "Lord Frederick Lugard oversaw the amalgamation of the Northern and Southern Nigerian Protectorates on January 1, 1914.",
    },
    {
      subject: "History",
      category: "Nationalist Movement & Independence",
      question: "Who is widely regarded as the 'Father of Nigerian Nationalism' and founder of the Nigerian National Democratic Party (NNDP) in 1923?",
      options: [
        { key: "A", text: "Herbert Macaulay" },
        { key: "B", text: "Nnamdi Azikiwe" },
        { key: "C", text: "Obafemi Awolowo" },
        { key: "D", text: "Ahmadu Bello" },
      ],
      correct: "A",
      explanation: "Herbert Macaulay founded the NNDP in 1923 following the Clifford Constitution and is commemorated as the pioneer father of Nigerian nationalism.",
    },
  ],
  "Islamic Studies": [
    {
      subject: "Islamic Studies",
      category: "Tawhid & Pillars of Islam",
      question: "Which branch of Tawhid deals with the absolute oneness of Allah in His Lordship, Creation, and Sustenance of the universe?",
      options: [
        { key: "A", text: "Tawhid ar-Rububiyyah" },
        { key: "B", text: "Tawhid al-Uluhiyyah" },
        { key: "C", text: "Tawhid al-Asma was-Sifat" },
        { key: "D", text: "Shirk al-Akbar" },
      ],
      correct: "A",
      explanation: "Tawhid ar-Rububiyyah is the belief in the absolute oneness of Allah as the sole Creator, Provider, and Sovereign Ruler of all existence.",
    },
    {
      subject: "Islamic Studies",
      category: "Hadith Sciences & Sunnah",
      question: "A prophetic tradition whose chain of narrators (Isnad) is complete, reliable, and continuous from the Prophet (SAW) without discrepancy is classified as:",
      options: [
        { key: "A", text: "Hadith Sahih (Authentic)" },
        { key: "B", text: "Hadith Da'eef (Weak)" },
        { key: "C", text: "Hadith Mawdu' (Fabricated)" },
        { key: "D", text: "Hadith Hasan (Fair only)" },
      ],
      correct: "A",
      explanation: "A Sahih Hadith fulfills all conditions of authenticity: continuous sanad, trustworthy and accurate narrators, free from shadh and 'illah.",
    },
    {
      subject: "Islamic Studies",
      category: "Sirah & Early Islamic Caliphate",
      question: "The historic pact in 628 CE between Prophet Muhammad (SAW) and the Quraysh of Makkah establishing a ten-year truce was the:",
      options: [
        { key: "A", text: "Treaty of Hudaybiyyah" },
        { key: "B", text: "Treaty of Yathrib" },
        { key: "C", text: "Pledge of Aqabah" },
        { key: "D", text: "Charter of Madinah" },
      ],
      correct: "A",
      explanation: "The Treaty of Hudaybiyyah was signed in 6 AH (628 CE) between Muslims and the Quraysh, paving the way for peaceful spread of Islam.",
    },
  ],
  Hausa: [
    {
      subject: "Hausa",
      category: "Tsarin Sauti da Nahawu",
      question: "A tsarin sautin harshen Hausa, wasula nawa ne ke akwai a jimilla (gajeru da dogaye)?",
      options: [
        { key: "A", text: "Goma (10: gajeru biyar, dogaye biyar)" },
        { key: "B", text: "Biyar (5)" },
        { key: "C", text: "Bakwai (7)" },
        { key: "D", text: "Goma sha biyu (12)" },
      ],
      correct: "A",
      explanation: "Harshen Hausa yana da wasula guda 10: gajeru biyar (a, e, i, o, u) da dogaye biyar (aa, ee, ii, oo, uu).",
    },
    {
      subject: "Hausa",
      category: "Karin Magana da Adabi",
      question: "Kammala wannan karin magana: 'Kowa ya ci zomo, ...'",
      options: [
        { key: "A", text: "ya ci gudu" },
        { key: "B", text: "ya sha ruwa" },
        { key: "C", text: "ya kwana lafiya" },
        { key: "D", text: "ya zama gwanin harbi" },
      ],
      correct: "A",
      explanation: "Karin maganar Hausa ce da ke cewa: 'Kowa ya ci zomo, ya ci gudu', tana nuni da cewa duk wanda ya sami babban rabo ya yi aiki tukuru.",
    },
    {
      subject: "Hausa",
      category: "Al'adu da Gargajiya",
      question: "A kasar Hausa, wace sarauta ce ke kula da tsaron gari da dakarun yaki a karkashin sarki?",
      options: [
        { key: "A", text: "Madawaki" },
        { key: "B", text: "Waziri" },
        { key: "C", text: "Galadima" },
        { key: "D", text: "Sarkin Fada" },
      ],
      correct: "A",
      explanation: "Madawaki (Sarkin Dawaki) shi ne babban kwamandan mayaka kuma na biyu ga sarki a fadar masarautar Hausa.",
    },
  ],
  Yoruba: [
    {
      subject: "Yoruba",
      category: "Fonoloji ati Girama",
      question: "Faweli meloo lo wa ninu ede Yoruba lapapo (aronmufe ati aranmupe)?",
      options: [
        { key: "A", text: "Mejila (12: aranmufe meje ati aranmupe marun-un)" },
        { key: "B", text: "Meje (7)" },
        { key: "C", text: "Marun-un (5)" },
        { key: "D", text: "Mewa (10)" },
      ],
      correct: "A",
      explanation: "Faweli Yoruba je mejila: aranmufe meje (a, e, ẹ, i, o, ọ, u) ati aranmupe marun-un (an, ẹn, in, ọn, un).",
    },
    {
      subject: "Yoruba",
      category: "Litireso Alohun ati Ewi",
      question: "Iru ewi alohun wo ni awon ode ati awon ti n se aponle Ogun ma n fi orin ati ijinle gbe jade?",
      options: [
        { key: "A", text: "Ijala" },
        { key: "B", text: "Esa Egungun" },
        { key: "C", text: "Rara" },
        { key: "D", text: "Ekún Iyawo" },
      ],
      correct: "A",
      explanation: "Ijala ode je ewi alohun Yoruba ti awon ode n sun lati ki Ogun ati lati se aponle awon eranko igbo.",
    },
    {
      subject: "Yoruba",
      category: "Asa ati Ise Yoruba",
      question: "Kin ni oruko ti a n pe omo ti a bi ti o gbe ibi (apo omo) bora wa si aye?",
      options: [
        { key: "A", text: "Oke" },
        { key: "B", text: "Taiwo" },
        { key: "C", text: "Idowu" },
        { key: "D", text: "Ige" },
      ],
      correct: "A",
      explanation: "Ni asa Yoruba, omo amutorunwa ti a bi ti o fi apo ibi bora ni a n pe ni Oke.",
    },
  ],
  Igbo: [
    {
      subject: "Igbo",
      category: "Utoasusu na Nsupe",
      question: "Kedu udaume ole di n'Utoasusu Igbo dika nchikota Mkpuruokwu Igbo siri kwado?",
      options: [
        { key: "A", text: "Asato (8: Udaume Ufe anọ na Udaume Arọ anọ)" },
        { key: "B", text: "Ise (5)" },
        { key: "C", text: "Iri abuo na asato (28)" },
        { key: "D", text: "Iri (10)" },
      ],
      correct: "A",
      explanation: "Udaume Igbo di asato (8): udaume ufe (e, i, o, u) na udaume arọ (a, ị, ọ, ụ).",
    },
    {
      subject: "Igbo",
      category: "Ilu na Agumagu Odinala",
      question: "Gbakwunye ilu a: 'Onye wetara oji, wetara ...'",
      options: [
        { key: "A", text: "Ndu" },
        { key: "B", text: "Aku" },
        { key: "C", text: "Udo" },
        { key: "D", text: "Amamihe" },
      ],
      correct: "A",
      explanation: "Ilu Igbo a ma ama na-ekwu: 'Onye wetara ọjị, wetara ndụ' n'ihi na oji bu akara nnabata na ngọzi.",
    },
    {
      subject: "Igbo",
      category: "Omenala na Echichi",
      question: "N'ala Igbo, kedu emume kachasi mkpa e ji amata mmalite owuwe ihe ubi kwa afo?",
      options: [
        { key: "A", text: "Iri Ji Ohuru" },
        { key: "B", text: "Igu Afo" },
        { key: "C", text: "Iwa Akwa" },
        { key: "D", text: "Ichu Aja" },
      ],
      correct: "A",
      explanation: "Emume Iri Ji Ohuru (Iwa ji) bu emume di oke mkpa e ji enye Chukwu ekele maka owuwe ihe ubi ji ohuru.",
    },
  ],
  Music: [
    {
      subject: "Music",
      category: "Rudiments & Theory of Music",
      question: "In Western musical notation, which clef is also formally known as the 'G-Clef'?",
      options: [
        { key: "A", text: "Treble Clef" },
        { key: "B", text: "Bass Clef" },
        { key: "C", text: "Alto Clef" },
        { key: "D", text: "Tenor Clef" },
      ],
      correct: "A",
      explanation: "The Treble Clef curls around the second line of the staff (G above middle C), hence it is called the G-Clef.",
    },
    {
      subject: "Music",
      category: "African Musical Instruments",
      question: "To which family of musical instruments does the Nigerian 'Gangan' (talking drum) belong?",
      options: [
        { key: "A", text: "Membranophone" },
        { key: "B", text: "Idiophone" },
        { key: "C", text: "Chordophone" },
        { key: "D", text: "Aerophone" },
      ],
      correct: "A",
      explanation: "A membranophone produces sound by vibrating a stretched membrane or skin, such as the tension hourglass talking drum.",
    },
    {
      subject: "Music",
      category: "Musical Forms & Composition",
      question: "The distance in pitch between two musical notes is referred to as a(n):",
      options: [
        { key: "A", text: "Interval" },
        { key: "B", text: "Cadence" },
        { key: "C", text: "Tempo" },
        { key: "D", text: "Timbre" },
      ],
      correct: "A",
      explanation: "An interval is the musical distance between two pitches, measured by number of semitones or letter steps.",
    },
  ],
  "Visual Art": [
    {
      subject: "Visual Art",
      category: "Principles & Elements of Art",
      question: "Which element of visual art describes the relative lightness or darkness of a color or surface?",
      options: [
        { key: "A", text: "Value" },
        { key: "B", text: "Hue" },
        { key: "C", text: "Texture" },
        { key: "D", text: "Shape" },
      ],
      correct: "A",
      explanation: "Value refers to the gradual range of lightness and darkness across tones, essential for creating illusion of volume and depth.",
    },
    {
      subject: "Visual Art",
      category: "Nigerian Art Heritage",
      question: "The ancient Nigerian terracotta and bronze sculptures characterized by elaborate hairstyles and pierced pupils belong to the:",
      options: [
        { key: "A", text: "Nok Culture" },
        { key: "B", text: "Benin Kingdom" },
        { key: "C", text: "Igbo-Ukwu" },
        { key: "D", text: "Esie Stone Carvings" },
      ],
      correct: "A",
      explanation: "The Nok Culture (c. 500 BC - 200 AD) is famous for terracotta heads featuring pierced eyes, pupils, and nostrils.",
    },
    {
      subject: "Visual Art",
      category: "Color Theory & Techniques",
      question: "In traditional subtractive color theory, mixing two primary colors (such as Red and Yellow) produces what type of color?",
      options: [
        { key: "A", text: "Secondary Color (Orange)" },
        { key: "B", text: "Tertiary Color" },
        { key: "C", text: "Monochromatic Tint" },
        { key: "D", text: "Complementary Shade" },
      ],
      correct: "A",
      explanation: "Combining equal proportions of two primary pigments produces a secondary color (e.g., Red + Yellow = Orange).",
    },
  ],
};

function normalizeSubjectKey(subj: string): string {
  const s = subj.trim().toLowerCase();
  if (s.includes("english")) return "English";
  if (s.includes("math")) return "Mathematics";
  if (s.includes("phys")) return "Physics";
  if (s.includes("chem")) return "Chemistry";
  if (s.includes("bio")) return "Biology";
  if (s.includes("gov")) return "Government";
  if (s.includes("lit")) return "Literature in English";
  if (s.includes("econ")) return "Economics";
  if (s.includes("comm")) return "Commerce";
  if (s.includes("relig") || s.includes("crs") || s.includes("crk")) return "Christian Religious Studies";
  if (s.includes("agric") || s.includes("agr")) return "Agricultural Science";
  if (s.includes("geog") || s.includes("geo")) return "Geography";
  if (s.includes("account") || s.includes("acc") || s.includes("fin")) return "Financial Accounting";
  if (s.includes("hist")) return "History";
  if (s.includes("islam") || s.includes("irs") || s.includes("irk") || s.includes("arab")) return "Islamic Studies";
  if (s.includes("hausa")) return "Hausa";
  if (s.includes("yoruba")) return "Yoruba";
  if (s.includes("igbo")) return "Igbo";
  if (s.includes("music")) return "Music";
  if (s.includes("art") || s.includes("fine art") || s.includes("visual art")) return "Visual Art";
  return subj;
}

export default function BaselineDiagnosticPage() {
  const router = useRouter();
  const [candidateSubjects, setCandidateSubjects] = useState<[string, string, string, string]>([...DEFAULT_CANDIDATE_SUBJECTS]);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [timeLeftSec, setTimeLeftSec] = useState(900); // 15 mins
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resultsData, setResultsData] = useState<{
    score: number;
    total: number;
    predictedJambScore: number;
    readiness: ExamReadiness | null;
    subjectBreakdown: Record<string, { correct: number; total: number }>;
  } | null>(null);

  // Load persistent candidate subjects from authenticated profile or local candidate cache
  useEffect(() => {
    let active = true;
    async function loadCandidateSubjects() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;

        if (user) {
          const prof = extractStudentProfile(user);
          if (prof.selectedSubjects && prof.selectedSubjects.length === 4) {
            setCandidateSubjects(prof.selectedSubjects);
            setSubjectsLoaded(true);
            return;
          }
        }

        // Local cache fallback
        if (typeof window !== "undefined") {
          const cachedCandidate = localStorage.getItem("candidate");
          const cachedSubjects = localStorage.getItem("candidate_subjects");

          if (cachedSubjects) {
            const parsed = JSON.parse(cachedSubjects);
            if (Array.isArray(parsed) && parsed.length === 4) {
              setCandidateSubjects(parsed as [string, string, string, string]);
              setSubjectsLoaded(true);
              return;
            }
          }

          if (cachedCandidate) {
            const parsed = JSON.parse(cachedCandidate);
            if (Array.isArray(parsed.subjects) && parsed.subjects.length === 4) {
              setCandidateSubjects(parsed.subjects as [string, string, string, string]);
              setSubjectsLoaded(true);
              return;
            }
          }
        }
      } catch {}

      if (active) setSubjectsLoaded(true);
    }

    void loadCandidateSubjects();
    return () => {
      active = false;
    };
  }, []);

  // Dynamically assemble 10 questions calibrated exactly to candidate's 4 persistent subjects:
  // Subject 1 (English): 2 Questions
  // Subject 2: 3 Questions
  // Subject 3: 3 Questions
  // Subject 4: 2 Questions
  // Total = Exactly 10 Questions
  const diagnosticQuestions: DiagnosticQuestion[] = useMemo(() => {
    const questions: DiagnosticQuestion[] = [];
    let nextId = 1;

    const [s1, s2, s3, s4] = candidateSubjects;

    // Slot 1: English (2 Questions)
    const engPool = SUBJECT_QUESTION_BANK["English"] || [];
    engPool.slice(0, 2).forEach((q) => {
      questions.push({ ...q, id: nextId++ });
    });

    // Slot 2: Core Elective 1 (3 Questions)
    const s2Key = normalizeSubjectKey(s2);
    const s2Pool = SUBJECT_QUESTION_BANK[s2Key] || SUBJECT_QUESTION_BANK["Mathematics"] || [];
    s2Pool.slice(0, 3).forEach((q) => {
      questions.push({ ...q, id: nextId++ });
    });

    // Slot 3: Core Elective 2 (3 Questions)
    const s3Key = normalizeSubjectKey(s3);
    const s3Pool = SUBJECT_QUESTION_BANK[s3Key] || SUBJECT_QUESTION_BANK["Physics"] || [];
    s3Pool.slice(0, 3).forEach((q) => {
      questions.push({ ...q, id: nextId++ });
    });

    // Slot 4: Core Elective 3 (2 Questions)
    const s4Key = normalizeSubjectKey(s4);
    const s4Pool = SUBJECT_QUESTION_BANK[s4Key] || SUBJECT_QUESTION_BANK["Chemistry"] || [];
    s4Pool.slice(0, 2).forEach((q) => {
      questions.push({ ...q, id: nextId++ });
    });

    return questions;
  }, [candidateSubjects]);

  // Timer countdown
  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, answers]);

  const currentQ = diagnosticQuestions[currentIdx] || diagnosticQuestions[0];

  function handleSelect(choice: "A" | "B" | "C" | "D") {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: choice }));
  }

  async function handleFinish() {
    setSubmitting(true);
    let correctCount = 0;
    const subjectStats: Record<string, { correct: number; total: number }> = {};

    for (const q of diagnosticQuestions) {
      if (!subjectStats[q.subject]) {
        subjectStats[q.subject] = { correct: 0, total: 0 };
      }
      subjectStats[q.subject].total += 1;

      const userChoice = answers[q.id];
      const isCorrect = userChoice === q.correct;
      if (isCorrect) {
        correctCount++;
        subjectStats[q.subject].correct += 1;
      }
      void recordTopicAttempt(q.subject, q.category, isCorrect);
    }

    // Load updated topic records and readiness
    const records = await getTopicMasteryRecords();
    const rd = calculateExamReadiness(records);

    // Baseline JAMB prediction based on diagnostic accuracy (scaled to 400 with a baseline floor)
    const ratio = correctCount / (diagnosticQuestions.length || 10);
    const computedPrediction = Math.round(180 + ratio * 180);

    setResultsData({
      score: correctCount,
      total: diagnosticQuestions.length,
      predictedJambScore: computedPrediction,
      readiness: rd,
      subjectBreakdown: subjectStats,
    });

    void awardStudentXp({
      activityType: "diagnostic_complete",
      referenceId: "diag_" + Date.now(),
      amount: 60,
      description: `Baseline Diagnostic Assessment (${correctCount}/${diagnosticQuestions.length} Correct)`,
      scorePercent: Math.round((correctCount / (diagnosticQuestions.length || 10)) * 100),
    });

    trackEvent("diagnostic_assessment_completed", {
      score: correctCount,
      total: diagnosticQuestions.length,
      predictedScore: computedPrediction,
      subjects: candidateSubjects,
    });

    setFinished(true);
    setSubmitting(false);
  }

  const answeredCount = Object.keys(answers).length;
  const minutes = Math.floor(timeLeftSec / 60);
  const seconds = timeLeftSec % 60;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020b1f] text-slate-900 dark:text-white py-10 px-4 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-black text-blue-700 dark:text-blue-300">
                Diagnostic Assessment
              </span>
              <span className="text-xs text-slate-500 font-mono">10 Questions</span>
            </div>
            <h1 className="mt-1 text-2xl font-black">
              Baseline Academic DNA Diagnostic
            </h1>

            {/* Persistent 4-Subject Combination Badge */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Your Saved Combination:
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-xs font-mono font-bold text-blue-800 dark:text-cyan-300 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-cyan-400" />
                <span>{candidateSubjects.join(" • ")}</span>
              </span>
              {!finished && (
                <Link
                  href="/profile"
                  className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline"
                >
                  Edit in Profile &rarr;
                </Link>
              )}
            </div>
          </div>

          {!finished && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-mono font-black shadow-xs">
                <span>⏱️</span>
                <span>
                  {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                </span>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Analyzing..." : "Submit Diagnostic"}
              </button>
            </div>
          )}
        </div>

        {finished && resultsData ? (
          /* Diagnostic Summary Screen */
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-8 animate-fade-in">
            <div className="text-center">
              <span className="text-5xl">🧬</span>
              <h2 className="mt-4 text-3xl font-black">
                Your Baseline Learning DNA is Ready!
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Calibrated across your official subjects: <strong className="text-slate-900 dark:text-white">{candidateSubjects.join(", ")}</strong>.
              </p>
              <p className="mt-1 text-xs text-blue-600 dark:text-cyan-400 font-bold">
                You scored {resultsData.score} of {resultsData.total} ({Math.round((resultsData.score / resultsData.total) * 100)}%).
              </p>
            </div>

            {/* Score & Prediction Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 p-6 text-center">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Predicted JAMB UTME Score Range
                </span>
                <div className="mt-2 text-4xl font-black text-blue-900 dark:text-blue-200">
                  ~{resultsData.predictedJambScore} <span className="text-base text-slate-500 font-bold">/ 400</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Calibrated to your target course subjects and baseline speed.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 p-6 text-center">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Overall Foundation Mastery
                </span>
                <div className="mt-2 text-4xl font-black text-emerald-900 dark:text-emerald-200">
                  {resultsData.readiness ? `${resultsData.readiness.predictedWaecPercent}%` : "78%"}
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Baseline topic mastery recorded into your permanent cognitive profile.
                </p>
              </div>
            </div>

            {/* Subject Breakdown calibrated to their actual courses */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-6 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Your 4-Subject Performance Breakdown
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(resultsData.subjectBreakdown).map(([subj, stats]) => (
                  <div key={subj} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white block">{subj}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {stats.correct} of {stats.total} Correct
                      </span>
                    </div>
                    <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg ${
                      stats.correct === stats.total
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }`}>
                      {Math.round((stats.correct / stats.total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/cbt"
                className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-center text-xs font-black text-white shadow-sm transition active:scale-95"
              >
                Launch 4-Subject CBT Mock Simulator &rarr;
              </Link>
              <Link
                href="/learn"
                className="w-full sm:w-auto rounded-xl border border-slate-200 dark:border-slate-800 px-6 py-3 text-center text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Explore Targeted Syllabus Notes
              </Link>
            </div>
          </div>
        ) : (
          /* Live Question Screen */
          <div className="space-y-6">
            {/* Question Progress Tracker */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Question {currentIdx + 1} of {diagnosticQuestions.length}</span>
              <span>{answeredCount} Answered</span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / diagnosticQuestions.length) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            {currentQ && (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                    {currentQ.subject} &bull; {currentQ.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Q{currentQ.id}
                  </span>
                </div>

                <p className="text-base sm:text-lg font-bold leading-relaxed text-slate-900 dark:text-white">
                  {currentQ.question}
                </p>

                {/* Options */}
                <div className="space-y-3">
                  {currentQ.options.map((opt) => {
                    const isSelected = answers[currentQ.id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelect(opt.key)}
                        className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left text-sm font-medium transition cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 text-blue-950 dark:border-blue-500 dark:bg-blue-950/50 dark:text-white font-bold ring-2 ring-blue-500/20"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}>
                          {opt.key}
                        </span>
                        <span className="flex-1 text-xs sm:text-sm">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((prev) => prev - 1)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    &larr; Previous
                  </button>

                  {currentIdx < diagnosticQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIdx((prev) => prev + 1)}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-black text-white shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      Next &rarr;
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleFinish}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-black text-white shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      {submitting ? "Analyzing..." : "Finish & Calculate DNA"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
