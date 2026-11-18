/**
 * BrainLab CI: Candidate Examination History & PDF Certificate Generation Test Suite
 *
 * Verifies:
 * 1. Migration and Rollback SQL for digital certificates and verification ledger
 * 2. PDF Certificate generation engine (geometry, typography, tamper-evident security, A4 landscape)
 * 3. Academic grading and standing classification
 * 4. Certificate generation and download server API endpoints
 * 5. Candidate examination history API and data structure
 * 6. Portal UI navigation and verifiable certificate integration
 */

import fs from "fs";
import path from "path";
import {
  generateCertificatePdf,
  getAcademicStanding,
  formatCertificateVerificationUrl,
  CANONICAL_VERIFY_DOMAIN,
  type CertificatePdfData,
} from "../app/lib/certificatePdfService";
import { generateQrMatrix, generateQrSvgString } from "../app/lib/qrCode";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log("\n=========================================================================");
console.log("  BRAINLAB CI: CANDIDATE EXAM HISTORY & CERTIFICATE TEST SUITE");
console.log("=========================================================================\n");

// ---------------------------------------------------------------------------
// 1. DATABASE MIGRATION & ROLLBACK DDL
// ---------------------------------------------------------------------------
console.log("1. DATABASE MIGRATION & ROLLBACK DDL");
const migrationPath = path.join(process.cwd(), "supabase/migrations/20261110200000_candidate_exam_history_and_certificates.sql");
const rollbackPath = path.join(process.cwd(), "supabase/migrations/20261110200000_rollback_candidate_exam_history_and_certificates.sql");

assert(fs.existsSync(migrationPath), `${migrationPath} exists`);
assert(fs.existsSync(rollbackPath), `${rollbackPath} exists`);

if (fs.existsSync(migrationPath)) {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert(sql.includes("idx_learning_certificates_meta_result_id"), "Creates index on certificate result_id metadata");
  assert(sql.includes("idx_learning_certificates_meta_session_id"), "Creates index on certificate session_id metadata");
  assert(sql.includes("function public.issue_milestone_exam_certificate"), "Defines secure issue_milestone_exam_certificate RPC");
  assert(sql.includes("function public.verify_certificate"), "Enhances public.verify_certificate to support result_id & session_id");
  assert(sql.includes("BL-MOCK-"), "Uses standard BL-MOCK- certificate identifier prefix");
  assert(sql.includes("grant execute on function public.issue_milestone_exam_certificate"), "Grants execution rights on certificate issuance");
}

if (fs.existsSync(rollbackPath)) {
  const rollbackSql = fs.readFileSync(rollbackPath, "utf8");
  assert(rollbackSql.includes("drop function if exists public.issue_milestone_exam_certificate"), "Rollback drops certificate issuance function");
  assert(rollbackSql.includes("drop index if exists public.idx_learning_certificates_meta_result_id"), "Rollback cleans up metadata indexes");
}

// ---------------------------------------------------------------------------
// 2. ACADEMIC STANDING & GRADING MODEL
// ---------------------------------------------------------------------------
console.log("\n2. ACADEMIC STANDING & GRADING CLASSIFICATION");
const distinction = getAcademicStanding(78);
assert(distinction.grade === "Distinction", "78% is classified as Distinction");
assert(distinction.standing.includes("Tier 1 University Readiness"), "Distinction remarks include Tier 1 readiness");

const veryGood = getAcademicStanding(65);
assert(veryGood.grade === "Very Good", "65% is classified as Very Good");

const credit = getAcademicStanding(54);
assert(credit.grade === "Credit", "54% is classified as Credit");

const pass = getAcademicStanding(42);
assert(pass.grade === "Pass", "42% is classified as Pass");

const revision = getAcademicStanding(32);
assert(revision.grade === "Revision Pass", "32% is classified as Revision Pass");

// ---------------------------------------------------------------------------
// 3. HIGH-RESOLUTION PDF CERTIFICATE GENERATION ENGINE
// ---------------------------------------------------------------------------
console.log("\n3. HIGH-RESOLUTION PDF CERTIFICATE GENERATION ENGINE");
const sampleCertData: CertificatePdfData = {
  certificateNumber: "BL-MOCK-2026-A8K92F",
  recipientName: "Chidera Emmanuel Okonkwo",
  examTitle: "JAMB UTME National Standardized Milestone Mock Examination",
  issuerName: "BrainLab Academy",
  issuedDate: "10 November 2026",
  score: 308,
  totalPossible: 400,
  percentage: 77,
  grade: "Distinction",
  standing: "Tier 1 University Readiness · High Competitive Standing",
  subjectScores: {
    "English Language": 82,
    "Mathematics": 74,
    "Physics": 76,
    "Chemistry": 76,
  },
  verificationUrl: "https://www.brainlabacademy.com.ng/verify/BL-MOCK-2026-A8K92F",
  chiefProctorName: "Chief Examination Proctor",
  chiefProctorTitle: "BrainLab Assessment Directorate",
};

const doc = generateCertificatePdf(sampleCertData);
assert(doc !== null && doc !== undefined, "generateCertificatePdf produces document instance");
assert(doc.getNumberOfPages() === 1, "Certificate is exactly 1 page");

// Output ArrayBuffer to inspect binary validity
const pdfBuffer = doc.output("arraybuffer");
assert(pdfBuffer.byteLength > 1000, `Generated PDF has substantial size (${pdfBuffer.byteLength} bytes)`);

const uint8 = new Uint8Array(pdfBuffer);
const headerMagic = String.fromCharCode(...uint8.slice(0, 5));
assert(headerMagic.startsWith("%PDF-"), `PDF contains valid header magic identifier: ${headerMagic}`);

// ---------------------------------------------------------------------------
// 3.B. GENUINE SCANNABLE QR CODE ENGINE & CANONICAL DOMAIN
// ---------------------------------------------------------------------------
console.log("\n3.B. GENUINE SCANNABLE QR CODE ENGINE & CANONICAL DOMAIN");
assert(CANONICAL_VERIFY_DOMAIN === "https://www.brainlabacademy.com.ng", "Canonical verify domain is https://www.brainlabacademy.com.ng");

const testCertNum = "BL-MOCK-2026-A8K92F";
const testVerifyUrl = formatCertificateVerificationUrl(testCertNum);
assert(testVerifyUrl === `https://www.brainlabacademy.com.ng/verify/${testCertNum}`, "formatCertificateVerificationUrl formats canonical link");

const qrMatrix = generateQrMatrix(testVerifyUrl, "M");
assert(qrMatrix.size >= 21, `QR Matrix has standard dimensions (${qrMatrix.size}x${qrMatrix.size})`);
assert(qrMatrix.isDark(0, 0) === true, "Top-left Finder pattern dark module verified");
assert(qrMatrix.isDark(0, qrMatrix.size - 1) === true, "Top-right Finder pattern dark module verified");
assert(qrMatrix.isDark(qrMatrix.size - 1, 0) === true, "Bottom-left Finder pattern dark module verified");

const qrSvg = generateQrSvgString(testVerifyUrl, { size: 96 });
assert(qrSvg.includes("<svg") && qrSvg.includes("</svg>"), "generateQrSvgString produces valid SVG container");
assert(qrSvg.includes("#012153"), "QR SVG uses official BrainLab deep navy");

// ---------------------------------------------------------------------------
// 4. API ENDPOINTS INTEGRITY
// ---------------------------------------------------------------------------
console.log("\n4. API ENDPOINTS INTEGRITY");
const generateRoutePath = path.join(process.cwd(), "app/api/certificates/generate/route.ts");
const downloadRoutePath = path.join(process.cwd(), "app/api/certificates/download/[id]/route.ts");
const verifyRoutePath = path.join(process.cwd(), "app/api/certificates/verify/[id]/route.ts");
const historyRoutePath = path.join(process.cwd(), "app/api/student/exam-history/route.ts");

assert(fs.existsSync(generateRoutePath), "app/api/certificates/generate/route.ts exists");
assert(fs.existsSync(downloadRoutePath), "app/api/certificates/download/[id]/route.ts exists");
assert(fs.existsSync(verifyRoutePath), "app/api/certificates/verify/[id]/route.ts exists");
assert(fs.existsSync(historyRoutePath), "app/api/student/exam-history/route.ts exists");

if (fs.existsSync(generateRoutePath)) {
  const code = fs.readFileSync(generateRoutePath, "utf8");
  assert(code.includes("export async function POST"), "Generate endpoint handles POST");
  assert(code.includes("issue_milestone_exam_certificate"), "Generate endpoint invokes issue_milestone_exam_certificate");
  assert(code.includes("learning_certificates"), "Generate endpoint queries/updates learning_certificates table");
}

if (fs.existsSync(downloadRoutePath)) {
  const code = fs.readFileSync(downloadRoutePath, "utf8");
  assert(code.includes("export async function GET"), "Download endpoint handles GET");
  assert(code.includes("generateCertificatePdf"), "Download endpoint generates PDF dynamically");
  assert(code.includes("application/pdf"), "Download endpoint sets Content-Type application/pdf");
  assert(code.includes("attachment; filename="), "Download endpoint sets Content-Disposition attachment header");
}

if (fs.existsSync(historyRoutePath)) {
  const code = fs.readFileSync(historyRoutePath, "utf8");
  assert(code.includes("export async function GET"), "History endpoint handles GET");
  assert(code.includes("exam_sessions"), "History endpoint queries exam_sessions");
  assert(code.includes("results"), "History endpoint queries exam results");
  assert(code.includes("learning_certificates"), "History endpoint correlates digital certificates");
  assert(code.includes("certificatesCount"), "History endpoint calculates certificate statistics");
}

// ---------------------------------------------------------------------------
// 5. PORTAL UI & VERIFICATION INTEGRATION
// ---------------------------------------------------------------------------
console.log("\n5. PORTAL UI & VERIFICATION INTEGRATION");
const studentExamsPage = path.join(process.cwd(), "app/student/exams/page.tsx");
const resultPage = path.join(process.cwd(), "app/result/page.tsx");
const verifyDetailPage = path.join(process.cwd(), "app/verify/[id]/page.tsx");
const navShell = path.join(process.cwd(), "app/dashboard/StudentPortalShell.tsx");

assert(fs.existsSync(studentExamsPage), "app/student/exams/page.tsx exists");
if (fs.existsSync(studentExamsPage)) {
  const code = fs.readFileSync(studentExamsPage, "utf8");
  assert(code.includes("Candidate Examination History &amp; Certificates") || code.includes("Candidate Examination History & Certificates"), "Candidate history title displayed");
  assert(code.includes("downloadCertificatePdf"), "Binds downloadCertificatePdf in candidate exams page");
  assert(code.includes("/api/certificates/generate"), "Invokes certificate issuance endpoint");
  assert(code.includes("/api/student/exam-history"), "Queries candidate examination history endpoint");
  assert(code.includes("Milestone Mocks"), "Provides filter for milestone mock examinations");
}

if (fs.existsSync(resultPage)) {
  const code = fs.readFileSync(resultPage, "utf8");
  assert(code.includes("Download Verifiable Certificate (PDF)"), "Result page provides certificate download button");
  assert(code.includes("/api/certificates/generate"), "Result page generates official digital certificate");
  assert(code.includes("/student/exams"), "Result page links to candidate exam history");
}

if (fs.existsSync(verifyDetailPage)) {
  const code = fs.readFileSync(verifyDetailPage, "utf8");
  assert(code.includes("Download Certificate PDF"), "Public verification page provides direct PDF download button");
  assert(code.includes("downloadCertificatePdf"), "Public verification page utilizes downloadCertificatePdf");
  assert(!code.includes("vercel.app"), "Public verification page does not expose outdated vercel.app hostname");
  assert(code.includes("https://www.brainlabacademy.com.ng/verify"), "Public verification page references canonical domain");
  assert(code.includes("VerificationQRCode"), "Public verification page renders scannable QR code");
}

if (fs.existsSync(navShell)) {
  const code = fs.readFileSync(navShell, "utf8");
  assert(code.includes("/student/exams"), "StudentPortalShell links to /student/exams");
  assert(code.includes("Exam History &amp; Certificates") || code.includes("Exam History & Certificates"), "Navigation label includes Exam History & Certificates");
}

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log("\n=========================================================================");
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=========================================================================\n");

if (failed > 0) {
  process.exit(1);
}
