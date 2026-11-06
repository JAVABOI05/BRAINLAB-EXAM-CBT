import fs from "fs";
import path from "path";
import assert from "assert";

let passedCount = 0;
let failedCount = 0;

function it(description: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      throw new Error("Async test should be awaited in runner");
    }
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err?.message || err}`);
    failedCount++;
  }
}

async function runPublicWebsiteArchitectureTests() {
  console.log("=========================================================================");
  console.log("  BRAINLAB CBT: PUBLIC WEBSITE ARCHITECTURE & PRODUCT DISCOVERY SUITE");
  console.log("=========================================================================\n");

  const rootDir = process.cwd();

  console.log("1. MAIN PUBLIC PAGES INVENTORY & AVAILABILITY");
  {
    const mainPages = [
      { route: "Home", file: "app/page.tsx", client: "app/HomePageClient.tsx" },
      { route: "About", file: "app/about/page.tsx" },
      { route: "Contact", file: "app/contact/page.tsx" },
      { route: "Pricing & Plans", file: "app/pricing/page.tsx" },
      { route: "Academic Resources", file: "app/resources/page.tsx" },
      { route: "FAQs", file: "app/faq/page.tsx" },
      { route: "Privacy Policy", file: "app/privacy/page.tsx" },
      { route: "Terms of Use", file: "app/terms/page.tsx" },
      { route: "Official Syllabus", file: "app/syllabus/page.tsx" },
      { route: "For Schools", file: "app/schools/page.tsx" },
      { route: "Knowledge Base", file: "app/knowledge-base/page.tsx" },
    ];

    for (const p of mainPages) {
      it(`Main public page exists: ${p.route} (${p.file})`, () => {
        assert(fs.existsSync(path.join(rootDir, p.file)), `File must exist: ${p.file}`);
      });
    }
  }

  console.log("\n2. DEDICATED PRODUCT INFORMATION PAGES (SECTION 3.B)");
  {
    const productPages = [
      { name: "Products Overview Hub", file: "app/products/page.tsx", canonical: "/products" },
      { name: "CBT Practice Simulator", file: "app/products/cbt/page.tsx", canonical: "/products/cbt", cta: "/cbt" },
      { name: "Curriculum Learning Hub", file: "app/products/learning-hub/page.tsx", canonical: "/products/learning-hub", cta: "/learn" },
      { name: "AI Study Studio & Diagnostics", file: "app/products/ai-learning/page.tsx", canonical: "/products/ai-learning", cta: "/ai-learning" },
      { name: "Live Classroom & Whiteboard Stage", file: "app/products/live-classroom/page.tsx", canonical: "/products/live-classroom", cta: "/classroom" },
      { name: "STEM Studio Virtual Labs", file: "app/products/stem-studio/page.tsx", canonical: "/products/stem-studio", cta: "/classroom/stem" },
      { name: "Challenge Arena & Duels", file: "app/products/challenge-arena/page.tsx", canonical: "/products/challenge-arena", cta: "/challenge-arena" },
    ];

    for (const prod of productPages) {
      it(`Product page exists and exports default component: ${prod.name}`, () => {
        const fullPath = path.join(rootDir, prod.file);
        assert(fs.existsSync(fullPath), `Product page file must exist: ${prod.file}`);
        const content = fs.readFileSync(fullPath, "utf8");
        assert(content.includes("export default function"), `${prod.file} must have default export`);
        assert(content.includes("export const metadata"), `${prod.file} must export metadata`);
        assert(content.includes(prod.canonical), `${prod.file} must declare canonical alternate ${prod.canonical}`);
        if (prod.cta) {
          assert(content.includes(prod.cta), `${prod.file} must provide genuine CTA to functional workspace: ${prod.cta}`);
        }
      });
    }
  }

  console.log("\n3. AUDIENCE INFORMATION PAGES (SECTION 3.C)");
  {
    const audiencePages = [
      { name: "For Students & Candidates", file: "app/for-students/page.tsx", canonical: "/for-students" },
      { name: "For Educators & Tutors", file: "app/for-tutors/page.tsx", canonical: "/for-tutors" },
      { name: "For Schools & Institutions", file: "app/schools/page.tsx", canonical: "/schools" },
    ];

    for (const aud of audiencePages) {
      it(`Audience page exists and exports default component: ${aud.name}`, () => {
        const fullPath = path.join(rootDir, aud.file);
        assert(fs.existsSync(fullPath), `Audience page file must exist: ${aud.file}`);
        const content = fs.readFileSync(fullPath, "utf8");
        assert(content.includes("export default function"), `${aud.file} must have default export`);
        if (aud.file !== "app/schools/page.tsx") {
          assert(content.includes(aud.canonical), `${aud.file} must declare canonical ${aud.canonical}`);
        }
      });
    }
  }

  console.log("\n4. NAVIGATION & FOOTER CROSS-LINKING INTEGRATION");
  {
    const brandHeaderPath = path.join(rootDir, "app/components/BrandHeader.tsx");
    const brandHeaderContent = fs.readFileSync(brandHeaderPath, "utf8");

    it("BrandHeader.tsx navigation includes Products, Syllabus, Resources, Pricing, Schools, About", () => {
      assert(brandHeaderContent.includes('href: "/products", label: "Products"'), "Must include Products in header nav");
      assert(brandHeaderContent.includes('href: "/syllabus", label: "Syllabus"'), "Must include Syllabus in header nav");
      assert(brandHeaderContent.includes('href: "/resources", label: "Resources"'), "Must include Resources in header nav");
      assert(brandHeaderContent.includes('href: "/pricing", label: "Pricing"'), "Must include Pricing in header nav");
      assert(brandHeaderContent.includes('href: "/schools", label: "For Schools"'), "Must include For Schools in header nav");
      assert(brandHeaderContent.includes('href: "/about", label: "About"'), "Must include About in header nav");
    });

    const brandFooterPath = path.join(rootDir, "app/components/BrandFooter.tsx");
    const brandFooterContent = fs.readFileSync(brandFooterPath, "utf8");

    it("BrandFooter.tsx links to all 6 product pages and all audience pages", () => {
      assert(brandFooterContent.includes('href="/products/cbt"'), "Footer must link to /products/cbt");
      assert(brandFooterContent.includes('href="/products/learning-hub"'), "Footer must link to /products/learning-hub");
      assert(brandFooterContent.includes('href="/products/ai-learning"'), "Footer must link to /products/ai-learning");
      assert(brandFooterContent.includes('href="/products/stem-studio"'), "Footer must link to /products/stem-studio");
      assert(brandFooterContent.includes('href="/products/live-classroom"'), "Footer must link to /products/live-classroom");
      assert(brandFooterContent.includes('href="/products/challenge-arena"'), "Footer must link to /products/challenge-arena");
      assert(brandFooterContent.includes('href="/for-students"'), "Footer must link to /for-students");
      assert(brandFooterContent.includes('href="/for-tutors"'), "Footer must link to /for-tutors");
      assert(brandFooterContent.includes('href="/schools"'), "Footer must link to /schools");
    });

    const homeClientPath = path.join(rootDir, "app/HomePageClient.tsx");
    const homeClientContent = fs.readFileSync(homeClientPath, "utf8");

    it("HomePageClient.tsx ecosystem pathways link to the dedicated product information pages", () => {
      assert(homeClientContent.includes('href: "/products/cbt"'), "Homepage must link to /products/cbt");
      assert(homeClientContent.includes('href: "/products/learning-hub"'), "Homepage must link to /products/learning-hub");
      assert(homeClientContent.includes('href: "/products/stem-studio"'), "Homepage must link to /products/stem-studio");
      assert(homeClientContent.includes('href: "/products/ai-learning"'), "Homepage must link to /products/ai-learning");
      assert(homeClientContent.includes('href: "/products/live-classroom"'), "Homepage must link to /products/live-classroom");
      assert(homeClientContent.includes('href: "/products/challenge-arena"'), "Homepage must link to /products/challenge-arena");
      assert(homeClientContent.includes('ctaHref: "/for-students"'), "Homepage must link to /for-students");
      assert(homeClientContent.includes('ctaHref: "/for-tutors"'), "Homepage must link to /for-tutors");
    });

    const aboutPagePath = path.join(rootDir, "app/about/page.tsx");
    const aboutPageContent = fs.readFileSync(aboutPagePath, "utf8");

    it("app/about/page.tsx capability cards link to the dedicated product information pages", () => {
      assert(aboutPageContent.includes('linkHref: "/products/cbt"'), "About must link to /products/cbt");
      assert(aboutPageContent.includes('linkHref: "/products/learning-hub"'), "About must link to /products/learning-hub");
      assert(aboutPageContent.includes('linkHref: "/products/ai-learning"'), "About must link to /products/ai-learning");
      assert(aboutPageContent.includes('linkHref: "/products/live-classroom"'), "About must link to /products/live-classroom");
      assert(aboutPageContent.includes('linkHref: "/products/stem-studio"'), "About must link to /products/stem-studio");
      assert(aboutPageContent.includes('linkHref: "/products/challenge-arena"'), "About must link to /products/challenge-arena");
    });
  }

  console.log("\n5. FUNCTIONAL ROUTE COLLISION PREVENTION & WORKSPACE ISOLATION");
  {
    const functionalWorkspaces = [
      { name: "CBT Simulator Workspace", path: "app/cbt/page.tsx" },
      { name: "Learning Hub Workspace", path: "app/learn/page.tsx" },
      { name: "AI Learning Workspace", path: "app/ai-learning/page.tsx" },
      { name: "Classroom Workspace", path: "app/classroom/page.tsx" },
      { name: "STEM Studio Workspace", path: "app/classroom/stem/page.tsx" },
      { name: "Challenge Arena Workspace", path: "app/challenge-arena/page.tsx" },
    ];

    for (const ws of functionalWorkspaces) {
      it(`Functional application workspace remains intact: ${ws.name} (${ws.path})`, () => {
        assert(fs.existsSync(path.join(rootDir, ws.path)), `Functional workspace file must exist: ${ws.path}`);
      });
    }

    const siteChromePath = path.join(rootDir, "app/components/SiteChrome.tsx");
    const siteChromeContent = fs.readFileSync(siteChromePath, "utf8");

    it("SiteChrome.tsx routes public information pages through public layout (BrandHeader + BrandFooter)", () => {
      assert(!siteChromeContent.includes('"/products"'), "SiteChrome must NOT categorize /products as student portal");
      assert(!siteChromeContent.includes('"/for-students"'), "SiteChrome must NOT categorize /for-students as student portal");
      assert(!siteChromeContent.includes('"/for-tutors"'), "SiteChrome must NOT categorize /for-tutors as student portal");
    });
  }

  console.log("\n=========================================================================");
  console.log(`  PUBLIC WEBSITE ARCHITECTURE TESTS COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

void runPublicWebsiteArchitectureTests();
