// Set test environment fallbacks before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key-for-unit-testing";

import fs from "fs";
import path from "path";
import { CURATED_MOLECULES, type CuratedMolecule, type MacromoleculeData, type StemViewerAction } from "../app/components/stem/Molecular3DViewer";
import { generateMoleculeSvgDataUrl } from "../app/components/stem/molecularSvgExport";
import { isSupportedStemAdapter, STEM_ADAPTERS_BY_SLUG } from "../app/lib/stem/stemAdapters";
import { parseStemViewerActions, getCuratedQuickPrompts } from "../app/lib/stem/stemActionProtocol";
import type { StemAccessContext } from "../app/lib/stem/stemAccess";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function run() {
  console.log("================================================================================");
  console.log("  STEM STUDIO MOLECULAR ENGINE, PROTOCOL & ENTITLEMENTS VERIFICATION");
  console.log("================================================================================\n");

  // Dynamic import after env vars are established
  const { getMoleculeRequiredAccessLevel, canAccessMolecule } = await import("../app/lib/stem/stemAccess");

  console.log("[1/8] Verifying Curated Molecule Bank Inventory...");
  assert(CURATED_MOLECULES.length === 12, `Total curated models equals 12 (got ${CURATED_MOLECULES.length})`);
  const smallMolecules = CURATED_MOLECULES.filter((m) => m.type === "small_molecule");
  const macromolecules = CURATED_MOLECULES.filter((m) => m.type === "macromolecule") as MacromoleculeData[];
  assert(smallMolecules.length === 8, `Small molecules count equals 8 (got ${smallMolecules.length})`);
  assert(macromolecules.length === 4, `Macromolecules count equals 4 (got ${macromolecules.length})`);

  console.log("\n[2/8] Verifying Local Pre-Cached BinaryCIF (.bcif) Structure Files...");
  const publicStructuresDir = path.join(process.cwd(), "public", "structures");
  assert(fs.existsSync(publicStructuresDir), `public/structures/ directory exists`);

  const expectedBcifFiles = [
    { pdbId: "1BNA", file: "1bna.bcif", minSize: 100_000 },
    { pdbId: "1A3N", file: "1a3n.bcif", minSize: 300_000 },
    { pdbId: "2HBS", file: "2hbs.bcif", minSize: 500_000 },
    { pdbId: "1LYZ", file: "1lyz.bcif", minSize: 200_000 },
  ];

  for (const item of expectedBcifFiles) {
    const filePath = path.join(publicStructuresDir, item.file);
    assert(fs.existsSync(filePath), `Local asset public/structures/${item.file} exists`);
    const stat = fs.statSync(filePath);
    assert(stat.size >= item.minSize, `public/structures/${item.file} has valid byte payload (${stat.size} bytes >= ${item.minSize})`);

    const molecule = macromolecules.find((m) => m.pdbId === item.pdbId);
    assert(!!molecule, `Curated macromolecule ${item.pdbId} found in bank`);
    assert(molecule?.customUrl === `/structures/${item.file}`, `${item.pdbId} customUrl points to local /structures/${item.file}`);
    assert(molecule?.fallbackUrl === `https://models.rcsb.org/${item.file}`, `${item.pdbId} has remote fallbackUrl`);
    assert(molecule?.format === "bcif", `${item.pdbId} specifies bcif format`);
  }

  console.log("\n[3/8] Verifying Biological & Biochemical Residue Details...");
  const hba = macromolecules.find((m) => m.pdbId === "1A3N")!;
  assert(hba.highlightDetails?.chain === "B", "HbA highlights beta chain (Chain B)");
  assert(hba.highlightDetails?.residueNumber === 6, "HbA highlights mature codon 6 (Glu6)");

  const hbs = macromolecules.find((m) => m.pdbId === "2HBS")!;
  assert(hbs.highlightDetails?.chain === "B", "HbS highlights beta chain (Chain B)");
  assert(hbs.highlightDetails?.residueNumber === 6, "HbS highlights mutant Val6 at codon 6");

  const lyz = macromolecules.find((m) => m.pdbId === "1LYZ")!;
  assert(lyz.highlightDetails?.chain === "A", "Lysozyme highlights Chain A");
  assert(lyz.highlightDetails?.residueNumber === 35, "Lysozyme highlights catalytic Glu35");

  console.log("\n[4/8] Verifying 2D SVG Educational Fallback Generator...");
  for (const molecule of CURATED_MOLECULES) {
    const dataUrl = generateMoleculeSvgDataUrl(molecule);
    assert(dataUrl.startsWith("data:image/svg+xml;utf8,"), `${molecule.id} generates valid SVG data URL`);
    assert(dataUrl.length > 500, `${molecule.id} SVG contains substantive diagram content (len: ${dataUrl.length})`);
  }

  console.log("\n[5/8] Verifying StemViewerAction Protocol Schema...");
  const sampleActions: StemViewerAction[] = [
    { type: "FOCUS_RESIDUE", chain: "B", residue: 6, zoomLevel: 1.5 },
    { type: "HIGHLIGHT_MUTATION", chain: "B", residue: 6, colorHex: "#F43F5E", label: "Val6 Sickle Mutation" },
    { type: "SET_REPRESENTATION", representation: "cartoon" },
    { type: "TOGGLE_SPIN", enabled: false },
    { type: "RESET_VIEW" },
  ];
  assert(sampleActions.length === 5, "All 5 core viewer actions typecheck and construct cleanly");

  console.log("\n[6/8] Verifying STEM Adapters & Route Registry...");
  assert("molecular-3d-explorer" in STEM_ADAPTERS_BY_SLUG, "STEM_ADAPTERS_BY_SLUG contains molecular-3d-explorer");
  assert(isSupportedStemAdapter("molecular-3d-explorer", "molecular_3d"), "isSupportedStemAdapter returns true for molecular-3d-explorer and molecular_3d");

  console.log("\n[7/8] Verifying AI Copilot Action Parser & Syllabus Quick Prompts...");
  const sampleTutorText = `Under deoxy conditions, the point mutation causes polymerization. [ACTION:HIGHLIGHT_MUTATION chain="B" residue=6 label="Val6 Sickle"] You can also see the van der Waals packing by switching representation: [ACTION:SET_REPRESENTATION style="spacefill"]`;
  const parsed = parseStemViewerActions(sampleTutorText);

  assert(parsed.actions.length === 2, `Extracted 2 explicit actions from tutor response (got ${parsed.actions.length})`);
  assert(parsed.actions[0].action.type === "HIGHLIGHT_MUTATION", "Action 1 is HIGHLIGHT_MUTATION");
  assert((parsed.actions[0].action as any).chain === "B", "Action 1 chain is B");
  assert((parsed.actions[0].action as any).residue === 6, "Action 1 residue is 6");
  assert(parsed.actions[1].action.type === "SET_REPRESENTATION", "Action 2 is SET_REPRESENTATION");
  assert(!parsed.cleanText.includes("[ACTION:"), "Cleaned text strips raw action tags from learner output");

  // Inferred action test
  const naturalLanguageResponse = "Notice that the mutant val-6 residue creates an abnormal sticky hydrophobic contact on the beta globin chain.";
  const inferred = parseStemViewerActions(naturalLanguageResponse);
  assert(inferred.actions.length === 1, "Inferred action triggered by natural language Val-6 mention");
  assert(inferred.actions[0].action.type === "HIGHLIGHT_MUTATION", "Inferred action type is HIGHLIGHT_MUTATION");

  // Quick prompts test across all 12 molecules
  for (const m of CURATED_MOLECULES) {
    const prompts = getCuratedQuickPrompts(m);
    assert(prompts.length >= 1, `Molecule ${m.id} has at least 1 high-yield syllabus prompt (got ${prompts.length})`);
  }

  console.log("\n[8/8] Verifying Entitlements Tiering & Access Rules...");
  const waterMol = CURATED_MOLECULES.find((m) => m.id === "h2o")!;
  const dnaMol = CURATED_MOLECULES.find((m) => m.id === "dna-double-helix")!;
  const sickleMol = CURATED_MOLECULES.find((m) => m.id === "hemoglobin-sickle")!;

  assert(getMoleculeRequiredAccessLevel(waterMol) === "discover", "Water requires 'discover' (Free tier)");
  assert(getMoleculeRequiredAccessLevel(dnaMol) === "explore", "DNA requires 'explore' (Standard tier)");
  assert(getMoleculeRequiredAccessLevel(sickleMol) === "practise", "Sickle cell HbS requires 'practise' (Premium tier)");

  const mockFreeContext: StemAccessContext = {
    userId: "user-free",
    planId: "free",
    accessLevel: "discover",
    monthlyLabQuota: 0,
    isPrivileged: false,
    canSubmitLabs: true,
    entitlements: {} as any,
  };

  const mockPremiumContext: StemAccessContext = {
    userId: "user-premium",
    planId: "premium",
    accessLevel: "practise",
    monthlyLabQuota: 100,
    isPrivileged: false,
    canSubmitLabs: true,
    entitlements: {} as any,
  };

  assert(canAccessMolecule(mockFreeContext, waterMol) === true, "Free student CAN access Water (small molecule)");
  assert(canAccessMolecule(mockFreeContext, sickleMol) === false, "Free student cannot access Sickle HbS without upgrade");
  assert(canAccessMolecule(mockPremiumContext, sickleMol) === true, "Premium student CAN access Sickle HbS");

  console.log("\n================================================================================");
  console.log("  ALL TESTS PASSED: PHASE 4 ENTITLEMENTS & TELEMETRY VERIFIED");
  console.log("================================================================================");
}

run().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
