/**
 * BrainLab Academy - Cryptographic QR Code Generator Engine (Zero External Dependencies)
 * Generates genuine, scannable ISO/IEC 18004 vector QR codes for official certificates and credentials.
 */

// Galois Field GF(256) arithmetic
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = val;
    GF_EXP[i + 255] = val;
    GF_LOG[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11d : 0);
  }
  GF_LOG[0] = 0;
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const factor = new Uint8Array([1, GF_EXP[i]]);
    const nextPoly = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      for (let k = 0; k < factor.length; k++) {
        nextPoly[j + k] ^= gfMultiply(poly[j], factor[k]);
      }
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCalculateEcc(data: Uint8Array, eccCount: number): Uint8Array {
  const genPoly = rsGeneratorPoly(eccCount);
  const ecc = new Uint8Array(eccCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ ecc[0];
    for (let j = 0; j < eccCount - 1; j++) {
      ecc[j] = ecc[j + 1] ^ gfMultiply(genPoly[j + 1], factor);
    }
    ecc[eccCount - 1] = gfMultiply(genPoly[eccCount], factor);
  }
  return ecc;
}

interface VersionInfo {
  version: number;
  totalCodewords: number;
  dataCodewords: number;
  ecCodewordsPerBlock: number;
  blocks: { numBlocks: number; dataCodewords: number }[];
  alignmentCenters: number[];
}

const LEVEL_M_TABLE: VersionInfo[] = [
  { version: 1, totalCodewords: 26, dataCodewords: 16, ecCodewordsPerBlock: 10, blocks: [{ numBlocks: 1, dataCodewords: 16 }], alignmentCenters: [] },
  { version: 2, totalCodewords: 44, dataCodewords: 28, ecCodewordsPerBlock: 16, blocks: [{ numBlocks: 1, dataCodewords: 28 }], alignmentCenters: [6, 18] },
  { version: 3, totalCodewords: 70, dataCodewords: 44, ecCodewordsPerBlock: 26, blocks: [{ numBlocks: 1, dataCodewords: 44 }], alignmentCenters: [6, 22] },
  { version: 4, totalCodewords: 100, dataCodewords: 64, ecCodewordsPerBlock: 18, blocks: [{ numBlocks: 2, dataCodewords: 32 }], alignmentCenters: [6, 26] },
  { version: 5, totalCodewords: 134, dataCodewords: 86, ecCodewordsPerBlock: 24, blocks: [{ numBlocks: 2, dataCodewords: 43 }], alignmentCenters: [6, 30] },
  { version: 6, totalCodewords: 172, dataCodewords: 108, ecCodewordsPerBlock: 16, blocks: [{ numBlocks: 4, dataCodewords: 27 }], alignmentCenters: [6, 34] },
  { version: 7, totalCodewords: 196, dataCodewords: 124, ecCodewordsPerBlock: 18, blocks: [{ numBlocks: 2, dataCodewords: 31 }, { numBlocks: 2, dataCodewords: 32 }], alignmentCenters: [6, 22, 38] },
  { version: 8, totalCodewords: 242, dataCodewords: 154, ecCodewordsPerBlock: 22, blocks: [{ numBlocks: 2, dataCodewords: 38 }, { numBlocks: 2, dataCodewords: 39 }], alignmentCenters: [6, 24, 42] },
  { version: 9, totalCodewords: 292, dataCodewords: 182, ecCodewordsPerBlock: 22, blocks: [{ numBlocks: 3, dataCodewords: 36 }, { numBlocks: 2, dataCodewords: 37 }], alignmentCenters: [6, 26, 46] },
  { version: 10, totalCodewords: 346, dataCodewords: 216, ecCodewordsPerBlock: 26, blocks: [{ numBlocks: 4, dataCodewords: 43 }, { numBlocks: 1, dataCodewords: 44 }], alignmentCenters: [6, 28, 50] },
];

function selectVersion(byteLength: number): VersionInfo {
  for (const info of LEVEL_M_TABLE) {
    const requiredBits = 4 + (info.version <= 9 ? 8 : 16) + byteLength * 8;
    if (requiredBits <= info.dataCodewords * 8) {
      return info;
    }
  }
  throw new Error(`Data length (${byteLength} bytes) exceeds supported QR code capacity`);
}

function encodeData(text: string, versionInfo: VersionInfo): Uint8Array {
  const utf8Bytes = new TextEncoder().encode(text);
  const bits: number[] = [];

  function writeBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  // 1. Mode indicator: Byte mode (0100)
  writeBits(0b0100, 4);

  // 2. Character count indicator
  const countBits = versionInfo.version <= 9 ? 8 : 16;
  writeBits(utf8Bytes.length, countBits);

  // 3. Data bytes
  for (let i = 0; i < utf8Bytes.length; i++) {
    writeBits(utf8Bytes[i], 8);
  }

  // 4. Terminator
  const maxDataBits = versionInfo.dataCodewords * 8;
  const termLen = Math.min(4, maxDataBits - bits.length);
  writeBits(0, termLen);

  // 5. Pad to multiple of 8
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // 6. Pad bytes (0xEC, 0x11)
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxDataBits) {
    writeBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  const codewords = new Uint8Array(versionInfo.dataCodewords);
  for (let i = 0; i < codewords.length; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i * 8 + b];
    }
    codewords[i] = byteVal;
  }

  return codewords;
}

function buildCodewordStream(codewords: Uint8Array, vInfo: VersionInfo): Uint8Array {
  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  let offset = 0;

  for (const group of vInfo.blocks) {
    for (let b = 0; b < group.numBlocks; b++) {
      const slice = codewords.slice(offset, offset + group.dataCodewords);
      offset += group.dataCodewords;
      dataBlocks.push(slice);
      eccBlocks.push(rsCalculateEcc(slice, vInfo.ecCodewordsPerBlock));
    }
  }

  const result: number[] = [];
  let maxDataLen = 0;
  for (const b of dataBlocks) if (b.length > maxDataLen) maxDataLen = b.length;

  for (let i = 0; i < maxDataLen; i++) {
    for (const b of dataBlocks) {
      if (i < b.length) result.push(b[i]);
    }
  }

  for (let i = 0; i < vInfo.ecCodewordsPerBlock; i++) {
    for (const b of eccBlocks) {
      if (i < b.length) result.push(b[i]);
    }
  }

  return new Uint8Array(result);
}

const FORMAT_LEVEL_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x40d3, 0x45e4, 0x4abd, 0x4f8a,
];

function isMasked(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return false;
  }
}

export interface QrMatrixResult {
  size: number;
  modules: boolean[][];
  isDark: (r: number, c: number) => boolean;
}

/**
 * Generates an authoritative boolean module matrix for a text/URL
 */
export function generateQrMatrix(text: string, _errorCorrectionLevel: "L" | "M" | "Q" | "H" = "M"): QrMatrixResult {
  const byteLen = new TextEncoder().encode(text).length;
  const vInfo = selectVersion(byteLen);
  const size = vInfo.version * 4 + 17;
  const modules: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r: number, c: number, val: boolean) {
    modules[r][c] = val;
    isFunction[r][c] = true;
  }

  function placeFinder(startX: number, startY: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = startY + r;
        const nc = startX + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
          const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          const isFinderDark = (r >= 0 && r <= 6 && c >= 0 && c <= 6) && (isBorder || isCenter);
          setFunction(nr, nc, isFinderDark);
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  const coords = vInfo.alignmentCenters;
  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords.length; j++) {
      const cy = coords[i];
      const cx = coords[j];
      if ((cy < 9 && cx < 9) || (cy < 9 && cx > size - 10) || (cy > size - 10 && cx < 9)) {
        continue;
      }
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
          const isDot = r === 0 && c === 0;
          setFunction(cy + r, cx + c, isOuter || isDot);
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunction(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunction(i, 6, i % 2 === 0);
  }

  setFunction(4 * vInfo.version + 9, 8, true);

  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }

  const rawCodewords = encodeData(text, vInfo);
  const stream = buildCodewordStream(rawCodewords, vInfo);

  let bitIdx = 0;
  const totalBits = stream.length * 8;
  let upwards = true;

  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--;

    const rowIndices = Array.from({ length: size }, (_, i) => upwards ? size - 1 - i : i);
    for (const r of rowIndices) {
      for (let c = rightCol; c >= rightCol - 1; c--) {
        if (!isFunction[r][c]) {
          let bit = false;
          if (bitIdx < totalBits) {
            const byte = stream[Math.floor(bitIdx / 8)];
            const bitOffset = 7 - (bitIdx % 8);
            bit = ((byte >> bitOffset) & 1) === 1;
            bitIdx++;
          }
          modules[r][c] = bit;
        }
      }
    }
    upwards = !upwards;
  }

  const mask = 0;
  const finalModules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFunction[r][c]) {
        finalModules[r][c] = Boolean(modules[r][c]);
      } else {
        const originalBit = Boolean(modules[r][c]);
        const maskBit = isMasked(mask, r, c);
        finalModules[r][c] = originalBit !== maskBit;
      }
    }
  }

  const formatVal = FORMAT_LEVEL_M[mask];
  const formatBits: boolean[] = [];
  for (let i = 14; i >= 0; i--) {
    formatBits.push(((formatVal >> i) & 1) === 1);
  }

  finalModules[8][0] = formatBits[0];
  finalModules[8][1] = formatBits[1];
  finalModules[8][2] = formatBits[2];
  finalModules[8][3] = formatBits[3];
  finalModules[8][4] = formatBits[4];
  finalModules[8][5] = formatBits[5];
  finalModules[8][7] = formatBits[6];
  finalModules[8][8] = formatBits[7];
  finalModules[7][8] = formatBits[8];
  finalModules[5][8] = formatBits[9];
  finalModules[4][8] = formatBits[10];
  finalModules[3][8] = formatBits[11];
  finalModules[2][8] = formatBits[12];
  finalModules[1][8] = formatBits[13];
  finalModules[0][8] = formatBits[14];

  for (let i = 0; i < 8; i++) {
    finalModules[8][size - 1 - i] = formatBits[i];
  }
  for (let i = 0; i < 7; i++) {
    finalModules[size - 7 + i][8] = formatBits[8 + i];
  }

  return {
    size,
    modules: finalModules,
    isDark: (r: number, c: number) => {
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      return finalModules[r][c];
    },
  };
}

/**
 * Generates pure vector SVG markup representing the scannable QR code
 */
export function generateQrSvgString(
  text: string,
  options?: {
    size?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): string {
  const qr = generateQrMatrix(text, "M");
  const margin = options?.margin ?? 2;
  const darkColor = options?.darkColor ?? "#012153";
  const lightColor = options?.lightColor ?? "#ffffff";
  const displaySize = options?.size ?? 120;

  const totalGrid = qr.size + margin * 2;
  const pathParts: string[] = [];

  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) {
        const x = c + margin;
        const y = r + margin;
        pathParts.push(`M${x},${y}h1v1h-1z`);
      }
    }
  }

  const pathData = pathParts.join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalGrid} ${totalGrid}" width="${displaySize}" height="${displaySize}" shape-rendering="crispEdges" aria-label="Official Verification QR Code">
  <rect width="${totalGrid}" height="${totalGrid}" fill="${lightColor}" />
  <path d="${pathData}" fill="${darkColor}" />
</svg>`;
}
