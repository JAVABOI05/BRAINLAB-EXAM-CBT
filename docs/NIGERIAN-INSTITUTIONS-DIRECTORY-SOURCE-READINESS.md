# National Directory Source Readiness — First Reconciliation Findings

**Review date:** 16 November 2026  
**Status:** Source reconnaissance; no complete dataset has yet been imported.

## 1. NCCE — current public list and historical downloadable list

The current NCCE Accredited Colleges web page exposes a serialised list ending at row 263. It includes filter values for:
- Polytechnics offering NCE
- Private College of Education
- State College of Education
- Federal College of Education
- Other NCE Awarding Institutions

The rows include institution name, provost, ownership/type, state and website. The current page is the better first capture target than the older PDF, but every row still requires normalisation and verification.

The NCCE FOI page also links to a six-page PDF titled List of Approved NCE Awarding Institutions in Nigeria, dated 12 December 2019. Its historical summary is:
- Federal Colleges of Education: 21
- State Colleges of Education: 50
- Privately owned Colleges of Education: 92
- NTI and other NCE-awarding institutions: 11
- Polytechnics offering NCE: 9
- Total: 183

This 2019 PDF is historical evidence only, not a current 2026 import source. It is useful for identifying former names and continuity, but should not override the current NCCE list.

NCCE's FOI page also links a separate Accreditation Status DOCX and a List of Approved and Accredited Colleges PDF. The DOCX was not readable through the available web reader. Obtain the current original files or regulator-provided exports before relying on accreditation details.

Sources:
- Current list: https://www.ncce.gov.ng/AccreditedColleges
- FOI page and document links: https://www.ncce.gov.ng/Home/FOIAct
- Historical 2019 PDF: https://www.ncce.gov.ng/download/files/List_of_Accredited_COEs.pdf
- NCCE contact: info@ncce.gov.ng

## 2. NBTE — register taxonomy and counts

The current NBTE register reports 3,471 registered entries and 7,404 accredited programme records across 37 states and the FCT. Its categories are:
- Polytechnics: 207
- Monotechnics: 0 listed in current filter
- Colleges of Nursing: 242
- Colleges of Health Technology: 154
- Allied Institutions: 155
- Innovative Enterprise Institutions: 3
- Vocational Enterprise Institutions: 26
- Skills Training Centres: 2,362
- Master Craft Persons: 322

The category counts sum to the 3,471 register entries. This is a mixed register, not a count of tertiary institutions. The initial student academic dropdown should include only the relevant recognised tertiary/specialist categories. VEIs, skills centres and individual master craft persons should be excluded from the default tertiary selector and considered only in a separate future vocational directory.

The NBTE public programme selector reports 738 programme labels and 163 trades. This is not the same unit as 7,404 institution-specific programme accreditation records. The data model must preserve the distinction between:
- programme catalogue label
- institution + programme offering
- accreditation/approval record and validity dates
- trade/occupational standard

NBTE help text explicitly states institution approval is separate from programme accreditation and that programme records carry expiry dates. A programme's accreditation status must therefore not be inferred from institution approval.

Sources:
- Register overview: https://digitalnbte.nbte.gov.ng/Public
- Institution register: https://digitalnbte.nbte.gov.ng/Public/Institutions
- Programme register: https://digitalnbte.nbte.gov.ng/Public/Programmes
- Register help: https://digitalnbte.nbte.gov.ng/Public/Help
- NBTE contact shown on official directory page: enquiries@nbte.gov.ng

## 3. NUC — current university count

The NUC eNUC Nigerian University System page displays:
- 77 federal universities
- 69 state universities
- 182 private universities
- 328 total source-displayed university entries

The count is a starting point, not an independently reconciled unique institution count. Capture source rows and programme profiles; retain original source strings alongside BrainLab canonical values. Review new/recent entries, ownership and spelling anomalies before publication.

Source:
- https://enuc.nuc.edu.ng/nus
- NUC contact: info@nuc.edu.ng

## 4. Revised import sequencing

1. Capture NUC university list and accessible programme profiles.
2. Capture current NCCE 263-row page, preserving source type labels; cross-check with 2019 PDF only for historical name continuity.
3. Obtain NBTE 2025 directory and current register export; request machine-readable exports where available.
4. Split NBTE tertiary/specialist providers from vocational/trade providers.
5. Build institution master records first, then programme catalogue labels, then institution-programme offerings and time-bounded approval/accreditation evidence.
6. Generate reconciliation reports before publishing any rows.

## 5. Import blockers

- NBTE's 2025 directory PDF is 13,841,731 bytes and could not be fetched by the available web reader due to the file-size limit. No extraction has been done.
- The NBTE live register is paginated (the institution search result indicates hundreds of pages); a bulk export/API is not yet verified.
- NCCE's current list is readable in the public page, but no documented structured CSV/API export has been verified. The current Accreditation Status DOCX could not be read by the available reader.
- NUC's current web list is readable in indexed extracts but a complete machine-readable export has not been verified.

Do not describe the dataset as complete or publish source counts as BrainLab verified counts until the rows have been captured, normalised, reconciled and approved.
