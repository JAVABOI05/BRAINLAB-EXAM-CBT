"use client";

import { adminSignOut, getAdminSession } from "../../lib/adminAuth";
import { adminHasPermission } from "../../lib/adminRoles";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "@/app/admin/admin.css";

type AdminUser = {
  id: string;
  email: string;
  role: string;
};

type AccessCodeRow = {
  id: string;
  code: string;
  subject: string | null;
  is_used: boolean;
  used_by: string | null;
  is_exported: boolean;
  exported_at: string | null;
  created_at: string;
};

export default function AdminCodesPage() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [codes, setCodes] = useState<AccessCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [count, setCount] = useState(10);
  const [exportCount, setExportCount] = useState(20);

  const [message, setMessage] = useState("");
  const [masterCode, setMasterCode] = useState("");
  const [newMasterCode, setNewMasterCode] = useState("");

  const [showVouchers, setShowVouchers] = useState(false);
  const [voucherCodes, setVoucherCodes] = useState<string[]>([]);
  const [lastExportedCodes, setLastExportedCodes] = useState<string[]>([]);

  // Authenticated fetch helper attaching Bearer token
  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return fetch(input, { ...init, headers });
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const admin = await getAdminSession();
      if (!active) return;
      if (!admin) { router.replace("/account"); return; }
      if (!(await adminHasPermission("cbt.codes.manage"))) {
        if (active) { setMessage("You do not have permission to manage access codes."); setLoading(false); }
        return;
      }
      setAdminUser(admin);
      await loadCodes();
    }
    void init().catch(() => { if (active) { setMessage("Could not verify administrator access."); setLoading(false); } });
    return () => { active = false; };
  }, [router]);

  async function loadMasterCode() {
    const { data, error } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "master_access_code")
      .single();

    if (!error && data?.config_value) {
      const value =
        typeof data.config_value === "string"
          ? data.config_value
          : String(data.config_value);

      setMasterCode(value);
      setNewMasterCode(value);
    }
  }

  async function loadCodes() {
    setLoading(true);
    setMessage("");

    try {
      const res = await authFetch("/api/admin/codes?limit=5000");
      const data = await res.json();
      if (res.ok && data.ok) {
        setCodes((data.codes || []) as AccessCodeRow[]);
        if (data.masterCode) {
          setMasterCode(data.masterCode);
          setNewMasterCode(data.masterCode);
        }
      } else {
        setMessage(data.error || "Failed to load access codes.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load access codes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateCodes() {
    if (!count || count < 1) {
      setMessage("Enter a valid number of codes to generate.");
      return;
    }

    try {
      setGenerating(true);
      setMessage("");

      const res = await authFetch("/api/admin/codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(`Generate failed: ${data.error || "Unknown error"}`);
        return;
      }

      setMessage(
        `${data.count || count} access code(s) generated successfully and stored in database.`
      );

      await loadCodes();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to generate codes."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSetMasterCode() {
    const cleanCode = newMasterCode.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Enter a valid master access code.");
      return;
    }

    try {
      setWorking(true);
      setMessage("");

      const res = await authFetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_master", code: cleanCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(`Failed to set master code: ${data.error || "Unknown error"}`);
        return;
      }

      setMasterCode(cleanCode);
      setNewMasterCode(cleanCode);
      await loadCodes();
      setMessage("Master access code updated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update master code.");
    } finally {
      setWorking(false);
    }
  }

  async function resetCode(codeRow: AccessCodeRow) {
    if (codeRow.code === masterCode) {
      setMessage("Master code cannot be reset here.");
      return;
    }

    try {
      setWorking(true);
      setMessage("");

      const res = await authFetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_code", id: codeRow.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(`Reset failed: ${data.error || "Unknown error"}`);
        return;
      }

      setCodes((prev) =>
        prev.map((item) =>
          item.id === codeRow.id
            ? { ...item, is_used: false, used_by: null }
            : item
        )
      );

      setMessage(`Code ${codeRow.code} reset successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to reset code.");
    } finally {
      setWorking(false);
    }
  }

  async function resetAllUsed() {
    const confirmed = window.confirm(
      "Reset all used normal codes back to unused? The master code will not be touched."
    );
    if (!confirmed) return;

    try {
      setWorking(true);
      setMessage("");

      const res = await authFetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_all" }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(`Bulk reset failed: ${data.error || "Unknown error"}`);
        return;
      }

      await loadCodes();
      setMessage(`${data.count ?? 0} used code(s) reset successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to reset used codes.");
    } finally {
      setWorking(false);
    }
  }

  async function exportFreshCodes() {
    if (!exportCount || exportCount < 1) {
      setMessage("Enter a valid export count.");
      return;
    }

    try {
      setWorking(true);
      setMessage("");

      const res = await authFetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_fresh", count: exportCount }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(`Export failed: ${data.error || "Unknown error"}`);
        setLastExportedCodes([]);
        return;
      }

      const rows = (data.codes || []) as { code: string }[];

      if (rows.length === 0) {
        setMessage("No fresh unused codes available to export.");
        setLastExportedCodes([]);
        return;
      }

      const codesOnly = rows.map((row) => row.code);
      setLastExportedCodes(codesOnly);

      const csvHeaders = ["code"];
      const csvRows = rows.map((row) => [row.code]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) =>
          row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `brainlab_fresh_codes_${rows.length}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      await loadCodes();
      setMessage(`${rows.length} fresh code(s) exported successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to export codes.");
    } finally {
      setWorking(false);
    }
  }

  async function copyExportedCodes() {
    if (!lastExportedCodes.length) {
      setMessage("No exported codes available to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(lastExportedCodes.join("\n"));
      setMessage("Exported codes copied successfully.");
    } catch {
      setMessage("Failed to copy exported codes.");
    }
  }

  async function clearAllCodes() {
    const normalCodes = codes.filter((c) => c.code !== masterCode);

    if (normalCodes.length === 0) {
      setMessage("There are no normal codes to clear.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ALL ${normalCodes.length} normal code(s)? The master code will be preserved.`
    );
    if (!confirmed) return;

    try {
      setWorking(true);
      setMessage("");

      const res = await authFetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMessage(`Clear failed: ${data.error || "Unknown error"}`);
        return;
      }

      await loadCodes();
      setMessage("All normal access codes cleared successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to clear codes.");
    } finally {
      setWorking(false);
    }
  }

  function handleLogout() {
    void adminSignOut();
    router.push("/admin/login");
  }

  const usedCount = useMemo(
    () => codes.filter((c) => c.is_used).length,
    [codes]
  );

  const unusedCount = useMemo(
    () => codes.filter((c) => !c.is_used).length,
    [codes]
  );

  const freshCount = useMemo(
    () => codes.filter((c) => !c.is_used && !c.is_exported).length,
    [codes]
  );

  const exportedCount = useMemo(
    () => codes.filter((c) => c.is_exported).length,
    [codes]
  );

  return (
    <main className="admin-page">
      <div className="admin-container">
        <section className="admin-hero">
          <div className="admin-hero-top">
            <div>
              <div className="admin-badge">Brainlab Access Code Manager</div>
              <h1 className="admin-title">Generate and manage access codes</h1>
              <p className="admin-subtitle">
                Create new BLT codes, manage the permanent master code, reset used
                codes safely, and export only fresh unused codes without duplicates.
              </p>

              {adminUser && (
                <div className="admin-user-chip">
                  Signed in as <strong>{adminUser.email}</strong>
                </div>
              )}
            </div>

            <div className="admin-actions">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="admin-btn-light"
              >
                Dashboard
              </button>

              <button
                onClick={() => {
                  const toPrint =
                    lastExportedCodes.length > 0
                      ? lastExportedCodes
                      : codes
                          .filter((c) => !c.is_used && c.code !== masterCode)
                          .slice(0, 12)
                          .map((c) => c.code);
                  if (toPrint.length === 0) {
                    setMessage("No fresh or unused codes available to print vouchers.");
                    return;
                  }
                  setVoucherCodes(toPrint);
                  setShowVouchers(true);
                }}
                className="admin-btn-light"
                title="Format and print cut-out access vouchers for candidates"
              >
                🖨️ Print Vouchers
              </button>
              <button
                onClick={() => router.push("/admin/results")}
                className="admin-btn-light"
              >
                Results
              </button>

              <button onClick={handleLogout} className="admin-btn-primary">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="admin-section admin-stats">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Codes Loaded</p>
            <p className="admin-stat-value">{codes.length}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Used Codes</p>
            <p className="admin-stat-value">{usedCount}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Unused Codes</p>
            <p className="admin-stat-value">{unusedCount}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Fresh Codes</p>
            <p className="admin-stat-value">{freshCount}</p>
          </div>

          <div className="admin-stat-card">
            <p className="admin-stat-label">Exported Codes</p>
            <p className="admin-stat-value">{exportedCount}</p>
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Master Access Code</h2>
          <p className="admin-card-text">
            This code remains permanent, cannot be cleared with normal codes, and is
            excluded from fresh code exports.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Current Master Code</label>
              <input
                type="text"
                value={masterCode}
                readOnly
                className="admin-input"
              />
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Set New Master Code</label>
              <input
                type="text"
                value={newMasterCode}
                onChange={(e) => setNewMasterCode(e.target.value.toUpperCase())}
                className="admin-input"
                placeholder="Enter master code"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={handleSetMasterCode}
              disabled={working}
              className="admin-btn-primary"
            >
              {working ? "Working..." : "Save Master Code"}
            </button>
          </div>
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Code Operations</h2>
          <p className="admin-card-text">
            Export only fresh codes and automatically mark them as exported so the
            same batch is not downloaded twice.
          </p>

          <div className="admin-settings-grid">
            <div className="admin-setting-box">
              <label className="admin-label">Number of Codes to Generate</label>
              <input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="admin-input"
              />
              <p className="admin-help">
                Enter how many new access codes you want to create.
              </p>
            </div>

            <div className="admin-setting-box">
              <label className="admin-label">Number of Fresh Codes to Export</label>
              <input
                type="number"
                min={1}
                value={exportCount}
                onChange={(e) => setExportCount(Number(e.target.value))}
                className="admin-input"
              />
              <p className="admin-help">
                Only unused and not-yet-exported codes will be downloaded.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={handleGenerateCodes}
              disabled={generating}
              className="admin-btn-primary"
            >
              {generating ? "Generating..." : "Generate Codes"}
            </button>

            <button
              onClick={exportFreshCodes}
              disabled={working}
              className="admin-btn-light"
            >
              {working ? "Working..." : "Export Fresh Codes"}
            </button>

            <button
              onClick={resetAllUsed}
              disabled={working}
              className="admin-btn-light"
            >
              {working ? "Working..." : "Make Used Codes Unused"}
            </button>

            <button
              onClick={clearAllCodes}
              disabled={working}
              className="admin-btn-light"
            >
              {working ? "Working..." : "Clear All Normal Codes"}
            </button>

            <button onClick={loadCodes} className="admin-btn-light">
              Refresh List
            </button>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>

        {lastExportedCodes.length > 0 && (
          <section className="admin-section admin-card">
            <h2 className="admin-card-title">Last Exported Batch</h2>
            <p className="admin-card-text">
              You can copy all exported codes directly from here.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <textarea
                readOnly
                value={lastExportedCodes.join("\n")}
                className="admin-input"
                style={{ minHeight: "220px", fontFamily: "monospace" }}
              />

              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={copyExportedCodes}
                  className="admin-btn-primary"
                >
                  Copy All Exported Codes
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Recent Codes</h2>
          <p className="admin-card-text">Showing the latest 5000 access codes.</p>

          {loading ? (
            <p className="mt-6 text-slate-600">Loading codes...</p>
          ) : codes.length === 0 ? (
            <p className="mt-6 text-slate-600">No access codes found.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Used</th>
                    <th>Used By</th>
                    <th>Exported</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => {
                    const isMaster = code.code === masterCode;

                    return (
                      <tr key={code.id}>
                        <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                          {code.code}
                          {isMaster ? (
                            <span style={{ marginLeft: 8, color: "#b45309" }}>
                              (MASTER)
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {code.is_used ? (
                            <span className="admin-status-used">Used</span>
                          ) : (
                            <span className="admin-status-unused">Unused</span>
                          )}
                        </td>
                        <td>{code.used_by || "-"}</td>
                        <td>
                          {code.is_exported ? (
                            <span className="admin-status-used">Exported</span>
                          ) : (
                            <span className="admin-status-unused">Fresh</span>
                          )}
                        </td>
                        <td>{new Date(code.created_at).toLocaleString()}</td>
                        <td>
                          <button
                            onClick={() => resetCode(code)}
                            className="admin-btn-light"
                            style={{ padding: "10px 14px" }}
                            disabled={isMaster}
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {showVouchers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Print Examination Vouchers ({voucherCodes.length} codes)
                </h3>
                <p className="text-xs text-slate-500">
                  Formatted cut-out voucher cards for CBT candidates and tutorial centres.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-[#071c43] px-4 py-2 text-xs font-black text-white hover:bg-[#123566]"
                >
                  🖨️ Send to Printer
                </button>
                <button
                  type="button"
                  onClick={() => setShowVouchers(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {voucherCodes.map((c, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4 text-center shadow-sm"
                >
                  <div className="border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-900">
                      BrainLab Academy CBT
                    </span>
                    <h4 className="text-xs font-bold text-slate-700">Official Exam Voucher</h4>
                  </div>
                  <div className="my-3 py-2 bg-white rounded-xl border border-slate-200 shadow-inner">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Access Code</span>
                    <p className="font-mono text-lg font-black tracking-widest text-[#071c43]">
                      {c}
                    </p>
                  </div>
                  <p className="text-[10px] leading-4 text-slate-500">
                    Visit: <strong>brainlabexam-cbt.vercel.app</strong><br />
                    Single candidate attempt. Valid for 1 session.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}