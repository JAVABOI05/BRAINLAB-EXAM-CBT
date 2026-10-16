"use client";

import { adminSignOut } from "../../lib/adminAuth";
import { useEffect, useMemo, useState } from "react";
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

  const [lastExportedCodes, setLastExportedCodes] = useState<string[]>([]);

  useEffect(() => {
    const savedAdmin = localStorage.getItem("admin_user");

    if (!savedAdmin) {
      router.push("/admin/login");
      return;
    }

    try {
      setAdminUser(JSON.parse(savedAdmin) as AdminUser);
      void loadMasterCode();
      void loadCodes();
    } catch {
      localStorage.removeItem("admin_user");
      router.push("/admin/login");
    }
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

    const { data, error } = await supabase
      .from("access_codes")
      .select(
        "id, code, subject, is_used, used_by, is_exported, exported_at, created_at"
      )
      .order("created_at", { ascending: false })
      .range(0, 4999);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setCodes((data || []) as AccessCodeRow[]);
    setLoading(false);
  }

  async function handleGenerateCodes() {
    if (!count || count < 1) {
      setMessage("Enter a valid number of codes to generate.");
      return;
    }

    try {
      setGenerating(true);
      setMessage("");

      const { data, error } = await supabase.rpc("generate_access_codes", {
        code_count: count,
      });

      if (error) {
        setMessage(`Generate failed: ${error.message}`);
        return;
      }

      const generatedRows = (data || []) as { code: string }[];
      setMessage(
        generatedRows.length > 0
          ? `${generatedRows.length} access code(s) generated successfully.`
          : `${count} access code(s) generated successfully.`
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

      const { error } = await supabase.rpc("set_master_access_code", {
        new_code: cleanCode,
      });

      if (error) {
        setMessage(`Failed to set master code: ${error.message}`);
        return;
      }

      setMasterCode(cleanCode);
      setNewMasterCode(cleanCode);
      await loadCodes();
      setMessage("Master access code updated successfully.");
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

      const { error } = await supabase
        .from("access_codes")
        .update({
          is_used: false,
          used_by: null,
        })
        .eq("id", codeRow.id);

      if (error) {
        setMessage(`Reset failed: ${error.message}`);
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

      const { data, error } = await supabase.rpc(
        "reset_used_access_codes_preserve_master"
      );

      if (error) {
        setMessage(`Bulk reset failed: ${error.message}`);
        return;
      }

      await loadCodes();
      setMessage(`${data ?? 0} used code(s) reset successfully.`);
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

      const { data, error } = await supabase.rpc("export_fresh_access_codes", {
        code_count: exportCount,
      });

      if (error) {
        setMessage(`Export failed: ${error.message}`);
        setLastExportedCodes([]);
        return;
      }

      const rows = (data || []) as { code: string }[];

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

      const ids = normalCodes.map((c) => c.id);

      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);

        const { error } = await supabase
          .from("access_codes")
          .delete()
          .in("id", batch);

        if (error) {
          setMessage(`Clear failed: ${error.message}`);
          return;
        }
      }

      await loadCodes();
      setMessage("All normal access codes cleared successfully.");
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
    </main>
  );
}