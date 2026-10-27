import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getSupabaseServerClient } from "@/app/lib/supabaseServer";

const DEFAULT_PAGES = [{ id: "page-1", title: "Page 1", aspectRatio: "16 / 9", backgroundMode: "blackboard", elements: [] }];

function validPages(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 &&
    value.every((page) => page && typeof page === "object" &&
      typeof page.id === "string" && typeof page.title === "string" &&
      ["16 / 9", "4 / 3", "9 / 16", "free"].includes((page as { aspectRatio?: string }).aspectRatio || "") &&
      Array.isArray((page as { elements?: unknown }).elements));
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in to access Classroom Studio." }, { status: 401 });
  const supabase = getSupabaseServerClient(request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const { data, error } = await supabase.from("classroom_lessons").select("*").eq("id", id).eq("tutor_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to load this lesson. Apply the Classroom Studio database migration first if the table is missing." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    return NextResponse.json({ lesson: data });
  }
  const { data, error } = await supabase.from("classroom_lessons").select("id,title,subject,description,status,updated_at,last_opened_at,attachments").eq("tutor_id", user.id).neq("status", "archived").order("updated_at", { ascending: false });
  if (error) {
    // Retry without attachments in select if column does not yet exist
    const fallback = await supabase.from("classroom_lessons").select("id,title,subject,description,status,updated_at,last_opened_at").eq("tutor_id", user.id).neq("status", "archived").order("updated_at", { ascending: false });
    if (fallback.error) return NextResponse.json({ error: "Unable to load lessons. Apply the Classroom Studio database migration first if the table is missing." }, { status: 500 });
    return NextResponse.json({ lessons: fallback.data || [] });
  }
  return NextResponse.json({ lessons: data || [] });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in to save a lesson." }, { status: 401 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supabase = getSupabaseServerClient(token);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") return NextResponse.json({ error: "A lesson title is required." }, { status: 400 });
  const title = body.title.trim().slice(0, 160) || "Untitled lesson";
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 120) : null;
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : null;
  const status = body.status === "ready" ? "ready" : "draft";
  const pages = validPages(body.pages) ? body.pages : DEFAULT_PAGES;
  const activePageIndex = Number.isInteger(body.active_page_index) ? Math.min(Math.max(0, body.active_page_index, 0), pages.length - 1) : 0;
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const payload = { title, subject, description, status, pages, active_page_index: activePageIndex, attachments, last_opened_at: new Date().toISOString() };
  const id = typeof body.id === "string" ? body.id : null;
  const query = supabase.from("classroom_lessons");
  let result = id
    ? await query.update(payload).eq("id", id).eq("tutor_id", user.id).select("*").maybeSingle()
    : await query.insert({ ...payload, tutor_id: user.id }).select("*").single();

  // Graceful fallback if attachments column is not yet present on remote DB
  if (result.error && (result.error.message?.includes("attachments") || result.error.code === "PGRST204")) {
    const { attachments: _dropped, ...fallbackPayload } = payload;
    result = id
      ? await query.update(fallbackPayload).eq("id", id).eq("tutor_id", user.id).select("*").maybeSingle()
      : await query.insert({ ...fallbackPayload, tutor_id: user.id }).select("*").single();
  }

  if (result.error) return NextResponse.json({ error: "Unable to save this lesson. Check that the Classroom Studio migration has been applied." }, { status: 500 });
  if (!result.data) return NextResponse.json({ error: "Lesson not found or you do not have permission to edit it." }, { status: 404 });
  return NextResponse.json({ lesson: result.data });
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in to archive a lesson." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Lesson ID is required." }, { status: 400 });
  const supabase = getSupabaseServerClient(request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""));
  const { error } = await supabase.from("classroom_lessons").update({ status: "archived" }).eq("id", id).eq("tutor_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to archive lesson." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
