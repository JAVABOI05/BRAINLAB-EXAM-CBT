# Regulator reconciliation and source-quality review — 16 November 2026

**Seed import:** `2026-11-16-community-seed-v1`  
**Staging project:** BrainLabCBT-Staging (`eusgwsuoloomphebrepe`)  
**Current disposition:** 752 source rows staged; 745 pending; 7 require clarification; none published.

## 1. Current official register snapshots

| Regulator | Current official display | What it means for this seed |
|---|---:|---|
| NUC eNUC | 328 universities: 77 Federal, 69 State, 182 Private | Seed has 312. There is an 16-record count difference to reconcile. |
| NBTE public register | 3,471 mixed providers; 7,404 accredited programme records; 207 polytechnics | Seed has 200 polytechnics. The overall 3,471 includes vocational/skills providers and must not be called a tertiary-institution count. |
| NCCE Accredited Colleges | Public page shows serialised entries across multiple types | Seed has 240 colleges of education, but NCCE's page also lists polytechnics offering NCE and other NCE-awarding institutions; total page rows are not directly comparable with a COE-only count. |

Official sources:
- NUC: https://enuc.nuc.edu.ng/nus
- NBTE: https://digitalnbte.nbte.gov.ng/Public/Institutions
- NCCE: https://www.ncce.gov.ng/AccreditedColleges

## 2. Confirmed source-level gaps and caveats

### Universities
- 312 rows in community seed vs NUC's 328 displayed total.
- 124/312 rows have blank website fields.
- NUC count gap is not proof that exactly 16 named institutions are missing; row-level name matching and identity resolution are still required.

### Polytechnics
- 200 rows in community seed vs NBTE's current 207 polytechnic filter.
- The community data notes say the file was built from the NBTE 25th Edition Directory (June 2025). The NBTE current public register is newer and includes current approval status and institution-specific programme records.
- Do not infer the seven-row gap as a simple seven missing institutions until names, mergers, status and category changes have been reconciled.
- 58/200 rows have blank establishment years. This source file has no website column; website is therefore not assessed for this category.

### Colleges of education
- 240 rows in the community seed; NCCE's public page contains multiple types, including Polytechnics offering NCE and Other NCE Awarding Institutions. Its full serialised page count cannot be compared directly to 240.
- 178/240 rows have blank establishment years. This source file has no website column; website is therefore not assessed for this category.
- NCCE's official page currently shows several former College of Education names alongside their claimed successor universities in the community source. These are explicit identity/status conflicts and are not auto-merged.

## 3. Institution status conflicts placed in review

The following six university records have been set to `needs_clarification` because the community dataset's methodology notes report elevation from a former College of Education, while the current NCCE page still lists the former college name:

1. Bamidele Olumilua University of Science and Technology, Ikere — NCCE page lists College of Education, Ikere-Ekiti.
2. Kwara State University of Education, Ilorin — NCCE page lists College of Education Ilorin.
3. Cross River University of Education and Entrepreneurship, Akampa — NCCE page lists Cross River State College of Education, Akampa.
4. AbdulKadir Kure University, Minna — NCCE page lists Niger State College of Education, Minna.
5. Shehu Shagari University of Education, Sokoto — NCCE page lists Shehu Shagari College of Education, Sokoto.
6. PeaceLand University — NCCE page lists Peaceland College of Education, Enugu.

The source disagreement may reflect a stale regulator page, a transition period, or an entity/legal-status issue. It is not safe to choose one explanation without current NUC/NCCE evidence. Preserve both names as source assertions until resolved.

A seventh record, **Sa'adatu Rimi College of Education, Kumbotso, Kano**, has also been set to `needs_clarification`: the community source notes reported NUC approval for conversion to Sa'adatu Rimi University of Education, while NCCE currently lists the college as a State College of Education. Verify the approval, gazette/effective date and current register status before classification.

NCCE evidence:
- College of Education, Ikere-Ekiti, Ilorin and Cross River State College of Education, Akampa appear in the NCCE register: https://www.ncce.gov.ng/AccreditedColleges
- Niger State College of Education, Minna, Peaceland College of Education, Enugu, Sa'adatu Rimi College of Education and Shehu Shagari College of Education appear in the same official register.
- NCCE page types include Polytechnics offering NCE and Other NCE Awarding Institutions, so institution type must be based on the regulator's type column rather than the page heading alone.

## 4. Structure data quality

The free-text school/faculty structure is useful discovery material, but it is not uniformly an official institutional prospectus:
- 10 university rows contain thin/unitemized structure evidence.
- 66 polytechnic rows contain thin/unitemized structure evidence.
- 186 college-of-education rows contain thin/unitemized structure evidence.

Preserve every raw structure string. Do not manufacture departments from prose notes, inferred degree labels or default qualification rules. Only create verified departments and institution-programme offerings when a named institution or regulator source supports them.

## 5. Staging disposition after review

| Source | Total | Pending | Needs clarification |
|---|---:|---:|---:|
| Universities | 312 | 306 | 6 |
| Polytechnics | 200 | 200 | 0 |
| Colleges of education | 240 | 239 | 1 |
| **Total** | **752** | **745** | **7** |

Additional QA notes have been added to rows with missing university websites, missing establishment years and thin structure evidence. Those notes can overlap; the counts above are row-status counts, not a count of distinct defects.

No row has been promoted to a canonical published institution. No programme catalogue entries or institution-programme offerings have been published from generated course-of-study labels. The records remain in private staging with RLS enabled and no anon/authenticated table grants.

## 6. Required next reconciliation work

1. Obtain/capture a current structured NUC university register and match every seed university by canonical identity, location and ownership.
2. Obtain/capture the current NBTE polytechnic-filter export; reconcile all 200 seed rows against the 207 current records, preserving approval/status history.
3. Capture the NCCE list with its type column and compare only genuine Colleges of Education to the 240 seed rows; separately route polytechnics offering NCE and other NCE providers into their correct categories.
4. Resolve the seven explicit status conflicts using NUC/NCCE approval letters, gazettes or official institution notices.
5. Build alias and historical-name links; do not merge legal entities by fuzzy name match alone.
6. Attach dated evidence to each approved record. Only then promote reviewed institution records and begin verified programme/offering imports.

**No production database changes or deployments were made.**
