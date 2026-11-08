// In-memory & transient fallback media store for classroom voice notes and diagrams
type StoredMedia = {
  buffer: Buffer;
  mimeType: string;
  duration?: number;
  title?: string;
  classId?: string;
  createdAt: number;
};

// Global singleton map across route invocations in the Node process
const globalMediaStore = globalThis as unknown as {
  _classroomMediaCache?: Map<string, StoredMedia>;
};

if (!globalMediaStore._classroomMediaCache) {
  globalMediaStore._classroomMediaCache = new Map<string, StoredMedia>();
}

const mediaCache = globalMediaStore._classroomMediaCache;

export function storeClassroomMedia(
  id: string,
  buffer: Buffer,
  mimeType: string,
  duration?: number,
  title?: string,
  classId?: string
) {
  // Evict oldest items if exceeding 200 items to preserve memory
  if (mediaCache.size > 200) {
    const oldestKey = mediaCache.keys().next().value;
    if (oldestKey) mediaCache.delete(oldestKey);
  }

  mediaCache.set(id, {
    buffer,
    mimeType,
    duration,
    title,
    classId,
    createdAt: Date.now(),
  });
}

export function getClassroomMedia(id: string): StoredMedia | undefined {
  return mediaCache.get(id);
}
