# Classroom Private Media — Compatibility and Migration Plan

**Status:** Inspection complete; implementation plan only. No bucket, policy, table, or production data changes have been made.

## Findings verified against the current staging project and feature branch

- `learning-content-media` is a **public** Storage bucket. Its current bucket configuration permits images, audio, video, and PDF files.
- The same bucket is used by the Learning Hub signed-upload flow (`app/api/learning/content-media/upload-url/route.ts`), so changing this bucket to private would affect more than Live Classroom.
- The classroom upload route (`app/api/classroom/upload/route.ts`) uploads images and documents to this shared bucket and returns direct public URLs. Audio is registered in `audio_assets` and delivered through `/api/classroom/media/[id]`.
- `live-class-recordings` is already a separate private bucket. Recording delivery in `app/api/recordings/route.ts` uses short-lived signed URLs.
- The staging bucket currently contains 5 objects in `learning-content-media` (about 2.06 MiB). This is a staging observation only; it is not proof that production has the same object count.
- The classroom material importer currently passes `lessonId` as `classId` to the classroom upload endpoint. These are different identifiers; this can fail class admission checks and fall back to embedding the image as a data URL. This needs a separate compatibility fix after confirming all call sites and lesson ownership semantics.
- Existing `audio_assets` policies permit broad reads for `tutor_voice_note` and `lesson_audio` records. The media proxy itself applies classroom authorization, but direct table access and legacy clients need a separate audit.

## Why the shared bucket must not be made private in place

The Learning Hub uses the same bucket for its own media upload flow. Making it private would break existing consumers that store or render public URLs unless every reader, editor, preview, and export path is migrated together. Do not toggle the existing bucket's public flag as part of a classroom-only fix.

## Recommended target architecture

1. **Create a dedicated private bucket** named `classroom-private-media` for new classroom images, slide images, handouts, and other class-bound resources. Keep `learning-content-media` unchanged for Learning Hub compatibility.
2. **Add a durable asset registry** (proposed table: `classroom_media_assets`) containing an opaque asset ID, class/lesson binding, uploader ID, bucket ID, storage path, media type, MIME type, original filename, size, and timestamps. Keep storage paths private; do not expose them to students.
3. **Authorize before issuing upload or read access.** Upload requests must verify the signed-in user and the relevant class/lesson relationship. Read requests must resolve the asset record, check current class admission/ownership through the shared classroom authorization helper, and only then issue a short-lived signed URL.
4. **Use one authenticated media endpoint** for image, document, and audio reads. Set private/no-store response headers and safe inline content types. Validate range requests and avoid redirecting to arbitrary external URLs.
5. **Keep existing public URLs working during transition.** Existing classroom materials and Learning Hub media must not be silently rewritten. New uploads can use the private bucket after the new metadata table and policies are approved and deployed.
6. **Migrate old classroom assets only after inventory.** Identify classroom references by stored lesson/whiteboard data, copy objects to the private bucket, update references transactionally or with a reversible mapping, and verify every consumer before retiring old references. Do not bulk-migrate all objects in the shared bucket.
7. **Apply least-privilege Storage policies.** Prefer server-verified authorization and narrow policies for the new bucket. Do not grant broad authenticated read access. Review upload/upsert semantics (INSERT, SELECT, UPDATE) and ensure any privileged server client is never exposed to the browser.
8. **Audit recording and audio metadata separately.** Ensure direct table reads cannot bypass course/class access rules, and ensure recording URLs are minted only after the same entitlement checks used by the application.

## Required compatibility inventory before implementation

- Whiteboard page backgrounds, embedded images, imported slide decks, and attachment previews.
- Classroom resource/library pages and student-facing lesson viewers.
- Learning Hub content blocks, upload/finalization flows, previews, and downloads.
- Audio assets and voice-note playback.
- Live-class recording uploads, playback, downloads, thumbnails, and captions.
- Existing stored URLs in database JSON, lesson project payloads, and recording metadata.

## Safe rollout sequence

1. Add the asset metadata schema and private bucket/policies in a reviewed migration (not applied yet).
2. Add authenticated upload/read endpoints and automated authorization tests.
3. Switch only new classroom uploads to the private bucket.
4. Update classroom viewers to use the authenticated media endpoint.
5. Run staging compatibility tests for tutor, admitted student, non-admitted student, expired access, and platform admin.
6. Inventory and migrate legacy classroom assets in controlled batches with rollback mapping.
7. Only after all consumers are verified, consider cleanup of legacy classroom references. Keep the shared Learning Hub bucket public unless a separate Learning Hub migration is approved.

## Explicitly out of scope for this inspection

- No Storage bucket setting changes.
- No Storage policy changes.
- No SQL schema changes or migrations applied.
- No bulk object movement or URL rewriting.
- No production deployment, merge, or promotion.


## Follow-up code review — Studio importer and upload durability

The importer call site in `app/classroom/studio/page.tsx` passes a Studio `lessonId` into `classroom/upload` as `classId`. The upload route interprets that value as a `live_classes.id`, which is the wrong resource namespace. This is now corrected in the feature branch:

- Studio slide and handout uploads use the existing `classroom-assets` shared-assets scope.
- The upload endpoint already restricts that scope to verified teaching staff.
- The importer no longer accepts/passes a misleading `lessonId` prop for upload authorization. Lesson ownership remains enforced by the Classroom Studio lesson endpoints.
- The upload endpoint now returns HTTP 503 if Supabase Storage does not durably store the object. It no longer reports success with a proxy URL backed only by process-local memory, which is unreliable across serverless instances.

This is a compatibility correction, not a private-media implementation. New Studio images/documents still use the existing public shared bucket until the dedicated private bucket and asset registry are approved and implemented.

## Additional security issue queued for review

The legacy `app/api/recordings/route.ts` and newer `app/api/classroom/recordings/route.ts` expose overlapping recording workflows with different authorization logic. The legacy GET path includes an `access_policy === "public"` branch and its own subscription/enrollment checks; the newer path uses `canAccessClassroom`. These endpoints and all callers must be reconciled before either is removed or tightened, to avoid both bypasses and accidental loss of intended public/course access.


## Recording-storage follow-up — private bucket upload and playback

The staging database currently has **no Storage object policies** for `live-class-recordings`. This is consistent with the bucket being private and the application needing server-minted signed upload tokens. The Studio UI previously attempted a direct browser upload without such a token, then minted a one-year signed playback URL in the browser and stored that URL in recording metadata.

The feature branch now addresses that flow:

- Added `POST /api/classroom/studio/recording-upload-url`. It verifies staff status, verifies that the requested Studio lesson belongs to the signed-in tutor, and mints a signed upload token for a path scoped to `studio-lessons/{userId}/...`.
- Updated Studio recording save to save the lesson first, request the signed upload token, upload with `uploadToSignedUrl`, and use normalized MIME types.
- Updated `POST /api/classroom/recordings` to require an owned Studio lesson when no scheduled class is supplied, validate recording paths against the tutor/class or tutor/Studio prefix, and store the private Storage path rather than a client-minted long-lived signed URL.
- The recording metadata insert uses the server-side service client only after the requester's identity, verified staff status, class ownership, and/or lesson ownership have been checked with the caller-scoped client. This is necessary because the existing `class_recordings` INSERT RLS policy only permits recordings attached to a scheduled class.
- Updated `GET /api/classroom/recordings` to authorize visibility first, then mint 60-minute playback URLs from the private bucket. It no longer needs to rely on a year-long URL stored in the row.

These code changes have not yet been verified by a successful preview build. The private bucket's existing setting and policies were only inspected; no storage settings or database policies were changed.

## Remaining recording compatibility checks

- Confirm the Studio lesson row exists and is owned by the current tutor before requesting the upload token (implemented server-side).
- Confirm the recording metadata insert works with the configured service-role secret in the deployment environment; without it, the route fails safely.
- Actual video trimming is not implemented. The old false-success endpoint has been disabled with HTTP 501; preview controls are explicitly preview-only.
- Review the legacy `/api/recordings` flow and `/api/recordings/[id]/download` separately; they still have a different authorization model and a 4-hour playback URL in the legacy GET handler.


## Legacy recording API audit — access fixes and known limitations

The staging schema confirms that `class_recordings` contains `class_id`, `course_id`, `lesson_id`, `created_by`, `storage_path`, `access_policy`, and publication fields. `live_classes` contains its authoritative `course_id` and `tutor_id`; `class_attendance_records` provides class/user attendance rows and `attendance_status`. The staging `class_recordings` table currently returned no rows, so there was no existing recording sample to validate against.

Code-only fixes committed to the feature branch:

- The legacy scheduled-class recording save route now reads the class's authoritative `course_id`, rejects a mismatched caller-supplied course, and stores the class-linked course ID.
- Student playback for class-linked `enrolled_only` recordings now checks the class's authoritative course entitlement. For standalone classes without a course, it requires a recorded attendance status (`present`, `partial`, or `manual_verified`) rather than reusing temporary live-room entry-code grants.
- An `enrolled_only` recording with neither a class nor course association is no longer exposed to every signed-in user by default.
- Tutor-owned Studio recordings are included in the tutor's recording-management results and the original-file download endpoint verifies ownership through the linked `classroom_lessons.tutor_id`.
- The legacy recording GET route still creates a four-hour signed playback URL. Shortening this is deferred until all playback consumers and long-video behavior are tested.

### Trimming behavior correction

The prior `/api/classroom/trim` endpoint did not transcode or cut the uploaded file. It echoed the submitted URL, attempted metadata updates against columns not present in the inspected staging `class_recordings` schema, and returned a successful/completed response regardless. This was misleading.

The feature branch now:
- Labels the preview controls as preview-only.
- Stores the complete original recording duration.
- Does not mint an unnecessary temporary signed URL or call the fake trim job during Studio save.
- Returns HTTP 501 from the trim endpoint until a real media-processing pipeline is implemented.

The complete original video remains downloadable. Actual trimmed export is not implemented yet.

### Remaining checks

- Confirm the four-hour legacy playback URL can be shortened without breaking long-form playback or the tutor management UI.
- Reconcile the two recording APIs' publication, visibility, and course-access semantics before consolidating them.
- Add tests for class admission, course mismatch, no-scope recordings, Studio owner visibility/download, and non-owner denial.
- Inspect the legacy upload/download routes and all recording UI consumers as part of the compatibility test pass.

No schema, Storage, or production changes were made.


## Messaging and audio authorization review — additional high-priority findings

Read-only inspection of the staging schema and policies found several cross-feature issues that must be resolved before treating the media layer as private:

1. **Audio asset row visibility is too broad.** The current `audio_assets` SELECT policy is assigned to `public` and allows any requester to read every `tutor_voice_note` and `lesson_audio` row, regardless of its parent feed post, assignment, message conversation, or classroom. The table's `file_url` can contain a base64 audio payload, so this is not merely metadata exposure.
2. **The same audio table serves multiple privacy contexts.** Its records are linked through `messages.audio_asset_id`, `course_feed_posts.audio_asset_id`, `assignment_submissions.audio_asset_id` / `tutor_audio_asset_id`, and classroom metadata. A single asset-type rule cannot safely authorize all of these.
3. **The feed API is not access-scoped.** `GET /api/feed/posts` uses a service-role client, requires no signed-in user, and returns `audio_assets(*)` for published posts. Course-specific posts therefore need explicit course-entitlement filtering before this endpoint can safely expose them.
4. **Native message RLS predicates are malformed.** The inspected `messages` policy compares `cp.conversation_id` to itself instead of the outer message's conversation ID. The `conversations` policy compares `cp.conversation_id` to `cp.id`. The `conversation_participants` table has RLS enabled but no policies in the inspected database. These policies do not provide a reliable membership boundary.
5. **The server message API bypasses RLS by design.** `getConversationMessages` and `sendChatMessage` use a server/service client. Before this branch, they did not independently prove that the requester belonged to the requested conversation, so a signed-in user could attempt to read or send against another conversation ID.

A code-only mitigation is now committed: the communication store verifies native conversation membership before reading or sending; if a conversation exists in the legacy `exam_config` fallback, it verifies that fallback participant list instead. The messages API returns HTTP 403 for a non-participant. This does not repair the underlying database policies or the feed API.

### Required database and API remediation — not applied

- Replace the broad `audio_assets` policy with parent-resource-aware authorization for class attendance/admission, course feed access, assignment submitter/tutor access, and conversation participants.
- Add narrowly scoped policies or security-definer membership helpers for `conversation_participants`, `conversations`, and `messages`; correct all outer-row correlation predicates.
- Add authenticated access checks to course-specific feed reads and filter course-linked posts by enrollment/plan entitlement before returning nested audio.
- Avoid returning raw base64 `file_url` values from general list APIs; return an authorized playback endpoint or short-lived signed URL only after parent-resource authorization.
- Test anonymous, unrelated learner, enrolled learner, assignment submitter, assignment tutor, message participant, non-participant, classroom attendee, and platform-admin cases.

No database policies, tables, or data were changed. The staging RLS findings must be reconciled with the live database before any migration is applied.


### Follow-up code-only mitigations

- `communicationStore` now verifies that the requester is a participant in the native conversation before reading or sending messages. Legacy `exam_config` conversations are allowed only when their participant list includes the requester.
- Message audio attachments must reference an asset uploaded by the sending user and use an allowed voice-note asset type. A caller cannot attach another user's audio asset by guessing its ID.
- The message API returns HTTP 403 for non-participants.
- The audio upload response no longer returns the full `file_url` payload to the uploader; the client only needs the new asset ID and metadata.
- `GET /api/feed/posts` now filters course-linked posts to the course tutor, platform admins, active course enrollees (respecting enrollment expiry), or users with an active subscription. Subject-only posts remain available to the existing public subject-feed experience. The subject feed page now forwards its session token when available.

These changes are code-level mitigations only. They do not replace the required RLS policy migration for direct table access, and the feed's subscription check still follows the existing broad active-subscription model pending a dedicated entitlement review.
