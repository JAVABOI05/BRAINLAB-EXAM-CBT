"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import AdminPinGuard from "@/app/components/AdminPinGuard";

type Role = {
  id: string; role_key: string; name: string; description: string;
  is_system: boolean; is_active: boolean; permissions: string[];
};
type Permission = {
  permission_key: string; module_key: string; label: string;
  description: string; is_sensitive: boolean;
};
type Account = { user_id: string; email: string; display_name: string; has_staff_access: boolean };
type Assignment = {
  assignment_id: string; user_id: string; email: string; display_name: string;
  role_id: string; role_key: string; role_name: string;
  assigned_at: string; expires_at: string | null; resource_scope: Record<string, unknown>;
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950";
const panelClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6";
const buttonClass = "inline-flex items-center justify-center rounded-xl bg-[#1356E8] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [scopeText, setScopeText] = useState("{}");
  const [expiresAt, setExpiresAt] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");

  const loadData = useCallback(async () => {
    setError("");
    const [roleResult, permissionResult, assignmentResult] = await Promise.all([
      supabase.rpc("access_list_role_catalogue"),
      supabase.rpc("access_list_permissions"),
      supabase.rpc("access_list_assignments"),
    ]);
    const failed = [roleResult.error, permissionResult.error, assignmentResult.error].find(Boolean);
    if (failed) {
      setError("The People & Access database migrations are not installed in this environment yet. No access changes were made.");
      return;
    }
    const roleRows = (roleResult.data ?? []) as Role[];
    setRoles(roleRows);
    setPermissions((permissionResult.data ?? []) as Permission[]);
    setAssignments((assignmentResult.data ?? []) as Assignment[]);
    if (roleRows.length) setSelectedRole(current => current || roleRows.find(r => r.is_system && r.role_key === "teacher")?.id || roleRows[0].id);
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession(undefined, true);
      if (!active) return;
      if (!admin) { router.replace("/login"); return; }
      if (admin.role !== "super_admin") { router.replace("/admin/dashboard"); return; }
      setCurrentAdmin(admin);
      await loadData();
      if (active) setLoading(false);
    }
    void init().catch(() => {
      if (active) { setError("Unable to verify Super Admin access."); setLoading(false); }
    });
    return () => { active = false; };
  }, [loadData, router]);

  const permissionGroups = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      (acc[permission.module_key] ??= []).push(permission);
      return acc;
    }, {});
  }, [permissions]);

  async function searchAccounts() {
    setError(""); setNotice(""); setSelectedAccount(null); setAccounts([]); setHasSearched(false);
    if (query.trim().length < 2) { setError("Enter at least two characters to search."); return; }
    setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("access_search_accounts", { search_text: query.trim() });
      if (rpcError) setError("Account search failed. Confirm the directory migration and Super Admin session.");
      else {
        setAccounts((data ?? []) as Account[]);
        setHasSearched(true);
      }
    } catch {
      setError("Account search could not be completed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function assignSelectedRole() {
    if (!selectedAccount || !selectedRole) { setError("Select an account and a role first."); return; }
    let scope: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(scopeText || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      scope = parsed as Record<string, unknown>;
    } catch { setError("Resource scope must be valid JSON in object format, for example {}."); return; }
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("access_assign_role", {
      target_user_id: selectedAccount.user_id,
      target_role_id: selectedRole,
      resource_scope: scope,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    if (rpcError) setError(rpcError.message || "The role assignment was rejected.");
    else {
      setNotice("Role assignment saved to the staged access catalogue and recorded in the audit log. It does not grant live platform access until the authorization cutover is approved.");
      setSelectedAccount(null); setAccounts([]); setHasSearched(false); setQuery(""); setExpiresAt(""); setScopeText("{}");
      await loadData();
    }
    setBusy(false);
  }

  function beginCreateRole() {
    setEditingRole(null); setRoleName(""); setRoleDescription(""); setSelectedPermissions([]);
  }
  function beginEditRole(role: Role) {
    setEditingRole(role); setRoleName(role.name); setRoleDescription(role.description); setSelectedPermissions(role.permissions ?? []);
  }
  function togglePermission(key: string) {
    setSelectedPermissions(current => current.includes(key) ? current.filter(p => p !== key) : [...current, key]);
  }
  async function saveCustomRole() {
    if (roleName.trim().length < 2 || selectedPermissions.length === 0) {
      setError("Give the role a name and select at least one permission."); return;
    }
    setBusy(true); setError(""); setNotice("");
    const result = editingRole
      ? await supabase.rpc("access_update_custom_role", {
          target_role_id: editingRole.id, role_name: roleName.trim(),
          role_description: roleDescription, permission_keys: selectedPermissions,
        })
      : await supabase.rpc("access_create_custom_role", {
          role_name: roleName.trim(), role_description: roleDescription,
          permission_keys: selectedPermissions,
        });
    if (result.error) setError(result.error.message || "The custom role could not be saved.");
    else {
      setNotice(editingRole ? "Custom role updated." : "Custom role created.");
      beginCreateRole(); await loadData();
    }
    setBusy(false);
  }

  async function revokeAssignment(row: Assignment) {
    if (!window.confirm(`Revoke ${row.role_name} access for ${row.display_name} (${row.email})?`)) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("access_revoke_role", {
      target_user_id: row.user_id, target_role_id: row.role_id,
    });
    if (rpcError) setError(rpcError.message || "The assignment could not be revoked.");
    else { setNotice("Staged role assignment revoked. Existing live access remains governed by the current authorization system."); await loadData(); }
    setBusy(false);
  }

  async function retireRole(role: Role) {
    if (!window.confirm(`Retire the custom role “${role.name}”? All active assignments to it will also be revoked.`)) return;
    setBusy(true); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("access_retire_custom_role", { target_role_id: role.id });
    if (rpcError) setError(rpcError.message || "The role could not be retired.");
    else { setNotice("Custom role retired and active assignments revoked."); await loadData(); }
    setBusy(false);
  }

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-16 text-sm text-slate-600 dark:text-slate-300">Verifying Super Admin access…</main>;

  const visibleAssignments = assignments.filter(row =>
    roleFilter === "all" || row.role_id === roleFilter
  );

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <AdminPinGuard title="People & Access Management" description="Restricted platform governance workspace. Verify your Admin Security PIN to manage staff access.">
        <header className="overflow-hidden rounded-3xl bg-[#0B1536] p-6 text-white sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-200">BrainLab Academy · Governance</p>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div><h1 className="text-3xl font-black sm:text-4xl">People & Access Centre</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Find registered accounts, assign multiple roles, build custom permission sets and review active access—all without copying Auth UUIDs.</p></div>
            <button onClick={() => router.push("/admin/dashboard")} className="w-fit rounded-xl border border-white/30 px-4 py-2.5 text-sm font-bold hover:bg-white/10">← Dashboard</button>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-200">System roles</p><p className="mt-1 text-2xl font-black">{roles.filter(r => r.is_system).length}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-200">Custom roles</p><p className="mt-1 text-2xl font-black">{roles.filter(r => !r.is_system && r.is_active).length}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-200">Staged assignments</p><p className="mt-1 text-2xl font-black">{assignments.length}</p></div>
          </div>
        </header>

        {(error || notice) && <div className={`mt-5 rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"}`} role={error ? "alert" : "status"}>{error || notice}</div>}

        <section className={`mt-6 ${panelClass}`}>
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"><strong>Staged implementation notice:</strong> This workspace currently manages the new access catalogue only. Saved assignments and custom permissions are not yet used to authorize sign-in, dashboards, APIs or database rows. Existing BrainLab access remains unchanged until the separate compatibility and security cutover is tested and approved.</div>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">Find a BrainLab account</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Search by registered name or email. Search results are not access grants.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">Super Admin only</span></div>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={e => { e.preventDefault(); void searchAccounts(); }}>
            <input className={inputClass} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or email address" aria-label="Search registered accounts" />
            <button className={buttonClass} disabled={busy}>Search accounts</button>
          </form>
          {accounts.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {accounts.map(account => <button key={account.user_id} type="button" onClick={() => setSelectedAccount(account)} className={`rounded-xl border p-4 text-left transition ${selectedAccount?.user_id === account.user_id ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40" : "border-slate-200 hover:border-blue-400 dark:border-slate-800"}`}>
              <span className="block font-bold">{account.display_name}</span><span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">{account.email}</span><span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{account.has_staff_access ? "Has active staff access" : "No active staff access"}</span>
            </button>)}
          </div>}
          {hasSearched && accounts.length === 0 && <p className="mt-3 text-sm text-slate-500">No registered accounts matched that name or email.</p>}
          {selectedAccount && <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <h3 className="font-extrabold">Prepare an additional role assignment</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{selectedAccount.display_name} · {selectedAccount.email}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold">Role<select className={`mt-1 ${inputClass}`} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}><option value="">Choose a role</option>{roles.filter(r => r.is_active).map(r => <option key={r.id} value={r.id}>{r.name}{r.is_system ? " · System" : " · Custom"}</option>)}</select></label>
              <label className="text-sm font-semibold">Optional expiry<input className={`mt-1 ${inputClass}`} type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></label>
              <label className="text-sm font-semibold md:col-span-2">Resource scope (JSON object)<textarea className={`mt-1 min-h-20 ${inputClass}`} value={scopeText} onChange={e => setScopeText(e.target.value)} spellCheck={false} /></label>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">Use {} for platform-wide scope only when appropriate. Resource-level enforcement must be implemented by the relevant module before relying on a scope restriction.</p>
            <div className="mt-4 flex flex-wrap gap-2"><button className={buttonClass} disabled={busy || !selectedRole} onClick={() => void assignSelectedRole()}>Save staged assignment</button><button className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold dark:border-slate-700" onClick={() => setSelectedAccount(null)}>Cancel</button></div>
          </div>}
        </section>

        <section className={`mt-6 ${panelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Custom Role Builder</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Create a role name and select its exact permission set. Root governance permissions are protected.</p></div><button className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950" onClick={beginCreateRole}>New custom role</button></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="space-y-3">
              <label className="block text-sm font-semibold">Role name<input className={`mt-1 ${inputClass}`} value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Biology Content Lead" /></label>
              <label className="block text-sm font-semibold">Description<textarea className={`mt-1 min-h-24 ${inputClass}`} value={roleDescription} onChange={e => setRoleDescription(e.target.value)} placeholder="Describe the responsibilities and boundaries of this role." /></label>
              <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><p className="font-bold">{editingRole ? "Editing custom role" : "New custom role"}</p><p className="mt-1 text-slate-600 dark:text-slate-400">{selectedPermissions.length} permissions selected</p></div>
              <div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={() => void saveCustomRole()}>{editingRole ? "Save role changes" : "Create custom role"}</button><button className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold dark:border-slate-700" onClick={beginCreateRole}>Reset</button></div>
            </div>
            <div className="max-h-[560px] space-y-4 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              {Object.entries(permissionGroups).map(([module, items]) => <fieldset key={module}><legend className="mb-2 text-sm font-extrabold capitalize">{module.replaceAll("_", " ")}</legend><div className="grid gap-2 sm:grid-cols-2">{items.map(permission => <label key={permission.permission_key} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-900"><input type="checkbox" className="mt-1 accent-blue-600" checked={selectedPermissions.includes(permission.permission_key)} onChange={() => togglePermission(permission.permission_key)} disabled={permission.permission_key === "admin.roles.manage" || permission.permission_key === "security.settings.manage"} /><span><span className="block text-sm font-semibold">{permission.label}{permission.is_sensitive ? <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">Sensitive</span> : null}</span><span className="block text-xs text-slate-500">{permission.description}</span></span></label>)}</div></fieldset>)}
            </div>
          </div>
        </section>

        <section className={`mt-6 ${panelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Role catalogue</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">System roles are protected; custom roles can be edited or retired.</p></div></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{roles.map(role => <article key={role.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-start justify-between gap-2"><h3 className="font-extrabold">{role.name}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{role.is_system ? "System" : "Custom"}</span></div><p className="mt-2 min-h-10 text-sm text-slate-600 dark:text-slate-400">{role.description}</p><p className="mt-2 text-xs text-slate-500">{role.permissions?.length ?? 0} permissions · {role.is_active ? "Active" : "Retired"}</p>{!role.is_system && role.is_active && <div className="mt-3 flex gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700" onClick={() => beginEditRole(role)}>Edit</button><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900 dark:text-red-300" disabled={busy} onClick={() => void retireRole(role)}>Retire</button></div>}</article>)}</div>
        </section>

        <section className={`mt-6 ${panelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Staged role assignments</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">A person can hold multiple staged roles. These records do not yet alter live permissions. Revoking one staged role does not remove other roles or the learner account.</p></div><select className={`w-auto min-w-44 ${inputClass}`} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}><option value="all">All roles</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="p-3">Person</th><th className="p-3">Role</th><th className="p-3">Scope</th><th className="p-3">Expires</th><th className="p-3">Action</th></tr></thead><tbody>{visibleAssignments.map(row => <tr key={row.assignment_id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3"><span className="block font-bold">{row.display_name}</span><span className="text-xs text-slate-500">{row.email}</span></td><td className="p-3">{row.role_name}</td><td className="max-w-40 truncate p-3 font-mono text-xs text-slate-500">{JSON.stringify(row.resource_scope)}</td><td className="p-3 text-slate-600 dark:text-slate-400">{row.expires_at ? new Date(row.expires_at).toLocaleString() : "No expiry"}</td><td className="p-3"><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900 dark:text-red-300" disabled={busy || row.user_id === currentAdmin?.id} onClick={() => void revokeAssignment(row)}>Revoke</button></td></tr>)}{visibleAssignments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No active assignments found.</td></tr>}</tbody></table></div>
        </section>
      </AdminPinGuard>
    </main>
  );
}
