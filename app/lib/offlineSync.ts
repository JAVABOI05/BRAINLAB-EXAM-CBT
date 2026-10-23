import { submitExam, saveProgress, isError, type Option, type FinishedPayload } from "./examApi";

export interface QueuedSubmission {
  sessionId: string;
  token: string;
  answers: Record<string, Option>;
  autoSubmitted: boolean;
  flagged: Record<string, boolean>;
  queuedAt: number;
  retryCount: number;
  lastError?: string;
}

export interface QueuedProgress {
  sessionId: string;
  token: string;
  answers: Record<string, Option>;
  timestamp: number;
}

export const OFFLINE_SUBMISSION_KEY = "brainlab_offline_exam_submission";
export const OFFLINE_PROGRESS_KEY = "brainlab_offline_exam_progress";
export const SYNC_EVENT_NAME = "brainlab_sync_event";

export type SyncState = "idle" | "syncing" | "synced" | "offline" | "error";

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function getQueuedSubmission(): QueuedSubmission | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OFFLINE_SUBMISSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QueuedSubmission;
  } catch {
    return null;
  }
}

export function queueExamSubmission(
  item: Omit<QueuedSubmission, "queuedAt" | "retryCount">
): void {
  if (typeof window === "undefined") return;
  const payload: QueuedSubmission = {
    ...item,
    queuedAt: Date.now(),
    retryCount: 0,
  };
  try {
    localStorage.setItem(OFFLINE_SUBMISSION_KEY, JSON.stringify(payload));
    dispatchSyncStatus("offline", "Exam submission safely queued in offline storage.");
  } catch (err) {
    console.error("Failed to queue offline exam submission:", err);
  }
}

export function clearQueuedSubmission(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OFFLINE_SUBMISSION_KEY);
  } catch {}
}

export function getQueuedProgress(): QueuedProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OFFLINE_PROGRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QueuedProgress;
  } catch {
    return null;
  }
}

export function queueProgress(
  sessionId: string,
  token: string,
  answers: Record<string, Option>
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: QueuedProgress = {
      sessionId,
      token,
      answers,
      timestamp: Date.now(),
    };
    localStorage.setItem(OFFLINE_PROGRESS_KEY, JSON.stringify(payload));
  } catch {}
}

export function clearQueuedProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OFFLINE_PROGRESS_KEY);
  } catch {}
}

export function hasPendingOfflineData(): boolean {
  return Boolean(getQueuedSubmission() || getQueuedProgress());
}

function dispatchSyncStatus(state: SyncState, message?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SYNC_EVENT_NAME, {
      detail: { state, message, timestamp: Date.now() },
    })
  );
}

export async function syncQueuedExam(): Promise<{
  ok: boolean;
  type?: "submitted" | "progress" | "empty";
  result?: FinishedPayload;
  error?: string;
}> {
  if (!isOnline()) {
    dispatchSyncStatus("offline", "Cannot sync while offline.");
    return { ok: false, error: "offline" };
  }

  // 1. Check for full exam submission waiting in queue
  const submission = getQueuedSubmission();
  if (submission) {
    dispatchSyncStatus("syncing", "Syncing queued examination submission...");
    try {
      const res = await submitExam(
        submission.sessionId,
        submission.token,
        submission.answers,
        submission.autoSubmitted,
        submission.flagged
      );

      if (isError(res)) {
        submission.retryCount = (submission.retryCount || 0) + 1;
        submission.lastError = res.message;
        localStorage.setItem(OFFLINE_SUBMISSION_KEY, JSON.stringify(submission));
        dispatchSyncStatus("error", res.message || "Failed to submit queued exam.");
        return { ok: false, error: res.message };
      }

      // Success! Clear submission and progress queues
      clearQueuedSubmission();
      clearQueuedProgress();

      // Store finished payload in localStorage as /exam would
      try {
        localStorage.setItem("exam_finished_payload", JSON.stringify(res));
      } catch {}

      dispatchSyncStatus("synced", "Exam submission successfully uploaded to server!");
      return { ok: true, type: "submitted", result: res };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync error";
      dispatchSyncStatus("error", msg);
      return { ok: false, error: msg };
    }
  }

  // 2. Check for intermediate answers progress
  const progress = getQueuedProgress();
  if (progress) {
    dispatchSyncStatus("syncing", "Syncing cached exam answers...");
    try {
      const res = await saveProgress(
        progress.sessionId,
        progress.token,
        progress.answers
      );

      if (isError(res)) {
        if (res.error === "time_up") {
          // If time is up, escalate to auto-submission
          const subRes = await submitExam(
            progress.sessionId,
            progress.token,
            progress.answers,
            true,
            {}
          );
          if (!isError(subRes)) {
            clearQueuedProgress();
            dispatchSyncStatus("synced", "Time expired: exam submitted automatically.");
            return { ok: true, type: "submitted", result: subRes };
          }
        }
        dispatchSyncStatus("error", res.message || "Could not save offline progress.");
        return { ok: false, error: res.message };
      }

      clearQueuedProgress();
      dispatchSyncStatus("synced", "Answers successfully synced.");
      return { ok: true, type: "progress" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Progress sync failed";
      dispatchSyncStatus("error", msg);
      return { ok: false, error: msg };
    }
  }

  return { ok: true, type: "empty" };
}
