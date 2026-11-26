/* eslint react/no-unescaped-entities: "off", @typescript-eslint/no-explicit-any: "off" */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { SmartWhiteboard, SmartWhiteboardHandle, type WhiteboardPage } from "@/app/components/SmartWhiteboard";
import ClassroomMaterialImporter, { type LessonAttachment } from "@/app/components/ClassroomMaterialImporter";
import PictureInPictureCamera, { type PipCorner, type PipSize } from "@/app/components/classroom/media/PictureInPictureCamera";
import RecordingCountdown from "@/app/components/classroom/media/RecordingCountdown";
import VideoPreviewEditor from "@/app/components/classroom/media/VideoPreviewEditor";
import { toast } from "@/app/lib/toast";
import { INITIAL_STEM_RESOURCES } from "@/app/lib/stem/seedData";
import {
  QuadraticGraphAdapter,
  ProjectileMotionAdapter,
  OhmsLawCircuitAdapter,
  AcidBaseTitrationAdapter,
  GeneticsPunnettAdapter,
  LogicGatesAdapter,
} from "@/app/components/classroom/whiteboard/stemAdapter";
import { CURATED_MOLECULES } from "@/app/components/stem/Molecular3DViewer";
import { generateMoleculeSvgDataUrl } from "@/app/components/stem/molecularSvgExport";

type Lesson = {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  status: "draft" | "ready" | "archived";
  updated_at: string;
  pages?: unknown[];
  active_page_index?: number;
  attachments?: LessonAttachment[];
};

type PageData = WhiteboardPage & { backgroundMode?: string };

export default function ClassroomStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id");
  const importStem = searchParams.get("importStem");

  // Authentication & Lesson State
  const [token, setToken] = useState("");
  const [user, setUser] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(requestedId);
  const [title, setTitle] = useState("Untitled lesson");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "ready">("draft");
  const [pages, setPages] = useState<PageData[]>([
    { id: "page-1", title: "Page 1", aspectRatio: "free", backgroundMode: "blackboard", elements: [] },
  ]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [showImporter, setShowImporter] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading Classroom Studio…");
  const [showStudioBoard, setShowStudioBoard] = useState(false);

  // Whiteboard ref
  const whiteboardRef = useRef<SmartWhiteboardHandle | null>(null);

  // --------------------------------------------------------------------------
  // INDEPENDENT MEDIA & RECORDING STATE (Browser-native, NO LiveKit)
  // --------------------------------------------------------------------------
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [pipCorner, setPipCorner] = useState<PipCorner>("bottom_right");
  const [pipSize, setPipSize] = useState<PipSize>("medium");

  // Media streams
  const [userMediaStream, setUserMediaStream] = useState<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);

  // Recording State Machine: idle -> countdown -> recording -> paused -> preview
  const [recordingState, setRecordingState] = useState<
    "idle" | "countdown" | "recording" | "paused" | "preview"
  >("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeAnimRef = useRef<number | null>(null);

  // Finished video preview
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState("video/webm");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBoardPagesChange = useCallback((nextPages: WhiteboardPage[], nextIndex: number) => {
    setPages(nextPages as PageData[]);
    setActivePageIndex(nextIndex);
  }, []);

  const authHeaders = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  // Load saved lessons
  const loadLessons = useCallback(async (authToken: string) => {
    const response = await fetch("/api/classroom/studio", {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load saved lessons.");
    setLessons(data.lessons || []);
  }, []);

  const loadOne = useCallback(async (id: string, authToken: string) => {
    const response = await fetch(`/api/classroom/studio?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to open lesson.");
    const lesson = data.lesson as Lesson;
    setLessonId(lesson.id);
    setTitle(lesson.title);
    setSubject(lesson.subject || "");
    setDescription(lesson.description || "");
    setStatus(lesson.status === "ready" ? "ready" : "draft");
    setPages(
      Array.isArray(lesson.pages) && lesson.pages.length
        ? (lesson.pages as PageData[])
        : [{ id: "page-1", title: "Page 1", aspectRatio: "free", backgroundMode: "blackboard", elements: [] }]
    );
    setActivePageIndex(
      Math.min(lesson.active_page_index || 0, Math.max(0, (lesson.pages as unknown[] | undefined)?.length || 1) - 1)
    );
    setAttachments(Array.isArray(lesson.attachments) ? lesson.attachments : []);
    setShowStudioBoard(true);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/account?redirect=/classroom/studio");
        return;
      }
      if (!alive) return;
      setToken(session.access_token);
      setUser(session.user);
      try {
        await loadLessons(session.access_token);
        if (requestedId) await loadOne(requestedId, session.access_token);
        else setMessage("Create a lesson or continue one of your saved drafts.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load Classroom Studio.");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, requestedId, loadLessons, loadOne]);

  // Handle STEM Studio Import (?importStem=slug)
  const importedStemRef = useRef(false);
  useEffect(() => {
    if (!importStem || importedStemRef.current || busy) return;
    const resource = INITIAL_STEM_RESOURCES.find((r) => r.slug === importStem);
    if (!resource) return;

    importedStemRef.current = true;
    let svgDataUrl = "";
    if (importStem === "quadratic-graph-explorer") {
      const ad = new QuadraticGraphAdapter();
      ad.init();
      svgDataUrl = ad.exportSvg(720, 480, "dark");
    } else if (importStem === "projectile-motion-simulator") {
      const ad = new ProjectileMotionAdapter();
      ad.init();
      svgDataUrl = ad.exportSvg(720, 480, "dark");
    } else if (importStem === "ohms-law-dc-circuit") {
      const ad = new OhmsLawCircuitAdapter();
      ad.init();
      svgDataUrl = ad.exportSvg(720, 480, "dark");
    } else if (importStem === "acid-base-titration-curve") {
      const ad = new AcidBaseTitrationAdapter();
      ad.init();
      svgDataUrl = ad.exportSvg(720, 480, "dark");
    } else if (importStem === "genetics-punnett-square-lab") {
      const ad = new GeneticsPunnettAdapter();
      ad.init();
      svgDataUrl = ad.exportSvg(720, 480, "dark");
    } else if (importStem === "molecular-3d-explorer") {
      svgDataUrl = generateMoleculeSvgDataUrl(CURATED_MOLECULES[0]);
    }

    if (svgDataUrl) {
      const stemElement = {
        id: `stem-elem-${Date.now()}`,
        type: "image" as const,
        startX: 600,
        startY: 300,
        endX: 1320,
        endY: 780,
        width: 720,
        height: 480,
        imageUrl: svgDataUrl,
        color: "#ffffff",
      };

      const stemPage: PageData = {
        id: `stem-page-${Date.now()}`,
        title: `[STEM] ${resource.title}`,
        aspectRatio: "16 / 9",
        backgroundMode: "blackboard",
        elements: [stemElement],
      };

      setPages((prev) => [...prev, stemPage]);
      setActivePageIndex((prev) => prev + 1);
      setTitle((prev) => (prev === "Untitled lesson" ? `${resource.title} - Prep Lesson` : prev));
      if (resource.subject?.name) setSubject(resource.subject.name);
      if (resource.summary) setDescription(resource.summary);
      toast.success(`Imported ${resource.title} into Prep Studio lesson deck!`);
    }
  }, [importStem, busy]);

  // Autosave Lesson Draft
  const saveLesson = useCallback(
    async (nextStatus: "draft" | "ready" = status) => {
      if (!token) return null;
      setSaving(true);
      try {
        const response = await fetch("/api/classroom/studio", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            id: lessonId,
            title,
            subject,
            description,
            status: nextStatus,
            pages,
            active_page_index: activePageIndex,
            attachments,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Save failed.");
        const lesson = data.lesson as Lesson;
        setLessonId(lesson.id);
        setStatus(nextStatus);
        setLessons((prev) => [lesson, ...prev.filter((i) => i.id !== lesson.id)]);
        toast.success(`Lesson draft saved at ${new Date().toLocaleTimeString()}`);
        return lesson.id;
      } catch (error) {
        console.warn("Cloud save failed, keeping locally:", error);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token, authHeaders, lessonId, title, subject, description, status, pages, activePageIndex, attachments]
  );

  // Autosave timer (debounced)
  useEffect(() => {
    if (!showStudioBoard || !lessonId || !token) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveLesson(status);
    }, 2500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [showStudioBoard, lessonId, token, title, subject, description, pages, activePageIndex, status, attachments, saveLesson]);

  // Create new lesson
  const createLesson = () => {
    setLessonId(null);
    setTitle("Untitled lesson");
    setSubject("");
    setTopic("");
    setDescription("");
    setStatus("draft");
    setPages([{ id: `page-${Date.now()}`, title: "Page 1", aspectRatio: "free", backgroundMode: "blackboard", elements: [] }]);
    setActivePageIndex(0);
    setAttachments([]);
    setShowStudioBoard(true);
  };

  // Duplicate lesson as a reusable template (Stage 5)
  const duplicateAsTemplate = () => {
    setLessonId(null);
    setTitle(`Copy of ${title}`);
    setStatus("draft");
    toast.success("Created new draft copy as a template!");
  };

  // --------------------------------------------------------------------------
  // CAMERA & MICROPHONE PERMISSIONS MANAGEMENT
  // --------------------------------------------------------------------------
  const toggleCamera = async () => {
    if (isCameraEnabled) {
      if (userMediaStream) {
        userMediaStream.getVideoTracks().forEach((track) => track.stop());
      }
      setIsCameraEnabled(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: isMicEnabled,
        });
        setUserMediaStream(stream);
        setIsCameraEnabled(true);
        toast.success("Tutor camera activated in Picture-in-Picture.");
      } catch (err: unknown) {
        toast.error("Camera access denied or unavailable on this device.");
      }
    }
  };

  const toggleMic = async () => {
    if (isMicEnabled) {
      if (userMediaStream) {
        userMediaStream.getAudioTracks().forEach((track) => (track.enabled = false));
      }
      setIsMicEnabled(false);
    } else {
      setIsMicEnabled(true);
      if (userMediaStream) {
        userMediaStream.getAudioTracks().forEach((track) => (track.enabled = true));
      }
    }
  };

  // --------------------------------------------------------------------------
  // COMPOSITE CANVAS RECORDING ENGINE (Whiteboard + PiP Camera + Microphone)
  // --------------------------------------------------------------------------
  const startRecordingFlow = () => {
    if (!whiteboardRef.current) {
      toast.error("Whiteboard is initializing. Please wait a moment.");
      return;
    }
    setRecordingState("countdown");
  };

  const beginActualRecording = async () => {
    try {
      const sourceCanvas = whiteboardRef.current?.getCanvasElement();
      if (!sourceCanvas) {
        toast.error("Could not access whiteboard canvas.");
        setRecordingState("idle");
        return;
      }

      // 1. Create Offscreen Composite Canvas matching target resolution (1920x1080)
      const width = 1920;
      const height = 1080;
      const compCanvas = document.createElement("canvas");
      compCanvas.width = width;
      compCanvas.height = height;
      compositeCanvasRef.current = compCanvas;
      const ctx = compCanvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Could not initialize 2D composite context.");

      // 2. Start Composite Render Loop (30fps)
      let active = true;
      const renderFrame = () => {
        if (!active) return;

        // Clear background
        ctx.fillStyle = "#070d1e";
        ctx.fillRect(0, 0, width, height);

        // A. Draw current Whiteboard Canvas
        if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
          ctx.drawImage(sourceCanvas, 0, 0, width, height);
        }

        // B. Draw Picture-in-Picture Camera if enabled
        if (isCameraEnabled && cameraVideoRef.current && cameraVideoRef.current.readyState >= 2) {
          const pipW = pipSize === "small" ? 360 : pipSize === "medium" ? 480 : 640;
          const pipH = (pipW * 9) / 16;
          let pipX = width - pipW - 40;
          let pipY = height - pipH - 40;

          if (pipCorner === "top_left") {
            pipX = 40;
            pipY = 40;
          } else if (pipCorner === "top_right") {
            pipX = width - pipW - 40;
            pipY = 40;
          } else if (pipCorner === "bottom_left") {
            pipX = 40;
            pipY = height - pipH - 40;
          }

          ctx.save();
          // Rounded PiP clipping
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipW, pipH, 20);
          ctx.clip();

          // Flip horizontally for natural mirror feel
          ctx.translate(pipX + pipW, pipY);
          ctx.scale(-1, 1);
          ctx.drawImage(cameraVideoRef.current, 0, 0, pipW, pipH);
          ctx.restore();

          // PiP Border
          ctx.save();
          ctx.strokeStyle = "#1356E8";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(pipX, pipY, pipW, pipH, 20);
          ctx.stroke();
          ctx.restore();
        }

        compositeAnimRef.current = requestAnimationFrame(renderFrame);
      };

      compositeAnimRef.current = requestAnimationFrame(renderFrame);

      // 3. Composite Video Stream from Canvas
      const videoStream = compCanvas.captureStream(30);

      // 4. Audio Mixing (Microphone audio track)
      const combinedStream = videoStream;
      if (isMicEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioTrack = micStream.getAudioTracks()[0];
          if (audioTrack) {
            videoStream.addTrack(audioTrack);
          }
        } catch (micErr) {
          console.warn("Microphone not attached to recording:", micErr);
        }
      }

      // 5. Codec Detection: MP4 if genuine, otherwise WebM
      let chosenMime = "video/webm;codecs=vp9,opus";
      if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
        chosenMime = "video/mp4;codecs=avc1";
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        chosenMime = "video/mp4";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        chosenMime = "video/webm;codecs=vp9,opus";
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        chosenMime = "video/webm";
      }

      setPreviewMimeType(chosenMime);
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: chosenMime,
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        active = false;
        if (compositeAnimRef.current) cancelAnimationFrame(compositeAnimRef.current);

        const fullBlob = new Blob(recordedChunksRef.current, { type: chosenMime });
        setPreviewBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setPreviewUrl(url);
        setRecordingState("preview");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // 1-second timeslice chunking for reliability

      setRecordingSeconds(0);
      setRecordingState("recording");
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      toast.success("Studio recording started. Teach freely!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start studio recording.");
      setRecordingState("idle");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingState("paused");
      toast.info("Recording paused. Notes and whiteboard remain interactive.");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
      setRecordingState("recording");
      toast.success("Recording resumed.");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Cloud Save from VideoPreviewEditor
  const handleSaveToCloudLibrary = async (meta: {
    duration: number;
    fileSize: number;
    trimmedStart: number;
    trimmedEnd: number;
  }) => {
    if (!previewBlob || !token) throw new Error("No video or authentication found.");

    // Ensure the Studio lesson exists before linking its recording metadata.
    // New drafts may not yet have an ID when the tutor starts recording.
    const savedLessonId = await saveLesson(status);
    if (!savedLessonId) throw new Error("Save the lesson before adding its recording to the library.");

    // 1. Ask the server to verify lesson ownership and mint a one-object
    // upload token. The private bucket intentionally has no broad client INSERT policy.
    const normalizedMimeType = previewMimeType.split(";")[0].trim().toLowerCase();
    const ext = normalizedMimeType.includes("mp4") ? "mp4" : "webm";
    const safeTitle = (title || "Lesson").replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadPrepResponse = await fetch("/api/classroom/studio/recording-upload-url", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        lesson_id: savedLessonId,
        content_type: normalizedMimeType,
        filename: `${safeTitle}.${ext}`,
      }),
    });
    const uploadPrep = await uploadPrepResponse.json();
    if (!uploadPrepResponse.ok || !uploadPrep.token || !uploadPrep.path) {
      throw new Error(uploadPrep.error || "Could not prepare a secure recording upload.");
    }

    const filename = String(uploadPrep.path);
    const { error: uploadErr } = await supabase.storage
      .from("live-class-recordings")
      .uploadToSignedUrl(filename, uploadPrep.token, previewBlob, {
        contentType: normalizedMimeType,
      });
    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    // 2. Save metadata to class_recordings table
    const response = await fetch("/api/classroom/recordings", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        lessonId: savedLessonId,
        title,
        subject,
        topic,
        storagePath: filename,
        durationSeconds: meta.duration,
        fileSizeBytes: meta.fileSize,
        recordingSource: "lesson_studio",
        isVisibleToStudents: false,
      }),
    });

    const resData = await response.json();
    if (!response.ok) throw new Error(resData.error || "Failed to save recording record.");

    // The current editor only limits preview playback; it does not transcode
    // or cut the uploaded file. Keep the library metadata aligned with the
    // complete original and avoid reporting a trim job that does not exist.
    if (meta.trimmedStart > 0 || (meta.trimmedEnd > 0 && meta.trimmedEnd < meta.duration)) {
      toast.info("The complete original video was saved. Exported trimming is not available yet.");
    }
  };

  const startLiveClassFromLesson = async () => {
    const id = await saveLesson("ready");
    if (!id) return;
    try {
      const response = await fetch("/api/classroom/studio/live", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ lessonId: id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not launch live class.");
      router.push(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start live class.");
    }
  };

  if (busy) {
    return (
      <main className="min-h-screen bg-[#070d1e] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 rounded-full border-3 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-slate-300">{message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070d1e] text-white flex flex-col">
      {/* ================================================================== */}
      {/* 1. TOP HEADER: BRANDING, TITLE, LESSON META & CONTROLS */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0B1536]/95 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/classroom"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-300 hover:bg-white/10 transition"
            title="Classroom Lobby"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Lesson Title..."
                className="bg-transparent text-base sm:text-lg font-black text-white outline-none border-b border-transparent hover:border-white/20 focus:border-blue-500 transition px-1"
              />
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-300">
                Video Lesson Studio
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (e.g. Mathematics)"
                className="bg-transparent outline-none hover:text-white focus:text-white max-w-[140px]"
              />
              <span>·</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic / Unit"
                className="bg-transparent outline-none hover:text-white focus:text-white max-w-[140px]"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons: Import, Recording Engine, Save & Go Live */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Import Materials */}
          <button
            type="button"
            onClick={() => setShowImporter(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-950/60 hover:bg-purple-900/80 px-3 py-1.5 text-xs font-bold text-purple-200 transition"
            title="Import questions from CSV, slides from PowerPoint/PDF, or lesson outlines"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Import</span>
            {attachments.length > 0 && (
              <span className="rounded-full bg-purple-600 px-1.5 py-0.2 text-[10px] font-black text-white">
                {attachments.length}
              </span>
            )}
          </button>

          {/* Camera PiP Toggle */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              isCameraEnabled
                ? "border-emerald-500/50 bg-emerald-950/60 text-emerald-200"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            title="Toggle Picture-in-Picture Tutor Camera overlay"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            <span>{isCameraEnabled ? "Camera ON" : "Camera"}</span>
          </button>

          {/* Mic Toggle */}
          <button
            type="button"
            onClick={toggleMic}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
              isMicEnabled
                ? "border-blue-500/50 bg-blue-950/60 text-blue-200"
                : "border-rose-500/50 bg-rose-950/60 text-rose-300"
            }`}
            title="Toggle Microphone"
          >
            {isMicEnabled ? <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> : <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/></svg>}
          </button>

          {/* ================================================================ */}
          {/* INDEPENDENT STUDIO RECORDING CONTROLS */}
          {/* ================================================================ */}
          {recordingState === "idle" && (
            <button
              type="button"
              onClick={startRecordingFlow}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5238] to-rose-600 hover:from-rose-600 hover:to-rose-500 px-4 py-1.5 text-xs font-black text-white shadow-lg transition active:scale-95"
              title="Start recording your video lesson with 3-2-1 countdown (No LiveKit room required)"
            >
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span>Record Lesson</span>
            </button>
          )}

          {recordingState === "recording" && (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-950/80 px-3 py-1 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono font-bold text-rose-200">
                {Math.floor(recordingSeconds / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(recordingSeconds % 60).toString().padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={pauseRecording}
                className="ml-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 text-[10px] font-black text-amber-200"
              >
                ⏸ Pause
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-lg bg-rose-600 hover:bg-rose-500 px-2.5 py-0.5 text-[10px] font-black text-white"
              >
                ■ Stop &amp; Finish
              </button>
            </div>
          )}

          {recordingState === "paused" && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-950/80 px-3 py-1 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="font-bold text-amber-200 uppercase text-[10px]">PAUSED</span>
              <button
                type="button"
                onClick={resumeRecording}
                className="ml-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white"
              >
                ▶ Resume
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-lg bg-rose-600 hover:bg-rose-500 px-2.5 py-0.5 text-[10px] font-black text-white"
              >
                ■ Finish
              </button>
            </div>
          )}

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => void saveLesson("draft")}
            disabled={saving}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 disabled:opacity-40 transition"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>

          {/* Duplicate as Template (Stage 5) */}
          <button
            type="button"
            onClick={duplicateAsTemplate}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1"
            title="Duplicate this lesson deck as a reusable template"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span>Duplicate Deck</span>
          </button>

          {/* Go Live */}
          <button
            type="button"
            onClick={() => void startLiveClassFromLesson()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md transition active:scale-95"
            title="Convert this prepared lesson directly into an active Live Classroom session for students"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
            <span>Go Live</span>
          </button>

          {/* Video Library Link */}
          <Link
            href="/classroom/library"
            className="rounded-xl border border-blue-500/30 bg-[#1356E8]/10 hover:bg-[#1356E8]/20 px-3 py-1.5 text-xs font-bold text-blue-300 transition"
            title="Open Teaching and Video Library"
          >
            <svg className="h-3.5 w-3.5 inline mr-1 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>Library
          </Link>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. MAIN TEACHING WORKSPACE WITH PIP CAMERA & WHITEBOARD */}
      {/* ================================================================== */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Whiteboard Workspace */}
        <div className="flex-1 relative w-full h-full">
          <SmartWhiteboard
            ref={whiteboardRef}
            classId={lessonId || "studio-draft"}
            isHost={true}
            canDraw={true}
            initialPages={pages}
            initialActivePageIndex={activePageIndex}
            onPagesChange={onBoardPagesChange}
            showWatermark={true}
          />

          {/* Movable & Resizable Picture-in-Picture Tutor Camera */}
          <PictureInPictureCamera
            stream={userMediaStream}
            isEnabled={isCameraEnabled}
            corner={pipCorner}
            size={pipSize}
            onChangeCorner={setPipCorner}
            onChangeSize={setPipSize}
            onClose={() => setIsCameraEnabled(false)}
            videoRef={cameraVideoRef}
          />
        </div>
      </div>

      {/* ================================================================== */}
      {/* 3. MODALS: 3-2-1 COUNTDOWN & VIDEO PREVIEW / TRIMMING EDITOR */}
      {/* ================================================================== */}
      {recordingState === "countdown" && (
        <RecordingCountdown
          seconds={3}
          onComplete={beginActualRecording}
          onCancel={() => setRecordingState("idle")}
        />
      )}

      {recordingState === "preview" && (
        <VideoPreviewEditor
          videoBlob={previewBlob}
          videoUrl={previewUrl}
          mimeType={previewMimeType}
          lessonTitle={title}
          subject={subject}
          topic={topic}
          onRetake={() => {
            setRecordingState("idle");
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPreviewBlob(null);
          }}
          onSaveToLibrary={handleSaveToCloudLibrary}
          onClose={() => {
            setRecordingState("idle");
          }}
        />
      )}

      {/* Material Importer */}
      {showImporter && (
        <ClassroomMaterialImporter
          isOpen={showImporter}
          onClose={() => setShowImporter(false)}
          onAddPages={(newPages, replace) => {
            if (replace) {
              setPages(newPages as PageData[]);
              setActivePageIndex(0);
            } else {
              setPages((prev) => [...prev, ...(newPages as PageData[])]);
            }
            toast.success(`Imported ${newPages.length} slide(s) into your lesson whiteboard!`);
          }}
          authToken={token}
          attachments={attachments}
          onAddAttachment={(att) => setAttachments((prev) => [...prev, att])}
        />
      )}
    </main>
  );
}
