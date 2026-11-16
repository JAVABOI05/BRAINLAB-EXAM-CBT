# Directory Foundation — Verified Database and Source Findings

**Review date:** 16 November 2026  
**Branch:** feature/nigerian-institutions-directory-foundation  
**Purpose:** Record facts established after the initial directory model was drafted.  
**Change boundary:** Read-only database inspection and documentation only. No schema/data/RLS changes.

## 1. Production account and profile model inspection

Read-only inspection of the Supabase production project's public schema and auth.users metadata column definitions established:

- There is no generic public profiles, students, student_profiles, learner_profiles or accounts table in the inspected public schema.
- Authentication identity is based on Supabase auth.users; the auth table includes raw_user_meta_data and raw_app_meta_data. These metadata fields must not become the source of truth for academic profile data or authorisation.
- Existing specialised user-linked records include competition_public_profiles, user_gamification_profiles, user_presence, user_subscriptions, and tutor_profiles. None is an appropriate generic academic profile table.
- competition_public_profiles is a competition/social profile and should not be overloaded with academic identity.
- tutor_profiles is a tutor publication/approval model and should not be overloaded with student education history.
- Existing admin infrastructure includes admin_profiles and permission helper usage such as admin_has_permission(...) in existing RLS policies. The exact central RBAC permission catalogue and intended Directory permission keys must be inspected before authoring policies.

### Recommended profile integration

Add a dedicated learner_academic_profiles table in a future reviewed migration:

- user_id uuid primary key references auth.users(id)
- institution_id uuid nullable references directory_institutions(id)
- institution_programme_id uuid nullable references directory_institution_programmes(id)
- campus_id uuid nullable references directory_campuses(id)
- learner_status text not null: prospective, admitted, enrolled, graduated, withdrawn, other
- study_level text nullable
- admission_year integer nullable
- expected_graduation_year integer nullable
- display_snapshot jsonb not null default '{}'; historical labels only, not authoritative
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

For learners with multiple qualifications or previous institutions, add a separate learner_education_history table with its own stable row ID, user_id, institution/offering references, award, dates and completion status. Do not force several qualifications into a single current-profile row.

The exact ON DELETE behaviour must be reviewed. Do not cascade-delete academic history merely because a directory record is archived. Prefer restrictive foreign keys and archival of reference records; account deletion behaviour must align with BrainLab's retention policy.

No such table has been created.

## 2. Production and staging are not interchangeable

The staging project currently has a smaller/older public schema than production and does not contain the same breadth of Learning Hub, Arena and learner-related tables. It must not be assumed to be a current schema mirror. Before a future migration is tested, first reconcile staging schema and migrations against the intended branch in a controlled process. No staging changes were made during this inspection.

The existing public courses and course_enrollments tables represent BrainLab Learning Hub teaching courses and enrolments. They are not national institution or academic-programme directory tables and must remain separate.

## 3. Updated NBTE public-register evidence

The official NBTE public register page reviewed on 16 November 2026 reports:

- 3,471 institutions on the register.
- 7,404 accredited programmes listed.
- Coverage across 37 states and the FCT.
- 207 polytechnics.
- 242 colleges of nursing.
- 154 colleges of health technology.
- 155 allied institutions.
- 3 innovative enterprise institutions.
- 26 vocational enterprise institutions.
- 2,362 skills training centres.
- 322 master craft persons.
- 0 monotechnics listed in the current type filter.

These are source-displayed counts and must be rechecked at import time. They are not all tertiary institutions. The register intentionally includes vocational providers and individual master craft persons. The national directory should classify these separately and must not expose all 3,471 as tertiary institutions in the default student academic dropdown.

The NBTE register explicitly distinguishes institution approval from programme accreditation. Each programme record has an accreditation end date and status. The BrainLab schema must preserve both levels independently.

Official source pages:
- https://digitalnbte.nbte.gov.ng/Public
- https://digitalnbte.nbte.gov.ng/Public/Institutions
- https://digitalnbte.nbte.gov.ng/Public/Programmes
- https://digitalnbte.nbte.gov.ng/Public/Help
- https://web.nbte.gov.ng/node/114

The public programme register currently shows 738 programmes and 163 trades in its programme/trade selector. These are not necessarily equivalent to the 7,404 accredited programme offerings reported on the register homepage: distinguish unique programme labels from institution-specific programme accreditation records.

The NBTE 2025 Directory PDF is linked from the official NBTE page, but the web retrieval layer rejected the 13,841,731-byte file due to its size limit. No PDF was captured, extracted or imported. A supported bulk export or API has not yet been confirmed.

## 4. NCCE classification evidence

The NCCE Accredited Colleges list explicitly includes institution-type labels such as:
- State College of Education
- Private College of Education
- Polytechnics offering NCE
- NTI & Other NCE Awarding Institutions

Therefore the NCCE list must not be imported by treating every row as a college of education. It provides evidence about NCE-awarding institutions, which may belong to other institutional categories. The institution's underlying type and its authority to offer an NCE programme are separate attributes.

Official source:
- https://www.ncce.gov.ng/AccreditedColleges

## 5. NUC directory quality observations

The NUC eNUC Nigerian University System page currently displays 77 federal, 69 state and 182 private universities (328 total). The visible rows include institution names, establishment year, ownership and state, and university profiles are intended to expose approved programme information.

This is a regulator source and the primary starting point for universities, but the current page includes new/recent entries and visible data inconsistencies requiring reconciliation. The source-displayed count must not be presented as BrainLab's verified unique institution count until all rows are captured, checked and deduplicated.

Official source:
- https://enuc.nuc.edu.ng/nus

## 6. Refined institution taxonomy

Recommended student-facing tertiary categories:
1. University
2. Polytechnic
3. College of Education
4. Monotechnic
5. College of Nursing / Midwifery
6. College of Health Technology
7. Other recognised allied/specialist tertiary institution
8. Other NCE-awarding institution (where its underlying institution type is separately recorded)

Keep separate, normally hidden from the tertiary academic dropdown:
- Vocational Enterprise Institution
- Skills Training Centre
- Master Craft Person
- Other short-course/trade provider

The database should model an institution's primary type separately from the qualifications/programmes it is approved to offer. For example, a polytechnic offering NCE remains a polytechnic and has an NCE institution-programme offering.

## 7. Remaining evidence gaps and blockers

- Full NUC institution rows and institution-specific programme offerings have not yet been captured into import files.
- Full NBTE institution and programme-offering data has not yet been extracted.
- Full NCCE rows and NCE programme offerings have not yet been captured.
- No official, supported bulk API/export covering all sources has been verified.
- The NBTE 2025 PDF requires a reliable download or regulator-provided structured file.
- The central RBAC permission keys and exact server-side admin policy helper contract must be confirmed before Directory write policies are drafted.
- The final profile schema must be checked against current signup/login code paths before migration.

## 8. Next safe actions

1. Request structured CSV/XLSX/JSON extracts and permitted reuse terms from NUC, NBTE and NCCE.
2. Ask NBTE for a machine-readable current institution register and programme-accreditation export, including programme-level end dates.
3. Obtain a reliable copy of the NBTE 2025 directory and checksum it before extraction.
4. Capture the NCCE list and its category labels as a source dataset.
5. Complete source-to-source reconciliation and produce measured counts before publication.
6. Inspect application registration/profile code and central RBAC implementation before writing a migration.
7. Keep all work documentation/templates only until schema and source data have been reviewed.

No production or staging data was changed by this work.
