import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const matchUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const matchKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

const supabase = createClient(matchUrl[1].trim(), matchKey[1].trim());

const trailingSetRegex = /\s*[–—\-]\s*Set\s*\d+\s*$/i;

function cleanExplanation(text) {
  if (!text) return text;
  return text
    .replace(/\s*This harder rebuild expects careful elimination of distractors before calculation or recall\.?/gi, "")
    .replace(/\s*Advanced JAMB-standard note: treat close options carefully, check formula setup, and eliminate distractors that fail on valency, mechanism, trend, or stoichiometric ratio\.?/gi, "")
    .trim();
}

async function run() {
  console.log("Fetching all questions from Supabase...");
  let allQuestions = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, question, explanation")
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (error || !data || data.length === 0) break;
    allQuestions = allQuestions.concat(data);
    if (data.length < 1000) break;
    page++;
  }
  console.log(`Fetched ${allQuestions.length} total questions.`);

  const toUpdate = [];
  for (const q of allQuestions) {
    let needsUpdate = false;
    let newQuestion = q.question;
    let newExplanation = q.explanation;

    if (trailingSetRegex.test(q.question || "")) {
      newQuestion = q.question.replace(trailingSetRegex, "").trim();
      needsUpdate = true;
    }

    const cleanedExp = cleanExplanation(q.explanation);
    if (cleanedExp !== q.explanation) {
      newExplanation = cleanedExp;
      needsUpdate = true;
    }

    if (needsUpdate) {
      toUpdate.push({ id: q.id, question: newQuestion, explanation: newExplanation });
    }
  }

  console.log(`Found ${toUpdate.length} questions needing updates.`);

  // Update in batches of 50
  const BATCH_SIZE = 50;
  let updatedCount = 0;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(item =>
        supabase
          .from("questions")
          .update({
            question: item.question,
            explanation: item.explanation,
          })
          .eq("id", item.id)
      )
    );
    updatedCount += batch.length;
    process.stdout.write(`Updated ${updatedCount}/${toUpdate.length} questions...\r`);
  }
  console.log(`\nSuccessfully updated all ${updatedCount} questions in Supabase!`);

  // Verify
  console.log("\nVerifying database state...");
  const { data: verifyData } = await supabase
    .from("questions")
    .select("id, question, explanation")
    .ilike("question", "%— Set %")
    .limit(10);

  console.log(`Questions still matching '— Set %': ${verifyData?.length ?? 0}`);

  const { data: verifyBoilerplate } = await supabase
    .from("questions")
    .select("id")
    .ilike("explanation", "%Advanced JAMB-standard note%")
    .limit(10);

  console.log(`Questions still containing distractor boilerplate: ${verifyBoilerplate?.length ?? 0}`);
}

run();
