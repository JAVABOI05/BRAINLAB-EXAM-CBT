# BRAINLAB PROFESSIONAL LIVEBOARD
## STAGE 1: EXISTING SYSTEM INSPECTION & ARCHITECTURAL GAP ANALYSIS REPORT

- **Project:** BrainLab Academy — Professional Liveboard & Teaching Studio Upgrade
- **Repository:** `BRAINLAB-EXAM-CBT`
- **Document Status:** Stage 1 Deliverable — Complete System Audit & Architectural Assessment
- **Date:** November 2026
- **Auditor:** DeepMind / Antigravity Agent Engineering Team

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE

This document constitutes the comprehensive **Stage 1 Inspection & Architectural Gap Analysis** for upgrading the existing BrainLab Academy Live Classroom Whiteboard into an internationally competitive, professional-grade **Teaching Studio & Collaborative Liveboard**.

In accordance with the **Master Upgrade Blueprint**, this inspection was conducted under strict **read-only conditions**:
- **No application code was altered.**
- **No database schemas, tables, or storage policies were modified.**
- **No production or staging configurations were changed.**
- **No LiveKit classroom video/audio communication pipelines were disturbed.**

The audit comprehensively reviews the current whiteboard component (`app/components/SmartWhiteboard.tsx`), the live classroom integration (`app/classroom/[id]/page.tsx`), the standalone recording studio (`app/classroom/studio/page.tsx`), the material importer (`app/components/ClassroomMaterialImporter.tsx`), the video library (`app/classroom/library/page.tsx`), API routes, database schemas, and storage infrastructure.

---

## 2. EXISTING ARCHITECTURE AUDIT

### 2.1 Whiteboard Rendering Engine (`app/components/SmartWhiteboard.tsx`)
- **Technology:** Custom HTML5 2D Canvas rendering loop using raw `CanvasRenderingContext2D`.
- **Canvas Lifecycle:**
  - On mount and on window resize, dimensions are synchronized to the container's `clientWidth` and `clientHeight` with a high-DPI scaling factor (`window.devicePixelRatio || 1`).
  - Redraw is executed iteratively over the entire `elements` array on every single `pointermove` event.
- **Stroke & Vector Element Model:**
  ```typescript
  export interface WhiteboardElement {
    id: string;
    type: "pen" | "highlighter" | "line" | "arrow" | "rect" | "circle" | "text" | "laser";
    color: string;
    width: number;
    startX: number;
    startY: number;
    endX?: number;
    endY?: number;
    points?: { x: number; y: number }[]; // For pen & highlighter
    text?: string;
    fontSize?: number;
  }
  ```
- **Object Manipulation Gap:**
  - Strokes are rendered as flat pixel burns to the canvas bitmap.
  - **There is no object selection model.** Once a stroke, shape, or text element is placed, it cannot be clicked, moved, resized, rotated, grouped, or deleted individually.
  - The only modification tools are global `Undo` (removes the latest element), global `Clear` (wipes the array), or `Eraser` (which creates stroke segments in a masking color rather than true vector subtraction or object removal).

### 2.2 Page & Document Management Architecture
- **State Structure:**
  ```typescript
  export interface WhiteboardPage {
    id: string;
    title: string;
    aspectRatio?: BoardAspectRatio; // "16 / 9" | "4 / 3" | "9 / 16" | "free"
    backgroundMode?: BoardBackgroundMode; // "blackboard" | "whiteboard" | "grid" | "lines"
    backgroundImage?: string;
    elements: WhiteboardElement[];
  }
  ```
- **Page Switching:**
  - Pages are maintained as an in-memory array (`pages`) synchronized via callback `onPagesChange`.
  - Switching pages swaps `elements` to the selected page index and triggers a complete canvas clear and redraw.
- **Thumbnails Drawer:**
  - A slide-out panel on the left displays miniature representation boxes for each page.
  - Thumbnails do not render dynamic canvas snapshots; they render static placeholder labels (`Slide Asset` or `Blackboard`).

### 2.3 Real-Time Synchronization Architecture
- **Transport Mechanism:**
  - Uses **Supabase Realtime Broadcast Channels** (`whiteboard_draw`, `whiteboard_laser`, `whiteboard_toggle_student_draw`) rather than LiveKit Data Channels.
  - During a stroke, `pointermove` broadcasts raw coordinate packets across Supabase Realtime websocket channels:
    ```typescript
    supabase.channel(`classroom_${classId}`).send({
      type: "broadcast",
      event: "whiteboard_draw",
      payload: { element: currentElement, isLivePreview: true },
    });
    ```
- **Synchronization Bottlenecks:**
  - High packet frequency on Supabase websocket under multi-user drawing causes latency spikes and potential dropped frames.
  - No Operational Transformation (OT) or Conflict-Free Replicated Data Type (CRDT / Yjs) is present. If two participants draw simultaneously, order is non-deterministic.
  - Room state reconnection: A student joining late receives page element state only if the tutor broadcasts state or if it is fetched from the database, leading to out-of-sync canvases if a student reconnects mid-session.

### 2.4 Standalone Lesson Studio & Recording Engine (`app/classroom/studio/page.tsx`)
- **Recording Mechanism:**
  - Client-side browser `MediaRecorder` API.
  - An offscreen composite canvas (`1920x1080` @ 30 FPS) is created. A `requestAnimationFrame` loop continuously paints:
    1. The main whiteboard canvas via `ctx.drawImage(sourceCanvas, 0, 0, 1920, 1080)`.
    2. The Picture-in-Picture (PiP) tutor webcam stream clipped to a rounded rectangle in the configured corner.
    3. The tutor's microphone audio track attached via `videoStream.addTrack(audioTrack)`.
- **Codec & Container Support:**
  - Prioritizes `video/mp4;codecs=avc1` if supported, falling back to `video/webm;codecs=vp9,opus`.
  - Chunks recorded at 1000ms timeslices.
- **Cloud Storage & Database Ingestion:**
  - Resulting blob is uploaded directly to Supabase Storage bucket `live-class-recordings`.
  - Metadata record inserted into database table `class_recordings`.

---

## 3. FEATURE-BY-FEATURE FUNCTIONALITY ASSESSMENT

Each visible control and system capability across the Whiteboard, Studio, and Live Classroom was audited and categorized into one of five states:
1. `WORKING`: Operates reliably and meets production requirements.
2. `PARTIALLY WORKING`: Functional in basic scenarios but lacks advanced capabilities or exhibits edge-case bugs.
3. `NONFUNCTIONAL`: Visible in UI or API but broken, throwing errors, or failing to execute.
4. `SIMULATED`: Cosmetic/mock control that produces an artificial toast or mock response without real engine backing.
5. `MISSING`: Stated in the Master Blueprint as essential for a world-class teaching studio, but completely absent.

| Feature / Control | Current Status | Detailed Audit Findings & Gaps |
|---|:---:|---|
| **Freehand Pen Tool** | `PARTIALLY WORKING` | Smooth quadratic bezier interpolation exists, but strokes cannot be selected, transformed, or individually erased. Palm rejection and stylus pressure sensitivity are absent. |
| **Marker / Translucent Highlighter** | `PARTIALLY WORKING` | Uses `ctx.globalAlpha = 0.35`. Multiple overlapping passes over the same stroke darken exponentially rather than maintaining a clean uniform highlighter sheen. |
| **Laser Pointer Tool (✍️)** | `WORKING` | Displays animated laser cursor with fading glowing particles and broadcasts live coordinates to connected students. |
| **Geometric Straight Line** | `PARTIALLY WORKING` | Renders 2-point line with live preview. Lacks angle snapping (Shift key for 0°, 45°, 90°), length readout, or post-draw editing. |
| **Vector Arrow** | `PARTIALLY WORKING` | Draws arrow with arrowhead calculation. Lacks double-headed arrows, curved arrows, or connected diagram anchor points. |
| **Rectangle Tool** | `PARTIALLY WORKING` | Draws hollow or filled box. Lacks corner radius control, aspect lock (square), or editable fill opacity. |
| **Circle / Ellipse Tool** | `PARTIALLY WORKING` | Draws ellipse. Lacks perfect circle lock (Shift key), sector/arc drawing, or diameter indicators. |
| **Text Insertion Tool** | `PARTIALLY WORKING` | Modal opens text area; places rasterized text on canvas. Text is not editable inline on the canvas; cannot be edited after placement. |
| **Formula & Math Input** | `PARTIALLY WORKING` | Provides static Unicode symbol buttons (`π, θ, α, √, ∫...`). Lacks MathLive / KaTeX LaTeX equation editor, fraction rendering, matrix layout, or dynamic formula typesetting. |
| **Interactive Geometry Tools (Ruler, Protractor, Compass, Set Squares)** | `MISSING` | Completely missing. Tutors cannot place a movable ruler to measure or draw straight lines along an edge, nor place an interactive protractor to measure angles on screen. |
| **Coordinate Systems & Graphs** | `PARTIALLY WORKING` | Background grid exists, but interactive Cartesian coordinate axes, tick labels, plotted function curves, and logarithmic grids are missing. |
| **Science & Diagram Toolsets** | `MISSING` | Missing circuit components (resistors, batteries, ground), chemical apparatus (beakers, flasks), biological cell templates, and optics ray diagram generators. |
| **Object Selection Tool (Select, Move, Scale, Rotate, Group)** | `MISSING` | **Critical Architectural Gap.** Users cannot click to select strokes or shapes, marquee select multiple items, drag, scale handles, rotate, group, lock, or adjust Z-index. |
| **Eraser Tool** | `PARTIALLY WORKING` | Currently paints background-colored strokes over drawings or provides global clear. Lacks targeted stroke eraser (erasing an entire stroke by crossing it) and partial vector split. |
| **Undo / Redo** | `WORKING` | Stack-based undo/redo operating on the `elements` array. Redo stack is properly cleared on new stroke creation. |
| **Clear Canvas** | `WORKING` | Prompts user and clears current page elements array. |
| **Page Aspect Ratio Selector** | `WORKING` | Supports `free`, `16 / 9`, `4 / 3`, and `9 / 16` with visual container clamping and letterboxing. |
| **Board Background Surface Selector** | `WORKING` | Supports Blackboard (`#070d1e`), Whiteboard (`#ffffff`), Grid, and Ruled Lines. |
| **Zoom & Pan Controls** | `PARTIALLY WORKING` | Zoom scale (50% to 250%) works via CSS scale transform on container. Canvas infinite pan (hand tool, spacebar drag, two-finger touchpad pan) is missing. |
| **Page Thumbnail Drawer** | `PARTIALLY WORKING` | Drawer opens, lists pages, allows reordering, duplicating, renaming, and deleting. However, page thumbnails are static color boxes, not live canvas preview renders. |
| **PDF Multi-Page Presentation Import** | `MISSING` | Material Importer parses CSV and slide images, but does not parse multi-page PDF documents into vector/slide pages using PDF.js. |
| **High-Resolution PNG Note Export** | `WORKING` | Generates full-resolution data URL and triggers browser download with lecture title and timestamp. |
| **Multi-Page PDF Document Export** | `MISSING` | Users can only save the single active page as a PNG image. Exporting all whiteboard pages as a bundled, high-resolution PDF lecture document is missing. |
| **Share Whiteboard to Chat** | `WORKING` | Generates canvas snapshot and sends image attachment into the live classroom chat feed. |
| **Picture-in-Picture Camera in Studio** | `WORKING` | Draggable/corner-selectable camera overlay with mirrored video, rounded borders, and offscreen canvas compositing. |
| **Standalone Lesson Studio Recording** | `WORKING` | Complete client-side composite recording at 1080p 30fps with mic audio, pause/resume, timer, and preview trimmer. |
| **Server-Side Video Egress / LiveKit Recording** | `MISSING` | During live multi-participant classes, recording relies on individual tutor screen capture or client recorder rather than server-side LiveKit Egress compositing. |
| **Watermark Engine** | `PARTIALLY WORKING` | Hardcoded `BRAINLAB ACADEMY` text drawn at canvas bottom-right. Controlled via admin toggle. Lacks dynamic tutor/student ID stamping, official SVG logo compositing, and server-side video/PDF export watermarking. |
| **Granular Student Drawing Permissions** | `PARTIALLY WORKING` | Live classroom has global toggle `whiteboard_toggle_student_draw`. Individual student permission grants (e.g., granting draw access only to student A while students B & C remain read-only) are missing. |

---

## 4. DATABASE & STORAGE INFRASTRUCTURE AUDIT

### 4.1 Relevant Database Tables & Columns

```
========================================================================================
TABLE: classroom_lessons
----------------------------------------------------------------------------------------
Column              Type                     Nullable    Default / Description
----------------------------------------------------------------------------------------
id                  UUID                     NO          gen_random_uuid() [PK]
tutor_id            UUID                     NO          References auth.users(id)
title               VARCHAR(160)             NO          Lesson title
subject             VARCHAR(120)             YES         Subject classification
description         TEXT                     YES         Detailed lesson description
status              VARCHAR(20)              NO          'draft' | 'ready' | 'archived'
pages               JSONB                    NO          Array of WhiteboardPage objects
active_page_index   INT                      NO          0
attachments         JSONB                    YES         Array of LessonAttachment objects
last_opened_at      TIMESTAMPTZ              YES         now()
created_at          TIMESTAMPTZ              NO          now()
updated_at          TIMESTAMPTZ              NO          now()
========================================================================================

========================================================================================
TABLE: class_recordings
----------------------------------------------------------------------------------------
Column                 Type                  Nullable    Default / Description
----------------------------------------------------------------------------------------
id                     UUID                  NO          gen_random_uuid() [PK]
class_id               UUID                  YES         References live_classes(id)
lesson_id              UUID                  YES         References classroom_lessons(id)
title                  VARCHAR(200)          NO          Recording title
subject                VARCHAR(120)          YES         Subject
topic                  VARCHAR(160)          YES         Topic
description            TEXT                  YES         Summary
video_url              TEXT                  NO          Direct signed or public URL
storage_path           TEXT                  YES         Supabase storage path
duration_seconds       INT                   NO          0
file_size_bytes        BIGINT                NO          0
recording_source       VARCHAR(50)           NO          'lesson_studio' | 'live_classroom'
is_visible_to_students BOOLEAN               NO          false
processing_status      VARCHAR(30)           NO          'ready' | 'processing' | 'failed'
resolution             VARCHAR(20)           YES         '1080p'
aspect_ratio           VARCHAR(20)           YES         '16 / 9'
created_by             UUID                  NO          References auth.users(id)
created_at             TIMESTAMPTZ           NO          now()
updated_at             TIMESTAMPTZ           NO          now()
========================================================================================

========================================================================================
TABLE: live_classes
----------------------------------------------------------------------------------------
Column                 Type                  Nullable    Default / Description
----------------------------------------------------------------------------------------
id                     UUID                  NO          gen_random_uuid() [PK]
title                  VARCHAR(200)          NO          Class title
subject                VARCHAR(100)          NO          Subject
tutor_id               UUID                  NO          References auth.users(id)
status                 VARCHAR(20)           NO          'scheduled' | 'live' | 'ended'
scheduled_at           TIMESTAMPTZ           NO          Scheduled start
room_name              VARCHAR(100)          NO          LiveKit room name
settings               JSONB                 YES         Live classroom configuration
========================================================================================

========================================================================================
TABLE: platform_settings
----------------------------------------------------------------------------------------
Column                 Type                  Nullable    Default / Description
----------------------------------------------------------------------------------------
key                    VARCHAR(100)          NO          [PK] e.g. 'whiteboard_watermark_enabled'
value                  JSONB                 NO          e.g. true / false
updated_by             UUID                  YES         References auth.users(id)
updated_at             TIMESTAMPTZ           NO          now()
========================================================================================
```

### 4.2 Storage Buckets Inspected
1. `live-class-recordings`:
   - Contains lesson studio recordings and post-class recorded video clips.
   - Public access: Restricted. Accessed via signed URLs generated by Supabase storage SDK (`createSignedUrl(filename, 31536000)`).
2. `classroom-materials`:
   - Contains presentation slides, handouts, and document attachments (.pdf, .pptx, images).
   - RLS policies restrict write operations to authenticated tutors and super admins.

---

## 5. WATERMARK IMPLEMENTATION AUDIT

### 5.1 Current Mechanism
- Located in `app/components/SmartWhiteboard.tsx`:
  ```typescript
  if (watermarkEnabled) {
    ctx.save();
    ctx.fillStyle = isLight ? "rgba(11, 21, 54, 0.15)" : "rgba(255, 255, 255, 0.12)";
    ctx.font = "900 13px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("BRAINLAB ACADEMY", width - 24, height - 16);
    ctx.restore();
  }
  ```
- Toggle management:
  - Super admins can toggle the watermark via `POST /api/admin/whiteboard-watermark`, which updates `platform_settings.whiteboard_watermark_enabled`.
  - Cached and read on the server via `getPlatformConfig<boolean>("whiteboard_watermark_enabled", true)`.

### 5.2 Vulnerabilities & Architectural Gaps
1. **Client-Side Bypass Risk:** Because watermarking is rendered directly inside the browser's 2D canvas context, anyone with browser DevTools can inspect or modify the render function or extract canvas data prior to the watermark call.
2. **Missing Dynamic Identification:** The watermark displays static text ("BRAINLAB ACADEMY") rather than tamper-evident dynamic identifiers (e.g., student name, matriculation ID, session UUID, or timestamp). If a student screenshots confidential exam material or proprietary lecture notes, the source cannot be traced.
3. **No Watermarking on Exported PDFs:** When multi-page lecture notes are exported, there is no server-side pipeline to ensure vector or raster watermarking on each page.
4. **Recording Studio Compositing:** The studio recording composites the canvas as a raw pixel feed. If the client toggle is bypassed, the recorded video will be saved without the watermark.

---

## 6. SECURITY & PERMISSION WEAKNESSES

1. **Supabase Realtime Broadcast Forgery:**
   - Supabase Realtime broadcast channels currently do not enforce per-event server authorization. A student with browser console access could dispatch fake `whiteboard_draw` or `whiteboard_laser` events into the channel.
   - *Recommendation:* Relay whiteboard events either through LiveKit Data Channels (which bind messages to authenticated participant identities) or validate role permissions on the server.
2. **Granular Drawing Permissions:**
   - Currently, `whiteboard_toggle_student_draw` is a single binary switch affecting the entire room. If enabled, any student in the room can draw on the canvas, leading to potential griefing during large lecture classes.
   - *Recommendation:* Implement individual tutor-controlled drawing grants (`student_permissions: { [userId]: boolean }`).
3. **Recording Storage Access:**
   - Video recording files in Supabase Storage currently utilize 1-year signed URLs stored directly in the `class_recordings.video_url` column.
   - *Recommendation:* Return short-lived signed URLs (15–60 minutes) dynamically generated on request through `GET /api/classroom/recordings/[id]/playback`, preventing unauthorized public distribution of download URLs.

---

## 7. PERFORMANCE & MOBILE LIMITATIONS

1. **Canvas Redraw Overhead:**
   - Every single pointer movement redraws every stroke and shape on the canvas from index 0 to `elements.length - 1`. For complex lecture sessions containing hundreds or thousands of strokes, frame rates degrade noticeably on lower-tier hardware.
2. **Touch & Stylus Palm Rejection:**
   - Mobile and tablet users (iPad, Galaxy Tab, Surface) frequently trigger accidental lines with their palms because pointer events do not differentiate between `pointerType === "pen"` (stylus) and `pointerType === "touch"` (palm/finger).
3. **Fixed Toolbars on Small Screens:**
   - The top toolbar contains over 15 buttons. On mobile viewport widths (< 640px), buttons wrap or become truncated, obstructing the canvas drawing area.
   - *Recommendation:* Implement an adaptive, collapsible docking toolbar or radial tool menu for mobile devices.

---

## 8. RECOMMENDED TECHNICAL ARCHITECTURE FOR UPGRADE

### 8.1 Whiteboard Rendering Engine Evaluation

| Engine Option | Pros | Cons | Recommendation |
|---|---|---|:---:|
| **Option A: Refactor Native 2D Canvas** | Zero external dependencies; complete control over bundle size; easy custom watermarking. | Re-inventing selection bounding boxes, handle transforms, rotation math, and hit detection requires thousands of lines of fragile code. | Not Recommended |
| **Option B: Fabric.js (v6)** | Industry standard for object-oriented canvas; native support for selection, scaling, rotation, grouping, SVG serialization, and z-ordering. | Large bundle footprint; React reconciliation requires careful imperative wrapper. | **Strong Candidate for Vector Tools** |
| **Option C: Konva.js / react-konva** | High performance; declarative React integration; excellent multi-layer canvas support (e.g. background layer, drawing layer, interactive UI layer, watermark overlay layer). | Additional package footprint; equation rendering requires HTML overlays. | **Recommended for Layered Studio Engine** |
| **Option D: Hybrid Custom Vector Engine + Konva Layering** | Preserves existing high-speed freehand strokes while utilizing Konva transformer handles for shapes, text boxes, and geometry tools. | Requires clean abstraction between stroke paths and transformed objects. | **Optimal Architectural Balance** |

### 8.2 Mathematical & Scientific Notation Engine
- **MathLive (`mathlive`):** Provides a visual, interactive mathematical formula keyboard and LaTeX editor. Students and tutors can type algebra, fractions, square roots, and integrals cleanly.
- **KaTeX (`katex`):** High-speed server and client LaTeX rendering for static equation presentation on board cards.

### 8.3 State Synchronization & Real-Time Collaboration
- **LiveKit Data Channel (Reliable & Lossy Streams):**
  - Use **Lossy Stream** for real-time laser pointer coordinates (`✍️`) to maximize fluidity without TCP backpressure.
  - Use **Reliable Stream** for finalized vector elements, page additions, and permission toggles.
- **Room State Persistence:**
  - Active page state auto-saved every 3 seconds to `classroom_lessons.pages` via debounced JSON updates.

---

## 9. MIGRATION RISKS & MITIGATION STRATEGY

| Identified Risk | Severity | Technical Mitigation Strategy |
|---|:---:|---|
| **Breaking Existing Saved Lessons** | High | The new whiteboard data schema must be 100% backward-compatible. Legacy `elements` arrays with simple coordinates must automatically normalize into the new object model on load. |
| **LiveKit Call Interruption** | Critical | The whiteboard component operates in an isolated React sub-tree from LiveKit audio/video tracks. Do not alter `LiveKitRoom`, `RoomAudioRenderer`, or audio publishing hooks in `app/classroom/[id]/page.tsx`. |
| **CBT Examination Impact** | Critical | CBT questions and examinations are completely isolated from Classroom Studio. Verify that no shared database migrations touch `cbt_exams`, `questions`, or `exam_sessions`. |
| **High Memory Usage on Long Lessons** | Medium | Implement offscreen canvas caching for inactive pages and thumbnail rendering, releasing offscreen canvas memory when page count exceeds 50. |

---

## 10. PROPOSED IMPLEMENTATION STAGES (STAGES 2–10)

Following approval of this inspection report, the upgrade will proceed systematically through the stages established in the Master Blueprint:

- **Stage 2: Core Object-Oriented Canvas Architecture & Selection Engine**
  - Implement object-level selection, bounding boxes, corner resize handles, rotation, movement, multi-select, and Z-index ordering.
- **Stage 3: Advanced Educational Drawing & Geometry Toolset**
  - Interactive digital ruler, 180°/360° protractor, compass, Cartesian coordinate graphing grid, and stroke-crossing eraser.
- **Stage 4: Mathematical Formula & Scientific Diagram Engine**
  - Integration of interactive MathLive LaTeX equation editor, chemical apparatus templates, and physics diagram helpers.
- **Stage 5: Multi-Page Document Architecture & PDF Workflow**
  - Multi-page PDF import using PDF.js (converting pages into vector/slide backgrounds), dynamic visual thumbnail drawer, and high-resolution multi-page PDF lecture notes export.
- **Stage 6: Collaborative Liveboard & Granular Permissions**
  - Migration of real-time events to LiveKit Data Channels, per-student drawing permission matrix, hand raise integration, and live cursor indicators.
- **Stage 7: Professional Teaching Studio & Recording Upgrades**
  - Multi-resolution recording (720p/1080p/4K), PiP webcam repositioning with round/square frames, audio level meters, recording pause/resume, and post-lecture video trimmer.
- **Stage 8: Enterprise Watermark & Anti-Tamper Engine**
  - Dynamic user-identity watermarking (student name + ID + timestamp), server-side watermarking for video exports and PDF downloads, and admin branding controls.
- **Stage 9: Responsive UI/UX & Mobile / Tablet Optimization**
  - Collapsible studio dock, palm rejection for stylus inputs (`pointerType === "pen"`), dark/light mode polish, and touch gesture navigation.
- **Stage 10: End-to-End Staging Verification & Performance Benchmarking**
  - Automated tests, load testing with 50+ concurrent whiteboard sync packets, multi-device testing (desktop, iPad, Android tablet), and documentation finalization.

---

## 11. ESTIMATED IMPLEMENTATION EFFORT

| Stage | Scope of Work | Estimated Hours |
|---|---|:---:|
| **Stage 2** | Selection Engine, Transformer Handles, Object Model | 12 - 16 hrs |
| **Stage 3** | Interactive Geometry Tools, Graphing Grid, Smart Eraser | 10 - 14 hrs |
| **Stage 4** | MathLive / KaTeX Formula Editor & Scientific Shapes | 8 - 12 hrs |
| **Stage 5** | PDF Import / Export, Visual Thumbnail Generator | 10 - 14 hrs |
| **Stage 6** | LiveKit Data Channel Sync & Granular Permissions | 8 - 12 hrs |
| **Stage 7** | Studio Recording Polish, PiP Controls, Video Processing | 10 - 14 hrs |
| **Stage 8** | Enterprise Dynamic Watermarking & Anti-Tamper | 6 - 8 hrs |
| **Stage 9** | Mobile UI/UX, Stylus Palm Rejection & Responsive Dock | 8 - 10 hrs |
| **Stage 10** | Staging Verification, Benchmarking & Acceptance Testing | 8 - 10 hrs |
| **TOTAL** | **Full Master Blueprint Execution** | **80 - 110 hrs** |

---

## 12. TESTING & ACCEPTANCE CRITERIA

Before any upgraded module is promoted to production, it must fulfill the following acceptance criteria on staging:
1. **Zero Data Loss:** All existing lesson drafts and whiteboard drawings in `classroom_lessons` load without visual errors or missing coordinates.
2. **Interactive Selection:** Drawn shapes and text can be clicked, resized, moved, and rotated smoothly at 60 FPS.
3. **Mathematical Precision:** Equations rendered via the formula editor display crisp KaTeX vector typography without raster pixelation.
4. **Reliable PDF Import:** A 20-page lecture slide deck in PDF format imports into 20 discrete whiteboard pages in under 5 seconds.
5. **Multi-Page Export:** Exporting a multi-page session generates a single clean PDF document with uniform page dimensions and branded watermarks.
6. **Sub-50ms Synchronization:** Whiteboard drawing events broadcast to student participants over LiveKit Data Channels with under 50ms perceptible latency.
7. **Tamper-Evident Security:** Watermark remains intact across canvas exports, PDF lecture notes, and recorded MP4 videos.
8. **No CBT Regression:** Verification that all CBT test sessions, questions, and timing mechanisms remain 100% unaffected.

---

> [!IMPORTANT]
> **STAGE 1 MANDATORY STOP ACTIVE:**
> In strict compliance with the **Master Upgrade Blueprint and Implementation Directive**, Stage 1 Existing System Inspection is now complete. 
> 
> **No code changes or database migrations have been executed.**
> Awaiting explicit user instruction and authorization before proceeding to **Stage 2: Core Object-Oriented Canvas Architecture & Selection Engine**.
