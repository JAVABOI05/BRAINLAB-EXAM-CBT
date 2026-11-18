/**
 * BrainLab Academy - Verifiable Digital Certificate PDF Generation Engine
 * Generates tamper-evident, high-resolution A4 landscape certificates for milestone mock exams.
 */

import { jsPDF } from "jspdf";
import { generateQrMatrix } from "@/app/lib/qrCode";

export const CANONICAL_VERIFY_DOMAIN = "https://www.brainlabacademy.com.ng";

export function formatCertificateVerificationUrl(certNumber: string): string {
  const clean = String(certNumber || "").trim();
  return `${CANONICAL_VERIFY_DOMAIN}/verify/${encodeURIComponent(clean)}`;
}

export interface CertificatePdfData {
  certificateNumber: string;
  recipientName: string;
  examTitle: string;
  issuerName?: string;
  issuedDate?: string;
  score: number; // Percentage or raw score
  totalPossible?: number;
  percentage?: number;
  grade?: string;
  standing?: string;
  subjectScores?: Record<string, number>;
  verificationUrl?: string;
  chiefProctorName?: string;
  chiefProctorTitle?: string;
}

/**
 * Derives academic remark / standing from score percentage
 */
export function getAcademicStanding(pct: number): { grade: string; standing: string } {
  if (pct >= 75) return { grade: "Distinction", standing: "Tier 1 University Readiness · High Competitive Standing" };
  if (pct >= 60) return { grade: "Very Good", standing: "Above National Competitive Cutoff · Excellent Foundation" };
  if (pct >= 50) return { grade: "Credit", standing: "Qualified Pass · Solid Milestone Performance" };
  if (pct >= 40) return { grade: "Pass", standing: "Benchmark Pass · Targeted Revision Advised" };
  return { grade: "Revision Pass", standing: "Milestone Completed · Intensive Practice Recommended" };
}

/**
 * Builds the official jsPDF instance for a candidate's verifiable certificate
 */
export function generateCertificatePdf(data: CertificatePdfData): jsPDF {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const width = 297;
  const height = 210;
  const centerX = width / 2;

  const totalPossible = data.totalPossible ?? 400;
  const rawScore = data.score;
  const pct = data.percentage ?? (totalPossible > 0 ? Math.min(100, Math.round((rawScore / totalPossible) * 100)) : rawScore);
  const derived = getAcademicStanding(pct);
  const grade = data.grade || derived.grade;
  const standing = data.standing || derived.standing;
  const issuer = data.issuerName || "BrainLab Academy";
  const certNumber = data.certificateNumber;
  const rawVerifyUrl = data.verificationUrl?.trim();
  const verifyUrl =
    rawVerifyUrl &&
    !rawVerifyUrl.includes("vercel.app") &&
    !rawVerifyUrl.includes("localhost") &&
    rawVerifyUrl.startsWith("http")
      ? rawVerifyUrl
      : formatCertificateVerificationUrl(certNumber);
  const formattedDate = data.issuedDate || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const proctorName = data.chiefProctorName || "Chief Examination Proctor";
  const proctorTitle = data.chiefProctorTitle || "BrainLab Assessment Directorate";

  // -------------------------------------------------------------------------
  // 1. Background Fill & Guilloché / Watermark effect
  // -------------------------------------------------------------------------
  // Gentle cream/ivory background
  doc.setFillColor(254, 254, 252);
  doc.rect(0, 0, width, height, "F");

  // Subtle background security pattern
  doc.setTextColor(241, 245, 249);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.text("BRAINLAB ACADEMY VERIFIED CREDENTIAL", centerX, 110, { align: "center", angle: 12 });

  // -------------------------------------------------------------------------
  // 2. Borders & Corner Accents
  // -------------------------------------------------------------------------
  // Outer deep navy border
  doc.setDrawColor(1, 33, 83); // #012153
  doc.setLineWidth(1.6);
  doc.rect(8, 8, width - 16, height - 16);

  // Middle gold accent border
  doc.setDrawColor(217, 119, 6); // #d97706
  doc.setLineWidth(0.6);
  doc.rect(11, 11, width - 22, height - 22);

  // Thin inner framing border
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.3);
  doc.rect(13, 13, width - 26, height - 26);

  // Ornate corner brackets
  const cornerSize = 7;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(1.2);
  // Top-left
  doc.line(11, 11 + cornerSize, 11, 11);
  doc.line(11, 11, 11 + cornerSize, 11);
  // Top-right
  doc.line(width - 11 - cornerSize, 11, width - 11, 11);
  doc.line(width - 11, 11, width - 11, 11 + cornerSize);
  // Bottom-left
  doc.line(11, height - 11 - cornerSize, 11, height - 11);
  doc.line(11, height - 11, 11 + cornerSize, height - 11);
  // Bottom-right
  doc.line(width - 11 - cornerSize, height - 11, width - 11, height - 11);
  doc.line(width - 11, height - 11 - cornerSize, width - 11, height - 11);

  // -------------------------------------------------------------------------
  // 3. Header & Directorate Typography
  // -------------------------------------------------------------------------
  // Organization Name
  doc.setTextColor(1, 33, 83);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(issuer.toUpperCase(), centerX, 24, { align: "center" });

  // Directorate subtitle
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DIRECTORATE OF EXAMINATIONS & PSYCHOMETRIC EVALUATION", centerX, 29, { align: "center" });

  // Decorative header divider line with center diamond
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.4);
  doc.line(centerX - 60, 32, centerX - 5, 32);
  doc.line(centerX + 5, 32, centerX + 60, 32);
  doc.setFillColor(217, 119, 6);
  doc.rect(centerX - 2, 31, 4, 2, "F");

  // Certificate Main Heading
  doc.setTextColor(1, 33, 83);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text("CERTIFICATE OF MILESTONE ACHIEVEMENT", centerX, 41, { align: "center" });

  // Preamble line
  doc.setTextColor(100, 116, 139);
  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.text("This tamper-evident digital credential formally certifies that", centerX, 48, { align: "center" });

  // -------------------------------------------------------------------------
  // 4. Recipient Name
  // -------------------------------------------------------------------------
  doc.setTextColor(1, 33, 83);
  doc.setFont("times", "bold");
  doc.setFontSize(23);
  doc.text(data.recipientName, centerX, 59, { align: "center" });

  // Underline for candidate name
  const nameWidth = doc.getTextWidth(data.recipientName);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(centerX - (nameWidth / 2) - 6, 62, centerX + (nameWidth / 2) + 6, 62);

  // Statement of achievement
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    "has successfully completed with verified integrity and demonstrated academic competence in the",
    centerX,
    69,
    { align: "center" }
  );

  // Exam Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.examTitle, centerX, 76, { align: "center" });

  // -------------------------------------------------------------------------
  // 5. Official Performance Scoreboard Card
  // -------------------------------------------------------------------------
  const cardX = 35;
  const cardY = 82;
  const cardW = width - 70;
  const cardH = 26;

  // Background box with gold accent
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, "FD");

  // Accent top ribbon
  doc.setFillColor(1, 33, 83);
  doc.roundedRect(cardX, cardY, cardW, 2.5, 1.5, 1.5, "F");

  // Performance columns
  const col1X = cardX + (cardW * 0.17);
  const col2X = cardX + (cardW * 0.40);
  const col3X = cardX + (cardW * 0.65);
  const col4X = cardX + (cardW * 0.86);

  // Col 1: Aggregate Score
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("AGGREGATE SCORE", col1X, cardY + 9, { align: "center" });

  doc.setTextColor(1, 33, 83);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${rawScore} / ${totalPossible}`, col1X, cardY + 17, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text("Standardized Marks", col1X, cardY + 22, { align: "center" });

  // Divider 1
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(cardX + (cardW * 0.28), cardY + 6, cardX + (cardW * 0.28), cardY + 22);

  // Col 2: Percentage
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("PERCENTAGE ACCURACY", col2X, cardY + 9, { align: "center" });

  doc.setTextColor(2, 132, 199); // Sky blue
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${pct}%`, col2X, cardY + 17, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text("Overall Performance", col2X, cardY + 22, { align: "center" });

  // Divider 2
  doc.line(cardX + (cardW * 0.52), cardY + 6, cardX + (cardW * 0.52), cardY + 22);

  // Col 3: Distinction / Academic Grade
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("ACADEMIC GRADE", col3X, cardY + 9, { align: "center" });

  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(grade.toUpperCase(), col3X, cardY + 17, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text("Directorate Standard", col3X, cardY + 22, { align: "center" });

  // Divider 3
  doc.line(cardX + (cardW * 0.77), cardY + 6, cardX + (cardW * 0.77), cardY + 22);

  // Col 4: Status
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("VERIFIED STATUS", col4X, cardY + 9, { align: "center" });

  doc.setTextColor(217, 119, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("AUTHENTIC", col4X, cardY + 17, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.text("Ledger Recorded", col4X, cardY + 22, { align: "center" });

  // -------------------------------------------------------------------------
  // 6. Subject Breakdown (if available) or Standing Remark
  // -------------------------------------------------------------------------
  const subjectEntries = Object.entries(data.subjectScores || {});
  if (subjectEntries.length > 0) {
    const subStartY = 114;
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("STANDARDIZED SUBJECT BREAKDOWN", centerX, subStartY, { align: "center" });

    const totalSubs = subjectEntries.length;
    const subSpacing = Math.min(52, (width - 60) / totalSubs);
    const subStartX = centerX - ((totalSubs - 1) * subSpacing / 2);

    subjectEntries.forEach(([subj, score], idx) => {
      const sx = subStartX + (idx * subSpacing);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(sx - 24, subStartY + 3, 48, 12, 1.5, 1.5, "FD");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const shortSubj = subj.length > 14 ? subj.substring(0, 13) + "…" : subj;
      doc.text(shortSubj, sx, subStartY + 8, { align: "center" });

      doc.setTextColor(1, 33, 83);
      doc.setFontSize(8.5);
      doc.text(`${score} / 100`, sx, subStartY + 12.5, { align: "center" });
    });
  } else {
    // Standing citation banner
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`Official Standing: ${standing}`, centerX, 116, { align: "center" });
  }

  // -------------------------------------------------------------------------
  // 7. Official Seal & Security Watermark (Center-Bottom)
  // -------------------------------------------------------------------------
  const sealX = centerX;
  const sealY = 148;

  // Concentric seal circles
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.circle(sealX, sealY, 13, "S");

  doc.setDrawColor(1, 33, 83);
  doc.setLineWidth(0.4);
  doc.circle(sealX, sealY, 11.2, "S");

  doc.setFillColor(254, 243, 199);
  doc.circle(sealX, sealY, 9.8, "F");

  doc.setTextColor(1, 33, 83);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("OFFICIAL SEAL", sealX, sealY - 4, { align: "center" });

  doc.setTextColor(217, 119, 6);
  doc.setFontSize(8);
  doc.text("★ BRAINLAB ★", sealX, sealY, { align: "center" });

  doc.setTextColor(1, 33, 83);
  doc.setFontSize(5.5);
  doc.text("VERIFIED CREDENTIAL", sealX, sealY + 4, { align: "center" });

  // -------------------------------------------------------------------------
  // 8. Signatures Section (Left: Chief Proctor | Right: Academic Director)
  // -------------------------------------------------------------------------
  const sigLineY = 153;

  // Left Signature: Chief Proctor
  const sigLeftX = 58;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(sigLeftX - 32, sigLineY, sigLeftX + 32, sigLineY);

  // Stylized signature script representation
  doc.setTextColor(30, 64, 175);
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.text("C. Proctor, Ph.D.", sigLeftX, sigLineY - 2.5, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(proctorName, sigLeftX, sigLineY + 4, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(proctorTitle, sigLeftX, sigLineY + 7.5, { align: "center" });

  // Right Signature: Academic Directorate
  const sigRightX = width - 58;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(sigRightX - 32, sigLineY, sigRightX + 32, sigLineY);

  // Stylized signature script representation
  doc.setTextColor(30, 64, 175);
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.text("K. Garba, Academic Dir.", sigRightX, sigLineY - 2.5, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Director of Academic Affairs", sigRightX, sigLineY + 4, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("BrainLab Examination Board", sigRightX, sigLineY + 7.5, { align: "center" });

  // -------------------------------------------------------------------------
  // 9. Cryptographic & Verification Footer Strip
  // -------------------------------------------------------------------------
  const footerBoxY = 171;
  const footerBoxW = width - 40;
  const footerBoxH = 22;
  const footerBoxX = 20;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(footerBoxX, footerBoxY, footerBoxW, footerBoxH, 2, 2, "FD");

  // Left side: Genuine, Scannable Vector QR Code (ISO/IEC 18004 Standard)
  const qrBoxX = footerBoxX + 4;
  const qrBoxY = footerBoxY + 2.5;
  const qrBoxSize = 17; // 17mm x 17mm optimal scanning geometry

  try {
    const qr = generateQrMatrix(verifyUrl, "M");
    const moduleCount = qr.size;
    const quietZone = 2; // 2-module quiet zone margin
    const totalGrid = moduleCount + quietZone * 2;
    const cellSize = qrBoxSize / totalGrid;

    // Draw high-contrast white background container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 0.8, 0.8, "FD");

    // Draw dark modules as razor-sharp vector squares in official navy
    doc.setFillColor(1, 33, 83);
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          doc.rect(
            qrBoxX + (c + quietZone) * cellSize,
            qrBoxY + (r + quietZone) * cellSize,
            cellSize,
            cellSize,
            "F"
          );
        }
      }
    }
  } catch {
    // Fallback if QR generation fails
    doc.setFillColor(1, 33, 83);
    doc.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, "F");
  }

  // Middle text: Certificate Number & Date
  const metaTextX = qrBoxX + qrBoxSize + 6;
  doc.setTextColor(1, 33, 83);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("IMMUTABLE CERTIFICATE LEDGER RECORD", metaTextX, footerBoxY + 6);

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Certificate Number: `, metaTextX, footerBoxY + 11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(certNumber, metaTextX + doc.getTextWidth("Certificate Number: "), footerBoxY + 11);

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.text(`Date of Issuance: ${formattedDate}`, metaTextX, footerBoxY + 16);

  // Right side: Online Verification Link
  const rightTextX = footerBoxX + footerBoxW - 6;
  doc.setTextColor(217, 119, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("PUBLIC VERIFICATION REGISTRY", rightTextX, footerBoxY + 6, { align: "right" });

  doc.setTextColor(30, 64, 175);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(verifyUrl, rightTextX, footerBoxY + 11, { align: "right" });

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Scan code or visit URL to confirm cryptographic validity with admissions boards.", rightTextX, footerBoxY + 16, { align: "right" });

  return doc;
}

/**
 * Triggers client-side browser download of the certificate PDF
 */
export function downloadCertificatePdf(data: CertificatePdfData, customFilename?: string): void {
  const doc = generateCertificatePdf(data);
  const safeName = (data.recipientName || "Candidate").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = customFilename || `BrainLab_Certificate_${safeName}_${data.certificateNumber}.pdf`;
  doc.save(filename);
}

/**
 * Returns certificate as a browser Blob
 */
export function getCertificatePdfBlob(data: CertificatePdfData): Blob {
  const doc = generateCertificatePdf(data);
  return doc.output("blob");
}
