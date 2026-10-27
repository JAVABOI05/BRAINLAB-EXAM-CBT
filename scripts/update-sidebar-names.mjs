import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("app/components/ClassroomSidebar.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Add formatSafeName helper right before ClassroomSidebar component
const helperCode = `
export function formatSafeName(name?: string | null): string {
  if (!name) return "Learner";
  if (name.includes("@")) {
    const handle = name.split("@")[0];
    return handle.charAt(0).toUpperCase() + handle.slice(1);
  }
  return name;
}
`;

content = content.replace("export default function ClassroomSidebar({", `${helperCode}\nexport default function ClassroomSidebar({`);

// 2. Replace currentUserName
content = content.replace(
  `  const currentUserName =\n    currentUser?.user_metadata?.full_name || currentUser?.email?.split("@")[0] || "Me";`,
  `  const currentUserName =\n    currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "Learner";`
);

// 3. Replace {m.senderName}
content = content.replace(
  `{m.senderName} {m.isHost && "(Tutor)"}`,
  `{formatSafeName(m.senderName)} {m.isHost && "(Tutor)"}`
);

// 4. Replace {p.name} in instructors
content = content.replace(
  `<p className="font-bold text-white">{p.name}</p>`,
  `<p className="font-bold text-white">{formatSafeName(p.name)}</p>`
);

// 5. Replace {p.name} in students
content = content.replace(
  `<p className="font-semibold text-white">{p.name}</p>`,
  `<p className="font-semibold text-white">{formatSafeName(p.name)}</p>`
);

content = content.replace(
  `{p.name.charAt(0).toUpperCase()}`,
  `{formatSafeName(p.name).charAt(0).toUpperCase()}`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully updated ClassroomSidebar.tsx name masking!");
