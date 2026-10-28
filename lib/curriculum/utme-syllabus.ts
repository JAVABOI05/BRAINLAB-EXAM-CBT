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
        { title: "Number Bases and Modular Arithmetic", contents: ["Operations in bases from 2 to 10.", "Conversion from one base to another, including fractional parts.", "Modular arithmetic."] },
        { title: "Fractions, Decimals, Approximations and Percentages", contents: ["Fractions and decimals.", "Significant figures and decimal places.", "Percentage errors.", "Simple interest.", "Profit and loss percentages.", "Ratio, proportion and rate.", "Shares and value added tax (VAT)."] },
        { title: "Indices, Logarithms and Surds", contents: ["Laws of indices and equations involving indices.", "Standard form.", "Laws of logarithms and logarithms to a given base.", "Change of base and applications.", "Relationship between indices and logarithms.", "Simplifying, rationalising and performing operations on surds."] },
        { title: "Sets", contents: ["Types of sets: empty, universal, complement, subset, finite, infinite and disjoint sets.", "Algebra of sets and set notation.", "Cardinality of sets.", "Venn diagrams and applications involving not more than three sets."] }
      ]},
      { title: "II. Algebra", topics: [
        { title: "Polynomials", contents: ["Change of subject of formula.", "Addition, subtraction, multiplication and division of polynomials.", "Factorisation of polynomials of degree not exceeding 3.", "Roots of polynomials of degree not exceeding 3.", "Factor and remainder theorems.", "Simultaneous equations: one linear and one quadratic.", "Graphs of polynomials of degree not greater than 3, including maximum and minimum values."] },
        { title: "Variation", contents: ["Direct variation.", "Inverse variation.", "Joint variation.", "Partial variation.", "Percentage increase and decrease in variation."] },
        { title: "Inequalities", contents: ["Analytical and graphical solutions of linear inequalities.", "Quadratic inequalities with integral roots only.", "Interpretation of graphs of inequalities."] },
        { title: "Progression", contents: ["The nth term of a progression.", "Sum of arithmetic progressions (A.P.).", "Sum of geometric progressions (G.P.).", "Sum to infinity of a given G.P."] },
        { title: "Binary Operations", contents: ["Closure, commutativity, associativity and distributivity.", "Identity and inverse elements in simple cases."] },
        { title: "Matrices and Determinants", contents: ["Algebra of matrices not exceeding 3 × 3.", "Determinants of matrices not exceeding 3 × 3.", "Inverses of 2 × 2 matrices.", "Quadratic and higher-degree equations are excluded from the stated matrix scope."] }
      ]},
      { title: "III. Geometry and Trigonometry", topics: [
        { title: "Euclidean Geometry", contents: ["Properties of angles and lines.", "Triangles, quadrilaterals and general polygons.", "Circle theorems, cyclic quadrilaterals and intersecting chords.", "Construction of special angles such as 30°, 45°, 60°, 75° and 90°."] },
        { title: "Mensuration", contents: ["Lengths and areas of plane figures.", "Lengths of arcs and chords.", "Perimeters and areas of sectors and segments of circles.", "Surface areas and volumes of simple solids and composite figures.", "The Earth as a sphere: longitudes and latitudes."] },
        { title: "Loci", contents: ["Two-dimensional loci based on geometric principles.", "Loci related to parallel lines, perpendicular bisectors, angle bisectors and circles."] },
        { title: "Coordinate Geometry", contents: ["Midpoint and gradient of a line segment.", "Distance between two points.", "Parallel and perpendicular lines.", "Equations of straight lines: two-point, point-slope, slope-intercept and general forms."] },
        { title: "Trigonometry", contents: ["Trigonometric ratios of angles.", "Angles of elevation and depression.", "Bearings.", "Areas and solutions of triangles.", "Graphs of sine and cosine.", "Sine and cosine formulae."] }
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
        { title: "Evolution and Classification of Organisms", contents: ["Monera (prokaryotes), including bacteria and blue-green algae.", "Protista, including Amoeba, Euglena and Paramecium.", "Fungi, including mushroom and Rhizopus.", "Plantae: Thallophyta, Bryophyta, Pteridophyta and Spermatophyta.", "Gymnosperms and angiosperms; monocots and dicots.", "Plants classified by life-cycle span.", "Animal groups and their distinguishing features, life histories and structural complexity."] },
        { title: "Structural, Functional and Behavioural Adaptations", contents: ["Adaptations in organisms and their environments.", "Structural, functional and behavioural features that aid survival."] }
      ]},
      { title: "B. Form and Functions", topics: [
        { title: "Internal Structure of a Flowering Plant", contents: ["Internal structure of roots, stems and leaves.", "Relationship between plant structures and their functions."] },
        { title: "Nutrition", contents: ["Modes of nutrition in plants and animals.", "Photosynthesis and factors affecting it.", "Autotrophic and heterotrophic nutrition.", "Feeding mechanisms, food classes and balanced diet."] },
        { title: "Transport", contents: ["Transport systems in plants and animals.", "Diffusion, osmosis and active transport.", "Blood, circulation and transport of materials."] },
        { title: "Respiration", contents: ["Aerobic and anaerobic respiration.", "Respiratory structures and gaseous exchange.", "Significance of respiration and energy release."] },
        { title: "Excretion", contents: ["Meaning and significance of excretion.", "Excretory products and organs in plants and animals.", "Removal of metabolic wastes and regulation of internal conditions."] },
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
        { title: "Theories of Evolution", contents: ["Major theories explaining evolution.", "Natural selection and adaptation."] },
        { title: "Evidence of Evolution", contents: ["Fossils.", "Comparative anatomy and embryology.", "Other evidence used to explain evolutionary relationships."] }
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
        { title: "Energy Changes", contents: ["Exothermic and endothermic reactions.", "Energy changes during chemical reactions.", "Energy diagrams and related calculations."] },
        { title: "Rates of Chemical Reaction", contents: ["Factors affecting reaction rate.", "Collision theory and activation energy.", "Experimental measurement and interpretation of reaction rates."] },
        { title: "Chemical Equilibrium", contents: ["Reversible reactions and dynamic equilibrium.", "Le Chatelier's principle and industrial applications.", "Equilibrium constants and effects of conditions on equilibrium."] }
      ]},
      { title: "Elements and Their Compounds", topics: [
        { title: "Non-metals and Their Compounds", contents: ["Hydrogen and hydrogen chloride.", "Halogens, chlorine, chlorides and tests.", "Oxygen, ozone, oxides and water.", "Hard and soft water, water treatment and water of crystallisation.", "Sulphur, sulphur oxides, sulphuric acid and related tests.", "Nitrogen, ammonia, ammonium salts and nitric acid.", "Other syllabus-listed non-metals and their compounds, properties, preparations, uses and tests."] },
        { title: "Metals and Their Compounds", contents: ["General properties and extraction of metals.", "Sodium and its compounds.", "Calcium compounds and cement.", "Aluminium, tin, iron and copper: extraction, properties, uses and tests.", "First transition series: electron configuration, oxidation states, complex ions, coloured ions and catalysis.", "Alloys, their constituents, properties and uses."] }
      ]},
      { title: "Organic Chemistry and Applications", topics: [
        { title: "Organic Compounds", contents: ["Tetravalency and catenation of carbon.", "General formulae, IUPAC nomenclature, empirical and molecular formulae.", "Functional groups and isomerism.", "Alkanes, alkenes and alkynes; properties, reactions and uses.", "Petroleum, fractional distillation, cracking, reforming and octane number.", "Aromatic hydrocarbons such as benzene.", "Alcohols, aldehydes, ketones, carboxylic acids, esters and other syllabus-listed classes.", "Polymers, polymerisation and vulcanisation."] },
        { title: "Chemistry and Industry", contents: ["Industrial chemical processes and their raw materials.", "Applications of chemical principles in manufacturing and everyday life."] },
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
];

export function getUtmeSyllabusSubject(slug: string) {
  return UTME_SYLLABUS.find((subject) => subject.slug === slug);
}
