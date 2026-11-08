import fs from "fs";
import path from "path";
import assert from "assert";

let passedCount = 0;
let failedCount = 0;

function it(description: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err?.message || err}`);
    failedCount++;
  }
}

function runInstructorArchitectureTests() {
  console.log("=========================================================================");
  console.log("  BRAINLAB CBT: INSTRUCTOR PORTAL ARCHITECTURAL INTEGRITY TEST SUITE");
  console.log("=========================================================================\n");

  const rootDir = process.cwd();

  console.log("1. INSTRUCTOR PORTAL SHELL & NAVIGATION MODULES");
  {
    const shellPath = path.join(rootDir, "app/tutor/InstructorPortalShell.tsx");
    assert(fs.existsSync(shellPath), "InstructorPortalShell.tsx must exist");
    const shellContent = fs.readFileSync(shellPath, "utf8");

    it("InstructorPortalShell.tsx exports a default component", () => {
      assert(shellContent.includes("export default function InstructorPortalShell"), "Must export default InstructorPortalShell");
    });

    const expectedNavLinks = [
      { href: "/tutor", label: "My Subjects" },
      { href: "/tutor/questions", label: "Question Bank" },
      { href: "/tutor/syllabus", label: "Curriculum & Syllabus" },
      { href: "/tutor/content", label: "Lessons & Content" },
      { href: "/tutor/lesson-blocks", label: "Lesson Blocks" },
      { href: "/tutor/academic", label: "Academic Directory" },
      { href: "/calendar", label: "Timetable & Classes" },
      { href: "/classroom/studio", label: "Lesson Studio" },
      { href: "/classroom/stem", label: "STEM Studio" },
      { href: "/tutor/stem-grading", label: "Virtual Lab Grading" },
      { href: "/tutor/assignments", label: "Assignments" },
      { href: "/recordings", label: "Recordings" },
      { href: "/messages", label: "Learner Chat" },
    ];

    for (const link of expectedNavLinks) {
      it(`Instructor navigation includes module: ${link.label} (${link.href})`, () => {
        assert(shellContent.includes(`href: "${link.href}"`), `Must include href ${link.href}`);
        assert(shellContent.includes(`label: "${link.label}"`), `Must include label ${link.label}`);
      });
    }
  }

  console.log("\n2. ACCESS CONTROL & ROLE-BASED PRIVILEGE BOUNDARIES");
  {
    const shellPath = path.join(rootDir, "app/tutor/InstructorPortalShell.tsx");
    const shellContent = fs.readFileSync(shellPath, "utf8");

    it("Redirects unauthenticated visitors to login with destination redirect", () => {
      assert(shellContent.includes("supabase.auth.getSession()"), "Must check user session");
      assert(shellContent.includes("router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)"), "Must redirect unauthenticated users to login");
    });

    it("Restricts portal to instructor/admin roles or subject memberships", () => {
      assert(shellContent.includes("get_admin_role"), "Must query authoritative get_admin_role RPC");
      assert(shellContent.includes("isInstructorRole"), "Must verify instructor role");
      assert(shellContent.includes("isGovernanceAdminRole"), "Must verify admin role");
      assert(shellContent.includes("learning_subject_memberships"), "Must check subject teaching memberships");
      assert(shellContent.includes('router.replace("/dashboard")'), "Must redirect unauthorized students back to student dashboard");
    });
  }

  console.log("\n3. WORKSPACE ISOLATION & SEO GUARDS (NOINDEX)");
  {
    const tutorLayoutPath = path.join(rootDir, "app/tutor/layout.tsx");
    assert(fs.existsSync(tutorLayoutPath), "app/tutor/layout.tsx must exist");
    const tutorLayoutContent = fs.readFileSync(tutorLayoutPath, "utf8");

    it("app/tutor/layout.tsx enforces robots noindex", () => {
      assert(tutorLayoutContent.includes("robots: { index: false, follow: false"), "Tutor layout must specify robots noindex");
    });

    const instructorLayoutPath = path.join(rootDir, "app/instructor/layout.tsx");
    assert(fs.existsSync(instructorLayoutPath), "app/instructor/layout.tsx must exist");
    const instructorLayoutContent = fs.readFileSync(instructorLayoutPath, "utf8");

    it("app/instructor/layout.tsx enforces robots noindex", () => {
      assert(instructorLayoutContent.includes("robots: { index: false, follow: false"), "Instructor layout must specify robots noindex");
    });

    const siteChromePath = path.join(rootDir, "app/components/SiteChrome.tsx");
    const siteChromeContent = fs.readFileSync(siteChromePath, "utf8");

    it("SiteChrome.tsx isolates instructor and tutor workspaces from public marketing chrome", () => {
      assert(siteChromeContent.includes("isInstructorArea"), "SiteChrome must recognize isInstructorArea");
      assert(siteChromeContent.includes('pathname === "/tutor"'), "Must detect /tutor");
      assert(siteChromeContent.includes('pathname === "/instructor"'), "Must detect /instructor");
      assert(siteChromeContent.includes("if (isInstructorArea)"), "Must return isolated shell without BrandHeader/BrandFooter");
    });
  }

  console.log("\n4. CANONICAL INSTRUCTOR ALIAS ROUTES & PERMANENT REDIRECTS");
  {
    const aliases = [
      { file: "app/instructor/page.tsx", target: "/tutor" },
      { file: "app/instructor/courses/page.tsx", target: "/tutor/academic" },
      { file: "app/instructor/assignments/page.tsx", target: "/tutor/assignments" },
      { file: "app/instructor/live/page.tsx", target: "/calendar" },
      { file: "app/instructor/profile/page.tsx", target: "/tutor/profile" },
      { file: "app/instructor/recordings/page.tsx", target: "/recordings" },
      { file: "app/instructor/studio/page.tsx", target: "/classroom/studio" },
    ];

    for (const a of aliases) {
      it(`Alias ${a.file} redirects to ${a.target}`, () => {
        const fullPath = path.join(rootDir, a.file);
        assert(fs.existsSync(fullPath), `Alias file must exist: ${a.file}`);
        const content = fs.readFileSync(fullPath, "utf8");
        assert(
          content.includes(`redirect("${a.target}")`) || content.includes(`redirect('${a.target}')`),
          `Expected redirect("${a.target}") in ${a.file}`
        );
      });
    }
  }

  console.log("\n5. FUNCTIONAL INSTRUCTOR PAGES INTEGRITY");
  {
    const functionalPages = [
      "app/tutor/page.tsx",
      "app/tutor/questions/page.tsx",
      "app/tutor/syllabus/page.tsx",
      "app/tutor/content/page.tsx",
      "app/tutor/lesson-blocks/page.tsx",
      "app/tutor/academic/page.tsx",
      "app/tutor/stem-grading/page.tsx",
      "app/tutor/assignments/page.tsx",
      "app/tutor/profile/page.tsx",
      "app/tutor/recordings/page.tsx",
      "app/classroom/studio/page.tsx",
    ];

    for (const p of functionalPages) {
      it(`Functional instructor page exists and exports default component: ${p}`, () => {
        const fullPath = path.join(rootDir, p);
        assert(fs.existsSync(fullPath), `File must exist: ${p}`);
        const content = fs.readFileSync(fullPath, "utf8");
        assert(content.includes("export default function"), `${p} must have default export`);
      });
    }
  }

  console.log("\n=========================================================================");
  console.log(`  INSTRUCTOR ARCHITECTURE TESTS COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runInstructorArchitectureTests();
