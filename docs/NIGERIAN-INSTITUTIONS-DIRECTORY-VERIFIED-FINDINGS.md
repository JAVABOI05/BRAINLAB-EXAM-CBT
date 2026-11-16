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

The NBTE 25th Edition 2025 Directory PDF has now been supplied in the conversation and inspected directly. It is 540 pages, titled *Directory of Accredited Programmes Offered in Polytechnics, Technical and Vocational Institutions in Nigeria*, dated June 2025 (foreword dated 1 July 2025), ISBN 978-978-916-767-8. Selected pages were extracted for analysis; the complete 540-page dataset has not been transcribed, normalised or imported. The document's copyright notice requires prior written permission for reproduction, apart from brief academic quotations; bulk reuse permission must be obtained before BrainLab republishes the extracted records.

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


## 9. Existing admin permission model inspection

Read-only inspection of the production public schema and public.admin_has_permission(text) found:

- The only public table whose name matches role/permission is competition_user_permissions; it is competition-specific and is not a general-purpose directory permission catalogue.
- General admin role membership is represented by admin_profiles with a fixed role CHECK constraint.
- admin_has_permission(text) implements a static role-to-permission allowlist in a SECURITY DEFINER function. It includes institution.manage and institution.reports.read for selected existing roles, but no dedicated directory.* permission keys were found in the inspected function.
- The current helper does not demonstrate configurable custom roles or resource-scope evaluation. Do not assume the People & Access Management Centre's intended configurable role model is already implemented in this database.
- Super Admin is granted all permission keys by the helper; platform_admin and other roles are restricted to hard-coded allowlists. The existing institution.manage permission is too broad to assume it safely covers directory publishing, accreditation review, bulk import and source management.

Before implementing Directory management:
1. Reconcile the live People & Access Management design and any pending role-management work with the current production schema.
2. Define explicit permissions such as directory.institutions.read, directory.institutions.manage, directory.programmes.read, directory.programmes.manage, directory.import.execute, directory.review.approve, directory.sources.manage and directory.audit.read, with resource scope where required.
3. Add these through the approved central RBAC model rather than adding a separate Directory role table or relying on broad legacy permissions.
4. Test anon, authenticated learner, tutor, reviewer, directory manager, platform admin and super admin access against staging.
5. Review SECURITY DEFINER helper dependencies, grants and search_path before any change.

No permission function, role, policy or database object was modified.


## 10. Direct inspection of NBTE 25th Edition 2025 PDF

The supplied PDF was opened and inspected directly. The following are source-derived findings:

- The foreword describes the edition as the 25th edition of NBTE's directory of accredited programmes offered in NBTE-regulated TVET institutions. It says it contains programmes granted full accreditation and approval accreditation.
- The foreword names nine institution categories: Polytechnics; Colleges of Agriculture; Colleges of Nursing Sciences; Colleges of Health Sciences; Specialised Institutions; Innovation Enterprise Institutions; Technical Colleges; Vocational Enterprise Institutions; and NSQ Training Providers/Centres.
- The foreword lists Post-HND, HND, ND, NID, ANBC, ANTC, NBC, NTC, NVC and NSQ as possible certificates/qualifications. The institution category and award/qualification type must remain separate.
- The foreword says accreditation takes effect from the latest date in the expiration-date column and that programmes granted accreditation are due for another visit after five calendar years.
- The abbreviation key defines source states beyond Accredited/Interim/Expired: Expired*, Interim*, Interim**, Revalidation, Denied, Dropped and Withdrawn. Store the exact raw status token and the source definition/version; do not reduce these states to a boolean.
- The directory includes a polytechnic listing with establishment year and ownership; a six-geopolitical-zone/proprietorship summary; a consolidated programme catalogue grouped by division; and institution-specific programme tables.
- The six-zone summary prints 962 as the total across its categories and 186 in the polytechnics row. These are the document's summary figures, not BrainLab-verified unique counts and not automatically comparable to the current live NBTE register.
- Institution-specific tables include programme/award label, year granted (sometimes with parenthetical prior-year annotations), accreditation status, approved streams and expiration date.

### Required extraction representation

Keep at least these linked source concepts distinct:
1. Source institution row (raw name, listed type/category, ownership, establishment year, address/contact where present, page and row evidence).
2. Canonical BrainLab institution (created only after identity reconciliation).
3. Programme catalogue label (raw programme name and award prefix as printed).
4. Institution-programme offering (institution + programme + award level/qualification).
5. Accreditation decision/record (raw status, year granted, approved streams, expiration date, any footnote marker/definition).
6. Source document/version and page-level evidence (edition, ISBN, page, extraction/parser version, retrieval timestamp and checksum).

Do not infer current 2026 accreditation from this June/July 2025 edition. The source's status/date should be represented as a historical snapshot and checked against the current NBTE register or a newer official notice before a current-status claim.

### Extraction and quality observations

Selected pages inspected include the foreword and key, the polytechnic listing, the summary table, programme catalogue pages and institution-specific programme tables. These pages show OCR/layout hazards: wrapped names, irregular numbering, malformed date strings, inconsistent punctuation and footnote markers. A takeover note also appears in the institution listing. Preserve raw text and page images where available; put ambiguous rows into human review rather than silently normalising them.

The PDF page 2 copyright notice states that all rights are reserved and reproduction requires prior written permission, except brief quotations specifically used for academic discourse/publications. This is a blocker for bulk republishing the extracted directory in BrainLab until NBTE clarifies and grants the relevant reuse rights.

**Extraction status:** selected-page inspection only. No complete extraction, database import, publication or verification of current programme status has occurred.
