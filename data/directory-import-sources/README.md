# Nigerian institutions seed source

These three CSV files are the **752-record initial seed** used for BrainLab's
National Institutions & Programmes Directory staging import:

| Source file | Rows | Institution type | Declared source |
|---|---:|---|---|
| nigerian_universities_faculties.csv | 312 | Universities | Community dataset compiled from public NUC/institution sources |
| nigerian_polytechnics_schools.csv | 200 | Polytechnics | NBTE 25th Edition Directory (June 2025) and public sources |
| nigerian_colleges_of_education_schools.csv | 240 | Colleges of education | NCCE accredited-colleges register (dataset notes say August 2026) |
| **Total** | **752** | | |

Upstream repository: https://github.com/reality-farouqk/nigeria-tertiary-institutions-api
Upstream data licence: CC0 1.0 Universal (public domain dedication), as declared
in the upstream `data/LICENSE` file.
Methodology and limitations: upstream `data/DATA_NOTES.md`.

## Import treatment

- The raw source rows are retained without silently rewriting their names or
  structure text.
- BrainLab imported them into private staging tables in the
  `BrainLabCBT-Staging` Supabase project on 16 November 2026.
- Every row is marked `pending`; the batch status is `review_required`.
- These rows are not student-visible and have not been published to production.
- Do not treat the upstream counts as current regulator totals.
- Do not treat generated course-of-study labels as verified institution
  offerings or accreditation evidence.
- Reconcile institution identity, category, ownership, status, location and
  source evidence against NUC, NBTE and NCCE before publication.
- The upstream health-sciences contribution is deliberately excluded because
  the requested 752-record seed is the 312 + 200 + 240 core set.

Known coverage gaps: 124 university website fields are blank; 58 polytechnic
establishment years are blank; 178 college-of-education establishment years
are blank. The exact normalized-name duplicate scan across the three imported
files found no duplicate groups; this does not establish regulator validity or
absence of near-duplicates.
