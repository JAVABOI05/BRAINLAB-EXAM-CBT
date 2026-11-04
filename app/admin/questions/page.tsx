"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import { useRouter } from "next/navigation";
import AdminNotificationBell from "@/app/components/AdminNotificationBell";
import Papa from "papaparse";
import { supabase } from "../../lib/supabase";
import "../admin.css";

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

export type ParsedQuestionRow = {
  source_question_id: string | null;
  subject: string;
  section: string;
  category: string | null;
  passage_id: string | null;
  passage_title: string | null;
  passage_text: string | null;
  question: string;
  question_image_url?: string | null;
  question_image_alt?: string | null;
  option_a: string;
  option_a_image_url?: string | null;
  option_a_image_alt?: string | null;
  option_b: string;
  option_b_image_url?: string | null;
  option_b_image_alt?: string | null;
  option_c: string;
  option_c_image_url?: string | null;
  option_c_image_alt?: string | null;
  option_d: string;
  option_d_image_url?: string | null;
  option_d_image_alt?: string | null;
  correct_answer: "A" | "B" | "C" | "D" | "E";
  option_e?: string | null;
  option_e_image_url?: string | null;
  option_e_image_alt?: string | null;
  explanation: string | null;
  explanation_image_url?: string | null;
  explanation_image_alt?: string | null;
  marks: number;
  difficulty: string | null;
  is_active: boolean;
};

type RowError = {
  row: number;
  message: string;
};

// Aliases dictionary mapping any lowercase-stripped header string to our canonical field name
const HEADER_KEY_ALIASES: Record<string, string> = {
  // subject
  subject: "subject",
  course: "subject",
  topic: "subject",
  subjectname: "subject",
  subj: "subject",

  // section
  section: "section",
  type: "section",
  questiontype: "section",
  part: "section",
  examsection: "section",

  // category
  category: "category",
  subtopic: "category",
  theme: "category",
  tag: "category",
  cat: "category",
  unit: "category",

  // passage
  passageid: "passage_id",
  pid: "passage_id",
  passagetitle: "passage_title",
  passageheading: "passage_title",
  comprehensiontitle: "passage_title",
  passagetext: "passage_text",
  passage: "passage_text",
  comprehension: "passage_text",
  story: "passage_text",

  // question
  question: "question",
  questiontext: "question",
  prompt: "question",
  item: "question",
  problem: "question",
  q: "question",

  // question image
  questionimageurl: "question_image_url",
  questionimage: "question_image_url",
  imageurl: "question_image_url",
  image: "question_image_url",
  questionimagealt: "question_image_alt",
  questionalt: "question_image_alt",

  // option a
  optiona: "option_a",
  a: "option_a",
  opta: "option_a",
  choicea: "option_a",
  opt1: "option_a",
  optionaimageurl: "option_a_image_url",
  optionaimage: "option_a_image_url",
  optionaimagealt: "option_a_image_alt",

  // option b
  optionb: "option_b",
  b: "option_b",
  optb: "option_b",
  choiceb: "option_b",
  opt2: "option_b",
  optionbimageurl: "option_b_image_url",
  optionbimage: "option_b_image_url",
  optionbimagealt: "option_b_image_alt",

  // option c
  optionc: "option_c",
  c: "option_c",
  optc: "option_c",
  choicec: "option_c",
  opt3: "option_c",
  optioncimageurl: "option_c_image_url",
  optioncimage: "option_c_image_url",
  optioncimagealt: "option_c_image_alt",

  // option d
  optiond: "option_d",
  d: "option_d",
  optd: "option_d",
  choiced: "option_d",
  opt4: "option_d",
  optiondimageurl: "option_d_image_url",
  optiondimage: "option_d_image_url",
  optiondimagealt: "option_d_image_alt",

  // option e
  optione: "option_e",
  e: "option_e",
  opte: "option_e",
  choicee: "option_e",
  opt5: "option_e",
  optioneimageurl: "option_e_image_url",
  optioneimage: "option_e_image_url",
  optioneimagealt: "option_e_image_alt",

  // correct answer
  correctanswer: "correct_answer",
  answer: "correct_answer",
  correctans: "correct_answer",
  correct: "correct_answer",
  ans: "correct_answer",
  key: "correct_answer",
  solution: "correct_answer",
  rightanswer: "correct_answer",

  // explanation
  explanation: "explanation",
  solutionexplanation: "explanation",
  rationale: "explanation",
  reason: "explanation",
  exp: "explanation",
  note: "explanation",
  explanationimageurl: "explanation_image_url",
  explanationimage: "explanation_image_url",
  explanationimagealt: "explanation_image_alt",

  // marks
  marks: "marks",
  mark: "marks",
  points: "marks",
  point: "marks",
  score: "marks",
  weight: "marks",

  // difficulty
  difficulty: "difficulty",
  diff: "difficulty",
  level: "difficulty",
  difficultylevel: "difficulty",

  // is_active
  isactive: "is_active",
  active: "is_active",
  status: "is_active",
  enabled: "is_active",

  // source_question_id
  sourcequestionid: "source_question_id",
  sourceid: "source_question_id",
  questionid: "source_question_id",
  id: "source_question_id",
  qid: "source_question_id",
  code: "source_question_id",
};

export default function AdminQuestionsPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawRowsCount, setRawRowsCount] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedQuestionRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [activeTab, setActiveTab] = useState<"preview" | "errors">("preview");
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [searchPreview, setSearchPreview] = useState<string>("");

  // Upload progress state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) {
        router.replace("/account");
        return;
      }
      if (!(await adminHasPermission("cbt.questions.manage"))) {
        if (active) setMessage({ type: "error", text: "You do not have permission to manage the question bank." });
        return;
      }
      setAdminUser(admin);
    }
    void init().catch(() => {
      if (active) setMessage({ type: "error", text: "Could not verify administrator access." });
    });
    return () => {
      active = false;
    };
  }, [router]);

  // Clean and normalize strings
  function normalizeNullable(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const v = String(value).trim().replace(/^\uFEFF/, "");
    return v === "" ? null : v;
  }

  // Answer normalizer with option string comparison fallback
  function normalizeAnswer(
    val: unknown,
    optA: string | null,
    optB: string | null,
    optC: string | null,
    optD: string | null,
    optE?: string | null
  ): "A" | "B" | "C" | "D" | "E" | null {
    if (val === null || val === undefined) return null;
    const str = String(val).trim().toUpperCase();
    if (!str) return null;

    if (["A", "B", "C", "D", "E"].includes(str)) {
      return str as "A" | "B" | "C" | "D" | "E";
    }

    const letterMatch = str.match(/^(?:OPTION\s*)?\(?([A-E])\)?[\.\:\)]?$/i);
    if (letterMatch) {
      return letterMatch[1].toUpperCase() as "A" | "B" | "C" | "D" | "E";
    }

    if (str === "1") return "A";
    if (str === "2") return "B";
    if (str === "3") return "C";
    if (str === "4") return "D";
    if (str === "5") return "E";

    const cleanStr = String(val).trim().toLowerCase();
    if (optA && cleanStr === optA.trim().toLowerCase()) return "A";
    if (optB && cleanStr === optB.trim().toLowerCase()) return "B";
    if (optC && cleanStr === optC.trim().toLowerCase()) return "C";
    if (optD && cleanStr === optD.trim().toLowerCase()) return "D";
    if (optE && cleanStr === optE.trim().toLowerCase()) return "E";

    return null;
  }

  // Safe HTTPS URL guard required by PostgreSQL check constraint
  function normalizeImageUrl(val: unknown): string | null {
    const raw = normalizeNullable(val);
    if (!raw) return null;
    if (raw.startsWith("https://")) return raw;
    if (raw.startsWith("http://")) return raw.replace(/^http:\/\//, "https://");
    return null;
  }

  // Smart header normalization
  function normalizeRowHeaders(rawRow: Record<string, unknown>): Record<string, unknown> {
    const canonicalRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawRow)) {
      const strippedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const canonicalKey = HEADER_KEY_ALIASES[strippedKey] || key.trim().toLowerCase();
      canonicalRow[canonicalKey] = value;
    }
    return canonicalRow;
  }

  function validateAndTransform(rows: Array<Record<string, unknown>>) {
    const nextErrors: RowError[] = [];
    const nextParsed: ParsedQuestionRow[] = [];

    rows.forEach((rawRow, index) => {
      const rowNo = index + 2; // Row 1 is header
      const row = normalizeRowHeaders(rawRow);

      const subject = normalizeNullable(row.subject);
      const rawSection = normalizeNullable(row.section);
      const section = (rawSection || "objective").toLowerCase();
      const question = normalizeNullable(row.question);

      const optionA = normalizeNullable(row.option_a);
      const optionB = normalizeNullable(row.option_b);
      const optionC = normalizeNullable(row.option_c);
      const optionD = normalizeNullable(row.option_d);
      const optionE = normalizeNullable(row.option_e);

      const rawAnswer = row.correct_answer ?? row.answer ?? row.correct;
      const correctAnswer = normalizeAnswer(rawAnswer, optionA, optionB, optionC, optionD, optionE);

      const rawMarks = row.marks ?? row.mark ?? row.points ?? 1;
      const numMarks = Number(rawMarks);
      const marks = Number.isFinite(numMarks) && numMarks > 0 ? numMarks : 1;

      const rawActive = row.is_active ?? row.active ?? row.status;
      let isActive = true;
      if (rawActive !== undefined && rawActive !== null && rawActive !== "") {
        const activeStr = String(rawActive).trim().toLowerCase();
        isActive = activeStr === "true" || activeStr === "yes" || activeStr === "1" || activeStr === "active";
      }

      const rawDiff = normalizeNullable(row.difficulty)?.toLowerCase();
      const difficulty = rawDiff && ["easy", "medium", "hard"].includes(rawDiff) ? rawDiff : "medium";

      // Check required fields
      if (!subject) nextErrors.push({ row: rowNo, message: "Missing Subject." });
      if (!question) nextErrors.push({ row: rowNo, message: "Missing Question prompt." });
      if (!optionA) nextErrors.push({ row: rowNo, message: "Missing Option A." });
      if (!optionB) nextErrors.push({ row: rowNo, message: "Missing Option B." });
      if (!optionC) nextErrors.push({ row: rowNo, message: "Missing Option C." });
      if (!optionD) nextErrors.push({ row: rowNo, message: "Missing Option D." });

      if (!correctAnswer) {
        nextErrors.push({
          row: rowNo,
          message: `Invalid or missing Correct Answer (${String(rawAnswer ?? "empty")}). Must be A, B, C, D${optionE ? ", or E" : ""}. Cannot point to an empty option.`,
        });
      } else if (correctAnswer === "E" && !optionE) {
        nextErrors.push({
          row: rowNo,
          message: "Correct answer is set to 'E', but Option E is empty.",
        });
      }

      // Check image constraint if provided
      const rawQImg = normalizeNullable(row.question_image_url);
      if (rawQImg && !normalizeImageUrl(rawQImg)) {
        nextErrors.push({ row: rowNo, message: "Question Image URL must begin with https://" });
      }
      const rawOptAImg = normalizeNullable(row.option_a_image_url);
      if (rawOptAImg && !normalizeImageUrl(rawOptAImg)) {
        nextErrors.push({ row: rowNo, message: "Option A Image URL must begin with https://" });
      }
      const rawOptBImg = normalizeNullable(row.option_b_image_url);
      if (rawOptBImg && !normalizeImageUrl(rawOptBImg)) {
        nextErrors.push({ row: rowNo, message: "Option B Image URL must begin with https://" });
      }
      const rawOptCImg = normalizeNullable(row.option_c_image_url);
      if (rawOptCImg && !normalizeImageUrl(rawOptCImg)) {
        nextErrors.push({ row: rowNo, message: "Option C Image URL must begin with https://" });
      }
      const rawOptDImg = normalizeNullable(row.option_d_image_url);
      if (rawOptDImg && !normalizeImageUrl(rawOptDImg)) {
        nextErrors.push({ row: rowNo, message: "Option D Image URL must begin with https://" });
      }
      const rawOptEImg = normalizeNullable(row.option_e_image_url);
      if (rawOptEImg && !normalizeImageUrl(rawOptEImg)) {
        nextErrors.push({ row: rowNo, message: "Option E Image URL must begin with https://" });
      }
      const rawExpImg = normalizeNullable(row.explanation_image_url);
      if (rawExpImg && !normalizeImageUrl(rawExpImg)) {
        nextErrors.push({ row: rowNo, message: "Explanation Image URL must begin with https://" });
      }

      if (subject && question && optionA && optionB && optionC && optionD && correctAnswer) {
        nextParsed.push({
          source_question_id: normalizeNullable(row.source_question_id),
          subject,
          section,
          category: normalizeNullable(row.category),
          passage_id: normalizeNullable(row.passage_id),
          passage_title: normalizeNullable(row.passage_title),
          passage_text: normalizeNullable(row.passage_text),
          question,
          question_image_url: normalizeImageUrl(row.question_image_url),
          question_image_alt: normalizeNullable(row.question_image_alt),
          option_a: optionA,
          option_a_image_url: normalizeImageUrl(row.option_a_image_url),
          option_a_image_alt: normalizeNullable(row.option_a_image_alt),
          option_b: optionB,
          option_b_image_url: normalizeImageUrl(row.option_b_image_url),
          option_b_image_alt: normalizeNullable(row.option_b_image_alt),
          option_c: optionC,
          option_c_image_url: normalizeImageUrl(row.option_c_image_url),
          option_c_image_alt: normalizeNullable(row.option_c_image_alt),
          option_d: optionD,
          option_d_image_url: normalizeImageUrl(row.option_d_image_url),
          option_d_image_alt: normalizeNullable(row.option_d_image_alt),
          option_e: optionE,
          option_e_image_url: normalizeImageUrl(row.option_e_image_url),
          option_e_image_alt: normalizeNullable(row.option_e_image_alt),
          correct_answer: correctAnswer,
          explanation: normalizeNullable(row.explanation),
          explanation_image_url: normalizeImageUrl(row.explanation_image_url),
          explanation_image_alt: normalizeNullable(row.explanation_image_alt),
          marks,
          difficulty,
          is_active: isActive,
        });
      }
    });

    setErrors(nextErrors);
    setParsedRows(nextParsed);
    if (nextErrors.length > 0 && nextParsed.length === 0) {
      setActiveTab("errors");
    } else {
      setActiveTab("preview");
    }
  }

  function handleFileSelected(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setMessage({ type: "error", text: "Please select a valid .csv file." });
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + " KB");
    setMessage(null);
    setErrors([]);
    setParsedRows([]);
    setUploadProgress(0);

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const rows = (results.data || []).filter((r) => Object.values(r).some((v) => String(v ?? "").trim() !== ""));
        setRawRowsCount(rows.length);
        if (rows.length === 0) {
          setMessage({ type: "error", text: "The selected CSV file is empty." });
          return;
        }
        validateAndTransform(rows);
      },
      error: (error) => {
        setMessage({ type: "error", text: `CSV parsing error: ${error.message}` });
      },
    });
  }

  // Duplicate-aware batch uploader with granular fallback isolation.
  // Existing source_question_id values are skipped; existing records are never overwritten.
  async function handleBatchUpload() {
    if (parsedRows.length === 0) {
      setMessage({ type: "error", text: "No valid questions found to upload." });
      return;
    }

    const BATCH_SIZE = 50;

    try {
      setUploading(true);
      setMessage(null);
      setUploadProgress(0);

      let totalInserted = 0;
      let existingSkipped = 0;
      let duplicateInputSkipped = 0;
      const failedRows: RowError[] = [];

      // Ignore repeated source IDs within the same CSV, keeping the first occurrence.
      const seenSourceIds = new Set<string>();
      const uniqueRows: ParsedQuestionRow[] = [];
      parsedRows.forEach((row, index) => {
        const sourceId = row.source_question_id?.trim();
        if (sourceId) {
          if (seenSourceIds.has(sourceId)) {
            duplicateInputSkipped++;
            return;
          }
          seenSourceIds.add(sourceId);
        }
        uniqueRows.push(row);
      });

      // Read existing IDs in bounded chunks before attempting inserts.
      // If this check fails, stop rather than risk a duplicate or overwrite.
      const sourceIds = uniqueRows
        .map((row) => row.source_question_id?.trim())
        .filter((id): id is string => Boolean(id));
      const existingIds = new Set<string>();
      for (let i = 0; i < sourceIds.length; i += 100) {
        const idChunk = sourceIds.slice(i, i + 100);
        const { data, error } = await supabase
          .from("questions")
          .select("source_question_id")
          .in("source_question_id", idChunk);
        if (error) {
          throw new Error(`Could not check existing question IDs safely: ${error.message}`);
        }
        (data || []).forEach((item) => {
          if (item.source_question_id) existingIds.add(item.source_question_id);
        });
      }

      const rowsToInsert = uniqueRows.filter((row) => {
        const sourceId = row.source_question_id?.trim();
        if (sourceId && existingIds.has(sourceId)) {
          existingSkipped++;
          return false;
        }
        return true;
      });

      const totalBatches = Math.ceil(rowsToInsert.length / BATCH_SIZE);
      for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
        const chunk = rowsToInsert.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        setUploadStatus(`Uploading batch ${batchNumber} of ${totalBatches} (${i + 1} - ${Math.min(i + BATCH_SIZE, rowsToInsert.length)})...`);

        const { error } = await supabase.from("questions").insert(chunk);

        if (error) {
          // Isolate row-level failures, including a concurrent duplicate insert.
          for (let j = 0; j < chunk.length; j++) {
            const rowItem = chunk[j];
            const { error: rowErr } = await supabase.from("questions").insert([rowItem]);
            if (rowErr) {
              const isDuplicate = rowErr.code === "23505";
              failedRows.push({
                row: parsedRows.indexOf(rowItem) + 2,
                message: isDuplicate
                  ? `Question ID "${rowItem.source_question_id || "unknown"}" already exists (duplicate insert).`
                  : rowErr.message,
              });
            } else {
              totalInserted++;
            }
          }
        } else {
          totalInserted += chunk.length;
        }

        setUploadProgress(Math.round((Math.min(i + BATCH_SIZE, rowsToInsert.length) / rowsToInsert.length) * 100));
      }

      // Sync subjects only when there were genuinely new rows to import.
      if (totalInserted > 0) {
        const uniqueSubjects = Array.from(new Set(rowsToInsert.map((r) => r.subject?.trim()).filter(Boolean)));
        if (uniqueSubjects.length > 0) {
          try {
            await fetch("/api/admin/subjects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "sync_batch_subjects",
                subjects: uniqueSubjects,
              }),
            });
          } catch (syncErr) {
            console.warn("Background subject sync notice:", syncErr);
          }
        }
      }

      if (failedRows.length > 0) {
        // Preserve validation notices and append database errors for the UI.
        setErrors((prev) => [...prev, ...failedRows]);
        setMessage({
          type: "info",
          text: `Uploaded ${totalInserted} new questions; skipped ${existingSkipped} already-existing and ${duplicateInputSkipped} duplicate CSV IDs; ${failedRows.length} rows failed. See Validation Notices for details.`,
        });
      } else {
        setMessage({
          type: "success",
          text: totalInserted > 0
            ? `Uploaded ${totalInserted} new questions; skipped ${existingSkipped} already-existing and ${duplicateInputSkipped} duplicate CSV IDs.`
            : `No new questions uploaded. Skipped ${existingSkipped} already-existing questions and ${duplicateInputSkipped} duplicate CSV IDs.`,
        });
        setParsedRows([]);
        setRawRowsCount(0);
        setFileName("");
        setFileSize("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Upload encountered an unexpected failure.",
      });
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  }

  // Template generators
  function downloadCsvFile(filename: string, content: string) {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleDownloadBlankTemplate() {
    const headers = [
      "source_question_id",
      "subject",
      "section",
      "category",
      "passage_id",
      "passage_title",
      "passage_text",
      "question",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "option_e",
      "correct_answer",
      "explanation",
      "marks",
      "difficulty",
      "is_active",
      "question_image_url",
      "question_image_alt",
      "option_a_image_url",
      "option_a_image_alt",
      "option_b_image_url",
      "option_b_image_alt",
      "option_c_image_url",
      "option_c_image_alt",
      "option_d_image_url",
      "option_d_image_alt",
      "option_e_image_url",
      "option_e_image_alt",
      "explanation_image_url",
      "explanation_image_alt",
    ];
    const sample = [
      [
        "MTH001",
        "Mathematics",
        "objective",
        "Algebra",
        "",
        "",
        "",
        "Solve for x: 3x + 9 = 24",
        "x = 3",
        "x = 5",
        "x = 7",
        "x = 9",
        "x = 11",
        "B",
        "Subtract 9 from both sides: 3x = 15, then divide by 3: x = 5",
        "1",
        "easy",
        "true", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
    ];

    const csv = [headers, ...sample]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    downloadCsvFile("brainlab_question_template.csv", csv);
  }

  function handleDownloadSampleQuestions() {
    const headers = [
      "source_question_id",
      "subject",
      "section",
      "category",
      "passage_id",
      "passage_title",
      "passage_text",
      "question",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "option_e",
      "correct_answer",
      "explanation",
      "marks",
      "difficulty",
      "is_active",
      "question_image_url",
      "question_image_alt",
      "option_a_image_url",
      "option_a_image_alt",
      "option_b_image_url",
      "option_b_image_alt",
      "option_c_image_url",
      "option_c_image_alt",
      "option_d_image_url",
      "option_d_image_alt",
      "option_e_image_url",
      "option_e_image_alt",
      "explanation_image_url",
      "explanation_image_alt",
    ];

    const sampleQuestions = [
      [
        "ENG-COMP-01",
        "English Language",
        "comprehension",
        "Reading Comprehension",
        "PASSAGE_ECO_01",
        "The Balance of Modern Ecosystems",
        "Biodiversity forms the intricate web sustaining planetary equilibrium. When keystone species vanish, cascade effects undermine soil fertility, water filtration, and climate resilience across surrounding habitats.",
        "According to the passage, what is the primary consequence of losing keystone species?",
        "A rapid increase in non-native predators",
        "Cascade effects undermining essential ecological services",
        "Immediate atmospheric temperature stabilization",
        "Expansion of agricultural fertility",
        "B",
        "The text explicitly notes cascade effects undermining soil fertility, water filtration, and climate resilience.",
        "1",
        "medium",
        "true", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
      [
        "MTH-ALG-01",
        "Mathematics",
        "objective",
        "Quadratic Equations",
        "",
        "",
        "",
        "If 2x² - 8x + 6 = 0, find the roots of the equation.",
        "x = 1 or x = 3",
        "x = -1 or x = -3",
        "x = 2 or x = 4",
        "x = 0 or x = 3",
        "A",
        "Dividing by 2 gives x² - 4x + 3 = 0, which factors into (x - 1)(x - 3) = 0. Hence, x = 1 or x = 3.",
        "1",
        "medium",
        "true", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
      [
        "PHY-MEC-01",
        "Physics",
        "objective",
        "Kinematics",
        "",
        "",
        "",
        "A car accelerates uniformly from rest at 2.5 m/s² for 8 seconds. What is the final velocity attained?",
        "10 m/s",
        "16 m/s",
        "20 m/s",
        "25 m/s",
        "C",
        "Using v = u + at with initial velocity u = 0: v = 0 + (2.5)(8) = 20 m/s.",
        "1",
        "easy",
        "true", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
      [
        "CHM-BND-01",
        "Chemistry",
        "objective",
        "Chemical Bonding",
        "",
        "",
        "",
        "Which of the following compounds exhibits predominantly electrovalent (ionic) bonding?",
        "Methane (CH₄)",
        "Sodium Chloride (NaCl)",
        "Water (H₂O)",
        "Carbon Dioxide (CO₂)",
        "B",
        "NaCl is formed by complete electron transfer between highly electropositive sodium and electronegative chlorine.",
        "1",
        "easy",
        "true", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
      [
        "BIO-GEN-01",
        "Biology",
        "objective",
        "Genetics",
        "",
        "",
        "",
        "In Mendelian monohybrid inheritance, what is the phenotypic ratio in the F₂ generation of a cross between two heterozygous parents?",
        "1:2:1",
        "3:1",
        "9:3:3:1",
        "2:1",
        "B",
        "A monohybrid cross of heterozygous parents (Aa x Aa) yields 3 dominant to 1 recessive phenotype.",
        "1",
        "medium",
        "true", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
      [
        "GOV-CON-01",
        "Government",
        "objective",
        "Constitutions",
        "",
        "",
        "",
        "A rigid constitution is best characterized by which of the following?",
        "It can be altered by a simple parliamentary majority",
        "It requires a special, stringent legislative procedure to amend",
        "It exists exclusively in unwritten format",
        "It is determined solely by customary monarchical decree",
        "B",
        "A rigid constitution requires a special, rigorous amendment procedure involving supermajorities or referendums.",
        "1",
        "medium",
        "true", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
      [
        "ECO-MKT-01",
        "Economics",
        "objective",
        "Market Structures",
        "",
        "",
        "",
        "Under perfect competition, what is the relationship between price (P) and marginal revenue (MR)?",
        "Price is strictly greater than marginal revenue",
        "Price is equal to marginal revenue",
        "Price is strictly less than marginal revenue",
        "Price fluctuates independently of marginal revenue",
        "B",
        "In perfect competition, individual firms are price takers facing a horizontal demand curve where P = AR = MR.",
        "1",
        "hard",
        "true", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
      [
        "AGR-SOIL-01",
        "Agricultural Science",
        "objective",
        "Soil Chemistry",
        "",
        "",
        "",
        "Which agricultural practice is most effective in preventing accelerated soil erosion on steep slopes?",
        "Overgrazing",
        "Terracing and contour plowing",
        "Clean clearing and burning",
        "Continuous monoculture cropping",
        "B",
        "Terracing and contour plowing slow runoff velocity and retain topsoil on sloped farmland.",
        "1",
        "easy",
        "true", "", "", "", "", "", "", "", "", "", "", "", "",
      ],
    ];

    const csv = [headers, ...sampleQuestions]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    downloadCsvFile("brainlab_sample_exam_questions.csv", csv);
  }

  // Filter preview questions
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    parsedRows.forEach((r) => set.add(r.subject));
    return Array.from(set).sort();
  }, [parsedRows]);

  const filteredPreviewRows = useMemo(() => {
    let list = parsedRows;
    if (filterSubject !== "All") {
      list = list.filter((r) => r.subject === filterSubject);
    }
    if (searchPreview.trim()) {
      const q = searchPreview.toLowerCase();
      list = list.filter((r) => r.question.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q));
    }
    return list;
  }, [parsedRows, filterSubject, searchPreview]);

  return (
    <main className="admin-page">
      <div className="admin-container">
        {/* Hero Section */}
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Question Bank Ingestion</div>
              <h1 className="admin-title">Bulk CSV Question Importer</h1>
              <p className="admin-subtitle">
                Upload hundreds of questions into BrainLab Academy seamlessly. Features smart header normalization,
                automatic answer letter detection, batch chunking to avoid timeouts, and real-time validation preview.
              </p>

              {adminUser && (
                <div className="admin-user-chip">
                  Signed in as <strong>{adminUser.email}</strong> •{" "}
                  <span className="capitalize">{adminUser.role.replace(/_/g, " ")}</span>
                </div>
              )}
            </div>

            <div className="admin-actions">
              <button onClick={() => router.push("/admin/questions/manage")} className="admin-btn-light">
                Manage Questions
              </button>
              <button onClick={() => router.push("/admin/academic")} className="admin-btn-light">
                Manage Subjects
              </button>
              <button onClick={() => router.push("/admin/dashboard")} className="admin-btn-light">
                Dashboard
              </button>
              <AdminNotificationBell />
            </div>
          </div>
        </section>

        {/* Status Alerts */}
        {message && (
          <div
            className={`admin-section rounded-2xl p-4 font-bold text-sm ${
              message.type === "success"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : message.type === "error"
                ? "bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300"
                : "bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300"
            }`}
          >
            {message.type === "success" ? "✓ " : message.type === "error" ? "⚠️ " : "ℹ️ "}
            {message.text}
          </div>
        )}

        {/* Drag and Drop Zone Card */}
        <section className="admin-section admin-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="admin-card-title">Upload Question File</h2>
              <p className="admin-card-text">
                Accepts any standard CSV. Column headers are automatically recognized (e.g. <em>Subject</em>,{" "}
                <em>Question</em>, <em>Option A</em>, <em>Answer</em>).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleDownloadBlankTemplate} className="admin-btn-light text-xs py-2 px-3">
                Download Blank Template
              </button>
              <button onClick={handleDownloadSampleQuestions} className="admin-btn-light text-xs py-2 px-3">
                Download Sample Exam Questions
              </button>
            </div>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelected(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-6 rounded-3xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]"
                : "border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 hover:border-blue-400 dark:hover:border-blue-500"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
              className="hidden"
            />
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-3xl text-blue-600 dark:text-blue-400 mb-3">
              📂
            </div>
            <p className="text-base font-black text-slate-800 dark:text-slate-100">
              {fileName ? fileName : "Drag & Drop your question CSV here, or click to browse"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {fileSize ? `File size: ${fileSize}` : "Supports UTF-8 CSV exports from Excel, Google Sheets, or CBT software"}
            </p>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>{uploadStatus}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleBatchUpload}
              disabled={uploading || parsedRows.length === 0}
              className="admin-btn-primary w-full sm:w-auto"
            >
              {uploading ? "Importing Batches..." : `Import ${parsedRows.length} Questions`}
            </button>
            {parsedRows.length > 0 && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Ready to commit {parsedRows.length} verified questions in chunks of 50.
              </span>
            )}
          </div>
        </section>

        {/* Live File Parsing Statistics */}
        {rawRowsCount > 0 && (
          <section className="admin-section admin-stats">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Total Rows Read</p>
              <p className="admin-stat-value">{rawRowsCount}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Valid Questions</p>
              <p className="admin-stat-value text-emerald-600 dark:text-emerald-400">{parsedRows.length}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Validation Issues</p>
              <p className={`admin-stat-value ${errors.length > 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
                {errors.length}
              </p>
            </div>
          </section>
        )}

        {/* Validation Errors Notice */}
        {errors.length > 0 && (
          <section className="admin-section admin-card border-rose-200 dark:border-rose-900/60">
            <div className="flex items-center justify-between">
              <h2 className="admin-card-title text-rose-700 dark:text-rose-400">
                Validation Notices ({errors.length})
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {parsedRows.length > 0 ? "Valid rows can still be imported" : "Fix errors before importing"}
              </span>
            </div>
            <p className="admin-card-text">
              The rows listed below have missing or invalid values and will be skipped during upload.
            </p>
            <div className="mt-4 max-h-60 overflow-y-auto space-y-2 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 p-4 border border-rose-200/50 dark:border-rose-900/40 text-xs">
              {errors.slice(0, 50).map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-rose-900 dark:text-rose-200">
                  <span className="font-mono font-bold bg-rose-200/60 dark:bg-rose-900/70 px-1.5 py-0.5 rounded">
                    Row {err.row}
                  </span>
                  <span>{err.message}</span>
                </div>
              ))}
              {errors.length > 50 && (
                <p className="font-bold text-slate-500 pt-2">...and {errors.length - 50} more row errors.</p>
              )}
            </div>
          </section>
        )}

        {/* Preview Drawer */}
        {parsedRows.length > 0 && (
          <section className="admin-section admin-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="admin-card-title">Preview Verified Questions</h2>
                <p className="admin-card-text">
                  Showing {filteredPreviewRows.length} of {parsedRows.length} valid questions ready for the question bank.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Search questions or subject..."
                  value={searchPreview}
                  onChange={(e) => setSearchPreview(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                />

                {distinctSubjects.length > 1 && (
                  <select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                  >
                    <option value="All">All Subjects ({distinctSubjects.length})</option>
                    {distinctSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject</th>
                    <th>Section</th>
                    <th>Question</th>
                    <th>Options</th>
                    <th>Answer</th>
                    <th>Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewRows.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      <td className="font-mono text-xs">{index + 1}</td>
                      <td>
                        <span className="inline-block rounded-md bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-200">
                          {row.subject}
                        </span>
                      </td>
                      <td className="text-xs uppercase font-bold text-slate-500">{row.section}</td>
                      <td className="max-w-xs text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{row.question}</div>
                        {row.question_image_url && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-cyan-300">
                            <span>🖼️ Diagram attached</span>
                          </div>
                        )}
                      </td>
                      <td className="text-[11px] text-slate-500">
                        <div>A: {row.option_a}</div>
                        <div>B: {row.option_b}</div>
                        <div>C: {row.option_c}</div>
                        <div>D: {row.option_d}</div>
                        {row.option_e && <div className="font-semibold text-indigo-700 dark:text-cyan-400">E: {row.option_e}</div>}
                      </td>
                      <td>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                          {row.correct_answer}
                        </span>
                      </td>
                      <td className="text-xs font-bold">{row.marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPreviewRows.length > 20 && (
                <div className="p-3 text-center text-xs font-bold text-slate-400">
                  Showing first 20 preview rows of {filteredPreviewRows.length} filtered questions.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
