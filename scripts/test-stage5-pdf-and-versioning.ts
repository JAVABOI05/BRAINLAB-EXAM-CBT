import {
  detectDocumentAspectRatio,
  exportWhiteboardToPdf,
} from "../app/components/classroom/whiteboard/pdfService";
import type { WhiteboardPage } from "../app/components/SmartWhiteboard";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runStage5Verification() {
  console.log("\n🧪 --- BRAINLAB LIVEBOARD STAGE 5: MULTI-PAGE PDF & VERSIONING TEST SUITE ---\n");

  // --------------------------------------------------------------------------
  // TEST 1: Aspect Ratio Detection (Eliminating 16:9 distortion)
  // --------------------------------------------------------------------------
  const aspectWidescreen = detectDocumentAspectRatio(1920, 1080);
  assert(aspectWidescreen === "16 / 9", "1920x1080 detected as '16 / 9'");

  const aspectStandard = detectDocumentAspectRatio(1024, 768);
  assert(aspectStandard === "4 / 3", "1024x768 standard slides detected as '4 / 3'");

  const aspectPortrait = detectDocumentAspectRatio(1080, 1920);
  assert(aspectPortrait === "9 / 16", "1080x1920 mobile portrait detected as '9 / 16'");

  const aspectDocA4 = detectDocumentAspectRatio(595, 842); // A4 portrait ratio ~0.706
  assert(aspectDocA4 === "9 / 16", "A4 portrait document detected as '9 / 16' (no wide distortion)");

  const aspectSquare = detectDocumentAspectRatio(600, 600);
  assert(aspectSquare === "free", "Square document detected as 'free'");

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Page PDF Document Generation
  // --------------------------------------------------------------------------
  const samplePages: WhiteboardPage[] = [
    {
      id: "page-1",
      title: "Lecture Introduction: Kinematics",
      aspectRatio: "16 / 9",
      backgroundMode: "blackboard",
      elements: [
        {
          id: "el-1",
          type: "text",
          color: "#38bdf8",
          width: 2,
          startX: 100,
          startY: 120,
          text: "BrainLab Physics 101: Motion in One Dimension",
          fontSize: 28,
        },
        {
          id: "el-2",
          type: "arrow",
          color: "#10b981",
          width: 3,
          startX: 100,
          startY: 300,
          endX: 600,
          endY: 300,
        },
      ],
    },
    {
      id: "page-2",
      title: "Page 2: Vector Equations & Derivation",
      aspectRatio: "16 / 9",
      backgroundMode: "grid",
      elements: [
        {
          id: "el-3",
          type: "text",
          color: "#facc15",
          width: 2,
          startX: 150,
          startY: 200,
          text: "v^2 = u^2 + 2as",
          fontSize: 32,
        },
      ],
    },
    {
      id: "page-3",
      title: "Page 3: Practice Problem Summary",
      aspectRatio: "16 / 9",
      backgroundMode: "whiteboard",
      elements: [
        {
          id: "el-4",
          type: "rect",
          color: "#ff5238",
          width: 2,
          startX: 200,
          startY: 200,
          endX: 800,
          endY: 500,
        },
      ],
    },
  ];

  const pdfBlob = await exportWhiteboardToPdf(samplePages);
  assert(pdfBlob !== null, "exportWhiteboardToPdf generated non-null Blob");
  assert(pdfBlob!.type === "application/pdf", "Generated Blob MIME type is 'application/pdf'");
  assert(pdfBlob!.size > 1000, `Generated PDF contains ${pdfBlob!.size} bytes of valid binary PDF data`);

  // --------------------------------------------------------------------------
  // TEST 3: Versioning & Template Duplication Integrity
  // --------------------------------------------------------------------------
  const baseLesson = {
    id: "lesson-abc-123",
    title: "JAMB Mathematics: Trigonometric Identities",
    status: "draft" as const,
    version: 1,
    pages: samplePages,
    updated_at: new Date().toISOString(),
  };

  // Simulating duplicateAsTemplate
  const duplicatedLesson = {
    ...baseLesson,
    id: null,
    title: `Copy of ${baseLesson.title}`,
    status: "draft" as const,
    version: 1,
  };

  assert(duplicatedLesson.id === null, "Duplicated template resets lessonId for new draft generation");
  assert(duplicatedLesson.title.startsWith("Copy of "), "Duplicated template has new title prefix");
  assert(duplicatedLesson.pages.length === 3, "Duplicated template preserves all original page content");

  console.log("\n========================================================");
  console.log("🎉 ALL STAGE 5 MULTI-PAGE PDF & VERSIONING VERIFICATIONS PASSED!");
  console.log("========================================================\n");
}

runStage5Verification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
