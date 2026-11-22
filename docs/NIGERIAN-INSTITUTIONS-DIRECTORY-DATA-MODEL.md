# BrainLab National Institutions & Programmes Directory — Data Model

**Status:** Foundation specification for review  
**Scope:** Nigeria; universities, polytechnics, colleges of education, monotechnics and other regulator-recognised tertiary/specialist institutions  
**Initial use:** Student academic profiles  
**Future use:** Programme discovery, admission requirements and eligibility guidance  
**Safety:** This document does not authorise a database migration or production change.

## 1. Architectural boundaries

- The directory is a shared platform reference-data domain.
- Keep it separate from the existing Learning Hub `courses` table, which represents BrainLab-authored/teaching courses and enrolments.
- Do not store a copied institution or programme name as the sole student-profile reference. Store stable foreign keys and retain a historical display snapshot where needed.
- Do not assume the existing student-profile table or auth metadata contract. Map the actual account/profile implementation before adding foreign keys.
- UUID primary keys; timestamps in `timestamptz`; explicit source provenance; soft archival for records referenced by learner history.
- A national programme catalogue is distinct from the programmes offered by an individual institution.

## 2. Core reference tables

### `directory_institutions`
- `id uuid primary key`
- `canonical_name text not null`
- `slug text not null unique`
- `institution_category text not null`: university, polytechnic, college_of_education, monotechnic, specialist, other
- `ownership text`: federal, state, private, public_other, unknown
- `regulatory_authority text`: NUC, NBTE, NCCE, other, multiple, unknown
- `state_code text`, `lga_name text`, `city_name text`
- `official_website text`
- `recognition_status text not null`: pending, recognised, provisional, suspended, not_recognised, closed, unknown
- `record_status text not null`: draft, published, archived
- `established_year integer` (nullable)
- `verified_at timestamptz`, `created_at timestamptz`, `updated_at timestamptz`
- Check constraints for enumerated values and plausible year range.

### `directory_institution_aliases`
- `id uuid primary key`, `institution_id uuid references directory_institutions`
- `alias text not null`, `normalized_alias text not null`
- `alias_type text`: acronym, former_name, common_name, spelling_variant, campus_name, other
- Unique normalised alias per institution; index for search.

### `directory_campuses`
- `id uuid primary key`, `institution_id uuid references directory_institutions`
- `campus_name text`, `campus_type text`, `state_code text`, `lga_name text`, `city_name text`, `address text`
- `is_main_campus boolean not null default false`, `record_status text`.

### `directory_faculties`
- `id uuid primary key`, `institution_id uuid references directory_institutions`
- `name text not null`, `normalized_name text not null`, `record_status text`
- Unique institution + normalized name.

### `directory_departments`
- `id uuid primary key`, `institution_id uuid references directory_institutions`
- `faculty_id uuid nullable references directory_faculties`
- `name text not null`, `normalized_name text not null`, `record_status text`
- Unique institution + normalized name; faculty must belong to same institution (enforce in import/application or trigger).

### `directory_programmes`
- `id uuid primary key`
- `canonical_name text not null`, `normalized_name text not null`, `slug text not null unique`
- `discipline_group text`, `discipline_subject text`
- `programme_level text`: certificate, diploma, undergraduate, postgraduate, professional, other
- `record_status text`: draft, published, archived
- This is the canonical national catalogue only; no assertion that every institution offers it.

### `directory_programme_aliases`
- `id uuid primary key`, `programme_id uuid references directory_programmes`
- `alias text not null`, `normalized_alias text not null`, `alias_type text`
- Unique normalized alias + programme.

### `directory_institution_programmes`
- `id uuid primary key`
- `institution_id uuid not null references directory_institutions`
- `programme_id uuid not null references directory_programmes`
- `department_id uuid nullable references directory_departments`
- `faculty_id uuid nullable references directory_faculties`
- `award_type text not null`: NCE, ND, HND, BSc, BA, BEng, BTech, MBBS, PharmD, MSc, MA, PhD, PGD, professional, other
- `award_title text` for regulator/institution-specific wording
- `study_mode text`: full_time, part_time, distance, sandwich, online, other, unknown
- `admission_status text`: open, suspended, discontinued, unknown
- `approval_status text`: pending, approved, provisional, suspended, expired, not_approved, unknown
- `valid_from date`, `valid_to date`, `last_verified_at timestamptz`
- Unique institution + programme + award type + study mode (review exact key before migration).

## 3. Evidence and import operations

### `directory_sources`
Registry of sources: regulator/agency, source name, canonical URL, source type (web_register, downloadable_file, API, official_notice, manual_confirmation), jurisdiction, reliability tier, terms/permission notes, last_checked_at, active flag.

### `directory_source_documents`
Immutable record of each retrieved source artifact: source_id, title, source_url, publication/effective date, retrieved_at, file checksum (SHA-256), media type, storage reference if retained, parser version and notes. Do not store copyrighted source documents in public Storage; retain only where permitted.

### `directory_record_evidence`
Links an institution/programme/offering to one or more source documents and source row identifiers. Include evidence type, quoted short factual extract or structured source values, source effective date, verification status, reviewer and reviewed_at.

### `directory_import_jobs`
One row per import run: source_id, document_id, import mode (preview, reconcile, publish), status, started_at, completed_at, initiated_by, parser_version, counts (read/valid/invalid/new/changed/duplicate/conflict/published), error summary.

### `directory_import_rows`
Raw source row as JSONB plus row number, source key, normalized candidate values, match decision, matched entity IDs, validation errors, review status and published timestamp. Raw data is staging-only and must not be exposed to student clients.

### `directory_change_log`
Append-only audit: entity type/id, operation, before/after JSONB, reason, import_job_id, actor, created_at. Never log secrets or learner personal data.

### `directory_review_queue`
Human review of conflicting names, uncertain matches, new institution claims, accreditation ambiguity and proposed merges. Include assigned reviewer, resolution, evidence and timestamps.

### `directory_suggestions`
Student-submitted missing institution/programme request. Store submitter user_id only if authenticated, submitted text, category, state, evidence URL, status and moderation notes. Suggestions never publish automatically.

## 4. Student profile integration

Do not add columns until the existing student/profile model is identified.

Target integration fields:
- `institution_id uuid nullable`
- `institution_programme_id uuid nullable`
- `campus_id uuid nullable`
- `study_level text nullable`
- `study_status text`: prospective, admitted, enrolled, graduated, withdrawn, other
- `admission_year integer nullable`
- `expected_graduation_year integer nullable`
- `profile_display_snapshot jsonb nullable` for historical display only.

The student's current selection should reference a published institution and a published offering belonging to that institution. Prospective students may choose an institution without selecting a current programme, or choose a target programme separately when the UX supports it. Preserve historical profile values when a programme or institution is archived or renamed.

Tutor qualifications should not be silently mapped to this student profile model. A separate verified-qualification relationship can be designed later.

## 5. Search and performance

- Search canonical names and aliases; use PostgreSQL `pg_trgm` or the existing approved search strategy only after checking extensions and query plans.
- Index published status + category + ownership + state; index institution_id on all child tables; index programme_id on offerings.
- Use a server-side search endpoint with bounded page size and minimum query length for broad searches.
- Student-facing queries return only published records and safe display fields.
- Do not expose raw import tables, evidence notes, reviewer details or administrative audit history to anonymous/authenticated student roles.
- Avoid fetching the entire directory into browser memory.

## 6. Security and RLS design (to be finalised against current RBAC)

- Enable RLS on every exposed-schema table.
- Students/anonymous users: SELECT published institution/programme/offering records only; no writes.
- Authenticated users: may create a suggestion tied to their own user ID; cannot approve or publish it.
- Directory reviewers/managers: access through existing central RBAC permissions, not hard-coded email checks or a parallel role table.
- Import staging, source documents, audit logs and review queue: deny student/anon access; manager/reviewer-only server-side operations.
- All UPDATE policies must have both USING and WITH CHECK; test cross-institution IDOR.
- Do not trust user_metadata for authorisation.
- No SECURITY DEFINER RPC until required; if required, use a non-exposed schema, explicit auth/permission checks, pinned search_path, least-privilege grants and advisor review.

## 7. Data integrity rules

- Institution name similarity is a candidate match, not proof of identity.
- Do not merge solely on fuzzy name similarity.
- One institution can have multiple campuses and many offerings.
- One programme can be offered by many institutions and under different award types.
- Accreditation/approval is time-bound and attached to the institution-programme offering, not the generic programme.
- A source saying an institution exists does not prove every course is approved.
- A historical or closed institution remains available for historical profile references but is not selectable for a new profile.
- Conflicts between regulators are surfaced for review; no silent last-write-wins.

## 8. Proposed initial publication gates

1. Institution identity and category verified against the competent regulator.
2. Ownership/state checked.
3. Institution-programme relationship supported by regulator or institution evidence.
4. Award type and mode normalised.
5. Accreditation/approval status and effective date captured where source provides them.
6. Duplicate/conflict checks pass.
7. Reviewer approval recorded.

## 9. Out of scope for first release

- Official JAMB eligibility decisions.
- Automated claims that a student is eligible for admission.
- Scraping protected portals or bypassing CAPTCHAs/authentication.
- Importing every historical or unregulated provider as an active tertiary institution.
- Tutor credential verification workflow.
- International institution catalogue.
