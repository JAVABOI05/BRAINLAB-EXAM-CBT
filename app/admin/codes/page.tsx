"use client";

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
  is_used: boolean;
  used_by: string | null;
  exported: boolean;
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

  useEffect(() => {
    const savedAdmin = localStorage.getItem("admin_user");

    if (!savedAdmin) {
      router.push("/admin/login");
      return;
    }

    try {
      setAdminUser(JSON.parse(savedAdmin) as AdminUser);
      loadCodes();
    } catch {
      localStorage.removeItem("admin_user");
      router.push("/admin/login");
    }
  }, [router]);

  async function loadCodes() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, 999);

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

      const { error } = await supabase.rpc("generate_access_codes", {
        code_count: count,
      });

      if (error) {
        setMessage(error.message);
        setGenerating(false);
        return;
      }

      setMessage(`${count} access code(s) generated successfully.`);
      await loadCodes();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to generate codes."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function resetCode(codeRow: AccessCodeRow) {
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
        setWorking(false);
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
    const used = codes.filter((c) => c.is_used);

    if (used.length === 0) {
      setMessage("No used codes found.");
      return;
    }

    const confirmed = window.confirm(
      `Reset ${used.length} used code(s) back to unused?`
    );
    if (!confirmed) return;

    try {
      setWorking(true);
      setMessage("");

      const ids = used.map((c) => c.id);

      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);

        const { error } = await supabase
          .from("access_codes")
          .update({
            is_used: false,
            used_by: null,
          })
          .in("id", batch);

        if (error) {
          setMessage(`Bulk reset failed: ${error.message}`);
          setWorking(false);
          return;
        }
      }

      await loadCodes();
      setMessage(`${used.length} used code(s) reset successfully.`);
    } finally {
      setWorking(false);
    }
  }

  async function clearAllCodes() {
    if (codes.length === 0) {
      setMessage("There are no codes to clear.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ALL ${codes.length} code(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setWorking(true);
      setMessage("");

      const { error } = await supabase
        .from("access_codes")
        .delete()
        .neq("code", "");

      if (error) {
        setMessage(`Clear failed: ${error.message}`);
        setWorking(false);
        return;
      }

      setCodes([]);
      setMessage("All access codes cleared successfully.");
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

      const { data, error } = await supabase
        .from("access_codes")
        .select("id, code, created_at")
        .eq("is_used", false)
        .eq("exported", false)
        .order("created_at", { ascending: true })
        .limit(exportCount);

      if (error) {
        setMessage(`Export failed: ${error.message}`);
        setWorking(false);
        return;
      }

      const rows = data || [];

      if (rows.length === 0) {
        setMessage("No fresh unused codes available to export.");
        setWorking(false);
        return;
      }

      const ids = rows.map((row) => row.id);

      const csvHeaders = ["code", "created_at"];
      const csvRows = rows.map((row) => [row.code, row.created_at]);

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

      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);

        const { error: updateError } = await supabase
          .from("access_codes")
          .update({ exported: true })
          .in("id", batch);

        if (updateError) {
          setMessage(
            `Codes exported, but marking as exported failed: ${updateError.message}`
          );
          setWorking(false);
          await loadCodes();
          return;
        }
      }

      await loadCodes();
      setMessage(`${rows.length} fresh code(s) exported and marked successfully.`);
    } finally {
      setWorking(false);
    }
  }

  async function makeAllExportedFreshAgain() {
    const exportedCodes = codes.filter((c) => c.exported);

    if (exportedCodes.length === 0) {
      setMessage("There are no exported codes to reset.");
      return;
    }

    const confirmed = window.confirm(
      `Reset ${exportedCodes.length} exported code(s) so they can be exported again?`
    );
    if (!confirmed) return;

    try {
      setWorking(true);
      setMessage("");

      const ids = exportedCodes.map((c) => c.id);

      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);

        const { error } = await supabase
          .from("access_codes")
          .update({ exported: false })
          .in("id", batch);

        if (error) {
          setMessage(`Reset exported failed: ${error.message}`);
          setWorking(false);
          return;
        }
      }

      await loadCodes();
      setMessage(`${exportedCodes.length} exported code(s) reset successfully.`);
    } finally {
      setWorking(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_user");
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
    () => codes.filter((c) => !c.is_used && !c.exported).length,
    [codes]
  );

  const exportedCount = useMemo(
    () => codes.filter((c) => c.exported).length,
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
                Create new BLT codes, reset used codes, clear the bank, and export
                only fresh unused codes without duplicates.
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
          <h2 className="admin-card-title">Code Operations</h2>
          <p className="admin-card-text">
            Export only fresh codes and automatically mark them as exported so
            the same batch is not downloaded twice.
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
              onClick={makeAllExportedFreshAgain}
              disabled={working}
              className="admin-btn-light"
            >
              {working ? "Working..." : "Reset Exported Status"}
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
              {working ? "Working..." : "Clear All Codes"}
            </button>

            <button onClick={loadCodes} className="admin-btn-light">
              Refresh List
            </button>
          </div>

          {message && <div className="admin-message">{message}</div>}
        </section>

        <section className="admin-section admin-card">
          <h2 className="admin-card-title">Recent Codes</h2>
          <p className="admin-card-text">
            Showing the latest 1000 access codes.
          </p>

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
                  {codes.map((code) => (
                    <tr key={code.id}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                        {code.code}
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
                        {code.exported ? (
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
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}