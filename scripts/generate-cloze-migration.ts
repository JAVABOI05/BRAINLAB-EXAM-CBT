// Script to generate the comprehensive Cloze Test integration migration
// Generates:
// 1. questions_subject_check constraint update
// 2. questions_section_check constraint update (adds 'cloze')
// 3. Indexes on passage_id and Cloze lookup
// 4. Row Level Security policies for exam_blueprints, reading_texts, high_yield_topics, duplicate_question_reviews, exam_attempt_snapshots, and competition_* tables
// 5. 23 complete Cloze passages with 10 questions each (230 questions total)

import * as fs from "fs";
import * as path from "path";

interface ClozeQuestionData {
  blankNum: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

interface ClozePassageData {
  id: string;
  title: string;
  text: string;
  questions: ClozeQuestionData[];
}

// 23 distinct authentic Cloze passages across academic registers
const passages: ClozePassageData[] = [
  {
    id: "CLOZE_001",
    title: "Environmental Conservation and the African Sahel",
    text: "Desertification in the arid margins of the Sahel has accelerated at an unprecedented rate over the past two decades. Severe ecological degradation, compounded by prolonged droughts and unsustainable pastoral practices, has stripped vast expanses of arable land of their protective vegetative [1]. In response, regional coalitions launched the Great Green Wall Initiative, an ambitious conservation campaign aimed at restoring millions of hectares through systematic [2]. However, agronomic experts emphasize that planting alone cannot guarantee environmental [3]. Without proactive community involvement, rigorous water [4] techniques, and sustainable grazing regimes, saplings face high mortality rates in the harsh sub-Saharan climate. Furthermore, shifting demographic pressures have intensified competition for scarce fertile soils, frequently sparking communal [5] between nomadic herders and sedentary farmers. To mitigate these frictions, agricultural extension agents are introducing drought-resilient crop varieties that require minimal irrigation and resist endemic [6]. The ultimate goal is to foster an ecological balance where human livelihood and nature coexist without exhausting subterranean [7] reserves. Unless decisive fiscal support is committed by international development partners, these reforestation efforts risk becoming mere [8] gestures. Comprehensive monitoring, utilizing high-resolution satellite [9], is therefore indispensable to evaluate sapling survival and assess vegetative density over time. Only through such sustained scientific oversight can vulnerable ecosystems be shielded from irreversible environmental [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "cover", option_b: "blanket", option_c: "coating", option_d: "shield", correct_answer: "A", explanation: "'Vegetative cover' is the standard botanical and ecological collocation referring to plants covering the soil surface." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "deforestation", option_b: "afforestation", option_c: "cultivation", option_d: "germination", correct_answer: "B", explanation: "'Afforestation' refers to the establishment of a forest or stand of trees in an area where there was no previous tree cover." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "resilience", option_b: "rigidity", option_c: "fragility", option_d: "obsolescence", correct_answer: "A", explanation: "'Resilience' denotes the capacity of an ecosystem to recover quickly from environmental stress and difficulties." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "evaporation", option_b: "harvesting", option_c: "depletion", option_d: "dilution", correct_answer: "B", explanation: "'Water harvesting' is the technical agronomic term for collecting and storing rainwater for irrigation." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "harmony", option_b: "conflicts", option_c: "accords", option_d: "alliances", correct_answer: "B", explanation: "'Conflicts' accurately describes disputes or confrontations between herders and farmers over scarce grazing resources." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "pests", option_b: "predators", option_c: "livestock", option_d: "minerals", correct_answer: "A", explanation: "Crops are bred to resist agricultural 'pests' and diseases in agronomic contexts." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "aquifer", option_b: "canal", option_c: "gutter", option_d: "estuary", correct_answer: "A", explanation: "An 'aquifer' is an underground layer of water-bearing permeable rock or gravel, fitting 'subterranean aquifer reserves'." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "symbolic", option_b: "genuine", option_c: "tangible", option_d: "colossal", correct_answer: "A", explanation: "'Symbolic gestures' denotes actions done merely as a token without real practical impact." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "telephony", option_b: "imagery", option_c: "frequency", option_d: "broadcast", correct_answer: "B", explanation: "'Satellite imagery' is the standard technical term for photographic maps captured by orbital satellites." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "collapse", option_b: "prosperity", option_c: "renewal", option_d: "stagnation", correct_answer: "A", explanation: "'Ecological collapse' is the recognized term describing catastrophic systemic breakdown of an ecosystem." },
    ]
  },
  {
    id: "CLOZE_002",
    title: "Public Health and Epidemiological Surveillance",
    text: "When an unknown pathogen emerges in a densely populated urban center, public health authorities must act with extraordinary [1] to contain the transmission chain. The initial phase of outbreak management demands rigorous contact [2], whereby field epidemiologists identify and monitor individuals exposed to confirmed patients. Simultaneously, clinical laboratories must develop diagnostic [3] that deliver rapid, dependable results without excessive false positives. If the transmission rate exceeds the baseline threshold, the localized outbreak threatens to escalate into a full-scale [4]. Medical facilities often become overwhelmed, facing acute shortages of protective [5] such as respirators, face shields, and sterile gowns. Under such intense pressure, governments face the difficult dilemma of imposing mandatory [6] to restrict population movement, despite the inevitable economic ramifications. Public communication must remain transparent and evidence-based to dispel harmful [7] and conspiratorial rumors circulating on social media. As candidate pharmaceutical compounds undergo clinical [8] to ascertain efficacy and patient safety, health agencies organize logistical frameworks for widespread immunization. Achieving herd [9] remains the definitive milestone for safeguarding vulnerable demographics who cannot be vaccinated due to pre-existing contraindications. Ultimately, post-crisis evaluations offer critical insights to fortify national emergency [10] against prospective microbial threats.",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "hesitation", option_b: "promptitude", option_c: "reluctance", option_d: "indifference", correct_answer: "B", explanation: "'Promptitude' denotes promptness and speed in action, essential during a disease outbreak." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "tracing", option_b: "stalking", option_c: "shadowing", option_d: "surveying", correct_answer: "A", explanation: "'Contact tracing' is the standard epidemiological term for finding and monitoring people exposed to an infected person." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "assays", option_b: "guesses", option_c: "hypotheses", option_d: "prescriptions", correct_answer: "A", explanation: "'Diagnostic assays' are investigative laboratory procedures for qualitatively assessing or quantitatively measuring a target substance." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "epidemic", option_b: "quarantine", option_c: "remission", option_d: "convalescence", correct_answer: "A", explanation: "An 'epidemic' is a widespread occurrence of an infectious disease in a community at a particular time." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "gear", option_b: "drapery", option_c: "costume", option_d: "attire", correct_answer: "A", explanation: "'Protective gear' (specifically Personal Protective Equipment / PPE) is the established healthcare term." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "lockdowns", option_b: "celebrations", option_c: "assemblies", option_d: "amnesty", correct_answer: "A", explanation: "'Lockdowns' refers to emergency protocols restricting movement to contain disease spread." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "misinformation", option_b: "truth", option_c: "dogma", option_d: "science", correct_answer: "A", explanation: "'Misinformation' correctly denotes false or inaccurate information spread regardless of intent." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "trials", option_b: "tribulations", option_c: "hearings", option_d: "inquests", correct_answer: "A", explanation: "'Clinical trials' is the established biomedical term for rigorous research studies evaluating medical treatments." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "immunity", option_b: "instinct", option_c: "mentality", option_d: "behavior", correct_answer: "A", explanation: "'Herd immunity' is the standard immunological term for collective resistance to the spread of an infectious disease." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "preparedness", option_b: "complacency", option_c: "fatigue", option_d: "neglect", correct_answer: "A", explanation: "'Emergency preparedness' is the standard institutional term for readiness to respond to disasters." },
    ]
  },
  {
    id: "CLOZE_003",
    title: "Artificial Intelligence and the Modern Digital Economy",
    text: "The rapid integration of artificial intelligence into enterprise software has fundamentally altered corporate [1] models worldwide. Modern generative algorithms are capable of analyzing vast repositories of unstructured data, recognizing subtle patterns, and producing synthetic outputs with astonishing [2]. In customer support operations, autonomous intelligent agents handle thousands of inquiries simultaneously, significantly reducing operational [3]. However, computer scientists warn that algorithms trained on biased historical datasets will inevitably perpetuate institutional [4]. Addressing algorithmic fairness requires rigorous testing of deep neural networks to prevent discriminatory outcomes in loan underwriting, recruitment, and predictive [5]. Furthermore, cybersecurity experts express growing alarm over the malicious utilization of sophisticated language models to generate deceptive [6] attacks. These synthetic communications mimic legitimate executive emails, tricking employees into disclosing sensitive access credentials. From a macroeconomic perspective, automation threatens to displace millions of clerical jobs, prompting urgent calls for nationwide workforce [7] programs. Educational curricula must prioritize digital literacy, critical thinking, and mathematical foundations to prepare school leavers for tomorrow's employment [8]. Intellectual property rights also face novel quandaries, as creators debate whether copyrighted material should be ingested without explicit [9] or monetary remuneration. Policymakers must therefore formulate robust regulatory frameworks that foster technological innovation while upholding consumer privacy and ethical [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "business", option_b: "merchandise", option_c: "commodity", option_d: "retail", correct_answer: "A", explanation: "'Business models' is the standard economic phrase describing how an enterprise creates and delivers value." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "fidelity", option_b: "ambiguity", option_c: "falsity", option_d: "crudeness", correct_answer: "A", explanation: "'Fidelity' in computing and media refers to exactness, accuracy, and degree of realism." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "overhead", option_b: "turnover", option_c: "revenue", option_d: "dividend", correct_answer: "A", explanation: "'Operational overhead' is the standard business accounting term for running expenses of an enterprise." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "prejudices", option_b: "virtues", option_c: "veracities", option_d: "objectivities", correct_answer: "A", explanation: "'Perpetuate institutional prejudices' aligns with algorithmic bias derived from skewed datasets." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "policing", option_b: "legislation", option_c: "election", option_d: "litigation", correct_answer: "A", explanation: "'Predictive policing' is the technical term for using machine learning algorithms to forecast potential criminal activity." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "phishing", option_b: "debugging", option_c: "encrypting", option_d: "compiling", correct_answer: "A", explanation: "'Phishing attacks' refers to fraudulent attempts to obtain sensitive information by disguising as a trustworthy entity." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "reskilling", option_b: "retrenchment", option_c: "demotion", option_d: "attrition", correct_answer: "A", explanation: "'Workforce reskilling' is the standard term for training workers in new skills to adapt to changing job markets." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "landscape", option_b: "scenery", option_c: "panorama", option_d: "spectacle", correct_answer: "A", explanation: "'Employment landscape' is the customary idiomatic expression for the overall state and makeup of the labor market." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "consent", option_b: "coercion", option_c: "dissent", option_d: "denial", correct_answer: "A", explanation: "Intellectual property use requires 'explicit consent' from creators before ingesting their content." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "integrity", option_b: "duplicity", option_c: "apathy", option_d: "infraction", correct_answer: "A", explanation: "'Ethical integrity' is the standard phrase denoting adherence to moral and ethical principles." },
    ]
  },
  {
    id: "CLOZE_004",
    title: "Agricultural Mechanisation and Food Security",
    text: "Sustaining a booming national population requires a strategic transition from subsistence farming to commercial, mechanised [1]. In developing economies, smallholder farmers produce the lion's share of dietary staples, yet their output remains severely constrained by antiquated implements and inadequate access to credit. Without modern tractors, combine harvesters, and precision seeders, cultivating expansive acreages demands grueling manual [2]. Post-harvest losses represent another catastrophic drain on agricultural productivity, with millions of metric tons of perishable produce rotting due to deficient storage [3]. Developing cold-chain logistics and hermetic grain silos is therefore imperative to preserve harvests between growing seasons and stabilize food [4]. Furthermore, erratic precipitation patterns exacerbated by global climate variability make reliance on rain-fed agriculture exceptionally [5]. Governments must invest heavily in irrigation schemes to ensure reliable year-round crop production. Extension officers play a crucial role by educating rural cooperatives on modern agronomic practices, such as soil testing, balanced [6], and crop rotation. In addition to staple grains, promoting agro-processing industries adds economic value, creating sustainable employment for rural youth and stemming urban [7]. Commercial banks have historically hesitated to extend agricultural loans due to perceived risks of crop failure and default; however, innovative credit-guarantee [8] can de-risk lending and encourage private capital flows. Expanding access to verified high-yield seeds further guarantees increased crop [9] per hectare. Only when these multifaceted bottlenecks are systematically addressed can national food sovereignty be successfully [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "agriculture", option_b: "horticulture", option_c: "floriculture", option_d: "aquaculture", correct_answer: "A", explanation: "'Mechanised agriculture' is the broad, accurate term encompassing full-scale farming operations." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "labor", option_b: "leisure", option_c: "deliberation", option_d: "contemplation", correct_answer: "A", explanation: "'Manual labor' is the standard collocation describing physical work performed with hands." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "facilities", option_b: "luxuries", option_c: "ornaments", option_d: "impediments", correct_answer: "A", explanation: "'Storage facilities' is the established technical phrase for warehouses, silos, and cold storage." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "prices", option_b: "famines", option_c: "rations", option_d: "tastes", correct_answer: "A", explanation: "Preserving harvests between seasons prevents wild price volatility, thus stabilizing food 'prices'." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "precarious", option_b: "invulnerable", option_c: "lucrative", option_d: "impervious", correct_answer: "A", explanation: "'Precarious' means dangerously unstable, uncertain, or risky, describing rain-fed agriculture under changing climate." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "fertilisation", option_b: "inundation", option_c: "fumigation", option_d: "stagnation", correct_answer: "A", explanation: "'Soil testing and balanced fertilisation' is the standard agricultural science pairing." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "migration", option_b: "congestions", option_c: "planning", option_d: "architecture", correct_answer: "A", explanation: "'Urban migration' (or rural-urban migration) describes rural populations moving to cities." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "schemes", option_b: "hoaxes", option_c: "illusions", option_d: "gambles", correct_answer: "A", explanation: "'Credit-guarantee schemes' is the official financial term for government/institutional loan de-risking mechanisms." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "yield", option_b: "loss", option_c: "residue", option_d: "spoilage", correct_answer: "A", explanation: "'Crop yield' is the standard agronomic term for the volume of crop harvested per unit of land." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "attained", option_b: "abandoned", option_c: "forfeited", option_d: "diminished", correct_answer: "A", explanation: "'Attained' means achieved through effort, fitting 'food sovereignty be successfully attained'." },
    ]
  },
  {
    id: "CLOZE_005",
    title: "Constitutional Law and the Separation of Powers",
    text: "The doctrine of separation of powers is the cornerstone of constitutional democracy, designed to thwart the concentration of unchecked authority in any single governmental organ. By apportioning state authority across the executive, legislative, and judicial branches, the constitution institutes an intricate matrix of checks and [1]. The legislature is vested with the exclusive prerogative to enact laws and approve public [2], thereby holding the national purse strings. Conversely, the executive branch possesses administrative enforcement powers, charged with executing legislative enactments through civil [3] agencies. The judiciary functions as the impartial arbiter of disputes, interpreting statutory provisions and preserving constitutional [4]. An independent judicial bench is indispensable; judges must be insulated from political retribution through secure tenure and non-diminishable [5]. When the executive or legislative branch oversteps its statutory boundaries, citizens may institute legal actions seeking judicial [6]. Through this mechanism, superior courts possess the solemn mandate to declare ultra vires acts null, void, and of no [7]. However, judicial activism must be balanced against legitimate self-restraint, ensuring that tribunals do not usurp the policymaking sphere reserved for elected [8]. The protection of fundamental human rights, including freedom of expression and personal [9], hinges upon this delicate institutional equilibrium. Whenever the rule of law is undermined by executive fiat, democratic legitimacy erodes, paving the way for authoritarian [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "balances", option_b: "weights", option_c: "counterparts", option_d: "remedies", correct_answer: "A", explanation: "'Checks and balances' is the universally recognized constitutional law maxim." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "expenditure", option_b: "debts", option_c: "donations", option_d: "tariffs", correct_answer: "A", explanation: "'Approve public expenditure' is the standard legal and fiscal term for parliamentary appropriation." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "service", option_b: "court", option_c: "war", option_d: "unrest", correct_answer: "A", explanation: "'Civil service' refers to the permanent professional administrative branch of a government." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "supremacy", option_b: "defiance", option_c: "servitude", option_d: "obsolescence", correct_answer: "A", explanation: "'Constitutional supremacy' is the legal doctrine establishing the constitution as the highest law of the land." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "emoluments", option_b: "penalties", option_c: "bribes", option_d: "levies", correct_answer: "A", explanation: "'Emoluments' denotes the salaries, fees, or profit from employment or office, protected for judicial independence." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "review", option_b: "pardon", option_c: "immunity", option_d: "amnesty", correct_answer: "A", explanation: "'Judicial review' is the legal process where courts examine the lawfulness of actions taken by public bodies." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "effect", option_b: "interest", option_c: "record", option_d: "value", correct_answer: "A", explanation: "'Null, void, and of no effect' is the classic canonical common law legal phrase." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "representatives", option_b: "monarchs", option_c: "magistrates", option_d: "oligarchs", correct_answer: "A", explanation: "'Elected representatives' refers to legislators chosen democratically by the populace." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "liberty", option_b: "capture", option_c: "subjugation", option_d: "detention", correct_answer: "A", explanation: "'Personal liberty' is the foundational constitutional right protecting individuals from unlawful arrest." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "rule", option_b: "anarchy", option_c: "liberation", option_d: "justice", correct_answer: "A", explanation: "'Authoritarian rule' refers to governance characterized by strict obedience to authority at the expense of personal freedom." },
    ]
  },
  {
    id: "CLOZE_006",
    title: "Urban Planning and Mass Rapid Transit Systems",
    text: "Rapid urbanization across sub-Saharan Africa has strained municipal infrastructure, turning daily vehicular commuting into an agonizing [1]. In sprawling metropolises, road networks built decades ago cannot absorb the exponential surge in private motor vehicles, resulting in perpetual traffic [2]. To alleviate urban gridlock, civil engineers and urban planners advocate for massive investments in integrated mass rapid [3] networks. High-capacity light rail lines, supported by dedicated bus rapid transit corridors, offer energy-efficient mobility by transporting tens of thousands of commuters per hour. Beyond moving passengers expeditiously, electrified suburban trains drastically curtail greenhouse gas emissions, improving ambient air [4] in crowded city centers. However, executing large-scale municipal infrastructure demands formidable capital expenditure and rigorous feasibility [5]. City authorities must negotiate complex land acquisition procedures and resolve right-of-way disputes with private [6]. Urban developers also emphasize transit-oriented development, ensuring that high-density commercial centers and residential complexes cluster around multimodal transport [7]. Walkability should be encouraged through shaded pedestrian walkways, dedicated cycling lanes, and well-lit overhead footbridges. When public transport options are clean, affordable, and punctual, citizens willingly abandon their personal cars, decreasing highway [8]. The transition also demands sustainable tariff structures, where government subsidies cushion low-income earners without inducing fiscal [9] for the operating agency. Ultimately, modern cities must be planned for people rather than automobiles, creating inclusive urban environments where economic vibrancy is backed by seamless [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "ordeal", option_b: "delight", option_c: "picnic", option_d: "trifle", correct_answer: "A", explanation: "'Ordeal' refers to a painful or horrific experience, perfectly capturing stressful traffic commuting." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "congestion", option_b: "desertion", option_c: "dispersion", option_d: "evacuation", correct_answer: "A", explanation: "'Traffic congestion' is the technical and standard term for gridlock on roads." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "transit", option_b: "exile", option_c: "stagnation", option_d: "halt", correct_answer: "A", explanation: "'Mass rapid transit' (MRT) is the standard urban planning term for passenger rail and high-capacity buses." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "quality", option_b: "pressure", option_c: "temperature", option_d: "velocity", correct_answer: "A", explanation: "'Ambient air quality' is the environmental science measurement of outdoor air purity." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "studies", option_b: "fantasies", option_c: "rumors", option_d: "illusions", correct_answer: "A", explanation: "'Feasibility studies' is the formal engineering and business term for project viability assessments." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "landowners", option_b: "trespassers", option_c: "bystanders", option_d: "commuters", correct_answer: "A", explanation: "'Landowners' are the title holders whose property must be acquired for transport corridors." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "hubs", option_b: "deserts", option_c: "barriers", option_d: "cul-de-sacs", correct_answer: "A", explanation: "'Transport hubs' refers to central interchange stations where multiple routes or transport modes connect." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "fatalities", option_b: "gridlock", option_c: "lanes", option_d: "surfaces", correct_answer: "B", explanation: "'Decreasing highway gridlock' collocate smoothly in transport economics." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "collapse", option_b: "surplus", option_c: "bonanza", option_d: "windfall", correct_answer: "A", explanation: "'Fiscal collapse' denotes financial failure or unsustainability from excessive subsidization." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "connectivity", option_b: "isolation", option_c: "estrangement", option_d: "separation", correct_answer: "A", explanation: "'Seamless connectivity' is the standard transport and urban design ideal." },
    ]
  },
  {
    id: "CLOZE_007",
    title: "Aviation Safety and Air Traffic Control",
    text: "Commercial aviation remains the safest mode of long-distance passenger travel due to uncompromising adherence to international safety [1]. Every commercial airliner undergoes rigorous pre-flight inspections by certified avionics technicians before receiving takeoff [2]. In the cockpit, captains and first officers operate under standard operating procedures that mandate cross-checking of instruments and navigation [3]. Meanwhile, air traffic controllers stationed in airport control towers and radar centers maintain orderly spatial [4] between ascending, cruising, and descending aircraft. During inclement meteorological conditions, such as severe wind shear or dense convective clouds, controllers reroute flights onto holding [5] to await clearer landing windows. Modern cockpits feature sophisticated fly-by-wire computer controls and ground proximity warning systems designed to prevent controlled flight into [6]. Should an unpredicted mechanical anomaly arise mid-flight, flight crews rely on standardized emergency [7] to systematically troubleshoot systems without succumbing to panic. Furthermore, global regulatory bodies enforce strict mandatory reporting of near-miss events and minor equipment defects to uncover systemic vulnerabilities before they culminate in fatal [8]. Black box flight recorders—comprising the cockpit voice recorder and digital flight data recorder—provide invaluable insights during accident [9]. Through continuous aeronautical research, airframe manufacturers adopt composite carbon fibers that enhance structural integrity while lowering fuel consumption. The global aviation network therefore thrives on perpetual vigilance, where redundant engineering safeguards every human [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "protocols", option_b: "traditions", option_c: "fashions", option_d: "superstitions", correct_answer: "A", explanation: "'Safety protocols' is the formal term for official procedures governing safety." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "clearance", option_b: "eviction", option_c: "dismissal", option_d: "exemption", correct_answer: "A", explanation: "'Takeoff clearance' is the mandatory authorization granted by air traffic control to depart." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "waypoints", option_b: "curbstones", option_c: "milestones", option_d: "headstones", correct_answer: "A", explanation: "'Navigation waypoints' are specific geographic coordinates used in aerial navigation flight plans." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "separation", option_b: "collision", option_c: "junction", option_d: "merging", correct_answer: "A", explanation: "'Spatial separation' is the aviation term for mandatory minimum distance maintained between aircraft." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "patterns", option_b: "cells", option_c: "cages", option_d: "tanks", correct_answer: "A", explanation: "'Holding patterns' is the formal aviation term for predetermined maneuvers that keep an aircraft within a specified airspace." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "terrain", option_b: "clouds", option_c: "hangars", option_d: "runways", correct_answer: "A", explanation: "'Controlled Flight Into Terrain' (CFIT) is an official aviation accident classification." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "checklists", option_b: "novels", option_c: "diaries", option_d: "leaflets", correct_answer: "A", explanation: "'Emergency checklists' are structured procedures followed by pilots during in-flight emergencies." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "catastrophes", option_b: "victories", option_c: "triumphs", option_d: "festivities", correct_answer: "A", explanation: "'Fatal catastrophes' denotes disastrous accidents involving loss of life." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "investigations", option_b: "speculations", option_c: "fabrications", option_d: "allegations", correct_answer: "A", explanation: "'Accident investigations' is the official statutory inquiry conducted by transport safety bureaus." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "life", option_b: "chattel", option_c: "merchandise", option_d: "cargo", correct_answer: "A", explanation: "'Every human life' fits the moral and professional aviation imperative." },
    ]
  },
  {
    id: "CLOZE_008",
    title: "Monetary Policy and Central Banking",
    text: "Central banks occupy a pivotal role in maintaining macroeconomic stability and safeguarding the purchasing power of the national [1]. The primary mandate of the monetary authority is to keep inflation within a sustainable target band while supporting sustainable economic [2]. When consumer prices accelerate excessively due to demand pressures or currency depreciation, the monetary policy committee typically responds by raising the benchmark interest [3]. Higher borrowing costs discourage speculative credit expansion, encouraging personal savings and moderating aggregate [4]. Conversely, during an economic recession characterized by rising unemployment and sluggish trade, the central bank may pursue an expansionary stance by cutting lending rates and injecting [5] into the financial system. Besides interest rate manipulation, central bankers deploy reserve requirements to dictate the proportion of client deposits that commercial institutions must hold in their vaults. In foreign exchange markets, central banks manage external [6] to smoothen out excessive exchange rate volatility and defend domestic currency stability. However, excessive foreign exchange intervention risks draining official reserves, leaving the economy susceptible to speculative balance of payments [7]. Fiscal discipline from the national treasury must complement monetary interventions; unchecked fiscal deficits inevitably fuel monetary expansion and undermine inflation [8]. Maintaining institutional independence from short-term partisan politics is critical to preserve the central bank's policy [9]. Public confidence in paper money fundamentally rests upon the unwavering integrity and prudent stewardship of the monetary [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "currency", option_b: "commodity", option_c: "consortium", option_d: "conglomerate", correct_answer: "A", explanation: "'National currency' is the official legal tender money issued by a nation's central bank." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "growth", option_b: "stagnation", option_c: "decay", option_d: "decline", correct_answer: "A", explanation: "'Sustainable economic growth' is the universally accepted economic policy objective." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "rate", option_b: "fine", option_c: "toll", option_d: "ransom", correct_answer: "A", explanation: "'Benchmark interest rate' (e.g. Monetary Policy Rate / MPR) is the core instrument of monetary policy." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "demand", option_b: "supply", option_c: "deficit", option_d: "surplus", correct_answer: "A", explanation: "'Aggregate demand' is the total spending on domestic goods and services in an economy." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "liquidity", option_b: "insolvency", option_c: "bankruptcy", option_d: "liabilities", correct_answer: "A", explanation: "'Injecting liquidity' is the financial term for increasing available cash flow in the banking sector." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "reserves", option_b: "deficits", option_c: "sanctions", option_d: "debts", correct_answer: "A", explanation: "'External reserves' (foreign exchange reserves) are foreign assets held by a central bank." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "crises", option_b: "bonanzas", option_c: "windfalls", option_d: "rebates", correct_answer: "A", explanation: "'Balance of payments crises' occurs when a nation cannot pay for essential imports or service debt." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "targets", option_b: "fables", option_c: "illusions", option_d: "superstitions", correct_answer: "A", explanation: "'Inflation targets' are numerical objectives set by central banks for the rate of inflation." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "credibility", option_b: "duplicity", option_c: "subservience", option_d: "hypocrisy", correct_answer: "A", explanation: "'Policy credibility' is the degree to which markets and the public trust the central bank's commitments." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "authorities", option_b: "agitators", option_c: "protesters", option_d: "insurgents", correct_answer: "A", explanation: "'Monetary authorities' refers collectively to the central bank and associated regulatory bodies." },
    ]
  },
  {
    id: "CLOZE_009",
    title: "Renewable Energy and Clean Power Grid Transition",
    text: "The transition from carbon-intensive fossil fuels to clean, sustainable energy sources represents humanity's defining environmental [1]. For over a century, global industrialization has been powered predominantly by burning coal, natural gas, and refined petroleum, generating monumental carbon dioxide [2]. These anthropogenic emissions trap atmospheric heat, catalyzing ocean acidification, polar ice melt, and volatile climatic [3]. Transitioning to renewable alternatives requires deploying solar photovoltaic parks and wind turbines on an unprecedented commercial [4]. However, integrating intermittent green electricity into legacy national grids presents formidable engineering challenges. Because solar panels produce power only during daylight and wind speeds fluctuate unpredictably, electrical grids require robust baseline [5]. Advanced lithium-ion battery energy storage systems, along with pumped hydroelectric storage, are indispensable to absorb surplus daytime generation and discharge it during evening peak [6]. Grid modernizations also necessitate the implementation of smart digital meters and automated distribution networks capable of load [7]. In emerging economies, distributed solar minigrids provide an expedited, cost-effective solution for electrifying isolated rural communities bypassed by centralized high-voltage transmission [8]. Financing this capital-intensive energy transition demands innovative green bonds and concessional climate finance from multilateral development [9]. By decarbonizing the power sector, nations not only mitigate long-term catastrophic warming but also foster industrial innovation, energy sovereignty, and high-skilled employment in sustainable green [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "challenge", option_b: "triviality", option_c: "relaxation", option_d: "recreation", correct_answer: "A", explanation: "'Environmental challenge' is the standard phrase describing major environmental undertakings." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "emissions", option_b: "injections", option_c: "absorptions", option_d: "filtrations", correct_answer: "A", explanation: "'Carbon dioxide emissions' is the technical term for greenhouse gases released into the atmosphere." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "extremes", option_b: "stabilities", option_c: "moderations", option_d: "constants", correct_answer: "A", explanation: "'Climatic extremes' refers to severe weather phenomena resulting from climate disruption." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "scale", option_b: "miniature", option_c: "footnote", option_d: "whisper", correct_answer: "A", explanation: "'Commercial scale' is the business and technical term denoting large-scale industrial deployment." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "capacity", option_b: "deficit", option_c: "shortage", option_d: "vacuum", correct_answer: "A", explanation: "'Baseline capacity' (or baseload capacity) is the minimum electric power a utility must deliver continuously." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "hours", option_b: "seconds", option_c: "centuries", option_d: "epochs", correct_answer: "A", explanation: "'Peak hours' is the established power grid term for periods of highest electricity demand." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "balancing", option_b: "overload", option_c: "blackout", option_d: "rupture", correct_answer: "A", explanation: "'Load balancing' is the electrical engineering technique of distributing electrical loads across a grid." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "lines", option_b: "cables", option_c: "twines", option_d: "ropes", correct_answer: "A", explanation: "'High-voltage transmission lines' is the formal term for electrical power transit infrastructure." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "banks", option_b: "casinos", option_c: "pawnshops", option_d: "vaults", correct_answer: "A", explanation: "'Multilateral development banks' (like World Bank, AfDB) are international financial institutions supporting development." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "technologies", option_b: "superstitions", option_c: "illusions", option_d: "antiques", correct_answer: "A", explanation: "'Green technologies' is the universally accepted terminology for environmentally sustainable technologies." },
    ]
  },
  {
    id: "CLOZE_010",
    title: "Maritime Commerce and Deep Sea Ports",
    text: "Maritime transportation is the lifeblood of international commerce, responsible for ferrying over eighty percent of all global merchandise by volume. In today's interconnected world, modern deep-water ports function as vital logistical gateways connecting national hinterlands to international shipping [1]. Huge containerized vessels capable of hauling upwards of twenty thousand twenty-foot equivalent units require deep navigational channels and state-of-the-art quay [2]. Without modern ship-to-shore gantry cranes and automated container handling yards, port congestion inevitably triggers prolonged vessel turnaround [3]. These maritime delays cascade throughout regional supply chains, inflating freight rates and escalating consumer prices on imported raw [4]. To avoid such economic bottlenecks, coastal nations are investing heavily in modern deep-sea ports equipped with electronic single-window clearance [5]. Streamlining customs procedures through automated inspection systems eliminates administrative bureaucracy and curbs corrupt practices at the maritime [6]. Efficient multimodal connections—linking dockside terminals directly to standard-gauge rail corridors and express highways—are equally vital to evacuate bonded cargo without congesting urban [7]. Environmental sustainability has also emerged as a pressing maritime priority, prompting international maritime conventions to impose strict caps on sulfur emissions from bunker [8]. Port authorities must provide shore-to-ship electrical power so berthed vessels can shut down diesel auxiliary generators, reducing maritime air [9]. Maritime logistics efficiency thus constitutes an essential benchmark of national trade competitiveness and economic [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "lanes", option_b: "alleys", option_c: "corridors", option_d: "avenues", correct_answer: "A", explanation: "'Shipping lanes' is the established geographical and nautical term for regularly used ocean transit routes." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "cranes", option_b: "anchors", option_c: "oars", option_d: "rudders", correct_answer: "A", explanation: "'Quay cranes' (or ship-to-shore gantry cranes) are the essential equipment used to load/unload container vessels." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "times", option_b: "speed", option_c: "records", option_d: "distances", correct_answer: "A", explanation: "'Turnaround times' is the logistics metric measuring the time between a vessel arriving in port and departing." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "materials", option_b: "luxuries", option_c: "trinkets", option_d: "curios", correct_answer: "A", explanation: "'Raw materials' is the standard economic phrase for basic unprocessed goods used in manufacturing." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "platforms", option_b: "barriers", option_c: "impediments", option_d: "hurdles", correct_answer: "A", explanation: "'Single-window clearance platforms' is the official international trade term for unified digital customs portals." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "border", option_b: "sanctuary", option_c: "boundary", option_d: "frontier", correct_answer: "A", explanation: "'Maritime border' refers to national frontiers at sea and port terminals where customs control operates." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "arteries", option_b: "tunnels", option_c: "gutters", option_d: "ditches", correct_answer: "A", explanation: "'Urban arteries' is the standard transport metaphor for primary transit corridors in a metropolitan area." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "fuel", option_b: "water", option_c: "timber", option_d: "coal", correct_answer: "A", explanation: "'Bunker fuel' is the technical maritime term for fuel oil loaded onto ships for propulsion." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "pollution", option_b: "purification", option_c: "filtration", option_d: "ventilation", correct_answer: "A", explanation: "'Maritime air pollution' describes pollutants emitted by ships into coastal environments." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "resilience", option_b: "fragility", option_c: "decline", option_d: "regression", correct_answer: "A", explanation: "'Economic resilience' denotes an economy's capacity to withstand trade disruptions and shocks." },
    ]
  },
  {
    id: "CLOZE_011",
    title: "Telecommunications and Fiber Optic Infrastructure",
    text: "The modern telecommunications industry serves as the backbone of the digital age, enabling instantaneous cross-border communication and electronic [1]. Underpinning this invisible wireless ecosystem is a colossal physical network of submarine fiber-optic cables traversing oceanic [2]. Inside these reinforced subsea cables, microscopic glass fibers transmit modulated pulses of laser light at nearly the speed of light, carrying vast amounts of internet [3]. When a subsea cable suffers a physical rupture caused by seismic undersea activity or commercial fishing trawler anchors, entire continents experience catastrophic internet service [4]. Telecommunications carriers must therefore maintain redundancy by routing data across multiple terrestrial and subsea pathways. On land, telecom service providers erect cellular base transceiver stations to broadcast wireless signals across assigned radio [5]. The generational progression from legacy third-generation cellular standards to high-speed fifth-generation connectivity has expanded bandwidth and reduced network [6]. Ultra-low latency is critical for autonomous vehicle navigation, remote surgical operations, and industrial internet-of-things automation. Nevertheless, expanding rural network coverage in expansive developing nations remains economically challenging due to high capital expenditure and irregular electrical [7]. Universal service provision funds, financed through telecom operator licensing levies, help bridge this digital [8] by subsidizing towers in unprofitable hinterlands. Government regulatory commissions must also uphold competitive antitrust practices, preventing mobile network monopolists from charging exorbitant consumer [9]. As high-speed broadband becomes an indispensable public utility, universal digital access is synonymous with equal economic [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "commerce", option_b: "barter", option_c: "piracy", option_d: "contraband", correct_answer: "A", explanation: "'Electronic commerce' (e-commerce) is the buying and selling of goods/services using the internet." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "trenches", option_b: "mountains", option_c: "valleys", option_d: "deserts", correct_answer: "A", explanation: "'Oceanic trenches' refers to deep depressions on the sea floor traversed by submarine cables." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "traffic", option_b: "cargo", option_c: "smuggling", option_d: "ballast", correct_answer: "A", explanation: "'Internet traffic' is the recognized computing term for data sent and received across network connections." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "disruptions", option_b: "celebrations", option_c: "expansions", option_d: "enhancements", correct_answer: "A", explanation: "'Service disruptions' is the standard term for interruptions or outages in telecommunications networks." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "frequencies", option_b: "harmonies", option_c: "chords", option_d: "melodies", correct_answer: "A", explanation: "'Radio frequencies' refers to the electromagnetic spectrum bands allocated for wireless communications." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "latency", option_b: "gravity", option_c: "density", option_d: "toxicity", correct_answer: "A", explanation: "'Network latency' is the measure of delay in data communication across a network." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "power", option_b: "water", option_c: "weather", option_d: "climate", correct_answer: "A", explanation: "'Electrical power' is required to run telecom base stations and transceivers." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "divide", option_b: "canyon", option_c: "bridge", option_d: "junction", correct_answer: "A", explanation: "'Digital divide' is the standard sociological and economic term for the gap in internet access." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "tariffs", option_b: "donations", option_c: "ransoms", option_d: "bribes", correct_answer: "A", explanation: "'Consumer tariffs' is the telecommunications regulatory term for user rates and prices." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "opportunity", option_b: "adversity", option_c: "deprivation", option_d: "insolvency", correct_answer: "A", explanation: "'Economic opportunity' is the standard phrase for fair chance at economic success." },
    ]
  },
  {
    id: "CLOZE_012",
    title: "Mineral Exploration and Solid Minerals Mining",
    text: "The mining of solid minerals presents significant prospects for economic diversification in resource-rich developing nations. Beneath continental landmasses lie extensive mineral [1] comprising gold, lithium, bitumen, tantalite, and rare earth elements essential for modern high-tech industries. The lifecycle of a commercial mining venture initiates with geochemical and geophysical [2], where geologists map surface rock formations and analyze core drill samples. Advanced airborne magnetic surveys allow mining engineers to identify subsurface anomalies indicative of commercial mineral [3]. Once economic viability is established through a definitive bankable feasibility report, mining concessions must obtain statutory environmental impact [4] before commencing excavation. Open-cast strip mining and deep underground shaft excavation represent the two primary extraction [5]. However, solid mineral exploitation frequently engenders grave ecological devastation if strict environmental remediation regulations are not [6]. Unregulated artisanal mining routinely contaminates freshwater rivers with toxic heavy metals such as lead and [7], poisoning local aquatic ecosystems and triggering severe public health emergencies. Furthermore, corporate mining entities are legally bound to negotiate community development agreements with indigenous host [8], guaranteeing fair compensation, infrastructural development, and local employment quotas. State authorities must establish dedicated mineral inspection agencies to curb illegal mineral smuggling and ensure transparent royalty [9]. By fostering environmentally responsible mineral development, nations can convert subterranean geological wealth into inclusive, long-lasting industrial [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "deposits", option_b: "debris", option_c: "refuse", option_d: "rubble", correct_answer: "A", explanation: "'Mineral deposits' is the standard geological term for natural accumulations of minerals in the earth's crust." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "exploration", option_b: "demolition", option_c: "evacuation", option_d: "fumigation", correct_answer: "A", explanation: "'Mineral exploration' is the sequential process of finding commercially viable mineral deposits." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "reserves", option_b: "deficits", option_c: "bankruptcies", option_d: "shortages", correct_answer: "A", explanation: "'Mineral reserves' is the technical term for resources that are commercially and legally extractable." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "clearance", option_b: "condemnation", option_c: "penalty", option_d: "confiscation", correct_answer: "A", explanation: "'Environmental impact clearance' (or approval) is the statutory permit issued to allow project execution." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "methodologies", option_b: "fantasies", option_c: "superstitions", option_d: "folktales", correct_answer: "A", explanation: "'Extraction methodologies' refers to standard engineering techniques used to harvest minerals." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "enforced", option_b: "flouted", option_c: "disregarded", option_d: "subverted", correct_answer: "A", explanation: "Environmental regulations prevent damage only when properly 'enforced'." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "mercury", option_b: "oxygen", option_c: "nitrogen", option_d: "hydrogen", correct_answer: "A", explanation: "'Mercury' is a notoriously toxic heavy metal widely used in artisanal gold extraction." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "communities", option_b: "intruders", option_c: "trespassers", option_d: "rivals", correct_answer: "A", explanation: "'Host communities' is the legal and social terminology for local populations resident in mining catchment areas." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "collection", option_b: "evasion", option_c: "pilfering", option_d: "forfeiture", correct_answer: "A", explanation: "'Royalty collection' refers to collecting statutory taxes paid by miners to the government." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "prosperity", option_b: "poverty", option_c: "bankruptcy", option_d: "penury", correct_answer: "A", explanation: "'Industrial prosperity' denotes economic success and thriving productive capability." },
    ]
  },
  {
    id: "CLOZE_013",
    title: "Forensic Science and Criminal Justice",
    text: "The modern judicial process relies increasingly on forensic science to determine guilt or innocence beyond reasonable [1]. Unlike eyewitness testimony, which is notoriously susceptible to human bias, memory lapses, and subjective perception, physical forensic evidence provides objective, verifiable [2]. When investigating a crime scene, specialized crime scene investigators follow meticulous protocols to document and preserve physical clues without cross- [3]. Among the most revolutionary breakthroughs in forensic biology is deoxyribonucleic acid (DNA) [4]. Because every human genome—with the exception of identical twins—possesses unique nucleotide sequences, DNA retrieved from hair follicles, saliva, or blood droplets offers an infallible genetic [5]. In ballistic analysis, forensic firearm examiners examine striations and microscopic scratch marks etched onto discharged bullets to determine whether a projectile was fired from a specific suspect [6]. Toxicology laboratories similarly analyze biological samples to ascertain the presence of illicit narcotics, lethal poisons, or blood-alcohol [7]. Digital forensics has also become indispensable in tracking cybercrime, retrieving deleted electronic records, encrypted communications, and geographic metadata from mobile [8]. To maintain legal admissibility in a court of law, investigators must strictly document the uninterrupted chain of [9] for every collected item. Without this documented custody transfer, tainted evidence may be rejected by the trial judge, allowing dangerous criminals to escape [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "doubt", option_b: "hope", option_c: "belief", option_d: "expectation", correct_answer: "A", explanation: "'Beyond reasonable doubt' is the universal standard of evidence required to validate a criminal conviction." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "proof", option_b: "gossip", option_c: "hearsay", option_d: "conjecture", correct_answer: "A", explanation: "'Objective, verifiable proof' is the standard evidentiary standard in law." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "contamination", option_b: "purification", option_c: "sanitization", option_d: "distillation", correct_answer: "A", explanation: "'Cross-contamination' is the forensic science term for inadvertent transfer of trace evidence between specimens." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "profiling", option_b: "doodling", option_c: "sketching", option_d: "caricature", correct_answer: "A", explanation: "'DNA profiling' (or genetic fingerprinting) is the forensic scientific technique identifying individuals by DNA characteristics." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "fingerprint", option_b: "trademark", option_c: "watermark", option_d: "postcard", correct_answer: "A", explanation: "'Genetic fingerprint' is the standard biological metaphor for unique individual DNA identification." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "weapon", option_b: "target", option_c: "bullet", option_d: "holster", correct_answer: "A", explanation: "Ballistic striations link a fired bullet directly to a suspect firearm or 'weapon'." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "content", option_b: "volume", option_c: "shortage", option_d: "depletion", correct_answer: "A", explanation: "'Blood-alcohol content' (BAC) is the standard metric used in forensic toxicology." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "devices", option_b: "furnaces", option_c: "apparel", option_d: "appliances", correct_answer: "A", explanation: "'Mobile devices' (smartphones, tablets) are the primary sources of digital forensic data." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "custody", option_b: "events", option_c: "islands", option_d: "mountains", correct_answer: "A", explanation: "'Chain of custody' is the vital legal evidentiary rule requiring paper trail tracking physical evidence handling." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "justice", option_b: "mercy", option_c: "praise", option_d: "recompense", correct_answer: "A", explanation: "'Escape justice' is the established idiom for evading legal punishment for a crime." },
    ]
  },
  {
    id: "CLOZE_014",
    title: "Educational Technology and Digital Pedagogy",
    text: "The integration of modern educational technology has fundamentally reshaped teaching and learning in secondary and tertiary [1]. Traditional rote memorization models are increasingly superseded by learner-centered pedagogical frameworks that leverage interactive digital [2]. In contemporary computer-based testing, sophisticated psychometric algorithms dynamically select examination items that accurately calibrate a student's cognitive [3]. This computerized format eliminates human marking discrepancies, curbs examination malpractice, and delivers instantaneous performance [4]. Beyond automated assessment, cloud-based learning management systems enable students in remote communities to access verified instructional materials, recorded video lectures, and interactive simulation [5]. However, educational technologists caution that technology alone cannot replace the empathetic guidance of qualified [6]. Educators must be equipped with digital pedagogical competencies to effectively blend synchronous virtual classes with hands-on collaborative problem [7]. The digital divide remains an acute obstacle, particularly in developing economies where electricity tariffs, erratic internet connectivity, and hardware costs hinder low-income [8]. Public-private partnerships are crucial to subsidize solar-powered tablets and zero-rate educational web portals for underprivileged candidates. Furthermore, artificial intelligence tutoring systems can provide personalized learning pathways, identifying individual academic weaknesses and generating tailored revision [9]. When strategically deployed, educational technology democratizes knowledge access, fostering intellectual rigor and lifelong academic [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "institutions", option_b: "sanctuaries", option_c: "convents", option_d: "barracks", correct_answer: "A", explanation: "'Educational institutions' is the formal term for schools, colleges, and universities." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "tools", option_b: "weapons", option_c: "fetishes", option_d: "talismans", correct_answer: "A", explanation: "'Digital tools' refers to digital software, platforms, and interactive applications used in learning." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "ability", option_b: "indifference", option_c: "sloth", option_d: "reluctance", correct_answer: "A", explanation: "'Cognitive ability' is the standard psychometric term for mental capability and reasoning skill." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "feedback", option_b: "backlash", option_c: "stagnation", option_d: "paralysis", correct_answer: "A", explanation: "'Performance feedback' is the pedagogical term for information provided to learners regarding their score and performance." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "labs", option_b: "riots", option_c: "strikes", option_d: "pranks", correct_answer: "A", explanation: "'Simulation labs' (virtual science labs) allow students to conduct science experiments digitally." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "teachers", option_b: "agitators", option_c: "spectators", option_d: "trespassers", correct_answer: "A", explanation: "'Qualified teachers' are essential professionals providing student mentorship." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "solving", option_b: "making", option_c: "hunting", option_d: "dodging", correct_answer: "A", explanation: "'Collaborative problem solving' is a foundational modern pedagogical methodology." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "students", option_b: "tycoons", option_c: "magnates", option_d: "investors", correct_answer: "A", explanation: "Low-income students are the demographic most affected by equipment and connectivity costs." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "exercises", option_b: "escapades", option_c: "conspiracies", option_d: "escapes", correct_answer: "A", explanation: "'Revision exercises' is the standard educational term for academic practice questions." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "excellence", option_b: "mediocrity", option_c: "failure", option_d: "neglect", correct_answer: "A", explanation: "'Academic excellence' is the standard expression for high achievement in education." },
    ]
  },
  {
    id: "CLOZE_015",
    title: "Sports Science and Athletic Kinesiology",
    text: "Elite athletic performance in modern competitive sports is no longer determined solely by raw talent and willpower; it is heavily shaped by sports [1]. Athletic physiologists and biomechanical engineers apply sophisticated scientific principles to analyze human movement and maximize athletic [2]. High-speed motion-capture cameras and wearable sensors monitor joint angles, stride frequencies, and ground reaction forces, allowing coaches to refine an athlete's technique with millimeter [3]. In endurance disciplines, such as distance running and cycling, monitoring maximum oxygen uptake, known medically as VO2 [4], helps sports scientists evaluate cardiovascular efficiency. Exercise training regimens are carefully structured around periodization cycles, alternating strenuous conditioning sessions with restorative phases to prevent overtraining [5]. Proper sports nutrition plays an equally pivotal role; athletes consume targeted macronutrient ratios to replenish muscle glycogen stores and optimize cellular [6]. Dehydration impairs physical endurance, alters mental focus, and predisposes competitors to acute muscle [7]. When sports injuries occur—such as ligament sprains, tendon tears, or skeletal fractures—orthopedic surgeons and physiotherapists design customized rehabilitation [8]. Sports psychology also plays a decisive role in competitive outcomes, training athletes in mental visualization, emotional regulation, and stress management under high-stakes competitive [9]. Ultimately, the fusion of sports medicine, data analytics, and disciplined training allows human athletes to push the physical boundaries of athletic [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "science", option_b: "myth", option_c: "fiction", option_d: "folklore", correct_answer: "A", explanation: "'Sports science' is the academic and practical discipline studying human physiology in sport." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "output", option_b: "fatigue", option_c: "lethargy", option_d: "slumber", correct_answer: "A", explanation: "'Athletic output' (or athletic performance) refers to the physical work produced by an athlete." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "precision", option_b: "clumsiness", option_c: "indifference", option_d: "ambiguity", correct_answer: "A", explanation: "'Millimeter precision' emphasizes meticulous exactness in technique refinement." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "max", option_b: "min", option_c: "zero", option_d: "mid", correct_answer: "A", explanation: "'VO2 max' is the standard physiological notation for maximal oxygen consumption during exercise." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "syndrome", option_b: "triumph", option_c: "jubilation", option_d: "euphoria", correct_answer: "A", explanation: "'Overtraining syndrome' is the medical condition caused by excessive athletic training without adequate rest." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "repair", option_b: "ruin", option_c: "decay", option_d: "atrophy", correct_answer: "A", explanation: "Nutritional amino acids and carbohydrates facilitate muscle protein synthesis and 'cellular repair'." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "cramps", option_b: "wings", option_c: "feathers", option_d: "armors", correct_answer: "A", explanation: "'Muscle cramps' are painful involuntary muscle contractions often provoked by dehydration." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "protocols", option_b: "conspiracies", option_c: "escapades", option_d: "pranks", correct_answer: "A", explanation: "'Rehabilitation protocols' is the formal clinical term for structured injury recovery plans." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "pressure", option_b: "vacation", option_c: "recess", option_d: "leisure", correct_answer: "A", explanation: "'Competitive pressure' refers to the psychological strain experienced in elite sports contests." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "achievement", option_b: "failure", option_c: "mediocrity", option_d: "disqualification", correct_answer: "A", explanation: "'Athletic achievement' denotes notable milestones and records achieved in sports." },
    ]
  },
  {
    id: "CLOZE_016",
    title: "Space Exploration and Satellite Meteorology",
    text: "The modern era of space exploration has yielded transformative dividends for terrestrial life through satellite [1]. Orbiting artificial satellites traveling in geostationary and low Earth orbits continuously survey planetary weather patterns, oceanic temperatures, and atmospheric [2]. In meteorology, radiometric sensors collect critical climatic data, enabling meteorologists to forecast extreme weather events such as typhoons, flash floods, and prolonged [3]. Early warning meteorological advisories save thousands of lives annually by granting civil defense agencies adequate lead time to execute mass [4]. Beyond weather forecasting, telecommunication satellites positioned approximately thirty-six thousand kilometers above the equator facilitate intercontinental broadcasts and direct-to-home digital [5]. In agriculture and environmental monitoring, multispectral optical imagers measure normalized difference vegetation index, enabling agronomists to assess crop health and detect drought [6]. Navigational satellite constellations provide pinpoint positional coordinates for civil aviation, commercial maritime shipping, and vehicle GPS [7]. However, the exponential accumulation of obsolete satellites and booster debris in low Earth orbit has sparked grave concerns regarding space [8]. If collisions between defunct rocket stages cascade into runaway fragmentation—a scenario recognized as the Kessler syndrome—crucial orbital corridors could become [9]. The international scientific community must collaborate to develop active debris removal technologies and formulate responsible orbital traffic [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "technology", option_b: "superstition", option_c: "witchcraft", option_d: "mythology", correct_answer: "A", explanation: "'Satellite technology' refers to operational systems using artificial satellites." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "humidity", option_b: "solidarity", option_c: "animosity", option_d: "hostility", correct_answer: "A", explanation: "'Atmospheric humidity' is the moisture concentration in the air measured by weather satellites." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "droughts", option_b: "parties", option_c: "festivals", option_d: "banquets", correct_answer: "A", explanation: "'Droughts' are prolonged periods of deficient rainfall, a severe meteorological event." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "evacuations", option_b: "celebrations", option_c: "coronations", option_d: "parades", correct_answer: "A", explanation: "'Mass evacuations' is the emergency management term for moving populations out of danger zones." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "television", option_b: "telegraph", option_c: "scrolls", option_d: "papyrus", correct_answer: "A", explanation: "'Digital television' is widely transmitted via geostationary broadcast satellites." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "stress", option_b: "delight", option_c: "euphoria", option_d: "contentment", correct_answer: "A", explanation: "'Drought stress' is the botanical term describing physiological strain on crops from moisture deficiency." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "navigation", option_b: "obliteration", option_c: "confusion", option_d: "stagnation", correct_answer: "A", explanation: "'GPS navigation' is the ubiquitous system for positional routing." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "debris", option_b: "monuments", option_c: "treasures", option_d: "gems", correct_answer: "A", explanation: "'Space debris' (or space junk) is the formal aeronautical term for defunct human-made objects in orbit." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "impassable", option_b: "luxurious", option_c: "peaceful", option_d: "inviting", correct_answer: "A", explanation: "'Impassable' describes orbital zones rendered too dangerous to traverse due to debris." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "management", option_b: "sabotage", option_c: "neglect", option_d: "dereliction", correct_answer: "A", explanation: "'Orbital traffic management' is the formal international term for spaceflight safety coordination." },
    ]
  },
  {
    id: "CLOZE_017",
    title: "Veterinary Medicine and Animal Husbandry",
    text: "Modern animal husbandry is integral to national agricultural productivity and protein security in sub-Saharan [1]. Successful livestock management requires rigorous veterinary surveillance to prevent the proliferation of zoonotic [2]. Infectious contagions such as bovine tuberculosis, African swine fever, and Newcastle disease inflict catastrophic mortality on herds and flocks if vaccination protocols are [3]. In pastoral communities, veterinary extension officers routinely administer prophylactic vaccines and teach herders proper deworming and acaricide dipping [4]. Maintaining strict biosecurity standards on commercial poultry and dairy farms is essential to prevent horizontal transmission of deadly [5]. When animals show signs of bacterial infection, veterinarians prescribe specific antibiotic regimens; however, improper dosage and indiscriminate prophylactic use of antimicrobials foster dangerous microbial drug [6]. This antimicrobial resistance not only threatens veterinary healthcare but also endangers human clinical medicine when resistant bacteria cross the food [7]. Selective livestock breeding programs utilizing artificial insemination allow pastoralists to crossbreed indigenous cattle with high-yielding dairy breeds, significantly boosting daily milk [8]. In arid rangelands, seasonal pasture shortages mandate forage conservation through silage preparation and hay [9]. Sustainable livestock farming thus demands a comprehensive approach where animal welfare, nutritional management, and veterinary vigilance coalesce to ensure healthy herds and secure pastoral [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "Africa", option_b: "Antarctica", option_c: "Arctic", option_d: "Atlantic", correct_answer: "A", explanation: "'Sub-Saharan Africa' is the standard geographical region referenced." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "diseases", option_b: "virtues", option_c: "honors", option_d: "awards", correct_answer: "A", explanation: "'Zoonotic diseases' are infectious diseases transmitted from animals to humans." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "neglected", option_b: "upheld", option_c: "venerated", option_d: "celebrated", correct_answer: "A", explanation: "Contagions spread rapidly when vaccination protocols are 'neglected'." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "techniques", option_b: "rituals", option_c: "superstitions", option_d: "fantasies", correct_answer: "A", explanation: "'Acaricide dipping techniques' is the veterinary phrase for chemical tick/parasite control." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "pathogens", option_b: "nutrients", option_c: "vitamins", option_d: "minerals", correct_answer: "A", explanation: "'Pathogens' are biological agents (viruses, bacteria) causing disease." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "resistance", option_b: "susceptibility", option_c: "surrender", option_d: "submission", correct_answer: "A", explanation: "'Microbial drug resistance' (antimicrobial resistance / AMR) is a major global public health menace." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "chain", option_b: "fence", option_c: "ditch", option_d: "wall", correct_answer: "A", explanation: "'Food chain' is the standard ecological and public health term for food transfer pathways." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "yields", option_b: "spills", option_c: "leaks", option_d: "evaporations", correct_answer: "A", explanation: "'Milk yields' is the standard dairy science measure of milk production per cow." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "baling", option_b: "burning", option_c: "drowning", option_d: "trampling", correct_answer: "A", explanation: "'Hay baling' is the mechanical packaging of dried grass into compressed bales for feed." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "livelihoods", option_b: "catastrophes", option_c: "bankruptcies", option_d: "misfortunes", correct_answer: "A", explanation: "'Pastoral livelihoods' denotes the means of earning sustenance for livestock herders." },
    ]
  },
  {
    id: "CLOZE_018",
    title: "Civil Engineering and Water Dams Management",
    text: "Multipurpose dams are among the most monumental feats of civil engineering, constructed to regulate river hydrology and deliver hydroelectric [1]. By impounding massive volumes of water during rainy seasons, these artificial reservoirs provide reliable water for municipal consumption and agricultural [2]. Hydroelectric generation harnesses the kinetic energy of descending water through massive penstocks to spin hydraulic [3], producing clean renewable electricity without combusting fossil hydrocarbons. However, dam construction demands meticulous geotechnical site investigations and hydrological modeling to ensure that dam foundations can withstand enormous hydrostatic [4]. Concrete gravity dams rely on their immense mass to resist water forces, whereas embankment dams utilize compacted earth and impermeable rock [5]. Periodic structural monitoring using piezometers and seismographs is imperative to detect internal seepage or foundation [6]. When catastrophic structural failure occurs—such as overtopping caused by unprecedented biblical rainfall—the downstream devastation to towns and farmland is [7]. Spillways and auxiliary spillway gates must therefore be calibrated to discharge extreme floodwaters safely without compromising the main structural [8]. Sedimentation poses another insidious operational hazard; over decades, river silt settles on the reservoir bed, progressively diminishing the dam's active storage [9]. Regular maintenance, desiltation dredging, and catchment watershed reforestation are indispensable to ensure that major dams achieve their projected multi-decade structural [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "power", option_b: "famine", option_c: "drought", option_d: "scarcity", correct_answer: "A", explanation: "'Hydroelectric power' is the standard engineering and energy term for electricity generated by flowing water." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "irrigation", option_b: "evaporation", option_c: "submersion", option_d: "depletion", correct_answer: "A", explanation: "'Agricultural irrigation' is the artificial application of water to soil for crop growth." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "turbines", option_b: "anchors", option_c: "hammers", option_d: "levers", correct_answer: "A", explanation: "'Hydraulic turbines' are rotary engines that extract energy from fluid flow." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "pressure", option_b: "vacuum", option_c: "suction", option_d: "deficiency", correct_answer: "A", explanation: "'Hydrostatic pressure' is the fluid mechanical force exerted by water at rest." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "fill", option_b: "rubbish", option_c: "ashes", option_d: "charcoal", correct_answer: "A", explanation: "'Rock fill' (or earth-and-rock fill) is the civil engineering material used in embankment dams." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "settlement", option_b: "celebration", option_c: "prosperity", option_d: "triumph", correct_answer: "A", explanation: "'Foundation settlement' is the sinking or shifting of a structure into the ground." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "catastrophic", option_b: "delightful", option_c: "trivial", option_d: "negligible", correct_answer: "A", explanation: "'Catastrophic' captures the immense destruction of dam failures." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "crest", option_b: "furrow", option_c: "crater", option_d: "pit", correct_answer: "A", explanation: "'Structural crest' is the highest top surface of a dam wall." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "capacity", option_b: "deficit", option_c: "shortage", option_d: "debt", correct_answer: "A", explanation: "'Storage capacity' is the total volume of water a reservoir can contain." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "lifespan", option_b: "demise", option_c: "expiry", option_d: "obsolescence", correct_answer: "A", explanation: "'Structural lifespan' (design life) is the period during which a structure is expected to function." },
    ]
  },
  {
    id: "CLOZE_019",
    title: "Petroleum Refining and Petrochemical Processing",
    text: "Crude petroleum extracted from subterranean reservoirs is a complex mixture of hydrocarbon compounds that possesses negligible utility in its raw [1]. To yield marketable fuels and industrial feedstocks, raw petroleum must undergo fractional distillation inside a towering atmospheric crude [2]. In this thermal separation process, crude oil is heated in a furnace to high temperatures, vaporizing the hydrocarbons and allowing fractions to condense at distinct trays based on their boiling [3]. Lighter fractions such as liquefied petroleum gas and motor spirit condense near the top of the tower, while heavier atmospheric residues settle at the [4]. Secondary conversion units, particularly fluid catalytic cracking and hydrocracking, break down long-chain heavy gas oils into high-octane gasoline and aviation [5]. Furthermore, desulfurization units remove corrosive sulfur compounds to satisfy rigorous environmental vehicle emission [6]. Downstream petrochemical complexes convert refinery byproducts, such as ethylene and propylene, into synthetic polymers, industrial fertilizers, pharmaceuticals, and consumer [7]. However, petroleum refining generates hazardous effluents and volatile organic compounds that pose severe risks to ambient air and local water [8]. Modern refineries install flue-gas scrubbers and advanced effluent treatment plants to neutralize toxic contaminants before environmental [9]. Developing domestic refining self-sufficiency frees oil-producing nations from reliance on costly imported refined products, conserving foreign exchange and driving domestic industrial [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "state", option_b: "country", option_c: "province", option_d: "territory", correct_answer: "A", explanation: "'In its raw state' is the standard English idiom meaning unrefined or unprocessed." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "distillation", option_b: "explosion", option_c: "combustion", option_d: "incineration", correct_answer: "A", explanation: "'Fractional distillation' column (or atmospheric distillation unit) is the core refinery unit." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "points", option_b: "dots", option_c: "lines", option_d: "marks", correct_answer: "A", explanation: "'Boiling points' is the physical chemistry term for temperatures at which liquids turn to vapor." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "bottom", option_b: "pinnacle", option_c: "apex", option_d: "summit", correct_answer: "A", explanation: "Heaviest unvaporized residues settle at the 'bottom' of the distillation column." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "fuel", option_b: "water", option_c: "steam", option_d: "ice", correct_answer: "A", explanation: "'Aviation fuel' (aviation turbine kerosene / Jet-A1) is an essential refined petroleum product." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "standards", option_b: "customs", option_c: "fashions", option_d: "traditions", correct_answer: "A", explanation: "'Emission standards' are regulatory requirements setting specific limits to the amount of pollutants released." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "plastics", option_b: "timber", option_c: "pottery", option_d: "stones", correct_answer: "A", explanation: "'Synthetic polymers and consumer plastics' are primary products of petrochemical processing." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "bodies", option_b: "corpses", option_c: "skeletons", option_d: "carcasses", correct_answer: "A", explanation: "'Water bodies' is the formal environmental science term for rivers, lakes, and oceans." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "discharge", option_b: "retention", option_c: "absorption", option_d: "consumption", correct_answer: "A", explanation: "'Environmental discharge' refers to releasing treated liquid or gaseous waste into nature." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "growth", option_b: "decay", option_c: "stagnation", option_d: "recession", correct_answer: "A", explanation: "'Industrial growth' is the economic expansion of the manufacturing and industrial base." },
    ]
  },
  {
    id: "CLOZE_020",
    title: "Diplomatic Relations and International Law",
    text: "The conduct of international relations among sovereign states is governed by bilateral treaties, multilateral conventions, and customary international [1]. Established under the 1961 Vienna Convention on Diplomatic Relations, the institution of the diplomatic mission guarantees resident ambassadors and envoys immunity from civil and criminal [2]. This diplomatic immunity ensures that emissaries can communicate securely with their sending states without fear of administrative coercion or arbitrary [3]. Inside the receiving country, the premises of the diplomatic embassy are recognized as inviolable; local law enforcement agents cannot enter except with the express consent of the head of [4]. In bilateral negotiations, career diplomats negotiate complex trade pacts, extraditions, and strategic security accords through reciprocal [5]. When severe diplomatic disagreements flare between nations, governments may recall their ambassadors for consultations, expel diplomats declared persona non [6], or sever diplomatic ties entirely. The United Nations Security Council possesses the primary mandate to maintain international peace and security, wielding authority to impose mandatory economic sanctions or authorize military [7]. International judicial tribunals, such as the International Court of Justice in The Hague, adjudicate contentious legal disputes between states that accept its [8]. Respect for national sovereignty, territorial integrity, and the peaceful resolution of international disputes are foundational tenets of the United Nations [9]. Without mutual respect for international law, global governance degenerates into anarchic geopolitical coercion and military [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "law", option_b: "superstition", option_c: "myth", option_d: "anarchy", correct_answer: "A", explanation: "'Customary international law' is the recognized body of international legal norms." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "jurisdiction", option_b: "commerce", option_c: "trade", option_d: "transport", correct_answer: "A", explanation: "Diplomatic immunity protects diplomats from local court 'jurisdiction'." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "detention", option_b: "hospitality", option_c: "elevation", option_d: "promotion", correct_answer: "A", explanation: "Diplomatic protection shields diplomats from arbitrary 'detention' or arrest." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "mission", option_b: "court", option_c: "parliament", option_d: "hospital", correct_answer: "A", explanation: "'Head of mission' is the official international diplomatic title for the chief diplomat or ambassador." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "concessions", option_b: "bribes", option_c: "threats", option_d: "extortions", correct_answer: "A", explanation: "Negotiations succeed through compromise and 'reciprocal concessions'." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "grata", option_b: "fide", option_c: "facto", option_d: "juris", correct_answer: "A", explanation: "'Persona non grata' is the international diplomatic legal phrase meaning an unwelcome person." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "intervention", option_b: "celebration", option_c: "congratulation", option_d: "relaxation", correct_answer: "A", explanation: "'Military intervention' is the authorized collective military enforcement under Chapter VII of the UN Charter." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "jurisdiction", option_b: "banquet", option_c: "hospitality", option_d: "condemnation", correct_answer: "A", explanation: "Tribunals hear cases between states that submit to their legal 'jurisdiction'." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "Charter", option_b: "Diary", option_c: "Pamphlet", option_d: "Bulletin", correct_answer: "A", explanation: "'United Nations Charter' is the foundational treaty and constitution of the UN." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "conflict", option_b: "harmony", option_c: "concord", option_d: "solidarity", correct_answer: "A", explanation: "Geopolitical coercion leads to armed 'military conflict'." },
    ]
  },
  {
    id: "CLOZE_021",
    title: "Cognitive Psychology and Memory Retention",
    text: "Cognitive psychology investigates the complex mental processes underpinning how human beings acquire, store, and retrieve [1]. Memory is traditionally conceptualized as a multi-stage cognitive architecture, commencing with sensory memory which registers fleeting environmental stimuli through sight and [2]. Relevant stimuli that receive conscious attention transition into working memory, an active workspace with limited storage [3]. Most individuals can hold approximately seven discrete units of information in short-term consciousness before cognitive decay or displacement [4]. To transfer knowledge into durable long-term storage, cognitive scientists recommend encoding techniques such as spaced repetition and elaborative [5]. Rather than engaging in last-minute passive cramming, students achieve superior retention by spacing study sessions over days and actively retrieving concepts from [6]. Furthermore, information is organized in long-term memory into structured cognitive networks termed [7]. When newly learned material contradicts existing beliefs, learners experience cognitive dissonance, motivating intellectual reassessment and conceptual [8]. Sleep also plays a vital neurobiological function in memory consolidation; during slow-wave and rapid-eye-movement sleep phases, the brain strengthens synaptic connections while pruning irrelevant [9]. By understanding these cognitive mechanisms, learners can cultivate metacognitive awareness, tailoring their study routines to maximize memory retention and academic [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "information", option_b: "debris", option_c: "rubbish", option_d: "contraband", correct_answer: "A", explanation: "'Acquire, store, and retrieve information' is the classic definition of cognitive memory." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "sound", option_b: "telepathy", option_c: "clairvoyance", option_d: "superstition", correct_answer: "A", explanation: "Sensory memory registers physical sensory inputs, notably sight and 'sound'." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "capacity", option_b: "deficit", option_c: "abyss", option_d: "vacuum", correct_answer: "A", explanation: "'Storage capacity' refers to the limited quantity of items working memory can hold." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "occurs", option_b: "prevails", option_c: "survives", option_d: "lingers", correct_answer: "A", explanation: "Before decay or displacement 'occurs' fits the temporal clause." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "rehearsal", option_b: "parody", option_c: "mimicry", option_d: "burlesque", correct_answer: "A", explanation: "'Elaborative rehearsal' is the psychological term for connecting new info with already stored knowledge." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "memory", option_b: "oblivion", option_c: "amnesia", option_d: "void", correct_answer: "A", explanation: "'Active retrieval from memory' is the proven testing effect in cognitive psychology." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "schemas", option_b: "caricatures", option_c: "sketches", option_d: "doodles", correct_answer: "A", explanation: "'Schemas' (or schemata) are cognitive frameworks that help organize and interpret information." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "restructuring", option_b: "demolition", option_c: "vandalism", option_d: "destruction", correct_answer: "A", explanation: "'Conceptual restructuring' is the cognitive re-organization of knowledge." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "data", option_b: "flesh", option_c: "bone", option_d: "cartilage", correct_answer: "A", explanation: "The brain consolidates neural connections and prunes extraneous neural 'data'." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "success", option_b: "stagnation", option_c: "failure", option_d: "paralysis", correct_answer: "A", explanation: "'Academic success' denotes positive achievement in educational endeavors." },
    ]
  },
  {
    id: "CLOZE_022",
    title: "Journalism, Media Ethics and Digital Literacy",
    text: "In democratic societies, independent journalism functions as the fourth estate, holding public figures accountable and informing civic [1]. Professional reporters operate under journalistic codes of conduct that emphasize factual accuracy, impartiality, and verified [2]. Before publishing investigative exposés, reputable news organizations cross-reference documentation, interview credible corroborating witnesses, and grant accused parties the right of [3]. However, the advent of digital social media platforms has revolutionized information dissemination while simultaneously weakening traditional editorial [4]. The democratization of content creation has enabled rapid viral propagation of sensational clickbait, partisan propaganda, and deliberate [5]. Devoid of journalistic fact-checking, fabricated headlines masquerade as authentic news, polarizing electorate opinion and undermining trust in democratic [6]. Defamation laws, encompassing libel in written form and slander in spoken expression, provide civil legal recourse for individuals whose reputations are unfairly [7]. Nevertheless, courts must vigilantly protect whistleblowers and investigative journalists from frivolous strategic lawsuits against public [8]. Enhancing digital literacy among citizens is vital to cultivate critical discernment, teaching readers how to scrutinize source credentials, identify sponsored content, and verify digital [9]. When society champions a free, ethical, and courageous press, public discourse thrives on truth rather than fabricated [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "discourse", option_b: "silence", option_c: "apathy", option_d: "lethargy", correct_answer: "A", explanation: "'Civic discourse' refers to dialogue and debate among citizens on public matters." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "sources", option_b: "fables", option_c: "rumors", option_d: "gossip", correct_answer: "A", explanation: "'Verified sources' is the cornerstone of journalistic integrity and fact checking." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "reply", option_b: "arrest", option_c: "eviction", option_d: "sentence", correct_answer: "A", explanation: "'Right of reply' is the fundamental media ethics principle allowing accused persons to state their side." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "oversight", option_b: "negligence", option_c: "paralysis", option_d: "subversion", correct_answer: "A", explanation: "'Editorial oversight' is the professional supervision and verification exercised by newspaper editors." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "disinformation", option_b: "veracity", option_c: "honesty", option_d: "authenticity", correct_answer: "A", explanation: "'Deliberate disinformation' refers to intentionally fabricated falsehoods spread to deceive." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "institutions", option_b: "prisons", option_c: "dungeons", option_d: "asylums", correct_answer: "A", explanation: "'Democratic institutions' refers to the foundational bodies and systems sustaining democracy." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "maligned", option_b: "exalted", option_c: "venerated", option_d: "extolled", correct_answer: "A", explanation: "'Maligned' means spoken ill of or defamed unjustly." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "participation", option_b: "apathy", option_c: "indifference", option_d: "paralysis", correct_answer: "A", explanation: "'Strategic Lawsuits Against Public Participation' (SLAPP suits) are abusive lawsuits intended to censor critics." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "images", option_b: "dreams", option_c: "hallucinations", option_d: "fantasies", correct_answer: "A", explanation: "'Verify digital images' (checking for AI deepfakes and doctored photos) is a core media literacy skill." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "falsehoods", option_b: "truths", option_c: "realities", option_d: "facts", correct_answer: "A", explanation: "'Fabricated falsehoods' contrasts sharply with truth in public discourse." },
    ]
  },
  {
    id: "CLOZE_023",
    title: "African Historiography and Archaeological Discoveries",
    text: "For generations, colonial historiography distorted Africa's past, advancing the Eurocentric myth that the continent lacked complex ancient [1]. However, groundbreaking archaeological excavations and multidisciplinary historical research have conclusively dismantled these prejudiced [2]. From the sophisticated terra-cotta sculptures of the ancient Nok culture to the monumental stone architecture of Great Zimbabwe, Africa's antiquity is marked by magnificent artistic and metallurgical [3]. In the Sahelian kingdoms of ancient Ghana, Mali, and Songhai, flourishing trans-Saharan commerce in gold, salt, and manuscripts fostered renowned centers of Islamic [4]. The university libraries of Timbuktu housed tens of thousands of scholarly treatises covering astronomy, jurisprudence, mathematics, and optical [5]. Rather than relying exclusively on European travelers' accounts, contemporary African historiographers utilize oral traditions, linguistic paleontology, and radiocarbon [6]. Oral epics preserved across generations by hereditary West African griots offer nuanced chronicles of lineage, governance, and social [7]. Archaeological discoveries in the Nile Valley further elucidate the mutual cultural cross-fertilization between ancient Egypt and Nubian [8]. Preserving these precious antiquities against illicit looting and international art trafficking remains an urgent continental [9]. Restitution initiatives aimed at repatriating looted artifacts from European museums represent a vital step toward restoring Africa's historical dignity and cultural [10].",
    questions: [
      { blankNum: 1, question: "Select the most appropriate word for blank [1]:", option_a: "civilizations", option_b: "ruins", option_c: "deserts", option_d: "swamps", correct_answer: "A", explanation: "'Ancient civilizations' is the historical term for advanced human societies with complex institutions." },
      { blankNum: 2, question: "Select the most appropriate word for blank [2]:", option_a: "narratives", option_b: "facts", option_c: "truths", option_d: "realities", correct_answer: "A", explanation: "'Prejudiced narratives' refers to biased and false historical accounts." },
      { blankNum: 3, question: "Select the most appropriate word for blank [3]:", option_a: "achievements", option_b: "failures", option_c: "stagnations", option_d: "crises", correct_answer: "A", explanation: "'Metallurgical achievements' celebrates the skilled iron and bronze smelting technologies of ancient Africa." },
      { blankNum: 4, question: "Select the most appropriate word for blank [4]:", option_a: "scholarship", option_b: "piracy", option_c: "banditry", option_d: "anarchy", correct_answer: "A", explanation: "'Centers of Islamic scholarship' is the recognized historical description of Timbuktu and Djenne." },
      { blankNum: 5, question: "Select the most appropriate word for blank [5]:", option_a: "sciences", option_b: "superstitions", option_c: "myths", option_d: "fables", correct_answer: "A", explanation: "'Optical sciences' refers to the study of optics and light documented in ancient Timbuktu manuscripts." },
      { blankNum: 6, question: "Select the most appropriate word for blank [6]:", option_a: "dating", option_b: "speculation", option_c: "guessing", option_d: "divination", correct_answer: "A", explanation: "'Radiocarbon dating' is the standard scientific archaeological method of determining age of organic matter." },
      { blankNum: 7, question: "Select the most appropriate word for blank [7]:", option_a: "structures", option_b: "conflicts", option_c: "crises", option_d: "fractures", correct_answer: "A", explanation: "'Social structures' refers to the organized patterns of relationships and institutions in society." },
      { blankNum: 8, question: "Select the most appropriate word for blank [8]:", option_a: "dynasties", option_b: "deserts", option_c: "jungles", option_d: "swamps", correct_answer: "A", explanation: "'Nubian dynasties' (such as the 25th Dynasty of Egypt) represents Kushite pharaohs." },
      { blankNum: 9, question: "Select the most appropriate word for blank [9]:", option_a: "priority", option_b: "diversion", option_c: "triviality", option_d: "recreation", correct_answer: "A", explanation: "'Continental priority' stresses the urgent importance of cultural heritage protection." },
      { blankNum: 10, question: "Select the most appropriate word for blank [10]:", option_a: "heritage", option_b: "extinction", option_c: "dereliction", option_d: "oblivion", correct_answer: "A", explanation: "'Cultural heritage' encompasses the legacy of physical artifacts and intangible attributes of a group." },
    ]
  }
];

function generateMigration(): string {
  const lines: string[] = [];
  lines.push(`-- BRAINLAB CBT ENGINE - CLOZE TEST INTEGRATION, SUBJECT CONSTRAINTS & RLS HARMONIZATION`);
  lines.push(`-- Migration: 20261103210000_cloze_test_integration_and_subject_constraints.sql\n`);
  lines.push(`begin;\n`);

  lines.push(`-- ============================================================================`);
  lines.push(`-- 1. EXTEND SUBJECT AND SECTION CHECK CONSTRAINTS ON PUBLIC.QUESTIONS`);
  lines.push(`-- ============================================================================`);
  lines.push(`alter table public.questions drop constraint if exists questions_subject_check;`);
  lines.push(`alter table public.questions add constraint questions_subject_check check (`);
  lines.push(`  subject in (`);
  lines.push(`    'English', 'Mathematics', 'Physics', 'Chemistry', 'Biology',`);
  lines.push(`    'Literature in English', 'Government', 'Economics', 'Commerce',`);
  lines.push(`    'Christian Religious Studies', 'Islamic Religious Studies',`);
  lines.push(`    'Geography', 'Agricultural Science', 'Civic Education', 'Computer Studies',`);
  lines.push(`    'History', 'French', 'Music', 'Visual Arts', 'Home Economics',`);
  lines.push(`    'Physical and Health Education', 'Yoruba', 'Hausa', 'Igbo',`);
  lines.push(`    'Further Mathematics', 'General'`);
  lines.push(`  )`);
  lines.push(`);\n`);

  lines.push(`alter table public.questions drop constraint if exists questions_section_check;`);
  lines.push(`alter table public.questions add constraint questions_section_check check (`);
  lines.push(`  section in ('objective', 'comprehension', 'literature', 'cloze')`);
  lines.push(`);\n`);

  lines.push(`-- Performance indexes for passage and cloze lookups`);
  lines.push(`create index if not exists idx_questions_passage_id on public.questions (passage_id) where passage_id is not null;`);
  lines.push(`create index if not exists idx_questions_cloze_active on public.questions (subject, is_active, section) where subject = 'English';\n`);

  lines.push(`-- ============================================================================`);
  lines.push(`-- 2. ROW LEVEL SECURITY POLICIES FOR UNPROTECTED CBT & COMPETITION TABLES`);
  lines.push(`-- ============================================================================`);

  // exam_blueprints
  lines.push(`-- Exam Blueprints`);
  lines.push(`alter table public.exam_blueprints enable row level security;`);
  lines.push(`drop policy if exists exam_blueprints_read_all on public.exam_blueprints;`);
  lines.push(`create policy exam_blueprints_read_all on public.exam_blueprints for select using (true);`);
  lines.push(`drop policy if exists exam_blueprints_admin_write on public.exam_blueprints;`);
  lines.push(`create policy exam_blueprints_admin_write on public.exam_blueprints for all to authenticated using (public.is_admin()) with check (public.is_admin());\n`);

  // reading_texts
  lines.push(`-- Reading Texts`);
  lines.push(`alter table public.reading_texts enable row level security;`);
  lines.push(`drop policy if exists reading_texts_read_all on public.reading_texts;`);
  lines.push(`create policy reading_texts_read_all on public.reading_texts for select using (true);`);
  lines.push(`drop policy if exists reading_texts_admin_write on public.reading_texts;`);
  lines.push(`create policy reading_texts_admin_write on public.reading_texts for all to authenticated using (public.is_admin()) with check (public.is_admin());\n`);

  // high_yield_topics
  lines.push(`-- High Yield Topics`);
  lines.push(`alter table public.high_yield_topics enable row level security;`);
  lines.push(`drop policy if exists high_yield_topics_read_all on public.high_yield_topics;`);
  lines.push(`create policy high_yield_topics_read_all on public.high_yield_topics for select using (true);`);
  lines.push(`drop policy if exists high_yield_topics_admin_write on public.high_yield_topics;`);
  lines.push(`create policy high_yield_topics_admin_write on public.high_yield_topics for all to authenticated using (public.is_admin()) with check (public.is_admin());\n`);

  // duplicate_question_reviews
  lines.push(`-- Duplicate Question Reviews`);
  lines.push(`alter table public.duplicate_question_reviews enable row level security;`);
  lines.push(`drop policy if exists duplicate_reviews_admin on public.duplicate_question_reviews;`);
  lines.push(`create policy duplicate_reviews_admin on public.duplicate_question_reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());\n`);

  // exam_attempt_snapshots
  lines.push(`-- Exam Attempt Snapshots`);
  lines.push(`alter table public.exam_attempt_snapshots enable row level security;`);
  lines.push(`drop policy if exists exam_snapshots_read on public.exam_attempt_snapshots;`);
  lines.push(`create policy exam_snapshots_read on public.exam_attempt_snapshots for select using (true);`);
  lines.push(`drop policy if exists exam_snapshots_insert on public.exam_attempt_snapshots;`);
  lines.push(`create policy exam_snapshots_insert on public.exam_attempt_snapshots for insert with check (true);\n`);

  // competition tables
  lines.push(`-- Competitions`);
  lines.push(`alter table public.competitions enable row level security;`);
  lines.push(`drop policy if exists competitions_read_policy on public.competitions;`);
  lines.push(`create policy competitions_read_policy on public.competitions for select using (`);
  lines.push(`  status in ('active', 'completed', 'published', 'upcoming') or public.is_admin()`);
  lines.push(`);`);
  lines.push(`drop policy if exists competitions_admin_write on public.competitions;`);
  lines.push(`create policy competitions_admin_write on public.competitions for all to authenticated using (`);
  lines.push(`  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')`);
  lines.push(`) with check (`);
  lines.push(`  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')`);
  lines.push(`);\n`);

  // competition_question_banks
  lines.push(`alter table public.competition_question_banks enable row level security;`);
  lines.push(`drop policy if exists comp_banks_read on public.competition_question_banks;`);
  lines.push(`create policy comp_banks_read on public.competition_question_banks for select using (`);
  lines.push(`  visibility = 'public' or owner_id = auth.uid() or public.is_admin()`);
  lines.push(`);`);
  lines.push(`drop policy if exists comp_banks_write on public.competition_question_banks;`);
  lines.push(`create policy comp_banks_write on public.competition_question_banks for all to authenticated using (`);
  lines.push(`  owner_id = auth.uid() or public.is_admin()`);
  lines.push(`) with check (`);
  lines.push(`  owner_id = auth.uid() or public.is_admin()`);
  lines.push(`);\n`);

  // competition_questions
  lines.push(`alter table public.competition_questions enable row level security;`);
  lines.push(`drop policy if exists comp_questions_read on public.competition_questions;`);
  lines.push(`create policy comp_questions_read on public.competition_questions for select using (`);
  lines.push(`  public.is_admin() or exists (`);
  lines.push(`    select 1 from public.competition_question_banks b where b.id = competition_questions.bank_id and (`);
  lines.push(`      b.visibility = 'public' or b.owner_id = auth.uid()`);
  lines.push(`    )`);
  lines.push(`  )`);
  lines.push(`);`);
  lines.push(`drop policy if exists comp_questions_write on public.competition_questions;`);
  lines.push(`create policy comp_questions_write on public.competition_questions for all to authenticated using (`);
  lines.push(`  public.is_admin() or exists (`);
  lines.push(`    select 1 from public.competition_question_banks b where b.id = competition_questions.bank_id and (`);
  lines.push(`      b.owner_id = auth.uid()`);
  lines.push(`    )`);
  lines.push(`  )`);
  lines.push(`) with check (`);
  lines.push(`  public.is_admin() or exists (`);
  lines.push(`    select 1 from public.competition_question_banks b where b.id = competition_questions.bank_id and (`);
  lines.push(`      b.owner_id = auth.uid()`);
  lines.push(`    )`);
  lines.push(`  )`);
  lines.push(`);\n`);

  // competition_participants
  lines.push(`alter table public.competition_participants enable row level security;`);
  lines.push(`drop policy if exists comp_participants_read on public.competition_participants;`);
  lines.push(`create policy comp_participants_read on public.competition_participants for select using (`);
  lines.push(`  user_id = auth.uid() or public.is_admin()`);
  lines.push(`);`);
  lines.push(`drop policy if exists comp_participants_insert on public.competition_participants;`);
  lines.push(`create policy comp_participants_insert on public.competition_participants for insert to authenticated with check (`);
  lines.push(`  user_id = auth.uid() or public.is_admin()`);
  lines.push(`);`);
  lines.push(`drop policy if exists comp_participants_update on public.competition_participants;`);
  lines.push(`create policy comp_participants_update on public.competition_participants for update to authenticated using (`);
  lines.push(`  user_id = auth.uid() or public.is_admin()`);
  lines.push(`);\n`);

  // competition_user_permissions
  lines.push(`alter table public.competition_user_permissions enable row level security;`);
  lines.push(`drop policy if exists comp_perms_read on public.competition_user_permissions;`);
  lines.push(`create policy comp_perms_read on public.competition_user_permissions for select using (`);
  lines.push(`  user_id = auth.uid() or public.is_admin()`);
  lines.push(`);`);
  lines.push(`drop policy if exists comp_perms_write on public.competition_user_permissions;`);
  lines.push(`create policy comp_perms_write on public.competition_user_permissions for all to authenticated using (`);
  lines.push(`  public.is_admin()`);
  lines.push(`) with check (`);
  lines.push(`  public.is_admin()`);
  lines.push(`);\n`);

  // competition_attempt_snapshots
  lines.push(`alter table public.competition_attempt_snapshots enable row level security;`);
  lines.push(`drop policy if exists comp_snapshots_read on public.competition_attempt_snapshots;`);
  lines.push(`create policy comp_snapshots_read on public.competition_attempt_snapshots for select using (`);
  lines.push(`  user_id = auth.uid() or public.is_admin()`);
  lines.push(`);`);
  lines.push(`drop policy if exists comp_snapshots_insert on public.competition_attempt_snapshots;`);
  lines.push(`create policy comp_snapshots_insert on public.competition_attempt_snapshots for insert with check (true);\n`);

  // other competition administrative tables
  const adminOnlyTables = [
    "competition_audit_logs",
    "competition_import_batches",
    "competition_moderation_cases",
    "competition_question_duplicates",
    "competition_reward_proposals"
  ];

  for (const tbl of adminOnlyTables) {
    lines.push(`alter table public.${tbl} enable row level security;`);
    lines.push(`drop policy if exists ${tbl}_admin_policy on public.${tbl};`);
    lines.push(`create policy ${tbl}_admin_policy on public.${tbl} for all to authenticated using (`);
    lines.push(`  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.view')`);
    lines.push(`) with check (`);
    lines.push(`  public.is_admin() or public.has_competition_permission(auth.uid(), 'competition.create')`);
    lines.push(`);\n`);
  }

  lines.push(`-- ============================================================================`);
  lines.push(`-- 3. SEED 23 CLOZE TEST PASSAGES AND 230 LINKED QUESTIONS`);
  lines.push(`-- ============================================================================`);
  lines.push(`-- Each passage forms one complete 10-question independent selection unit.`);
  lines.push(`-- Preserves passage_id, sequential blanks [1]..[10], and marks = 2 per question.\n`);

  function escapeSql(str: string): string {
    return str.replace(/'/g, "''");
  }

  for (const p of passages) {
    lines.push(`-- Passage ${p.id}: ${escapeSql(p.title)}`);
    for (const q of p.questions) {
      const qPrompt = `Select the option that best completes blank [${q.blankNum}] in the passage.`;
      lines.push(`insert into public.questions (`);
      lines.push(`  subject, section, category, topic, subtopic,`);
      lines.push(`  passage_id, passage_title, passage_text,`);
      lines.push(`  question, option_a, option_b, option_c, option_d,`);
      lines.push(`  correct_answer, explanation, marks, difficulty, is_active, verification_status`);
      lines.push(`)`);
      lines.push(`select`);
      lines.push(`  'English', 'cloze', 'Cloze passage', 'Cloze passage', '${escapeSql(p.title)}',`);
      lines.push(`  '${p.id}', '${escapeSql(p.title)}', '${escapeSql(p.text)}',`);
      lines.push(`  '${escapeSql(qPrompt)}', '${escapeSql(q.option_a)}', '${escapeSql(q.option_b)}', '${escapeSql(q.option_c)}', '${escapeSql(q.option_d)}',`);
      lines.push(`  '${q.correct_answer}', '${escapeSql(q.explanation)}', 2, 'medium', true, 'verified'`);
      lines.push(`where not exists (`);
      lines.push(`  select 1 from public.questions where passage_id = '${p.id}' and question = '${escapeSql(qPrompt)}'`);
      lines.push(`);\n`);
    }
  }

  lines.push(`commit;\n`);
  return lines.join("\n");
}

const migrationContent = generateMigration();
const migrationPath = path.resolve(__dirname, "../supabase/migrations/20261103210000_cloze_test_integration_and_subject_constraints.sql");
fs.writeFileSync(migrationPath, migrationContent, "utf8");
console.log(`Generated migration successfully at: ${migrationPath}`);
console.log(`Passages count: ${passages.length}`);
console.log(`Questions count: ${passages.reduce((sum, p) => sum + p.questions.length, 0)}`);
