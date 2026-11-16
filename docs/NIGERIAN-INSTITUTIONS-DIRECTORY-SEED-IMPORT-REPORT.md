# Nigerian Institutions Directory — 752-record seed import report

**Run date:** 16 November 2026  
**Target:** Supabase project `BrainLabCBT-Staging` (`eusgwsuoloomphebrepe`)  
**Import version:** `2026-11-16-community-seed-v1`  
**Publication status:** Not published; review required.

## Import result

| Dataset | Rows read | Rows staged | Pending review |
|---|---:|---:|---:|
| Universities | 312 | 312 | 312 |
| Polytechnics | 200 | 200 | 200 |
| Colleges of education | 240 | 240 | 240 |
| **Total** | **752** | **752** | **752** |

All 752 source records were inserted into the private
`directory_import_rows` staging table as raw JSONB, with a source row key,
row number, source key and parent import job. Three source-document records
and three import jobs were created. Final verification confirmed exact counts
for each job and all 752 rows remain pending review.

## Validation observations

- Exact normalized-name duplicate scan across all three CSVs: **0 duplicate
  groups**. This is not a regulator validation and does not rule out near
  duplicates, name changes or entity-history conflicts.
- Universities: 124 rows have no website value.
- Polytechnics: 58 rows have no establishment year.
- Colleges of education: 178 rows have no establishment year.
- The community dataset's notes state an August 2026 snapshot, but the
  polytechnic source is based on the NBTE 25th Edition Directory (June 2025).
- The community dataset reports 312 universities, while the NUC eNUC source
  review for this project reported 328. The discrepancy must be reconciled;
  do not represent 312 as the complete current NUC register.
- The current NBTE public register count differs from the 200 polytechnic seed
  rows. Reconcile before publishing.
- College-of-education rows include thinly sourced and potentially ambiguous
  records. Review against the current NCCE register.

## Data handling and safety

- Upstream repository:
  https://github.com/reality-farouqk/nigeria-tertiary-institutions-api
- Upstream data licence: CC0 1.0 Universal, declared in upstream
  `data/LICENSE`.
- The 752-record seed excludes the one contributed health-sciences institution
  from the upstream repository's current 753-record total.
- Course-of-study records were **not imported**. Upstream documentation says
  these are generated/inferred, not institution-by-institution verified.
- No national programme catalogue or institution-programme offering has been
  published from these inferred labels.
- No existing Learning Hub courses, student profiles, exam data, or other
  production records were modified.
- No production database, production deployment, or live student directory was
  changed.
- The three import tables have RLS enabled and no anon/authenticated grants;
  access is reserved to the service role / trusted server-side operations.

## Next gate

Reconcile the 752 pending rows against the official NUC, NBTE and NCCE
registers; classify institution types correctly; resolve name/status
conflicts; attach evidence; then publish only approved records through the
reviewed directory schema and RBAC workflow.
