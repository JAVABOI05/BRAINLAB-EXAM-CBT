export interface SyllabusTopic {
  id: string;
  subject_id?: string;
  title: string;
  slug: string;
  description: string;
  order_index: number;
  subtopics: string[];
  learning_objectives: string[];
  recommended_texts?: string[];
  is_published?: boolean;
}

export interface SyllabusSubject {
  id: string;
  name: string;
  slug: string;
  category: "Compulsory" | "Science" | "Arts & Humanities" | "Commercial & Social Sciences";
  description: string;
  syllabus_overview: string;
  general_objectives: string[];
  recommended_textbooks: string[];
  topics: SyllabusTopic[];
}

export const DEFAULT_JAMB_SYLLABUS: SyllabusSubject[] = [
  {
    id: "subj-english",
    name: "Use of English",
    slug: "use-of-english",
    category: "Compulsory",
    description: "Universal compulsory examination subject assessing comprehension, lexis, structure, and oral English forms.",
    syllabus_overview: "The aim of the Unified Tertiary Matriculation Examination (UTME) syllabus in Use of English is to prepare candidates for university studies, evaluating ability to communicate effectively in English, understand varied registers, and apply correct grammatical patterns.",
    general_objectives: [
      "Communicate effectively in both written and spoken English.",
      "Apply the rules of English grammar, concord, and syntax correctly in context.",
      "Distinguish between literal, figurative, and idiomatic expressions.",
      "Differentiate between vowel and consonant sounds, stress patterns, and intonations."
    ],
    recommended_textbooks: [
      "The Life Changer by Khadija Abubakar Jalli (Compulsory UTME Novel)",
      "Essential English Language for Senior Secondary Schools by Latilo, T.A.",
      "Invisible Teacher (Use of English for UTME) by Dele Ashade",
      "Oral English for Schools and Colleges by Sam Onuigbo"
    ],
    topics: [
      {
        id: "eng-top-1",
        title: "Lexis and Structure: Concord and Agreement",
        slug: "concord-and-agreement",
        description: "Rules governing subject-verb agreement, proximity, correlative conjunctions, and collective nouns.",
        order_index: 1,
        subtopics: [
          "Subject-Verb Concord (Singular and Plural subjects)",
          "Rule of Proximity with Either...or / Neither...nor",
          "Parenthetical expressions and intervening prepositional phrases",
          "Indefinite pronouns and collective nouns",
          "Mandative subjunctive and hypothetical expressions"
        ],
        learning_objectives: [
          "Identify and apply the principle of proximity correctly.",
          "Select the appropriate singular or plural verb for compound and correlative subjects.",
          "Recognize errors in agreement in complex sentence constructions."
        ]
      },
      {
        id: "eng-top-2",
        title: "Vocabulary: Antonyms and Synonyms",
        slug: "antonyms-and-synonyms",
        description: "Contextual vocabulary mastery, words opposite in meaning, and words nearest in meaning.",
        order_index: 2,
        subtopics: [
          "Words nearest in meaning (Synonyms) in varied registers",
          "Words opposite in meaning (Antonyms) in context",
          "Denotative versus Connotative word meanings",
          "Common false friends and misleading cognates"
        ],
        learning_objectives: [
          "Deduce word meanings accurately from contextual clues.",
          "Select the exact antonym without confusing antonyms with non-related negatives.",
          "Differentiate subtle nuances between partial synonyms."
        ]
      },
      {
        id: "eng-top-3",
        title: "Prepositions, Phrasal Verbs & Idioms",
        slug: "prepositions-phrasal-verbs-idioms",
        description: "Dependent prepositions, idiomatic expressions, and fixed collocations in contemporary English.",
        order_index: 3,
        subtopics: [
          "Prepositional collocations with verbs, nouns, and adjectives",
          "Inseparable and separable phrasal verbs",
          "Common figurative idioms and proverbial expressions",
          "Easily confused prepositions (e.g. between vs among, beside vs besides)"
        ],
        learning_objectives: [
          "Use dependent prepositions accurately in sentence completion.",
          "Interpret figurative meanings of idioms in narrative contexts.",
          "Avoid colloquial Nigerian English errors (e.g. 'congratulate for' vs 'congratulate on')."
        ]
      },
      {
        id: "eng-top-4",
        title: "Oral Forms: Vowels, Consonants & Stress",
        slug: "oral-forms-phonology",
        description: "Phonological patterns, pure vowels (monophthongs), diphthongs, consonant clusters, and syllabic stress.",
        order_index: 4,
        subtopics: [
          "Monophthongs (Short and Long vowels) and Diphthongs",
          "Silent letters in English words",
          "Consonants: Voiced vs Voiceless plosives and fricatives",
          "Primary word stress in two-, three-, and four-syllable words",
          "Emphatic sentence stress and contrastive focus"
        ],
        learning_objectives: [
          "Identify words containing identical vowel sounds.",
          "Determine the syllable that carries primary stress using grammatical suffixes.",
          "Interpret the intended meaning conveyed by emphatic stress."
        ]
      },
      {
        id: "eng-top-5",
        title: "Prescribed Reading Text: Analytical Review",
        slug: "prescribed-reading-text",
        description: "Detailed plot, characterization, themes, and stylistic devices in the official JAMB reading text.",
        order_index: 5,
        subtopics: [
          "Plot structure and narrative chronology",
          "Main character motivations and conflicts",
          "Central themes: Integrity, Education, Morality, and Societal Values",
          "Literary and stylistic devices employed by the author"
        ],
        learning_objectives: [
          "Recall key events and character relationships accurately.",
          "Analyze the thematic significance of pivotal scenes in the text.",
          "Identify literary techniques such as irony, foreshadowing, and symbolism."
        ]
      }
    ]
  },
  {
    id: "subj-mathematics",
    name: "Mathematics",
    slug: "mathematics",
    category: "Science",
    description: "Core computational mathematics covering Algebra, Geometry, Calculus, Trigonometry, and Statistics.",
    syllabus_overview: "The aim of the UTME Mathematics syllabus is to test mathematical reasoning, quantitative analysis, algebraic fluency, and practical problem-solving skills required for science, engineering, and social science courses.",
    general_objectives: [
      "Acquire mathematical concepts and apply computational techniques accurately.",
      "Solve linear, quadratic, exponential, and logarithmic algebraic problems.",
      "Analyze geometric shapes, coordinate geometry, and trigonometry.",
      "Apply differential and integral calculus to rates of change, tangents, and areas."
    ],
    recommended_textbooks: [
      "New General Mathematics for Senior Secondary Schools (Books 1 - 3) by Channon, Smith and Head",
      "Comprehensive Mathematics for Senior Secondary Schools by D.B. Adu",
      "Further Mathematics for SSS by Tuttuh-Adegun and Godspower"
    ],
    topics: [
      {
        id: "math-top-1",
        title: "Number and Numeration: Bases, Indices & Logs",
        slug: "number-and-numeration",
        description: "Operations in varied number bases, modular arithmetic, laws of indices, and logarithms.",
        order_index: 1,
        subtopics: [
          "Number base conversions (Bases 2 to 10)",
          "Modular arithmetic operations and cyclic patterns",
          "Laws of indices and surd rationalization",
          "Logarithmic equations and change of base formulas"
        ],
        learning_objectives: [
          "Perform calculations in different number bases seamlessly.",
          "Simplify complicated surdic and logarithmic expressions.",
          "Solve exponential equations using logarithmic principles."
        ]
      },
      {
        id: "math-top-2",
        title: "Algebra: Polynomials, Equations & Inequalities",
        slug: "algebra-polynomials-equations",
        description: "Simultaneous linear equations, quadratic factorization, polynomials, and linear inequalities.",
        order_index: 2,
        subtopics: [
          "Factor and Remainder theorems for polynomials",
          "Quadratic equations, roots nature, and discriminant",
          "Simultaneous equations (linear and quadratic combinations)",
          "Linear inequalities in one and two variables"
        ],
        learning_objectives: [
          "Factorize cubic and quadratic polynomials using the factor theorem.",
          "Form quadratic equations with specified roots.",
          "Represent solutions of inequalities on number lines and graphs."
        ]
      },
      {
        id: "math-top-3",
        title: "Calculus: Differentiation & Integration",
        slug: "calculus-differentiation-integration",
        description: "Limits, derivatives of algebraic and trigonometric functions, maxima/minima, and definite integrals.",
        order_index: 3,
        subtopics: [
          "Rules of differentiation (Product, Quotient, and Chain rules)",
          "Tangents, normals, and turning points (Maxima and Minima)",
          "Indefinite and definite integrals of polynomial functions",
          "Area under curves and applications to kinematics"
        ],
        learning_objectives: [
          "Differentiate complex algebraic expressions accurately.",
          "Calculate stationary points and determine their nature.",
          "Evaluate definite integrals to calculate areas under curves."
        ]
      },
      {
        id: "math-top-4",
        title: "Trigonometry & Coordinate Geometry",
        slug: "trigonometry-and-geometry",
        description: "Trigonometric ratios, sine and cosine rules, angles of elevation/depression, and straight line equations.",
        order_index: 4,
        subtopics: [
          "Trigonometric ratios of special angles (30°, 45°, 60°)",
          "Sine and Cosine rules for non-right triangles",
          "Equations of straight lines (Gradient, Parallel, and Perpendicular lines)",
          "Distance between two points and mid-point coordinates"
        ],
        learning_objectives: [
          "Solve bearings and angle problems using trigonometric rules.",
          "Determine gradients, intercepts, and equations of perpendicular lines.",
          "Calculate lengths, distances, and angles in geometric figures."
        ]
      }
    ]
  },
  {
    id: "subj-physics",
    name: "Physics",
    slug: "physics",
    category: "Science",
    description: "Mechanics, thermal physics, wave optics, electricity, magnetism, and atomic structure.",
    syllabus_overview: "The UTME Physics syllabus assesses understanding of fundamental physical concepts, measurement standards, mathematical modeling of natural phenomena, and technological applications.",
    general_objectives: [
      "Comprehend the basic laws of mechanics, thermodynamics, and electromagnetism.",
      "Solve practical physics problems using dimensional equations and formulas.",
      "Analyze wave phenomena including light reflection, refraction, sound waves, and resonance.",
      "Understand modern quantum principles and nuclear physics concepts."
    ],
    recommended_textbooks: [
      "Senior Secondary Physics by P.N. Okeke and M.W. Anyakoha",
      "New School Physics by M.W. Anyakoha",
      "Calculations in Fundamental Physics by T.O. Megwa"
    ],
    topics: [
      {
        id: "phys-top-1",
        title: "Mechanics: Motion, Forces & Momentum",
        slug: "mechanics-motion-and-forces",
        description: "Equations of uniformly accelerated motion, projectiles, Newton's laws, friction, and linear momentum.",
        order_index: 1,
        subtopics: [
          "Scalars and Vectors (Resolution of vectors)",
          "Equations of linear motion and projectile trajectories",
          "Newton's laws of motion and impulse-momentum theorem",
          "Work, Energy, Power, and conservation of mechanical energy",
          "Simple machines and mechanical advantage"
        ],
        learning_objectives: [
          "Calculate range, time of flight, and maximum height of projectiles.",
          "Apply the principle of conservation of linear momentum in collisions.",
          "Evaluate the efficiency of levers, pulleys, and inclined planes."
        ]
      },
      {
        id: "phys-top-2",
        title: "Thermal Physics: Heat & Thermodynamics",
        slug: "thermal-physics",
        description: "Thermometry, heat capacity, latent heat, gas laws, and heat transfer mechanisms.",
        order_index: 2,
        subtopics: [
          "Temperature scales and liquid-in-glass thermometers",
          "Linear, superficial, and cubical expansivity of solids",
          "Specific heat capacity and method of mixtures",
          "Gas laws: Boyle's, Charles's, and Ideal Gas equation (PV = nRT)",
          "Vapors, humidity, and boiling vs evaporation"
        ],
        learning_objectives: [
          "Convert between Celsius, Kelvin, and Fahrenheit scales.",
          "Determine heat exchange and final mixture temperatures using calorimetry.",
          "Apply Boyle's and Charles's laws to gas volume and pressure calculations."
        ]
      },
      {
        id: "phys-top-3",
        title: "Waves and Optics: Sound & Light",
        slug: "waves-and-optics",
        description: "Wave properties, sound resonance, reflection at spherical mirrors, and refraction through lenses and prisms.",
        order_index: 3,
        subtopics: [
          "Transverse and Longitudinal waves, wave parameters (v = fλ)",
          "Sound waves: Echoes, resonance tubes, and vibrating strings",
          "Reflection at curved mirrors (Concave and Convex mirror equations)",
          "Refraction through triangular prisms and optical lenses",
          "Electromagnetic spectrum and optical instruments (Microscopes, Telescopes)"
        ],
        learning_objectives: [
          "Derive wave velocities using frequency and wavelength.",
          "Calculate focal lengths, image distances, and magnification.",
          "Determine refractive index using real and apparent depth."
        ]
      },
      {
        id: "phys-top-4",
        title: "Electricity, Magnetism & Modern Physics",
        slug: "electricity-magnetism-modern-physics",
        description: "Electrostatics, Ohm's law, electric circuits, magnetic fields, photoelectric effect, and radioactivity.",
        order_index: 4,
        subtopics: [
          "Coulomb's law, electric fields, and capacitors in series/parallel",
          "Ohm's law, electrical resistivity, and Wheatstone bridge",
          "Magnetic fields around conductors and electromagnetic induction",
          "Alternating current (AC) circuits, RMS values, and transformers",
          "Photoelectric effect, Einstein's equation, and radioactive decay"
        ],
        learning_objectives: [
          "Calculate equivalent resistance and current in compound circuits.",
          "Compute turns ratio and efficiency of step-up and step-down transformers.",
          "Solve half-life decay problems and nuclear equation balances."
        ]
      }
    ]
  },
  {
    id: "subj-chemistry",
    name: "Chemistry",
    slug: "chemistry",
    category: "Science",
    description: "Atomic structure, chemical bonding, stoichiometry, periodic trends, electrochemistry, and organic chemistry.",
    syllabus_overview: "The UTME Chemistry syllabus measures candidates' understanding of matter, atomic configurations, reaction thermodynamics, industrial chemical processes, and organic reaction mechanisms.",
    general_objectives: [
      "Understand the particulate nature of matter and modern atomic theory.",
      "Balance chemical equations, calculate molar masses, and determine stoichiometric yields.",
      "Analyze reaction kinetics, chemical equilibrium, and acid-base titrations.",
      "Identify functional groups, nomenclature, and synthesis of organic compounds."
    ],
    recommended_textbooks: [
      "New School Chemistry for Senior Secondary Schools by Osei Yaw Ababio",
      "Essential Chemistry for Senior Secondary Schools by I.A. Odesina",
      "Comprehensive Certificate Chemistry by G.N.C. Ohia et al."
    ],
    topics: [
      {
        id: "chem-top-1",
        title: "Atomic Structure & Periodic Table Trends",
        slug: "atomic-structure-periodic-trends",
        description: "Subatomic particles, isotopes, electronic configurations (s, p, d, f), and periodic periodicity.",
        order_index: 1,
        subtopics: [
          "Protons, neutrons, electrons, and isotopic calculations",
          "Quantum numbers and orbital electronic configurations",
          "Periodic trends: Ionization energy, Electronegativity, and Atomic radius",
          "Chemical bonding: Electrovalent, Covalent, Coordinate, and Metallic bonds"
        ],
        learning_objectives: [
          "Write electronic configurations of atoms and ions accurately.",
          "Explain periodic trends across periods and down groups.",
          "Predict bond types and molecular shapes based on valence electrons."
        ]
      },
      {
        id: "chem-top-2",
        title: "Stoichiometry, Gas Laws & Chemical Energetics",
        slug: "stoichiometry-and-energetics",
        description: "Mole concept, empirical and molecular formulas, molar volume, and enthalpy changes.",
        order_index: 2,
        subtopics: [
          "Mole calculations, Avogadro's constant, and percentage composition",
          "Determination of empirical and molecular formulas",
          "Chemical energetics: Exothermic vs Endothermic reactions, and Hess's law",
          "Rates of reaction, collision theory, and Le Chatelier's principle"
        ],
        learning_objectives: [
          "Calculate masses and volumes of reacting substances in chemical reactions.",
          "Construct and interpret energy profile diagrams.",
          "Predict equilibrium shifts under changes in temperature, pressure, and concentration."
        ]
      },
      {
        id: "chem-top-3",
        title: "Acids, Bases, Salts & Electrochemistry",
        slug: "acids-bases-electrochemistry",
        description: "pH calculations, neutralization titrations, redox reactions, and electrolysis.",
        order_index: 3,
        subtopics: [
          "Arrhenius, Bronsted-Lowry, and Lewis definitions of acids and bases",
          "pH, pOH calculations and indicators in volumetric titrations",
          "Oxidation states and balancing redox reactions",
          "Faraday's laws of electrolysis and electrochemical cells"
        ],
        learning_objectives: [
          "Calculate pH values for strong and weak acids.",
          "Determine mass of substance deposited during electrolysis using Faraday's laws.",
          "Identify oxidizing and reducing agents in redox equations."
        ]
      },
      {
        id: "chem-top-4",
        title: "Organic Chemistry & Hydrocarbons",
        slug: "organic-chemistry-hydrocarbons",
        description: "IUPAC nomenclature, isomerism, alkanes, alkenes, alkynes, benzene, alcohols, and polymers.",
        order_index: 4,
        subtopics: [
          "Homologous series, functional groups, and IUPAC nomenclature",
          "Structural and geometric isomerism",
          "Reactions of aliphatic hydrocarbons (Substitution, Addition, and Polymerization)",
          "Oxygen-containing organic compounds (Alkanols, Alkanals, Alkanoic acids, Esters)"
        ],
        learning_objectives: [
          "Name organic molecules correctly according to IUPAC rules.",
          "Differentiate saturated from unsaturated hydrocarbons using chemical tests.",
          "Describe saponification, esterification, and fermentation processes."
        ]
      }
    ]
  },
  {
    id: "subj-biology",
    name: "Biology",
    slug: "biology",
    category: "Science",
    description: "Living organisms, cell biology, plant/animal physiology, ecology, genetics, and evolution.",
    syllabus_overview: "The UTME Biology syllabus assesses candidates' understanding of the structure, physiological processes, ecological relationships, and heredity of living organisms.",
    general_objectives: [
      "Understand cell organization and biochemical processes in living systems.",
      "Analyze plant and animal nutrition, transport, respiration, and reproduction.",
      "Comprehend ecosystems, energy flow, and nutrient cycling.",
      "Apply principles of genetics, heredity, variation, and natural selection."
    ],
    recommended_textbooks: [
      "Modern Biology for Senior Secondary Schools by Ramalingam, S.T.",
      "College Biology by Idodo Umeh",
      "Essential Biology for Senior Secondary Schools by M.C. Michael"
    ],
    topics: [
      {
        id: "bio-top-1",
        title: "Cell Biology & Organization of Life",
        slug: "cell-biology-organization",
        description: "Cell structure, organelles, diffusion, osmosis, plasmolysis, and tissue specialization.",
        order_index: 1,
        subtopics: [
          "Plant and Animal cell comparison under light and electron microscopes",
          "Functions of cellular organelles (Mitochondria, Ribosomes, Chloroplasts)",
          "Physiological processes: Diffusion, Osmosis, and Active transport",
          "Levels of organization: Cell, Tissue, Organ, and System"
        ],
        learning_objectives: [
          "Distinguish clearly between plant and animal cellular structures.",
          "Explain the mechanisms and biological significance of osmosis and turgidity.",
          "Identify specialized tissues in plants and animals and their roles."
        ]
      },
      {
        id: "bio-top-2",
        title: "Plant and Animal Physiology",
        slug: "physiology-nutrition-respiration",
        description: "Photosynthesis, digestion, mammalian circulatory systems, excretion, and nervous control.",
        order_index: 2,
        subtopics: [
          "Photosynthesis: Light and Dark stages, and mineral nutrition in plants",
          "Holozoic nutrition, digestive enzymes, and food tests",
          "Internal transport: Blood components, heart structure, and double circulation",
          "Excretory organs (Kidney, Skin, Malpighian tubules) and homeostasis",
          "Nervous coordination, sensory organs (Eye and Ear), and endocrine glands"
        ],
        learning_objectives: [
          "Describe the biochemical steps of photosynthesis and factors affecting its rate.",
          "Trace the pathway of blood circulation through mammalian heart chambers.",
          "Explain the structure and functioning of the nephron in urine formation."
        ]
      },
      {
        id: "bio-top-3",
        title: "Ecology: Ecosystems & Conservation",
        slug: "ecology-and-ecosystems",
        description: "Ecological concepts, biotic and abiotic factors, food chains, energy flow, and conservation.",
        order_index: 3,
        subtopics: [
          "Ecological factors and their measurement instruments",
          "Trophic levels, Food chains, Food webs, and Ecological pyramids",
          "Biogeochemical cycles (Carbon, Nitrogen, and Water cycles)",
          "Biological associations: Mutualism, Commensalism, Parasitism, and Predation",
          "Pollution types, soil conservation, and endangered wildlife"
        ],
        learning_objectives: [
          "Construct food webs and calculate energy transfer efficiency across trophic levels.",
          "Identify instruments used to measure abiotic factors (e.g. anemometer, hygrometer).",
          "Describe nitrogen fixation and denitrification processes in the nitrogen cycle."
        ]
      },
      {
        id: "bio-top-4",
        title: "Genetics, Heredity & Evolution",
        slug: "genetics-and-evolution",
        description: "Mendelian genetics, monohybrid/dihybrid crosses, sex determination, blood grouping, and evolution theories.",
        order_index: 4,
        subtopics: [
          "Mendel's laws of segregation and independent assortment",
          "Punnett squares for monohybrid and dihybrid crosses",
          "Sex determination, sex-linked traits (Color blindness, Hemophilia)",
          "ABO blood group inheritance and Rhesus factor compatibility",
          "Theories of evolution: Lamarckism versus Darwinian natural selection"
        ],
        learning_objectives: [
          "Predict genotypic and phenotypic ratios of offspring using genetic crosses.",
          "Explain the genetic inheritance of sex-linked conditions.",
          "Distinguish continuous from discontinuous variation in human populations."
        ]
      }
    ]
  },
  {
    id: "subj-economics",
    name: "Economics",
    slug: "economics",
    category: "Commercial & Social Sciences",
    description: "Microeconomics, production theory, price determination, money and banking, and macroeconomics.",
    syllabus_overview: "The UTME Economics syllabus assesses candidates' ability to analyze economic systems, price mechanisms, market structures, public finance, and international trade in national development.",
    general_objectives: [
      "Understand basic economic concepts such as scarcity, choice, and opportunity cost.",
      "Analyze demand, supply, elasticity, and price determination in competitive markets.",
      "Comprehend money, banking, public revenue, taxation, and government expenditure.",
      "Evaluate national income accounting, inflation, and international trade balances."
    ],
    recommended_textbooks: [
      "Comprehensive Economics for Senior Secondary Schools by J.U. Anyaele",
      "Essential Economics for SSS by C.E. Ande",
      "New Approach to Economics by K.U. Nnadi and Falodun"
    ],
    topics: [
      {
        id: "econ-top-1",
        title: "Basic Economic Concepts & Price Theory",
        slug: "economic-concepts-price-theory",
        description: "Scarcity, choice, scale of preference, opportunity cost, and demand-supply equilibrium.",
        order_index: 1,
        subtopics: [
          "Basic economic problems and production possibility curve (PPC)",
          "Laws of demand and supply, schedule, and shift in curves",
          "Price elasticity of demand and supply (Point and Arc elasticity)",
          "Price determination, price ceiling, and price floor mechanisms"
        ],
        learning_objectives: [
          "Calculate opportunity cost and interpret shifts in the production possibility curve.",
          "Compute price elasticity of demand and interpret its numerical values.",
          "Analyze the effects of government price controls on market equilibrium."
        ]
      },
      {
        id: "econ-top-2",
        title: "Production Theory & Market Structures",
        slug: "production-theory-market-structures",
        description: "Factors of production, law of diminishing returns, cost concepts, perfect competition, and monopoly.",
        order_index: 2,
        subtopics: [
          "Factors of production and their rewards",
          "Short-run production: Total, Average, and Marginal products",
          "Cost analysis: Fixed, Variable, Marginal, and Average costs",
          "Market structures: Perfect competition, Monopoly, Oligopoly, and Monopolistic competition"
        ],
        learning_objectives: [
          "Apply the law of diminishing returns to production data tables.",
          "Calculate marginal cost and revenue to determine profit-maximizing outputs.",
          "Compare price and output determination between perfect competition and monopoly."
        ]
      },
      {
        id: "econ-top-3",
        title: "Money, Banking & Public Finance",
        slug: "money-banking-public-finance",
        description: "Functions of money, commercial vs central banks, monetary policy tools, and government budgets.",
        order_index: 3,
        subtopics: [
          "Evolution, characteristics, and functions of money",
          "Commercial banking and credit creation mechanisms",
          "Central Bank of Nigeria (CBN) and monetary policy instruments",
          "Public revenue, direct vs indirect taxation, and government budget deficits"
        ],
        learning_objectives: [
          "Explain the credit creation process of commercial banking systems.",
          "Evaluate how monetary policy tools (Cash reserve ratio, OMO, MPR) control inflation.",
          "Distinguish progressive, proportional, and regressive tax systems."
        ]
      }
    ]
  },
  {
    id: "subj-government",
    name: "Government",
    slug: "government",
    category: "Arts & Humanities",
    description: "Political concepts, forms of government, Nigerian constitutional development, and foreign policy.",
    syllabus_overview: "The UTME Government syllabus develops candidates' understanding of political theories, state governance systems, democratic processes, and Nigeria's political history from pre-colonial times to present.",
    general_objectives: [
      "Understand basic concepts of government: sovereignty, legitimacy, democracy, and rule of law.",
      "Compare presidential, parliamentary, federal, and unitary systems of government.",
      "Trace Nigerian constitutional development from colonial constitutions to the 1999 Constitution.",
      "Analyze Nigeria's foreign policy and membership in international organizations (AU, ECOWAS, UN)."
    ],
    recommended_textbooks: [
      "Essential Government for Senior Secondary Schools by C.C. Dibie",
      "Comprehensive Government for SSS by J.U. Anyaele",
      "Government for Senior Secondary Schools by B.A. Adeleke"
    ],
    topics: [
      {
        id: "gov-top-1",
        title: "Basic Political Concepts & Forms of Government",
        slug: "basic-political-concepts",
        description: "The State, Sovereignty, Power, Authority, Rule of Law, and systems of government.",
        order_index: 1,
        subtopics: [
          "Elements of the State and characteristics of sovereignty",
          "Separation of powers and checks and balances",
          "Rule of law: Principles, limitations, and constitutional supremacy",
          "Presidential versus Parliamentary executive systems",
          "Unitary versus Federal political structures"
        ],
        learning_objectives: [
          "Distinguish clearly between political power and legitimate authority.",
          "Explain how checks and balances prevent authoritarianism in democratic governance.",
          "Compare the roles of Head of State and Head of Government in parliamentary systems."
        ]
      },
      {
        id: "gov-top-2",
        title: "Nigerian Constitutional Development",
        slug: "nigerian-constitutional-development",
        description: "Colonial constitutions (Clifford, Richards, Macpherson, Lyttelton) and post-independence constitutions.",
        order_index: 2,
        subtopics: [
          "Pre-colonial political systems: Hausa-Fulani, Yoruba, and Igbo traditional administration",
          "Clifford Constitution of 1922 and the elective principle",
          "Richards Constitution of 1946 (Regionalism) and Macpherson Constitution of 1951",
          "Lyttelton Constitution of 1954 (Establishment of genuine federalism)",
          "Independence (1960), Republican (1963), and 1999 Fourth Republic Constitutions"
        ],
        learning_objectives: [
          "Evaluate the introduction of the elective principle under the 1922 Clifford Constitution.",
          "Explain why the 1954 Lyttelton Constitution is regarded as the foundation of Nigerian federalism.",
          "Identify key provisions and amendments of the 1999 Constitution of Nigeria."
        ]
      }
    ]
  },
  {
    id: "subj-literature",
    name: "Literature in English",
    slug: "literature-in-english",
    category: "Arts & Humanities",
    description: "Literary appreciation, poetic devices, African and non-African drama, prose, and poetry.",
    syllabus_overview: "The UTME Literature in English syllabus assesses candidates' ability to appreciate prose, poetry, and drama, evaluating narrative craft, themes, characterization, and figurative language.",
    general_objectives: [
      "Identify literary devices, figures of speech, and poetic forms.",
      "Analyze themes, plots, character development, and conflicts in prescribed prose and drama.",
      "Appreciate African and non-African poetry in varied historical and socio-cultural contexts."
    ],
    recommended_textbooks: [
      "A Handbook of Literary Terms by Dele Ashade",
      "Essential Literature-in-English by Ibitola, A.O.",
      "Selected UTME Prescribed African and Non-African Drama & Poetry Texts"
    ],
    topics: [
      {
        id: "lit-top-1",
        title: "Literary Terms & Figurative Expressions",
        slug: "literary-terms-appreciation",
        description: "Poetic devices, dramatic terms, figures of speech, and narrative points of view.",
        order_index: 1,
        subtopics: [
          "Figures of speech: Metaphor, Simile, Personification, Oxymoron, Hyperbole, and Irony",
          "Dramatic terms: Aside, Soliloquy, Catharsis, Nemesis, Dramatic Irony, and Tragic Flaw",
          "Poetic forms: Sonnet, Ode, Elegy, Ballad, Epic, and Free Verse",
          "Narrative perspective: First person, Third-person omniscient, and Stream of consciousness"
        ],
        learning_objectives: [
          "Identify figures of speech in unseen poetic excerpts.",
          "Distinguish an aside from a soliloquy in dramatic performance.",
          "Analyze the structural elements of Shakespearean and Petrarchan sonnets."
        ]
      },
      {
        id: "lit-top-2",
        title: "Prescribed African & Non-African Prose",
        slug: "prescribed-prose-texts",
        description: "Close textual analysis of official African and Non-African novels and novellas.",
        order_index: 2,
        subtopics: [
          "Plot structure, setting, and socio-historical backdrop",
          "Characterization and character foils",
          "Thematic exploration of colonialism, identity, governance, and gender",
          "Authorial point of view and language use"
        ],
        learning_objectives: [
          "Relate character actions to overarching thematic messages in the novel.",
          "Analyze the dramatic impact of pivotal plot turning points.",
          "Identify narrative techniques such as flashbacks and framing devices."
        ]
      }
    ]
  }
];

export function getCurriculumSubjects(): SyllabusSubject[] {
  return DEFAULT_JAMB_SYLLABUS;
}

export function getSubjectBySlug(slug: string): SyllabusSubject | undefined {
  return DEFAULT_JAMB_SYLLABUS.find((s) => s.slug === slug);
}

export interface CanonicalSubject {
  id: string;
  name: string;
  slug: string;
  cbtKey: string;
  learningHubSlug: string;
  stemSubjectId: string;
  category: "Compulsory" | "Science" | "Arts & Humanities" | "Commercial & Social Sciences" | "Technology";
  icon: string;
  description: string;
  displayOrder: number;
}

export const CANONICAL_SUBJECT_REGISTRY: CanonicalSubject[] = [
  {
    id: "english",
    name: "Use of English",
    slug: "use-of-english",
    cbtKey: "English",
    learningHubSlug: "use-of-english",
    stemSubjectId: "subj-english",
    category: "Compulsory",
    icon: "📖",
    description: "Universal compulsory examination subject assessing comprehension, lexis, structure, and oral English forms.",
    displayOrder: 1,
  },
  {
    id: "mathematics",
    name: "Mathematics",
    slug: "mathematics",
    cbtKey: "Mathematics",
    learningHubSlug: "mathematics",
    stemSubjectId: "subj-math",
    category: "Science",
    icon: "📐",
    description: "Core mathematical sciences covering algebra, calculus, trigonometry, coordinate geometry, and statistics.",
    displayOrder: 2,
  },
  {
    id: "physics",
    name: "Physics",
    slug: "physics",
    cbtKey: "Physics",
    learningHubSlug: "physics",
    stemSubjectId: "subj-physics",
    category: "Science",
    icon: "⚡",
    description: "Physical sciences investigating mechanics, kinematics, thermodynamics, electromagnetism, and modern quantum physics.",
    displayOrder: 3,
  },
  {
    id: "chemistry",
    name: "Chemistry",
    slug: "chemistry",
    cbtKey: "Chemistry",
    learningHubSlug: "chemistry",
    stemSubjectId: "subj-chem",
    category: "Science",
    icon: "🧪",
    description: "Chemical sciences covering stoichiometry, chemical equilibrium, organic reactions, redox titration, and atomic structure.",
    displayOrder: 4,
  },
  {
    id: "biology",
    name: "Biology",
    slug: "biology",
    cbtKey: "Biology",
    learningHubSlug: "biology",
    stemSubjectId: "subj-bio",
    category: "Science",
    icon: "🧬",
    description: "Life sciences spanning cell biology, genetics, ecology, plant physiology, animal nutrition, and evolutionary adaptations.",
    displayOrder: 5,
  },
  {
    id: "economics",
    name: "Economics",
    slug: "economics",
    cbtKey: "Economics",
    learningHubSlug: "economics",
    stemSubjectId: "subj-econ",
    category: "Commercial & Social Sciences",
    icon: "📊",
    description: "Economic theory, microeconomics, macroeconomic indicators, monetary policies, and fiscal public finance.",
    displayOrder: 6,
  },
  {
    id: "government",
    name: "Government",
    slug: "government",
    cbtKey: "Government",
    learningHubSlug: "government",
    stemSubjectId: "subj-gov",
    category: "Commercial & Social Sciences",
    icon: "🏛️",
    description: "Political science, constitutional evolution, electoral institutions, public administration, and international relations.",
    displayOrder: 7,
  },
  {
    id: "literature",
    name: "Literature in English",
    slug: "literature",
    cbtKey: "Literature in English",
    learningHubSlug: "literature",
    stemSubjectId: "subj-lit",
    category: "Arts & Humanities",
    icon: "🎭",
    description: "Literary appreciation, African drama, non-African prose, poetic devices, and analytical literary commentary.",
    displayOrder: 8,
  },
  {
    id: "engineering",
    name: "Engineering & Computer Studies",
    slug: "engineering",
    cbtKey: "Engineering",
    learningHubSlug: "engineering",
    stemSubjectId: "subj-engineering",
    category: "Technology",
    icon: "🤖",
    description: "Applied technology, digital logic circuits, algorithmic problem solving, Boolean algebra, and computer systems.",
    displayOrder: 9,
  },
];

export function resolveCanonicalSubject(input?: string | null): CanonicalSubject | undefined {
  if (!input) return undefined;
  const clean = input.trim().toLowerCase();
  return CANONICAL_SUBJECT_REGISTRY.find(
    (s) =>
      s.id === clean ||
      s.slug === clean ||
      s.cbtKey.toLowerCase() === clean ||
      s.learningHubSlug.toLowerCase() === clean ||
      s.stemSubjectId.toLowerCase() === clean ||
      s.name.toLowerCase() === clean ||
      (clean.includes("math") && s.id === "mathematics") ||
      (clean.includes("physic") && s.id === "physics") ||
      (clean.includes("chem") && s.id === "chemistry") ||
      (clean.includes("bio") && s.id === "biology") ||
      (clean.includes("english") && s.id === "english") ||
      (clean.includes("econ") && s.id === "economics") ||
      (clean.includes("gov") && s.id === "government") ||
      (clean.includes("lit") && s.id === "literature") ||
      (clean.includes("engin") && s.id === "engineering")
  );
}

export function getCbtSubjectKey(input?: string | null): string {
  const resolved = resolveCanonicalSubject(input);
  return resolved ? resolved.cbtKey : (input || "General");
}

