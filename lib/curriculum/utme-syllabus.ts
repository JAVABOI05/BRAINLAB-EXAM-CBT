export type UtmeSyllabusTopic = {
  title: string;
  contents: string[];
};

export type UtmeSyllabusSection = {
  title: string;
  topics: UtmeSyllabusTopic[];
};

export type UtmeSyllabusSubject = {
  name: string;
  slug: string;
  icon: string;
  description: string;
  generalObjectives: string[];
  sections: UtmeSyllabusSection[];
};

export const UTME_SYLLABUS: UtmeSyllabusSubject[] = [
  {
    name: "Use of English",
    slug: "use-of-english",
    icon: "📘",
    description: "Official UTME syllabus arranged into comprehension and summary, lexis and structure, and oral forms.",
    generalObjectives: [
      "Communicate effectively in both written and spoken English.",
      "Use English Language for learning at the tertiary level."
    ],
    sections: [
      { title: "A. Comprehension and Summary", topics: [
        { title: "Comprehension", contents: ["Passage forms: description, narration, exposition and argumentation/persuasion.", "The supplied syllabus states that three passages should be set, one of which is a cloze test, with each passage about 200 words long.", "Comprehension of the whole passage or part of a passage.", "Understanding words, phrases, clauses, sentences, figures of speech and idioms as used in passages.", "Coherence and logical reasoning, including deductions and inferences.", "The approved reading text.", "Identifying main points and topic sentences; determining implied meanings; identifying grammatical functions of words, phrases, clauses and figurative or idiomatic expressions; inferring writers' intentions, mood, attitude and opinion."] },
        { title: "Summary", contents: ["Identifying relevant points in a passage.", "Synthesis of ideas: combining distinct or separate pieces of information to form a complete whole as a summary."] }
      ]},
      { title: "B. Lexis and Structure", topics: [
        { title: "Synonyms", contents: ["Words and expressions with similar meanings.", "Meaning of words in ordinary, figurative and idiomatic contexts."] },
        { title: "Antonyms", contents: ["Words and expressions with opposite meanings.", "Selecting the opposite meaning that fits the context."] },
        { title: "Clause and Sentence Patterns", contents: ["Recognising sentence structures and clause patterns.", "Choosing grammatically appropriate sentence constructions."] },
        { title: "Word Classes and Their Functions", contents: ["Nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions and other word classes.", "The grammatical functions of words in sentences."] },
        { title: "Grammar and Usage", contents: ["Mood, tense, aspect and number.", "Agreement and concord.", "Positive, comparative and superlative degrees.", "Question tags.", "Mechanics, spelling and ordinary usage."] },
        { title: "Figurative and Idiomatic Usage", contents: ["Interpreting figurative expressions.", "Idioms tested are formal and expressed in Standard British English (SBE).", "Distinguishing ordinary, figurative and idiomatic meanings."] }
      ]},
      { title: "C. Oral Forms", topics: [
        { title: "Vowels", contents: ["Monothongs, diphthongs and triphthongs.", "Making distinctions among vowel types."] },
        { title: "Consonants", contents: ["Consonants, including clusters.", "Differentiating among consonant types.", "Identifying correct pronunciation of individual words and articulation of connected speech."] },
        { title: "Rhymes", contents: ["Rhymes, including homophones."] },
        { title: "Word Stress", contents: ["Word stress in monosyllabic and polysyllabic words."] },
        { title: "Emphatic Stress", contents: ["Emphatic stress in connected speech.", "Placing stress on words in an utterance for emphasis."] }
      ]},
      { title: "D. Structure of the Examination", topics: [
        { title: "Comprehension and Summary", contents: ["Comprehension passage: 5 questions.", "Summary passage: 5 questions.", "Cloze passage: 10 questions.", "Approved reading text: 5 questions."] },
        { title: "Lexis and Structure", contents: ["Sentence interpretation: 5 questions.", "Antonyms: 5 questions.", "Synonyms: 5 questions.", "Basic grammar: 10 questions."] },
        { title: "Oral Forms", contents: ["Vowels: 2 questions.", "Consonants: 2 questions.", "Rhymes: 2 questions.", "Word stress: 2 questions.", "Emphatic stress: 2 questions.", "Total examination length stated in the supplied syllabus: 60 questions."] }
      ]}
    ]
  },
  {
    name: "Mathematics",
    slug: "mathematics",
    icon: "📐",
    description: "The UTME Mathematics syllabus: Number and Numeration, Algebra, Geometry and Trigonometry, Calculus, and Statistics.",
    generalObjectives: [
      "Acquire computational and manipulative skills.",
      "Develop precise, logical and formal reasoning skills.",
      "Develop deductive skills in interpretation of graphs, diagrams and data.",
      "Apply mathematical concepts to resolve issues in daily living."
    ],
    sections: [
      { title: "I. Number and Numeration", topics: [
        { title: "Number Bases and Modular Arithmetic", contents: ["Perform the four basic operations (multiplication, addition, subtraction and division) in different bases from 2 to 10.", "Convert one base to another, including fractional parts.", "Perform operations in modulo arithmetic."] },
        { title: "Fractions, Decimals, Approximations and Percentages", contents: ["Perform the four basic operations (multiplication, addition, subtraction and division) on fractions and decimals.", "Express numbers to specified significant figures and decimal places.", "Calculate percentage errors.", "Calculate simple interest, profit and loss percentages, ratios, proportions and rates.", "Solve problems involving shares and value added tax (VAT)."] },
        { title: "Indices, Logarithms and Surds", contents: ["Laws of indices and equations involving indices.", "Standard form.", "Laws of logarithms and logarithms to a given base.", "Change of base and applications.", "Relationship between indices and logarithms.", "Simplifying, rationalising and performing operations on surds."] },
        { title: "Sets", contents: ["Types of sets: empty, universal, complement, subset, finite, infinite and disjoint sets.", "Algebra of sets and set notation.", "Cardinality of sets.", "Venn diagrams and applications involving not more than three sets."] }
      ]},
      { title: "II. Algebra", topics: [
        { title: "Polynomials", contents: ["Change of subject of formula.", "Addition, subtraction, multiplication and division of polynomials.", "Factorisation of polynomials of degree not exceeding 3, including regrouping, difference of two squares, perfect squares and cubic expressions.", "Roots of polynomials of degree not exceeding 3.", "Factor and remainder theorems.", "Simultaneous equations: one linear and one quadratic.", "Graphs of polynomials of degree not greater than 3, including maximum and minimum values."] },
        { title: "Variation", contents: ["Direct variation.", "Inverse variation.", "Joint variation.", "Partial variation.", "Percentage increase and decrease in variation."] },
        { title: "Inequalities", contents: ["Analytical and graphical solutions of linear inequalities.", "Quadratic inequalities with integral roots only.", "Interpretation of graphs of inequalities."] },
        { title: "Progression", contents: ["The nth term of a progression.", "Sum of arithmetic progressions (A.P.).", "Sum of geometric progressions (G.P.).", "Sum to infinity of a given G.P."] },
        { title: "Binary Operations", contents: ["Closure, commutativity, associativity and distributivity.", "Identity and inverse elements in simple cases."] },
        { title: "Matrices and Determinants", contents: ["Perform basic operations on matrices not exceeding 3 × 3.", "Calculate determinants of matrices not exceeding 3 × 3.", "Compute inverses of 2 × 2 matrices.", "Quadratic and higher-degree equations are excluded from the stated matrix scope."] }
      ]},
      { title: "III. Geometry and Trigonometry", topics: [
        { title: "Euclidean Geometry", contents: ["Properties of angles and lines.", "Triangles, quadrilaterals and general polygons.", "Circle theorems, cyclic quadrilaterals and intersecting chords.", "Construction of special angles such as 30°, 45°, 60°, 75° and 90°."] },
        { title: "Mensuration", contents: ["Lengths and areas of plane figures.", "Lengths of arcs and chords.", "Perimeters and areas of sectors and segments of circles.", "Surface areas and volumes of cuboids, cylinders, cones, pyramids, prisms, spheres and composite figures.", "The Earth as a sphere: longitudes and latitudes; determine distances between two points on the Earth's surface."] },
        { title: "Loci", contents: ["Two-dimensional loci based on geometric principles.", "Loci related to parallel lines, perpendicular bisectors, angle bisectors and circles."] },
        { title: "Coordinate Geometry", contents: ["Midpoint and gradient of a line segment.", "Distance between two points.", "Parallel and perpendicular lines.", "Equations of straight lines: two-point, point-slope, slope-intercept and general forms."] },
        { title: "Trigonometry", contents: ["Trigonometric ratios of angles from −360° to 360°.", "Special angles, including 30°, 45°, 60°, 75°, 90°, 105° and 135°, and their use in simple trigonometric problems.", "Angles of elevation and depression.", "Bearings.", "Areas and solutions of triangles.", "Graphs of sine and cosine.", "Sine and cosine formulae."] }
      ]},
      { title: "IV. Calculus", topics: [
        { title: "Differentiation", contents: ["Limit of a function.", "Differentiation of explicit algebraic functions.", "Differentiation of simple trigonometric functions: sine, cosine and tangent."] },
        { title: "Applications of Differentiation", contents: ["Rate of change.", "Maximum and minimum values."] },
        { title: "Integration", contents: ["Integration of explicit algebraic and simple trigonometric functions.", "Area under a curve in simple cases."] }
      ]},
      { title: "V. Statistics", topics: [
        { title: "Representation of Data", contents: ["Frequency distributions.", "Histograms, bar charts and pie charts."] },
        { title: "Measures of Location", contents: ["Mean, mode and median of grouped and ungrouped data in simple cases.", "Cumulative frequency.", "Using an ogive to find the median, quartiles and percentiles."] },
        { title: "Measures of Dispersion", contents: ["Range.", "Mean deviation.", "Variance.", "Standard deviation for grouped and ungrouped data."] },
        { title: "Permutation and Combination", contents: ["Linear and circular arrangements.", "Arrangements involving repeated objects.", "Simple problems involving permutation and combination."] },
        { title: "Probability", contents: ["Experimental probability, including coin tossing and dice throwing.", "Addition and multiplication of probabilities.", "Mutually exclusive and independent cases."] }
      ]}
    ]
  },
  {
    name: "Biology",
    slug: "biology",
    icon: "🧬",
    description: "The UTME Biology syllabus, grouped into Variety of Organisms, Form and Functions, Ecology, Heredity and Variations, and Evolution.",
    generalObjectives: [
      "Demonstrate sufficient knowledge of the concepts of the diversity, interdependence and unity of life.",
      "Account for continuity of life through reorganization, inheritance and evolution.",
      "Apply biological principles and concepts to everyday life, especially to matters affecting living things, individual, society, the environment, community health and the economy."
    ],
    sections: [
      { title: "A. Variety of Organisms", topics: [
        { title: "Living Organisms", contents: ["Characteristics of living things.", "Cell structure and functions of cell components.", "Levels of organisation: cell, tissue, organ, system and organism.", "Examples include Euglena, Paramecium, epithelial tissues, Hydra, onion bulb and Chlamydomonas."] },
        { title: "Evolution and Classification of Organisms", contents: ["Monera (prokaryotes), including bacteria and blue-green algae.", "Protista, including Amoeba, Euglena and Paramecium.", "Fungi, including mushroom and Rhizopus.", "Plantae: Thallophyta (Spirogyra); Bryophyta (mosses and liverworts, including Brachmenium and Marchantia); Pteridophyta (ferns, including Dryopteris); Spermatophyta, including Gymnosperms (cycads and conifers) and Angiosperms.", "Angiosperms include monocots such as maize and dicots such as waterleaf.", "Plants classified by life-cycle span.", "Animal groups and their distinguishing features, life histories and structural complexity; use the listed organisms to trace stages of life histories and increasing structural complexity.",] },
        { title: "Structural, Functional and Behavioural Adaptations", contents: ["Adaptations in organisms and their environments.", "Structural, functional and behavioural features that aid survival."] }
      ]},
      { title: "B. Form and Functions", topics: [
        { title: "Internal Structure of a Flowering Plant", contents: ["Identify transverse sections of roots, stems and leaves.", "Relate the structure of these organs to their functions.", "Identify supporting tissues: collenchyma, sclerenchyma, xylem and phloem fibres.", "Describe the distribution of supporting tissues in roots, stems and leaves."] },
        { title: "Internal Structure of a Mammal", contents: ["Examine the arrangement of mammalian internal organs.", "Describe the appearance and position of digestive, reproductive and excretory organs."] },
        { title: "Nutrition", contents: ["Compare autotrophic and heterotrophic nutrition, including examples from flowering and non-flowering plants.", "Compare photosynthetic and chemosynthetic nutrition.", "Differentiate holozoic, parasitic, saprophytic and carnivorous-plant nutrition, using the organisms listed in the syllabus.", "Differentiate the light and dark reactions of photosynthesis; explain the roles of light, carbon (IV) oxide and chlorophyll.", "Test leaves for starch as evidence of photosynthesis.", "Identify plant macro- and micro-nutrients and deficiency symptoms of nitrogen, phosphorus and potassium.", "Food classes: carbohydrates, proteins, fats and oils, vitamins, mineral salts and water; sources, nutritional value, deficiency diseases and balanced diet.", "Food tests for starch, reducing sugar, protein, oil and fat.", "Mammalian teeth: structure, types, functions and comparison of human, sheep and dog dental formulae.", "Relate the mammalian alimentary canal and accessory organs (liver, pancreas and gall bladder) to their functions.", "Nutrition processes: ingestion, digestion, absorption and assimilation; digestive enzymes and the end products of carbohydrates, proteins and fats."] },
        { title: "Transport", contents: ["Need for transport in relation to increasing size and complexity.", "Materials transported include excretory products, gases, manufactured food, digested food, nutrients, water and hormones.", "Mammalian circulatory system: heart, arteries, veins and capillaries; functions of the hepatic portal vein, pulmonary artery and vein, aorta, and renal artery and vein.", "Plant vascular system: xylem and phloem and their specific functions.", "Transport media include cytoplasm, cell sap, body fluid, blood and lymph; composition and functions of blood and lymph.", "Diffusion, osmosis, plasmolysis and turgidity; open circulatory systems, transpiration pull, root pressure and active transport."] },
        { title: "Respiration", contents: ["Explain the significance of respiration and the roles of oxygen in releasing energy for living activities.", "Describe the simplified chemical processes of glycolysis and the Krebs cycle with reference to ATP production.", "Respiratory organs and surfaces: body surface, gills, tracheae, lungs, stomata and lenticels.", "Gaseous exchange and heat production in experiments; opening and closing of stomata.", "Aerobic and anaerobic respiration in plants and animals, including the effects of insufficient oxygen on muscles.", "Demonstrate fermentation using yeast cells and sugar solution; state the economic importance of yeast."] },
        { title: "Excretion", contents: ["Define excretion and explain its significance.", "Excretory structures: contractile vacuole, flame cell, nephridium, Malpighian tubule, kidney, stoma and lenticel.", "Kidneys: structure and excretory and osmoregulatory functions; functions and excretory products of lungs and skin.", "Economic importance of plant excretory products, including carbon (IV) oxide, oxygen, tannins, resins, gums, mucilage and alkaloids."] },
        { title: "Support and Movement", contents: ["Need for support and movement.", "Support structures in plants and animals.", "Skeletons, joints and movement."] },
        { title: "Reproduction", contents: ["Asexual and sexual reproduction.", "Reproductive structures and processes in plants and animals.", "Pollination, fertilisation and development."] },
        { title: "Growth", contents: ["Growth in plants and animals.", "Cell division and factors affecting growth."] },
        { title: "Coordination and Control", contents: ["Nervous coordination and the endocrine system.", "Sense organs and responses to stimuli.", "Hormonal control and homeostasis."] }
      ]},
      { title: "C. Ecology", topics: [
        { title: "Factors Affecting Distribution of Organisms", contents: ["Abiotic and biotic factors.", "Effects of environmental factors on distribution and abundance."] },
        { title: "Symbiotic Interactions", contents: ["Interactions among organisms, including mutualism, parasitism and commensalism.", "Plant associations and their effects."] },
        { title: "Natural Habitats", contents: ["Aquatic and terrestrial habitats.", "Habitat characteristics and organism adaptations."] },
        { title: "Local (Nigerian) Biomes", contents: ["Major Nigerian ecological zones and their characteristics.", "Organisms and environmental conditions associated with each biome."] },
        { title: "Ecology of Populations", contents: ["Population size, density and distribution.", "Population growth and factors limiting population size."] },
        { title: "Soil", contents: ["Soil composition, properties and profile.", "Soil types, fertility, erosion and conservation."] },
        { title: "Humans and the Environment", contents: ["Pollution, conservation and resource management.", "Human effects on the environment.", "Ecological conditions that favour the spread of disease."] }
      ]},
      { title: "D. Heredity and Variations", topics: [
        { title: "Variation", contents: ["Continuous and discontinuous variation.", "Sources and significance of variation."] },
        { title: "Heredity", contents: ["Basic principles of inheritance.", "Genes, chromosomes and inheritance patterns.", "Variation within and between populations."] },
        { title: "Biotechnology", contents: ["Applications of biotechnology.", "Uses and implications of biological techniques."] }
      ]},
      { title: "E. Evolution", topics: [
        { title: "Theories of Evolution", contents: ["Lamarck’s and Darwin’s contributions to theories of evolution.", "Natural selection and adaptation.", "Evidence from modern evolutionary theories, including genetic studies and the role of mutation."] },
        { title: "Evidence of Evolution", contents: ["Fossil records.", "Comparative anatomy, physiology and embryology.", "Genetic studies and mutation as evidence used in modern evolutionary theories.", "Trace evolutionary trends in plants and animals."] }
      ]}
    ]
  },
  {
    name: "Chemistry",
    slug: "chemistry",
    icon: "⚗️",
    description: "The UTME Chemistry syllabus covering matter, chemical principles, reactions, elements, compounds, organic chemistry and industry.",
    generalObjectives: [
      "Understand the basic principles and concepts in chemistry.",
      "Interpret scientific data relating to chemistry.",
      "Deduce the relationships between chemistry and other sciences.",
      "Apply the knowledge of chemistry to industry and everyday life."
    ],
    sections: [
      { title: "Physical Chemistry and Basic Principles", topics: [
        { title: "Separation of Mixtures and Purification of Chemical Substances", contents: ["Elements, compounds and mixtures.", "Chemical and physical changes; pure and impure substances.", "Boiling, density, freezing and melting points.", "Evaporation, simple and fractional distillation, sublimation, recrystallisation, chromatography, crystallisation, magnetisation, decantation, filtration and centrifugation."] },
        { title: "Chemical Combination", contents: ["Laws of definite, multiple and reciprocal proportions.", "Law of conservation of matter.", "Chemical symbols, formulae and equations.", "Relative atomic mass based on carbon-12.", "Mole concept and stoichiometry of reactions."] },
        { title: "Kinetic Theory of Matter and Gas Laws", contents: ["Melting, vaporisation, boiling, freezing and condensation in terms of molecular motion.", "Brownian movement.", "Boyle's, Charles's, Avogadro's, Gay-Lussac's, Graham's and Dalton's laws.", "Molar volume and atomicity of gases.", "Ideal gas equation PV = nRT.", "Vapour density, relative molecular mass, ideal and real gases."] },
        { title: "Atomic Structure and Bonding", contents: ["Atomic models, subatomic particles and electronic configuration.", "Periodic table and periodic trends.", "Electrovalent, covalent, coordinate and metallic bonding.", "Hydrogen bonding and van der Waals' forces.", "Shapes of simple molecules: linear, non-linear, tetrahedral and pyramidal."] },
        { title: "Nuclear Chemistry", contents: ["Radioactivity and detection of radiation.", "Natural and artificial radioactivity.", "Nuclear stability and radioactive decay.", "Half-life and simple nuclear calculations.", "Nuclear equations, fusion, fission and applications of radioactivity."] },
        { title: "Solubility", contents: ["Unsaturated, saturated and supersaturated solutions.", "Solubility curves and simple calculations.", "Solvents for fats, oils, perspiration and paints.", "True solutions, suspensions and colloids; properties and examples."] },
        { title: "Environmental Pollution", contents: ["Sources and effects of environmental pollutants.", "Air, water and land pollution.", "Pollution prevention and control."] },
        { title: "Acids, Bases and Salts", contents: ["Properties and definitions of acids and bases.", "Indicators, pH and neutralisation.", "Preparation, properties and uses of salts.", "Hydrolysis and relevant calculations."] },
        { title: "Oxidation and Reduction (Redox)", contents: ["Oxidation and reduction in terms of oxygen, hydrogen and electron transfer.", "Oxidation numbers.", "Balancing simple redox equations and identifying oxidising and reducing agents."] },
        { title: "Electrolysis", contents: ["Electrolytes and non-electrolytes.", "Electrolysis and factors affecting discharge of ions.", "Faraday's laws and simple calculations.", "Applications of electrolysis."] },
        { title: "Energy Changes", contents: ["Heat changes (ΔH) accompanying physical and chemical changes, including dissolution and reactions with water.", "Examples in the source include Na, NaOH, K and NH₄Cl.", "Endothermic (+ΔH) and exothermic (−ΔH) reactions.", "Interpret graphical representations of heat changes.", "Entropy as order-disorder, illustrated by mixing gases and dissolving salts.", "Spontaneity and equilibrium criteria using ΔG; relationship ΔG° = ΔH° − TΔS° and simple calculations."] },
        { title: "Rates of Chemical Reaction", contents: ["Factors affecting reaction rates: temperature, concentration or pressure, surface area and catalysts.", "Examples include hydrochloric acid reacting with sodium thiosulphate, magnesium, or marble; and decomposition of hydrogen peroxide or potassium chlorate with manganese dioxide.", "Reaction-rate curves and the qualitative Arrhenius law and collision theory.", "Effects of light on some reactions, such as halogenation of alkanes.", "Interpret rate curves and solve simple rate problems, including determining activation energy where supported by the graph."] },
        { title: "Chemical Equilibrium", contents: ["Reversible reactions and dynamic equilibrium.", "Factors governing the position of equilibrium.", "Le Chatelier's principle and its industrial applications.", "Predict how changes in conditions affect equilibrium position."] }
      ]},
      { title: "Elements and Their Compounds", topics: [
        { title: "Non-metals and Their Compounds", contents: ["Hydrogen and hydrogen chloride.", "Halogens, chlorine, chlorides and tests.", "Oxygen, ozone, oxides and water.", "Hard and soft water, water treatment and water of crystallisation.", "Sulphur, sulphur oxides, sulphuric acid and related tests.", "Nitrogen, ammonia, ammonium salts and nitric acid.", "Oxygen: laboratory preparation, properties, uses, commercial production from liquid air, oxides, ozone as an allotrope and its atmospheric significance.", "Water: combustion of hydrogen, composition by volume, solvent properties, dissolved atmospheric gases and biological significance; temporary and permanent hardness, softening, town-supply treatment, water of crystallisation, efflorescence, deliquescence and hygroscopy.", "Sulphur: allotropes and uses; preparation, properties and uses of sulphur(IV) oxide and hydrogen sulphide; reactions of sulphur(IV) oxide with alkalis; trioxosulphate(IV) acid and salts; sulphuric and sulphurous acids, contact process, oxidising/dehydrating properties and uses.", "Nitrogen: laboratory preparation and production from liquid air; ammonia by the Haber process, properties, uses and ammonium salts; oxidation of ammonia, nitric acid, nitrates, oxides of nitrogen and the nitrogen cycle.", "Carbon: allotropes; laboratory preparation, properties and uses of carbon(IV) oxide and carbon(II) oxide; action of heat on trioxocarbonate(IV) salts; tests for carbonates, hydrogencarbonates and carbon(IV) oxide; carbon(II) oxide effects on blood; coal types, destructive distillation of wood and coal, coke, synthesis gas and their uses.", "Include the source-listed preparations, properties, uses and specific tests for relevant gases, ions and compounds."] },
        { title: "Metals and Their Compounds", contents: ["General properties and extraction of metals.", "Sodium and its compounds: sodium hydroxide by brine electrolysis and its reactions with aluminium, zinc and lead ions; sodium trioxocarbonate(IV) and sodium hydrogen trioxocarbonate(IV), Solvay process, properties and uses; sodium chloride in seawater, recovery, economic importance and tests for sodium ions.", "Alkaline-earth metals, especially calcium oxide, calcium hydroxide and calcium trioxocarbonate(IV); preparation of calcium oxide from seashells, cement composition, setting of mortar, properties, uses and tests for calcium ions.", "Aluminium: bauxite purification, electrolytic extraction, properties, uses, compounds and tests for aluminium ions; tin: ores, extraction, properties and uses; iron: extraction from sulphide and oxide ores, forms of iron, properties, uses, advantages of steel over iron and tests for Fe²⁺/Fe³⁺; copper: extraction from sulphide and oxide ores, properties, uses, preparation and uses of copper(II) tetraoxosulphate(VI), and tests for copper ions.", "First transition series: electron configuration, oxidation states, complex ions, coloured ions and catalysis.", "Alloys, their constituents, properties and uses."] }
      ]},
      { title: "Organic Chemistry and Applications", topics: [
        { title: "Organic Compounds", contents: ["Tetravalency and catenation of carbon.", "General formulae, IUPAC nomenclature, empirical and molecular formulae.", "Functional groups and isomerism.", "Alkanes: homologous series, physical properties, substitution reactions, halogenated products, structural isomerism (examples up to six carbon atoms), petroleum composition, fractional distillation, major fractions, cracking, reforming, petrochemicals, petrol quality and octane number.", "Alkenes: structural and geometric isomerism, addition and polymerisation reactions, polythene, synthetic rubber, uses and vulcanisation; chemical tests for alkenes.", "Alkynes: ethyne production from water and carbides, simple reactions, properties and chemical tests for terminal alkynes.", "Petroleum, fractional distillation, cracking, reforming and octane number.", "Aromatic hydrocarbons such as benzene.", "Alkanols; alkanals and alkanones; alkanoic acids; alkanoates, including fats and oils, saponification, soap and margarine production and comparison of soaps with detergents; primary, secondary and tertiary alkanamines; carbohydrates, their classes, natural sources and chemical tests; proteins and other organic classes specifically listed in the supplied syllabus.", "Polymers, polymerisation and vulcanisation."] },
        { title: "Chemistry and Industry", contents: ["Chemical industries classified by products; raw materials for each industry; distinction between fine and heavy chemicals; relevance of the industries; links between industrial processes and biotechnology.", "Applications of chemical principles in manufacturing and everyday life."] },
        { title: "Astronomical Chemistry", contents: ["Solar system and planets.", "Composition of the Earth: atmosphere, lithosphere and hydrosphere.", "The Earth's natural satellite.", "Identify the smallest planet that is also the farthest from the Sun."] }
      ]}
    ]
  },
  {
    name: "Physics",
    slug: "physics",
    icon: "🔭",
    description: "The UTME Physics syllabus, from measurements and mechanics through waves, optics, electricity, magnetism and modern physics.",
    generalObjectives: [
      "Sustain their interest in physics.",
      "Develop attitude relevant to physics that encourage accuracy, precision and objectivity.",
      "Interpret physical phenomena, laws, definitions, concepts and other theories.",
      "Demonstrate the ability to solve correctly physics problems using relevant theories and concepts."
    ],
    sections: [
      { title: "Measurements, Mechanics and Properties of Matter", topics: [
        { title: "Measurements and Units", contents: ["Fundamental units: length, mass, time, electric charge, temperature, luminous intensity and amount of substance.", "Derived units and combinations of fundamental quantities.", "Measuring instruments: vernier calipers, metre rule, micrometer screw gauge, measuring cylinder, stop watch and beam balance.", "Dimensions, dimensional analysis and homogeneity of equations.", "Accuracy, estimation of errors, significant figures and standard form."] },
        { title: "Scalars and Vectors", contents: ["Definitions and examples of scalar and vector quantities.", "Relative velocity.", "Resolution of vectors into two perpendicular directions.", "Resultants of two or more vectors, including graphical methods."] },
        { title: "Measurement, Position, Distance and Displacement", contents: ["Concept of displacement.", "Distinction between distance and displacement.", "Position, coordinates and frame of reference.", "Use of measuring instruments and recognition of measurement accuracy.", "Compass and protractor for locating points and directions.", "Cartesian coordinates for positions in the x-y plane.", "Plotting graphs and drawing inferences from graphs."] },
        { title: "Motion", contents: ["Newton’s laws of motion; inertia, mass and force.", "Impulse, momentum, force-time graphs and conservation of linear momentum.", "Translational, oscillatory, rotational, spin and random motion.", "Relative motion and causes of motion.", "Contact forces and field forces.", "Speed, velocity, acceleration and equations of uniformly accelerated motion.", "Motion under gravity; distance-time and velocity-time graphs.", "Instantaneous velocity and acceleration.", "Projectiles: range, maximum height, time of flight and applications.", "Circular motion: angular velocity, angular acceleration, centripetal and centrifugal forces.", "Simple harmonic motion: definition, examples, period, frequency, amplitude, velocity, acceleration and energy changes.", "Forced vibration and resonance."] },
        { title: "Gravitational Field", contents: ["Gravitational force and field.", "Acceleration due to gravity and variation in gravitational field.", "Mass and weight."] },
        { title: "Equilibrium of Forces", contents: ["Equilibrium of coplanar forces.", "Triangle and polygon laws of forces.", "Lami’s theorem.", "Principle of moments and moment of a couple (torque).", "Conditions for equilibrium of rigid bodies under parallel and non-parallel forces.", "Resolution and composition of forces in two perpendicular directions.", "Resultant and equilibrant.", "Centre of gravity and stable, unstable and neutral equilibrium."] },
        { title: "Friction", contents: ["Static and dynamic friction.", "Coefficient of limiting friction and its determination.", "Advantages and disadvantages of friction.", "Methods of reducing friction.", "Qualitative treatment of viscosity and terminal velocity.", "Stokes’ law."] },
        { title: "Work, Energy and Power", contents: ["Definitions of work, energy and power.", "Forms and conservation of energy.", "Energy transformations.", "Interpretation of area under a force-distance curve.", "Sources of energy; renewable and non-renewable energy.", "Energy and society, energy diversification and environmental impacts.", "Dams and energy production, nuclear energy and solar energy.", "Photoelectric effect, solar collectors and solar panels, as listed in the syllabus."] },
        { title: "Simple Machines", contents: ["Levers, pulleys, inclined planes and other simple machines.", "Mechanical advantage, velocity ratio and efficiency."] },
        { title: "Elasticity: Hooke's Law and Young's Modulus", contents: ["Elastic and plastic deformation.", "Hooke's law and force-extension relationships.", "Stress, strain and Young's modulus."] },
        { title: "Pressure", contents: ["Pressure and its units.", "Pressure in solids, liquids and gases.", "Applications of pressure."] },
        { title: "Liquids at Rest", contents: ["Density and relative density.", "Pressure in liquids and atmospheric pressure.", "Upthrust, flotation and Archimedes' principle."] }
      ]},
      { title: "Heat and Properties of Matter", topics: [
        { title: "Temperature and Its Measurement", contents: ["Temperature scales and thermometric properties.", "Thermometers and temperature measurement."] },
        { title: "Quantity of Heat", contents: ["Heat capacity and specific heat capacity.", "Calorimetry and heat exchange."] },
        { title: "Change of State", contents: ["Melting, boiling and changes of state.", "Latent heat of fusion and vaporisation.", "Heating and cooling curves."] },
        { title: "Thermal Expansion", contents: ["Linear, area and volume expansion.", "Expansion of solids, liquids and gases and practical applications."] },
        { title: "Gas Laws", contents: ["Boyle's law, Charles's law and pressure law.", "Combined gas law and simple calculations."] },
        { title: "Vapours", contents: ["Saturated and unsaturated vapour.", "Vapour pressure, boiling and humidity-related concepts."] },
        { title: "Structure of Matter and Kinetic Theory", contents: ["Molecular structure and states of matter.", "Molecular motion and kinetic theory.", "Evidence for molecular motion."] },
        { title: "Heat Transfer", contents: ["Conduction, convection and radiation.", "Applications and prevention of unwanted heat transfer."] }
      ]},
      { title: "Waves, Sound and Optics", topics: [
        { title: "Waves", contents: ["Types of waves and wave motion.", "Wavelength, frequency, period, amplitude and wave speed.", "Reflection, refraction, diffraction and interference where specified."] },
        { title: "Propagation of Sound Waves", contents: ["Production and transmission of sound.", "Speed of sound and factors affecting it.", "Echoes and applications."] },
        { title: "Characteristics of Sound Waves", contents: ["Pitch, loudness and quality.", "Vibrating strings and air columns.", "Resonance, harmonics and overtones."] },
        { title: "Light Energy", contents: ["Nature and propagation of light.", "Sources of light and basic light phenomena."] },
        { title: "Reflection of Light at Plane and Curved Surfaces", contents: ["Laws of reflection.", "Plane and curved mirrors.", "Mirror formula, ray diagrams and magnification.", "Applications such as periscopes, kaleidoscopes and sextants."] },
        { title: "Refraction of Light Through Plane and Curved Surfaces", contents: ["Laws of refraction and refractive index.", "Snell's law, real and apparent depth, and lateral displacement.", "Critical angle and total internal reflection.", "Glass prisms, lenses, lens formula, ray diagrams and magnification."] },
        { title: "Optical Instruments", contents: ["Microscopes, telescopes, projectors, cameras and the human eye.", "Power of a lens and angular magnification.", "Near and far points, sight defects and their corrections."] },
        { title: "Dispersion of Light and Colours", contents: ["Dispersion of white light.", "Spectrum and colours.", "Applications of dispersion."] }
      ]},
      { title: "Electricity and Magnetism", topics: [
        { title: "Electrostatics", contents: ["Electric charges and charging methods.", "Conductors and insulators.", "Electric field, potential and simple electrostatic applications."] },
        { title: "Capacitors", contents: ["Types and functions of capacitors.", "Parallel-plate capacitors and capacitance.", "Factors affecting capacitance.", "Capacitors in series and parallel and energy stored."] },
        { title: "Electric Cells", contents: ["Simple voltaic cell and its defects.", "Daniell, Leclanché, lead-acid, nickel-iron, lithium-ion and other listed cells.", "Maintenance, arrangements and efficiency of cells."] },
        { title: "Current Electricity", contents: ["EMF, potential difference, current, internal resistance and lost volts.", "Ohm's law, resistivity and conductivity.", "Measurement of resistance and metre bridge.", "Series and parallel resistors, potentiometer and electrical networks.", "Kirchhoff's laws."] },
        { title: "Electrical Energy and Power", contents: ["Electrical energy and power.", "Commercial units of electrical energy.", "Transmission of electrical power.", "Heating effects of current, house wiring, fuses and parallel arrangements."] },
        { title: "Magnets and Magnetic Fields", contents: ["Properties of magnets and magnetic fields.", "Magnetic field patterns and the Earth's magnetic field.", "Applications of magnets."] },
        { title: "Force on a Current-Carrying Conductor in a Magnetic Field", contents: ["Force on a current-carrying conductor.", "Motor effect and applications.", "Factors affecting the force."] },
        { title: "Electromagnetic Induction", contents: ["Induced EMF and current.", "Faraday's and Lenz's laws.", "Generators, transformers, inductors and eddy currents."] },
        { title: "Simple AC Circuits", contents: ["AC current and voltage.", "Peak and RMS values.", "Resistors, capacitors and inductors in AC circuits.", "R-L-C circuits, reactance, impedance, phase angle, power factor and resonance."] },
        { title: "Conduction of Electricity Through Liquids and Gases", contents: ["Electrolytes and non-electrolytes.", "Electrolysis and Faraday's laws.", "Applications including electroplating and ammeter calibration.", "Discharge through gases and its applications."] }
      ]},
      { title: "Modern Physics and Emerging Technologies", topics: [
        { title: "Elementary Modern Physics", contents: ["Bohr's and Rutherford's atomic models and their limitations.", "Atomic structure, energy levels and spectra.", "Thermionic and photoelectric emissions.", "Einstein's photoelectric equation and stopping potential.", "X-rays, radioactivity, nuclear energy, mass defect, binding energy and wave-particle duality as listed in the syllabus."] },
        { title: "Introductory Electronics", contents: ["Conductors, semiconductors and insulators.", "Intrinsic and extrinsic semiconductors, n-type and p-type.", "Electron and hole carriers.", "Diodes, rectification and transistor amplification."] },
        { title: "Introduction to Fibre Optics and Lasers", contents: ["Fibre optics and transmission of light through optical fibres.", "Applications in communication, medicine and local area networks.", "Meaning and types of lasers.", "Laser applications and safety hazards."] }
      ]}
    ]
  }
  ,
  {
    name: "Government", slug: "government", icon: "🏛️",
    description: "UTME Government syllabus arranged by the four parts in the supplied JAMB syllabus.",
    generalObjectives: [
      "Appreciate the meaning of Government.",
      "Analyse the framework and specify the institutions of Government.",
      "Appreciate the basic principles of democratic governance and their application in Nigeria.",
      "Explain the concept of citizenship and define the duties and obligations of a citizen.",
      "Appreciate the process of political development in Nigeria.",
      "Evaluate the political development and problems of governance in Nigeria.",
      "Understand the determinants and dynamics of foreign policy as they relate to Nigeria.",
      "Assess the role of Nigeria as a member of the international community and the workings of international organizations."
    ],
    sections: [
      { title: "PART I: ELEMENTS OF GOVERNMENT", topics: [
        { title: "Definition and Scope of Government", contents: ["Definition of Government as an institution", "Characteristics of Government", "Functions of Government"] },
        { title: "Basic Concepts of Government", contents: ["Power, influence, authority, legitimacy and sovereignty", "Society, state, nation and nation-state", "Political socialization, political participation and political culture"] },
        { title: "Forms of Government", contents: ["Monarchy, aristocracy, oligarchy, autocracy, republicanism and democracy", "Definitions, features, merits and demerits of each form"] },
        { title: "Arms of Government", contents: ["The legislature: types and structure", "The executive: types and functions", "The judiciary: functions and powers", "Relationships among the arms of government"] },
        { title: "Structures of Governance", contents: ["Unitary government: features, reasons for adoption, merits and demerits", "Federal government: features, reasons for adoption, merits and demerits", "Confederal government: features and reasons for adoption"] },
        { title: "Systems of Governance", contents: ["Presidential, parliamentary and monarchical systems", "Features, merits and demerits of each system"] },
        { title: "Political Ideologies", contents: ["Major political ideologies and their principles", "Comparison of political ideologies", "Communalism, feudalism, capitalism, socialism, communism, totalitarianism, fascism, Nazism and liberalism; compare ideologies and their modes of production."] },
        { title: "Constitution", contents: ["Meaning, sources, types and functions of a constitution", "Constitutional development and constitutionalism", "Written and unwritten constitutions; rigid and flexible constitutions; sources and functions of constitutions."] },
        { title: "Principles of Democratic Government", contents: ["Democracy and its principles", "Representation, rule of law, separation of powers and checks and balances", "Ethics and accountability in public office; separation of powers; checks and balances; individual and collective responsibility; constitutionalism; rule of law; representative government; centralisation and decentralisation."] },
        { title: "Processes of Legislation", contents: ["Stages and procedures involved in making laws", "Legislative enactments include Acts, Edicts, Bye-laws, delegated legislation and Decrees."] },
        { title: "Citizenship", contents: ["Meaning and types of citizenship", "Methods of acquiring citizenship", "Citizenship rights, duties and obligations", "Dual citizenship and renunciation", "Obligations of the state"] },
        { title: "The Electoral Process", contents: ["Suffrage: evolution and types", "Elections: types and ingredients of free and fair elections", "Electoral systems: types, advantages and disadvantages", "Electoral commissions and their functions"] },
        { title: "Political Parties and Party Systems", contents: ["Meaning and functions of political parties", "Party systems and their characteristics"] },
        { title: "Pressure Groups", contents: ["Definition, types, functions and methods of operation", "Differences between pressure groups and political parties"] },
        { title: "Public Opinion", contents: ["Meaning and formation of public opinion", "Methods of assessing public opinion", "Functions and limitations"] },
        { title: "The Civil Service / Public Service", contents: ["Definition, characteristics and functions", "Role and significance in public administration"] }
      ]},
      { title: "PART II: POLITICAL DEVELOPMENT IN NIGERIA", topics: [
        { title: "Pre-colonial Polities", contents: ["Structural organization of pre-colonial political systems", "Functions of political institutions and office holders"] },
        { title: "Imperialist Penetration", contents: ["British process of acquisition", "British colonial administrative system", "French colonial administrative system", "Impact of British colonial rule"] },
        { title: "Process of Decolonization", contents: ["Nationalism: meaning and types", "Emergence of nationalist movements and parties", "Nationalist leaders: Herbert Macaulay, Nnamdi Azikiwe, Obafemi Awolowo, Ahmadu Bello, Ladipo Solanke, Aminu Kano, J. S. Tarka and Tafawa Balewa", "Impact of external forces and the decolonization process"] },
        { title: "Constitutional Development in Nigeria", contents: ["Hugh Clifford Constitution (1922)", "Arthur Richards Constitution (1946)", "John Macpherson Constitution (1951)", "Oliver Lyttleton Constitution (1954)", "Independence Constitution (1960): features, merits and demerits"] },
        { title: "Post-independence Constitutions", contents: ["Post-independence constitutions: 1963, 1979, 1989 and 1999 (as amended); characteristics, shortcomings, merits and demerits"] },
        { title: "Institutions of Government in the Post-independence Period", contents: ["Legislative structures and functions", "Executive structure and functions", "Judiciary structure and functions", "Government agencies and institutions"] },
        { title: "Public Commissions Established by the State", contents: ["Civil Service Commission; Public Complaints Commission; Electoral Commissions; National Boundary Commission; Independent Corrupt Practices and Other Related Offences Commission; Economic and Financial Crimes Commission—objectives, functions and problems"] },
        { title: "Political Parties and Party Politics in Nigeria", contents: ["First Republic", "Second Republic", "Third Republic", "Fourth Republic", "Ideologies, structures and composition of political parties"] },
        { title: "The Structure and Workings of Nigerian Federalism", contents: ["Rationale for a federal system", "Tiers of government and their relationships", "Creation of states in 1963, 1967 and subsequent periods", "Problems of Nigerian federalism and solutions adopted"] },
        { title: "Public Corporations and Parastatals", contents: ["Definition, types and purpose", "Finance, control and problems", "Deregulation, privatization and commercialization", "Comparison between public and private enterprises"] },
        { title: "Local Government", contents: ["Evolution and administration of local government", "Features and structure", "Traditional rulers and local government", "Problems of local government"] },
        { title: "The Military in Nigerian Politics", contents: ["Factors leading to military intervention", "Structure of military regimes", "Political, social and economic impact of military rule", "Processes of military disengagement"] }
      ]},
      { title: "PART III: FOREIGN POLICY AND NIGERIA’S RELATIONSHIP WITH THE INTERNATIONAL COMMUNITY", topics: [
        { title: "Foreign Policy", contents: ["Definition and purpose", "Determining factors", "Formulation of foreign policy"] },
        { title: "Nigeria’s Foreign Policy", contents: ["Relations with major powers", "Relations with developing countries", "Nigeria’s Non-Alignment Policy"] },
        { title: "Nigeria’s Relations with African Countries", contents: ["Africa as the centrepiece of Nigeria’s foreign policy", "NEPAD: origin, objectives and activities"] },
        { title: "Nigeria in International Organizations", contents: ["United Nations", "Commonwealth", "Organization of African Unity", "African Union", "Nigeria’s involvement and the contribution of these organizations to Nigeria"] }
      ]},
      { title: "PART IV: INTERNATIONAL ORGANIZATIONS", topics: [
        { title: "International Organizations", contents: ["ECOWAS", "OAU and AU", "Commonwealth", "OPEC", "Objectives, operations and roles of the organizations in world affairs", "Study objectives, operations and roles in world affairs of ECOWAS, OAU, AU, the Commonwealth and OPEC."] }
      ]}
    ]
  },
  {
    name: "Literature in English", slug: "literature-in-english", icon: "📚",
    description: "JAMB Literature in English syllabus, including genre study, literary appreciation and the prescribed-text list shown in the supplied PDF.",
    generalObjectives: [
      "Stimulate and sustain interest in Literature in English.",
      "Create awareness of the general principles of Literature and the functions of language.",
      "Appreciate literary works of all genres and across cultures.",
      "Apply knowledge of Literature in English to understanding cultural literature and political and economic activities in society."
    ],
    sections: [
      { title: "1. Drama", topics: [
        { title: "Types of Drama", contents: ["Tragedy", "Comedy", "Tragicomedy", "Melodrama", "Farce", "Opera", "Types include tragedy, comedy, tragicomedy, melodrama, farce and opera.", "Identify, analyse, compare and contrast the features of different dramatic types."] },
        { title: "Dramatic Techniques", contents: ["Characterisation and dialogue", "Flashback and mime", "Costume, music and dance", "Décor and scenery", "Acts and scenes", "Soliloquy and aside", "Figures of speech", "Stage directions and playwrights’ styles", "Characterisation, dialogue, flashback, mime, costume, music and dance, décor/scenery, acts and scenes, soliloquy, aside and figures of speech.", "Recognise stage directions and distinguish the styles of selected playwrights."] },
        { title: "Interpretation of Prescribed Drama Texts", contents: ["Theme and plot", "Socio-political context", "Setting: spatial setting and temporal period", "Applying lessons of a play to social reality"] }
      ]},
      { title: "2. Prose", topics: [
        { title: "Types of Prose", contents: ["Fiction: novel, novella/novelette and short story", "Non-fiction: biography, autobiography and memoir", "Faction: combination of fact and fiction", "Prose fiction: novel, novella/novelette and short story.", "Non-fiction: biography, autobiography and memoir; faction combines fact and fiction.", "Classify prescribed texts and analyse prose components, including the balance between fact and fiction."] },
        { title: "Narrative Techniques and Devices", contents: ["Point of view: omniscient, first person, second person and third person", "Stream of consciousness and epiphany", "Characterisation: round, flat, foil, hero, antihero, villain and heroine", "Narrative style and devices used in prose fiction", "Point of view: omniscient, first person, second person and third person; stream of consciousness and epiphany.", "Character types include round, flat, foil, hero, antihero, villain and heroine.", "Language: grammar, diction and clarity of expression."] },
        { title: "Textual Analysis", contents: ["Themes and thematic preoccupation", "Plot and structure", "Setting and context", "Character and characterization", "Author’s narrative style and the interpretation of prescribed prose texts"] }
      ]},
      { title: "3. Poetry", topics: [
        { title: "Types of Poetry", contents: ["Sonnet", "Ode", "Lyrics", "Elegy", "Ballad", "Panegyric", "Epic", "Blank verse", "Sonnet, ode, lyrics, elegy, ballad, panegyric, epic and blank verse."] },
        { title: "Poetic Devices", contents: ["Figures of speech and sound devices", "Poetic language, imagery, rhythm and other devices specified in the syllabus", "Imagery; sound devices including rhyme, rhythm, repetition, pun and onomatopoeia; diction and persona.", "Explain how poetic devices create aesthetic effects, convey messages and meaning, and identify figures of speech."] },
        { title: "Appreciation", contents: ["Interpretation of poems", "Deducing the poet’s thematic preoccupation", "Relating a poem’s meaning and techniques to its context"] }
      ]},
      { title: "4. General Literary Terms", topics: [
        { title: "Literary Terms", contents: ["Literary terms and concepts used in the analysis of drama, prose and poetry", "Terms include foreshadowing, suspense, theatre, monologue, dialogue, soliloquy, symbolism, protagonist, antagonist, figures of speech, satire, stream of consciousness, synecdoche and metonymy.", "Identify terms specific to drama, prose and poetry and areas of overlap among genres, such as verse in drama and poetry or narration across genres."] }
      ]},
      { title: "5. Literary Appreciation", topics: [
        { title: "Unseen Literary Passages", contents: ["Unseen passages or extracts from drama, prose and poetry", "Identify literary devices in a given extract", "Interpret the extract", "Relate the extract to real-life experiences", "Unseen extracts may be from drama, prose or poetry.", "Identify literary devices, interpret the extract and relate it to real-life experiences."] },
        { title: "Prescribed Drama Texts", contents: ["African: Efua Sutherland, Marriage of Anansewa", "Non-African: Williams Shakespeare, Anthony and Cleopatra (as spelled in the supplied PDF)"] },
        { title: "Prescribed Prose Texts", contents: ["African: Pede Hollist, So the Path Does not Die", "African: Elma Shaw, Redemption Road", "Non-African: Susanne Bellefeuille, Path of Lucas: The Journey He Endured"] },
        { title: "Prescribed Poetry", contents: ["African: Gabriel Okara, Once Upon a Time", "African: Elizabeth L.A. Kamara, New Tongue", "African: Wole Soyinka, Night", "African: Niyi Osundare, Not my Business", "African: S.O.H. Afriyie-Vidza, Hearty Garlands", "African: Syl Cheney-Coker, The Breast of the Sea", "Non-African: Lord Byron, She Walks in Beauty", "Non-African: Geoffrey Chaucer, The Nun’s Priest Tale (shortened)", "Non-African: Fleur Adcock, The Telephone Call", "Non-African: Wilfred Wilson Gipson, The Stone"] },
        { title: "Recommended Anthologies and Critical Texts", contents: ["Obafemi and Agoi (eds), Of Shadows and Rainbows – Musings in Times of Covid", "Hayward (ed.), The Penguin Book of English Verse", "Johnson, Ker, Maduka and Obafemi (eds), New Poetry from Africa", "Kermode, Oxford Anthology of English Literature, Vol. II", "Ofiono and Okenyodo (eds), Camouflage: Best of Contemporary Writing from Nigeria", "Parker (ed.), A Pageant of Longer Poems (spelled ‘Peagent’ in the supplied PDF)", "Senanu and Vincent (eds), A Selection of African Poetry", "Soyinka (ed.), Poems of Black Africa", "Abrams, A Glossary of Literary Terms", "Emeaba, A Dictionary of Literature", "Murphy, Understanding Unseen: An Introduction to English Poetry and English Novel for Overseas Students"] }
      ]}
    ]
  },
  {
    name: "Commerce", slug: "commerce", icon: "🛍️",
    description: "The 16 numbered topics in the supplied JAMB Commerce syllabus, with the listed content areas retained.",
    generalObjectives: [
      "Acquire the basic knowledge of Commerce.",
      "Examine the relationship between Commerce and other related fields.",
      "Apply the principles of Commerce in the Nigerian economy.",
      "Appreciate dynamic and positive changes in commercial activities."
    ],
    sections: [
      { title: "1. Commerce", topics: [
        { title: "Meaning, Scope, Characteristics and Functions", contents: ["Meaning of e-commerce and e-business", "Meaning and scope of Commerce", "Characteristics of Commerce", "Functions of Commerce", "Relationship between Commerce and related subjects"] }
      ]},
      { title: "2. Occupation", topics: [
        { title: "Meaning, Types and Choice of Occupation", contents: ["Meaning and importance", "Industrial, commercial and service occupations", "Factors determining choice of occupation"] }
      ]},
      { title: "3. Production", topics: [
        { title: "Factors, Types and Organization of Production", contents: ["Factors of production and their rewards: land, labour, capital and entrepreneur", "Division of labour and specialization", "Primary, secondary and tertiary production", "Relationship between production, specialization and exchange"] }
      ]},
      { title: "4. Trade", topics: [
        { title: "Home Trade: Retail and Wholesale", contents: ["Types of retail trade, functions, factors in setting up retail trade, trends, advantages and disadvantages, and reasons for success or failure", "Types of wholesalers, channels of distribution, functions, advantages and disadvantages", ] },
        { title: "Foreign Trade", contents: ["Types of foreign trade", "Balance of trade, balance of payments and counter-trade", "Procedures and documents for export, import and entrepôt trade", "Barriers to international trade", "Tariffs and reasons for their imposition", "Trade restriction and export promotion", "Role of Customs and Excise Authority, Ports Authority and related agencies", ] }
      ]},
      { title: "5. Purchase and Sale of Goods", topics: [
        { title: "Procedures, Documents, Terms and Payments", contents: ["Enquiry, quotation, order, invoice, pro forma invoice, statement of accounts, indent, consular invoice, bill of lading, certificate of origin and consignment note", "Trade discount, quantity discount, cash discount, warranties, COD, CIF, FOB and EOE", "Cash and credit payments; types, functions, merits and demerits of credit", "Legal tender, bank notes and coins, cheques, standing orders, bank drafts, stamps, postal and money orders, bills of exchange, promissory notes, mail transfer, traveller’s cheques, telegraphic transfer, e-payment and recharge cards", ] }
      ]},
      { title: "6. Aids-to-trade", topics: [
        { title: "Advertising", contents: ["Meaning and roles", "Types, media and methods", "Advantages and disadvantages", ] },
        { title: "Banking", contents: ["Types of banks, services, challenges and e-banking", ] },
        { title: "Communication", contents: ["Process and procedure, types, trends, merits and demerits, and barriers", "Contributions of courier services and GSM to business"] },
        { title: "Insurance", contents: ["Types, principles, terms, importance and types of risk"] },
        { title: "Tourism", contents: ["Meaning and forms, importance, agencies promoting tourism in Nigeria, challenges and tourist centres"] },
        { title: "Transportation", contents: ["Modes, importance, advantages and disadvantages"] },
        { title: "Warehousing", contents: ["Importance, types and functions", "Factors considered when siting a warehouse"] }
      ]},
      { title: "7. Business Units", topics: [
        { title: "Forms, Registration and Choice of Business Units", contents: ["Forms and features of sole proprietorships, partnerships, limited liability companies, public corporations and co-operative societies", "Registration of businesses", "Factors determining choice of business unit", "Dissolution and liquidation", "Merits and demerits of business units", "Reasons for government ownership of public enterprises", ] }
      ]},
      { title: "8. Financing Business", topics: [
        { title: "Sources and Types of Capital", contents: ["Personal savings, shares and bonds, loans, debentures, mortgage, bank overdraft, retained profit, credit purchase and leasing", "Share capital, owned capital, authorized, issued, called-up and paid-up capital, liquid capital, working capital and owners’ equity", "Calculation of gross and net profit, forms of capital and turnover", "Problems of sourcing finance", "Role of Bureau de Change in an economy", ] }
      ]},
      { title: "9. Trade Associations", topics: [
        { title: "Associations, Chambers of Commerce and Business Combinations", contents: ["Objectives and functions of trade and manufacturers’ associations, including the Cocoa Farmers’ Association, Garri Sellers’ Association and Poultry Farmers’ Association", "Objectives and functions of Chambers of Commerce", "Forms of business combination and merger", ] }
      ]},
      { title: "10. Money", topics: [
        { title: "Evolution, Forms, Qualities and Functions of Money", contents: ["Origin and evolution of money", "Forms and qualities of money", "Functions of money"] }
      ]},
      { title: "11. Stock Exchange", topics: [
        { title: "Stock Exchange and Securities", contents: ["Importance and functions of the Stock Exchange", "Types of securities: stocks, shares, bonds and debentures", "Procedure of transactions and speculations", "Second-Tier Securities Market: listing requirements, types of companies, advantages and operating regulations", ] }
      ]},
      { title: "12. Elements of Business Management", topics: [
        { title: "Business Management", contents: ["Management functions: planning, organizing, staffing, coordinating, motivating, communicating and controlling", "Principles: span of control, unity of command, delegation of authority and related principles", "Organizational structures: line, line-and-staff, functional, matrix and committee", "Functional areas: production, marketing, finance and personnel", "Business resources: man, money, materials, machines, opportunities and goodwill", ] }
      ]},
      { title: "13. Elements of Marketing", topics: [
        { title: "Marketing", contents: ["Importance and functions of marketing", "Marketing concept: consumer orientation, customer satisfaction and integrated marketing", "Marketing mix: product, price, place and promotion", "Market segmentation", "Public relations and customer service", "E-marketing", ] }
      ]},
      { title: "14. Legal Aspects of Business", topics: [
        { title: "Business Law and Consumer Protection", contents: ["Meaning and validity of a simple contract", "Agency, Sale of Goods Act and Hire Purchase Act", "Contract of employment and rights and obligations of employers and employees", "Government regulation of business, registration, patents, trademarks and copyright", "Consumer protection: government legislation, Standards Organization, Trade Descriptions Act, Consumer Protection Council, NAFDAC, NDLEA, Customs and Excise", "Regulatory agencies and the provision of safe goods and drugs"] }
      ]},
      { title: "15. Commodity Exchange", topics: [
        { title: "Commodity Exchange", contents: ["Meaning of commodity exchange", "Types of tradable commodities: agricultural produce, solid minerals, oil and gas", "Requirements for trading: grading system, warehousing, clearing system and standardizing", "Methods of trading: open outcry and electronic mechanism", "Benefits of commodity exchange", "Constraints to commodity trading", ] }
      ]},
      { title: "16. Business Environment and Social Responsibility", topics: [
        { title: "Business Environment", contents: ["Legal, political, economic, social, cultural and technological environments", ] },
        { title: "Social Responsibility", contents: ["Safe products, philanthropic and societal considerations", "Types and implications of pollution: water, air and land"] }
      ]},
      { title: "Recommended Texts", topics: [
        { title: "JAMB-Listed Commerce References", contents: ["Adedokun, Udokogu and Ogunji, Senior Secondary Commerce Books One, Two and Three", "Anderson, Commerce for West Africa", "Ahukannah et al., Commerce for Secondary Schools", "Asaolu and Igwe, New Syllabus Commerce for Secondary Schools", "Azuh and Soyibo, Comprehensive Certificate Commerce for Secondary Schools", "Babatunde, Handbook on Commerce for Schools and Colleges", "Ibru, Nigeria: The Promise of Tourism", "Igwe et al., Countdown to WASSCE/SSCE/NECO/JME Commerce", "James et al., Management", "Nwachukwu, Management Theory and Practice", "Odedokun et al., Commerce for Senior Secondary Schools", "Odoom, Commerce for Senior Secondary Schools", "Onifade, Management: Office Business Education", "Onu, Marketing Today", "Pallister and Isaacs (eds), A Dictionary of Business", "Ubaka, Commerce Simplified for SSS 1–3", "Longe, Essential Commerce for Secondary Schools"] }
      ]}
    ]
  },
  {
    name: "Christian Religious Studies", slug: "christian-religious-studies", icon: "✝️",
    description: "JAMB CRS syllabus organized by its four official sections, with biblical references retained for key syllabus content.",
    generalObjectives: [
      "Acquire knowledge and understanding of the tenets of the Christian faith as contained in the Bible.",
      "Interpret biblical teachings and themes.",
      "Apply biblical teachings and tenets to life in society.",
      "Evaluate the level of application of biblical teachings and tenets to life in society."
    ],
    sections: [
      { title: "SECTION A: Themes from Creation to the Division of the Kingdom", topics: [
        { title: "1. The Sovereignty of God", contents: ["Meaning of sovereignty", "God as Creator and Controller of the Universe (Genesis 1–2; Amos 9:5–6; Isaiah 45:5–12; Psalm 19:1–6; Jeremiah 18:1–16; Romans 8:28)", "The sequence of creation and humanity’s role in advancing God’s purpose", "God’s sovereignty in the affairs of people and nations"] },
        { title: "2. The Covenant", contents: ["Biblical covenants and their significance", "Responsibilities and promises associated with the covenant"] },
        { title: "3. Leadership Qualities", contents: ["Examples of leadership in the Old Testament", "Qualities and lessons from biblical leaders"] },
        { title: "4. Divine Providence, Guidance and Protection", contents: ["God’s providence and guidance in the lives of biblical figures", "Protection and lessons for believers"] },
        { title: "5. Parental Responsibility", contents: ["Biblical examples and responsibilities of parents"] },
        { title: "6. Obedience and Disobedience", contents: ["Obedience to God", "Disobedience and its consequences"] },
        { title: "7. A Man after God’s Own Heart", contents: ["David as an example; relevant biblical narrative and lessons"] },
        { title: "8. Decision-making", contents: ["Biblical examples of decision-making and their consequences"] }
      ]},
      { title: "SECTION B: Themes from the Division of the Kingdom to the Return from Exile and the Prophets", topics: [
        { title: "1. Greed and Its Effects", contents: ["Ahab and Gehazi; consequences of greed in the biblical narratives"] },
        { title: "2. The Supremacy of God", contents: ["Biblical accounts demonstrating God’s supremacy"] },
        { title: "3. Religious Reforms in Judah", contents: ["Reforms and their religious and social significance"] },
        { title: "4. Concern for Judah", contents: ["Prophetic concern and messages relating to Judah"] },
        { title: "5. Faith, Courage and Protection", contents: ["Biblical examples of faith and courage and divine protection"] },
        { title: "6. God’s Message to Nineveh", contents: ["Jonah’s mission and the response of Nineveh"] },
        { title: "7. Social Justice, True Religion and Divine Love", contents: ["Prophetic teaching on justice, worship and love"] },
        { title: "8. Holiness and Divine Call", contents: ["Prophetic calling and the demand for holiness"] },
        { title: "9. Punishment and Hope", contents: ["Prophetic messages of judgement, restoration and hope"] }
      ]},
      { title: "SECTION C: Themes from the Four Gospels and Acts of the Apostles", topics: [
        { title: "1. The Birth and Early Life of Jesus", contents: ["Birth and early-life narratives", "John the Baptist as forerunner"] },
        { title: "2. The Baptism and Temptation of Jesus", contents: ["Accounts, significance and lessons of the baptism and temptation"] },
        { title: "3. Discipleship", contents: ["Calling of disciples, commitment and responsibilities"] },
        { title: "4. Miracles", contents: ["Nature miracles: stilling the storm (Mt. 8:23–27; Mk. 4:35–41; Lk. 8:22–25); feeding the five thousand (Mt. 14:13–24; Mk. 6:30–44; Lk. 9:10–17; Jn. 6:1–13); walking on the sea (Mt. 14:22–26; Mk. 6:45–52; Jn. 6:16–21); changing water to wine (Jn. 2:1–11)", "Resuscitation miracles: raising of Lazarus (Jn. 11:1–45), Jairus’ daughter (Lk. 8:41–42, 49–56; Mk. 5:21–43) and the widow’s son at Nain (Luke 7)"] },
        { title: "5. The Parables", contents: ["Parables of Jesus and their meanings, context and lessons"] },
        { title: "6. Sermon on the Mount", contents: ["Major teachings and their practical implications"] },
        { title: "7. Mission of the Disciples", contents: ["Instructions and mission of the disciples"] },
        { title: "8. The Great Confession", contents: ["Peter’s confession and its significance"] },
        { title: "9. The Transfiguration", contents: ["Narrative, significance and lessons"] },
        { title: "10. The Triumphal Entry and Cleansing of the Temple", contents: ["Events and their significance"] },
        { title: "11. The Last Supper", contents: ["Events, meaning and lessons"] },
        { title: "12. The Trials and Death of Jesus", contents: ["Trials, crucifixion and significance"] },
        { title: "13. Resurrection, Appearances and Ascension", contents: ["Resurrection accounts, appearances and ascension"] },
        { title: "14. Jesus’ Teachings about Himself", contents: ["Claims and teachings of Jesus about himself"] },
        { title: "15. Love", contents: ["Christian love as taught by Jesus"] },
        { title: "16. Fellowship in the Early Church", contents: ["Life and fellowship of the early Christian community"] },
        { title: "17. The Holy Spirit and the Mission of the Church", contents: ["The Holy Spirit and the church’s mission"] },
        { title: "18. Opposition to the Gospel Message", contents: ["Opposition to early Christian preaching"] },
        { title: "19. Mission to the Gentiles", contents: ["Paul and the expansion of the Christian mission"] }
      ]},
      { title: "SECTION D: Themes from Selected Epistles", topics: [
        { title: "1. Justification by Faith", contents: ["Meaning and teaching of justification by faith"] },
        { title: "2. The Law and Grace", contents: ["Relationship between law and grace"] },
        { title: "3. New Life in Christ", contents: ["Transformation and Christian conduct"] },
        { title: "4. Christians as Joint Heirs with Christ", contents: ["Meaning and implications of being joint heirs"] },
        { title: "5. Humility", contents: ["Epistolary teaching on humility"] },
        { title: "6. Forgiveness", contents: ["Forgiveness and reconciliation"] },
        { title: "7. Spiritual Gifts", contents: ["Kinds, use and purpose of spiritual gifts"] },
        { title: "8. Christian Giving", contents: ["Principles and practice of Christian giving"] },
        { title: "9. Civic Responsibility", contents: ["Christian responsibilities toward civil authority and society"] },
        { title: "10. Dignity of Labour", contents: ["Work, responsibility and dignity of labour"] },
        { title: "11. The Second Coming of Christ", contents: ["Teaching on the second coming"] },
        { title: "12. Impartiality", contents: ["Impartiality in Christian conduct"] },
        { title: "13. Effective Prayer", contents: ["Prayer and its practice"] },
        { title: "14. Christian Living in the Community", contents: ["Ethical living and community relationships"] },
        { title: "15. Corruption", contents: ["Christian teaching on corruption and integrity"] },
        { title: "16. Sexual Immorality", contents: ["Epistolary teaching on sexual morality"] }
      ]}
    ]
  },
  {
    name: "Islamic Religious Studies", slug: "islamic-religious-studies", icon: "☪️",
    description: "JAMB Islamic Religious Studies syllabus organized into Qur’an and Hadith, Tawhid and Fiqh, and Islamic History.",
    generalObjectives: [
      "Master the Qur’an and Sunnah as foundations of Islamic and social life.",
      "Be familiar with Islamic heritage, culture and civilization.",
      "Be acquainted with the tradition of Islamic scholarship and intellectual discourse.",
      "Demonstrate knowledge of Islamic moral, spiritual, economic, political and social values.",
      "Be exposed to the fundamental principles of Islam.",
      "Be prepared to face the challenges of life as good practising Muslims."
    ],
    sections: [
      { title: "PART I: THE QUR’AN AND HADITH", topics: [
        { title: "1. Revelation of the Glorious Qur’an", contents: ["The Prophet’s visits to Cave Hira and the first revelation", "The Prophet’s reaction to the first revelation and its importance", "Modes of revelation (Q.42:51)", "Piecemeal revelation (Q.17:106; Q.25:32)", "Names and attributes of the Qur’an"] },
        { title: "1b. Preservation of the Glorious Qur’an", contents: ["Recording, compilation and standardization", "Differences between Makkan and Madinan suwar", "Role of the Companions in collection and compilation"] },
        { title: "1c. Importance of the Glorious Qur’an as a Source of Guidance", contents: ["The Qur’an as a source of guidance in spiritual, moral, economic, political and socio-cultural matters"] },
        { title: "1d. Divine Authenticity of the Glorious Qur’an", contents: ["Divine authenticity, uniqueness and preservation of the Qur’an, including Q.4:82; Q.41:42; Q.39:27; Q.17:88; Q.75:16–19 and Q.15:9"] },
        { title: "2. Tafsir", contents: ["Historical development and sources of Tafsir", "Importance of Tafsir", "Types of Tafsir and their comparison"] },
        { title: "3. Introduction to Tajwid", contents: ["Meaning and importance of Tajwid", "Theory and practice of Tajwid"] },
        { title: "4. Study of Arabic Texts: Selected Surahs", contents: ["al-Fatihah (Q.1)", "al-Adiyat (Q.100)", "al-Qari’ah (Q.101)", "at-Takathur (Q.102)", "al-Asr (Q.103)", "al-Humazah (Q.104)", "al-Ma’un (Q.107)", "al-Kawthar (Q.108)", "al-Kafirun (Q.109)", "an-Nasr (Q.110)", "al-Masad (Q.111)", "al-Ikhlas (Q.112)", "al-Falaq (Q.113)", "an-Nas (Q.114)"] },
        { title: "5. Study of Further Arabic Texts", contents: ["al-A’la (Q.87)", "ad-Duha (Q.93)", "al-Inshirah (Q.94)", "at-Tin (Q.95)", "al-Alaq (Q.96)", "al-Qadr (Q.97)", "al-Bayyinah (Q.98)", "al-Zalzalah (Q.99)", "Ayatul-Kursiyy (Q.2:255)", "Amanar-Rasul (Q.2:285–286)", "Laqad ja’akum (Q.9:128–129)"] },
        { title: "6. Hadith", contents: ["History and authentication of Hadith", "Isnad and matn", "Sahih, Hasan and Da’if", "Six sound collectors and Muwatta of Imam Malik", "Selected Nawawi Hadith: 1, 3, 5, 6, 7, 9, 10, 11, 12, 13, 15, 16, 18, 19, 21, 22, 25, 27, 34 and 41", "Relationship between Hadith and the Qur’an"] },
        { title: "7. Moral Lessons in the Qur’an and Hadith", contents: ["Wisdom, goodness to parents, honesty, prohibited earnings and financial wrongdoing", "Alcohol, gambling, stealing, fraud, intoxicants and extravagance", "Dignity of labour, modesty, family conduct and sexual morality", "Leadership, justice, trust, obligations, promises and piety (taqwa)", "Patience, unity, brotherhood, enjoining what is right and forbidding what is wrong", "Apply the cited Qur’anic verses and Hadith to daily life"] }
      ]},
      { title: "PART II: TAWHID AND FIQH", topics: [
        { title: "8. Tawhid and the Oneness of Allah", contents: ["Oneness and attributes of Allah; relevant Qur’anic verses including Q.3:18 and Q.2:255", "Prophethood and the message of Prophet Muhammad (SAW), including universality and finality"] },
        { title: "9. Shirk and Practices Incompatible with Islamic Principles", contents: ["Idol worship, ancestral worship, Trinity and atheism", "Superstition, fortune-telling, magic, cult worship and bid’ah", "Relevant Qur’anic references and avoidance of prohibited practices"] },
        { title: "10. Articles of Faith", contents: ["Existence, attributes and works of Allah", "Belief in angels", "Belief in Allah’s books", "Belief in prophets, including Ulul-azmi", "The Last Day, resurrection and destiny"] },
        { title: "10. Ibadat and Their Types", contents: ["Good deeds and their significance (including cited Qur’anic passages and the 26th Nawawi Hadith)", "Taharah: istinja/istijmar, wudu, tayammum and ghusl; types and importance", "Salah: importance, description, types and things that vitiate salah", "Zakah: types (including zakatul-fitr and zakatul-mal), importance, collection, disbursement, eligible recipients, and distinction from sadaqah", "Sawm: fard, sunnah, qada and kaffarah; importance, exemptions and things that vitiate fasting", "Hajj: importance, Ifrad, Qiran and Tamattu, essentials, conditions, and differences between Hajj and Umrah", "Jihad: concept, kinds, manner and lessons, following the cited syllabus passages"] },
        { title: "11. Family Matters", contents: ["Marriage: importance, prohibited categories, conditions, rights and duties of spouses", "Polygamy and its significance", "Ill-treatment of wife and the Islamic position", "Divorce: types, duration and significance, including Ila, Zihar and Li’an", "Inheritance: heirs and their shares"] },
        { title: "12. Sources and Schools of Law", contents: ["The four major sources: Qur’an, Sunnah, Ijma‘ and Qiyas", "The four Sunni schools of law and their founders; contributions of the founders"] },
        { title: "13. Islamic Economic System", contents: ["Islamic attitude to Riba (Q.2:275–280; Q.3:130; Q.4:161) and the cited Hadith", "At-tatfif (Q.83:1–6) and its negative consequences", "Hoarding (ihtikar; Q.9:34) and its implications for society", "Islamic sources of revenue: Zakah, Jizyah, Kharaj and Ghanimah", "Baitul-mal as an institution of socio-economic welfare and its uses in the Ummah", "Differences between the Islamic and Western economic systems"] },
        { title: "14. Islamic Political System", contents: ["Allah as Sovereign (Q.3:26–27)", "Shurah (consultation; Q.3:159; Q.42:38)", "Adalah (justice; Q.5:9; Q.4:58, 135) and Mas’uliyah (accountability; Q.17:36; Q.102:8)", "Rights of non-Muslims in an Islamic state (Q.2:256; Q.6:108)", "Differences between the Islamic and Western political systems"] }
      ]},
      { title: "PART III: ISLAMIC HISTORY AND CIVILIZATION", topics: [
        { title: "15. Pre-Islamic Arabia (Jahiliyyah)", contents: ["Jahiliyyah practices: idol worship, infanticide, polyandry, gambling, usury and other practices identified in the syllabus", "Islamic reforms to Jahiliyyah practices"] },
        { title: "16. The Life of Prophet Muhammad (SAW)", contents: ["Birth and early life", "Call to Prophethood", "Da‘wah in Makkah and Madinah", "Hijrah", "Administration of the Ummah in Madinah", "Battles of Badr, Uhud and Khandaq: causes and effects", "Treaty of al-Hudaibiyyah and the conquest of Makkah", "Hijjatul-wada (farewell pilgrimage), sermon and lessons", "Qualities of Prophet Muhammad (SAW) and lessons from them"] },
        { title: "17. The Rightly Guided Caliphs", contents: ["The lives, leadership and contributions of al-Khulafa’u ar-Rashidun"] },
        { title: "18. Early Contact of Islam with Africa", contents: ["Circumstances leading to the Hijrah to Abyssinia", "Spread of Islam to Egypt and reasons for its spread", "Roles of traders, teachers, preachers, Murabitun, Sufi orders and Mujaddidun in spreading Islam in West Africa"] },
        { title: "19. Impact of Islam in West Africa", contents: ["Influence on the socio-political life of Ghana, Mali, Songhai and Borno", "Impact on the economic life of Timbuktu, Kano and Borno"] },
        { title: "20. Contributions of Islam to Education", contents: ["Development of written history in Arabic and Sankore University", "Contributions of Ahmad Baba of Timbuktu, Sheikh al-Maghili, Sheikh Uthman Dan Fodio, Sultan Muhammad Bello and Ibn Battuta", "Educational institutions: House of Wisdom in Baghdad, al-Azhar University in Cairo and Nizamiyyah University in Baghdad", "Contributions of Ibn Sina, al-Ghazali, Ibn Rushd, ar-Razi and Ibn Khaldun to medicine, education, philosophy, fiqh and historiography"] }
      ]},
      { title: "Recommended Texts", topics: [
        { title: "JAMB-Listed Islamic Studies References", contents: ["M.O.A. Abdul, Studies in Islam Series Books 2 and 3; The Classical Caliphate", "Abdulrahman and Canham, The Ink of the Scholar", "A.Y. Ali, The Holy Qur’an Text: Translation and Commentary", "M.M. Ali, The Religion of Islam", "A.R.I. Doi, Shariah: The Islamic Law", "M. Hay Lal, The Life of Muhammad (SAW)", "A. Lemu, Islamic Studies for SSS and related texts", "S.Q. Muhammad, al-Burhanu fi tajwidil Qur’an", "M.O. Opeloye, A Dictionary of Peoples and Places in the Qur’an", "A.A.B. Philips, Usool at-Tafseer", "Y.A. Quadri et al., Al-Iziyyah for the English Audience", "A. Rahim, Islamic History", "M.B. Sambo et al., Islamic Religious Knowledge for WASC", "J.S. Trimingham, A History of Islam in West Africa"] }
      ]}
    ]
  }
];

export function getUtmeSyllabusSubject(slug: string) {
  return UTME_SYLLABUS.find((subject) => subject.slug === slug);
}
