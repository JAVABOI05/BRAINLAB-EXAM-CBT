import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/adminAuth";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = "force-dynamic";

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "candidates"; // candidates | results | transactions | questions

    const supabase = getSupabaseServerClient();
    const timestamp = new Date().toISOString().slice(0, 10);

    // ------------------------------------------------------------------------
    // 1. EXPORT CANDIDATES
    // ------------------------------------------------------------------------
    if (type === "candidates") {
      const { data: authData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const users = (authData?.users || []) as Record<string, unknown>[];

      const { data: subRows } = await supabase.from("user_subscriptions").select("user_id, plan_id, status");
      const subMap = new Map<string, string>();
      ((subRows || []) as Record<string, unknown>[]).forEach((s) => {
        if (typeof s.user_id === "string" && s.status === "active") subMap.set(s.user_id, String(s.plan_id || "free"));
      });

      const headers = [
        "Candidate ID",
        "Full Name",
        "Email",
        "Phone",
        "Target Exam",
        "Target Score",
        "State",
        "Subscription Tier",
        "Account Status",
        "Registered At",
      ];

      const rows = users.map((u) => {
        const meta = (u.user_metadata || {}) as Record<string, unknown>;
        const isSuspended = meta.is_suspended === true || (typeof u.banned_until === "string" && new Date(u.banned_until) > new Date());
        const plan = subMap.get(String(u.id)) || "free";

        return [
          escapeCsvField(u.id),
          escapeCsvField(meta.full_name || meta.name || "Candidate"),
          escapeCsvField(u.email || ""),
          escapeCsvField(meta.phone || u.phone || ""),
          escapeCsvField(meta.target_exam || meta.exam_type || "JAMB UTME"),
          escapeCsvField(meta.target_score || 280),
          escapeCsvField(meta.state || meta.state_of_origin || ""),
          escapeCsvField(plan.toUpperCase()),
          escapeCsvField(isSuspended ? "Suspended" : "Active"),
          escapeCsvField(u.created_at),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="brainlab-candidates-${timestamp}.csv"`,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 2. EXPORT EXAM RESULTS
    // ------------------------------------------------------------------------
    if (type === "results") {
      const { data: results, error } = await supabase
        .from("exam_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const headers = [
        "Result ID",
        "Candidate Name",
        "Phone",
        "Subject / Combination",
        "Score",
        "Total",
        "Percentage",
        "Date Completed",
      ];

      const rows = ((results || []) as Record<string, unknown>[]).map((r) => {
        const score = typeof r.score === "number" ? r.score : 0;
        const total = typeof r.total === "number" && r.total > 0 ? r.total : 100;
        const pct = ((score / total) * 100).toFixed(1);

        return [
          escapeCsvField(r.id),
          escapeCsvField(r.name || "Candidate"),
          escapeCsvField(r.phone || ""),
          escapeCsvField(r.subject || "CBT Exam"),
          escapeCsvField(score),
          escapeCsvField(total),
          escapeCsvField(`${pct}%`),
          escapeCsvField(r.created_at),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="brainlab-exam-results-${timestamp}.csv"`,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 3. EXPORT FINANCIAL TRANSACTIONS
    // ------------------------------------------------------------------------
    if (type === "transactions") {
      const { data: txs, error } = await supabase
        .from("payment_transactions")
        .select("*, subscription_plans(name)")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const headers = [
        "Transaction ID",
        "Reference",
        "Customer Email",
        "Plan",
        "Amount (NGN)",
        "Discount (NGN)",
        "Gateway Provider",
        "Status",
        "Paid At",
        "Created At",
      ];

      const rows = ((txs || []) as Record<string, unknown>[]).map((t) => {
        const amountKobo = typeof t.amount_kobo === "number" ? t.amount_kobo : 0;
        const discountKobo = typeof t.discount_kobo === "number" ? t.discount_kobo : 0;
        const amountNgn = (amountKobo / 100).toFixed(2);
        const discountNgn = (discountKobo / 100).toFixed(2);
        const subPlan = t.subscription_plans as Record<string, unknown> | undefined;
        const planName = subPlan?.name || t.plan_id || "Subscription";

        return [
          escapeCsvField(t.id),
          escapeCsvField(t.reference),
          escapeCsvField(t.customer_email),
          escapeCsvField(planName),
          escapeCsvField(amountNgn),
          escapeCsvField(discountNgn),
          escapeCsvField(t.provider || "paystack"),
          escapeCsvField(t.status),
          escapeCsvField(t.paid_at || "N/A"),
          escapeCsvField(t.created_at),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="brainlab-financial-ledger-${timestamp}.csv"`,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 4. EXPORT QUESTION BANK
    // ------------------------------------------------------------------------
    if (type === "questions") {
      const { data: questions, error } = await supabase
        .from("questions")
        .select("*")
        .order("id", { ascending: true })
        .limit(5000);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const headers = [
        "Question ID",
        "Subject",
        "Topic",
        "Question Prompt",
        "Option A",
        "Option B",
        "Option C",
        "Option D",
        "Correct Answer",
        "Explanation",
      ];

      const rows = ((questions || []) as Record<string, unknown>[]).map((q) => {
        return [
          escapeCsvField(q.id),
          escapeCsvField(q.subject || ""),
          escapeCsvField(q.topic || ""),
          escapeCsvField(q.question || ""),
          escapeCsvField(q.option_a || ""),
          escapeCsvField(q.option_b || ""),
          escapeCsvField(q.option_c || ""),
          escapeCsvField(q.option_d || ""),
          escapeCsvField(q.correct_answer || ""),
          escapeCsvField(q.explanation || ""),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\r\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="brainlab-questions-backup-${timestamp}.csv"`,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid export dataset type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Export generation failed" },
      { status: 500 }
    );
  }
}
