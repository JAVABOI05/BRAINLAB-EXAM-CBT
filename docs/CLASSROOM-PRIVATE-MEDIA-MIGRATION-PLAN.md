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
