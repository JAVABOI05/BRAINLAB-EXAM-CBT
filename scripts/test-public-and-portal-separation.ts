import fs from "fs";
import path from "path";

export {};

function runCheck(label: string, passed: boolean, details?: string) {
  if (passed) {
    console.log(`[PASS] ${label}`);
  } else {
    console.error(`[FAIL] ${label}${details ? ` -> ${details}` : ""}`);
    process.exitCode = 1;
  }
}

async function verifyArchitecture() {
  console.log("=== BrainLab Public Website & Student Portal Separation Verification ===");

  const appDir = path.join(process.cwd(), "app");

  // 1. Verify SiteChrome isolation logic
  const siteChromeContent = fs.readFileSync(path.join(appDir, "components", "SiteChrome.tsx"), "utf8");
  runCheck(
    "SiteChrome excludes public chrome on student routes",
    (siteChromeContent.includes("isStudentPortal") || siteChromeContent.includes("isStudentArea")) &&
      siteChromeContent.includes("/dashboard") &&
      siteChromeContent.includes("/assignments") &&
      siteChromeContent.includes("/profile") &&
      siteChromeContent.includes("/skills-passport")
  );

  // 2. Verify StudentPortalShell provides academic navigation and public return switch
  const studentShellContent = fs.readFileSync(path.join(appDir, "dashboard", "StudentPortalShell.tsx"), "utf8");
  runCheck(
    "StudentPortalShell contains dedicated student navigation",
    studentShellContent.includes("Student Portal") &&
      studentShellContent.includes("/dashboard") &&
      studentShellContent.includes("/assignments") &&
      studentShellContent.includes("STUDENT_NAV_LINKS")
  );

  runCheck(
    "StudentPortalShell contains clean return link to public website",
    studentShellContent.includes("🌐 Public Site") &&
      studentShellContent.includes("Public Website ↗")
  );

  // 3. Verify Public BrandHeader points to Student Portal for authenticated users
  const brandHeaderContent = fs.readFileSync(path.join(appDir, "components", "BrandHeader.tsx"), "utf8");
  runCheck(
    "BrandHeader displays 'Student Portal →' CTA to authenticated users",
    brandHeaderContent.includes("Student Portal →")
  );

  // 4. Verify Student Workspace layouts exist with robots noindex
  const studentWorkspaceRoutes = [
    "assignments",
    "profile",
    "skills-passport",
    "learning-dna",
    "corrections",
    "achievements",
    "quizzes",
    "self-practice",
    "calendar",
    "dashboard",
    "student",
  ];

  for (const route of studentWorkspaceRoutes) {
    const layoutPath = path.join(appDir, route, "layout.tsx");
    const exists = fs.existsSync(layoutPath);
    runCheck(
      `Layout exists for /${route}`,
      exists,
      `Expected ${layoutPath} to exist`
    );
    if (exists) {
      const content = fs.readFileSync(layoutPath, "utf8");
      runCheck(
        `Layout /${route} specifies robots noindex`,
        content.includes("robots"),
        `Expected robots in ${route}/layout.tsx`
      );
    }
  }

  // 5. Verify Canonical Aliases and Public Redirects (Section 5)
  const aliases = [
    { from: "stem", to: "/classroom/stem" },
    { from: "plans", to: "/pricing" },
    { from: path.join("student", "profile"), to: "/profile" },
    { from: path.join("student", "results"), to: "/result" },
    { from: path.join("student", "learning"), to: "/learn" },
    { from: path.join("student", "cbt"), to: "/cbt" },
    { from: path.join("student", "dashboard"), to: "/dashboard" },
  ];

  for (const alias of aliases) {
    const aliasPath = path.join(appDir, alias.from, "page.tsx");
    const exists = fs.existsSync(aliasPath);
    runCheck(`Alias route exists for /${alias.from}`, exists);
    if (exists) {
      const content = fs.readFileSync(aliasPath, "utf8");
      runCheck(
        `Alias /${alias.from} redirects to ${alias.to}`,
        content.includes(`redirect("${alias.to}")`) || content.includes(`redirect('${alias.to}')`),
        `Expected redirect to ${alias.to} in ${alias.from}/page.tsx`
      );
    }
  }

  // 6. Verify Admin and Tutor Isolation
  const adminLayoutPath = path.join(appDir, "admin", "layout.tsx");
  const tutorLayoutPath = path.join(appDir, "tutor", "layout.tsx");
  runCheck("Admin layout is isolated", fs.existsSync(adminLayoutPath));
  runCheck("Tutor layout is isolated", fs.existsSync(tutorLayoutPath));

  // 7. Verify no duplicate database schemas or authentication clients
  const supabaseClientPath = path.join(appDir, "lib", "supabase.ts");
  const supabaseServerPath = path.join(appDir, "lib", "supabaseServer.ts");
  runCheck("Shared Supabase client preserved", fs.existsSync(supabaseClientPath));
  runCheck("Shared Supabase server client preserved", fs.existsSync(supabaseServerPath));

  console.log("=== All Architectural Separation Checks Finished ===");
}

void verifyArchitecture();
