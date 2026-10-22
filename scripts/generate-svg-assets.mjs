import fs from "fs";
import path from "path";

const rootDir = process.cwd();

// 1. brainlab-logo.svg
const logoPngBase64 = fs.readFileSync(path.join(rootDir, "public/brainlab-logo.png")).toString("base64");
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3792 3228" width="100%" height="100%" role="img" aria-label="BrainLab Academy">
  <title>BrainLab Academy</title>
  <image width="3792" height="3228" href="data:image/png;base64,${logoPngBase64}" />
</svg>
`;
fs.writeFileSync(path.join(rootDir, "public/brainlab-logo.svg"), logoSvg, "utf8");
console.log("Generated public/brainlab-logo.svg");

// 2. brainlab-logo-light.svg
const logoLightPngBase64 = fs.readFileSync(path.join(rootDir, "public/brainlab-logo-light.png")).toString("base64");
const logoLightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3792 3228" width="100%" height="100%" role="img" aria-label="BrainLab Academy">
  <title>BrainLab Academy</title>
  <image width="3792" height="3228" href="data:image/png;base64,${logoLightPngBase64}" />
</svg>
`;
fs.writeFileSync(path.join(rootDir, "public/brainlab-logo-light.svg"), logoLightSvg, "utf8");
console.log("Generated public/brainlab-logo-light.svg");

// 3. brainlab-mark.svg
const markPngBase64 = fs.readFileSync(path.join(rootDir, "public/logo-mark-color-transparent.png")).toString("base64");
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3472 3040" width="100%" height="100%" role="img" aria-label="BrainLab">
  <title>BrainLab</title>
  <image width="3472" height="3040" href="data:image/png;base64,${markPngBase64}" />
</svg>
`;
fs.writeFileSync(path.join(rootDir, "public/brainlab-mark.svg"), markSvg, "utf8");
console.log("Generated public/brainlab-mark.svg");

// 4. favicon.svg
const appIconBase64 = fs.readFileSync(path.join(rootDir, "public/app-icon-512.png")).toString("base64");
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%" role="img" aria-label="BrainLab Favicon">
  <title>BrainLab</title>
  <image width="512" height="512" href="data:image/png;base64,${appIconBase64}" />
</svg>
`;
fs.writeFileSync(path.join(rootDir, "public/favicon.svg"), faviconSvg, "utf8");
console.log("Generated public/favicon.svg");
