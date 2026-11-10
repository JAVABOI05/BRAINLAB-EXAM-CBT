/**
 * Minimal, defensive ZIP image extractor for the admin question importer.
 * Supports stored and DEFLATE-compressed ZIP entries without adding a runtime dependency.
 */
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_IMAGE_COUNT = 200;

export type QuestionImageFiles = Map<string, File>;

function normalizeArchivePath(value: string): string {
  const path = value.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!path || path.startsWith("/") || /^[a-zA-Z]:/.test(path)) {
    throw new Error("The ZIP contains an unsafe image path.");
  }
  const parts = path.split("/");
  if (parts.some((part) => part === ".." || part === ".")) {
    throw new Error("The ZIP contains a path traversal entry.");
  }
  return parts.filter(Boolean).join("/");
}

function imageMimeType(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return null;
}

function hasValidImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/png") {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/gif") return bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)).startsWith("GIF8");
  if (mime === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser does not support ZIP image extraction. Please use a recent version of Chrome, Edge, or Firefox.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function extractQuestionImagesFromZip(file: File): Promise<QuestionImageFiles> {
  if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Please select a .zip image archive.");
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error("The ZIP archive exceeds the 50 MB import limit.");

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const minEocd = Math.max(0, bytes.length - 65_557);
  let eocd = -1;

  for (let offset = bytes.length - 22; offset >= minEocd; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("This ZIP archive is invalid or incomplete.");

  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  let cursor = view.getUint32(eocd + 16, true);
  if (entryCount === 0xffff || centralSize === 0xffffffff || cursor === 0xffffffff) {
    throw new Error("ZIP64 archives are not supported. Please use a standard ZIP archive.");
  }
  if (entryCount > MAX_IMAGE_COUNT + 100) throw new Error("The ZIP contains too many entries.");
  if (cursor + centralSize > bytes.length) throw new Error("The ZIP central directory is truncated.");

  const images: QuestionImageFiles = new Map();
  let totalUncompressed = 0;
  let imageCount = 0;

  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("The ZIP central directory contains an invalid entry.");
    }

    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const externalAttributes = view.getUint32(cursor + 38, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd + extraLength + commentLength > bytes.length) throw new Error("A ZIP entry has invalid metadata.");

    const rawName = new TextDecoder("utf-8").decode(bytes.slice(nameStart, nameEnd));
    cursor = nameEnd + extraLength + commentLength;
    if (!rawName || rawName.endsWith("/")) continue;

    const path = normalizeArchivePath(rawName);
    const mime = imageMimeType(path);
    if (!mime) continue;

    if (flags & 0x0001) throw new Error(`The image "${path}" is encrypted. Please provide an unencrypted ZIP.`);
    if (method !== 0 && method !== 8) throw new Error(`The image "${path}" uses an unsupported ZIP compression method.`);
    if (uncompressedSize > MAX_IMAGE_BYTES) throw new Error(`The image "${path}" exceeds the 10 MB image limit.`);
    totalUncompressed += uncompressedSize;
    imageCount++;
    if (imageCount > MAX_IMAGE_COUNT || totalUncompressed > MAX_TOTAL_IMAGE_BYTES) {
      throw new Error("The ZIP exceeds the image count or total extracted size limit.");
    }

    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error(`The ZIP entry "${path}" has an invalid local header.`);
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) throw new Error(`The ZIP image "${path}" is truncated.`);

    const compressed = bytes.slice(dataStart, dataEnd);
    const imageBytes = method === 0 ? compressed : await inflateRaw(compressed);
    if (imageBytes.length !== uncompressedSize) throw new Error(`The ZIP image "${path}" failed its size check.`);
    if (!hasValidImageSignature(imageBytes, mime)) throw new Error(`The file "${path}" is not a valid ${mime} image.`);
    if (images.has(path)) throw new Error(`The ZIP contains a duplicate image path: "${path}".`);

    images.set(path, new File([imageBytes], path.split("/").pop() || "question-image", { type: mime }));
  }

  if (images.size === 0) throw new Error("No supported image files were found in the ZIP archive.");
  return images;
}

export function normalizeQuestionImagePath(value: string): string {
  const path = value.trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (!path || path.startsWith("/") || /^[a-zA-Z]:/.test(path) || path.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error("The CSV contains an unsafe local image path.");
  }
  return path.split("/").filter(Boolean).join("/");
}
