import fs from "fs";
import path from "path";

const migrationsDir = path.resolve("supabase/migrations");
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

console.log(`Found ${files.length} SQL migrations in supabase/migrations:\n`);

files.forEach((file, idx) => {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, "utf8");
  
  // Basic validation checks
  const isSecurityDefiner = /security\s+definer/i.test(sql);
  const setsSearchPath = /set\s+search_path\s*=/i.test(sql);
  
  if (isSecurityDefiner && !setsSearchPath) {
    console.warn(`⚠️  [${idx + 1}/${files.length}] ${file}: Has SECURITY DEFINER but may lack 'set search_path'`);
  } else {
    console.log(`✅ [${idx + 1}/${files.length}] ${file} (${(sql.length / 1024).toFixed(1)} KB)`);
  }
});

console.log(`\nAll ${files.length} migrations ordered chronologically.`);
