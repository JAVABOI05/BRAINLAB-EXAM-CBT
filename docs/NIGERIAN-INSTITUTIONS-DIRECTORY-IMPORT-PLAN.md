# BrainLab National Institutions & Programmes Directory — Data Acquisition & Import Plan

**Status:** Initial source inventory and controlled import plan  
**Date:** 16 November 2026  
**No production import or schema change is authorised by this document.**

## 1. Source register

| Dataset | Primary source | Expected coverage | Acquisition method | Key cautions |
|---|---|---|---|---|
| Universities | NUC eNUC Nigerian University System | Federal, state and private universities; university profiles and approved programmes | Public directory/profile review; request structured export from NUC if available | Directory may contain spelling, ownership or recency anomalies; page count is not proof every programme is current |
| Polytechnics and technical institutions | NBTE public register and 2025 Directory of Accredited Programmes | NBTE-regulated polytechnics and other TVET institutions; accredited programmes | Public register and official downloadable directory | Directory includes institutions beyond traditional polytechnics; classify by actual institutional type and qualification |
| Colleges of education | NCCE Accredited Colleges | Federal/state/private colleges, plus some institutions offering NCE | Public directory review; request structured export | The list includes polytechnics offering NCE and other NCE-awarding institutions; do not classify all rows as colleges of education |
| Admission mappings | JAMB IBASS | Institution/course eligibility, UTME/O'Level/A'Level requirements | Manual validation or formally authorised structured access | Treat as admission-year-specific and dynamic; do not automate through undocumented endpoints |
| Cross-check | Federal Ministry of Education / FTIGTP | Selected universities, polytechnics and COEs | Public institutional lists and portal reports | Submission/reporting coverage is not a complete national register |

## 2. Confirmed source pages

- NUC eNUC Nigerian University System: https://enuc.nuc.edu.ng/nus
- NUC eNUC homepage: https://enuc.nuc.edu.ng/
- NBTE public institutions register: https://digitalnbte.nbte.gov.ng/Public/Institutions
- NBTE 2025 Directory of Accredited Programmes: https://web.nbte.gov.ng/node/114
- NBTE directory/downloads: https://www.nbte.gov.ng/nbte/directory
- NBTE available downloads: https://web.nbte.gov.ng/downloads
- NCCE Accredited Colleges: https://www.ncce.gov.ng/AccreditedColleges
- JAMB IBASS Eligibility Checker: https://eligibility.jamb.gov.ng/
- Federal Ministry of Education institution directory: https://education.gov.ng/institutions/
- Federal Tertiary Institutions Governance Transparency Portal: https://transparency.education.gov.ng/

## 3. What the first source review established

- NUC's eNUC page describes the Nigerian University System as a central platform for verified university, approved-programme, affiliation and quality-assurance information. It currently displays 77 federal, 69 state and 182 private universities (328 total). These are source-displayed counts, not independently reconciled BrainLab counts.
- The NUC directory includes new institution entries and some visible spelling/metadata inconsistencies. All rows must be normalised and reconciled before publication.
- NBTE publishes a 2025 Directory of Accredited Programmes and an official public institutions register. The NBTE source material includes polytechnics and other TVET institutions.
- NCCE's comprehensive accredited-colleges page contains mixed institution types, including polytechnics offering NCE and other NCE-awarding institutions. Institution category must be derived from the row's actual type, not simply the page title.
- The FTIGTP portal reports partial submission coverage (58/63 universities, 37/41 polytechnics and 27/29 COEs on the page reviewed). This is useful as a cross-check but not a complete register.
- No publicly documented, supported API providing the complete required national dataset has been verified. Do not invent endpoints or depend on brittle scraping.

## 4. Acquisition work packages

### A. Universities — NUC
1. Capture every row from the current eNUC directory with source URL and retrieval timestamp.
2. Visit institution profiles where accessible to capture institution-specific approved academic programmes.
3. Capture NUC's official ownership and state fields as source values, without assuming they are error-free.
4. Compare with Ministry listings and official university notices where there are conflicts.
5. Flag newly listed, renamed, recently established or ambiguous institutions for manual review.
6. Request a structured CSV/XLSX/JSON export and data-use guidance from NUC if available.

### B. Polytechnics / TVET — NBTE
1. Download the 2025 Directory of Accredited Programmes from the official NBTE download page.
2. Preserve the original file, checksum, edition and retrieval date.
3. Extract institution names, programmes, award levels, departments and accreditation/approval notes.
4. Reconcile each institution against the NBTE public register.
5. Separate polytechnics, monotechnics, specialist institutions, TVET providers and other post-secondary providers.
6. Request current structured data and update cadence from NBTE.

### C. Colleges of education — NCCE
1. Capture all NCCE Accredited Colleges rows, including ownership, state, listed institution type and website where present.
2. Explicitly classify NCE-awarding polytechnics and other NCE-awarding bodies as such; do not force them into the COE category.
3. Capture NCE programmes only where the official source supports the institution-programme relationship.
4. Resolve malformed ownership/type values and apparent spelling errors through source review.
5. Request an official structured export and clarification of active/accredited status definitions from NCCE.

### D. Admission data — JAMB
1. Do not treat JAMB IBASS as a general course directory detached from an institution.
2. Record admission year/session and mode of entry.
3. Capture institution + programme + UTME subject combination + O'Level/A'Level requirements only from an authorised and reviewed source.
4. Store requirement versions with effective dates; never overwrite prior admission-year requirements.
5. Link the student-facing eligibility checker to the current official JAMB source and clearly label BrainLab output as guidance.

## 5. Import staging workflow

1. Create a source document record with URL, retrieval date, edition, file checksum and source type.
2. Load extracted rows into a private staging table as raw JSONB; do not write directly to published directory tables.
3. Run deterministic normalisation: whitespace, punctuation, Unicode, state names, ownership labels, category labels and award abbreviations.
4. Generate candidate matches using exact source IDs, aliases and fuzzy name similarity.
5. Auto-match only high-confidence exact identifiers/normalised exact matches; fuzzy matches go to review.
6. Validate required fields and permitted categories.
7. Produce a reconciliation report: new, matched, changed, duplicate candidate, conflicting, invalid and missing.
8. Have a reviewer resolve conflicts and attach evidence.
9. Publish approved records transactionally with an import_job_id.
10. Record audit history and support batch rollback/forward-fix without deleting records already referenced by student profiles.

## 6. Reconciliation rules

- Never deduplicate on name alone.
- Use regulator identifier where available; otherwise use a stable BrainLab ID plus verified name, location, ownership and regulator evidence.
- Treat former names as aliases, not new institutions, when continuity is confirmed.
- Treat a merger, split, takeover or legal conversion as an entity-history decision, not a string edit.
- Distinguish institution recognition from individual programme accreditation.
- Preserve contradictory source values and escalate; do not overwrite one regulator with another.
- Keep source-provided values separate from BrainLab's canonicalised values.
- Record a confidence/review reason, not an unexplained numeric score alone.

## 7. Initial import templates

### institutions.csv
institution_source_key,canonical_name,source_name,institution_category,ownership,regulatory_authority,state,city,lga,official_website,recognition_status,established_year,source_document_key,source_record_key,source_effective_date,review_status,review_notes

### programmes.csv
programme_source_key,canonical_name,source_programme_name,discipline_group,programme_level,source_document_key,source_record_key,review_status,review_notes

### institution_programmes.csv
offering_source_key,institution_source_key,programme_source_key,faculty_name,department_name,award_type,award_title,study_mode,approval_status,valid_from,valid_to,admission_status,source_document_key,source_record_key,review_status,review_notes

### aliases.csv
entity_type,source_entity_key,alias,alias_type,source_document_key,source_record_key,review_status

These are staging templates, not final production CSV contracts. Do not load them into public tables.

## 8. Quality gates and reporting

Report by source and institution category:
- Total source rows captured.
- Unique candidate institutions.
- Published verified institutions.
- Pending/ambiguous institutions.
- Duplicate candidates and confirmed merges.
- Programme catalogue unique count.
- Institution-programme offering count.
- Offerings with current approval/accreditation evidence.
- Offerings with expired/unknown status.
- Rows with missing state, ownership, award type or source evidence.
- Source coverage and last checked date.

No public completeness claim until coverage is reconciled against each competent regulator's current register and limitations are disclosed.

## 9. Operational cadence

- Quarterly source review as a minimum.
- Immediate review when a regulator publishes a new approved-institution/programme notice.
- Admission requirements: refresh per JAMB admission cycle and whenever JAMB publishes changes.
- Import jobs must be idempotent and produce a diff before publishing.
- Keep source artefacts/checksums and import parser version to reproduce the import.

## 10. First milestone exit criteria

- NUC, NBTE and NCCE source inventory completed.
- Official NBTE 2025 file captured and checksum recorded.
- Current NUC university rows captured and reconciled.
- NCCE list captured and mixed-category records flagged.
- Source-to-canonical mapping documented.
- Draft database model reviewed against the actual BrainLab account/profile and RBAC schema.
- CSV templates validated on sample rows.
- No production database changes and no public dropdown integration in this milestone.
