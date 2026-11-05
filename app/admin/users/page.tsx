"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { ADMIN_ROLES, ADMIN_ROLE_DETAILS, type AdminRole } from "../../lib/adminRoles";
import AdminPinGuard from "@/app/components/AdminPinGuard";

type AdminProfile = {
  user_id: string;
  email: string;
  role: AdminRole;
  created_at: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("cbt_admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfiles = useCallback(async () => {
    setError("");
    const { data, error: listError } = await supabase.rpc("list_admin_profiles");
    if (listError) {
      setError("The role-management database migration is not available here, or your account lacks permission. No changes were made.");
      setProfiles([]);
      return;
    }
    setProfiles((data ?? []) as AdminProfile[]);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) {
        router.replace("/login");
        return;
      }
      if (admin.role !== "super_admin") {
        router.replace("/admin/dashboard");
        return;
      }
      setCurrentAdmin(admin);
      await loadProfiles();
      if (active) setLoading(false);
    }
    void initialize().catch(() => {
      if (active) {
        setError("We could not verify administrator permissions.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [loadProfiles, router]);

  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const id = targetUserId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      setError("Enter the user's valid Supabase Auth UUID.");
      return;
    }
    if (newRole === "super_admin" && !window.confirm("Grant full Super Admin privileges? This person will be able to manage administrator roles and critical platform controls.")) return;

    setSaving(true);
    const { error: saveError } = await supabase.rpc("set_admin_role", {
      target_user_id: id,
      new_role: newRole,
    });
    if (saveError) {
      setError(saveError.message.includes("does not exist") || saveError.message.includes("Could not find the function")
        ? "Role-management functions are not installed in this environment. No changes were made."
        : "The role could not be changed. Verify the user UUID and your Super Admin permissions.");
    } else {
      setMessage("Administrator role saved and an audit event was recorded.");
      setTargetUserId("");
      await loadProfiles();
    }
    setSaving(false);
  }

  async function removeRole(profile: AdminProfile) {
    if (profile.user_id === currentAdmin?.id) {
      setError("You cannot remove your own role here. Ask another Super Admin to review it.");
      return;
    }
    if (!window.confirm(`Remove administrator access for ${profile.email}? They will remain a normal BrainLab account.`)) return;
    setError("");
    setMessage("");
    setSaving(true);
    const { error: removeError } = await supabase.rpc("remove_admin_role", {
      target_user_id: profile.user_id,
    });
    if (removeError) {
      setError("Administrator access could not be removed. The database rejected the operation.");
    } else {
      setMessage("Administrator access removed and an audit event was recorded.");
      await loadProfiles();
    }
    setSaving(false);
  }

  if (loading) {
    return <main className="mx-auto min-h-[60vh] max-w-5xl px-5 py-16"><p className="text-slate-600">Verifying Super Admin access…</p></main>;
  }

  return (
    <main id="main" className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6">
      <AdminPinGuard
        title="Administrator Roles & Security Authorization"
        description="This workspace modifies database-level administrator roles and platform governance privileges. Enter your Admin Security PIN to continue."
      >
      <header className="rounded-3xl bg-[#012153] p-7 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Restricted · Super Admin only</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Administrator access</h1>
        <p className="mt-4 max-w-3xl leading-7 text-blue-100">Assign each operator the minimum role needed for their work. Role changes are checked by the database and written to the audit log. This page never creates a Supabase Auth account or grants access based on email alone.</p>
        <button onClick={() => router.push("/admin/dashboard")} className="mt-6 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-bold hover:bg-white/10">← Admin dashboard</button>
      </header>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-extrabold text-slate-950">Assign or change a role</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Copy the user&apos;s UUID from Supabase Authentication. The database verifies that the account exists before applying a role.</p>
        <form onSubmit={assignRole} className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="admin-user-id" className="mb-2 block text-sm font-semibold text-slate-700">Supabase Auth user UUID</label>
            <input id="admin-user-id" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" required />
          </div>
          <div>
            <label htmlFor="admin-role" className="mb-2 block text-sm font-semibold text-slate-700">Role to assign</label>
            <select id="admin-role" value={newRole} onChange={(event) => setNewRole(event.target.value as AdminRole)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100">
              {ADMIN_ROLES.map((role) => <option key={role} value={role}>{ADMIN_ROLE_DETAILS[role].label}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving} className="min-h-12 rounded-xl bg-[#012153] px-5 py-3 font-bold text-white hover:bg-blue-900 disabled:opacity-60">{saving ? "Saving…" : "Save role"}</button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
      </section>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-extrabold text-slate-950">Current administrator accounts</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Only the database-authorized Super Admin can retrieve this list. Removing a role does not delete the person&apos;s learner account.</p>
        {profiles.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No administrator list is available. Confirm that the reviewed role-hierarchy migration has been applied to this environment.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3 font-bold">Account</th><th className="p-3 font-bold">Role</th><th className="p-3 font-bold">Assigned</th><th className="p-3 font-bold">Action</th></tr></thead>
              <tbody>
                {profiles.map((profile) => <tr key={profile.user_id} className="border-t border-slate-100">
                  <td className="p-3"><p className="font-semibold text-slate-900">{profile.email || "Email unavailable"}</p><p className="mt-1 font-mono text-xs text-slate-500">{profile.user_id}</p></td>
                  <td className="p-3"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">{ADMIN_ROLE_DETAILS[profile.role]?.label ?? profile.role}</span></td>
                  <td className="p-3 text-slate-600">{new Date(profile.created_at).toLocaleDateString()}</td>
                  <td className="p-3"><button type="button" disabled={saving || profile.user_id === currentAdmin?.id} onClick={() => void removeRole(profile)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Remove access</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_ROLES.map((role) => <article key={role} className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-extrabold text-slate-950">{ADMIN_ROLE_DETAILS[role].label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{ADMIN_ROLE_DETAILS[role].summary}</p>
        </article>)}
      </section>
      </AdminPinGuard>
    </main>
  );
}
