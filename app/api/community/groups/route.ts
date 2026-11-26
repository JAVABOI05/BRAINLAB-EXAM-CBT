import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient, getSupabasePublicServerClient, getUserFromRequest } from "../../../lib/supabaseServer";
import { listCommunityGroups, createCommunityGroup } from "../../../lib/community/communityService";
import type { CommunityFilterOptions, CommunityGroupType } from "../../../lib/community/types";
import { isInstructorRole, isGovernanceAdminRole } from "../../../lib/adminRoles";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const group_type = (searchParams.get("type") as CommunityGroupType) || undefined;
    const search = searchParams.get("search") || undefined;
    const subject_id = searchParams.get("subject_id") || undefined;

    const filter: CommunityFilterOptions = {
      category,
      group_type,
      search,
      subject_id,
    };

    const supabase = getSupabasePublicServerClient();
    const groups = await listCommunityGroups(filter, supabase);

    return NextResponse.json({ ok: true, data: groups });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const supabase = getSupabaseServerClient(token);

    // Verify role permissions: only teachers, tutors, and admins can create groups
    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isTutorOrAdmin =
      isInstructorRole(adminRecord?.role) || isGovernanceAdminRole(adminRecord?.role);

    if (!isTutorOrAdmin) {
      return NextResponse.json(
        { ok: false, error: "forbidden", message: "Only faculty instructors and platform admins can create cohorts." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      description,
      group_type = "academic_cohort",
      category = "General",
      subject_id = null,
      icon_emoji = "🎓",
      visibility = "public",
      membership_policy = "open",
      capacity = 500,
      group_rules = "",
    } = body;

    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: "invalid_name", message: "Group name must be at least 3 characters." },
        { status: 400 }
      );
    }

    const result = await createCommunityGroup(
      {
        name,
        description: description || "",
        group_type,
        category,
        subject_id,
        owner_id: user.id,
        icon_emoji,
        visibility,
        membership_policy,
        capacity,
        group_rules,
      },
      supabase
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.group });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "server_error" },
      { status: 500 }
    );
  }
}
