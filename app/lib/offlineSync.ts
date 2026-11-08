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
  idempotencyKey?: string;
}

export interface QueuedProgress {
  sessionId: string;
  token: string;
  answers: Record<string, Option>;
  timestamp: number;
}

export const OFFLINE_SUBMISSION_KEY = "brainlab_offline_exam_submission";
export const OFFLINE_PROGRESS_KEY = "brainlab_offline_exam_progress";
export const OFFLINE_SNAPSHOT_PREFIX = "brainlab_exam_snapshot_";
export const SYNC_EVENT_NAME = "brainlab_sync_event";

export type SyncState = "idle" | "syncing" | "synced" | "offline" | "error";

// ----------------------------------------------------------------------------
// 1. IndexedDB Durable Storage (Primary Layer with LocalStorage Fallback)
// ----------------------------------------------------------------------------
const DB_NAME = "brainlab_cbt_offline_v1";
const DB_VERSION = 1;
const STORE_SUBMISSIONS = "submissions";
const STORE_PROGRESS = "progress";
const STORE_SNAPSHOTS = "snapshots";

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_SUBMISSIONS)) {
          db.createObjectStore(STORE_SUBMISSIONS, { keyPath: "sessionId" });
        }
        if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
          db.createObjectStore(STORE_PROGRESS, { keyPath: "sessionId" });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: "sessionId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(storeName: string, value: unknown): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch {}
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    if (!db) return null;
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve((request.result as T) || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  try {
    const db = await openDatabase();
    if (!db) return;
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch {}
}

// ----------------------------------------------------------------------------
// 2. Connectivity & Queue Helpers
// ----------------------------------------------------------------------------
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function getBackoffDelayMs(retryCount: number): number {
  const base = Math.min(30000, 1000 * Math.pow(2, Math.max(0, retryCount)));
  return base + Math.floor(Math.random() * 500);
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
  item: Omit<QueuedSubmission, "queuedAt" | "retryCount"> & { idempotencyKey?: string }
): void {
  if (typeof window === "undefined") return;
  const queuedAt = Date.now();
  const idempotencyKey = item.idempotencyKey || `${item.sessionId}_${queuedAt}`;
  const payload: QueuedSubmission = {
    ...item,
    queuedAt,
    retryCount: 0,
    idempotencyKey,
  };
  try {
    localStorage.setItem(OFFLINE_SUBMISSION_KEY, JSON.stringify(payload));
    void idbPut(STORE_SUBMISSIONS, payload);
    dispatchSyncStatus("offline", "Exam submission safely queued in offline storage.");
  } catch (err) {
    console.error("Failed to queue offline exam submission:", err);
  }
}

export function clearQueuedSubmission(): void {
  if (typeof window === "undefined") return;
  try {
    const current = getQueuedSubmission();
    if (current?.sessionId) {
      void idbDelete(STORE_SUBMISSIONS, current.sessionId);
    }
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
    void idbPut(STORE_PROGRESS, payload);
  } catch {}
}

export function clearQueuedProgress(): void {
  if (typeof window === "undefined") return;
  try {
    const current = getQueuedProgress();
    if (current?.sessionId) {
      void idbDelete(STORE_PROGRESS, current.sessionId);
    }
    localStorage.removeItem(OFFLINE_PROGRESS_KEY);
  } catch {}
}

export function hasPendingOfflineData(): boolean {
  return Boolean(getQueuedSubmission() || getQueuedProgress());
}

// ----------------------------------------------------------------------------
// 3. Exam Snapshot Offline Recovery
// ----------------------------------------------------------------------------
export function saveExamLocalSnapshot(sessionId: string, snapshot: unknown): void {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    const key = `${OFFLINE_SNAPSHOT_PREFIX}${sessionId}`;
    const payload = {
      sessionId,
      snapshot,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
    void idbPut(STORE_SNAPSHOTS, payload);
  } catch {}
}

export function getExamLocalSnapshot<T = unknown>(sessionId: string): T | null {
  if (typeof window === "undefined" || !sessionId) return null;
  try {
    const key = `${OFFLINE_SNAPSHOT_PREFIX}${sessionId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed.snapshot as T) || null;
  } catch {
    return null;
  }
}

export function clearExamLocalSnapshot(sessionId: string): void {
  if (typeof window === "undefined" || !sessionId) return;
  try {
    const key = `${OFFLINE_SNAPSHOT_PREFIX}${sessionId}`;
    localStorage.removeItem(key);
    void idbDelete(STORE_SNAPSHOTS, sessionId);
  } catch {}
}

function dispatchSyncStatus(state: SyncState, message?: string, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SYNC_EVENT_NAME, {
      detail: { state, message, timestamp: Date.now(), ...extra },
    })
  );
}

// ----------------------------------------------------------------------------
// 4. Background Sync Execution
// ----------------------------------------------------------------------------
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
  let submission = getQueuedSubmission();
  if (!submission) {
    // Attempt hydration from IndexedDB fallback
    try {
      const db = await openDatabase();
      if (db) {
        const tx = db.transaction(STORE_SUBMISSIONS, "readonly");
        const allReq = tx.objectStore(STORE_SUBMISSIONS).getAll();
        const rows = await new Promise<QueuedSubmission[]>((res) => {
          allReq.onsuccess = () => res(allReq.result || []);
          allReq.onerror = () => res([]);
        });
        if (rows && rows.length > 0) {
          submission = rows[0];
        }
      }
    } catch {}
  }

  if (submission) {
    dispatchSyncStatus("syncing", "Syncing queued examination submission...", {
      retryCount: submission.retryCount || 0,
      sessionId: submission.sessionId,
    });
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
        void idbPut(STORE_SUBMISSIONS, submission);
        dispatchSyncStatus("error", res.message || "Failed to submit queued exam.", {
          retryCount: submission.retryCount,
        });
        return { ok: false, error: res.message };
      }

      // Success! Clear submission and progress queues and clean snapshot
      clearQueuedSubmission();
      clearQueuedProgress();
      clearExamLocalSnapshot(submission.sessionId);

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
            clearExamLocalSnapshot(progress.sessionId);
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
