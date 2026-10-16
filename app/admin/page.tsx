import { redirect } from "next/navigation";

/**
 * Keep the legacy /admin URL compatible without rendering the old, unguarded
 * settings UI. The dashboard performs its own UI session check, and database
 * RLS remains the actual authorization boundary for all admin data/actions.
 */
export default function AdminPage() {
  redirect("/admin/dashboard");
}
