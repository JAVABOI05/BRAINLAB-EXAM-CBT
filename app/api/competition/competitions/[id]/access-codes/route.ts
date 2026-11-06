import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getUserFromRequest, resolveAdminRole } from "@/app/lib/supabaseServer";

type Params = { params: Promise<{ id: string }> };
const ADMIN_ROLES = new Set(["super_admin", "platform_admin", "competition_admin"]);

async function requireArenaAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  const role = await resolveAdminRole(user.id);
  if (!ADMIN_ROLES.has(role || "")) return { error: NextResponse.json({ error: "Arena administrator access is required." }, { status: 403 }) };
  return { user, role };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireArenaAdmin(req);
    if (auth.error) return auth.error;
    const { id } = await params;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("competition_access_codes")
      .select("id, competition_id, round_id, label, expires_at, max_uses, used_count, is_active, created_at")
      .eq("competition_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ codes: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load access codes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireArenaAdmin(req);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await req.json();
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 100) : "";
    const maxUses = body.single_use === true ? 1 : (body.max_uses === null ? null : Number(body.max_uses));
    const expiresAt = body.expires_at ? new Date(body.expires_at) : null;
    const roundId = typeof body.round_id === "string" && body.round_id ? body.round_id : null;

    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000)) {
      return NextResponse.json({ error: "Maximum uses must be a positive integer, or null for reusable codes." }, { status: 400 });
    }
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: competition, error: competitionError } = await supabase
      .from("competitions").select("id").eq("id", id).maybeSingle();
    if (competitionError) throw competitionError;
    if (!competition) return NextResponse.json({ error: "Competition not found." }, { status: 404 });

    if (roundId) {
      const { data: round, error: roundError } = await supabase
        .from("competition_rounds").select("id").eq("id", roundId).eq("competition_id", id).maybeSingle();
      if (roundError) throw roundError;
      if (!round) return NextResponse.json({ error: "The selected round does not belong to this competition." }, { status: 400 });
    }

    const rawCode = `BLARENA-${randomBytes(6).toString("hex").toUpperCase()}`;
    const codeHash = createHash("sha256").update(rawCode).digest("hex");
    const { data: code, error } = await supabase
      .from("competition_access_codes")
      .insert({
        competition_id: id,
        round_id: roundId,
        code_hash: codeHash,
        label: label || null,
        expires_at: expiresAt?.toISOString() || null,
        max_uses: maxUses,
        created_by: auth.user.id,
      })
      .select("id, competition_id, round_id, label, expires_at, max_uses, used_count, is_active, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, code, redeemable_code: rawCode, warning: "This code is shown once. Copy and distribute it securely; only its hash is stored." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create access code." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireArenaAdmin(req);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await req.json();
    const codeId = typeof body.code_id === "string" ? body.code_id : "";
    if (!codeId) return NextResponse.json({ error: "Access code ID is required." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("competition_access_codes")
      .update({ is_active: body.is_active === true })
      .eq("id", codeId)
      .eq("competition_id", id)
      .select("id, is_active, used_count, max_uses")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Access code not found." }, { status: 404 });
    return NextResponse.json({ ok: true, code: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update access code." }, { status: 500 });
  }
}
