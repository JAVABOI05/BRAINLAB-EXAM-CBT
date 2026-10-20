const fs = require("fs");

const file = "app/admin/academy-results/page.tsx";
let content = fs.readFileSync(file, "utf8");
const isCrlf = content.includes("\r\n");
content = content.replace(/\r\n/g, "\n");

const exportFunction = `  function exportCsv() {
    if (!attempts.length || !selected) return;
    const headers = ["Learner ID", "Attempt Number", "Status", "Score", "Total Marks", "Percentage", "Answers Count", "Started At", "Submitted At", "Auto Submitted"];
    const rows = attempts.map((a) => [
      a.user_id,
      a.attempt_number,
      a.status,
      a.score ?? "",
      a.total ?? "",
      a.percentage ? \`\${a.percentage}%\` : "",
      a.answer_count,
      new Date(a.started_at).toISOString(),
      a.submitted_at ? new Date(a.submitted_at).toISOString() : "",
      a.auto_submitted ? "Yes" : "No",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => \`"\${String(c).replace(/"/g, '""')}"\`).join(","))].join("\\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = \`\${selected.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-results.csv\`;
    link.click();
    URL.revokeObjectURL(url);
  }
`;

content = content.replace(
  '  const selected=assessments.find((a)=>a.id===assessmentId);',
  `${exportFunction}\n  const selected=assessments.find((a)=>a.id===assessmentId);`
);

content = content.replace(
  '<div className="mt-6 flex justify-end"><button className="admin-btn-primary" disabled={working||!assessmentId} onClick={()=>{setWorking(true);void loadResults(assessmentId);}}>{working?"Loading…":"Refresh results"}</button></div>',
  '<div className="mt-6 flex flex-wrap items-center justify-end gap-3"><button type="button" className="admin-btn-light" disabled={!attempts.length} onClick={exportCsv}>📥 Export CSV</button><button className="admin-btn-primary" disabled={working||!assessmentId} onClick={()=>{setWorking(true);void loadResults(assessmentId);}}>{working?"Loading…":"Refresh results"}</button></div>'
);

if (isCrlf) content = content.replace(/\n/g, "\r\n");
fs.writeFileSync(file, content, "utf8");
console.log("Added CSV export to academy-results/page.tsx");
