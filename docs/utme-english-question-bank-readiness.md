# UTME Use of English question-bank readiness

## Target 60-question blueprint

| Rule | Required questions | Marks each | Raw marks |
|---|---:|---:|---:|
| Comprehension passage | 5 from one passage | 3 | 15 |
| Cloze passage | 10 from one passage | 2 | 20 |
| Reading text — *The Lekki Headmaster* (first rollout) | 10 | 1 | 10 |
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
- The first rollout uses *The Lekki Headmaster* only. *The Life Changer* is explicitly deferred and must not be selected or mixed into this blueprint.
- 50 active questions each for Antonyms, Sentence Interpretation, Sentence Completion and Synonyms.
- 250 active Oral English questions spread across five oral categories.
- No active question rows categorized or sectioned as Cloze Passage.
- The existing literature bank is the *Lekki Headmaster* pool; do not relabel it as *The Life Changer*. The Life Changer pool is out of scope for this rollout.

## Import requirements before applying the migration

1. Import a reviewed cloze passage set with at least 10 active questions tied to one shared, non-empty `passage_id`; use section `objective` and category `Cloze Passage`. The prepared CSV has 210 questions across 21 complete 10-question passage groups; two incomplete groups remain inactive. Answer keys and source provenance still require review.
2. Use only the existing *The Lekki Headmaster* pool for this rollout: at least 10 active questions categorized with `Literature text - Lekki headmaster` in section `literature`. Do not activate or mix a Life Changer pool in this phase.
3. The protected `legacy_exam_blueprint_settings` row (`setting_key = 'utme_english'`) is restricted to `lekki_headmaster` for this rollout. Life Changer support can be added in a separate reviewed change later.
4. Verify each imported question's correct answer, options and source provenance before activation. Do not bulk-retag the existing Lekki Headmaster set.
5. Run the paper-readiness check for both supported electives (Biology and Mathematics). Each paper must have 60 English + 40 Chemistry + 40 Physics + 40 elective questions.
6. Run end-to-end grading tests: all-correct English answers = 90/90 raw marks; all-incorrect = 0/90; each section contributes the configured maximum; the paper contains only the Lekki Headmaster reading-text pool; review/corrections show the same mark snapshot used during grading.

## Safety

The migration is deliberately fail-closed: if the required cloze or Lekki Headmaster reading-text pool is missing, paper creation raises a clear error instead of substituting questions from another subject or section. Do not apply it to production until the missing reviewed question sets are imported and the paper-readiness and grading checks pass.


## Additional integration blockers found during verification (26 October 2026)

7. **Exam-start integration is implemented on the feature branch, but requires runtime validation.** `app/api/exam/start/route.ts` calls `public._build_paper` only for the supported English + Chemistry + Physics + Biology/Mathematics combinations. Other existing subject combinations retain the legacy selection path, and failed/partial papers are rejected rather than silently returned. Verify preconfigured access codes and custom subject combinations end-to-end before merge.
8. **Marking must be session-stable and scoped.** The feature migration adds `exam_sessions.paper_marks` and `paper_blueprint`. UTME weights are snapshotted only for sessions marked `utme_english_v1`; non-blueprint/legacy sessions snapshot their stored question marks. Verify that edits to marking rules after session start do not change the submitted score and that existing in-progress sessions retain legacy marks.
9. **Required verification remains outstanding.** Test paper construction and scoring in an isolated test database or equivalent disposable local Postgres environment; do not use production as a migration test target. Cover the 60 English question category counts, the 180-question paper, both supported electives, deadline/auto-submit paths, partial and fully correct answers, legacy in-progress sessions, and correction/result consistency.
10. **Current rollout remains blocked.** No migration application, cloze CSV import, or question activation is authorized by this readiness document. Keep PR #51 as draft until the route integration, session-scoped marking, source/answer review, and tests are complete.


## Follow-up integration review (26 October 2026)

- The latest feature-branch Vercel build reached READY for commit `648bad97163c1f89c9d8ad3d1c5e15aa7af47ddd`. Subsequent compatibility and snapshot-scope commits require their own checks; do not treat the earlier successful build as validation of later commits.
- The production question bank was re-audited read-only: 500 active comprehension questions across 25 passage groups; 500 active Lekki Headmaster questions; 50 each for Antonyms, Sentence Interpretation, Sentence Completion and Synonyms; 250 Oral English questions; and zero active Cloze Passage questions. Required fields and A-D options were populated in the inspected active English rows.
- The missing Cloze Passage pool remains a hard blocker. Do not apply the migration or import the prepared CSV until answer keys and source provenance have been independently reviewed.
