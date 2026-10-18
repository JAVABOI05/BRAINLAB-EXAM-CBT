"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import "../admin.css";

type Organisation = { id: string; name: string; slug: string; status: string };
type Assessment = { id: string; title: string; assessment_type: string; organisation_id: string | null };
type AccessCode = { id: string; code_hint: string; scope_type: string; membership_type: string | null; resource_key: string | null; organisation_id: string | null; assessment_id: string | null; max_questions: number; permanent: boolean; expires_at: string | null; max_redemptions: number; redemption_count: number; revoked_at: string | null; created_at: string };

const slugify = (value: string) => value.toLowerCase().trim().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export default function AcademyAccessAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [organisationName, setOrganisationName] = useState("");
  const [scope, setScope] = useState<"membership"|"assessment"|"resource"|"organisation">("membership");
  const [membershipType, setMembershipType] = useState("brainlab_tutorial");
  const [resourceKey, setResourceKey] = useState("");
  const [organisationId, setOrganisationId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [permanent, setPermanent] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [maxQuestions, setMaxQuestions] = useState(50);
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [o,a,c] = await Promise.all([
      supabase.from("learning_organisations").select("id,name,slug,status").order("name"),
      supabase.from("learning_assessments").select("id,title,assessment_type,organisation_id").order("created_at",{ascending:false}),
      supabase.from("learning_access_codes").select("id,code_hint,scope_type,membership_type,resource_key,organisation_id,assessment_id,max_questions,permanent,expires_at,max_redemptions,redemption_count,revoked_at,created_at").order("created_at",{ascending:false}).limit(100),
    ]);
    if (o.error || a.error || c.error) {
      setError("Could not load access administration. Your role may not have access to every section.");
    }
    setOrganisations((o.data ?? []) as Organisation[]);
    setAssessments((a.data ?? []) as Assessment[]);
    setCodes((c.data ?? []) as AccessCode[]);
    setOrganisationId((v) => v || o.data?.[0]?.id || "");
    setAssessmentId((v) => v || a.data?.[0]?.id || "");
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) { router.replace("/account"); return; }
      setAdmin(session);
      const [canCodes,canLearning,canInstitution] = await Promise.all([adminHasPermission("cbt.codes.manage"),adminHasPermission("learning.content.manage"),adminHasPermission("institution.manage")]);
      if (!active) return;
      if (!canCodes && !canLearning && !canInstitution && !["super_admin","platform_admin"].includes(session.role)) {
        setError("You do not have permission to manage access codes or organisations.");
        setLoading(false); return;
      }
      await load();
      if (active) setLoading(false);
    }
    void init().catch(() => { if (active) { setError("Could not verify administrator access."); setLoading(false); } });
    return () => { active = false; };
  }, [router, load]);

  async function createOrganisation(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!organisationName.trim()) return;
    setSaving(true); setError(""); setMessage("");
    const { data, error: rpcError } = await supabase.rpc("create_learning_organisation", {
      p_name: organisationName.trim(), p_slug: slugify(organisationName),
    });
    if (rpcError) setError(rpcError.message);
    else { setOrganisationName(""); setOrganisationId(data.id); setMessage("Organisation created and your account assigned as owner."); await load(); }
    setSaving(false);
  }

  async function createCode(event: { preventDefault: () => void }) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage(""); setGeneratedCode("");
    if (!permanent && (!expiresAt || new Date(expiresAt).getTime() <= Date.now())) {
      setError("Choose a future expiry time for temporary codes."); setSaving(false); return;
    }
    if (scope === "organisation" && !organisationId) { setError("Choose an organisation."); setSaving(false); return; }
    if (scope === "assessment" && !assessmentId) { setError("Choose an assessment."); setSaving(false); return; }
    if (scope === "resource" && !resourceKey.trim()) { setError("Enter the resource key this code unlocks."); setSaving(false); return; }
    if (scope === "membership" && !membershipType.trim()) { setError("Enter the membership type."); setSaving(false); return; }

    const { data, error: rpcError } = await supabase.rpc("create_learning_access_code", {
      p_scope_type: scope,
      p_permanent: permanent,
      p_expires_at: permanent ? null : new Date(expiresAt).toISOString(),
      p_max_redemptions: permanent ? 1 : Math.max(1, maxRedemptions),
      p_max_questions: Math.min(500,Math.max(1,maxQuestions)),
      p_membership_type: scope === "membership" ? membershipType.trim() : null,
      p_resource_key: scope === "resource" ? resourceKey.trim() : null,
      p_organisation_id: scope === "organisation" ? organisationId : null,
      p_assessment_id: scope === "assessment" ? assessmentId : null,
    });
    if (rpcError) setError(rpcError.message);
    else if (!data?.ok || !data?.code) setError("The database did not return a new code.");
    else { setGeneratedCode(data.code); setMessage("Code created. Copy it now: the full code is shown only once."); setMaxRedemptions(1); await load(); }
    setSaving(false);
  }

  async function revokeCode(code: AccessCode) {
    if (code.revoked_at || !window.confirm("Revoke this access code? Existing entitlements already redeemed are not automatically revoked.")) return;
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("learning_access_codes").update({ revoked_at: new Date().toISOString() }).eq("id",code.id);
    if (updateError) setError(updateError.message); else { setMessage("Code revoked. Previously redeemed access remains active until separately revoked."); await load(); }
    setSaving(false);
  }

  async function toggleOrganisation(org: Organisation) {
    const next = org.status === "active" ? "suspended" : "active";
    if (!window.confirm(`${next === "suspended" ? "Suspend" : "Reactivate"} ${org.name}?`)) return;
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await supabase.from("learning_organisations").update({ status: next }).eq("id",org.id);
    if (updateError) setError(updateError.message); else { setMessage(`Organisation ${next}.`); await load(); }
    setSaving(false);
  }

  if (loading) return <main className="admin-page"><div className="admin-container"><section className="admin-card">Loading membership and access controls…</section></div></main>;
  return <main className="admin-page"><div className="admin-container">
    <section className="admin-hero"><div className="admin-hero-top"><div><div className="admin-badge">BrainLab Academy · Membership administration</div><h1 className="admin-title">Organisations & Access</h1><p className="admin-subtitle">Create organisations, issue account-bound permanent membership codes, issue expiring codes, and revoke unused codes. Access is enforced server-side.</p>{admin && <div className="admin-user-chip">{admin.email} · {admin.role.replaceAll("_"," ")}</div>}</div><div className="admin-actions"><button className="admin-btn-light" onClick={() => router.push("/admin/dashboard")}>Dashboard</button><button className="admin-btn-light" onClick={() => router.push("/admin/users")}>Admin roles</button></div></div></section>
    {error && <div className="admin-message" role="alert">{error}</div>}{message && <div className="admin-message" role="status">{message}</div>}
    <section className="admin-section admin-grid-2">
      <form className="admin-card" onSubmit={createOrganisation}><h2 className="admin-card-title">Create organisation</h2><p className="admin-card-text">Create a school, tutorial centre, or other organisation. The creator becomes its owner.</p><label className="admin-label">Organisation name</label><input className="admin-input" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} required maxLength={200} placeholder="e.g. BrainLab Tutorial Centre" /><p className="admin-help">Slug: {slugify(organisationName) || "organisation-slug"}</p><button className="admin-btn-primary" disabled={saving || !organisationName.trim()}>Create organisation</button></form>
      <form className="admin-card" onSubmit={createCode}><h2 className="admin-card-title">Issue access code</h2>
        <label className="admin-label">Code scope</label><select className="admin-input" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}><option value="membership">BrainLab Tutorial membership</option><option value="organisation">Organisation membership</option><option value="assessment">Specific assessment</option><option value="resource">Specific resource</option></select>
        {scope === "membership" && <><label className="admin-label">Membership type</label><input className="admin-input" value={membershipType} onChange={(e) => setMembershipType(e.target.value)} required /></>}
        {scope === "organisation" && <><label className="admin-label">Organisation</label><select className="admin-input" value={organisationId} onChange={(e) => setOrganisationId(e.target.value)} required><option value="">Choose organisation</option>{organisations.filter((o) => o.status === "active").map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></>}
        {scope === "assessment" && <><label className="admin-label">Assessment</label><select className="admin-input" value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)} required><option value="">Choose assessment</option>{assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></>}
        {scope === "resource" && <><label className="admin-label">Resource key</label><input className="admin-input" value={resourceKey} onChange={(e) => setResourceKey(e.target.value)} required placeholder="e.g. biology-revision-pack-01" /></>}
        <label className="admin-toggle mt-3"><input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} /><span>Permanent account-bound code (single redemption, no expiry)</span></label>
        {!permanent && <><label className="admin-label">Expiry date and time</label><input className="admin-input" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required /><label className="admin-label">Maximum redemptions</label><input className="admin-input" type="number" min={1} max={100000} value={maxRedemptions} onChange={(e) => setMaxRedemptions(Number(e.target.value) || 1)} /></>}
        <label className="admin-label">Self-practice question limit</label><input className="admin-input" type="number" min={1} max={500} value={maxQuestions} onChange={(e) => setMaxQuestions(Number(e.target.value) || 50)} /><p className="admin-help">Free accounts default to 50 questions per attempt. Membership entitlements can raise this limit up to 500.</p>
        <button className="admin-btn-primary" disabled={saving}>Generate code</button>
      </form>
    </section>
    {generatedCode && <section className="admin-section admin-card"><h2 className="admin-card-title">New code — copy it now</h2><p className="admin-card-text">The database stores a hash, not the plaintext code. Once you leave this screen, this full code cannot be retrieved.</p><div className="flex flex-wrap items-center gap-3"><code className="rounded bg-slate-100 px-4 py-3 text-lg break-all">{generatedCode}</code><button className="admin-btn-primary" onClick={() => { void navigator.clipboard?.writeText(generatedCode); setMessage("Code copied if clipboard access was available."); }}>Copy code</button></div></section>}
    <section className="admin-section admin-card"><h2 className="admin-card-title">Organisations</h2>{organisations.length===0 ? <p className="admin-help">No organisations available to this administrator.</p> : organisations.map((o) => <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><strong>{o.name}</strong><p className="admin-help">{o.slug} · {o.status}</p></div><button className="admin-btn-light" disabled={saving} onClick={() => void toggleOrganisation(o)}>{o.status === "active" ? "Suspend" : "Reactivate"}</button></div>)}</section>
    <section className="admin-section admin-card"><h2 className="admin-card-title">Issued codes</h2><p className="admin-card-text">Only the last four characters are listed. Revoking a code prevents future redemption; it does not automatically revoke entitlements already issued.</p>{codes.length===0 ? <p className="admin-help">No codes visible to this administrator.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2 pr-3">Code</th><th className="py-2 pr-3">Scope</th><th className="py-2 pr-3">Question limit</th><th className="py-2 pr-3">Redemptions</th><th className="py-2 pr-3">Expiry</th><th className="py-2 pr-3">Status</th><th className="py-2">Action</th></tr></thead><tbody>{codes.map((c) => <tr key={c.id} className="border-t"><td className="py-3 pr-3">•••• {c.code_hint}</td><td className="py-3 pr-3">{c.scope_type.replaceAll("_"," ")}</td><td className="py-3 pr-3">{c.max_questions}</td><td className="py-3 pr-3">{c.redemption_count}/{c.max_redemptions}</td><td className="py-3 pr-3">{c.permanent ? "Permanent" : c.expires_at ? new Date(c.expires_at).toLocaleString() : "—"}</td><td className="py-3 pr-3">{c.revoked_at ? "Revoked" : !c.permanent && c.expires_at && new Date(c.expires_at) < new Date() ? "Expired" : "Active"}</td><td className="py-3"><button className="admin-btn-light" disabled={saving || !!c.revoked_at} onClick={() => void revokeCode(c)}>Revoke</button></td></tr>)}</tbody></table></div>}</section>
  </div></main>;
}
