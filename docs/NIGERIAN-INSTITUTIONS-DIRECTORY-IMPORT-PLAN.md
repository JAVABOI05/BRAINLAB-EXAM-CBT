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
1. Preserve the supplied NBTE 25th Edition 2025 PDF as an immutable source artefact; record its 540-page length, June 2025 edition date, 1 July 2025 foreword date and ISBN 978-978-916-767-8.
2. Calculate and record a SHA-256 checksum in the controlled extraction manifest before any repeatable full extraction; do not invent a checksum from the document title or file metadata.
3. Obtain written NBTE permission for bulk reuse/republishing before using extracted records in BrainLab's public catalogue; the PDF's page-2 notice reserves reproduction rights.
4. Extract institution listing rows, consolidated programme catalogue labels and institution-specific programme/accreditation tables as separate datasets.
5. Preserve exact raw status tokens, year-granted annotations, approved-stream counts, expiration-date strings, page numbers and row evidence. Do not collapse status to a boolean or infer 2026 validity from this 2025 edition.
6. Reconcile every source institution against the current NBTE public register and other regulator sources; classify the nine institution categories named in the foreword and separate tertiary/specialist categories from vocational/skills providers.
7. Request current structured data, current accreditation status, reuse terms and update cadence from NBTE.

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


## 11. NBTE 25th Edition 2025 — controlled extraction specification

### 11.1 Source facts to retain
- Edition: 25th Edition, June 2025; foreword dated 1 July 2025.
- Publisher: National Board for Technical Education.
- Title: *Directory of Accredited Programmes Offered in Polytechnics, Technical and Vocational Institutions in Nigeria*.
- ISBN: 978-978-916-767-8.
- Extent: 540 pages.
- Reuse: page 2 reserves all rights and requires prior written permission for reproduction except brief academic quotations. Bulk extraction for public BrainLab redistribution is blocked pending written permission.

### 11.2 Separate extraction streams
A. Institution register section:
- source institution name exactly as printed
- source institution category/section
- ownership/proprietorship exactly as printed
- establishment year exactly as printed
- address, state, contact and website where present
- source page and source row/serial
- notes about takeover, conversion, merger or other history

B. Consolidated programme catalogue:
- division/discipline heading exactly as printed
- programme label exactly as printed
- award prefix/type (ND, HND, NID, etc.) exactly as printed
- catalogue page and serial number
- retain repeated labels and possible duplicates until reviewed

C. Institution-specific programme/accreditation table:
- institution source key
- programme source label exactly as printed
- year granted field as raw text (including parenthetical annotations)
- accreditation status token exactly as printed
- approved streams as raw value and parsed integer only when unambiguous
- expiration date as raw text and parsed date only when valid
- division/section heading
- source page and row evidence
- footnote marker/definition and any continuation/wrapped-line linkage

### 11.3 Status semantics
The document's abbreviation key includes Accredited, Interim, Expired, Expired*, Interim*, Interim**, Revalidation, Denied, Dropped and Withdrawn. Keep the raw source token and the edition-specific definition. Do not map all non-Accredited values to "not approved"; do not treat a missing or malformed date as a valid date; do not treat "Denied", "Dropped" and "Withdrawn" as synonyms. The source says accreditation takes effect from the latest date in the expiration-date column and that programmes granted accreditation are due for another visit after five calendar years. This is source guidance for interpreting the 2025 edition, not proof of present-day status.

### 11.4 Quality-control rules
- Preserve page-level source evidence and raw extracted strings.
- OCR/parser output is a draft, never a publication-ready record.
- Detect wrapped programme names and multi-line continuation rows.
- Flag malformed dates, inconsistent numbering, missing serials, repeated programme names, footnote markers and conflicting status/date combinations.
- Preserve the source value and store a separate proposed normalised value with a review state.
- Do not auto-merge institutions by name alone.
- A reviewer must approve every ambiguous institution identity and every ambiguous accreditation row.
- Compare 2025 records with the current NBTE public register and request a current regulator export before presenting live accreditation status.

### 11.5 Source summary figures — context only
The PDF's six-zone/proprietorship summary prints 962 total records across its listed institution categories and 186 for the polytechnics row. These are NBTE's printed 2025 summary figures. They must not be reported as BrainLab-verified unique counts or reconciled to current NBTE portal figures without a documented row-level comparison.

### 11.6 Extraction milestone gates
1. Source artefact retained and checksum recorded.
2. Reuse permission obtained or legal decision recorded to limit use to permitted internal analysis/brief quotation.
3. Parser/extraction approach tested on representative pages from each table layout.
4. Raw extraction completed with page/row provenance.
5. Validation report produced for missing/invalid fields and OCR anomalies.
6. Institution identities reconciled with current NBTE register.
7. Accreditation records reviewed against current NBTE evidence.
8. Only approved, rights-cleared records considered for publication.

No complete extraction has been completed from the supplied PDF. Selected pages have been inspected only. No rows have been imported into Supabase.


### 11.7 Raw NBTE source-row templates

Two header-only templates have been added under `data/directory-import-templates/`:
- `nbte-2025-institution-source-rows.csv` — captures source page, section, serial, exact institution name/category, ownership, establishment year, address/contact/website and review state.
- `nbte-2025-programme-accreditation-source-rows.csv` — captures source page, institution linkage, division, exact programme/award label, year granted, raw status, approved streams, expiration date, footnote markers and continuation text.

They intentionally contain headers only. They are raw extraction/staging aids, not publication-ready directory data and not a final database contract. Populate them only after rights review and controlled extraction; retain raw strings even when a parsed value is also recorded.


### 11.8 Supplied source artefact integrity record

The supplied NBTE PDF has now been checked locally:
- File: `25th Edition 2025 Directory.pdf`
- Size: 13,841,731 bytes
- Pages: 540
- PDF version: 1.7
- Creation/modification metadata: 21 October 2025 UTC
- SHA-256: `11c7e9b7e6f63136ae114c1bc8cc6884280c5555aad64a4b17cb705bbbbafcda`

This checksum identifies the exact supplied artefact for repeatable internal analysis. It does not grant reproduction rights. Keep the original file immutable and record this checksum in any future extraction job manifest.

### 11.9 Current regulator snapshot refresh (16 November 2026)

- NUC eNUC displays 328 universities (77 Federal, 69 State, 182 Private).
- NBTE's live public register states 3,471 institutions and 7,404 accredited programme records. Its filters include 207 polytechnics, 242 colleges of nursing, 154 colleges of health technology, 155 allied institutions, 3 IEIs, 26 VEIs, 2,362 skills training centres and 322 master craft persons. It displays zero monotechnics in its current filter. The 3,471 count is mixed-category coverage, not a tertiary-only total.
- NCCE's current Accredited Colleges page exposes 263 serialised rows in the reviewed page output, with multiple institution-type labels including colleges of education, polytechnics offering NCE and other NCE-awarding institutions.

These are source-displayed snapshots. The import process must capture all rows, preserve source retrieval time, reconcile duplicates and validate current status before computing BrainLab's own counts.
