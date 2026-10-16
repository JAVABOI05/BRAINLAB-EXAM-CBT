# BrainLab Learning Lab: Data Readiness Audit

Date: 2026-10-17
Environment reviewed: BrainLabCBT-Staging (`eusgwsuoloomphebrepe`)
Scope: read-only review; no schema or production changes.

## Finding

The staging `public.questions` table contains 540 active rows across English (140), Biology (100), Chemistry (100), Mathematics (100), and Physics (100). The reviewed Mathematics sample uses placeholder prompts such as `Synthetic Mathematics objective question 1`, generic options such as `Option A 1`, a `synthetic` category, and null difficulty values.

These records are not valid evidence for diagnosing a learner's understanding, generating a concept map, recommending a topic-specific intervention, or claiming mastery. Do not build a student-facing diagnostic against this placeholder set.

## Safe product behaviour for now

- Keep the Learning Lab mission planner as a transparent planning prototype.
- Label the mastery map as an illustration, not learner data.
- Do not display mastery percentages, weak-topic claims, AI-generated explanations, or evidence-based recommendations without verified evidence.
- Keep answer keys and explanations server-side; never fetch unrestricted `public.questions` rows into the browser because the table contains `correct_answer` and `explanation`.
- Do not change production tables, RLS policies, exam scoring, attempt history, or access controls as part of this UI work.

## Readiness checklist before a real diagnostic

1. Obtain an approved Mathematics question set with real stems and plausible options.
2. Independently verify the answer key and explanation for each selected item.
3. Assign each item to an explicit topic/concept and, where justified, a prerequisite relationship; do not infer these from placeholder category values.
4. Review difficulty and ambiguity; remove duplicate, misleading, or curriculum-mismatched items.
5. Design a server-side diagnostic interface that returns only the fields required for the attempt and never exposes answer keys before submission.
6. Define what evidence is sufficient for each recommendation and show learners why it was suggested.
7. Use fresh, unseen questions for a follow-up mastery check.
8. Test privacy, authorization, mobile usability, and CBT regression behaviour in staging before release.

## Suggested first pilot

Use one verified Mathematics micro-topic and a small reviewed question set. The pilot should measure whether the learner can answer a fresh question after a guided mission, not whether they can repeat an answer they have just seen. Show “not enough evidence yet” when the sample is too small or inconclusive.

## Status

**Blocked on approved content.** This audit did not alter the database. The Learning Lab page was updated to communicate this limitation honestly. The feature branch remains separate from production; local Windows build and browser interaction tests still need to be completed.
