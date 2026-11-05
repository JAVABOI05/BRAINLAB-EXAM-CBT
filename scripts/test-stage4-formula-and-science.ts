import {
  STEM_FORMULA_PRESETS,
  renderLatexToHtml,
  buildLatexSvgDataUrl,
  createFormulaElement,
} from "../app/components/classroom/whiteboard/formulaEngine";
import {
  SCIENCE_DIAGRAM_PRESETS,
  generateResistor,
  generateCapacitor,
  generateBattery,
  generateGround,
  generateBeaker,
  generateBenzeneRing,
  generateAnimalCell,
  generateDNAStrand,
} from "../app/components/classroom/whiteboard/scienceDiagrams";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runStage4Verification() {
  console.log("\n🧪 --- BRAINLAB LIVEBOARD STAGE 4: MATHEMATICAL FORMULAS & SCIENCE DIAGRAMS TEST SUITE ---\n");

  // --------------------------------------------------------------------------
  // TEST 1: KaTeX Formula Rendering
  // --------------------------------------------------------------------------
  const quadraticHtml = renderLatexToHtml("x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}");
  assert(quadraticHtml.includes("katex"), "KaTeX rendered quadratic equation into valid HTML markup");
  assert(quadraticHtml.includes("<math") || quadraticHtml.includes("katex-html"), "HTML contains MathML or KaTeX HTML spans");

  const einsteinHtml = renderLatexToHtml("E = m c^2");
  assert(einsteinHtml.includes("katex"), "KaTeX rendered mass-energy equivalence equation");

  // Error tolerance check (malformed LaTeX should not crash)
  const safeMalformed = renderLatexToHtml("\\frac{broken");
  assert(typeof safeMalformed === "string" && safeMalformed.length > 0, "Malformed LaTeX handled safely without throwing error");

  // --------------------------------------------------------------------------
  // TEST 2: STEM Formula Presets & SVG Cache Generation
  // --------------------------------------------------------------------------
  assert(STEM_FORMULA_PRESETS.length >= 10, `Loaded ${STEM_FORMULA_PRESETS.length} STEM academic formula presets`);

  const formulaEl = createFormulaElement("a^2 + b^2 = c^2", 400, 300, "#38bdf8", 24);
  assert(formulaEl.type === "text" && formulaEl.text === "a^2 + b^2 = c^2", "Formula element created with correct properties");

  const svgDataUrl = buildLatexSvgDataUrl("PV = nRT", "#38bdf8", 24);
  assert(svgDataUrl.startsWith("data:image/svg+xml;charset=utf-8,"), "SVG Data URL generated for canvas image rendering");

  // --------------------------------------------------------------------------
  // TEST 3: Electrical Circuit Diagram Presets (Physics)
  // --------------------------------------------------------------------------
  const resistorEls = generateResistor(500, 300);
  assert(resistorEls.some((e) => e.type === "pen" && (e.points?.length ?? 0) >= 8), "Resistor generated with zig-zag points");
  assert(resistorEls.some((e) => e.type === "text" && e.text === "R"), "Resistor component has 'R' annotation");

  const capacitorEls = generateCapacitor(500, 300);
  assert(capacitorEls.filter((e) => e.type === "line").length === 4, "Capacitor generated with 2 plates and 2 leads");
  assert(capacitorEls.some((e) => e.type === "text" && e.text === "C"), "Capacitor component has 'C' annotation");

  const batteryEls = generateBattery(500, 300);
  assert(batteryEls.some((e) => e.type === "text" && e.text === "+"), "DC Battery contains positive polarity indicator");
  assert(batteryEls.some((e) => e.type === "text" && e.text === "-"), "DC Battery contains negative polarity indicator");

  const groundEls = generateGround(500, 300);
  assert(groundEls.filter((e) => e.type === "line").length === 4, "Ground symbol contains vertical stem and 3 ground bars");

  // --------------------------------------------------------------------------
  // TEST 4: Chemistry Apparatus & Molecules
  // --------------------------------------------------------------------------
  const beakerEls = generateBeaker(500, 300);
  assert(beakerEls.some((e) => e.id.includes("contour")), "Chemistry beaker has glass contour outline");
  assert(beakerEls.some((e) => e.id.includes("liquid") && e.fillColor), "Chemistry beaker includes liquid fill");
  assert(beakerEls.some((e) => e.id.includes("tick")), "Chemistry beaker includes graduated measurement ticks");

  const benzeneEls = generateBenzeneRing(500, 300);
  assert(benzeneEls.some((e) => e.type === "pen" && e.points?.length === 7), "Benzene ring includes closed hexagonal perimeter (6 vertices + 1 loop closure)");
  assert(benzeneEls.some((e) => e.type === "circle"), "Benzene ring includes inner aromatic delocalization circle");

  // --------------------------------------------------------------------------
  // TEST 5: Biology & Genetics Templates
  // --------------------------------------------------------------------------
  const cellEls = generateAnimalCell(500, 300);
  assert(cellEls.some((e) => e.id.includes("membrane")), "Animal cell includes outer plasma membrane");
  assert(cellEls.some((e) => e.id.includes("nucleus")), "Animal cell includes nucleus organelle");
  assert(cellEls.some((e) => e.id.includes("mito")), "Animal cell includes mitochondria");

  const dnaEls = generateDNAStrand(500, 300);
  assert(dnaEls.some((e) => e.id.includes("strand1") && e.points && e.points.length >= 25), "DNA includes helical strand 1");
  assert(dnaEls.some((e) => e.id.includes("strand2") && e.points && e.points.length >= 25), "DNA includes helical strand 2");
  assert(dnaEls.some((e) => e.id.includes("base-")), "DNA includes base-pair rung crossbars");

  // --------------------------------------------------------------------------
  // TEST 6: Preset Registry Integrity
  // --------------------------------------------------------------------------
  assert(SCIENCE_DIAGRAM_PRESETS.length >= 8, `Science diagram registry has ${SCIENCE_DIAGRAM_PRESETS.length} presets`);
  for (const preset of SCIENCE_DIAGRAM_PRESETS) {
    const generated = preset.generate(960, 540);
    assert(generated.length > 0, `Preset '${preset.name}' generated ${generated.length} vector elements`);
    assert(generated.every((el) => el.id && el.type), `All elements for '${preset.name}' have valid ID and type`);
  }

  console.log("\n========================================================");
  console.log("🎉 ALL STAGE 4 MATHEMATICAL & SCIENCE VERIFICATIONS PASSED!");
  console.log("========================================================\n");
}

runStage4Verification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
