# UTME Use of English question-bank readiness

## Target 60-question blueprint

| Rule | Required questions | Marks each | Raw marks |
|---|---:|---:|---:|
| Comprehension passage | 5 from one passage | 3 | 15 |
| Cloze passage | 10 from one passage | 2 | 20 |
| Reading text — *The Life Changer* | 10 | 1 | 10 |
| Sentence Interpretation | 5 | 2 | 10 |
| Antonyms | 5 | 2 | 10 |
| Synonyms | 5 | 1 | 5 |
| Sentence Completion | 10 | 1 | 10 |
| Oral Forms / Oral English | 10 across oral categories | 1 | 10 |
| **Total** | **60** | — | **90** |

The requested weights produce a raw maximum of 90, not 100. Any percentage display must be explicitly labelled as a normalized percentage and must not be represented as an official JAMB mark scheme.

## Production-bank audit (25 October 2026)

The active production question bank was inspected read-only. It currently contains:

- 500 active English comprehension questions grouped into 25 passage groups; each inspected group has 20 questions and 3 marks per question.
- 500 active English literature questions categorized as `Literature text - Lekki headmaster`.
- 50 active questions each for Antonyms, Sentence Interpretation, Sentence Completion and Synonyms.
- 250 active Oral English questions spread across five oral categories.
- No active question rows categorized or sectioned as Cloze Passage.
- No questions mentioning *The Life Changer* in the current literature set. Sample questions refer to Mr. Bepo and Chapter One (“Dusk”), so relabelling this set as *The Life Changer* would be incorrect.

## Import requirements before applying the migration

1. Import a reviewed cloze passage set with at least 10 active questions tied to one shared, non-empty `passage_id`; use section `objective` and category `Cloze Passage`.
2. Import at least 10 reviewed questions about the correct prescribed novel *The Life Changer*; use section `literature` and a category containing `Life Changer`.
3. Verify each question's correct answer, options and source provenance before activation. Do not bulk-retag the existing Lekki Headmaster set.
4. Run the paper-readiness check for both supported electives (Biology and Mathematics). Each paper must have 60 English + 40 Chemistry + 40 Physics + 40 elective questions.
5. Run end-to-end grading tests: all-correct English answers = 90/90 raw marks; all-incorrect = 0/90; each section contributes the configured maximum; review/corrections show the same mark snapshot used during grading.

## Safety

The migration is deliberately fail-closed: if the required cloze or *Life Changer* pool is missing, paper creation raises a clear error instead of substituting questions from another subject or section. Do not apply it to production until the missing reviewed question sets are imported and the paper-readiness and grading checks pass.
